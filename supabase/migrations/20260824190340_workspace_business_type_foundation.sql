begin;

create type public.organization_business_type as enum ('individual_driver', 'vendor');

alter table public.organizations
  add column business_type public.organization_business_type not null default 'individual_driver';

create or replace function private.ensure_default_organization(p_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_organization_id uuid := private.default_organization_id(p_user_id);
  v_business_type public.organization_business_type;
begin
  select case u.raw_user_meta_data ->> 'business_type'
    when 'vendor' then 'vendor'::public.organization_business_type
    else 'individual_driver'::public.organization_business_type
  end
  into v_business_type
  from auth.users u
  where u.id = p_user_id;

  if v_business_type is null then
    raise exception 'Cannot create a default organization for an unknown user.';
  end if;

  insert into public.organizations (id, name, business_type)
  values (v_organization_id, 'My Organization', v_business_type)
  on conflict (id) do nothing;

  insert into public.organization_members (organization_id, user_id, role)
  values (v_organization_id, p_user_id, 'owner')
  on conflict (organization_id, user_id) do nothing;

  return v_organization_id;
end;
$$;

create or replace function private.can_manage_drivers(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1
      from public.organization_members om
      join public.organizations o on o.id = om.organization_id
      where om.organization_id = p_organization_id
        and om.user_id = (select auth.uid())
        and om.role in ('owner', 'admin')
        and o.business_type = 'vendor'
    );
$$;

revoke all on function private.ensure_default_organization(uuid) from public, anon, authenticated, service_role;
revoke all on function private.can_manage_drivers(uuid) from public, anon, authenticated, service_role;
grant execute on function private.can_manage_drivers(uuid) to authenticated;

comment on column public.organizations.business_type is
  'Classifies the workspace business model independently from organization membership authority.';

commit;
