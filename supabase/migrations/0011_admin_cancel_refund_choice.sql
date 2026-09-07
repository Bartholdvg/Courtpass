-- ============================================================
-- CourtPass — admin kan kiezen: annuleren met of zonder terugbetaling
--
-- Run this ONCE in Supabase Dashboard -> SQL Editor -> New query -> Run,
-- after 0001-0010. Safe to re-run (idempotent).
--
-- What this does:
--   cancel_my_booking() gets a second parameter, p_refund (default true).
--   Until now every cancellation — customer or staff — always refunded
--   the full amount automatically, with no way for a club owner/platform
--   admin to cancel a no-show or abuse case WITHOUT giving the credits
--   back. p_refund lets staff choose per cancellation.
--
--   A customer cancelling their OWN booking always still gets refunded
--   in full — v_is_own_booking forces v_do_refund := true regardless of
--   what p_refund was passed, so this new parameter is a staff-only
--   override, never something a customer can use against themselves or
--   their co-players.
--
--   The single-arg cancel_my_booking(uuid) is dropped and replaced by
--   this two-arg version (with a default) so there's exactly one
--   signature — a default param alongside a still-existing overload
--   would leave PostgREST unable to resolve which one to call.
-- ============================================================

drop function if exists cancel_my_booking(uuid);

create or replace function cancel_my_booking(p_booking_id uuid, p_refund boolean default true)
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
  v_do_refund boolean;
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
    v_do_refund := true;
  else
    v_do_refund := coalesce(p_refund, true);
  end if;

  update bookings set status = 'cancelled' where id = p_booking_id;

  if v_do_refund then
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
  end if;
end;
$$;

grant execute on function cancel_my_booking(uuid, boolean) to authenticated;
