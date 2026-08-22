begin;

create extension if not exists "pgcrypto";

alter table public.bills
  alter column id set default gen_random_uuid(),
  alter column created_at set default now(),
  alter column created_at set not null,
  alter column updated_at set default now(),
  alter column updated_at set not null;

create or replace function public.protect_bills_immutable_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.id is distinct from old.id then
    raise exception 'bill id cannot be changed';
  end if;

  new.created_at = old.created_at;
  return new;
end;
$$;

create or replace function public.set_bills_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists bills_set_updated_at on public.bills;
drop trigger if exists protect_bills_immutable_fields on public.bills;
drop trigger if exists set_bills_updated_at on public.bills;

create trigger protect_bills_immutable_fields
before update on public.bills
for each row execute function public.protect_bills_immutable_fields();

create trigger set_bills_updated_at
before update on public.bills
for each row execute function public.set_bills_updated_at();

alter table public.bills
  add constraint bills_text_lengths_chk check (
    length(coalesce(driver_name, '')) <= 120
    and length(coalesce(vehicle_name, '')) <= 120
    and length(coalesce(vehicle_number, '')) <= 32
    and length(coalesce(guest_name, '')) <= 120
    and length(coalesce(customer_name, '')) <= 120
    and length(coalesce(passenger_name, '')) <= 120
    and length(coalesce(reporting_place, '')) <= 255
    and length(coalesce(start_location, '')) <= 255
    and (end_location is null or length(end_location) <= 255)
    and length(coalesce(base_package, '')) <= 80
    and length(coalesce(notes, '')) <= 2000
    and length(coalesce(remarks, '')) <= 2000
    and length(coalesce(whatsapp_number, '')) <= 20
    and (company_id is null or length(company_id) <= 128)
    and (driver_id is null or length(driver_id) <= 128)
    and (vehicle_id is null or length(vehicle_id) <= 128)
    and (guest_id is null or length(guest_id) <= 128)
  ) not valid,
  add constraint bills_text_no_nul_chk check (
    encode(convert_to(coalesce(company_id, ''), 'UTF8'), 'hex') not like '%00%'
    and encode(convert_to(coalesce(driver_id, ''), 'UTF8'), 'hex') not like '%00%'
    and encode(convert_to(coalesce(vehicle_id, ''), 'UTF8'), 'hex') not like '%00%'
    and encode(convert_to(coalesce(guest_id, ''), 'UTF8'), 'hex') not like '%00%'
    and encode(convert_to(coalesce(driver_name, ''), 'UTF8'), 'hex') not like '%00%'
    and encode(convert_to(coalesce(vehicle_name, ''), 'UTF8'), 'hex') not like '%00%'
    and encode(convert_to(coalesce(vehicle_number, ''), 'UTF8'), 'hex') not like '%00%'
    and encode(convert_to(coalesce(guest_salutation, ''), 'UTF8'), 'hex') not like '%00%'
    and encode(convert_to(coalesce(guest_name, ''), 'UTF8'), 'hex') not like '%00%'
    and encode(convert_to(coalesce(customer_name, ''), 'UTF8'), 'hex') not like '%00%'
    and encode(convert_to(coalesce(passenger_name, ''), 'UTF8'), 'hex') not like '%00%'
    and encode(convert_to(coalesce(title_prefix, ''), 'UTF8'), 'hex') not like '%00%'
    and encode(convert_to(coalesce(reporting_place, ''), 'UTF8'), 'hex') not like '%00%'
    and encode(convert_to(coalesce(start_location, ''), 'UTF8'), 'hex') not like '%00%'
    and encode(convert_to(coalesce(end_location, ''), 'UTF8'), 'hex') not like '%00%'
    and encode(convert_to(coalesce(reporting_time, ''), 'UTF8'), 'hex') not like '%00%'
    and encode(convert_to(coalesce(garage_time, ''), 'UTF8'), 'hex') not like '%00%'
    and encode(convert_to(coalesce(closing_time, ''), 'UTF8'), 'hex') not like '%00%'
    and encode(convert_to(coalesce(base_package, ''), 'UTF8'), 'hex') not like '%00%'
    and encode(convert_to(coalesce(notes, ''), 'UTF8'), 'hex') not like '%00%'
    and encode(convert_to(coalesce(remarks, ''), 'UTF8'), 'hex') not like '%00%'
    and encode(convert_to(coalesce(whatsapp_number, ''), 'UTF8'), 'hex') not like '%00%'
  ) not valid,
  add constraint bills_salutation_chk check (
    (guest_salutation is null or guest_salutation in ('Mr.', 'Mrs.', 'Miss.'))
    and (title_prefix is null or title_prefix in ('Mr.', 'Mrs.', 'Miss.'))
  ) not valid,
  add constraint bills_amount_rate_ranges_chk check (
    coalesce(total_amount, 0) between 0 and 10000000
    and coalesce(base_amount, 0) between 0 and 1000000
    and coalesce(extra_km_rate, 0) between 0 and 1000000
    and coalesce(extra_km_amount, 0) between 0 and 1000000
    and coalesce(extra_hour_rate, 0) between 0 and 1000000
    and coalesce(extra_hour_amount, 0) between 0 and 1000000
    and coalesce(airport_parking, 0) between 0 and 1000000
    and coalesce(fastag, 0) between 0 and 1000000
    and coalesce(road_parking, 0) between 0 and 1000000
    and coalesce(advance_amount, 0) between 0 and 1000000
    and coalesce(pending_amount, 0) between 0 and 1000000
    and coalesce(balance_amount, 0) between 0 and 1000000
    and coalesce(rate_per_kilometer, 0) between 0 and 1000000
    and coalesce(kilometer_amount, 0) between 0 and 1000000
    and coalesce(toll_charges, 0) between 0 and 1000000
    and coalesce(parking_charges, 0) between 0 and 1000000
    and coalesce(night_charges, 0) between 0 and 1000000
    and coalesce(permit_charges, 0) between 0 and 1000000
    and coalesce(other_charges, 0) between 0 and 1000000
  ) not valid,
  add constraint bills_kilometer_ranges_chk check (
    coalesce(base_km, 0) between 0 and 1000000
    and coalesce(total_km, 0) between 0 and 1000000
    and coalesce(extra_km, 0) between 0 and 1000000
    and coalesce(total_kilometers, 0) between 0 and 1000000
    and coalesce(opening_kilometer, 0) between 0 and 1000000
    and coalesce(closing_kilometer, 0) between 0 and 1000000
  ) not valid,
  add constraint bills_hour_ranges_chk check (
    coalesce(base_hours, 0) between 0 and 10000
    and coalesce(total_hours, 0) between 0 and 10000
    and coalesce(extra_hours, 0) between 0 and 10000
  ) not valid,
  add constraint bills_date_order_chk check (
    closing_date is null or trip_date is null or closing_date >= trip_date
  ) not valid,
  add constraint bills_odometer_order_chk check (
    opening_kilometer is null or closing_kilometer is null or closing_kilometer >= opening_kilometer
  ) not valid,
  add constraint bills_alias_consistency_chk check (
    customer_name is not distinct from guest_name
    and passenger_name is not distinct from guest_name
    and date is not distinct from trip_date
    and total_kilometers is not distinct from total_km
    and rate_per_kilometer is not distinct from extra_km_rate
    and kilometer_amount is not distinct from extra_km_amount
    and toll_charges is not distinct from fastag
    and balance_amount is not distinct from pending_amount
    and remarks is not distinct from notes
  ) not valid;

alter table public.bills validate constraint bills_text_lengths_chk;
alter table public.bills validate constraint bills_text_no_nul_chk;
alter table public.bills validate constraint bills_salutation_chk;
alter table public.bills validate constraint bills_amount_rate_ranges_chk;
alter table public.bills validate constraint bills_kilometer_ranges_chk;
alter table public.bills validate constraint bills_hour_ranges_chk;
alter table public.bills validate constraint bills_date_order_chk;
alter table public.bills validate constraint bills_odometer_order_chk;
alter table public.bills validate constraint bills_alias_consistency_chk;

commit;
