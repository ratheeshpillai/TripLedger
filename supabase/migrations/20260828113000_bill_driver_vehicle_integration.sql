begin;

create function public.validate_bill_driver_vehicle()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_business_type text;
  v_driver public.drivers;
  v_vehicle public.vehicles;
  v_references_changed boolean := tg_op = 'INSERT';
begin
  select o.business_type
  into v_business_type
  from public.organizations o
  where o.id = new.organization_id;

  if v_business_type is distinct from 'vendor' then
    return new;
  end if;

  if tg_op = 'UPDATE' then
    v_references_changed := new.driver_id is distinct from old.driver_id
      or new.vehicle_id is distinct from old.vehicle_id
      or new.organization_id is distinct from old.organization_id;

    if not v_references_changed then
      new.driver_name = old.driver_name;
      new.vehicle_name = old.vehicle_name;
      new.vehicle_number = old.vehicle_number;
      return new;
    end if;
  end if;

  if nullif(new.driver_id, '') is null or nullif(new.vehicle_id, '') is null then
    raise exception 'Select an assigned driver and vehicle for this bill.' using errcode = '22023';
  end if;

  select d.*
  into v_driver
  from public.drivers d
  where d.id::text = new.driver_id
    and d.organization_id = new.organization_id;

  if v_driver.id is null then
    raise exception 'The selected driver does not belong to this Fleet Owner workspace.' using errcode = '22023';
  end if;
  if v_driver.status <> 'active' then
    raise exception 'The selected driver is inactive.' using errcode = '22023';
  end if;

  select v.*
  into v_vehicle
  from public.vehicles v
  where v.id::text = new.vehicle_id
    and v.organization_id = new.organization_id
  for share;

  if v_vehicle.id is null then
    raise exception 'The selected vehicle does not belong to this Fleet Owner workspace.' using errcode = '22023';
  end if;
  if v_vehicle.status <> 'active' then
    raise exception 'The selected vehicle is inactive.' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.driver_vehicle_assignments a
    where a.organization_id = new.organization_id
      and a.driver_id = v_driver.id
      and a.vehicle_id = v_vehicle.id
      and a.status = 'active'
  ) then
    raise exception 'The driver and vehicle assignment changed. Refresh and select the current assignment.' using errcode = '40001';
  end if;

  new.driver_name = v_driver.name;
  new.vehicle_name = coalesce(nullif(v_vehicle.display_name, ''), nullif(v_vehicle.make_model, ''), 'Vehicle');
  new.vehicle_number = v_vehicle.registration_number;
  return new;
end;
$$;

create trigger validate_bill_driver_vehicle
before insert or update on public.bills
for each row execute function public.validate_bill_driver_vehicle();

revoke all on function public.validate_bill_driver_vehicle() from public, anon, authenticated;

comment on function public.validate_bill_driver_vehicle() is
  'Validates current Fleet Owner driver/vehicle assignments for new references and preserves historical bill snapshots.';

commit;
