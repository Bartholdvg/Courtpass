-- ============================================================
-- CourtPass — credits balance + safer profile updates + email lookup
--
-- Run this ONCE in Supabase Dashboard -> SQL Editor -> New query -> Run,
-- after 0001 and 0002. Safe to re-run (idempotent).
--
-- What this does:
--   1. Adds profiles.email (kept in sync on signup) and profiles.
--      credits_balance, so platform admins can look up a user by email
--      to assign them as a club owner, and customers have a real
--      credits balance instead of the fake local-only number.
--   2. FIXES A SECURITY GAP from migration 0001: the "profiles are
--      editable by their owner" policy let any signed-in user update
--      ANY column on their own profile row via the API — including
--      is_platform_admin, i.e. anyone could have made themselves a
--      platform admin. That policy is dropped. Credits can now only
--      change through adjust_my_credits() below, which touches
--      nothing else and refuses to go negative.
--   3. Lets platform admins read every profile (needed to resolve an
--      email to a user id when assigning a club owner).
-- ============================================================

-- ---------- profiles: new columns ----------
alter table profiles add column if not exists email text;
alter table profiles add column if not exists credits_balance numeric not null default 0;

-- keep profiles.email populated for both new and already-existing users
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email)
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$ language plpgsql security definer;

update profiles p
set email = u.email
from auth.users u
where u.id = p.id and (p.email is null or p.email <> u.email);

-- ---------- profiles: tighten + extend policies ----------

-- Remove the overly broad self-update policy (see note above).
drop policy if exists "profiles are editable by their owner" on profiles;

-- Platform admins need to see every profile to resolve "email -> user id"
-- when assigning a club owner. (References profiles from within its own
-- policy; safe because the calling user's own row is still visible via
-- the existing "profiles are viewable by their owner" policy, so the
-- subquery below terminates without recursion.)
drop policy if exists "platform admins view all profiles" on profiles;
create policy "platform admins view all profiles"
  on profiles for select
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.is_platform_admin));

-- ---------- credits: the only way credits_balance may change ----------
-- security definer so it can update the row despite no general UPDATE
-- policy existing on profiles any more; still scoped to auth.uid() only,
-- so a user can only ever adjust their own balance, and never below zero.
create or replace function adjust_my_credits(delta numeric)
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

  return new_balance;
end;
$$;

grant execute on function adjust_my_credits(numeric) to authenticated;
