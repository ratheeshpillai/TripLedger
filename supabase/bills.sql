-- TripLedger Phase 3/4 Supabase setup
-- Run this in the Supabase SQL editor for your project.

create extension if not exists "pgcrypto";

create table if not exists public.bills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  company_id text,
  driver_id text,
  vehicle_id text,
  guest_id text,

  driver_name text default '',
  vehicle_name text default '',
  vehicle_number text default '',
  guest_salutation text default 'Mr.',
  guest_name text default '',
  customer_name text default '',
  passenger_name text default '',
  title_prefix text default 'Mr.',

  reporting_place text default '',
  start_location text default '',
  end_location text,

  trip_date date,
  date date,
  reporting_time text default '',
  garage_time text default '',
  closing_date date,
  closing_time text default '',

  base_package text default '',
  base_hours numeric default 0,
  base_km numeric default 0,
  base_amount numeric default 0,

  opening_kilometer numeric,
  closing_kilometer numeric,
  total_km numeric default 0,
  total_kilometers numeric default 0,
  extra_km numeric default 0,
  extra_km_rate numeric default 0,
  rate_per_kilometer numeric default 0,
  extra_km_amount numeric default 0,
  kilometer_amount numeric default 0,

  total_hours numeric default 0,
  extra_hours numeric default 0,
  extra_hour_rate numeric default 0,
  extra_hour_amount numeric default 0,

  night_charges numeric default 0,
  toll_charges numeric default 0,
  airport_parking numeric default 0,
  parking_charges numeric default 0,
  fastag numeric default 0,
  road_parking numeric default 0,
  permit_charges numeric default 0,
  other_charges numeric default 0,
  advance_amount numeric default 0,
  pending_amount numeric default 0,
  balance_amount numeric default 0,
  total_amount numeric default 0,

  notes text default '',
  remarks text default '',
  whatsapp_number text default '',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists bills_user_id_created_at_idx on public.bills (user_id, created_at desc);
create index if not exists bills_user_id_trip_date_idx on public.bills (user_id, trip_date desc);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists bills_set_updated_at on public.bills;
create trigger bills_set_updated_at
before update on public.bills
for each row execute function public.set_updated_at();

alter table public.bills enable row level security;

drop policy if exists "Users can select their own bills" on public.bills;
create policy "Users can select their own bills"
on public.bills
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own bills" on public.bills;
create policy "Users can insert their own bills"
on public.bills
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own bills" on public.bills;
create policy "Users can update their own bills"
on public.bills
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own bills" on public.bills;
create policy "Users can delete their own bills"
on public.bills
for delete
to authenticated
using (auth.uid() = user_id);
