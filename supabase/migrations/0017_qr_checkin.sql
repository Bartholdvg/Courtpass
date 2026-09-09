-- ============================================================
-- CourtPass — QR check-in bij de balie (optioneel per club)
--
-- Run this ONCE in Supabase Dashboard -> SQL Editor -> New query -> Run,
-- after 0001-0016. Safe to re-run (idempotent).
--
-- What this does:
--   - clubs.qr_checkin_enabled: per-club opt-in toggle (default off), set
--     by the club owner/platform admin from the club-admin "Clubs" form,
--     same pattern as the club's other owner-editable fields.
--   - bookings.checked_in_at: set once, server-side only, by
--     check_in_booking() below — never directly writable by a client
--     (bookings UPDATE stays revoked from 0016; only this SECURITY
--     DEFINER function can set it).
--   - check_in_booking(): looks a booking up by its booking_code (the
--     source of truth — never by client-supplied date/email, which
--     would let a forged QR pick which record to match against).
--     Only a club owner or platform admin for THAT booking's club may
--     call it (same v_is_staff pattern as cancel_my_booking). p_date and
--     p_email are the values printed/encoded on the QR (or typed in
--     manually as a fallback when no QR is available) — when given, they
--     must match the real record for match_date/match_email to come back
--     true; when omitted (manual code-only check-in) that check is
--     skipped. checked_in_at is only ever set when everything provided
--     matches, so a staff member always sees a clear match/mismatch
--     result before trusting a scan.
-- ============================================================

alter table clubs add column if not exists qr_checkin_enabled boolean not null default false;
alter table bookings add column if not exists checked_in_at timestamptz;

create or replace function check_in_booking(p_booking_code text, p_date date default null, p_email text default null)
returns table (
  booking_id uuid,
  club_id uuid,
  club_name text,
  court_name text,
  date date,
  start_time text,
  end_time text,
  booker_email text,
  status text,
  match_date boolean,
  match_email boolean,
  already_checked_in boolean,
  checked_in boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking record;
  v_is_staff boolean;
  v_match_date boolean;
  v_match_email boolean;
  v_was_checked_in boolean;
  v_now_checked_in boolean;
begin
  select b.id, b.club_id, b.club_name, b.court_name, b.date, b.start_time, b.end_time,
         b.status, b.checked_in_at, p.email as booker_email
  into v_booking
  from bookings b
  join profiles p on p.id = b.user_id
  where b.booking_code = p_booking_code
  for update of b;

  if v_booking.id is null then
    raise exception 'Boekingscode niet gevonden';
  end if;

  v_is_staff := exists (
    select 1 from clubs c where c.id = v_booking.club_id and (c.owner_id = auth.uid() or is_platform_admin(auth.uid()))
  );
  if not v_is_staff then
    raise exception 'Not authorized';
  end if;

  if v_booking.status <> 'confirmed' then
    raise exception 'Deze boeking is geannuleerd';
  end if;

  v_match_date := p_date is null or p_date = v_booking.date;
  v_match_email := p_email is null or lower(trim(p_email)) = lower(trim(v_booking.booker_email));
  v_was_checked_in := v_booking.checked_in_at is not null;
  v_now_checked_in := v_was_checked_in;

  if v_match_date and v_match_email and not v_was_checked_in then
    update bookings set checked_in_at = now() where id = v_booking.id;
    v_now_checked_in := true;
  end if;

  return query select
    v_booking.id, v_booking.club_id, v_booking.club_name, v_booking.court_name,
    v_booking.date, v_booking.start_time, v_booking.end_time, v_booking.booker_email,
    v_booking.status, v_match_date, v_match_email, v_was_checked_in, v_now_checked_in;
end;
$$;

grant execute on function check_in_booking(text, date, text) to authenticated;
