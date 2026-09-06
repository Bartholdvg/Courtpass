-- ============================================================
-- CourtPass — fase 3: kosten splitsen tussen spelers
--
-- Run this ONCE in Supabase Dashboard -> SQL Editor -> New query -> Run,
-- after 0001-0007. Safe to re-run (idempotent).
--
-- Model (deliberately simplified vs. a literal hold/release/capture):
--   The booker's FULL price is already charged up front by the existing
--   createBooking flow (unchanged). This migration adds booking_splits:
--   one row per participant (the booker included, recorded as already
--   'paid' since their charge already happened) recording who owes what.
--   When a co-player pays their share, they are debited and the booker
--   is credited back that amount — so the booker is only ever "out"
--   the money nobody has paid back yet, without needing a separate
--   "held" credit type. A guest (no account) can never pay through the
--   app in this version — their share simply stays the booker's to
--   collect outside the app; that's a disclosed simplification.
--
-- RLS recursion note (learned the hard way in 0005/0006): bookings'
-- policy needs to let a split participant see the booking, but
-- booking_splits' policy needs to check bookings to let the booker see
-- every share of their own booking. Referencing each other directly in
-- both directions is exactly the cycle Postgres rejects. Fix: wrap the
-- bookings->booking_splits direction in a SECURITY DEFINER function
-- (is_my_split), same pattern as is_platform_admin. booking_splits'
-- own policy can reference bookings directly since that direction
-- doesn't loop back.
-- ============================================================

create table if not exists booking_splits (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  user_id uuid references profiles(id),
  guest_name text,
  credits numeric not null check (credits >= 0),
  status text not null default 'pending' check (status in ('pending', 'paid', 'covered_by_booker')),
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  constraint booking_splits_participant check (user_id is not null or guest_name is not null)
);

create index if not exists booking_splits_booking_id_idx on booking_splits (booking_id);
create index if not exists booking_splits_user_id_idx on booking_splits (user_id);

alter table booking_splits enable row level security;

create or replace function is_my_split(p_booking_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (select 1 from booking_splits where booking_id = p_booking_id and user_id = auth.uid());
$$;

drop policy if exists "participants view their own split" on booking_splits;
create policy "participants view their own split"
  on booking_splits for select
  using (auth.uid() = user_id);

drop policy if exists "booker views splits of their booking" on booking_splits;
create policy "booker views splits of their booking"
  on booking_splits for select
  using (
    exists (select 1 from bookings b where b.id = booking_splits.booking_id and b.user_id = auth.uid())
  );

drop policy if exists "platform admins view all splits" on booking_splits;
create policy "platform admins view all splits"
  on booking_splits for select
  using (is_platform_admin(auth.uid()));

-- Let a split participant see the (limited) booking they're part of,
-- via the function above so the dependency graph doesn't cycle back.
drop policy if exists "customers and club owners see relevant bookings" on bookings;
create policy "customers and club owners see relevant bookings"
  on bookings for select
  using (
    auth.uid() = user_id
    or is_my_split(bookings.id)
    or exists (
      select 1 from clubs
      where clubs.id = bookings.club_id
        and (clubs.owner_id = auth.uid() or is_platform_admin(auth.uid()))
    )
  );

-- ---------- resolve an email to a user id, for adding a co-player ----------
-- Any signed-in user may call this (not just admins) — needed to invite a
-- friend by email. Only returns whether an id exists, nothing else about
-- that profile (same minor email-enumeration trade-off already accepted
-- elsewhere in this sandbox).
create or replace function resolve_user_id_by_email(p_email text)
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select id from profiles where email ilike trim(p_email) limit 1;
$$;

grant execute on function resolve_user_id_by_email(text) to authenticated;

-- ---------- create the split for a just-created booking ----------
-- p_participants: jsonb array of {"user_id": uuid|null, "guest_name": text|null, "credits": number}.
-- Must include the booker's own row. Credits must sum exactly to the
-- booking's price_credits (no rounding leaks). Can only be called once
-- per booking, by the booker, while the booking is still confirmed.
create or replace function create_booking_split(p_booking_id uuid, p_participants jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking record;
  v_total numeric;
  v_item jsonb;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_booking from bookings where id = p_booking_id;
  if not found then
    raise exception 'Booking not found';
  end if;
  if v_booking.user_id <> auth.uid() then
    raise exception 'Not authorized';
  end if;
  if v_booking.status <> 'confirmed' then
    raise exception 'Booking is not confirmed';
  end if;
  if exists (select 1 from booking_splits where booking_id = p_booking_id) then
    raise exception 'Split already exists for this booking';
  end if;

  select coalesce(sum((item->>'credits')::numeric), 0) into v_total
  from jsonb_array_elements(p_participants) as item;

  if v_total <> v_booking.price_credits then
    raise exception 'Shares (%) do not sum to the booking price (%)', v_total, v_booking.price_credits;
  end if;

  for v_item in select * from jsonb_array_elements(p_participants)
  loop
    insert into booking_splits (booking_id, user_id, guest_name, credits, status, paid_at)
    values (
      p_booking_id,
      nullif(v_item->>'user_id', '')::uuid,
      nullif(v_item->>'guest_name', ''),
      (v_item->>'credits')::numeric,
      case when nullif(v_item->>'user_id', '')::uuid = auth.uid() then 'paid' else 'pending' end,
      case when nullif(v_item->>'user_id', '')::uuid = auth.uid() then now() else null end
    );
  end loop;
end;
$$;

grant execute on function create_booking_split(uuid, jsonb) to authenticated;

-- ---------- a co-player pays their own share ----------
create or replace function pay_my_split_share(p_split_id uuid)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_split record;
  v_booking record;
  v_new_balance numeric;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_split from booking_splits where id = p_split_id for update;
  if not found then
    raise exception 'Split not found';
  end if;
  if v_split.user_id <> auth.uid() then
    raise exception 'Not authorized';
  end if;
  if v_split.status <> 'pending' then
    raise exception 'This share is not pending';
  end if;

  select * into v_booking from bookings where id = v_split.booking_id;
  if v_booking.status <> 'confirmed' then
    raise exception 'Booking is not confirmed';
  end if;

  v_new_balance := adjust_my_credits(
    -v_split.credits, 'split_paid',
    'Jouw aandeel: ' || v_booking.club_name || ' - ' || v_booking.court_name,
    v_booking.id
  );

  update profiles set credits_balance = credits_balance + v_split.credits where id = v_booking.user_id;
  insert into credit_ledger (user_id, type, credits, description, booking_id, balance_after)
  select v_booking.user_id, 'split_received', v_split.credits,
         'Aandeel ontvangen: ' || v_booking.club_name || ' - ' || v_booking.court_name,
         v_booking.id, credits_balance
  from profiles where id = v_booking.user_id;

  update booking_splits set status = 'paid', paid_at = now() where id = p_split_id;

  return v_new_balance;
end;
$$;

grant execute on function pay_my_split_share(uuid) to authenticated;

-- ---------- admin: force a pending share to "covered by booker" ----------
-- Simulates the 2-hour-before-start deadline passing (there's no real
-- clock to wait on in a sandbox, same pattern as admin_simulate_renewal).
create or replace function admin_force_capture_split(p_split_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_platform_admin(auth.uid()) then
    raise exception 'Not authorized';
  end if;

  update booking_splits
  set status = 'covered_by_booker'
  where id = p_split_id and status = 'pending';
end;
$$;

grant execute on function admin_force_capture_split(uuid) to authenticated;

-- ---------- cancellation now also unwinds any split ----------
-- Replaces cancel_my_booking from 0004: still cancels + refunds the
-- booking's full price to the booker, but if a split exists, each share
-- refunds to whoever is currently "out" that money — the participant if
-- they already paid it, otherwise the booker (pending/covered shares,
-- guests included, are always the booker's money to get back).
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
  v_split record;
  v_refund_to uuid;
  v_split_new_balance numeric;
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

  if exists (select 1 from booking_splits where booking_id = p_booking_id) then
    for v_split in select * from booking_splits where booking_id = p_booking_id
    loop
      v_refund_to := case when v_split.status = 'paid' then v_split.user_id else v_user_id end;
      if v_refund_to is not null and v_split.credits > 0 then
        update profiles set credits_balance = credits_balance + v_split.credits where id = v_refund_to
          returning credits_balance into v_split_new_balance;
        insert into credit_ledger (user_id, type, credits, description, booking_id, balance_after)
        values (
          v_refund_to, 'booking_refund', v_split.credits,
          'Annulering (gesplitst aandeel) ' || coalesce(v_club_name, '') || ' - ' || coalesce(v_court_name, ''),
          p_booking_id, v_split_new_balance
        );
      end if;
    end loop;
  else
    update profiles set credits_balance = credits_balance + v_price where id = v_user_id
      returning credits_balance into v_new_balance;

    insert into credit_ledger (user_id, type, credits, description, booking_id, balance_after)
    values (
      v_user_id, 'booking_refund', v_price,
      'Annulering ' || coalesce(v_club_name, '') || ' - ' || coalesce(v_court_name, ''),
      p_booking_id, v_new_balance
    );
  end if;
end;
$$;

grant execute on function cancel_my_booking(uuid) to authenticated;
