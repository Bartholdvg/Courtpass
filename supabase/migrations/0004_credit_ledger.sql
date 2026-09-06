-- ============================================================
-- CourtPass — credit ledger (fase 1 van het credits/wallet-systeem)
--
-- Run this ONCE in Supabase Dashboard -> SQL Editor -> New query -> Run,
-- after 0001, 0002 and 0003. Safe to re-run (idempotent).
--
-- What this does:
--   1. Adds credit_ledger: an append-only audit trail. From now on every
--      credits_balance mutation (top-up, booking charge/refund, admin
--      correction, ...) writes a row here, the same way pricing_snapshot
--      already freezes an audit trail for prices.
--   2. Replaces adjust_my_credits() with a version that also writes that
--      ledger row. Existing calls that only pass {delta} keep working
--      unchanged — the new parameters default to a plain 'adjustment'.
--   3. Adds admin_adjust_credits(): the only way a platform admin may
--      correct someone else's balance, and only with a reason (always
--      logged).
--   4. Adds cancel_my_booking(): cancels a confirmed booking and refunds
--      its credits atomically, so a booking can never be refunded twice
--      and a cancel can never leave the credits side inconsistent.
--      (Note: cancelling a booking previously did NOT refund credits at
--      all — this migration fixes that pre-existing gap too.)
-- ============================================================

create table if not exists credit_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  type text not null check (type in (
    'topup', 'subscription_grant', 'booking_charge', 'booking_refund',
    'split_received', 'split_paid', 'rollover_expiry', 'adjustment'
  )),
  credits numeric not null,
  description text,
  booking_id uuid references bookings(id) on delete set null,
  created_at timestamptz not null default now(),
  balance_after numeric not null
);

create index if not exists credit_ledger_user_id_created_at_idx on credit_ledger (user_id, created_at desc);

alter table credit_ledger enable row level security;

drop policy if exists "users view own ledger" on credit_ledger;
create policy "users view own ledger"
  on credit_ledger for select
  using (auth.uid() = user_id);

drop policy if exists "platform admins view all ledger" on credit_ledger;
create policy "platform admins view all ledger"
  on credit_ledger for select
  using (is_platform_admin(auth.uid()));

-- ---------- adjust_my_credits: now also logs a ledger row ----------
-- Drop the old single-argument version first so every client call is
-- forced through the new (ledger-writing) function.
drop function if exists adjust_my_credits(numeric);

create or replace function adjust_my_credits(
  delta numeric,
  p_type text default 'adjustment',
  p_description text default null,
  p_booking_id uuid default null
)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  new_balance numeric;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if p_type not in (
    'topup', 'subscription_grant', 'booking_charge', 'booking_refund',
    'split_received', 'split_paid', 'rollover_expiry', 'adjustment'
  ) then
    raise exception 'Invalid ledger type: %', p_type;
  end if;

  update profiles
  set credits_balance = credits_balance + delta
  where id = auth.uid()
  returning credits_balance into new_balance;

  if new_balance is null then
    raise exception 'Profile not found';
  end if;
  if new_balance < 0 then
    raise exception 'Insufficient credits';
  end if;

  insert into credit_ledger (user_id, type, credits, description, booking_id, balance_after)
  values (auth.uid(), p_type, delta, p_description, p_booking_id, new_balance);

  return new_balance;
end;
$$;

grant execute on function adjust_my_credits(numeric, text, text, uuid) to authenticated;

-- ---------- admin_adjust_credits: platform-admin manual correction ----------
create or replace function admin_adjust_credits(target_user uuid, delta numeric, reason text)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  new_balance numeric;
begin
  if not is_platform_admin(auth.uid()) then
    raise exception 'Not authorized';
  end if;
  if reason is null or length(trim(reason)) = 0 then
    raise exception 'A reason is required';
  end if;

  update profiles
  set credits_balance = credits_balance + delta
  where id = target_user
  returning credits_balance into new_balance;

  if new_balance is null then
    raise exception 'Profile not found';
  end if;
  if new_balance < 0 then
    raise exception 'Insufficient credits';
  end if;

  insert into credit_ledger (user_id, type, credits, description, balance_after)
  values (target_user, 'adjustment', delta, reason, new_balance);

  return new_balance;
end;
$$;

grant execute on function admin_adjust_credits(uuid, numeric, text) to authenticated;

-- ---------- cancel_my_booking: atomic cancel + refund ----------
create or replace function cancel_my_booking(p_booking_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_price numeric;
  v_status text;
  v_club_name text;
  v_court_name text;
  v_new_balance numeric;
begin
  select user_id, price_credits, status, club_name, court_name
  into v_user_id, v_price, v_status, v_club_name, v_court_name
  from bookings
  where id = p_booking_id
  for update;

  if v_user_id is null then
    raise exception 'Booking not found';
  end if;
  if v_user_id <> auth.uid() then
    raise exception 'Not authorized';
  end if;
  if v_status <> 'confirmed' then
    raise exception 'Booking is not confirmed';
  end if;

  update bookings set status = 'cancelled' where id = p_booking_id;

  update profiles
  set credits_balance = credits_balance + v_price
  where id = v_user_id
  returning credits_balance into v_new_balance;

  insert into credit_ledger (user_id, type, credits, description, booking_id, balance_after)
  values (
    v_user_id, 'booking_refund', v_price,
    'Annulering ' || coalesce(v_club_name, '') || ' - ' || coalesce(v_court_name, ''),
    p_booking_id, v_new_balance
  );
end;
$$;

grant execute on function cancel_my_booking(uuid) to authenticated;
