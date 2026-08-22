begin;

create or replace function pg_temp.assert_true(condition boolean, message text)
returns void language plpgsql as $$
begin
  if not coalesce(condition, false) then
    raise exception 'organization foundation test failed: %', message;
  end if;
end;
$$;
grant execute on function pg_temp.assert_true(boolean, text) to authenticated;

create temporary table test_organizations (label text primary key, id uuid not null);
grant select on table test_organizations to authenticated;

insert into auth.users (id, email, aud, role, created_at, updated_at)
values
  ('10000000-0000-0000-0000-000000000001', 'org-a@example.test', 'authenticated', 'authenticated', now(), now()),
  ('20000000-0000-0000-0000-000000000002', 'org-b@example.test', 'authenticated', 'authenticated', now(), now()),
  ('30000000-0000-0000-0000-000000000003', 'org-member@example.test', 'authenticated', 'authenticated', now(), now());

insert into test_organizations (label, id)
values
  ('a', private.default_organization_id('10000000-0000-0000-0000-000000000001')),
  ('b', private.default_organization_id('20000000-0000-0000-0000-000000000002'));

select pg_temp.assert_true(
  (select count(*) = 3 from public.organizations),
  'new auth users must each receive one organization'
);
select pg_temp.assert_true(
  (select count(*) = 3 from public.organization_members where role = 'owner'),
  'new auth users must each receive one owner membership'
);

select private.ensure_default_organization('10000000-0000-0000-0000-000000000001');
select private.ensure_default_organization('10000000-0000-0000-0000-000000000001');
select pg_temp.assert_true(
  (select count(*) = 1 from public.organization_members where user_id = '10000000-0000-0000-0000-000000000001'),
  'default organization initialization must be idempotent'
);

do $$
begin
  begin
    insert into public.organization_members (organization_id, user_id, role)
    values (
      private.default_organization_id('10000000-0000-0000-0000-000000000001'),
      '10000000-0000-0000-0000-000000000001',
      'owner'
    );
    raise exception 'duplicate organization membership was accepted';
  exception when unique_violation then
    null;
  end;
end;
$$;

insert into public.organization_members (organization_id, user_id, role)
values (
  private.default_organization_id('10000000-0000-0000-0000-000000000001'),
  '30000000-0000-0000-0000-000000000003',
  'member'
);

insert into public.billing_parties (id, organization_id, user_id, name)
values
  ('a1000000-0000-0000-0000-000000000001', private.default_organization_id('10000000-0000-0000-0000-000000000001'), '10000000-0000-0000-0000-000000000001', 'Organization A owner'),
  ('b2000000-0000-0000-0000-000000000002', private.default_organization_id('20000000-0000-0000-0000-000000000002'), '20000000-0000-0000-0000-000000000002', 'Organization B owner');

insert into public.bills (id, organization_id, user_id, billing_party_id)
values
  ('a1100000-0000-0000-0000-000000000001', private.default_organization_id('10000000-0000-0000-0000-000000000001'), '10000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001'),
  ('b2200000-0000-0000-0000-000000000002', private.default_organization_id('20000000-0000-0000-0000-000000000002'), '20000000-0000-0000-0000-000000000002', 'b2000000-0000-0000-0000-000000000002');

insert into public.owner_payments (id, organization_id, user_id, billing_party_id, payment_date, amount, payment_type)
values
  ('a1200000-0000-0000-0000-000000000001', private.default_organization_id('10000000-0000-0000-0000-000000000001'), '10000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', current_date, 100, 'payment_received'),
  ('b2300000-0000-0000-0000-000000000002', private.default_organization_id('20000000-0000-0000-0000-000000000002'), '20000000-0000-0000-0000-000000000002', 'b2000000-0000-0000-0000-000000000002', current_date, 200, 'payment_received');

alter table public.bills alter column organization_id drop not null;
alter table public.billing_parties alter column organization_id drop not null;
alter table public.owner_payments alter column organization_id drop not null;
alter table public.bills disable trigger user;
alter table public.billing_parties disable trigger user;
alter table public.owner_payments disable trigger user;
update public.bills set organization_id = null where user_id = '10000000-0000-0000-0000-000000000001';
update public.billing_parties set organization_id = null where user_id = '10000000-0000-0000-0000-000000000001';
update public.owner_payments set organization_id = null where user_id = '10000000-0000-0000-0000-000000000001';
update public.bills set organization_id = private.default_organization_id(user_id) where organization_id is null;
update public.billing_parties set organization_id = private.default_organization_id(user_id) where organization_id is null;
update public.owner_payments set organization_id = private.default_organization_id(user_id) where organization_id is null;
select pg_temp.assert_true(
  (select count(*) = 0 from public.bills where organization_id is null)
  and (select count(*) = 0 from public.billing_parties where organization_id is null)
  and (select count(*) = 0 from public.owner_payments where organization_id is null),
  'existing operational records must backfill into their deterministic user organization'
);
alter table public.bills alter column organization_id set not null;
alter table public.billing_parties alter column organization_id set not null;
alter table public.owner_payments alter column organization_id set not null;
alter table public.bills enable trigger user;
alter table public.billing_parties enable trigger user;
alter table public.owner_payments enable trigger user;

select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1"}', true);
set local role authenticated;
select pg_temp.assert_true((select count(*) = 1 from public.organizations), 'user A must see only organization A');
select pg_temp.assert_true((select count(*) = 1 from public.bills), 'user A must see only organization A bills');
select pg_temp.assert_true((select count(*) = 1 from public.billing_parties), 'user A must see only organization A billing parties');
select pg_temp.assert_true((select count(*) = 1 from public.owner_payments), 'user A must see only organization A payments');
select pg_temp.assert_true(
  (
    select (public.create_bill(
      p_client_request_id => 'a1300000-0000-0000-0000-000000000001',
      p_company_id => null,
      p_billing_party_id => 'a1000000-0000-0000-0000-000000000001',
      p_driver_id => null,
      p_vehicle_id => null,
      p_guest_id => null,
      p_driver_name => 'Driver A',
      p_vehicle_name => 'Vehicle A',
      p_vehicle_number => 'TEST-A',
      p_guest_salutation => 'Mr.',
      p_guest_name => 'RPC guest',
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
    )).organization_id = (select id from test_organizations where label = 'a')
  ),
  'bill creation RPC must assign the selected billing party organization'
);
select pg_temp.assert_true(
  (
    select (public.update_bill(
      p_bill_id => (select id from public.bills where client_request_id = 'a1300000-0000-0000-0000-000000000001'),
      p_company_id => null,
      p_billing_party_id => 'a1000000-0000-0000-0000-000000000001',
      p_driver_id => null,
      p_vehicle_id => null,
      p_guest_id => null,
      p_driver_name => 'Driver A',
      p_vehicle_name => 'Vehicle A',
      p_vehicle_number => 'TEST-A',
      p_guest_salutation => 'Mr.',
      p_guest_name => 'Updated RPC guest',
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
    )).guest_name = 'Updated RPC guest'
  ),
  'bill update RPC must preserve organization ownership'
);
reset role;

select set_config('request.jwt.claims', '{"sub":"20000000-0000-0000-0000-000000000002","role":"authenticated","aal":"aal1"}', true);
set local role authenticated;
select pg_temp.assert_true(
  (select count(*) = 0 from public.organizations where id = (select id from test_organizations where label = 'a')),
  'non-member must not see organization A'
);
select pg_temp.assert_true(
  (select count(*) = 0 from public.get_billing_party_ledger((select id from test_organizations where label = 'a'), 'a1000000-0000-0000-0000-000000000001')),
  'organization-scoped ledger RPC must not cross organizations'
);
select pg_temp.assert_true(
  (select count(*) = 0 from public.get_billing_party_statement((select id from test_organizations where label = 'a'), 'a1000000-0000-0000-0000-000000000001', current_date, current_date)),
  'organization-scoped statement RPC must not cross organizations'
);
do $$
begin
  begin
    perform public.create_owner_payment(
      gen_random_uuid(),
      'a1000000-0000-0000-0000-000000000001',
      current_date,
      100,
      'payment_received',
      'cash',
      null,
      null
    );
    raise exception 'cross-organization payment RPC was accepted';
  exception when sqlstate '42501' then
    null;
  end;
end;
$$;
do $$
begin
  begin
    insert into public.billing_parties (organization_id, user_id, name)
    values ((select id from test_organizations where label = 'a'), '20000000-0000-0000-0000-000000000002', 'Spoofed organization');
    raise exception 'cross-organization direct write was accepted';
  exception when sqlstate '42501' then
    null;
  end;
end;
$$;
reset role;

select set_config('request.jwt.claims', '{"sub":"30000000-0000-0000-0000-000000000003","role":"authenticated","aal":"aal1"}', true);
set local role authenticated;
select pg_temp.assert_true(
  (select count(*) = 2 from public.bills where organization_id = (select id from test_organizations where label = 'a')),
  'organization member must see permitted organization A data'
);
do $$
declare
  affected integer;
begin
  update public.billing_parties
  set notes = 'member write must not apply'
  where id = 'a1000000-0000-0000-0000-000000000001';
  get diagnostics affected = row_count;
  if affected <> 0 then
    raise exception 'read-only member updated organization A data';
  end if;
end;
$$;
reset role;

insert into auth.mfa_factors (id, user_id, factor_type, status, created_at, updated_at)
values ('f1000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'totp', 'verified', now(), now());

select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1"}', true);
set local role authenticated;
select pg_temp.assert_true((select count(*) = 0 from public.bills), 'verified MFA user at aal1 must be blocked');
reset role;

select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal2"}', true);
set local role authenticated;
select pg_temp.assert_true((select count(*) = 2 from public.bills), 'verified MFA user at aal2 must retain access');
reset role;

select pg_temp.assert_true(not has_table_privilege('anon', 'public.organizations', 'select'), 'anonymous organization access must be blocked');
select pg_temp.assert_true(not has_table_privilege('anon', 'public.organization_members', 'select'), 'anonymous membership access must be blocked');
select pg_temp.assert_true(not has_table_privilege('authenticated', 'public.organization_members', 'insert'), 'members must not add themselves to organizations');
select pg_temp.assert_true(not has_table_privilege('authenticated', 'public.organization_members', 'update'), 'members must not promote themselves');
select pg_temp.assert_true(not has_function_privilege('authenticated', 'private.ensure_default_organization(uuid)', 'execute'), 'internal initialization must not be client-executable');
select pg_temp.assert_true(not has_schema_privilege('authenticated', 'private', 'usage'), 'private helpers must not be directly addressable by clients');

rollback;
