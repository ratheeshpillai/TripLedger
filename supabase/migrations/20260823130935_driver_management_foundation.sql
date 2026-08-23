begin;

create table public.drivers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  phone text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint drivers_name_not_blank_chk check (length(btrim(name)) > 0),
  constraint drivers_text_lengths_chk check (
    length(name) <= 120
    and (phone is null or length(phone) <= 32)
  ),
  constraint drivers_text_no_nul_chk check (
    encode(convert_to(coalesce(name, ''), 'UTF8'), 'hex') not like '%00%'
    and encode(convert_to(coalesce(phone, ''), 'UTF8'), 'hex') not like '%00%'
  ),
  constraint drivers_status_chk check (status in ('active', 'inactive'))
);

create index drivers_organization_status_name_idx
  on public.drivers (organization_id, status, lower(name), id);

create unique index drivers_organization_user_id_uidx
  on public.drivers (organization_id, user_id)
  where user_id is not null;

create function public.set_drivers_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create function public.protect_drivers_organization()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.organization_id is distinct from old.organization_id then
    raise exception 'Driver organization cannot be changed.' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger set_drivers_updated_at
before update on public.drivers
for each row execute function public.set_drivers_updated_at();

create trigger protect_drivers_organization
before update on public.drivers
for each row execute function public.protect_drivers_organization();

alter table public.drivers enable row level security;

create policy "Members can select organization drivers"
on public.drivers for select
to authenticated
using (
  (select private.is_organization_member(organization_id))
  and public.is_mfa_requirement_satisfied()
);

create policy "Owners and admins can insert organization drivers"
on public.drivers for insert
to authenticated
with check (
  (select private.can_write_organization_data(organization_id))
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

create policy "Owners and admins can update organization drivers"
on public.drivers for update
to authenticated
using (
  (select private.can_write_organization_data(organization_id))
  and public.is_mfa_requirement_satisfied()
)
with check (
  (select private.can_write_organization_data(organization_id))
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

revoke all on table public.drivers from public, anon, authenticated;
grant select, insert, update on table public.drivers to authenticated;

revoke all on function public.set_drivers_updated_at() from public, anon, authenticated;
revoke all on function public.protect_drivers_organization() from public, anon, authenticated;

comment on table public.drivers is 'Organization-owned driver identities; login linkage is optional and separate from organization authorization.';
comment on column public.drivers.user_id is 'Optional future link to an authenticated user. A user may have one driver identity per organization.';

commit;
