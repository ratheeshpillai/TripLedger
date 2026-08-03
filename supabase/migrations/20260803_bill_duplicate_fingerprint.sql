begin;

do $$
begin
  if exists (
    select 1
    from public.bills
    group by
      user_id,
      coalesce(billing_party_id, '00000000-0000-0000-0000-000000000000'::uuid),
      lower(btrim(coalesce(guest_salutation, ''))),
      lower(btrim(coalesce(guest_name, ''))),
      lower(btrim(coalesce(vehicle_number, ''))),
      lower(btrim(coalesce(reporting_place, ''))),
      coalesce(trip_date, '-infinity'::date),
      btrim(coalesce(reporting_time, '')),
      coalesce(closing_date, '-infinity'::date),
      btrim(coalesce(closing_time, ''))
    having count(*) > 1
  ) then
    raise exception 'Resolve existing duplicate bills before adding duplicate protection.';
  end if;
end;
$$;

create unique index if not exists bills_user_business_fingerprint_uidx
  on public.bills (
    user_id,
    coalesce(billing_party_id, '00000000-0000-0000-0000-000000000000'::uuid),
    lower(btrim(coalesce(guest_salutation, ''))),
    lower(btrim(coalesce(guest_name, ''))),
    lower(btrim(coalesce(vehicle_number, ''))),
    lower(btrim(coalesce(reporting_place, ''))),
    coalesce(trip_date, '-infinity'::date),
    btrim(coalesce(reporting_time, '')),
    coalesce(closing_date, '-infinity'::date),
    btrim(coalesce(closing_time, ''))
  );

comment on index public.bills_user_business_fingerprint_uidx is
  'Prevents accidental duplicate bill creation per user while allowing same-day trips with different trip identity fields.';

commit;
