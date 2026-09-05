-- ============================================================
-- CourtPass — additional demo clubs (Amsterdam area)
--
-- Adds 20 more demo clubs on top of the 5 from 0001, for 25 total.
-- Run this ONCE in Supabase Dashboard -> SQL Editor -> New query -> Run,
-- after 0001_booking_platform.sql. Safe to re-run (idempotent, same
-- "if not exists" pattern as 0001).
-- ============================================================

do $$
declare
  v_club_id uuid;
begin
  if not exists (select 1 from clubs where name = 'Buitenveldert Tennis Club (demo)') then
    insert into clubs (name, address, lat, lng, tier, open_from, open_to, demand, hist_occupancy)
    values ('Buitenveldert Tennis Club (demo)', 'Buitenveldertselaan 100, Amsterdam', 52.3350, 4.8730, 'Tier B', '08:00', '22:00', 'Normaal', '50-70%')
    returning id into v_club_id;
    insert into courts (club_id, name, indoor, surface) values
      (v_club_id,'Court 1',false,'Clay'),(v_club_id,'Court 2',false,'Clay'),
      (v_club_id,'Court 3',false,'Hard court'),(v_club_id,'Court 4',true,'Hard court');
  end if;

  if not exists (select 1 from clubs where name = 'TC De Pijp (demo)') then
    insert into clubs (name, address, lat, lng, tier, open_from, open_to, demand, hist_occupancy)
    values ('TC De Pijp (demo)', 'Ceintuurbaan 200, Amsterdam', 52.3550, 4.8930, 'Tier C', '08:00', '22:00', 'Hoog', '70-90%')
    returning id into v_club_id;
    insert into courts (club_id, name, indoor, surface) values
      (v_club_id,'Court 1',false,'Hard court'),(v_club_id,'Court 2',false,'Hard court'),(v_club_id,'Court 3',false,'Clay');
  end if;

  if not exists (select 1 from clubs where name = 'Jordaan Tennis Courts (demo)') then
    insert into clubs (name, address, lat, lng, tier, open_from, open_to, demand, hist_occupancy)
    values ('Jordaan Tennis Courts (demo)', 'Elandsgracht 50, Amsterdam', 52.3720, 4.8790, 'Tier B', '07:00', '23:00', 'Hoog', '70-90%')
    returning id into v_club_id;
    insert into courts (club_id, name, indoor, surface) values
      (v_club_id,'Court 1',false,'Clay'),(v_club_id,'Court 2',false,'Clay'),
      (v_club_id,'Court 3',true,'Hard court'),(v_club_id,'Court 4',true,'Carpet');
  end if;

  if not exists (select 1 from clubs where name = 'Oud-West Racket Club (demo)') then
    insert into clubs (name, address, lat, lng, tier, open_from, open_to, demand, hist_occupancy)
    values ('Oud-West Racket Club (demo)', 'Kinkerstraat 150, Amsterdam', 52.3660, 4.8600, 'Tier C', '08:00', '22:00', 'Normaal', '50-70%')
    returning id into v_club_id;
    insert into courts (club_id, name, indoor, surface) values
      (v_club_id,'Court 1',false,'Hard court'),(v_club_id,'Court 2',false,'Hard court'),(v_club_id,'Court 3',false,'Clay');
  end if;

  if not exists (select 1 from clubs where name = 'IJburg Tennis Vereniging (demo)') then
    insert into clubs (name, address, lat, lng, tier, open_from, open_to, demand, hist_occupancy)
    values ('IJburg Tennis Vereniging (demo)', 'Pampuslaan 10, Amsterdam', 52.3550, 5.0130, 'Tier D', '09:00', '21:00', 'Laag', '30-50%')
    returning id into v_club_id;
    insert into courts (club_id, name, indoor, surface) values
      (v_club_id,'Court 1',false,'Hard court'),(v_club_id,'Court 2',false,'Clay'),(v_club_id,'Court 3',false,'Clay');
  end if;

  if not exists (select 1 from clubs where name = 'Watergraafsmeer TC (demo)') then
    insert into clubs (name, address, lat, lng, tier, open_from, open_to, demand, hist_occupancy)
    values ('Watergraafsmeer TC (demo)', 'Kruislaan 400, Amsterdam', 52.3480, 4.9440, 'Tier C', '08:00', '22:00', 'Normaal', '50-70%')
    returning id into v_club_id;
    insert into courts (club_id, name, indoor, surface) values
      (v_club_id,'Court 1',false,'Clay'),(v_club_id,'Court 2',false,'Clay'),
      (v_club_id,'Court 3',false,'Hard court'),(v_club_id,'Court 4',false,'Hard court');
  end if;

  if not exists (select 1 from clubs where name = 'Osdorp Sportpark Tennis (demo)') then
    insert into clubs (name, address, lat, lng, tier, open_from, open_to, demand, hist_occupancy)
    values ('Osdorp Sportpark Tennis (demo)', 'Osdorperweg 20, Amsterdam', 52.3630, 4.7930, 'Tier D', '09:00', '21:00', 'Laag', '<30%')
    returning id into v_club_id;
    insert into courts (club_id, name, indoor, surface) values
      (v_club_id,'Court 1',false,'Hard court'),(v_club_id,'Court 2',false,'Hard court'),(v_club_id,'Court 3',false,'Clay');
  end if;

  if not exists (select 1 from clubs where name = 'Slotervaart Tennis Club (demo)') then
    insert into clubs (name, address, lat, lng, tier, open_from, open_to, demand, hist_occupancy)
    values ('Slotervaart Tennis Club (demo)', 'Sloterweg 850, Amsterdam', 52.3480, 4.8130, 'Tier D', '08:00', '22:00', 'Laag', '30-50%')
    returning id into v_club_id;
    insert into courts (club_id, name, indoor, surface) values
      (v_club_id,'Court 1',false,'Hard court'),(v_club_id,'Court 2',false,'Clay');
  end if;

  if not exists (select 1 from clubs where name = 'Geuzenveld TC (demo)') then
    insert into clubs (name, address, lat, lng, tier, open_from, open_to, demand, hist_occupancy)
    values ('Geuzenveld TC (demo)', 'Burgemeester de Vlugtlaan 50, Amsterdam', 52.3800, 4.8130, 'Tier E', '09:00', '21:00', 'Zeer laag', '<30%')
    returning id into v_club_id;
    insert into courts (club_id, name, indoor, surface) values
      (v_club_id,'Court 1',false,'Hard court'),(v_club_id,'Court 2',false,'Hard court');
  end if;

  if not exists (select 1 from clubs where name = 'Amsterdam Centrum Padel & Tennis (demo)') then
    insert into clubs (name, address, lat, lng, tier, open_from, open_to, demand, hist_occupancy)
    values ('Amsterdam Centrum Padel & Tennis (demo)', 'Prins Hendrikkade 100, Amsterdam', 52.3770, 4.9100, 'Tier A', '07:00', '23:00', 'Zeer hoog', '>90%')
    returning id into v_club_id;
    insert into courts (club_id, name, indoor, surface) values
      (v_club_id,'Court 1',true,'Hard court'),(v_club_id,'Court 2',true,'Hard court'),
      (v_club_id,'Court 3',true,'Carpet'),(v_club_id,'Court 4',false,'Hard court');
  end if;

  if not exists (select 1 from clubs where name = 'Bos en Lommer Tennis (demo)') then
    insert into clubs (name, address, lat, lng, tier, open_from, open_to, demand, hist_occupancy)
    values ('Bos en Lommer Tennis (demo)', 'Bos en Lommerweg 100, Amsterdam', 52.3800, 4.8460, 'Tier C', '08:00', '22:00', 'Normaal', '50-70%')
    returning id into v_club_id;
    insert into courts (club_id, name, indoor, surface) values
      (v_club_id,'Court 1',false,'Hard court'),(v_club_id,'Court 2',false,'Clay'),(v_club_id,'Court 3',false,'Clay');
  end if;

  if not exists (select 1 from clubs where name = 'TC Buikslotermeer Noord (demo)') then
    insert into clubs (name, address, lat, lng, tier, open_from, open_to, demand, hist_occupancy)
    values ('TC Buikslotermeer Noord (demo)', 'Buikslotermeerplein 50, Amsterdam', 52.4050, 4.9380, 'Tier D', '09:00', '21:00', 'Laag', '30-50%')
    returning id into v_club_id;
    insert into courts (club_id, name, indoor, surface) values
      (v_club_id,'Court 1',false,'Hard court'),(v_club_id,'Court 2',false,'Hard court'),(v_club_id,'Court 3',false,'Clay');
  end if;

  if not exists (select 1 from clubs where name = 'Zeeburg Tennis Club (demo)') then
    insert into clubs (name, address, lat, lng, tier, open_from, open_to, demand, hist_occupancy)
    values ('Zeeburg Tennis Club (demo)', 'Zeeburgerdijk 200, Amsterdam', 52.3660, 4.9370, 'Tier C', '08:00', '22:00', 'Normaal', '50-70%')
    returning id into v_club_id;
    insert into courts (club_id, name, indoor, surface) values
      (v_club_id,'Court 1',false,'Hard court'),(v_club_id,'Court 2',false,'Clay');
  end if;

  if not exists (select 1 from clubs where name = 'TC Rivierenbuurt (demo)') then
    insert into clubs (name, address, lat, lng, tier, open_from, open_to, demand, hist_occupancy)
    values ('TC Rivierenbuurt (demo)', 'Rijnstraat 100, Amsterdam', 52.3510, 4.9040, 'Tier B', '08:00', '22:00', 'Hoog', '70-90%')
    returning id into v_club_id;
    insert into courts (club_id, name, indoor, surface) values
      (v_club_id,'Court 1',false,'Clay'),(v_club_id,'Court 2',false,'Clay'),
      (v_club_id,'Court 3',false,'Hard court'),(v_club_id,'Court 4',true,'Hard court');
  end if;

  if not exists (select 1 from clubs where name = 'Amstel Park Racket Academy (demo)') then
    insert into clubs (name, address, lat, lng, tier, open_from, open_to, demand, hist_occupancy)
    values ('Amstel Park Racket Academy (demo)', 'Amstelpark 2, Amsterdam', 52.3300, 4.8950, 'Tier A', '07:00', '23:00', 'Zeer hoog', '>90%')
    returning id into v_club_id;
    insert into courts (club_id, name, indoor, surface) values
      (v_club_id,'Court 1',true,'Hard court'),(v_club_id,'Court 2',true,'Hard court'),
      (v_club_id,'Court 3',false,'Clay'),(v_club_id,'Court 4',false,'Clay'),(v_club_id,'Court 5',false,'Grass');
  end if;

  if not exists (select 1 from clubs where name = 'TC Weesp (demo)') then
    insert into clubs (name, address, lat, lng, tier, open_from, open_to, demand, hist_occupancy)
    values ('TC Weesp (demo)', 'Nieuwstad 30, Weesp', 52.3070, 5.0430, 'Tier D', '09:00', '21:00', 'Laag', '30-50%')
    returning id into v_club_id;
    insert into courts (club_id, name, indoor, surface) values
      (v_club_id,'Court 1',false,'Clay'),(v_club_id,'Court 2',false,'Clay');
  end if;

  if not exists (select 1 from clubs where name = 'Duivendrecht Tennis Club (demo)') then
    insert into clubs (name, address, lat, lng, tier, open_from, open_to, demand, hist_occupancy)
    values ('Duivendrecht Tennis Club (demo)', 'Sportpark Duivendrecht 5, Duivendrecht', 52.3220, 4.9310, 'Tier D', '09:00', '21:00', 'Laag', '30-50%')
    returning id into v_club_id;
    insert into courts (club_id, name, indoor, surface) values
      (v_club_id,'Court 1',false,'Hard court'),(v_club_id,'Court 2',false,'Clay'),(v_club_id,'Court 3',false,'Clay');
  end if;

  if not exists (select 1 from clubs where name = 'TC Landlust (demo)') then
    insert into clubs (name, address, lat, lng, tier, open_from, open_to, demand, hist_occupancy)
    values ('TC Landlust (demo)', 'Landlustplein 10, Amsterdam', 52.3810, 4.8460, 'Tier C', '08:00', '22:00', 'Normaal', '50-70%')
    returning id into v_club_id;
    insert into courts (club_id, name, indoor, surface) values
      (v_club_id,'Court 1',false,'Hard court'),(v_club_id,'Court 2',false,'Hard court'),(v_club_id,'Court 3',false,'Clay');
  end if;

  if not exists (select 1 from clubs where name = 'Frankendael Tennis (demo)') then
    insert into clubs (name, address, lat, lng, tier, open_from, open_to, demand, hist_occupancy)
    values ('Frankendael Tennis (demo)', 'Middenweg 300, Amsterdam', 52.3460, 4.9330, 'Tier B', '08:00', '22:00', 'Hoog', '70-90%')
    returning id into v_club_id;
    insert into courts (club_id, name, indoor, surface) values
      (v_club_id,'Court 1',false,'Clay'),(v_club_id,'Court 2',false,'Clay'),(v_club_id,'Court 3',false,'Hard court');
  end if;

  if not exists (select 1 from clubs where name = 'Sloterdijk Sport & Tennis (demo)') then
    insert into clubs (name, address, lat, lng, tier, open_from, open_to, demand, hist_occupancy)
    values ('Sloterdijk Sport & Tennis (demo)', 'Radarweg 50, Amsterdam', 52.3890, 4.8390, 'Tier E', '09:00', '21:00', 'Zeer laag', '<30%')
    returning id into v_club_id;
    insert into courts (club_id, name, indoor, surface) values
      (v_club_id,'Court 1',false,'Hard court'),(v_club_id,'Court 2',false,'Hard court');
  end if;
end $$;
