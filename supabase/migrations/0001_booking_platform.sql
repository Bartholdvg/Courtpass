-- ============================================================
-- CourtPass booking platform schema
--
-- Run this ONCE in Supabase Dashboard -> SQL Editor -> New query -> Run.
-- It is safe to re-run: every statement is idempotent (IF NOT EXISTS /
-- ON CONFLICT DO NOTHING / guarded seed inserts).
--
-- Creates:
--   profiles              - links auth.users to a platform-admin flag
--   clubs, courts          - the tennis clubs and their courts
--   pricing_settings,
--   pricing_weights,
--   pricing_score_tables,
--   pricing_score_rows     - the dynamic pricing model (from the Excel)
--   bookings               - customer bookings with a frozen pricing
--                            snapshot (audit trail), never recalculated
-- ============================================================

create extension if not exists pgcrypto;

-- ---------- profiles (roles) ----------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  is_platform_admin boolean not null default false,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

drop policy if exists "profiles are viewable by their owner" on profiles;
create policy "profiles are viewable by their owner"
  on profiles for select
  using (auth.uid() = id);

drop policy if exists "profiles are editable by their owner" on profiles;
create policy "profiles are editable by their owner"
  on profiles for update
  using (auth.uid() = id);

-- auto-create a profile row for every new signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- backfill profiles for any users who already existed before this migration
insert into profiles (id)
select id from auth.users
on conflict (id) do nothing;

-- ---------- clubs ----------
create table if not exists clubs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete set null,
  name text not null,
  address text not null default '',
  lat double precision not null,
  lng double precision not null,
  tier text not null default 'Tier C',
  open_from text not null default '08:00',
  open_to text not null default '22:00',
  demand text not null default 'Normaal',
  hist_occupancy text not null default '50-70%',
  dynamic_pricing boolean not null default true,
  created_at timestamptz not null default now()
);

alter table clubs enable row level security;

drop policy if exists "clubs are publicly readable" on clubs;
create policy "clubs are publicly readable"
  on clubs for select
  using (true);

drop policy if exists "club owners and platform admins manage clubs" on clubs;
create policy "club owners and platform admins manage clubs"
  on clubs for all
  using (
    auth.uid() = owner_id
    or exists (select 1 from profiles where id = auth.uid() and is_platform_admin)
  )
  with check (
    auth.uid() = owner_id
    or exists (select 1 from profiles where id = auth.uid() and is_platform_admin)
  );

-- ---------- courts ----------
create table if not exists courts (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references clubs(id) on delete cascade,
  name text not null,
  indoor boolean not null default false,
  surface text not null default 'Hard court',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table courts enable row level security;

drop policy if exists "courts are publicly readable" on courts;
create policy "courts are publicly readable"
  on courts for select
  using (true);

drop policy if exists "club owners and platform admins manage courts" on courts;
create policy "club owners and platform admins manage courts"
  on courts for all
  using (
    exists (
      select 1 from clubs
      where clubs.id = courts.club_id
        and (clubs.owner_id = auth.uid()
             or exists (select 1 from profiles where id = auth.uid() and is_platform_admin))
    )
  )
  with check (
    exists (
      select 1 from clubs
      where clubs.id = courts.club_id
        and (clubs.owner_id = auth.uid()
             or exists (select 1 from profiles where id = auth.uid() and is_platform_admin))
    )
  );

-- ---------- pricing model (platform-wide, not per club) ----------
create table if not exists pricing_settings (
  id int primary key default 1,
  base_price numeric not null default 50,
  min_price numeric not null default 35,
  max_price numeric not null default 120,
  radius_km numeric not null default 5,
  euro_per_credit numeric not null default 0.285,
  rain_forecast text not null default '0-20%',
  booking_horizon_days int not null default 90,
  weather_api boolean not null default true,
  updated_at timestamptz not null default now(),
  constraint pricing_settings_singleton check (id = 1)
);

alter table pricing_settings enable row level security;

drop policy if exists "pricing settings are publicly readable" on pricing_settings;
create policy "pricing settings are publicly readable"
  on pricing_settings for select
  using (true);

drop policy if exists "only platform admins edit pricing settings" on pricing_settings;
create policy "only platform admins edit pricing settings"
  on pricing_settings for all
  using (exists (select 1 from profiles where id = auth.uid() and is_platform_admin))
  with check (exists (select 1 from profiles where id = auth.uid() and is_platform_admin));

create table if not exists pricing_weights (
  key text primary key,
  label text not null,
  weight numeric not null default 0,
  no_table boolean not null default false,
  sort_order int not null default 0
);

alter table pricing_weights enable row level security;

drop policy if exists "pricing weights are publicly readable" on pricing_weights;
create policy "pricing weights are publicly readable"
  on pricing_weights for select
  using (true);

drop policy if exists "only platform admins edit pricing weights" on pricing_weights;
create policy "only platform admins edit pricing weights"
  on pricing_weights for all
  using (exists (select 1 from profiles where id = auth.uid() and is_platform_admin))
  with check (exists (select 1 from profiles where id = auth.uid() and is_platform_admin));

create table if not exists pricing_score_tables (
  table_key text primary key,
  title text not null
);

alter table pricing_score_tables enable row level security;

drop policy if exists "pricing score tables are publicly readable" on pricing_score_tables;
create policy "pricing score tables are publicly readable"
  on pricing_score_tables for select
  using (true);

drop policy if exists "only platform admins edit pricing score tables" on pricing_score_tables;
create policy "only platform admins edit pricing score tables"
  on pricing_score_tables for all
  using (exists (select 1 from profiles where id = auth.uid() and is_platform_admin))
  with check (exists (select 1 from profiles where id = auth.uid() and is_platform_admin));

create table if not exists pricing_score_rows (
  id uuid primary key default gen_random_uuid(),
  table_key text not null references pricing_score_tables(table_key) on delete cascade,
  value text not null,
  score numeric not null,
  sort_order int not null default 0,
  unique (table_key, value)
);

alter table pricing_score_rows enable row level security;

drop policy if exists "pricing score rows are publicly readable" on pricing_score_rows;
create policy "pricing score rows are publicly readable"
  on pricing_score_rows for select
  using (true);

drop policy if exists "only platform admins edit pricing score rows" on pricing_score_rows;
create policy "only platform admins edit pricing score rows"
  on pricing_score_rows for all
  using (exists (select 1 from profiles where id = auth.uid() and is_platform_admin))
  with check (exists (select 1 from profiles where id = auth.uid() and is_platform_admin));

-- ---------- bookings ----------
create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  booking_code text not null unique,
  user_id uuid not null references auth.users(id) on delete cascade,
  club_id uuid not null references clubs(id),
  club_name text not null,
  court_id uuid not null references courts(id),
  court_name text not null,
  court_surface text,
  court_indoor boolean,
  date date not null,
  start_time text not null,
  end_time text not null,
  price_credits numeric not null,
  price_euro numeric not null,
  pricing_snapshot jsonb not null,
  status text not null default 'confirmed' check (status in ('confirmed','cancelled')),
  created_at timestamptz not null default now()
);

-- prevent double-booking the same court/date/time at the database level
create unique index if not exists bookings_no_double_booking
  on bookings (court_id, date, start_time)
  where status = 'confirmed';

alter table bookings enable row level security;

drop policy if exists "customers and club owners see relevant bookings" on bookings;
create policy "customers and club owners see relevant bookings"
  on bookings for select
  using (
    auth.uid() = user_id
    or exists (
      select 1 from clubs
      where clubs.id = bookings.club_id
        and (clubs.owner_id = auth.uid()
             or exists (select 1 from profiles where id = auth.uid() and is_platform_admin))
    )
  );

drop policy if exists "customers create their own bookings" on bookings;
create policy "customers create their own bookings"
  on bookings for insert
  with check (auth.uid() = user_id);

drop policy if exists "customers or club owners cancel bookings" on bookings;
create policy "customers or club owners cancel bookings"
  on bookings for update
  using (
    auth.uid() = user_id
    or exists (
      select 1 from clubs
      where clubs.id = bookings.club_id
        and (clubs.owner_id = auth.uid()
             or exists (select 1 from profiles where id = auth.uid() and is_platform_admin))
    )
  );

-- ============================================================
-- Seed data — default pricing model (copied 1:1 from the Excel model)
-- ============================================================

insert into pricing_settings (id, base_price, min_price, max_price, radius_km, euro_per_credit, rain_forecast, booking_horizon_days, weather_api)
values (1, 50, 35, 120, 5, 0.285, '0-20%', 90, true)
on conflict (id) do nothing;

insert into pricing_weights (key, label, weight, no_table, sort_order) values
  ('time','Time of day',0.20,false,1),
  ('freeClub','Availability at club',0.10,false,2),
  ('lastMinute','Last minute',0.175,false,3),
  ('demand','Demand',0.05,false,4),
  ('tier','Club tier',0.10,false,5),
  ('freeArea','Availability surroundings',0.05,false,6),
  ('season','Season',0.10,false,7),
  ('weather','Weather (rain chance)',0.075,false,8),
  ('day','Weekend (day of week)',0.15,false,9),
  ('histOccupancy','Historical occupancy',0.00,false,10),
  ('schoolHoliday','School holiday',0.00,true,11)
on conflict (key) do nothing;

insert into pricing_score_tables (table_key, title) values
  ('tier','Club tier'),
  ('time','Time of day — weekdays (07:00–23:00)'),
  ('timeWeekend','Time of day — weekend (07:00–23:00)'),
  ('day','Weekend (day of week)'),
  ('season','Season'),
  ('weather','Weather (rain chance)'),
  ('freeClub','Free courts at club'),
  ('freeArea','Free courts surroundings (radius in Admin)'),
  ('lastMinute','Last minute (time until start)'),
  ('demand','Demand level'),
  ('histOccupancy','Historical occupancy')
on conflict (table_key) do nothing;

insert into pricing_score_rows (table_key, value, score, sort_order) values
  ('tier','Tier A',10,1),('tier','Tier B',8,2),('tier','Tier C',5,3),('tier','Tier D',2,4),('tier','Tier E',1,5),

  ('time','07:00',1,1),('time','08:00',1.5,2),('time','09:00',1.75,3),('time','10:00',2,4),('time','11:00',2,5),
  ('time','12:00',4,6),('time','13:00',2,7),('time','14:00',1.5,8),('time','15:00',3,9),('time','16:00',6,10),
  ('time','17:00',8,11),('time','18:00',9,12),('time','19:00',10,13),('time','20:00',10,14),('time','21:00',9,15),
  ('time','22:00',6,16),('time','23:00',2,17),

  ('timeWeekend','07:00',1,1),('timeWeekend','08:00',2,2),('timeWeekend','09:00',4,3),('timeWeekend','10:00',6,4),
  ('timeWeekend','11:00',8,5),('timeWeekend','12:00',10,6),('timeWeekend','13:00',10,7),('timeWeekend','14:00',10,8),
  ('timeWeekend','15:00',10,9),('timeWeekend','16:00',10,10),('timeWeekend','17:00',10,11),('timeWeekend','18:00',9,12),
  ('timeWeekend','19:00',7,13),('timeWeekend','20:00',5,14),('timeWeekend','21:00',3,15),('timeWeekend','22:00',2,16),
  ('timeWeekend','23:00',2,17),

  ('day','Maandag',2,1),('day','Dinsdag',2,2),('day','Woensdag',2,3),('day','Donderdag',4,4),
  ('day','Vrijdag',7,5),('day','Zaterdag',10,6),('day','Zondag',9,7),

  ('season','Winter',2,1),('season','Lente',7,2),('season','Zomer',10,3),('season','Herfst',5,4),

  ('weather','0-20%',10,1),('weather','20-40%',6,2),('weather','40-60%',3,3),('weather','60-80%',1,4),('weather','80-100%',0,5),

  ('freeClub','0 banen',10,1),('freeClub','1 baan',8,2),('freeClub','2 banen',6,3),
  ('freeClub','3 banen',5,4),('freeClub','4 banen',2,5),('freeClub','5+ banen',1,6),

  ('freeArea','0 banen',10,1),('freeArea','1-2 banen',7,2),('freeArea','3-5 banen',4,3),
  ('freeArea','6-10 banen',2,4),('freeArea','10+ banen',1,5),

  ('lastMinute','72 uur',9,1),('lastMinute','48 uur',8,2),('lastMinute','24 uur',6,3),('lastMinute','12 uur',5,4),
  ('lastMinute','6 uur',4,5),('lastMinute','3 uur',2.4,6),('lastMinute','1 uur',1.6,7),
  ('lastMinute','30 minuten',1.2,8),('lastMinute','15 minuten',0,9),

  ('demand','Zeer laag',1,1),('demand','Laag',2,2),('demand','Normaal',5,3),('demand','Hoog',8,4),('demand','Zeer hoog',10,5),

  ('histOccupancy','<30%',2,1),('histOccupancy','30-50%',4,2),('histOccupancy','50-70%',6,3),
  ('histOccupancy','70-90%',8,4),('histOccupancy','>90%',10,5)
on conflict (table_key, value) do nothing;

-- ============================================================
-- Seed data — demo clubs & courts (Amsterdam), so the app has
-- something to show immediately. Safe to edit/delete later from
-- the admin dashboard once it is live.
-- ============================================================

do $$
declare
  v_club_id uuid;
begin
  if not exists (select 1 from clubs where name = 'Amstelpark Tennis (demo)') then
    insert into clubs (name, address, lat, lng, tier, open_from, open_to, demand, hist_occupancy)
    values ('Amstelpark Tennis (demo)', 'Koenenkade 8, Amsterdam', 52.3315, 4.8935, 'Tier A', '07:00', '23:00', 'Hoog', '70-90%')
    returning id into v_club_id;
    insert into courts (club_id, name, indoor, surface) values
      (v_club_id,'Court 1',false,'Clay'),
      (v_club_id,'Court 2',false,'Clay'),
      (v_club_id,'Court 3',false,'Hard court'),
      (v_club_id,'Court 4',true,'Hard court'),
      (v_club_id,'Court 5',true,'Carpet'),
      (v_club_id,'Court 6',false,'Grass');
  end if;

  if not exists (select 1 from clubs where name = 'Sloterplas Racket Club (demo)') then
    insert into clubs (name, address, lat, lng, tier, open_from, open_to, demand, hist_occupancy)
    values ('Sloterplas Racket Club (demo)', 'President Allendelaan 3, Amsterdam', 52.3665, 4.8125, 'Tier B', '08:00', '22:00', 'Normaal', '50-70%')
    returning id into v_club_id;
    insert into courts (club_id, name, indoor, surface) values
      (v_club_id,'Court 1',false,'Hard court'),
      (v_club_id,'Court 2',false,'Hard court'),
      (v_club_id,'Court 3',false,'Clay'),
      (v_club_id,'Court 4',true,'Hard court');
  end if;

  if not exists (select 1 from clubs where name = 'Westerpark Lawn Club (demo)') then
    insert into clubs (name, address, lat, lng, tier, open_from, open_to, demand, hist_occupancy)
    values ('Westerpark Lawn Club (demo)', 'Polonceaukade 20, Amsterdam', 52.3868, 4.8735, 'Tier B', '07:00', '23:00', 'Hoog', '50-70%')
    returning id into v_club_id;
    insert into courts (club_id, name, indoor, surface) values
      (v_club_id,'Court 1',false,'Grass'),
      (v_club_id,'Court 2',false,'Grass'),
      (v_club_id,'Court 3',false,'Clay'),
      (v_club_id,'Court 4',false,'Hard court');
  end if;

  if not exists (select 1 from clubs where name = 'TC Noorderpark (demo)') then
    insert into clubs (name, address, lat, lng, tier, open_from, open_to, demand, hist_occupancy)
    values ('TC Noorderpark (demo)', 'Floraweg 4, Amsterdam', 52.3925, 4.9165, 'Tier C', '08:00', '22:00', 'Normaal', '30-50%')
    returning id into v_club_id;
    insert into courts (club_id, name, indoor, surface) values
      (v_club_id,'Court 1',false,'Hard court'),
      (v_club_id,'Court 2',false,'Hard court'),
      (v_club_id,'Court 3',false,'Clay');
  end if;

  if not exists (select 1 from clubs where name = 'Diemen Courts (demo)') then
    insert into clubs (name, address, lat, lng, tier, open_from, open_to, demand, hist_occupancy)
    values ('Diemen Courts (demo)', 'Sportlaan 5, Diemen', 52.3395, 4.9625, 'Tier D', '09:00', '22:00', 'Laag', '<30%')
    returning id into v_club_id;
    insert into courts (club_id, name, indoor, surface) values
      (v_club_id,'Court 1',false,'Hard court'),
      (v_club_id,'Court 2',false,'Clay'),
      (v_club_id,'Court 3',false,'Clay');
  end if;
end $$;
