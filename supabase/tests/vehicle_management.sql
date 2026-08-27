begin;

create or replace function pg_temp.assert_true(condition boolean, message text)
returns void language plpgsql as $$
begin
  if not coalesce(condition, false) then
    raise exception 'vehicle management test failed: %', message;
  end if;
end;
$$;
grant execute on function pg_temp.assert_true(boolean, text) to authenticated;

create temporary table test_vehicle_organizations (label text primary key, id uuid not null);
grant select on table test_vehicle_organizations to authenticated;

insert into auth.users (id, email, aud, role, created_at, updated_at)
values
  ('71000000-0000-0000-0000-000000000001', 'vehicle-owner-a@example.test', 'authenticated', 'authenticated', now(), now()),
  ('72000000-0000-0000-0000-000000000002', 'vehicle-owner-b@example.test', 'authenticated', 'authenticated', now(), now()),
  ('73000000-0000-0000-0000-000000000003', 'vehicle-admin-a@example.test', 'authenticated', 'authenticated', now(), now()),
  ('74000000-0000-0000-0000-000000000004', 'vehicle-member-a@example.test', 'authenticated', 'authenticated', now(), now());

insert into test_vehicle_organizations (label, id)
values
  ('a', private.default_organization_id('71000000-0000-0000-0000-000000000001')),
  ('b', private.default_organization_id('72000000-0000-0000-0000-000000000002'));

update public.organizations
set business_type = 'vendor'
where id in (select id from test_vehicle_organizations);

insert into public.organization_members (organization_id, user_id, role)
values
  ((select id from test_vehicle_organizations where label = 'a'), '73000000-0000-0000-0000-000000000003', 'admin'),
  ((select id from test_vehicle_organizations where label = 'a'), '74000000-0000-0000-0000-000000000004', 'member');

insert into public.vehicles (id, organization_id, registration_number, display_name)
values (
  '7a000000-0000-0000-0000-000000000099',
  private.default_organization_id('73000000-0000-0000-0000-000000000003'),
  'INDIVIDUAL-01',
  'Individual workspace vehicle'
);

select set_config('request.jwt.claims', '{"sub":"73000000-0000-0000-0000-000000000003","role":"authenticated","aal":"aal1"}', true);
set local role authenticated;
do $$
begin
  begin
    insert into public.vehicles (organization_id, registration_number)
    values (private.default_organization_id('73000000-0000-0000-0000-000000000003'), 'INDIVIDUAL-02');
    raise exception 'individual-driver owner created a vehicle';
  exception when sqlstate '42501' then
    null;
  end;
end;
$$;
do $$
declare
  affected integer;
begin
  update public.vehicles set status = 'inactive' where id = '7a000000-0000-0000-0000-000000000099';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'individual-driver owner updated a vehicle'; end if;
end;
$$;
reset role;

select set_config('request.jwt.claims', '{"sub":"71000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1"}', true);
set local role authenticated;
insert into public.vehicles (id, organization_id, registration_number, display_name, make_model, year)
values (
  '7a000000-0000-0000-0000-000000000001',
  (select id from test_vehicle_organizations where label = 'a'),
  'MH03 CV 4312',
  'Airport Innova',
  'Toyota Innova Crysta',
  2024
);
select pg_temp.assert_true(
  (select registration_number_normalized = 'MH03CV4312' from public.vehicles where id = '7a000000-0000-0000-0000-000000000001'),
  'registration must have a deterministic normalized value'
);
update public.vehicles
set display_name = 'Updated Innova', status = 'inactive'
where id = '7a000000-0000-0000-0000-000000000001';
select pg_temp.assert_true(
  (select display_name = 'Updated Innova' and status = 'inactive' from public.vehicles where id = '7a000000-0000-0000-0000-000000000001'),
  'owner must update a vehicle and inactive vehicles must remain readable'
);
do $$
begin
  begin
    insert into public.vehicles (organization_id, registration_number)
    values ((select id from test_vehicle_organizations where label = 'a'), 'mh03-cv-4312');
    raise exception 'normalized duplicate registration was accepted';
  exception when unique_violation then
    null;
  end;
end;
$$;
reset role;

select set_config('request.jwt.claims', '{"sub":"72000000-0000-0000-0000-000000000002","role":"authenticated","aal":"aal1"}', true);
set local role authenticated;
insert into public.vehicles (id, organization_id, registration_number)
values ('7a000000-0000-0000-0000-000000000002', (select id from test_vehicle_organizations where label = 'b'), 'MH03CV4312');
select pg_temp.assert_true(
  (select count(*) = 1 from public.vehicles where registration_number_normalized = 'MH03CV4312'),
  'the same registration must be allowed in another organization and remain organization-scoped by RLS'
);
select pg_temp.assert_true(
  (select count(*) = 0 from public.vehicles where organization_id = (select id from test_vehicle_organizations where label = 'a')),
  'cross-organization vehicle reads must be blocked'
);
do $$
begin
  begin
    insert into public.vehicles (organization_id, registration_number)
    values ((select id from test_vehicle_organizations where label = 'a'), 'CROSS-ORG-01');
    raise exception 'cross-organization vehicle write was accepted';
  exception when sqlstate '42501' then
    null;
  end;
end;
$$;
reset role;

select set_config('request.jwt.claims', '{"sub":"73000000-0000-0000-0000-000000000003","role":"authenticated","aal":"aal1"}', true);
set local role authenticated;
insert into public.vehicles (id, organization_id, registration_number, make_model, status)
values ('7a000000-0000-0000-0000-000000000003', (select id from test_vehicle_organizations where label = 'a'), 'MH04AB1234', 'Maruti Dzire', 'active');
update public.vehicles set status = 'inactive' where id = '7a000000-0000-0000-0000-000000000003';
select pg_temp.assert_true(
  (select status = 'inactive' from public.vehicles where id = '7a000000-0000-0000-0000-000000000003'),
  'Fleet Owner admin must create, update and deactivate vehicles'
);
reset role;

select set_config('request.jwt.claims', '{"sub":"74000000-0000-0000-0000-000000000004","role":"authenticated","aal":"aal1"}', true);
set local role authenticated;
select pg_temp.assert_true((select count(*) = 2 from public.vehicles), 'Fleet Owner member must retain organization-scoped read access');
do $$
begin
  begin
    insert into public.vehicles (organization_id, registration_number)
    values ((select id from test_vehicle_organizations where label = 'a'), 'MEMBER-01');
    raise exception 'Fleet Owner member created a vehicle';
  exception when sqlstate '42501' then
    null;
  end;
end;
$$;
do $$
declare
  affected integer;
begin
  update public.vehicles set status = 'active' where id = '7a000000-0000-0000-0000-000000000001';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'Fleet Owner member updated a vehicle'; end if;
end;
$$;
reset role;

select set_config('request.jwt.claims', '{"sub":"71000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1"}', true);
set local role authenticated;
do $$
begin
  begin
    update public.vehicles
    set organization_id = (select id from test_vehicle_organizations where label = 'b')
    where id = '7a000000-0000-0000-0000-000000000001';
    raise exception 'vehicle organization mutation was accepted';
  exception when sqlstate '42501' then
    null;
  end;
end;
$$;
do $$
begin
  begin
    delete from public.vehicles where id = '7a000000-0000-0000-0000-000000000001';
    raise exception 'vehicle deletion was available';
  exception when insufficient_privilege then
    null;
  end;
end;
$$;
reset role;

insert into auth.mfa_factors (id, user_id, factor_type, status, created_at, updated_at)
values ('7f000000-0000-0000-0000-000000000001', '71000000-0000-0000-0000-000000000001', 'totp', 'verified', now(), now());

select set_config('request.jwt.claims', '{"sub":"71000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1"}', true);
set local role authenticated;
select pg_temp.assert_true((select count(*) = 0 from public.vehicles), 'verified MFA user at aal1 must be blocked from vehicles');
do $$
begin
  begin
    insert into public.vehicles (organization_id, registration_number)
    values ((select id from test_vehicle_organizations where label = 'a'), 'MFA-AAL1');
    raise exception 'verified MFA user at aal1 created a vehicle';
  exception when sqlstate '42501' then
    null;
  end;
end;
$$;
reset role;

select set_config('request.jwt.claims', '{"sub":"71000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal2"}', true);
set local role authenticated;
select pg_temp.assert_true((select count(*) = 2 from public.vehicles), 'verified MFA user at aal2 must retain vehicle access');
reset role;

select pg_temp.assert_true(not has_table_privilege('anon', 'public.vehicles', 'select'), 'anonymous vehicle reads must be blocked');
select pg_temp.assert_true(not has_table_privilege('anon', 'public.vehicles', 'insert'), 'anonymous vehicle writes must be blocked');
select pg_temp.assert_true(has_table_privilege('authenticated', 'public.vehicles', 'select'), 'authenticated vehicle reads require a table grant');
select pg_temp.assert_true(has_table_privilege('authenticated', 'public.vehicles', 'insert'), 'authenticated vehicle creates require a table grant');
select pg_temp.assert_true(has_table_privilege('authenticated', 'public.vehicles', 'update'), 'authenticated vehicle updates require a table grant');
select pg_temp.assert_true(not has_table_privilege('authenticated', 'public.vehicles', 'delete'), 'vehicle deletion must remain unavailable');
select pg_temp.assert_true(not has_function_privilege('anon', 'public.set_vehicles_updated_at()', 'execute'), 'vehicle trigger helper must not be anonymous');
select pg_temp.assert_true(not has_function_privilege('authenticated', 'public.protect_vehicles_organization()', 'execute'), 'vehicle organization guard must not be client-executable');
select pg_temp.assert_true(not has_function_privilege('anon', 'private.can_manage_vehicles(uuid)', 'execute'), 'vehicle authorization helper must not be anonymous');
select pg_temp.assert_true(has_function_privilege('authenticated', 'private.can_manage_vehicles(uuid)', 'execute'), 'vehicle policies require authenticated helper execution');

rollback;
