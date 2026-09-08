-- ============================================================
-- CourtPass — favoriete clubs
--
-- Run this ONCE in Supabase Dashboard -> SQL Editor -> New query -> Run,
-- after 0001-0013. Safe to re-run (idempotent).
--
-- What this does:
--   Adds favorite_clubs: a plain join table (user_id, club_id) so a
--   customer can favorite clubs they like. No SECURITY DEFINER function
--   needed — a user only ever reads/writes their own rows, so a single
--   straightforward RLS policy covers it (no cross-table checks, so no
--   recursion risk either).
-- ============================================================

create table if not exists favorite_clubs (
  user_id uuid not null references profiles(id) on delete cascade,
  club_id uuid not null references clubs(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, club_id)
);

alter table favorite_clubs enable row level security;

drop policy if exists "users manage own favorite clubs" on favorite_clubs;
create policy "users manage own favorite clubs"
  on favorite_clubs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
