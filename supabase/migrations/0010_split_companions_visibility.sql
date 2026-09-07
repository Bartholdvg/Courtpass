-- ============================================================
-- CourtPass — laat medespelers elkaar (en de boeker) zien
--
-- Run this ONCE in Supabase Dashboard -> SQL Editor -> New query -> Run,
-- after 0001-0009. Safe to re-run (idempotent).
--
-- What this does:
--   Until now, a split participant could only see their OWN
--   booking_splits row, and could not resolve anyone's email (not even
--   the booker's) — profiles.email was only readable by the row's own
--   owner, a platform admin, or a club owner looking at their own
--   club's bookers. That meant "Openstaande verzoeken" on the dashboard
--   could show club/court/time (from the booking itself, already
--   allowed since fase 3) but not who booked it or who else is
--   playing.
--
--   Adds:
--   1. is_split_companion(target_id): SECURITY DEFINER — true if the
--      caller and target_id are both involved (as booker or
--      participant) in at least one common booking.
--   2. A profiles SELECT policy using that function, so split
--      companions can resolve each other's email.
--   3. A booking_splits SELECT policy (via the existing is_my_split
--      helper) so a participant can see every row of a booking they're
--      part of, not just their own — needed to list "who else is
--      playing".
--
--   Same recursion-avoidance rule as always: both new policies check
--   membership through a SECURITY DEFINER function rather than a raw
--   subquery, so they don't add an edge to the RLS dependency graph.
-- ============================================================

create or replace function is_split_companion(target_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from bookings b
    where (b.user_id = auth.uid() or exists (select 1 from booking_splits s where s.booking_id = b.id and s.user_id = auth.uid()))
      and (b.user_id = target_id or exists (select 1 from booking_splits s2 where s2.booking_id = b.id and s2.user_id = target_id))
  );
$$;

drop policy if exists "split companions view each other's email" on profiles;
create policy "split companions view each other's email"
  on profiles for select
  using (is_split_companion(profiles.id));

drop policy if exists "co-participants view all splits of their booking" on booking_splits;
create policy "co-participants view all splits of their booking"
  on booking_splits for select
  using (is_my_split(booking_splits.booking_id));
