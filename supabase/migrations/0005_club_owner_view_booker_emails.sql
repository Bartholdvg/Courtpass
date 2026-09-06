-- ============================================================
-- CourtPass — let club owners see who booked their courts
--
-- Run this ONCE in Supabase Dashboard -> SQL Editor -> New query -> Run,
-- after 0001-0004. Safe to re-run (idempotent).
--
-- What this does:
--   Club owners can already see the bookings made at their own clubs
--   (see the "customers and club owners see relevant bookings" policy
--   from 0001), but profiles.email was only readable for your own row
--   or, since 0003, for a platform admin. That left club owners unable
--   to resolve who actually booked a court (email showed up blank).
--   This adds one more profiles SELECT policy: a club owner may read
--   the profile of anyone who has a booking at a club they own.
-- ============================================================

drop policy if exists "club owners view bookers of their clubs" on profiles;
create policy "club owners view bookers of their clubs"
  on profiles for select
  using (
    exists (
      select 1
      from bookings b
      join clubs c on c.id = b.club_id
      where b.user_id = profiles.id and c.owner_id = auth.uid()
    )
  );
