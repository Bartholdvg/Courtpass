-- ============================================================
-- CourtPass — club/referral leads + locatie-check-in
--
-- Run this ONCE in Supabase Dashboard -> SQL Editor -> New query -> Run,
-- after 0001-0017. Safe to re-run (idempotent).
--
-- What this does:
--   1. club_leads: a simple inbox for two public forms — a tennis club
--      that wants to join CourtPass, or a happy customer suggesting we
--      approach a club near them. Insertable by anyone (no login
--      required to express interest), readable only by platform admins.
--      user_id is recorded when the submitter happens to be logged in,
--      but is nullable — a club owner filling in the interest form is
--      very likely NOT already a CourtPass user.
--
--   2. self_check_in_booking(): the same "checked_in_at" the QR flow
--      sets, but authorized differently — instead of a staff member
--      confirming a scan, the booker confirms their OWN GPS position is
--      within 300m of the club. Reuses clubs.qr_checkin_enabled (a club
--      that turned on digital check-in gets both methods, QR and
--      location, rather than a second toggle). Also requires the
--      current time to fall within the booking's slot (from 2 hours
--      before start to the end time) — otherwise checking in would work
--      from home a week early, which defeats the point. Distance and
--      time-window are returned rather than just pass/fail so the
--      client can show "nog 850m te gaan" instead of a bare error.
-- ============================================================

create table if not exists club_leads (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('club_interest', 'referral')),
  name text not null,
  email text not null,
  club_name text,
  city text,
  message text,
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table club_leads enable row level security;

drop policy if exists "anyone can submit a lead" on club_leads;
create policy "anyone can submit a lead"
  on club_leads for insert
  with check (true);

drop policy if exists "platform admins read leads" on club_leads;
create policy "platform admins read leads"
  on club_leads for select
  using (is_platform_admin(auth.uid()));

create or replace function self_check_in_booking(p_booking_id uuid, p_lat double precision, p_lng double precision)
returns table (
  distance_km double precision,
  within_range boolean,
  within_time_window boolean,
  already_checked_in boolean,
  checked_in boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking record;
  v_club_lat double precision;
  v_club_lng double precision;
  v_qr_enabled boolean;
  v_distance_km double precision;
  v_within_range boolean;
  v_within_window boolean;
  v_starts_at timestamp;
  v_ends_at timestamp;
  v_was_checked_in boolean;
  v_now_checked_in boolean;
begin
  select b.id, b.user_id, b.club_id, b.status, b.date, b.start_time, b.end_time, b.checked_in_at
  into v_booking
  from bookings b
  where b.id = p_booking_id
  for update of b;

  if v_booking.id is null then
    raise exception 'Booking not found';
  end if;

  if v_booking.user_id <> auth.uid() then
    raise exception 'Not authorized';
  end if;

  if v_booking.status <> 'confirmed' then
    raise exception 'Deze boeking is geannuleerd';
  end if;

  select c.lat::double precision, c.lng::double precision, c.qr_checkin_enabled
  into v_club_lat, v_club_lng, v_qr_enabled
  from clubs c where c.id = v_booking.club_id;

  if not coalesce(v_qr_enabled, false) then
    raise exception 'Check-in staat niet aan voor deze club';
  end if;

  v_distance_km := 2 * 6371 * asin(sqrt(
    sin(radians(p_lat - v_club_lat) / 2) ^ 2 +
    cos(radians(v_club_lat)) * cos(radians(p_lat)) * sin(radians(p_lng - v_club_lng) / 2) ^ 2
  ));
  v_within_range := v_distance_km <= 0.3;

  v_starts_at := v_booking.date + v_booking.start_time::time;
  v_ends_at := v_booking.date + v_booking.end_time::time;
  v_within_window := now()::timestamp between v_starts_at - interval '2 hours' and v_ends_at;

  v_was_checked_in := v_booking.checked_in_at is not null;
  v_now_checked_in := v_was_checked_in;

  if v_within_range and v_within_window and not v_was_checked_in then
    update bookings set checked_in_at = now() where id = v_booking.id;
    v_now_checked_in := true;
  end if;

  return query select v_distance_km, v_within_range, v_within_window, v_was_checked_in, v_now_checked_in;
end;
$$;

grant execute on function self_check_in_booking(uuid, double precision, double precision) to authenticated;
