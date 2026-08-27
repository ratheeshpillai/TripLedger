begin;

create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  registration_number text not null,
  registration_number_normalized text generated always as (
    upper(regexp_replace(registration_number, '[^A-Za-z0-9]', '', 'g'))
  ) stored,
  display_name text,
  make_model text,
  year smallint,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vehicles_registration_not_blank_chk check (
    length(registration_number_normalized) between 2 and 20
  ),
  constraint vehicles_text_lengths_chk check (
    length(registration_number) <= 32
    and (display_name is null or length(display_name) <= 120)
    and (make_model is null or length(make_model) <= 120)
  ),
  constraint vehicles_text_no_nul_chk check (
    encode(convert_to(coalesce(registration_number, ''), 'UTF8'), 'hex') not like '%00%'
    and encode(convert_to(coalesce(display_name, ''), 'UTF8'), 'hex') not like '%00%'
    and encode(convert_to(coalesce(make_model, ''), 'UTF8'), 'hex') not like '%00%'
  ),
  constraint vehicles_year_chk check (year is null or year between 1886 and 9999),
  constraint vehicles_status_chk check (status in ('active', 'inactive'))
);

create unique index vehicles_organization_registration_uidx
  on public.vehicles (organization_id, registration_number_normalized);

create index vehicles_organization_status_name_idx
  on public.vehicles (
    organization_id,
    status,
    lower(coalesce(display_name, make_model, registration_number)),
    id
  );

create function public.set_vehicles_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create function public.protect_vehicles_organization()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.organization_id is distinct from old.organization_id then
    raise exception 'Vehicle organization cannot be changed.' using errcode = '42501';
  end if;
  return new;
end;
$$;

create function private.can_manage_vehicles(p_organization_id uuid)
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

create trigger set_vehicles_updated_at
before update on public.vehicles
for each row execute function public.set_vehicles_updated_at();

create trigger protect_vehicles_organization
before update on public.vehicles
for each row execute function public.protect_vehicles_organization();

alter table public.vehicles enable row level security;

create policy "Members can select organization vehicles"
on public.vehicles for select
to authenticated
using (
  (select private.is_organization_member(organization_id))
  and public.is_mfa_requirement_satisfied()
);

create policy "Fleet owners and admins can insert organization vehicles"
on public.vehicles for insert
to authenticated
with check (
  (select private.can_manage_vehicles(organization_id))
  and public.is_mfa_requirement_satisfied()
);

create policy "Fleet owners and admins can update organization vehicles"
on public.vehicles for update
to authenticated
using (
  (select private.can_manage_vehicles(organization_id))
  and public.is_mfa_requirement_satisfied()
)
with check (
  (select private.can_manage_vehicles(organization_id))
  and public.is_mfa_requirement_satisfied()
);

revoke all on table public.vehicles from public, anon, authenticated;
grant select, insert, update on table public.vehicles to authenticated;

revoke all on function public.set_vehicles_updated_at() from public, anon, authenticated;
revoke all on function public.protect_vehicles_organization() from public, anon, authenticated;
revoke all on function private.can_manage_vehicles(uuid) from public, anon, authenticated, service_role;
grant execute on function private.can_manage_vehicles(uuid) to authenticated;

comment on table public.vehicles is
  'Organization-owned fleet vehicles; bill and driver assignment integration is intentionally deferred.';
comment on column public.vehicles.registration_number_normalized is
  'Uppercase alphanumeric registration used for organization-scoped uniqueness.';

commit;
