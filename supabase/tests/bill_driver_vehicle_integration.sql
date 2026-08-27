begin;

create or replace function pg_temp.assert_true(condition boolean, message text)
returns void language plpgsql as $$
begin
  if not coalesce(condition, false) then
    raise exception 'bill driver vehicle integration test failed: %', message;
  end if;
end;
$$;
grant execute on function pg_temp.assert_true(boolean, text) to authenticated;

create or replace function pg_temp.create_test_bill(
  request_id uuid,
  billing_party_id uuid,
  driver_id text,
  vehicle_id text
)
returns public.bills
language sql
as $$
  select public.create_bill(
    p_client_request_id => request_id,
    p_company_id => null,
    p_billing_party_id => billing_party_id,
    p_driver_id => driver_id,
    p_vehicle_id => vehicle_id,
    p_guest_id => null,
    p_driver_name => 'Untrusted driver',
    p_vehicle_name => 'Untrusted vehicle',
    p_vehicle_number => 'UNTRUSTED',
    p_guest_salutation => 'Mr.',
    p_guest_name => request_id::text,
    p_reporting_place => 'Test place',
    p_trip_date => current_date,
    p_reporting_time => '09:00',
    p_garage_time => '08:00',
    p_closing_date => current_date,
    p_closing_time => '17:00',
    p_base_package => '8 Hours / 80 KM',
    p_base_hours => 8,
    p_base_km => 80,
    p_base_amount => 2800,
    p_opening_kilometer => null,
    p_closing_kilometer => null,
    p_total_km => 80,
    p_extra_km_rate => 18,
    p_total_hours => 8,
    p_extra_hour_rate => 200,
    p_airport_parking => 0,
    p_fastag => 0,
    p_road_parking => 0,
    p_advance_amount => 0,
    p_pending_amount => 0,
    p_notes => '',
    p_whatsapp_number => ''
  );
$$;
grant execute on function pg_temp.create_test_bill(uuid, uuid, text, text) to authenticated;

create temporary table test_bill_vehicle_organizations (label text primary key, id uuid not null);
grant select on table test_bill_vehicle_organizations to authenticated;

insert into auth.users (id, email, aud, role, created_at, updated_at)
values
  ('91000000-0000-0000-0000-000000000001', 'bill-fleet-a@example.test', 'authenticated', 'authenticated', now(), now()),
  ('92000000-0000-0000-0000-000000000002', 'bill-fleet-b@example.test', 'authenticated', 'authenticated', now(), now()),
  ('93000000-0000-0000-0000-000000000003', 'bill-individual@example.test', 'authenticated', 'authenticated', now(), now());

insert into test_bill_vehicle_organizations (label, id)
values
  ('a', private.default_organization_id('91000000-0000-0000-0000-000000000001')),
  ('b', private.default_organization_id('92000000-0000-0000-0000-000000000002')),
  ('individual', private.default_organization_id('93000000-0000-0000-0000-000000000003'));

update public.organizations set business_type = 'vendor'
where id in (select id from test_bill_vehicle_organizations where label in ('a', 'b'));

insert into public.billing_parties (id, organization_id, user_id, name)
values
  ('9b000000-0000-0000-0000-000000000001', (select id from test_bill_vehicle_organizations where label = 'a'), '91000000-0000-0000-0000-000000000001', 'Fleet A customer'),
  ('9b000000-0000-0000-0000-000000000002', (select id from test_bill_vehicle_organizations where label = 'b'), '92000000-0000-0000-0000-000000000002', 'Fleet B customer'),
  ('9b000000-0000-0000-0000-000000000003', (select id from test_bill_vehicle_organizations where label = 'individual'), '93000000-0000-0000-0000-000000000003', 'Individual customer');

insert into public.drivers (id, organization_id, name, status)
values
  ('9d000000-0000-0000-0000-000000000001', (select id from test_bill_vehicle_organizations where label = 'a'), 'Driver A', 'active'),
  ('9d000000-0000-0000-0000-000000000002', (select id from test_bill_vehicle_organizations where label = 'a'), 'Driver B', 'active'),
  ('9d000000-0000-0000-0000-000000000003', (select id from test_bill_vehicle_organizations where label = 'a'), 'Inactive Driver', 'inactive'),
  ('9d000000-0000-0000-0000-000000000004', (select id from test_bill_vehicle_organizations where label = 'b'), 'Other Driver', 'active');

insert into public.vehicles (id, organization_id, registration_number, display_name, make_model, status)
values
  ('9a000000-0000-0000-0000-000000000001', (select id from test_bill_vehicle_organizations where label = 'a'), 'KL01AB1234', 'Vehicle X', 'Toyota Innova', 'active'),
  ('9a000000-0000-0000-0000-000000000002', (select id from test_bill_vehicle_organizations where label = 'a'), 'KL02AB1234', 'Inactive Vehicle', null, 'inactive'),
  ('9a000000-0000-0000-0000-000000000004', (select id from test_bill_vehicle_organizations where label = 'b'), 'KL03AB1234', 'Other Vehicle', null, 'active');

insert into public.driver_vehicle_assignments (organization_id, driver_id, vehicle_id)
values ((select id from test_bill_vehicle_organizations where label = 'a'), '9d000000-0000-0000-0000-000000000001', '9a000000-0000-0000-0000-000000000001');

select set_config('request.jwt.claims', '{"sub":"91000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1"}', true);
set local role authenticated;

select pg_temp.assert_true(
  (select (pg_temp.create_test_bill('9c000000-0000-0000-0000-000000000001', '9b000000-0000-0000-0000-000000000001', '9d000000-0000-0000-0000-000000000001', '9a000000-0000-0000-0000-000000000001')).driver_name = 'Driver A'),
  'valid Fleet Owner bill must use the authoritative driver snapshot'
);
select pg_temp.assert_true(
  (select vehicle_name = 'Vehicle X' and vehicle_number = 'KL01AB1234' from public.bills where client_request_id = '9c000000-0000-0000-0000-000000000001'),
  'valid Fleet Owner bill must use authoritative vehicle snapshots'
);

do $$
begin
  begin
    perform pg_temp.create_test_bill('9c000000-0000-0000-0000-000000000002', '9b000000-0000-0000-0000-000000000001', '9d000000-0000-0000-0000-000000000004', '9a000000-0000-0000-0000-000000000001');
    raise exception 'cross-organization driver was accepted';
  exception when sqlstate '22023' then null;
  end;
  begin
    perform pg_temp.create_test_bill('9c000000-0000-0000-0000-000000000003', '9b000000-0000-0000-0000-000000000001', '9d000000-0000-0000-0000-000000000001', '9a000000-0000-0000-0000-000000000004');
    raise exception 'cross-organization vehicle was accepted';
  exception when sqlstate '22023' then null;
  end;
  begin
    perform pg_temp.create_test_bill('9c000000-0000-0000-0000-000000000004', '9b000000-0000-0000-0000-000000000001', '9d000000-0000-0000-0000-000000000003', '9a000000-0000-0000-0000-000000000001');
    raise exception 'inactive driver was accepted';
  exception when sqlstate '22023' then null;
  end;
  begin
    perform pg_temp.create_test_bill('9c000000-0000-0000-0000-000000000005', '9b000000-0000-0000-0000-000000000001', '9d000000-0000-0000-0000-000000000001', '9a000000-0000-0000-0000-000000000002');
    raise exception 'inactive vehicle was accepted';
  exception when sqlstate '22023' then null;
  end;
  begin
    perform pg_temp.create_test_bill('9c000000-0000-0000-0000-000000000006', '9b000000-0000-0000-0000-000000000001', '9d000000-0000-0000-0000-000000000002', '9a000000-0000-0000-0000-000000000001');
    raise exception 'invalid driver vehicle pairing was accepted';
  exception when sqlstate '40001' then null;
  end;
  begin
    insert into public.bills (organization_id, user_id, billing_party_id, driver_id, vehicle_id)
    values ((select id from test_bill_vehicle_organizations where label = 'a'), '91000000-0000-0000-0000-000000000001', '9b000000-0000-0000-0000-000000000001', '9d000000-0000-0000-0000-000000000004', '9a000000-0000-0000-0000-000000000001');
    raise exception 'direct SQL bypassed tenant validation';
  exception when insufficient_privilege or sqlstate '22023' then null;
  end;
end;
$$;
reset role;

select set_config('request.jwt.claims', '{"sub":"91000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1"}', true);
set local role authenticated;
select public.assign_driver_to_vehicle(
  (select id from test_bill_vehicle_organizations where label = 'a'),
  '9a000000-0000-0000-0000-000000000001',
  '9d000000-0000-0000-0000-000000000002'
);

do $$
begin
  begin
    perform pg_temp.create_test_bill('9c000000-0000-0000-0000-000000000007', '9b000000-0000-0000-0000-000000000001', '9d000000-0000-0000-0000-000000000001', '9a000000-0000-0000-0000-000000000001');
    raise exception 'stale assignment was accepted';
  exception when sqlstate '40001' then null;
  end;
end;
$$;

select pg_temp.create_test_bill('9c000000-0000-0000-0000-000000000008', '9b000000-0000-0000-0000-000000000001', '9d000000-0000-0000-0000-000000000002', '9a000000-0000-0000-0000-000000000001');
select pg_temp.assert_true(
  (select driver_name = 'Driver A' and vehicle_number = 'KL01AB1234' from public.bills where client_request_id = '9c000000-0000-0000-0000-000000000001'),
  'Bill 1 must retain Driver A after reassignment'
);
select pg_temp.assert_true(
  (select driver_name = 'Driver B' and vehicle_number = 'KL01AB1234' from public.bills where client_request_id = '9c000000-0000-0000-0000-000000000008'),
  'Bill 2 must record Driver B after reassignment'
);
reset role;

update public.bills
set guest_name = 'Edited historical guest', customer_name = 'Edited historical guest', passenger_name = 'Edited historical guest', driver_name = 'Spoofed', vehicle_number = 'SPOOFED'
where client_request_id = '9c000000-0000-0000-0000-000000000001';
select pg_temp.assert_true(
  (select guest_name = 'Edited historical guest' and driver_name = 'Driver A' and vehicle_number = 'KL01AB1234' from public.bills where client_request_id = '9c000000-0000-0000-0000-000000000001'),
  'unchanged historical references must remain editable without replacing snapshots'
);

update public.drivers set status = 'inactive' where id in ('9d000000-0000-0000-0000-000000000001', '9d000000-0000-0000-0000-000000000002');
update public.vehicles set status = 'inactive' where id = '9a000000-0000-0000-0000-000000000001';
select pg_temp.assert_true(
  (select count(*) = 2 from public.bills where vehicle_id = '9a000000-0000-0000-0000-000000000001' and driver_name in ('Driver A', 'Driver B')),
  'driver and vehicle deactivation must not erase historical bill snapshots'
);

alter table public.bills disable trigger validate_bill_driver_vehicle;
insert into public.bills (id, organization_id, user_id, billing_party_id, guest_name, customer_name, passenger_name, driver_name, vehicle_name, vehicle_number)
values ('9e000000-0000-0000-0000-000000000001', (select id from test_bill_vehicle_organizations where label = 'a'), '91000000-0000-0000-0000-000000000001', '9b000000-0000-0000-0000-000000000001', 'Legacy guest', 'Legacy guest', 'Legacy guest', 'Legacy driver', 'Legacy vehicle', 'LEGACY-1');
alter table public.bills enable trigger validate_bill_driver_vehicle;
update public.bills set guest_name = 'Updated legacy guest', customer_name = 'Updated legacy guest', passenger_name = 'Updated legacy guest' where id = '9e000000-0000-0000-0000-000000000001';
select pg_temp.assert_true(
  (select guest_name = 'Updated legacy guest' and driver_id is null and vehicle_id is null and driver_name = 'Legacy driver' from public.bills where id = '9e000000-0000-0000-0000-000000000001'),
  'legacy Fleet Owner bills with null references must remain valid and editable'
);

select set_config('request.jwt.claims', '{"sub":"93000000-0000-0000-0000-000000000003","role":"authenticated","aal":"aal1"}', true);
set local role authenticated;
select pg_temp.assert_true(
  (select (pg_temp.create_test_bill('9c000000-0000-0000-0000-000000000009', '9b000000-0000-0000-0000-000000000003', null, null)).driver_id is null),
  'Individual Driver bill flow must continue to allow nullable managed references'
);
reset role;

select set_config('request.jwt.claims', '{"sub":"92000000-0000-0000-0000-000000000002","role":"authenticated","aal":"aal1"}', true);
set local role authenticated;
select pg_temp.assert_true((select count(*) = 0 from public.bills where organization_id = (select id from test_bill_vehicle_organizations where label = 'a')), 'cross-organization bill reads must remain blocked');
reset role;

insert into auth.mfa_factors (id, user_id, factor_type, status, created_at, updated_at)
values ('9f000000-0000-0000-0000-000000000001', '91000000-0000-0000-0000-000000000001', 'totp', 'verified', now(), now());
select set_config('request.jwt.claims', '{"sub":"91000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1"}', true);
set local role authenticated;
select pg_temp.assert_true((select count(*) = 0 from public.bills), 'verified MFA user at aal1 must remain blocked from bill reads');
reset role;

select pg_temp.assert_true(not exists (
  select 1
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'create_bill'
    and has_function_privilege('anon', p.oid, 'execute')
), 'anonymous bill creation must remain blocked');
select pg_temp.assert_true(not has_function_privilege('authenticated', 'public.validate_bill_driver_vehicle()', 'execute'), 'bill validation trigger must not be client executable');

rollback;
