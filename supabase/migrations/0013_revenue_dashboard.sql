-- ============================================================
-- CourtPass — fase 4: omzet-dashboard (platform-admin only)
--
-- Run this ONCE in Supabase Dashboard -> SQL Editor -> New query -> Run,
-- after 0001-0012. Safe to re-run (idempotent).
--
-- What this does:
--   Adds admin_revenue_summary(): a single SECURITY DEFINER function that
--   computes every figure the admin "Omzet" screen needs, straight from
--   credit_ledger (fase 1) plus the current credit_packs/subscription_plans
--   catalog. Kept as one server-side function (rather than several client
--   queries + JS math) so the numbers are computed consistently and so a
--   platform admin doesn't need broad SELECT access beyond what the
--   existing "platform admins view all ledger" policy already grants.
--
--   Sign conventions relied on here (see 0004/0007/0008): topup,
--   subscription_grant, booking_refund and split_received are stored
--   positive; booking_charge, split_paid and rollover_expiry are stored
--   negative. split_paid/split_received always net to zero across the
--   whole platform (an internal transfer between two users), so they're
--   left out of every aggregate here on purpose.
--
--   Known simplification (confirmed with the site owner): credit_ledger
--   never recorded WHICH pack/plan a topup/subscription_grant came from,
--   or what price was in effect at that moment — only the credit amount.
--   Euro revenue for packs/subscriptions is reconstructed by matching a
--   ledger row's credit amount against today's credit_packs /
--   subscription_plans catalog and using that product's CURRENT
--   price_cents. This is exact as long as credit amounts stay unique
--   per product (true for the catalog today) and prices haven't changed
--   since a given purchase — both accepted trade-offs over rebuilding the
--   purchase flow to log price-at-purchase-time. Any ledger row whose
--   credit amount doesn't match any current product is surfaced
--   separately as "unmatched" rather than silently mis-attributed.
--
--   MRR uses each active subscription's CURRENT plan price_cents (not
--   sale_price_cents — a sale is a new-signup incentive, not what an
--   existing subscriber is billed) rather than a price stored at signup
--   time, which this schema doesn't have. Also confirmed with the site
--   owner.
-- ============================================================

create or replace function admin_revenue_summary()
returns json
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_sold_credits numeric;
  v_charged_credits numeric;
  v_refunded_credits numeric;
  v_rollover_expired_credits numeric;
  v_outstanding_credits numeric;
  v_pack_revenue_cents numeric;
  v_pack_unmatched_credits numeric;
  v_sub_revenue_cents numeric;
  v_sub_unmatched_credits numeric;
  v_mrr_cents numeric;
  v_active_subscriptions integer;
  v_paying_users integer;
begin
  if not is_platform_admin(auth.uid()) then
    raise exception 'Not authorized';
  end if;

  select coalesce(sum(credits), 0) into v_sold_credits
  from credit_ledger where type in ('topup', 'subscription_grant');

  select coalesce(sum(-credits), 0) into v_charged_credits
  from credit_ledger where type = 'booking_charge';

  select coalesce(sum(credits), 0) into v_refunded_credits
  from credit_ledger where type = 'booking_refund';

  select coalesce(sum(-credits), 0) into v_rollover_expired_credits
  from credit_ledger where type = 'rollover_expiry';

  select coalesce(sum(credits_balance), 0) into v_outstanding_credits from profiles;

  select
    coalesce(sum(cp.price_cents), 0),
    coalesce(sum(case when cp.id is null then l.credits else 0 end), 0)
  into v_pack_revenue_cents, v_pack_unmatched_credits
  from credit_ledger l
  left join credit_packs cp on cp.credits = l.credits
  where l.type = 'topup';

  select
    coalesce(sum(sp.price_cents), 0),
    coalesce(sum(case when sp.id is null then l.credits else 0 end), 0)
  into v_sub_revenue_cents, v_sub_unmatched_credits
  from credit_ledger l
  left join subscription_plans sp on sp.credits_per_month = l.credits
  where l.type = 'subscription_grant';

  select coalesce(sum(sp.price_cents), 0), count(*)
  into v_mrr_cents, v_active_subscriptions
  from user_subscriptions us
  join subscription_plans sp on sp.id = us.plan_id
  where us.status = 'active';

  select count(distinct user_id) into v_paying_users
  from credit_ledger where type in ('topup', 'subscription_grant');

  return json_build_object(
    'soldCredits', v_sold_credits,
    'redeemedCredits', v_charged_credits - v_refunded_credits,
    'rolloverExpiredCredits', v_rollover_expired_credits,
    'outstandingCredits', v_outstanding_credits,
    'packRevenueCents', v_pack_revenue_cents,
    'packUnmatchedCredits', v_pack_unmatched_credits,
    'subscriptionRevenueCents', v_sub_revenue_cents,
    'subscriptionUnmatchedCredits', v_sub_unmatched_credits,
    'mrrCents', v_mrr_cents,
    'activeSubscriptions', v_active_subscriptions,
    'payingUsers', v_paying_users
  );
end;
$$;

grant execute on function admin_revenue_summary() to authenticated;
