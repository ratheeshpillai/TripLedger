begin;

create table if not exists public.app_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  time_format text not null default '24h' check (time_format in ('24h', 'ampm')),
  currency_symbol text not null default '₹' check (length(currency_symbol) between 1 and 8),
  default_base_package text not null default '8 Hours / 80 KM' check (length(default_base_package) <= 80),
  default_base_hours numeric not null default 8 check (default_base_hours > 0 and default_base_hours <= 10000),
  default_base_km numeric not null default 80 check (default_base_km > 0 and default_base_km <= 1000000),
  default_base_amount numeric not null default 2800 check (default_base_amount > 0 and default_base_amount <= 1000000),
  default_extra_hour_rate numeric not null default 200 check (default_extra_hour_rate between 0 and 1000000),
  default_extra_km_rate numeric not null default 0 check (default_extra_km_rate between 0 and 1000000),
  default_driver_name text not null default '' check (length(default_driver_name) <= 120),
  default_vehicle_model text not null default '' check (length(default_vehicle_model) <= 120),
  default_vehicle_number text not null default '' check (length(default_vehicle_number) <= 32),
  business_name text not null default 'Business Name' check (length(business_name) <= 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_app_preferences_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists app_preferences_set_updated_at on public.app_preferences;
create trigger app_preferences_set_updated_at
before update on public.app_preferences
for each row execute function public.set_app_preferences_updated_at();

alter table public.app_preferences enable row level security;

drop policy if exists "Users can select their own app preferences" on public.app_preferences;
create policy "Users can select their own app preferences"
on public.app_preferences for select to authenticated
using ((select auth.uid()) = user_id and public.is_mfa_requirement_satisfied());

drop policy if exists "Users can insert their own app preferences" on public.app_preferences;
create policy "Users can insert their own app preferences"
on public.app_preferences for insert to authenticated
with check ((select auth.uid()) = user_id and public.is_mfa_requirement_satisfied());

drop policy if exists "Users can update their own app preferences" on public.app_preferences;
create policy "Users can update their own app preferences"
on public.app_preferences for update to authenticated
using ((select auth.uid()) = user_id and public.is_mfa_requirement_satisfied())
with check ((select auth.uid()) = user_id and public.is_mfa_requirement_satisfied());

revoke all on table public.app_preferences from public, anon;
grant select, insert, update on table public.app_preferences to authenticated;

revoke all on function public.set_app_preferences_updated_at() from public, anon;

comment on table public.app_preferences is 'Authenticated TripLedger preferences synchronized across devices; localStorage is only a cache.';

commit;
