begin;

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
      where om.organization_id = p_organization_id
        and om.user_id = (select auth.uid())
        and om.role in ('owner', 'admin')
    );
$$;

revoke all on function private.can_manage_drivers(uuid) from public, anon, authenticated, service_role;
grant execute on function private.can_manage_drivers(uuid) to authenticated;

drop policy if exists "Owners and admins can insert organization drivers" on public.drivers;
create policy "Owners and admins can insert organization drivers"
on public.drivers for insert
to authenticated
with check (
  (select private.can_manage_drivers(organization_id))
  and public.is_mfa_requirement_satisfied()
  and (
    user_id is null
    or exists (
      select 1
      from public.organization_members om
      where om.organization_id = drivers.organization_id
        and om.user_id = drivers.user_id
    )
  )
);

drop policy if exists "Owners and admins can update organization drivers" on public.drivers;
create policy "Owners and admins can update organization drivers"
on public.drivers for update
to authenticated
using (
  (select private.can_manage_drivers(organization_id))
  and public.is_mfa_requirement_satisfied()
)
with check (
  (select private.can_manage_drivers(organization_id))
  and public.is_mfa_requirement_satisfied()
  and (
    user_id is null
    or exists (
      select 1
      from public.organization_members om
      where om.organization_id = drivers.organization_id
        and om.user_id = drivers.user_id
    )
  )
);

commit;
