begin;

alter table public.bills
  add column if not exists client_request_id uuid null;

alter table public.owner_payments
  add column if not exists client_request_id uuid null;

create unique index if not exists bills_user_client_request_id_uidx
  on public.bills (user_id, client_request_id)
  where client_request_id is not null;

create unique index if not exists owner_payments_user_client_request_id_uidx
  on public.owner_payments (user_id, client_request_id)
  where client_request_id is not null;

create or replace function public.enforce_billing_parties_user_cap()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  if new.user_id is distinct from auth.uid() then
    raise exception 'Unable to save. Please try again.' using errcode = '42501';
  end if;

  if (select count(*) from public.billing_parties bp where bp.user_id = auth.uid()) >= 500 then
    raise exception 'You have reached the current record limit.' using errcode = '23514';
  end if;

  return new;
end;
$$;

create or replace function public.enforce_owner_payments_user_cap()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  if new.user_id is distinct from auth.uid() then
    raise exception 'Unable to save. Please try again.' using errcode = '42501';
  end if;

  if (select count(*) from public.owner_payments p where p.user_id = auth.uid()) >= 20000 then
    raise exception 'You have reached the current record limit.' using errcode = '23514';
  end if;

  return new;
end;
$$;

create or replace function public.enforce_bills_user_cap()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  if new.user_id is distinct from auth.uid() then
    raise exception 'Unable to save. Please try again.' using errcode = '42501';
  end if;

  if (select count(*) from public.bills b where b.user_id = auth.uid()) >= 10000 then
    raise exception 'You have reached the current record limit.' using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_billing_parties_user_cap on public.billing_parties;
create trigger enforce_billing_parties_user_cap
before insert on public.billing_parties
for each row execute function public.enforce_billing_parties_user_cap();

drop trigger if exists enforce_owner_payments_user_cap on public.owner_payments;
create trigger enforce_owner_payments_user_cap
before insert on public.owner_payments
for each row execute function public.enforce_owner_payments_user_cap();

drop trigger if exists enforce_bills_user_cap on public.bills;
create trigger enforce_bills_user_cap
before insert on public.bills
for each row execute function public.enforce_bills_user_cap();

create or replace function public.create_bill(
  p_client_request_id uuid,
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

  if p_client_request_id is null then
    raise exception 'Unable to save. Please try again.' using errcode = '23514';
  end if;

  select *
  into v_bill
  from public.bills b
  where b.user_id = v_user_id
    and b.client_request_id = p_client_request_id
  limit 1;

  if v_bill.id is not null then
    return v_bill;
  end if;

  if (select count(*) from public.bills b where b.user_id = v_user_id) >= 10000 then
    raise exception 'You have reached the current record limit.' using errcode = '23514';
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

  begin
    insert into public.bills (
      user_id,
      client_request_id,
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
      p_client_request_id,
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
  exception
    when unique_violation then
      select *
      into v_bill
      from public.bills b
      where b.user_id = v_user_id
        and b.client_request_id = p_client_request_id
      limit 1;
  end;

  if v_bill.id is null then
    raise exception 'Unable to save. Please try again.' using errcode = '23514';
  end if;

  return v_bill;
end;
$$;

create or replace function public.create_owner_payment(
  p_client_request_id uuid,
  p_billing_party_id uuid,
  p_payment_date date,
  p_amount numeric,
  p_payment_type text,
  p_payment_method text,
  p_reference text,
  p_notes text
)
returns public.owner_payments
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_payment public.owner_payments;
begin
  if v_user_id is null or not public.is_mfa_requirement_satisfied() then
    raise exception 'Unable to save. Please try again.' using errcode = '42501';
  end if;

  if p_client_request_id is null then
    raise exception 'Unable to save. Please try again.' using errcode = '23514';
  end if;

  select *
  into v_payment
  from public.owner_payments p
  where p.user_id = v_user_id
    and p.client_request_id = p_client_request_id
  limit 1;

  if v_payment.id is not null then
    return v_payment;
  end if;

  if not exists (
    select 1
    from public.billing_parties bp
    where bp.id = p_billing_party_id
      and bp.user_id = v_user_id
  ) then
    raise exception 'The selected Owner / Company is unavailable.' using errcode = '42501';
  end if;

  if (select count(*) from public.owner_payments p where p.user_id = v_user_id) >= 20000 then
    raise exception 'You have reached the current record limit.' using errcode = '23514';
  end if;

  begin
    insert into public.owner_payments (
      user_id,
      client_request_id,
      billing_party_id,
      payment_date,
      amount,
      payment_type,
      payment_method,
      reference,
      notes
    )
    values (
      v_user_id,
      p_client_request_id,
      p_billing_party_id,
      p_payment_date,
      p_amount,
      p_payment_type,
      nullif(p_payment_method, ''),
      nullif(p_reference, ''),
      nullif(p_notes, '')
    )
    returning * into v_payment;
  exception
    when unique_violation then
      select *
      into v_payment
      from public.owner_payments p
      where p.user_id = v_user_id
        and p.client_request_id = p_client_request_id
      limit 1;
  end;

  if v_payment.id is null then
    raise exception 'Unable to save. Please try again.' using errcode = '23514';
  end if;

  return v_payment;
end;
$$;

revoke all on function public.create_bill(text, uuid, text, text, text, text, text, text, text, text, text, date, text, text, date, text, text, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, text, text) from public;
revoke all on function public.create_bill(text, uuid, text, text, text, text, text, text, text, text, text, date, text, text, date, text, text, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, text, text) from anon;
revoke all on function public.create_bill(text, uuid, text, text, text, text, text, text, text, text, text, date, text, text, date, text, text, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, text, text) from authenticated;

revoke all on function public.create_bill(uuid, text, uuid, text, text, text, text, text, text, text, text, text, date, text, text, date, text, text, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, text, text) from public;
revoke all on function public.create_bill(uuid, text, uuid, text, text, text, text, text, text, text, text, text, date, text, text, date, text, text, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, text, text) from anon;
grant execute on function public.create_bill(uuid, text, uuid, text, text, text, text, text, text, text, text, text, date, text, text, date, text, text, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, text, text) to authenticated;

revoke all on function public.create_owner_payment(uuid, uuid, date, numeric, text, text, text, text) from public;
revoke all on function public.create_owner_payment(uuid, uuid, date, numeric, text, text, text, text) from anon;
grant execute on function public.create_owner_payment(uuid, uuid, date, numeric, text, text, text, text) to authenticated;

revoke insert on table public.owner_payments from public;
revoke insert on table public.owner_payments from anon;
revoke insert on table public.owner_payments from authenticated;

revoke create on schema public from public;
revoke create on schema public from anon;
revoke create on schema public from authenticated;

revoke all on function public.enforce_billing_parties_user_cap() from public;
revoke all on function public.enforce_billing_parties_user_cap() from anon;
revoke all on function public.enforce_owner_payments_user_cap() from public;
revoke all on function public.enforce_owner_payments_user_cap() from anon;
revoke all on function public.enforce_bills_user_cap() from public;
revoke all on function public.enforce_bills_user_cap() from anon;

comment on column public.bills.client_request_id is 'Client-generated UUID used for idempotent bill creation. Not displayed to users.';
comment on column public.owner_payments.client_request_id is 'Client-generated UUID used for idempotent owner payment creation. Not displayed to users.';

commit;

-- Rollback, if needed after review:
-- begin;
-- revoke all on function public.create_bill(uuid, text, uuid, text, text, text, text, text, text, text, text, text, date, text, text, date, text, text, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, text, text) from authenticated;
-- drop function if exists public.create_bill(uuid, text, uuid, text, text, text, text, text, text, text, text, text, date, text, text, date, text, text, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, text, text);
-- grant execute on function public.create_bill(text, uuid, text, text, text, text, text, text, text, text, text, date, text, text, date, text, text, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, text, text) to authenticated;
-- grant insert on table public.owner_payments to authenticated;
-- revoke all on function public.create_owner_payment(uuid, uuid, date, numeric, text, text, text, text) from authenticated;
-- drop function if exists public.create_owner_payment(uuid, uuid, date, numeric, text, text, text, text);
-- drop trigger if exists enforce_bills_user_cap on public.bills;
-- drop trigger if exists enforce_owner_payments_user_cap on public.owner_payments;
-- drop trigger if exists enforce_billing_parties_user_cap on public.billing_parties;
-- drop function if exists public.enforce_bills_user_cap();
-- drop function if exists public.enforce_owner_payments_user_cap();
-- drop function if exists public.enforce_billing_parties_user_cap();
-- drop index if exists public.owner_payments_user_client_request_id_uidx;
-- drop index if exists public.bills_user_client_request_id_uidx;
-- alter table public.owner_payments drop column if exists client_request_id;
-- alter table public.bills drop column if exists client_request_id;
-- commit;
