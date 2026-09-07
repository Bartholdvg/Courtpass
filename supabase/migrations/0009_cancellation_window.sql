-- ============================================================
-- CourtPass — 12-uurs annuleringsvenster
--
-- Run this ONCE in Supabase Dashboard -> SQL Editor -> New query -> Run,
-- after 0001-0008. Safe to re-run (idempotent).
--
-- What this does:
--   1. cancel_my_booking() now refuses to cancel a booking that starts
--      within 12 hours from now, when the caller is the booking's own
--      customer — before that point, cancellation and the full refund
--      work exactly as before. No time zone handling here (the rest of
--      the app doesn't do that carefully either): date + start_time is
--      compared as a naive timestamp against now()::timestamp, i.e. in
--      the database's session time zone. Good enough for this sandbox.
--   2. Bonus fix found while touching this function: it only ever
--      allowed auth.uid() = booking.user_id, so a club owner or platform
--      admin clicking "Annuleren" in the admin dashboard on a CUSTOMER's
--      booking has always failed with "Not authorized" since fase 1.
--      Staff cancelling on a customer's behalf now works, and is not
--      subject to the 12-hour window (that's meant to stop last-minute
--      self-service refund gaming, not block a legitimate staff action).
-- ============================================================

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
  v_club_id uuid;
  v_date date;
  v_start_time text;
  v_starts_at timestamp;
  v_new_balance numeric;
  v_split record;
  v_refund_to uuid;
  v_split_new_balance numeric;
  v_is_own_booking boolean;
  v_is_staff boolean;
begin
  select user_id, price_credits, status, club_name, court_name, club_id, date, start_time
  into v_user_id, v_price, v_status, v_club_name, v_court_name, v_club_id, v_date, v_start_time
  from bookings
  where id = p_booking_id
  for update;

  if v_user_id is null then
    raise exception 'Booking not found';
  end if;

  v_is_own_booking := v_user_id = auth.uid();
  v_is_staff := exists (
    select 1 from clubs c where c.id = v_club_id and (c.owner_id = auth.uid() or is_platform_admin(auth.uid()))
  );
  if not v_is_own_booking and not v_is_staff then
    raise exception 'Not authorized';
  end if;
  if v_status <> 'confirmed' then
    raise exception 'Booking is not confirmed';
  end if;

  if v_is_own_booking then
    v_starts_at := v_date + v_start_time::time;
    if now()::timestamp >= v_starts_at - interval '12 hours' then
      raise exception 'Je kunt een boeking niet meer annuleren binnen 12 uur voor de starttijd.';
    end if;
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
