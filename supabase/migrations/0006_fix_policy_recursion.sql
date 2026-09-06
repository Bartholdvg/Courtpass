-- ============================================================
-- CourtPass — fix "infinite recursion detected in policy for relation
-- bookings/profiles"
--
-- Run this ONCE in Supabase Dashboard -> SQL Editor -> New query -> Run,
-- after 0001-0005. Safe to re-run (idempotent).
--
-- Root cause: migration 0001 wrote several policies (on clubs, courts,
-- the pricing_* tables, and bookings) with an inline admin check —
-- `exists (select 1 from profiles where id = auth.uid() and
-- is_platform_admin)` — instead of the is_platform_admin(uid) SECURITY
-- DEFINER helper added later in 0003. A raw subquery like that is a
-- direct reference to `profiles`, so it becomes an edge in Postgres's
-- row-security dependency graph; a function call is not (Postgres
-- doesn't look inside function bodies for this).
--
-- That was harmless on its own — clubs/courts/pricing_*/bookings
-- pointing at profiles was a dead end, since nothing on profiles
-- pointed back. Migration 0005 added a profiles policy that reads
-- from `bookings` (so a club owner can resolve who booked their
-- court), which closed the loop: profiles -> bookings -> (clubs or
-- profiles directly) -> profiles -> ... Postgres detects this at
-- query-plan time and refuses with "infinite recursion detected in
-- policy for relation ...".
--
-- Fix: swap every remaining raw profiles subquery for the
-- is_platform_admin(auth.uid()) function call, exactly like 0003
-- already did for profiles' own admin-view policy. Behaviour is
-- identical; the only thing that changes is that the dependency
-- graph no longer has an edge into profiles from these tables.
-- ============================================================

drop policy if exists "club owners and platform admins manage clubs" on clubs;
create policy "club owners and platform admins manage clubs"
  on clubs for all
  using (
    auth.uid() = owner_id
    or is_platform_admin(auth.uid())
  )
  with check (
    auth.uid() = owner_id
    or is_platform_admin(auth.uid())
  );

drop policy if exists "club owners and platform admins manage courts" on courts;
create policy "club owners and platform admins manage courts"
  on courts for all
  using (
    exists (
      select 1 from clubs
      where clubs.id = courts.club_id
        and (clubs.owner_id = auth.uid() or is_platform_admin(auth.uid()))
    )
  )
  with check (
    exists (
      select 1 from clubs
      where clubs.id = courts.club_id
        and (clubs.owner_id = auth.uid() or is_platform_admin(auth.uid()))
    )
  );

drop policy if exists "only platform admins edit pricing settings" on pricing_settings;
create policy "only platform admins edit pricing settings"
  on pricing_settings for all
  using (is_platform_admin(auth.uid()))
  with check (is_platform_admin(auth.uid()));

drop policy if exists "only platform admins edit pricing weights" on pricing_weights;
create policy "only platform admins edit pricing weights"
  on pricing_weights for all
  using (is_platform_admin(auth.uid()))
  with check (is_platform_admin(auth.uid()));

drop policy if exists "only platform admins edit pricing score tables" on pricing_score_tables;
create policy "only platform admins edit pricing score tables"
  on pricing_score_tables for all
  using (is_platform_admin(auth.uid()))
  with check (is_platform_admin(auth.uid()));

drop policy if exists "only platform admins edit pricing score rows" on pricing_score_rows;
create policy "only platform admins edit pricing score rows"
  on pricing_score_rows for all
  using (is_platform_admin(auth.uid()))
  with check (is_platform_admin(auth.uid()));

drop policy if exists "customers and club owners see relevant bookings" on bookings;
create policy "customers and club owners see relevant bookings"
  on bookings for select
  using (
    auth.uid() = user_id
    or exists (
      select 1 from clubs
      where clubs.id = bookings.club_id
        and (clubs.owner_id = auth.uid() or is_platform_admin(auth.uid()))
    )
  );

drop policy if exists "customers or club owners cancel bookings" on bookings;
create policy "customers or club owners cancel bookings"
  on bookings for update
  using (
    auth.uid() = user_id
    or exists (
      select 1 from clubs
      where clubs.id = bookings.club_id
        and (clubs.owner_id = auth.uid() or is_platform_admin(auth.uid()))
    )
  );
