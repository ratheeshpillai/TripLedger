begin;

create or replace function pg_temp.assert_true(condition boolean, message text)
returns void language plpgsql as $$
begin
  if not coalesce(condition, false) then
    raise exception 'driver invitation test failed: %', message;
  end if;
end;
$$;
grant execute on function pg_temp.assert_true(boolean, text) to authenticated;

create temporary table test_invitation_organizations (label text primary key, id uuid not null);
create temporary table test_invitation_tokens (label text primary key, token text not null, invitation_id uuid not null);
grant select on table test_invitation_organizations to authenticated;
grant select, insert on table test_invitation_tokens to authenticated;

insert into auth.users (id, email, email_confirmed_at, aud, role, created_at, updated_at)
values
  ('91000000-0000-0000-0000-000000000001', 'fleet-owner@example.test', now(), 'authenticated', 'authenticated', now(), now()),
  ('91000000-0000-0000-0000-000000000002', 'fleet-admin@example.test', now(), 'authenticated', 'authenticated', now(), now()),
  ('91000000-0000-0000-0000-000000000003', 'fleet-member@example.test', now(), 'authenticated', 'authenticated', now(), now()),
  ('91000000-0000-0000-0000-000000000004', 'other-owner@example.test', now(), 'authenticated', 'authenticated', now(), now()),
  ('91000000-0000-0000-0000-000000000005', 'invited-driver@example.test', now(), 'authenticated', 'authenticated', now(), now()),
  ('91000000-0000-0000-0000-000000000006', 'second-driver@example.test', now(), 'authenticated', 'authenticated', now(), now()),
  ('91000000-0000-0000-0000-000000000007', 'wrong-driver@example.test', now(), 'authenticated', 'authenticated', now(), now()),
  ('91000000-0000-0000-0000-000000000008', 'individual-owner@example.test', now(), 'authenticated', 'authenticated', now(), now()),
  ('91000000-0000-0000-0000-000000000009', 'unverified-driver@example.test', null, 'authenticated', 'authenticated', now(), now());

insert into test_invitation_organizations (label, id)
values
  ('fleet', private.default_organization_id('91000000-0000-0000-0000-000000000001')),
  ('other', private.default_organization_id('91000000-0000-0000-0000-000000000004')),
  ('individual', private.default_organization_id('91000000-0000-0000-0000-000000000008'));

update public.organizations
set business_type = 'vendor', name = case when id = (select id from test_invitation_organizations where label = 'fleet') then 'Test Fleet' else 'Other Fleet' end
where id in (select id from test_invitation_organizations where label in ('fleet', 'other'));

insert into public.organization_members (organization_id, user_id, role)
values
  ((select id from test_invitation_organizations where label = 'fleet'), '91000000-0000-0000-0000-000000000002', 'admin'),
  ((select id from test_invitation_organizations where label = 'fleet'), '91000000-0000-0000-0000-000000000003', 'member');

insert into public.drivers (id, organization_id, name)
values
  ('92000000-0000-0000-0000-000000000001', (select id from test_invitation_organizations where label = 'fleet'), 'Owner Invite Driver'),
  ('92000000-0000-0000-0000-000000000002', (select id from test_invitation_organizations where label = 'fleet'), 'Admin Invite Driver'),
  ('92000000-0000-0000-0000-000000000003', (select id from test_invitation_organizations where label = 'fleet'), 'Expired Invite Driver'),
  ('92000000-0000-0000-0000-000000000004', (select id from test_invitation_organizations where label = 'fleet'), 'Duplicate Identity Driver'),
  ('92000000-0000-0000-0000-000000000005', (select id from test_invitation_organizations where label = 'fleet'), 'MFA Invite Driver'),
  ('92000000-0000-0000-0000-000000000006', (select id from test_invitation_organizations where label = 'fleet'), 'Unverified Invite Driver'),
  ('92000000-0000-0000-0000-000000000007', (select id from test_invitation_organizations where label = 'other'), 'Other Fleet Driver'),
  ('92000000-0000-0000-0000-000000000008', (select id from test_invitation_organizations where label = 'individual'), 'Individual Workspace Driver');

select set_config('request.jwt.claims', '{"sub":"91000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1"}', true);
set local role authenticated;
insert into test_invitation_tokens (label, token, invitation_id)
select 'owner', invitation_token, invitation_id
from public.create_driver_invitation(
  (select id from test_invitation_organizations where label = 'fleet'),
  '92000000-0000-0000-0000-000000000001',
  'Invited-Driver@Example.Test'
);
select pg_temp.assert_true(
  (select invited_email = 'invited-driver@example.test' and octet_length(token_hash) = 32 from public.driver_invitations where id = (select invitation_id from test_invitation_tokens where label = 'owner')),
  'owner invitation must normalize email and store only a SHA-256 token hash'
);
do $$
begin
  begin
    perform public.create_driver_invitation(
      (select id from test_invitation_organizations where label = 'fleet'),
      '92000000-0000-0000-0000-000000000001',
      'invited-driver@example.test'
    );
    raise exception 'duplicate pending invitation was created';
  exception when unique_violation then null;
  end;
end;
$$;
do $$
begin
  begin
    perform public.create_driver_invitation(
      (select id from test_invitation_organizations where label = 'fleet'),
      '92000000-0000-0000-0000-000000000007',
      'second-driver@example.test'
    );
    raise exception 'cross-organization driver was invited';
  exception when sqlstate '22023' then null;
  end;
end;
$$;
reset role;

select set_config('request.jwt.claims', '{"sub":"91000000-0000-0000-0000-000000000002","role":"authenticated","aal":"aal1"}', true);
set local role authenticated;
insert into test_invitation_tokens (label, token, invitation_id)
select 'cancelled', invitation_token, invitation_id
from public.create_driver_invitation(
  (select id from test_invitation_organizations where label = 'fleet'),
  '92000000-0000-0000-0000-000000000002',
  'second-driver@example.test'
);
select public.cancel_driver_invitation(
  (select id from test_invitation_organizations where label = 'fleet'),
  (select invitation_id from test_invitation_tokens where label = 'cancelled')
);
select pg_temp.assert_true(
  (select status = 'cancelled' and cancelled_at is not null from public.driver_invitations where id = (select invitation_id from test_invitation_tokens where label = 'cancelled')),
  'admin must create and cancel a pending invitation'
);
reset role;

select set_config('request.jwt.claims', '{"sub":"91000000-0000-0000-0000-000000000003","role":"authenticated","aal":"aal1"}', true);
set local role authenticated;
select pg_temp.assert_true((select count(*) = 0 from public.driver_invitations), 'member must not list Fleet Owner invitations');
do $$
begin
  begin
    perform public.create_driver_invitation(
      (select id from test_invitation_organizations where label = 'fleet'),
      '92000000-0000-0000-0000-000000000003',
      'second-driver@example.test'
    );
    raise exception 'member created an invitation';
  exception when sqlstate '42501' then null;
  end;
end;
$$;
reset role;

select set_config('request.jwt.claims', '{"sub":"91000000-0000-0000-0000-000000000008","role":"authenticated","aal":"aal1"}', true);
set local role authenticated;
do $$
begin
  begin
    perform public.create_driver_invitation(
      (select id from test_invitation_organizations where label = 'individual'),
      '92000000-0000-0000-0000-000000000008',
      'second-driver@example.test'
    );
    raise exception 'Individual Driver workspace created an invitation';
  exception when sqlstate '42501' then null;
  end;
end;
$$;
reset role;

select set_config('request.jwt.claims', '{"sub":"91000000-0000-0000-0000-000000000007","role":"authenticated","aal":"aal1"}', true);
set local role authenticated;
do $$
begin
  begin
    perform public.accept_driver_invitation((select token from test_invitation_tokens where label = 'owner'));
    raise exception 'mismatched email accepted an invitation';
  exception when sqlstate '42501' then null;
  end;
end;
$$;
reset role;
select pg_temp.assert_true(
  (select user_id is null from public.drivers where id = '92000000-0000-0000-0000-000000000001')
  and (select status = 'pending' from public.driver_invitations where id = (select invitation_id from test_invitation_tokens where label = 'owner')),
  'failed acceptance must leave both driver and invitation unchanged'
);

select set_config('request.jwt.claims', '{"sub":"91000000-0000-0000-0000-000000000005","role":"authenticated","aal":"aal1"}', true);
set local role authenticated;
select public.accept_driver_invitation((select token from test_invitation_tokens where label = 'owner'));
reset role;
select pg_temp.assert_true(
  (select user_id = '91000000-0000-0000-0000-000000000005' from public.drivers where id = '92000000-0000-0000-0000-000000000001')
  and (select status = 'accepted' and accepted_by = '91000000-0000-0000-0000-000000000005' and accepted_at is not null from public.driver_invitations where id = (select invitation_id from test_invitation_tokens where label = 'owner'))
  and exists (select 1 from public.organization_members where organization_id = (select id from test_invitation_organizations where label = 'fleet') and user_id = '91000000-0000-0000-0000-000000000005' and role = 'member'),
  'acceptance must atomically add membership, link the existing driver and accept the invitation'
);

select set_config('request.jwt.claims', '{"sub":"91000000-0000-0000-0000-000000000005","role":"authenticated","aal":"aal1"}', true);
set local role authenticated;
do $$
begin
  begin
    perform public.accept_driver_invitation((select token from test_invitation_tokens where label = 'owner'));
    raise exception 'accepted invitation replay succeeded';
  exception when sqlstate 'P0001' then null;
  end;
end;
$$;
reset role;

select set_config('request.jwt.claims', '{"sub":"91000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1"}', true);
set local role authenticated;
do $$
begin
  begin
    perform public.create_driver_invitation(
      (select id from test_invitation_organizations where label = 'fleet'),
      '92000000-0000-0000-0000-000000000001',
      'invited-driver@example.test'
    );
    raise exception 'linked driver was reinvited';
  exception when unique_violation then null;
  end;
end;
$$;
insert into test_invitation_tokens (label, token, invitation_id)
select 'duplicate-user', invitation_token, invitation_id
from public.create_driver_invitation(
  (select id from test_invitation_organizations where label = 'fleet'),
  '92000000-0000-0000-0000-000000000004',
  'invited-driver@example.test'
);
insert into test_invitation_tokens (label, token, invitation_id)
select 'expired', invitation_token, invitation_id
from public.create_driver_invitation(
  (select id from test_invitation_organizations where label = 'fleet'),
  '92000000-0000-0000-0000-000000000003',
  'second-driver@example.test'
);
insert into test_invitation_tokens (label, token, invitation_id)
select 'unverified', invitation_token, invitation_id
from public.create_driver_invitation(
  (select id from test_invitation_organizations where label = 'fleet'),
  '92000000-0000-0000-0000-000000000006',
  'unverified-driver@example.test'
);
reset role;

update public.driver_invitations set expires_at = now() - interval '1 minute'
where id = (select invitation_id from test_invitation_tokens where label = 'expired');

select set_config('request.jwt.claims', '{"sub":"91000000-0000-0000-0000-000000000006","role":"authenticated","aal":"aal1"}', true);
set local role authenticated;
do $$
begin
  begin
    perform public.accept_driver_invitation((select token from test_invitation_tokens where label = 'expired'));
    raise exception 'expired invitation was accepted';
  exception when sqlstate 'P0001' then null;
  end;
  begin
    perform public.accept_driver_invitation((select token from test_invitation_tokens where label = 'cancelled'));
    raise exception 'cancelled invitation was accepted';
  exception when sqlstate 'P0001' then null;
  end;
end;
$$;
reset role;

select set_config('request.jwt.claims', '{"sub":"91000000-0000-0000-0000-000000000005","role":"authenticated","aal":"aal1"}', true);
set local role authenticated;
do $$
begin
  begin
    perform public.accept_driver_invitation((select token from test_invitation_tokens where label = 'duplicate-user'));
    raise exception 'one user linked to two driver identities in one organization';
  exception when unique_violation then null;
  end;
end;
$$;
reset role;

select set_config('request.jwt.claims', '{"sub":"91000000-0000-0000-0000-000000000009","role":"authenticated","aal":"aal1"}', true);
set local role authenticated;
do $$
begin
  begin
    perform public.accept_driver_invitation((select token from test_invitation_tokens where label = 'unverified'));
    raise exception 'unverified email accepted an invitation';
  exception when sqlstate '42501' then null;
  end;
end;
$$;
reset role;

insert into auth.mfa_factors (id, user_id, factor_type, status, created_at, updated_at)
values ('93000000-0000-0000-0000-000000000001', '91000000-0000-0000-0000-000000000001', 'totp', 'verified', now(), now());

select set_config('request.jwt.claims', '{"sub":"91000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1"}', true);
set local role authenticated;
do $$
begin
  begin
    perform public.create_driver_invitation(
      (select id from test_invitation_organizations where label = 'fleet'),
      '92000000-0000-0000-0000-000000000005',
      'second-driver@example.test'
    );
    raise exception 'AAL1 manager with verified MFA created an invitation';
  exception when sqlstate '42501' then null;
  end;
end;
$$;
reset role;

select set_config('request.jwt.claims', '{"sub":"91000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal2"}', true);
set local role authenticated;
insert into test_invitation_tokens (label, token, invitation_id)
select 'mfa', invitation_token, invitation_id
from public.create_driver_invitation(
  (select id from test_invitation_organizations where label = 'fleet'),
  '92000000-0000-0000-0000-000000000005',
  'second-driver@example.test'
);
reset role;

do $$
begin
  begin
    insert into public.driver_invitations (organization_id, driver_id, invited_email, token_hash, invited_by)
    values (
      (select id from test_invitation_organizations where label = 'fleet'),
      '92000000-0000-0000-0000-000000000007',
      'second-driver@example.test',
      extensions.digest(convert_to('cross-organization-token', 'UTF8'), 'sha256'),
      '91000000-0000-0000-0000-000000000001'
    );
    raise exception 'cross-organization invitation row passed the database constraint';
  exception when foreign_key_violation then null;
  end;
end;
$$;

select pg_temp.assert_true(not has_table_privilege('anon', 'public.driver_invitations', 'select'), 'anonymous invitation reads must be blocked');
select pg_temp.assert_true(not has_table_privilege('authenticated', 'public.driver_invitations', 'insert'), 'direct invitation inserts must be unavailable');
select pg_temp.assert_true(not has_table_privilege('authenticated', 'public.driver_invitations', 'update'), 'direct invitation updates must be unavailable');
select pg_temp.assert_true(not has_table_privilege('authenticated', 'public.driver_invitations', 'delete'), 'invitation deletion must be unavailable');
select pg_temp.assert_true(not has_column_privilege('authenticated', 'public.drivers', 'user_id', 'insert'), 'direct driver account linking on insert must be unavailable');
select pg_temp.assert_true(not has_column_privilege('authenticated', 'public.drivers', 'user_id', 'update'), 'direct driver account linking on update must be unavailable');
select pg_temp.assert_true(has_column_privilege('authenticated', 'public.drivers', 'name', 'insert'), 'normal driver creation must remain available');
select pg_temp.assert_true(has_column_privilege('authenticated', 'public.drivers', 'status', 'update'), 'normal driver lifecycle updates must remain available');
select pg_temp.assert_true(not has_function_privilege('anon', 'public.create_driver_invitation(uuid,uuid,text)', 'execute'), 'anonymous invitation creation must be blocked');
select pg_temp.assert_true(not has_function_privilege('anon', 'public.cancel_driver_invitation(uuid,uuid)', 'execute'), 'anonymous invitation cancellation must be blocked');
select pg_temp.assert_true(not has_function_privilege('anon', 'public.get_driver_invitation(text)', 'execute'), 'anonymous invitation lookup must be blocked');
select pg_temp.assert_true(not has_function_privilege('anon', 'public.accept_driver_invitation(text)', 'execute'), 'anonymous invitation acceptance must be blocked');
select pg_temp.assert_true(has_function_privilege('authenticated', 'public.accept_driver_invitation(text)', 'execute'), 'authenticated invitation acceptance must be explicitly granted');
select pg_temp.assert_true(not has_function_privilege('authenticated', 'public.set_driver_invitations_updated_at()', 'execute'), 'invitation trigger helper must not be client executable');

rollback;
