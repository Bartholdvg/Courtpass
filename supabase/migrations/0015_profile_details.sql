-- ============================================================
-- CourtPass — optionele profielgegevens (telefoon, adres, postcode, stad)
--
-- Run this ONCE in Supabase Dashboard -> SQL Editor -> New query -> Run,
-- after 0001-0014. Safe to re-run (idempotent).
--
-- What this does:
--   1. Adds four optional columns to profiles: phone, address, postcode,
--      city. Useful to collect at registration, and necessary for a
--      Google sign-in (which never provides them) to fill in later on
--      a profile screen.
--   2. Adds the FIRST-EVER UPDATE policy on profiles, letting a user
--      edit their own row. This needed real care: profiles never had
--      an UPDATE policy before (every credits_balance/is_platform_admin
--      change goes through a SECURITY DEFINER RPC, bypassing RLS
--      entirely), so RLS alone has been silently blocking ALL direct
--      updates — including the table-level UPDATE grant Supabase's
--      project defaults already hand to `authenticated` on every
--      column, credits_balance and is_platform_admin included. Adding
--      a plain "own row" RLS policy without also fixing that grant
--      would let any user PATCH their own credits_balance to whatever
--      they want, or set is_platform_admin = true, via a raw REST call.
--
--      Fixed by revoking the blanket UPDATE grant and re-granting it
--      only for the columns a user should actually be able to change
--      themselves (the four new ones). credits_balance,
--      is_platform_admin, id, created_at stay update-only via the
--      existing RPCs (which run as the table owner and so aren't
--      subject to this grant at all). email is deliberately left out
--      too — it's kept in sync from auth.users by handle_new_user(),
--      and letting it be edited here directly would desync it from the
--      actual login email.
-- ============================================================

alter table profiles add column if not exists phone text;
alter table profiles add column if not exists address text;
alter table profiles add column if not exists postcode text;
alter table profiles add column if not exists city text;

revoke update on profiles from authenticated;
grant update (phone, address, postcode, city) on profiles to authenticated;

drop policy if exists "users update own profile" on profiles;
create policy "users update own profile"
  on profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);
