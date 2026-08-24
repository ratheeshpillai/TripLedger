begin;

create or replace function pg_temp.assert_true(condition boolean, message text)
returns void language plpgsql as $$
begin
  if not coalesce(condition, false) then
    raise exception 'workspace business type test failed: %', message;
  end if;
end;
$$;

insert into auth.users (id, email, aud, role, raw_user_meta_data, created_at, updated_at)
values
  ('71000000-0000-0000-0000-000000000001', 'individual-workspace@example.test', 'authenticated', 'authenticated', '{"business_type":"individual_driver"}', now(), now()),
  ('72000000-0000-0000-0000-000000000002', 'vendor-workspace@example.test', 'authenticated', 'authenticated', '{"business_type":"vendor"}', now(), now()),
  ('73000000-0000-0000-0000-000000000003', 'invalid-workspace@example.test', 'authenticated', 'authenticated', '{"business_type":"admin","role":"owner"}', now(), now());

select pg_temp.assert_true(
  (
    select business_type = 'individual_driver'
    from public.organizations
    where id = private.default_organization_id('71000000-0000-0000-0000-000000000001')
  ),
  'Individual Driver signup must create an individual_driver workspace'
);

select pg_temp.assert_true(
  (
    select business_type = 'vendor'
    from public.organizations
    where id = private.default_organization_id('72000000-0000-0000-0000-000000000002')
  ),
  'Transport Business signup must create a vendor workspace'
);

select pg_temp.assert_true(
  (
    select business_type = 'individual_driver'
    from public.organizations
    where id = private.default_organization_id('73000000-0000-0000-0000-000000000003')
  ),
  'unsupported signup metadata must fall back to individual_driver'
);

select pg_temp.assert_true(
  (
    select count(*) = 3
    from public.organization_members
    where role = 'owner'
      and user_id in (
        '71000000-0000-0000-0000-000000000001',
        '72000000-0000-0000-0000-000000000002',
        '73000000-0000-0000-0000-000000000003'
      )
  ),
  'workspace creators must remain owners regardless of business-type metadata'
);

select pg_temp.assert_true(
  (
    select count(*) = 3
    from public.organizations
    where id in (
      private.default_organization_id('71000000-0000-0000-0000-000000000001'),
      private.default_organization_id('72000000-0000-0000-0000-000000000002'),
      private.default_organization_id('73000000-0000-0000-0000-000000000003')
    )
  ),
  'signup must create exactly one deterministic workspace per user'
);

do $$
begin
  begin
    execute $sql$
      insert into public.organizations (name, business_type)
      values ('Invalid workspace', 'fleet_owner')
    $sql$;
    raise exception 'invalid organization business type was accepted';
  exception when invalid_text_representation then
    null;
  end;
end;
$$;

rollback;
