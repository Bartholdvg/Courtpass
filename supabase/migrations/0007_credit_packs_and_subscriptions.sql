-- ============================================================
-- CourtPass — fase 2: credit packs & abonnementen, admin-beheerbaar
--
-- Run this ONCE in Supabase Dashboard -> SQL Editor -> New query -> Run,
-- after 0001-0006. Safe to re-run (idempotent).
--
-- What this does:
--   1. credit_packs / subscription_plans: admin-configurable rows
--      instead of hardcoded arrays in the app — changing a price or
--      adding a new pack/plan is now an admin action, not a code
--      change. Each row can carry an optional sale price + expiry
--      (for a Black Friday-style discount) and a Stripe Payment Link
--      the admin fills in once it exists.
--   2. user_subscriptions: at most one active row per user. All
--      writes go through SECURITY DEFINER functions (subscribe,
--      cancel, admin-simulated renewal) — never directly, same
--      pattern as credits_balance.
--   3. Rollover is approximated (see admin_simulate_renewal below):
--      this app has one pooled credits_balance rather than separate
--      "subscription credits" vs "purchased credits" buckets, so a
--      renewal caps the user's CURRENT total balance at 2x the plan's
--      monthly allowance (expiring the excess) before granting the
--      new month's credits. That is a simplification of "subscription
--      credits roll over, purchased credits don't" — flagged here so
--      it's a documented, deliberate choice, not an oversight.
-- ============================================================

create table if not exists credit_packs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  credits integer not null check (credits > 0),
  price_cents integer not null check (price_cents >= 0),
  sale_price_cents integer check (sale_price_cents is null or sale_price_cents >= 0),
  sale_until timestamptz,
  payment_link text,
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table credit_packs enable row level security;

drop policy if exists "credit packs are publicly readable" on credit_packs;
create policy "credit packs are publicly readable"
  on credit_packs for select
  using (true);

drop policy if exists "only platform admins manage credit packs" on credit_packs;
create policy "only platform admins manage credit packs"
  on credit_packs for all
  using (is_platform_admin(auth.uid()))
  with check (is_platform_admin(auth.uid()));

create table if not exists subscription_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  credits_per_month integer not null check (credits_per_month >= 0),
  price_cents integer not null check (price_cents >= 0),
  sale_price_cents integer check (sale_price_cents is null or sale_price_cents >= 0),
  sale_until timestamptz,
  payment_link text,
  active boolean not null default true,
  most_chosen boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table subscription_plans enable row level security;

drop policy if exists "subscription plans are publicly readable" on subscription_plans;
create policy "subscription plans are publicly readable"
  on subscription_plans for select
  using (true);

drop policy if exists "only platform admins manage subscription plans" on subscription_plans;
create policy "only platform admins manage subscription plans"
  on subscription_plans for all
  using (is_platform_admin(auth.uid()))
  with check (is_platform_admin(auth.uid()));

create table if not exists user_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  plan_id uuid not null references subscription_plans(id),
  status text not null default 'active' check (status in ('active', 'cancelled')),
  is_annual boolean not null default false,
  started_at timestamptz not null default now(),
  renews_at timestamptz not null,
  last_period_credits integer not null default 0,
  cancelled_at timestamptz
);

create index if not exists user_subscriptions_user_id_idx on user_subscriptions (user_id);

alter table user_subscriptions enable row level security;

drop policy if exists "users view own subscription" on user_subscriptions;
create policy "users view own subscription"
  on user_subscriptions for select
  using (auth.uid() = user_id);

drop policy if exists "platform admins view all subscriptions" on user_subscriptions;
create policy "platform admins view all subscriptions"
  on user_subscriptions for select
  using (is_platform_admin(auth.uid()));

-- ---------- seed: packs & plans, matching the real Stripe products ----------
-- Payment links are left blank on purpose — fill them in via the admin
-- "Producten" screen once each Stripe Payment Link exists. Note: in Stripe,
-- "Plus 225 Credits" and "Max 380 Credits" are currently set up as recurring
-- ("per maand") prices, and "Flex 0 Credits" as a one-time paid price — but
-- here Plus/Max are modeled as one-time packs and Flex as a free plan, per
-- the original spec. Worth reconciling in Stripe before wiring their links.

insert into credit_packs (name, credits, price_cents, sort_order)
select 'Try', 65, 1999, 1
where not exists (select 1 from credit_packs where name = 'Try');

insert into credit_packs (name, credits, price_cents, sort_order)
select 'Play', 140, 3995, 2
where not exists (select 1 from credit_packs where name = 'Play');

insert into credit_packs (name, credits, price_cents, sort_order)
select 'Plus', 225, 5995, 3
where not exists (select 1 from credit_packs where name = 'Plus');

insert into credit_packs (name, credits, price_cents, sort_order)
select 'Max', 380, 10000, 4
where not exists (select 1 from credit_packs where name = 'Max');

insert into subscription_plans (name, credits_per_month, price_cents, sort_order)
select 'Flex', 0, 0, 1
where not exists (select 1 from subscription_plans where name = 'Flex');

insert into subscription_plans (name, credits_per_month, price_cents, sort_order)
select 'Rally', 160, 3900, 2
where not exists (select 1 from subscription_plans where name = 'Rally');

insert into subscription_plans (name, credits_per_month, price_cents, most_chosen, sort_order)
select 'Set', 340, 7900, true, 3
where not exists (select 1 from subscription_plans where name = 'Set');

insert into subscription_plans (name, credits_per_month, price_cents, sort_order)
select 'Match', 520, 11500, 4
where not exists (select 1 from subscription_plans where name = 'Match');

insert into subscription_plans (name, credits_per_month, price_cents, sort_order)
select 'Grand Slam', 750, 15500, 5
where not exists (select 1 from subscription_plans where name = 'Grand Slam');

-- ---------- subscribe / cancel / simulate renewal ----------

create or replace function subscribe_to_plan(p_plan_id uuid, p_is_annual boolean default false)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan record;
  v_sub_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_plan from subscription_plans where id = p_plan_id and active;
  if not found then
    raise exception 'Plan not found';
  end if;

  update user_subscriptions
  set status = 'cancelled', cancelled_at = now()
  where user_id = auth.uid() and status = 'active';

  insert into user_subscriptions (user_id, plan_id, status, is_annual, started_at, renews_at, last_period_credits)
  values (auth.uid(), p_plan_id, 'active', p_is_annual, now(), now() + interval '1 month', v_plan.credits_per_month)
  returning id into v_sub_id;

  if v_plan.credits_per_month > 0 then
    perform adjust_my_credits(v_plan.credits_per_month, 'subscription_grant', 'Abonnement: ' || v_plan.name);
  end if;

  return v_sub_id;
end;
$$;

grant execute on function subscribe_to_plan(uuid, boolean) to authenticated;

create or replace function cancel_my_subscription()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  update user_subscriptions
  set status = 'cancelled', cancelled_at = now()
  where user_id = auth.uid() and status = 'active';
end;
$$;

grant execute on function cancel_my_subscription() to authenticated;

-- Admin-only "simulate next renewal" (there's no real calendar to wait on in
-- a sandbox). See the note at the top of this file about the rollover
-- approximation this implements.
create or replace function admin_simulate_renewal(p_subscription_id uuid)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sub record;
  v_plan record;
  v_balance numeric;
  v_cap numeric;
  v_excess numeric;
  v_new_balance numeric;
begin
  if not is_platform_admin(auth.uid()) then
    raise exception 'Not authorized';
  end if;

  select * into v_sub from user_subscriptions where id = p_subscription_id;
  if not found then
    raise exception 'Subscription not found';
  end if;

  select * into v_plan from subscription_plans where id = v_sub.plan_id;
  if not found then
    raise exception 'Plan not found';
  end if;

  select credits_balance into v_balance from profiles where id = v_sub.user_id;
  v_cap := v_plan.credits_per_month * 2;

  if v_balance > v_cap then
    v_excess := v_balance - v_cap;
    update profiles set credits_balance = credits_balance - v_excess where id = v_sub.user_id
      returning credits_balance into v_balance;
    insert into credit_ledger (user_id, type, credits, description, balance_after)
    values (v_sub.user_id, 'rollover_expiry', -v_excess, 'Vervallen boven 2x maandelijkse toekenning (' || v_plan.name || ')', v_balance);
  end if;

  update profiles set credits_balance = credits_balance + v_plan.credits_per_month where id = v_sub.user_id
    returning credits_balance into v_new_balance;
  insert into credit_ledger (user_id, type, credits, description, balance_after)
  values (v_sub.user_id, 'subscription_grant', v_plan.credits_per_month, 'Maandelijkse toekenning: ' || v_plan.name, v_new_balance);

  update user_subscriptions
  set renews_at = renews_at + interval '1 month', last_period_credits = v_plan.credits_per_month
  where id = p_subscription_id;

  return v_new_balance;
end;
$$;

grant execute on function admin_simulate_renewal(uuid) to authenticated;
