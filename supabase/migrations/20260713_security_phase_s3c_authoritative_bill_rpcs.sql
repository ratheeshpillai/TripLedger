begin;

create or replace function public.calculate_bill_values(
  p_base_hours numeric,
  p_base_km numeric,
  p_base_amount numeric,
  p_total_km numeric,
  p_opening_kilometer numeric,
  p_closing_kilometer numeric,
  p_extra_km_rate numeric,
  p_total_hours numeric,
  p_extra_hour_rate numeric,
  p_airport_parking numeric,
  p_fastag numeric,
  p_road_parking numeric
)
returns table (
  total_km numeric,
  extra_km numeric,
  extra_km_amount numeric,
  extra_hours numeric,
  extra_hour_amount numeric,
  total_amount numeric
)
language sql
immutable
set search_path = ''
as $$
  with normalized as (
    select
      greatest(coalesce(p_base_hours, 0), 0) as base_hours,
      greatest(coalesce(p_base_km, 0), 0) as base_km,
      greatest(coalesce(p_base_amount, 0), 0) as base_amount,
      case
        when p_opening_kilometer is not null and p_closing_kilometer is not null
          then greatest(p_closing_kilometer - p_opening_kilometer, 0)
        else greatest(coalesce(p_total_km, 0), 0)
      end as authoritative_total_km,
      greatest(coalesce(p_extra_km_rate, 0), 0) as extra_km_rate,
      greatest(coalesce(p_total_hours, 0), 0) as total_hours,
      greatest(coalesce(p_extra_hour_rate, 0), 0) as extra_hour_rate,
      greatest(coalesce(p_airport_parking, 0), 0) as airport_parking,
      greatest(coalesce(p_fastag, 0), 0) as fastag,
      greatest(coalesce(p_road_parking, 0), 0) as road_parking
  ),
  derived as (
    select
      n.authoritative_total_km as total_km,
      greatest(n.authoritative_total_km - n.base_km, 0) as extra_km,
      greatest(n.total_hours - n.base_hours, 0) as extra_hours,
      n.base_amount,
      n.extra_km_rate,
      n.extra_hour_rate,
      n.airport_parking,
      n.fastag,
      n.road_parking
    from normalized n
  )
  select
    d.total_km,
    d.extra_km,
    d.extra_km * d.extra_km_rate as extra_km_amount,
    d.extra_hours,
    d.extra_hours * d.extra_hour_rate as extra_hour_amount,
    d.base_amount
      + (d.extra_km * d.extra_km_rate)
      + (d.extra_hours * d.extra_hour_rate)
      + d.airport_parking
      + d.fastag
      + d.road_parking as total_amount
  from derived d;
$$;

create or replace function public.create_bill(
  p_company_id text,
  p_billing_party_id uuid,
  p_driver_id text,
  p_vehicle_id text,
  p_guest_id text,
  p_driver_name text,
  p_vehicle_name text,
  p_vehicle_number text,
  p_guest_salutation text,
  p_guest_name text,
  p_reporting_place text,
  p_trip_date date,
  p_reporting_time text,
  p_garage_time text,
  p_closing_date date,
  p_closing_time text,
  p_base_package text,
  p_base_hours numeric,
  p_base_km numeric,
  p_base_amount numeric,
  p_opening_kilometer numeric,
  p_closing_kilometer numeric,
  p_total_km numeric,
  p_extra_km_rate numeric,
  p_total_hours numeric,
  p_extra_hour_rate numeric,
  p_airport_parking numeric,
  p_fastag numeric,
  p_road_parking numeric,
  p_advance_amount numeric,
  p_pending_amount numeric,
  p_notes text,
  p_whatsapp_number text
)
returns public.bills
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_values record;
  v_bill public.bills;
begin
  if v_user_id is null or not public.is_mfa_requirement_satisfied() then
    raise exception 'Unable to save the bill.' using errcode = '42501';
  end if;

  if p_billing_party_id is null or not exists (
    select 1
    from public.billing_parties bp
    where bp.id = p_billing_party_id
      and bp.user_id = v_user_id
  ) then
    raise exception 'The selected Owner / Company is unavailable.' using errcode = '42501';
  end if;

  if (p_opening_kilometer is null or p_closing_kilometer is null)
     and coalesce(p_total_km, 0) < 0 then
    raise exception 'Unable to save the bill.' using errcode = '23514';
  end if;

  select *
  into v_values
  from public.calculate_bill_values(
    p_base_hours,
    p_base_km,
    p_base_amount,
    p_total_km,
    p_opening_kilometer,
    p_closing_kilometer,
    p_extra_km_rate,
    p_total_hours,
    p_extra_hour_rate,
    p_airport_parking,
    p_fastag,
    p_road_parking
  );

  insert into public.bills (
    user_id,
    company_id,
    billing_party_id,
    driver_id,
    vehicle_id,
    guest_id,
    driver_name,
    vehicle_name,
    vehicle_number,
    guest_salutation,
    guest_name,
    customer_name,
    passenger_name,
    title_prefix,
    reporting_place,
    start_location,
    end_location,
    trip_date,
    date,
    reporting_time,
    garage_time,
    closing_date,
    closing_time,
    base_package,
    base_hours,
    base_km,
    base_amount,
    opening_kilometer,
    closing_kilometer,
    total_km,
    total_kilometers,
    extra_km,
    extra_km_rate,
    rate_per_kilometer,
    extra_km_amount,
    kilometer_amount,
    total_hours,
    extra_hours,
    extra_hour_rate,
    extra_hour_amount,
    night_charges,
    toll_charges,
    airport_parking,
    parking_charges,
    fastag,
    road_parking,
    permit_charges,
    other_charges,
    advance_amount,
    pending_amount,
    balance_amount,
    total_amount,
    notes,
    remarks,
    whatsapp_number
  )
  values (
    v_user_id,
    p_company_id,
    p_billing_party_id,
    p_driver_id,
    p_vehicle_id,
    p_guest_id,
    coalesce(p_driver_name, ''),
    coalesce(p_vehicle_name, ''),
    coalesce(p_vehicle_number, ''),
    coalesce(p_guest_salutation, 'Mr.'),
    coalesce(p_guest_name, ''),
    coalesce(p_guest_name, ''),
    coalesce(p_guest_name, ''),
    coalesce(p_guest_salutation, 'Mr.'),
    coalesce(p_reporting_place, ''),
    coalesce(p_reporting_place, ''),
    null,
    p_trip_date,
    p_trip_date,
    coalesce(p_reporting_time, ''),
    coalesce(p_garage_time, ''),
    p_closing_date,
    coalesce(p_closing_time, ''),
    coalesce(p_base_package, ''),
    coalesce(p_base_hours, 0),
    coalesce(p_base_km, 0),
    coalesce(p_base_amount, 0),
    p_opening_kilometer,
    p_closing_kilometer,
    v_values.total_km,
    v_values.total_km,
    v_values.extra_km,
    coalesce(p_extra_km_rate, 0),
    coalesce(p_extra_km_rate, 0),
    v_values.extra_km_amount,
    v_values.extra_km_amount,
    coalesce(p_total_hours, 0),
    v_values.extra_hours,
    coalesce(p_extra_hour_rate, 0),
    v_values.extra_hour_amount,
    0,
    coalesce(p_fastag, 0),
    coalesce(p_airport_parking, 0),
    coalesce(p_airport_parking, 0) + coalesce(p_road_parking, 0),
    coalesce(p_fastag, 0),
    coalesce(p_road_parking, 0),
    0,
    0,
    coalesce(p_advance_amount, 0),
    coalesce(p_pending_amount, 0),
    coalesce(p_pending_amount, 0),
    v_values.total_amount,
    coalesce(p_notes, ''),
    coalesce(p_notes, ''),
    coalesce(p_whatsapp_number, '')
  )
  returning * into v_bill;

  return v_bill;
end;
$$;

create or replace function public.update_bill(
  p_bill_id uuid,
  p_company_id text,
  p_billing_party_id uuid,
  p_driver_id text,
  p_vehicle_id text,
  p_guest_id text,
  p_driver_name text,
  p_vehicle_name text,
  p_vehicle_number text,
  p_guest_salutation text,
  p_guest_name text,
  p_reporting_place text,
  p_trip_date date,
  p_reporting_time text,
  p_garage_time text,
  p_closing_date date,
  p_closing_time text,
  p_base_package text,
  p_base_hours numeric,
  p_base_km numeric,
  p_base_amount numeric,
  p_opening_kilometer numeric,
  p_closing_kilometer numeric,
  p_total_km numeric,
  p_extra_km_rate numeric,
  p_total_hours numeric,
  p_extra_hour_rate numeric,
  p_airport_parking numeric,
  p_fastag numeric,
  p_road_parking numeric,
  p_advance_amount numeric,
  p_pending_amount numeric,
  p_notes text,
  p_whatsapp_number text
)
returns public.bills
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_values record;
  v_bill public.bills;
begin
  if v_user_id is null or not public.is_mfa_requirement_satisfied() then
    raise exception 'Unable to update the bill.' using errcode = '42501';
  end if;

  if p_billing_party_id is null or not exists (
    select 1
    from public.billing_parties bp
    where bp.id = p_billing_party_id
      and bp.user_id = v_user_id
  ) then
    raise exception 'The selected Owner / Company is unavailable.' using errcode = '42501';
  end if;

  if (p_opening_kilometer is null or p_closing_kilometer is null)
     and coalesce(p_total_km, 0) < 0 then
    raise exception 'Unable to update the bill.' using errcode = '23514';
  end if;

  select *
  into v_values
  from public.calculate_bill_values(
    p_base_hours,
    p_base_km,
    p_base_amount,
    p_total_km,
    p_opening_kilometer,
    p_closing_kilometer,
    p_extra_km_rate,
    p_total_hours,
    p_extra_hour_rate,
    p_airport_parking,
    p_fastag,
    p_road_parking
  );

  update public.bills
  set
    company_id = p_company_id,
    billing_party_id = p_billing_party_id,
    driver_id = p_driver_id,
    vehicle_id = p_vehicle_id,
    guest_id = p_guest_id,
    driver_name = coalesce(p_driver_name, ''),
    vehicle_name = coalesce(p_vehicle_name, ''),
    vehicle_number = coalesce(p_vehicle_number, ''),
    guest_salutation = coalesce(p_guest_salutation, 'Mr.'),
    guest_name = coalesce(p_guest_name, ''),
    customer_name = coalesce(p_guest_name, ''),
    passenger_name = coalesce(p_guest_name, ''),
    title_prefix = coalesce(p_guest_salutation, 'Mr.'),
    reporting_place = coalesce(p_reporting_place, ''),
    start_location = coalesce(p_reporting_place, ''),
    end_location = null,
    trip_date = p_trip_date,
    date = p_trip_date,
    reporting_time = coalesce(p_reporting_time, ''),
    garage_time = coalesce(p_garage_time, ''),
    closing_date = p_closing_date,
    closing_time = coalesce(p_closing_time, ''),
    base_package = coalesce(p_base_package, ''),
    base_hours = coalesce(p_base_hours, 0),
    base_km = coalesce(p_base_km, 0),
    base_amount = coalesce(p_base_amount, 0),
    opening_kilometer = p_opening_kilometer,
    closing_kilometer = p_closing_kilometer,
    total_km = v_values.total_km,
    total_kilometers = v_values.total_km,
    extra_km = v_values.extra_km,
    extra_km_rate = coalesce(p_extra_km_rate, 0),
    rate_per_kilometer = coalesce(p_extra_km_rate, 0),
    extra_km_amount = v_values.extra_km_amount,
    kilometer_amount = v_values.extra_km_amount,
    total_hours = coalesce(p_total_hours, 0),
    extra_hours = v_values.extra_hours,
    extra_hour_rate = coalesce(p_extra_hour_rate, 0),
    extra_hour_amount = v_values.extra_hour_amount,
    night_charges = 0,
    toll_charges = coalesce(p_fastag, 0),
    airport_parking = coalesce(p_airport_parking, 0),
    parking_charges = coalesce(p_airport_parking, 0) + coalesce(p_road_parking, 0),
    fastag = coalesce(p_fastag, 0),
    road_parking = coalesce(p_road_parking, 0),
    permit_charges = 0,
    other_charges = 0,
    advance_amount = coalesce(p_advance_amount, 0),
    pending_amount = coalesce(p_pending_amount, 0),
    balance_amount = coalesce(p_pending_amount, 0),
    total_amount = v_values.total_amount,
    notes = coalesce(p_notes, ''),
    remarks = coalesce(p_notes, ''),
    whatsapp_number = coalesce(p_whatsapp_number, '')
  where id = p_bill_id
    and user_id = v_user_id
  returning * into v_bill;

  if v_bill.id is null then
    raise exception 'Unable to update the bill.' using errcode = '42501';
  end if;

  return v_bill;
end;
$$;

comment on function public.calculate_bill_values(numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric)
  is 'Calculates authoritative TripLedger bill derived values without trusting client-submitted derived amounts.';
comment on function public.create_bill(text, uuid, text, text, text, text, text, text, text, text, text, date, text, text, date, text, text, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, text, text)
  is 'Creates one bill for auth.uid(), verifies MFA and Owner / Company ownership, and stores database-authoritative derived bill values.';
comment on function public.update_bill(uuid, text, uuid, text, text, text, text, text, text, text, text, text, date, text, text, date, text, text, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, text, text)
  is 'Updates one owned bill for auth.uid(), verifies MFA and Owner / Company ownership, and stores database-authoritative derived bill values.';

revoke all on function public.calculate_bill_values(numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric) from public;
revoke all on function public.calculate_bill_values(numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric) from anon;
revoke all on function public.calculate_bill_values(numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric) from authenticated;

revoke all on function public.create_bill(text, uuid, text, text, text, text, text, text, text, text, text, date, text, text, date, text, text, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, text, text) from public;
revoke all on function public.create_bill(text, uuid, text, text, text, text, text, text, text, text, text, date, text, text, date, text, text, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, text, text) from anon;
grant execute on function public.create_bill(text, uuid, text, text, text, text, text, text, text, text, text, date, text, text, date, text, text, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, text, text) to authenticated;

revoke all on function public.update_bill(uuid, text, uuid, text, text, text, text, text, text, text, text, text, date, text, text, date, text, text, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, text, text) from public;
revoke all on function public.update_bill(uuid, text, uuid, text, text, text, text, text, text, text, text, text, date, text, text, date, text, text, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, text, text) from anon;
grant execute on function public.update_bill(uuid, text, uuid, text, text, text, text, text, text, text, text, text, date, text, text, date, text, text, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, text, text) to authenticated;

revoke insert, update on table public.bills from public;
revoke insert, update on table public.bills from anon;
revoke insert, update on table public.bills from authenticated;

revoke create on schema public from public;
revoke create on schema public from anon;
revoke create on schema public from authenticated;

commit;

-- Rollback, if needed after review:
-- begin;
-- grant insert, update on table public.bills to authenticated;
-- revoke all on function public.update_bill(uuid, text, uuid, text, text, text, text, text, text, text, text, text, date, text, text, date, text, text, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, text, text) from authenticated;
-- revoke all on function public.create_bill(text, uuid, text, text, text, text, text, text, text, text, text, date, text, text, date, text, text, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, text, text) from authenticated;
-- drop function if exists public.update_bill(uuid, text, uuid, text, text, text, text, text, text, text, text, text, date, text, text, date, text, text, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, text, text);
-- drop function if exists public.create_bill(text, uuid, text, text, text, text, text, text, text, text, text, date, text, text, date, text, text, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, text, text);
-- drop function if exists public.calculate_bill_values(numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric);
-- commit;
