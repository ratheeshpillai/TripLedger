begin;

create or replace function pg_temp.assert_true(condition boolean, message text)
returns void language plpgsql as $$
begin
  if not coalesce(condition, false) then
    raise exception 'driver vehicle assignment test failed: %', message;
  end if;
end;
$$;
grant execute on function pg_temp.assert_true(boolean, text) to authenticated;

create temporary table test_assignment_organizations (label text primary key, id uuid not null);
grant select on table test_assignment_organizations to authenticated;

insert into auth.users (id, email, aud, role, created_at, updated_at)
values
  ('81000000-0000-0000-0000-000000000001', 'assignment-owner-a@example.test', 'authenticated', 'authenticated', now(), now()),
  ('82000000-0000-0000-0000-000000000002', 'assignment-owner-b@example.test', 'authenticated', 'authenticated', now(), now()),
  ('83000000-0000-0000-0000-000000000003', 'assignment-admin-a@example.test', 'authenticated', 'authenticated', now(), now()),
  ('84000000-0000-0000-0000-000000000004', 'assignment-member-a@example.test', 'authenticated', 'authenticated', now(), now()),
  ('85000000-0000-0000-0000-000000000005', 'assignment-individual@example.test', 'authenticated', 'authenticated', now(), now());

insert into test_assignment_organizations (label, id)
values
  ('a', private.default_organization_id('81000000-0000-0000-0000-000000000001')),
  ('b', private.default_organization_id('82000000-0000-0000-0000-000000000002')),
  ('individual', private.default_organization_id('85000000-0000-0000-0000-000000000005'));

update public.organizations
set business_type = 'vendor'
where id in (select id from test_assignment_organizations where label in ('a', 'b'));

insert into public.organization_members (organization_id, user_id, role)
values
  ((select id from test_assignment_organizations where label = 'a'), '83000000-0000-0000-0000-000000000003', 'admin'),
  ((select id from test_assignment_organizations where label = 'a'), '84000000-0000-0000-0000-000000000004', 'member');

insert into public.drivers (id, organization_id, name, status)
values
  ('8d000000-0000-0000-0000-000000000001', (select id from test_assignment_organizations where label = 'a'), 'Driver One', 'active'),
  ('8d000000-0000-0000-0000-000000000002', (select id from test_assignment_organizations where label = 'a'), 'Driver Two', 'active'),
  ('8d000000-0000-0000-0000-000000000003', (select id from test_assignment_organizations where label = 'a'), 'Inactive Driver', 'inactive'),
  ('8d000000-0000-0000-0000-000000000004', (select id from test_assignment_organizations where label = 'b'), 'Other Driver', 'active'),
  ('8d000000-0000-0000-0000-000000000005', (select id from test_assignment_organizations where label = 'individual'), 'Individual Driver', 'active');

insert into public.vehicles (id, organization_id, registration_number, status)
values
  ('8a000000-0000-0000-0000-000000000001', (select id from test_assignment_organizations where label = 'a'), 'ASSIGN-A-01', 'active'),
  ('8a000000-0000-0000-0000-000000000002', (select id from test_assignment_organizations where label = 'a'), 'ASSIGN-A-02', 'active'),
  ('8a000000-0000-0000-0000-000000000003', (select id from test_assignment_organizations where label = 'a'), 'ASSIGN-A-03', 'inactive'),
  ('8a000000-0000-0000-0000-000000000004', (select id from test_assignment_organizations where label = 'b'), 'ASSIGN-B-01', 'active'),
  ('8a000000-0000-0000-0000-000000000005', (select id from test_assignment_organizations where label = 'individual'), 'ASSIGN-I-01', 'active');

select set_config('request.jwt.claims', '{"sub":"81000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1"}', true);
set local role authenticated;

select public.assign_driver_to_vehicle(
  (select id from test_assignment_organizations where label = 'a'),
  '8a000000-0000-0000-0000-000000000001',
  '8d000000-0000-0000-0000-000000000001'
);
select pg_temp.assert_true(
  (select count(*) = 1 from public.driver_vehicle_assignments where vehicle_id = '8a000000-0000-0000-0000-000000000001' and status = 'active'),
  'Fleet Owner owner must create a valid assignment'
);

select public.assign_driver_to_vehicle(
  (select id from test_assignment_organizations where label = 'a'),
  '8a000000-0000-0000-0000-000000000001',
  '8d000000-0000-0000-0000-000000000002'
);
select pg_temp.assert_true(
  (select count(*) = 2 from public.driver_vehicle_assignments where vehicle_id = '8a000000-0000-0000-0000-000000000001'),
  'reassignment must retain assignment history'
);
select pg_temp.assert_true(
  (select count(*) = 1 from public.driver_vehicle_assignments where vehicle_id = '8a000000-0000-0000-0000-000000000001' and status = 'active' and driver_id = '8d000000-0000-0000-0000-000000000002'),
  'reassignment must leave exactly one active driver'
);
select pg_temp.assert_true(
  (select count(*) = 1 from public.driver_vehicle_assignments where vehicle_id = '8a000000-0000-0000-0000-000000000001' and status = 'inactive' and ended_at is not null),
  'reassignment must close the previous assignment'
);

select public.end_driver_vehicle_assignment(
  (select id from test_assignment_organizations where label = 'a'),
  '8a000000-0000-0000-0000-000000000001'
);
select pg_temp.assert_true(
  (select count(*) = 0 from public.driver_vehicle_assignments where vehicle_id = '8a000000-0000-0000-0000-000000000001' and status = 'active'),
  'owner must end an active assignment without deleting history'
);

do $$
begin
  begin
    insert into public.driver_vehicle_assignments (organization_id, driver_id, vehicle_id)
    values ((select id from test_assignment_organizations where label = 'a'), '8d000000-0000-0000-0000-000000000001', '8a000000-0000-0000-0000-000000000001');
    raise exception 'direct client assignment insert was available';
  exception when insufficient_privilege then null;
  end;
end;
$$;
reset role;

select set_config('request.jwt.claims', '{"sub":"83000000-0000-0000-0000-000000000003","role":"authenticated","aal":"aal1"}', true);
set local role authenticated;
select public.assign_driver_to_vehicle(
  (select id from test_assignment_organizations where label = 'a'),
  '8a000000-0000-0000-0000-000000000002',
  '8d000000-0000-0000-0000-000000000001'
);
select pg_temp.assert_true(
  (select count(*) = 1 from public.driver_vehicle_assignments where vehicle_id = '8a000000-0000-0000-0000-000000000002' and status = 'active'),
  'Fleet Owner admin must create assignments'
);
reset role;

select set_config('request.jwt.claims', '{"sub":"84000000-0000-0000-0000-000000000004","role":"authenticated","aal":"aal1"}', true);
set local role authenticated;
select pg_temp.assert_true((select count(*) = 3 from public.driver_vehicle_assignments), 'Fleet Owner member must retain organization-scoped read access');
do $$
begin
  begin
    perform public.assign_driver_to_vehicle(
      (select id from test_assignment_organizations where label = 'a'),
      '8a000000-0000-0000-0000-000000000001',
      '8d000000-0000-0000-0000-000000000001'
    );
    raise exception 'Fleet Owner member changed an assignment';
  exception when sqlstate '42501' then null;
  end;
end;
$$;
reset role;

select set_config('request.jwt.claims', '{"sub":"85000000-0000-0000-0000-000000000005","role":"authenticated","aal":"aal1"}', true);
set local role authenticated;
do $$
begin
  begin
    perform public.assign_driver_to_vehicle(
      (select id from test_assignment_organizations where label = 'individual'),
      '8a000000-0000-0000-0000-000000000005',
      '8d000000-0000-0000-0000-000000000005'
    );
    raise exception 'Individual Driver managed an assignment';
  exception when sqlstate '42501' then null;
  end;
end;
$$;
reset role;

select set_config('request.jwt.claims', '{"sub":"82000000-0000-0000-0000-000000000002","role":"authenticated","aal":"aal1"}', true);
set local role authenticated;
select pg_temp.assert_true((select count(*) = 0 from public.driver_vehicle_assignments), 'cross-organization assignment reads must be blocked');
do $$
begin
  begin
    perform public.assign_driver_to_vehicle(
      (select id from test_assignment_organizations where label = 'a'),
      '8a000000-0000-0000-0000-000000000001',
      '8d000000-0000-0000-0000-000000000001'
    );
    raise exception 'cross-organization assignment mutation was accepted';
  exception when sqlstate '42501' then null;
  end;
end;
$$;
reset role;

do $$
begin
  begin
    insert into public.driver_vehicle_assignments (organization_id, driver_id, vehicle_id)
    values (
      (select id from test_assignment_organizations where label = 'a'),
      '8d000000-0000-0000-0000-000000000004',
      '8a000000-0000-0000-0000-000000000001'
    );
    raise exception 'cross-organization SQL assignment was accepted';
  exception when foreign_key_violation or sqlstate '22023' then null;
  end;
end;
$$;

do $$
begin
  begin
    insert into public.driver_vehicle_assignments (organization_id, driver_id, vehicle_id)
    values ((select id from test_assignment_organizations where label = 'a'), '8d000000-0000-0000-0000-000000000003', '8a000000-0000-0000-0000-000000000001');
    raise exception 'inactive driver was assigned';
  exception when sqlstate '22023' then null;
  end;
  begin
    insert into public.driver_vehicle_assignments (organization_id, driver_id, vehicle_id)
    values ((select id from test_assignment_organizations where label = 'a'), '8d000000-0000-0000-0000-000000000001', '8a000000-0000-0000-0000-000000000003');
    raise exception 'inactive vehicle was assigned';
  exception when sqlstate '22023' then null;
  end;
end;
$$;

do $$
declare
  v_assignment_id uuid;
begin
  insert into public.driver_vehicle_assignments (organization_id, driver_id, vehicle_id)
  values ((select id from test_assignment_organizations where label = 'b'), '8d000000-0000-0000-0000-000000000004', '8a000000-0000-0000-0000-000000000004')
  returning id into v_assignment_id;

  begin
    insert into public.driver_vehicle_assignments (organization_id, driver_id, vehicle_id)
    values ((select id from test_assignment_organizations where label = 'b'), '8d000000-0000-0000-0000-000000000004', '8a000000-0000-0000-0000-000000000004');
    raise exception 'vehicle received two active drivers';
  exception when unique_violation then null;
  end;

  begin
    update public.driver_vehicle_assignments
    set organization_id = (select id from test_assignment_organizations where label = 'a')
    where id = v_assignment_id;
    raise exception 'assignment organization mutation was accepted';
  exception when sqlstate '42501' then null;
  end;
end;
$$;

insert into auth.mfa_factors (id, user_id, factor_type, status, created_at, updated_at)
values ('8f000000-0000-0000-0000-000000000001', '81000000-0000-0000-0000-000000000001', 'totp', 'verified', now(), now());

select set_config('request.jwt.claims', '{"sub":"81000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1"}', true);
set local role authenticated;
select pg_temp.assert_true((select count(*) = 0 from public.driver_vehicle_assignments), 'verified MFA user at aal1 must be blocked from assignment reads');
do $$
begin
  begin
    perform public.assign_driver_to_vehicle(
      (select id from test_assignment_organizations where label = 'a'),
      '8a000000-0000-0000-0000-000000000001',
      '8d000000-0000-0000-0000-000000000001'
    );
    raise exception 'verified MFA user at aal1 changed an assignment';
  exception when sqlstate '42501' then null;
  end;
end;
$$;
reset role;

select set_config('request.jwt.claims', '{"sub":"81000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal2"}', true);
set local role authenticated;
select public.assign_driver_to_vehicle(
  (select id from test_assignment_organizations where label = 'a'),
  '8a000000-0000-0000-0000-000000000001',
  '8d000000-0000-0000-0000-000000000001'
);
select pg_temp.assert_true((select count(*) = 1 from public.driver_vehicle_assignments where vehicle_id = '8a000000-0000-0000-0000-000000000001' and status = 'active'), 'verified MFA user at aal2 must manage assignments');
do $$
begin
  begin
    delete from public.driver_vehicle_assignments where vehicle_id = '8a000000-0000-0000-0000-000000000001';
    raise exception 'assignment deletion was available';
  exception when insufficient_privilege then null;
  end;
end;
$$;
reset role;

select pg_temp.assert_true(not has_table_privilege('anon', 'public.driver_vehicle_assignments', 'select'), 'anonymous assignment reads must be blocked');
select pg_temp.assert_true(not has_table_privilege('authenticated', 'public.driver_vehicle_assignments', 'insert'), 'direct assignment inserts must remain unavailable');
select pg_temp.assert_true(not has_table_privilege('authenticated', 'public.driver_vehicle_assignments', 'update'), 'direct assignment updates must remain unavailable');
select pg_temp.assert_true(not has_table_privilege('authenticated', 'public.driver_vehicle_assignments', 'delete'), 'assignment deletion must remain unavailable');
select pg_temp.assert_true(not has_function_privilege('anon', 'public.assign_driver_to_vehicle(uuid,uuid,uuid)', 'execute'), 'anonymous assignment RPC access must be blocked');
select pg_temp.assert_true(has_function_privilege('authenticated', 'public.assign_driver_to_vehicle(uuid,uuid,uuid)', 'execute'), 'authenticated assignment RPC access must be explicit');
select pg_temp.assert_true(not has_function_privilege('anon', 'public.end_driver_vehicle_assignment(uuid,uuid)', 'execute'), 'anonymous end-assignment RPC access must be blocked');

rollback;
