begin;

create unique index drivers_id_organization_uidx
  on public.drivers (id, organization_id);

create unique index vehicles_id_organization_uidx
  on public.vehicles (id, organization_id);

create table public.driver_vehicle_assignments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  driver_id uuid not null,
  vehicle_id uuid not null,
  status text not null default 'active',
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint driver_vehicle_assignments_driver_fk
    foreign key (driver_id, organization_id)
    references public.drivers (id, organization_id),
  constraint driver_vehicle_assignments_vehicle_fk
    foreign key (vehicle_id, organization_id)
    references public.vehicles (id, organization_id),
  constraint driver_vehicle_assignments_status_chk
    check (status in ('active', 'inactive')),
  constraint driver_vehicle_assignments_ended_at_chk
    check (
      (status = 'active' and ended_at is null)
      or (status = 'inactive' and ended_at is not null)
    )
);

create unique index driver_vehicle_assignments_one_active_vehicle_uidx
  on public.driver_vehicle_assignments (vehicle_id)
  where status = 'active';

create index driver_vehicle_assignments_organization_history_idx
  on public.driver_vehicle_assignments (organization_id, vehicle_id, created_at desc, id);

create index driver_vehicle_assignments_driver_history_idx
  on public.driver_vehicle_assignments (organization_id, driver_id, created_at desc, id);

create function public.set_driver_vehicle_assignments_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create function public.protect_driver_vehicle_assignment_history()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.organization_id is distinct from old.organization_id
    or new.driver_id is distinct from old.driver_id
    or new.vehicle_id is distinct from old.vehicle_id then
    raise exception 'Assignment identity cannot be changed.' using errcode = '42501';
  end if;

  if old.status = 'inactive' and new.status is distinct from old.status then
    raise exception 'Inactive assignments cannot be reactivated.' using errcode = '22023';
  end if;

  if old.status = 'active' and new.status = 'inactive' then
    new.ended_at = coalesce(new.ended_at, now());
  elsif new.ended_at is distinct from old.ended_at then
    raise exception 'Assignment end time cannot be changed.' using errcode = '42501';
  end if;

  return new;
end;
$$;

create function public.validate_active_driver_vehicle_assignment()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'active' then
    if not exists (
      select 1
      from public.drivers d
      where d.id = new.driver_id
        and d.organization_id = new.organization_id
        and d.status = 'active'
    ) then
      raise exception 'Driver must be active in this Fleet Owner workspace.' using errcode = '22023';
    end if;

    if not exists (
      select 1
      from public.vehicles v
      where v.id = new.vehicle_id
        and v.organization_id = new.organization_id
        and v.status = 'active'
    ) then
      raise exception 'Vehicle must be active in this Fleet Owner workspace.' using errcode = '22023';
    end if;
  end if;

  return new;
end;
$$;

create trigger protect_driver_vehicle_assignment_history
before update on public.driver_vehicle_assignments
for each row execute function public.protect_driver_vehicle_assignment_history();

create trigger validate_active_driver_vehicle_assignment
before insert or update on public.driver_vehicle_assignments
for each row execute function public.validate_active_driver_vehicle_assignment();

create trigger set_driver_vehicle_assignments_updated_at
before update on public.driver_vehicle_assignments
for each row execute function public.set_driver_vehicle_assignments_updated_at();

alter table public.driver_vehicle_assignments enable row level security;

create policy "Members can select organization driver vehicle assignments"
on public.driver_vehicle_assignments for select
to authenticated
using (
  (select private.is_organization_member(organization_id))
  and public.is_mfa_requirement_satisfied()
);

create function public.assign_driver_to_vehicle(
  p_organization_id uuid,
  p_vehicle_id uuid,
  p_driver_id uuid
)
returns public.driver_vehicle_assignments
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_current public.driver_vehicle_assignments;
  v_assignment public.driver_vehicle_assignments;
begin
  if (select auth.uid()) is null
    or not private.can_manage_vehicles(p_organization_id) then
    raise exception 'You do not have permission to manage vehicle assignments.' using errcode = '42501';
  end if;

  if not public.is_mfa_requirement_satisfied() then
    raise exception 'Additional verification is required.' using errcode = '42501';
  end if;

  perform 1
  from public.vehicles v
  where v.id = p_vehicle_id
    and v.organization_id = p_organization_id
    and v.status = 'active'
  for update;
  if not found then
    raise exception 'Vehicle must be active in this Fleet Owner workspace.' using errcode = '22023';
  end if;

  perform 1
  from public.drivers d
  where d.id = p_driver_id
    and d.organization_id = p_organization_id
    and d.status = 'active';
  if not found then
    raise exception 'Driver must be active in this Fleet Owner workspace.' using errcode = '22023';
  end if;

  select a.*
  into v_current
  from public.driver_vehicle_assignments a
  where a.vehicle_id = p_vehicle_id
    and a.status = 'active'
  for update;

  if v_current.driver_id = p_driver_id then
    return v_current;
  end if;

  if v_current.id is not null then
    update public.driver_vehicle_assignments
    set status = 'inactive', ended_at = now()
    where id = v_current.id;
  end if;

  insert into public.driver_vehicle_assignments (
    organization_id,
    driver_id,
    vehicle_id
  )
  values (
    p_organization_id,
    p_driver_id,
    p_vehicle_id
  )
  returning * into v_assignment;

  return v_assignment;
end;
$$;

create function public.end_driver_vehicle_assignment(
  p_organization_id uuid,
  p_vehicle_id uuid
)
returns public.driver_vehicle_assignments
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_assignment public.driver_vehicle_assignments;
begin
  if (select auth.uid()) is null
    or not private.can_manage_vehicles(p_organization_id) then
    raise exception 'You do not have permission to manage vehicle assignments.' using errcode = '42501';
  end if;

  if not public.is_mfa_requirement_satisfied() then
    raise exception 'Additional verification is required.' using errcode = '42501';
  end if;

  perform 1
  from public.vehicles v
  where v.id = p_vehicle_id
    and v.organization_id = p_organization_id
  for update;
  if not found then
    raise exception 'Vehicle does not belong to this Fleet Owner workspace.' using errcode = '22023';
  end if;

  update public.driver_vehicle_assignments
  set status = 'inactive', ended_at = now()
  where vehicle_id = p_vehicle_id
    and organization_id = p_organization_id
    and status = 'active'
  returning * into v_assignment;

  if v_assignment.id is null then
    raise exception 'This vehicle assignment has already changed. Refresh and try again.' using errcode = '40001';
  end if;

  return v_assignment;
end;
$$;

revoke all on table public.driver_vehicle_assignments from public, anon, authenticated;
grant select on table public.driver_vehicle_assignments to authenticated;

revoke all on function public.set_driver_vehicle_assignments_updated_at() from public, anon, authenticated;
revoke all on function public.protect_driver_vehicle_assignment_history() from public, anon, authenticated;
revoke all on function public.validate_active_driver_vehicle_assignment() from public, anon, authenticated;
revoke all on function public.assign_driver_to_vehicle(uuid, uuid, uuid) from public, anon, authenticated, service_role;
revoke all on function public.end_driver_vehicle_assignment(uuid, uuid) from public, anon, authenticated, service_role;
grant execute on function public.assign_driver_to_vehicle(uuid, uuid, uuid) to authenticated;
grant execute on function public.end_driver_vehicle_assignment(uuid, uuid) to authenticated;

comment on table public.driver_vehicle_assignments is
  'Organization-scoped driver and vehicle assignment history. Billing integration is intentionally deferred.';
comment on function public.assign_driver_to_vehicle(uuid, uuid, uuid) is
  'Atomically ends a vehicle current assignment and creates its replacement.';

commit;
