-- ============================================================
-- CourtPass — alleen platform-admins maken/verwijderen clubs
--
-- Run this ONCE in Supabase Dashboard -> SQL Editor -> New query -> Run,
-- after 0001-0011. Safe to re-run (idempotent).
--
-- What this does:
--   Until now the single "club owners and platform admins manage clubs"
--   policy covered select/insert/update/delete alike, so any authenticated
--   club owner could create brand-new clubs (self-owned) and delete their
--   own clubs, with no platform-admin involvement at all. That's no
--   longer wanted: club owners should keep managing their own club's
--   details/courts/pricing (UPDATE), but creating or deleting a club is
--   now platform-admin only — onboarding a new club becomes an admin
--   action (who then assigns the owner via the existing "Clubeigenaar"
--   flow from migration 0001), matching how ownership re-assignment
--   already worked.
--
--   SELECT is untouched: "clubs are publicly readable" (0001) already
--   grants open read access to everyone, so no select policy is needed
--   here.
-- ============================================================

drop policy if exists "club owners and platform admins manage clubs" on clubs;

create policy "club owners and platform admins update own clubs"
  on clubs for update
  using (auth.uid() = owner_id or is_platform_admin(auth.uid()))
  with check (auth.uid() = owner_id or is_platform_admin(auth.uid()));

create policy "only platform admins insert clubs"
  on clubs for insert
  with check (is_platform_admin(auth.uid()));

create policy "only platform admins delete clubs"
  on clubs for delete
  using (is_platform_admin(auth.uid()));
