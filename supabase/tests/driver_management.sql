begin;

create or replace function pg_temp.assert_true(condition boolean, message text)
returns void language plpgsql as $$
begin
  if not coalesce(condition, false) then
    raise exception 'driver management test failed: %', message;
  end if;
end;
$$;
grant execute on function pg_temp.assert_true(boolean, text) to authenticated;

create temporary table test_driver_organizations (label text primary key, id uuid not null);
grant select on table test_driver_organizations to authenticated;

insert into auth.users (id, email, aud, role, created_at, updated_at)
values
  ('61000000-0000-0000-0000-000000000001', 'driver-owner-a@example.test', 'authenticated', 'authenticated', now(), now()),
  ('62000000-0000-0000-0000-000000000002', 'driver-owner-b@example.test', 'authenticated', 'authenticated', now(), now()),
  ('63000000-0000-0000-0000-000000000003', 'driver-admin-a@example.test', 'authenticated', 'authenticated', now(), now()),
  ('64000000-0000-0000-0000-000000000004', 'driver-member-a@example.test', 'authenticated', 'authenticated', now(), now()),
  ('65000000-0000-0000-0000-000000000005', 'linked-driver@example.test', 'authenticated', 'authenticated', now(), now());

insert into test_driver_organizations (label, id)
values
  ('a', private.default_organization_id('61000000-0000-0000-0000-000000000001')),
  ('b', private.default_organization_id('62000000-0000-0000-0000-000000000002'));

select pg_temp.assert_true(
  (select count(*) = 5 from public.organizations where business_type = 'individual_driver'),
  'existing and metadata-free workspaces must default to individual_driver'
);

update public.organizations
set business_type = 'vendor'
where id in (select id from test_driver_organizations);

insert into public.organization_members (organization_id, user_id, role)
values
  ((select id from test_driver_organizations where label = 'a'), '63000000-0000-0000-0000-000000000003', 'admin'),
  ((select id from test_driver_organizations where label = 'a'), '64000000-0000-0000-0000-000000000004', 'member'),
  ((select id from test_driver_organizations where label = 'a'), '65000000-0000-0000-0000-000000000005', 'member'),
  ((select id from test_driver_organizations where label = 'b'), '65000000-0000-0000-0000-000000000005', 'admin'),
  (private.default_organization_id('63000000-0000-0000-0000-000000000003'), '64000000-0000-0000-0000-000000000004', 'admin');

insert into public.drivers (id, organization_id, name)
values ('6a000000-0000-0000-0000-000000000099', private.default_organization_id('63000000-0000-0000-0000-000000000003'), 'Individual workspace driver');

select set_config('request.jwt.claims', '{"sub":"63000000-0000-0000-0000-000000000003","role":"authenticated","aal":"aal1"}', true);
set local role authenticated;
do $$
begin
  begin
    insert into public.drivers (organization_id, name)
    values (private.default_organization_id('63000000-0000-0000-0000-000000000003'), 'Individual owner write');
    raise exception 'individual-driver owner created a driver';
  exception when sqlstate '42501' then
    null;
  end;
end;
$$;
do $$
declare
  affected integer;
begin
  update public.drivers set status = 'inactive' where id = '6a000000-0000-0000-0000-000000000099';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'individual-driver owner changed driver status'; end if;
end;
$$;
reset role;

select set_config('request.jwt.claims', '{"sub":"64000000-0000-0000-0000-000000000004","role":"authenticated","aal":"aal1"}', true);
set local role authenticated;
do $$
begin
  begin
    insert into public.drivers (organization_id, name)
    values (private.default_organization_id('63000000-0000-0000-0000-000000000003'), 'Individual admin write');
    raise exception 'individual-driver admin created a driver';
  exception when sqlstate '42501' then
    null;
  end;
end;
$$;
do $$
declare
  affected integer;
begin
  update public.drivers set status = 'inactive' where id = '6a000000-0000-0000-0000-000000000099';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'individual-driver admin changed driver status'; end if;
end;
$$;
reset role;

delete from public.drivers where id = '6a000000-0000-0000-0000-000000000099';

select set_config('request.jwt.claims', '{"sub":"61000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1"}', true);
set local role authenticated;
insert into public.drivers (id, organization_id, name, phone)
values ('6a000000-0000-0000-0000-000000000001', (select id from test_driver_organizations where label = 'a'), 'Owner-created driver', '9000000001');
select pg_temp.assert_true(
  (select count(*) = 1 from public.drivers where id = '6a000000-0000-0000-0000-000000000001' and user_id is null),
  'owner must create and read a driver without a login'
);
update public.drivers set name = 'Updated driver', status = 'inactive'
where id = '6a000000-0000-0000-0000-000000000001';
select pg_temp.assert_true(
  (select count(*) = 1 from public.drivers where id = '6a000000-0000-0000-0000-000000000001' and name = 'Updated driver' and status = 'inactive'),
  'owner must update a driver and inactive drivers must remain readable'
);
insert into public.drivers (id, organization_id, user_id, name)
values ('6a000000-0000-0000-0000-000000000002', (select id from test_driver_organizations where label = 'a'), '65000000-0000-0000-0000-000000000005', 'Linked driver');
do $$
begin
  begin
    insert into public.drivers (organization_id, user_id, name)
    values ((select id from test_driver_organizations where label = 'a'), '65000000-0000-0000-0000-000000000005', 'Duplicate linked driver');
    raise exception 'duplicate organization driver login link was accepted';
  exception when unique_violation then
    null;
  end;
end;
$$;
do $$
begin
  begin
    insert into public.drivers (organization_id, user_id, name)
    values ((select id from test_driver_organizations where label = 'a'), '62000000-0000-0000-0000-000000000002', 'Invalid linked user');
    raise exception 'driver was linked to a user outside the organization';
  exception when sqlstate '42501' then
    null;
  end;
end;
$$;
reset role;

select set_config('request.jwt.claims', '{"sub":"63000000-0000-0000-0000-000000000003","role":"authenticated","aal":"aal1"}', true);
set local role authenticated;
insert into public.drivers (id, organization_id, name)
values ('6a000000-0000-0000-0000-000000000003', (select id from test_driver_organizations where label = 'a'), 'Admin-created driver');
update public.drivers set phone = '9000000003', status = 'inactive' where id = '6a000000-0000-0000-0000-000000000003';
select pg_temp.assert_true(
  (select phone = '9000000003' and status = 'inactive' from public.drivers where id = '6a000000-0000-0000-0000-000000000003'),
  'admin must create, update and change driver status'
);
reset role;

select set_config('request.jwt.claims', '{"sub":"64000000-0000-0000-0000-000000000004","role":"authenticated","aal":"aal1"}', true);
set local role authenticated;
select pg_temp.assert_true((select count(*) = 3 from public.drivers), 'member must have read-only driver access');
do $$
begin
  begin
    insert into public.drivers (organization_id, name)
    values ((select id from test_driver_organizations where label = 'a'), 'Member-created driver');
    raise exception 'read-only member created a driver';
  exception when sqlstate '42501' then
    null;
  end;
end;
$$;
do $$
declare
  affected integer;
begin
  update public.drivers set phone = 'member-write', status = 'active' where id = '6a000000-0000-0000-0000-000000000001';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'read-only member updated a driver or changed its status'; end if;
end;
$$;
do $$
begin
  begin
    delete from public.drivers where id = '6a000000-0000-0000-0000-000000000001';
    raise exception 'read-only member deleted a driver';
  exception when insufficient_privilege then
    null;
  end;
end;
$$;
reset role;

select set_config('request.jwt.claims', '{"sub":"62000000-0000-0000-0000-000000000002","role":"authenticated","aal":"aal1"}', true);
set local role authenticated;
select pg_temp.assert_true(
  (select count(*) = 0 from public.drivers where organization_id = (select id from test_driver_organizations where label = 'a')),
  'cross-organization driver reads must be denied'
);
do $$
begin
  begin
    insert into public.drivers (organization_id, name)
    values ((select id from test_driver_organizations where label = 'a'), 'Cross-organization driver');
    raise exception 'cross-organization driver write was accepted';
  exception when sqlstate '42501' then
    null;
  end;
end;
$$;
reset role;

select set_config('request.jwt.claims', '{"sub":"61000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1"}', true);
set local role authenticated;
do $$
begin
  begin
    insert into public.drivers (organization_id, name)
    values ((select id from test_driver_organizations where label = 'b'), 'Spoofed organization driver');
    raise exception 'organization spoofing was accepted';
  exception when sqlstate '42501' then
    null;
  end;
end;
$$;
reset role;

do $$
begin
  begin
    insert into public.drivers (organization_id, name)
    values ('6f000000-0000-0000-0000-000000000099', 'Invalid organization driver');
    raise exception 'invalid organization reference was accepted';
  exception when foreign_key_violation then
    null;
  end;
end;
$$;

insert into public.drivers (organization_id, user_id, name)
values ((select id from test_driver_organizations where label = 'b'), '65000000-0000-0000-0000-000000000005', 'Same login in another organization');
select pg_temp.assert_true(
  (select count(*) = 2 from public.drivers where user_id = '65000000-0000-0000-0000-000000000005'),
  'one authenticated user must be linkable once in each organization'
);

select set_config('request.jwt.claims', '{"sub":"65000000-0000-0000-0000-000000000005","role":"authenticated","aal":"aal1"}', true);
set local role authenticated;
do $$
begin
  begin
    insert into public.drivers (organization_id, name)
    values ((select id from test_driver_organizations where label = 'a'), 'Member write in organization A');
    raise exception 'multi-organization member created a driver in organization A';
  exception when sqlstate '42501' then
    null;
  end;
end;
$$;
insert into public.drivers (id, organization_id, name)
values ('6a000000-0000-0000-0000-000000000004', (select id from test_driver_organizations where label = 'b'), 'Admin write in organization B');
update public.drivers set status = 'inactive'
where id = '6a000000-0000-0000-0000-000000000004';
select pg_temp.assert_true(
  (select status = 'inactive' from public.drivers where id = '6a000000-0000-0000-0000-000000000004'),
  'multi-organization admin must manage drivers only in the authorized organization'
);
do $$
declare
  affected integer;
begin
  update public.drivers set status = 'active'
  where id = '6a000000-0000-0000-0000-000000000001';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'multi-organization member changed status in organization A'; end if;
end;
$$;
reset role;

do $$
begin
  begin
    update public.drivers
    set organization_id = (select id from test_driver_organizations where label = 'b')
    where id = '6a000000-0000-0000-0000-000000000001';
    raise exception 'driver organization mutation was accepted';
  exception when sqlstate '42501' then
    null;
  end;
end;
$$;

insert into auth.mfa_factors (id, user_id, factor_type, status, created_at, updated_at)
values ('6f000000-0000-0000-0000-000000000001', '61000000-0000-0000-0000-000000000001', 'totp', 'verified', now(), now());

select set_config('request.jwt.claims', '{"sub":"61000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1"}', true);
set local role authenticated;
select pg_temp.assert_true((select count(*) = 0 from public.drivers), 'verified MFA user at aal1 must be blocked from drivers');
do $$
begin
  begin
    insert into public.drivers (organization_id, name)
    values ((select id from test_driver_organizations where label = 'a'), 'AAL1 write');
    raise exception 'verified MFA user at aal1 created a driver';
  exception when sqlstate '42501' then
    null;
  end;
end;
$$;
reset role;

select set_config('request.jwt.claims', '{"sub":"61000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal2"}', true);
set local role authenticated;
select pg_temp.assert_true((select count(*) = 3 from public.drivers), 'verified MFA user at aal2 must retain driver access');
reset role;

select pg_temp.assert_true(not has_table_privilege('anon', 'public.drivers', 'select'), 'anonymous driver reads must be blocked');
select pg_temp.assert_true(not has_table_privilege('anon', 'public.drivers', 'insert'), 'anonymous driver writes must be blocked');
select pg_temp.assert_true(has_table_privilege('authenticated', 'public.drivers', 'select'), 'authenticated driver reads require a table grant');
select pg_temp.assert_true(has_table_privilege('authenticated', 'public.drivers', 'insert'), 'authenticated driver creates require a table grant');
select pg_temp.assert_true(has_table_privilege('authenticated', 'public.drivers', 'update'), 'authenticated driver updates require a table grant');
select pg_temp.assert_true(not has_table_privilege('authenticated', 'public.drivers', 'delete'), 'driver deletion must remain unavailable');
select pg_temp.assert_true(not has_function_privilege('anon', 'public.set_drivers_updated_at()', 'execute'), 'driver trigger helper must not be anonymous');
select pg_temp.assert_true(not has_function_privilege('authenticated', 'public.protect_drivers_organization()', 'execute'), 'driver organization guard must not be client-executable');
select pg_temp.assert_true(not has_function_privilege('anon', 'private.can_manage_drivers(uuid)', 'execute'), 'driver authorization helper must not be anonymous');
select pg_temp.assert_true(has_function_privilege('authenticated', 'private.can_manage_drivers(uuid)', 'execute'), 'driver policies require authenticated helper execution');

rollback;
