begin;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

do $$
begin
  if not exists (select 1 from pg_type where typnamespace = 'public'::regnamespace and typname = 'organization_role') then
    create type public.organization_role as enum ('owner', 'admin', 'member');
  end if;
end;
$$;

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organizations_name_not_blank_chk check (length(btrim(name)) > 0),
  constraint organizations_name_length_chk check (length(name) <= 160)
);

create table public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.organization_role not null default 'member',
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create index organization_members_user_id_idx
  on public.organization_members (user_id, organization_id);

create or replace function private.default_organization_id(p_user_id uuid)
returns uuid
language sql
immutable
strict
set search_path = ''
as $$
  with digest as (
    select overlay(
      overlay(md5('tripledger:default-organization:' || p_user_id::text) placing '5' from 13 for 1)
      placing '8' from 17 for 1
    ) as value
  )
  select (
    substr(value, 1, 8) || '-' || substr(value, 9, 4) || '-' || substr(value, 13, 4) || '-' ||
    substr(value, 17, 4) || '-' || substr(value, 21, 12)
  )::uuid
  from digest;
$$;

create or replace function private.ensure_default_organization(p_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_organization_id uuid := private.default_organization_id(p_user_id);
begin
  insert into public.organizations (id, name)
  values (v_organization_id, 'My Organization')
  on conflict (id) do nothing;

  insert into public.organization_members (organization_id, user_id, role)
  values (v_organization_id, p_user_id, 'owner')
  on conflict (organization_id, user_id) do nothing;

  return v_organization_id;
end;
$$;

create or replace function private.handle_new_auth_user_organization()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.ensure_default_organization(new.id);
  return new;
end;
$$;

drop trigger if exists initialize_tripledger_organization on auth.users;
create trigger initialize_tripledger_organization
after insert on auth.users
for each row execute function private.handle_new_auth_user_organization();

select private.ensure_default_organization(id)
from auth.users;

alter table public.bills add column organization_id uuid;
alter table public.billing_parties add column organization_id uuid;
alter table public.owner_payments add column organization_id uuid;

update public.bills
set organization_id = private.default_organization_id(user_id)
where organization_id is null;

update public.billing_parties
set organization_id = private.default_organization_id(user_id)
where organization_id is null;

update public.owner_payments
set organization_id = private.default_organization_id(user_id)
where organization_id is null;

do $$
begin
  if exists (
    select 1
    from public.bills b
    left join public.organization_members om
      on om.organization_id = b.organization_id and om.user_id = b.user_id
    where b.organization_id is null or om.user_id is null
  ) or exists (
    select 1
    from public.billing_parties bp
    left join public.organization_members om
      on om.organization_id = bp.organization_id and om.user_id = bp.user_id
    where bp.organization_id is null or om.user_id is null
  ) or exists (
    select 1
    from public.owner_payments op
    left join public.organization_members om
      on om.organization_id = op.organization_id and om.user_id = op.user_id
    where op.organization_id is null or om.user_id is null
  ) then
    raise exception 'Organization backfill left orphaned operational records.';
  end if;
end;
$$;

alter table public.bills
  alter column organization_id set not null,
  add constraint bills_organization_id_fkey
    foreign key (organization_id) references public.organizations(id);

alter table public.billing_parties
  alter column organization_id set not null,
  add constraint billing_parties_organization_id_fkey
    foreign key (organization_id) references public.organizations(id);

alter table public.owner_payments
  alter column organization_id set not null,
  add constraint owner_payments_organization_id_fkey
    foreign key (organization_id) references public.organizations(id);

create index bills_organization_created_at_idx
  on public.bills (organization_id, created_at desc);
create index bills_organization_trip_date_idx
  on public.bills (organization_id, trip_date desc);
create index billing_parties_organization_name_idx
  on public.billing_parties (organization_id, lower(name));
create index owner_payments_organization_payment_date_idx
  on public.owner_payments (organization_id, payment_date desc);

drop index if exists public.bills_user_client_request_id_uidx;
create unique index bills_organization_client_request_id_uidx
  on public.bills (organization_id, client_request_id)
  where client_request_id is not null;

drop index if exists public.owner_payments_user_client_request_id_uidx;
create unique index owner_payments_organization_client_request_id_uidx
  on public.owner_payments (organization_id, client_request_id)
  where client_request_id is not null;

drop index if exists public.bills_user_business_fingerprint_uidx;
create unique index bills_organization_business_fingerprint_uidx
  on public.bills (
    organization_id,
    coalesce(billing_party_id, '00000000-0000-0000-0000-000000000000'::uuid),
    lower(btrim(coalesce(guest_salutation, ''))),
    lower(btrim(coalesce(guest_name, ''))),
    lower(btrim(coalesce(vehicle_number, ''))),
    lower(btrim(coalesce(reporting_place, ''))),
    coalesce(trip_date, '-infinity'::date),
    btrim(coalesce(reporting_time, '')),
    coalesce(closing_date, '-infinity'::date),
    btrim(coalesce(closing_time, ''))
  );

create or replace function private.is_organization_member(p_organization_id uuid)
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
        and om.role in ('owner', 'admin', 'member')
    );
$$;

create or replace function private.can_write_organization_data(p_organization_id uuid)
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

revoke all on function private.default_organization_id(uuid) from public, anon, authenticated, service_role;
revoke all on function private.ensure_default_organization(uuid) from public, anon, authenticated, service_role;
revoke all on function private.handle_new_auth_user_organization() from public, anon, authenticated, service_role;
revoke all on function private.is_organization_member(uuid) from public, anon, authenticated, service_role;
revoke all on function private.can_write_organization_data(uuid) from public, anon, authenticated, service_role;
grant execute on function private.is_organization_member(uuid) to authenticated;
grant execute on function private.can_write_organization_data(uuid) to authenticated;

create or replace function public.set_organizations_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_organizations_updated_at
before update on public.organizations
for each row execute function public.set_organizations_updated_at();

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;

create policy "Members can select their organizations"
on public.organizations for select to authenticated
using (
  (select private.is_organization_member(id))
  and public.is_mfa_requirement_satisfied()
);

create policy "Members can select organization memberships"
on public.organization_members for select to authenticated
using (
  (select private.is_organization_member(organization_id))
  and public.is_mfa_requirement_satisfied()
);

drop policy if exists "Users can select their own bills" on public.bills;
drop policy if exists "Users can insert their own bills" on public.bills;
drop policy if exists "Users can update their own bills" on public.bills;
drop policy if exists "Users can delete their own bills" on public.bills;

create policy "Members can select organization bills"
on public.bills for select to authenticated
using ((select private.is_organization_member(organization_id)) and public.is_mfa_requirement_satisfied());
create policy "Members can insert organization bills"
on public.bills for insert to authenticated
with check (
  user_id = (select auth.uid())
  and (select private.can_write_organization_data(organization_id))
  and public.is_mfa_requirement_satisfied()
);
create policy "Members can update organization bills"
on public.bills for update to authenticated
using ((select private.can_write_organization_data(organization_id)) and public.is_mfa_requirement_satisfied())
with check ((select private.can_write_organization_data(organization_id)) and public.is_mfa_requirement_satisfied());
create policy "Members can delete organization bills"
on public.bills for delete to authenticated
using ((select private.can_write_organization_data(organization_id)) and public.is_mfa_requirement_satisfied());

drop policy if exists "Users can select their own billing parties" on public.billing_parties;
drop policy if exists "Users can insert their own billing parties" on public.billing_parties;
drop policy if exists "Users can update their own billing parties" on public.billing_parties;
drop policy if exists "Users can delete their own billing parties" on public.billing_parties;

create policy "Members can select organization billing parties"
on public.billing_parties for select to authenticated
using ((select private.is_organization_member(organization_id)) and public.is_mfa_requirement_satisfied());
create policy "Members can insert organization billing parties"
on public.billing_parties for insert to authenticated
with check (
  user_id = (select auth.uid())
  and (select private.can_write_organization_data(organization_id))
  and public.is_mfa_requirement_satisfied()
);
create policy "Members can update organization billing parties"
on public.billing_parties for update to authenticated
using ((select private.can_write_organization_data(organization_id)) and public.is_mfa_requirement_satisfied())
with check ((select private.can_write_organization_data(organization_id)) and public.is_mfa_requirement_satisfied());
create policy "Members can delete organization billing parties"
on public.billing_parties for delete to authenticated
using ((select private.can_write_organization_data(organization_id)) and public.is_mfa_requirement_satisfied());

drop policy if exists "Users can select their own owner payments" on public.owner_payments;
drop policy if exists "Users can insert their own owner payments" on public.owner_payments;
drop policy if exists "Users can update their own owner payments" on public.owner_payments;
drop policy if exists "Users can delete their own owner payments" on public.owner_payments;

create policy "Members can select organization owner payments"
on public.owner_payments for select to authenticated
using ((select private.is_organization_member(organization_id)) and public.is_mfa_requirement_satisfied());
create policy "Members can insert organization owner payments"
on public.owner_payments for insert to authenticated
with check (
  user_id = (select auth.uid())
  and (select private.can_write_organization_data(organization_id))
  and public.is_mfa_requirement_satisfied()
);
create policy "Members can update organization owner payments"
on public.owner_payments for update to authenticated
using ((select private.can_write_organization_data(organization_id)) and public.is_mfa_requirement_satisfied())
with check ((select private.can_write_organization_data(organization_id)) and public.is_mfa_requirement_satisfied());
create policy "Members can delete organization owner payments"
on public.owner_payments for delete to authenticated
using ((select private.can_write_organization_data(organization_id)) and public.is_mfa_requirement_satisfied());

create or replace function public.protect_bills_immutable_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.id is distinct from old.id then
    raise exception 'bill id cannot be changed';
  end if;
  if new.user_id is distinct from old.user_id then
    raise exception 'bill creator cannot be changed';
  end if;
  if new.organization_id is distinct from old.organization_id then
    raise exception 'bill organization cannot be changed';
  end if;
  new.created_at = old.created_at;
  return new;
end;
$$;

create or replace function public.protect_billing_parties_immutable_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.id is distinct from old.id then
    raise exception 'billing party id cannot be changed';
  end if;
  if new.user_id is distinct from old.user_id then
    raise exception 'billing party creator cannot be changed';
  end if;
  if new.organization_id is distinct from old.organization_id then
    raise exception 'billing party organization cannot be changed';
  end if;
  new.created_at = old.created_at;
  return new;
end;
$$;

create or replace function public.protect_owner_payments_immutable_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.id is distinct from old.id then
    raise exception 'owner payment id cannot be changed';
  end if;
  if new.user_id is distinct from old.user_id then
    raise exception 'owner payment creator cannot be changed';
  end if;
  if new.organization_id is distinct from old.organization_id then
    raise exception 'owner payment organization cannot be changed';
  end if;
  new.created_at = old.created_at;
  return new;
end;
$$;

create or replace function public.validate_owner_payment_billing_party()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.billing_parties bp
    where bp.id = new.billing_party_id
      and bp.organization_id = new.organization_id
  ) then
    raise exception 'owner payment billing party must belong to the same organization';
  end if;
  return new;
end;
$$;

create or replace function public.validate_bill_billing_party()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.billing_party_id is null then
    return new;
  end if;
  if not exists (
    select 1
    from public.billing_parties bp
    where bp.id = new.billing_party_id
      and bp.organization_id = new.organization_id
  ) then
    raise exception 'bill billing party must belong to the same organization';
  end if;
  return new;
end;
$$;

create or replace function public.enforce_billing_parties_user_cap()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if auth.uid() is null then
    return new;
  end if;
  if new.user_id is distinct from auth.uid() then
    raise exception 'Unable to save. Please try again.' using errcode = '42501';
  end if;
  if (select count(*) from public.billing_parties bp where bp.organization_id = new.organization_id) >= 500 then
    raise exception 'You have reached the current record limit.' using errcode = '23514';
  end if;
  return new;
end;
$$;

create or replace function public.enforce_owner_payments_user_cap()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if auth.uid() is null then
    return new;
  end if;
  if new.user_id is distinct from auth.uid() then
    raise exception 'Unable to save. Please try again.' using errcode = '42501';
  end if;
  if (select count(*) from public.owner_payments p where p.organization_id = new.organization_id) >= 20000 then
    raise exception 'You have reached the current record limit.' using errcode = '23514';
  end if;
  return new;
end;
$$;

create or replace function public.enforce_bills_user_cap()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if auth.uid() is null then
    return new;
  end if;
  if new.user_id is distinct from auth.uid() then
    raise exception 'Unable to save. Please try again.' using errcode = '42501';
  end if;
  if (select count(*) from public.bills b where b.organization_id = new.organization_id) >= 10000 then
    raise exception 'You have reached the current record limit.' using errcode = '23514';
  end if;
  return new;
end;
$$;

drop function public.get_billing_party_summaries();
create function public.get_billing_party_summaries(p_organization_id uuid)
returns table (
  billing_party_id uuid,
  display_name text,
  company_name text,
  total_billed numeric,
  total_received numeric,
  net_balance numeric,
  outstanding_amount numeric,
  advance_credit numeric,
  bill_count bigint,
  payment_count bigint,
  latest_bill_date date,
  latest_payment_date date
)
language sql
stable
security invoker
set search_path = ''
as $$
  with bill_totals as (
    select
      b.billing_party_id,
      coalesce(sum(b.total_amount), 0) as total_billed,
      count(*) as bill_count,
      max(b.trip_date) as latest_bill_date
    from public.bills b
    where b.organization_id = p_organization_id
      and b.billing_party_id is not null
    group by b.billing_party_id
  ),
  payment_totals as (
    select
      p.billing_party_id,
      coalesce(sum(p.amount), 0) as total_received,
      count(*) as payment_count,
      max(p.payment_date) as latest_payment_date
    from public.owner_payments p
    where p.organization_id = p_organization_id
    group by p.billing_party_id
  )
  select
    bp.id,
    bp.name,
    bp.company_name,
    coalesce(bt.total_billed, 0),
    coalesce(pt.total_received, 0),
    coalesce(bt.total_billed, 0) - coalesce(pt.total_received, 0),
    greatest(coalesce(bt.total_billed, 0) - coalesce(pt.total_received, 0), 0),
    greatest(coalesce(pt.total_received, 0) - coalesce(bt.total_billed, 0), 0),
    coalesce(bt.bill_count, 0),
    coalesce(pt.payment_count, 0),
    bt.latest_bill_date,
    pt.latest_payment_date
  from public.billing_parties bp
  left join bill_totals bt on bt.billing_party_id = bp.id
  left join payment_totals pt on pt.billing_party_id = bp.id
  where bp.organization_id = p_organization_id
  order by lower(bp.name), bp.created_at desc;
$$;

drop function public.get_billing_party_ledger(uuid);
create function public.get_billing_party_ledger(p_organization_id uuid, p_billing_party_id uuid)
returns table (
  entry_date date,
  entry_type text,
  reference_id uuid,
  description text,
  debit_amount numeric,
  credit_amount numeric,
  running_balance numeric
)
language sql
stable
security invoker
set search_path = ''
as $$
  with selected_party as (
    select bp.id
    from public.billing_parties bp
    where bp.id = p_billing_party_id
      and bp.organization_id = p_organization_id
  ),
  entries as (
    select
      b.trip_date as entry_date,
      'bill'::text as entry_type,
      b.id as reference_id,
      coalesce(nullif(b.guest_name, ''), 'Bill')::text as description,
      coalesce(b.total_amount, 0) as debit_amount,
      0::numeric as credit_amount,
      b.created_at as sort_timestamp
    from public.bills b
    join selected_party sp on sp.id = b.billing_party_id
    where b.organization_id = p_organization_id

    union all

    select
      p.payment_date,
      p.payment_type,
      p.id,
      coalesce(nullif(p.reference, ''), replace(p.payment_type, '_', ' '))::text,
      0::numeric,
      p.amount,
      p.created_at
    from public.owner_payments p
    join selected_party sp on sp.id = p.billing_party_id
    where p.organization_id = p_organization_id
  )
  select
    e.entry_date,
    e.entry_type,
    e.reference_id,
    e.description,
    e.debit_amount,
    e.credit_amount,
    sum(e.debit_amount - e.credit_amount) over (
      order by e.entry_date asc, e.sort_timestamp asc, e.reference_id asc
      rows between unbounded preceding and current row
    ) as running_balance
  from entries e
  order by e.entry_date desc, e.sort_timestamp desc, e.reference_id desc;
$$;

drop function public.get_billing_party_statement(uuid, date, date);
create function public.get_billing_party_statement(
  p_organization_id uuid,
  p_billing_party_id uuid,
  p_from_date date,
  p_to_date date
)
returns table (
  billing_party_id uuid,
  display_name text,
  company_name text,
  from_date date,
  to_date date,
  opening_balance numeric,
  total_billed numeric,
  total_received numeric,
  closing_balance numeric,
  closing_outstanding numeric,
  advance_available numeric,
  entry_date date,
  entry_type text,
  reference_id uuid,
  description text,
  debit_amount numeric,
  credit_amount numeric,
  running_balance numeric
)
language sql
stable
security invoker
set search_path = ''
as $$
  with selected_party as (
    select bp.id, bp.name, bp.company_name
    from public.billing_parties bp
    where bp.id = p_billing_party_id
      and bp.organization_id = p_organization_id
      and p_from_date <= p_to_date
  ),
  opening as (
    select coalesce(sum(activity.amount), 0) as opening_balance
    from (
      select coalesce(b.total_amount, 0) as amount
      from public.bills b
      join selected_party sp on sp.id = b.billing_party_id
      where b.organization_id = p_organization_id
        and b.trip_date < p_from_date

      union all

      select -coalesce(p.amount, 0)
      from public.owner_payments p
      join selected_party sp on sp.id = p.billing_party_id
      where p.organization_id = p_organization_id
        and p.payment_date < p_from_date
    ) activity
  ),
  period_entries as (
    select
      b.trip_date as entry_date,
      'bill'::text as entry_type,
      b.id as reference_id,
      coalesce(nullif(b.guest_name, ''), 'Bill')::text as description,
      coalesce(b.total_amount, 0) as debit_amount,
      0::numeric as credit_amount,
      b.created_at as sort_timestamp
    from public.bills b
    join selected_party sp on sp.id = b.billing_party_id
    where b.organization_id = p_organization_id
      and b.trip_date between p_from_date and p_to_date

    union all

    select
      p.payment_date,
      p.payment_type,
      p.id,
      coalesce(nullif(p.reference, ''), replace(p.payment_type, '_', ' '))::text,
      0::numeric,
      coalesce(p.amount, 0),
      p.created_at
    from public.owner_payments p
    join selected_party sp on sp.id = p.billing_party_id
    where p.organization_id = p_organization_id
      and p.payment_date between p_from_date and p_to_date
  ),
  totals as (
    select
      coalesce(sum(pe.debit_amount), 0) as total_billed,
      coalesce(sum(pe.credit_amount), 0) as total_received
    from period_entries pe
  ),
  statement_summary as (
    select
      o.opening_balance,
      t.total_billed,
      t.total_received,
      o.opening_balance + t.total_billed - t.total_received as closing_balance
    from opening o cross join totals t
  ),
  numbered_entries as (
    select
      pe.*,
      ss.opening_balance + sum(pe.debit_amount - pe.credit_amount) over (
        order by pe.entry_date asc, pe.sort_timestamp asc, pe.reference_id asc
        rows between unbounded preceding and current row
      ) as running_balance
    from period_entries pe cross join statement_summary ss
  )
  select
    sp.id,
    sp.name,
    sp.company_name,
    p_from_date,
    p_to_date,
    ss.opening_balance,
    ss.total_billed,
    ss.total_received,
    ss.closing_balance,
    greatest(ss.closing_balance, 0),
    greatest(-ss.closing_balance, 0),
    ne.entry_date,
    ne.entry_type,
    ne.reference_id,
    ne.description,
    ne.debit_amount,
    ne.credit_amount,
    ne.running_balance
  from selected_party sp
  cross join statement_summary ss
  left join numbered_entries ne on true
  order by ne.entry_date asc nulls last, ne.sort_timestamp asc nulls last, ne.reference_id asc nulls last;
$$;

create or replace function public.create_bill(
  p_client_request_id uuid,
  p_company_id text,
  p_billing_party_id uuid,
  p_driver_id text,
  p_vehicle_id text,
  p_guest_id text,
  p_driver_name text,
  p_vehicle_name text,
  p_vehicle_number text,
  p_guest_salutation text,
  p_guest_name text,
  p_reporting_place text,
  p_trip_date date,
  p_reporting_time text,
  p_garage_time text,
  p_closing_date date,
  p_closing_time text,
  p_base_package text,
  p_base_hours numeric,
  p_base_km numeric,
  p_base_amount numeric,
  p_opening_kilometer numeric,
  p_closing_kilometer numeric,
  p_total_km numeric,
  p_extra_km_rate numeric,
  p_total_hours numeric,
  p_extra_hour_rate numeric,
  p_airport_parking numeric,
  p_fastag numeric,
  p_road_parking numeric,
  p_advance_amount numeric,
  p_pending_amount numeric,
  p_notes text,
  p_whatsapp_number text
)
returns public.bills
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_organization_id uuid;
  v_values record;
  v_bill public.bills;
begin
  if v_user_id is null or not public.is_mfa_requirement_satisfied() then
    raise exception 'Unable to save the bill.' using errcode = '42501';
  end if;
  if p_client_request_id is null then
    raise exception 'Unable to save. Please try again.' using errcode = '23514';
  end if;

  select bp.organization_id into v_organization_id
  from public.billing_parties bp
  where bp.id = p_billing_party_id
    and private.can_write_organization_data(bp.organization_id);

  if v_organization_id is null then
    raise exception 'The selected Owner / Company is unavailable.' using errcode = '42501';
  end if;

  select * into v_bill
  from public.bills b
  where b.organization_id = v_organization_id
    and b.client_request_id = p_client_request_id
  limit 1;
  if v_bill.id is not null then return v_bill; end if;

  if (select count(*) from public.bills b where b.organization_id = v_organization_id) >= 10000 then
    raise exception 'You have reached the current record limit.' using errcode = '23514';
  end if;
  if (p_opening_kilometer is null or p_closing_kilometer is null) and coalesce(p_total_km, 0) < 0 then
    raise exception 'Unable to save the bill.' using errcode = '23514';
  end if;

  select * into v_values
  from public.calculate_bill_values(
    p_base_hours, p_base_km, p_base_amount, p_total_km,
    p_opening_kilometer, p_closing_kilometer, p_extra_km_rate,
    p_total_hours, p_extra_hour_rate, p_airport_parking, p_fastag, p_road_parking
  );

  begin
    insert into public.bills (
      organization_id, user_id, client_request_id, company_id, billing_party_id,
      driver_id, vehicle_id, guest_id, driver_name, vehicle_name, vehicle_number,
      guest_salutation, guest_name, customer_name, passenger_name, title_prefix,
      reporting_place, start_location, end_location, trip_date, date,
      reporting_time, garage_time, closing_date, closing_time, base_package,
      base_hours, base_km, base_amount, opening_kilometer, closing_kilometer,
      total_km, total_kilometers, extra_km, extra_km_rate, rate_per_kilometer,
      extra_km_amount, kilometer_amount, total_hours, extra_hours, extra_hour_rate,
      extra_hour_amount, night_charges, toll_charges, airport_parking,
      parking_charges, fastag, road_parking, permit_charges, other_charges,
      advance_amount, pending_amount, balance_amount, total_amount, notes, remarks,
      whatsapp_number
    ) values (
      v_organization_id, v_user_id, p_client_request_id, p_company_id, p_billing_party_id,
      p_driver_id, p_vehicle_id, p_guest_id, coalesce(p_driver_name, ''),
      coalesce(p_vehicle_name, ''), coalesce(p_vehicle_number, ''),
      coalesce(p_guest_salutation, 'Mr.'), coalesce(p_guest_name, ''),
      coalesce(p_guest_name, ''), coalesce(p_guest_name, ''),
      coalesce(p_guest_salutation, 'Mr.'), coalesce(p_reporting_place, ''),
      coalesce(p_reporting_place, ''), null, p_trip_date, p_trip_date,
      coalesce(p_reporting_time, ''), coalesce(p_garage_time, ''), p_closing_date,
      coalesce(p_closing_time, ''), coalesce(p_base_package, ''),
      coalesce(p_base_hours, 0), coalesce(p_base_km, 0), coalesce(p_base_amount, 0),
      p_opening_kilometer, p_closing_kilometer, v_values.total_km, v_values.total_km,
      v_values.extra_km, coalesce(p_extra_km_rate, 0), coalesce(p_extra_km_rate, 0),
      v_values.extra_km_amount, v_values.extra_km_amount, coalesce(p_total_hours, 0),
      v_values.extra_hours, coalesce(p_extra_hour_rate, 0), v_values.extra_hour_amount,
      0, coalesce(p_fastag, 0), coalesce(p_airport_parking, 0),
      coalesce(p_airport_parking, 0) + coalesce(p_road_parking, 0),
      coalesce(p_fastag, 0), coalesce(p_road_parking, 0), 0, 0,
      coalesce(p_advance_amount, 0), coalesce(p_pending_amount, 0),
      coalesce(p_pending_amount, 0), v_values.total_amount, coalesce(p_notes, ''),
      coalesce(p_notes, ''), coalesce(p_whatsapp_number, '')
    ) returning * into v_bill;
  exception when unique_violation then
    select * into v_bill
    from public.bills b
    where b.organization_id = v_organization_id
      and b.client_request_id = p_client_request_id
    limit 1;
  end;

  if v_bill.id is null then
    raise exception 'Unable to save. Please try again.' using errcode = '23514';
  end if;
  return v_bill;
end;
$$;

create or replace function public.update_bill(
  p_bill_id uuid,
  p_company_id text,
  p_billing_party_id uuid,
  p_driver_id text,
  p_vehicle_id text,
  p_guest_id text,
  p_driver_name text,
  p_vehicle_name text,
  p_vehicle_number text,
  p_guest_salutation text,
  p_guest_name text,
  p_reporting_place text,
  p_trip_date date,
  p_reporting_time text,
  p_garage_time text,
  p_closing_date date,
  p_closing_time text,
  p_base_package text,
  p_base_hours numeric,
  p_base_km numeric,
  p_base_amount numeric,
  p_opening_kilometer numeric,
  p_closing_kilometer numeric,
  p_total_km numeric,
  p_extra_km_rate numeric,
  p_total_hours numeric,
  p_extra_hour_rate numeric,
  p_airport_parking numeric,
  p_fastag numeric,
  p_road_parking numeric,
  p_advance_amount numeric,
  p_pending_amount numeric,
  p_notes text,
  p_whatsapp_number text
)
returns public.bills
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_organization_id uuid;
  v_values record;
  v_bill public.bills;
begin
  if v_user_id is null or not public.is_mfa_requirement_satisfied() then
    raise exception 'Unable to update the bill.' using errcode = '42501';
  end if;

  select b.organization_id into v_organization_id
  from public.bills b
  where b.id = p_bill_id
    and private.can_write_organization_data(b.organization_id);

  if v_organization_id is null or p_billing_party_id is null or not exists (
    select 1 from public.billing_parties bp
    where bp.id = p_billing_party_id
      and bp.organization_id = v_organization_id
  ) then
    raise exception 'The selected Owner / Company is unavailable.' using errcode = '42501';
  end if;
  if (p_opening_kilometer is null or p_closing_kilometer is null) and coalesce(p_total_km, 0) < 0 then
    raise exception 'Unable to update the bill.' using errcode = '23514';
  end if;

  select * into v_values
  from public.calculate_bill_values(
    p_base_hours, p_base_km, p_base_amount, p_total_km,
    p_opening_kilometer, p_closing_kilometer, p_extra_km_rate,
    p_total_hours, p_extra_hour_rate, p_airport_parking, p_fastag, p_road_parking
  );

  update public.bills set
    company_id = p_company_id,
    billing_party_id = p_billing_party_id,
    driver_id = p_driver_id,
    vehicle_id = p_vehicle_id,
    guest_id = p_guest_id,
    driver_name = coalesce(p_driver_name, ''),
    vehicle_name = coalesce(p_vehicle_name, ''),
    vehicle_number = coalesce(p_vehicle_number, ''),
    guest_salutation = coalesce(p_guest_salutation, 'Mr.'),
    guest_name = coalesce(p_guest_name, ''),
    customer_name = coalesce(p_guest_name, ''),
    passenger_name = coalesce(p_guest_name, ''),
    title_prefix = coalesce(p_guest_salutation, 'Mr.'),
    reporting_place = coalesce(p_reporting_place, ''),
    start_location = coalesce(p_reporting_place, ''),
    end_location = null,
    trip_date = p_trip_date,
    date = p_trip_date,
    reporting_time = coalesce(p_reporting_time, ''),
    garage_time = coalesce(p_garage_time, ''),
    closing_date = p_closing_date,
    closing_time = coalesce(p_closing_time, ''),
    base_package = coalesce(p_base_package, ''),
    base_hours = coalesce(p_base_hours, 0),
    base_km = coalesce(p_base_km, 0),
    base_amount = coalesce(p_base_amount, 0),
    opening_kilometer = p_opening_kilometer,
    closing_kilometer = p_closing_kilometer,
    total_km = v_values.total_km,
    total_kilometers = v_values.total_km,
    extra_km = v_values.extra_km,
    extra_km_rate = coalesce(p_extra_km_rate, 0),
    rate_per_kilometer = coalesce(p_extra_km_rate, 0),
    extra_km_amount = v_values.extra_km_amount,
    kilometer_amount = v_values.extra_km_amount,
    total_hours = coalesce(p_total_hours, 0),
    extra_hours = v_values.extra_hours,
    extra_hour_rate = coalesce(p_extra_hour_rate, 0),
    extra_hour_amount = v_values.extra_hour_amount,
    night_charges = 0,
    toll_charges = coalesce(p_fastag, 0),
    airport_parking = coalesce(p_airport_parking, 0),
    parking_charges = coalesce(p_airport_parking, 0) + coalesce(p_road_parking, 0),
    fastag = coalesce(p_fastag, 0),
    road_parking = coalesce(p_road_parking, 0),
    permit_charges = 0,
    other_charges = 0,
    advance_amount = coalesce(p_advance_amount, 0),
    pending_amount = coalesce(p_pending_amount, 0),
    balance_amount = coalesce(p_pending_amount, 0),
    total_amount = v_values.total_amount,
    notes = coalesce(p_notes, ''),
    remarks = coalesce(p_notes, ''),
    whatsapp_number = coalesce(p_whatsapp_number, '')
  where id = p_bill_id
    and organization_id = v_organization_id
  returning * into v_bill;

  if v_bill.id is null then
    raise exception 'Unable to update the bill.' using errcode = '42501';
  end if;
  return v_bill;
end;
$$;

create or replace function public.create_owner_payment(
  p_client_request_id uuid,
  p_billing_party_id uuid,
  p_payment_date date,
  p_amount numeric,
  p_payment_type text,
  p_payment_method text,
  p_reference text,
  p_notes text
)
returns public.owner_payments
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_organization_id uuid;
  v_payment public.owner_payments;
begin
  if v_user_id is null or not public.is_mfa_requirement_satisfied() then
    raise exception 'Unable to save. Please try again.' using errcode = '42501';
  end if;
  if p_client_request_id is null then
    raise exception 'Unable to save. Please try again.' using errcode = '23514';
  end if;

  select bp.organization_id into v_organization_id
  from public.billing_parties bp
  where bp.id = p_billing_party_id
    and private.can_write_organization_data(bp.organization_id);

  if v_organization_id is null then
    raise exception 'The selected Owner / Company is unavailable.' using errcode = '42501';
  end if;

  select * into v_payment
  from public.owner_payments p
  where p.organization_id = v_organization_id
    and p.client_request_id = p_client_request_id
  limit 1;
  if v_payment.id is not null then return v_payment; end if;

  if (select count(*) from public.owner_payments p where p.organization_id = v_organization_id) >= 20000 then
    raise exception 'You have reached the current record limit.' using errcode = '23514';
  end if;

  begin
    insert into public.owner_payments (
      organization_id, user_id, client_request_id, billing_party_id, payment_date,
      amount, payment_type, payment_method, reference, notes
    ) values (
      v_organization_id, v_user_id, p_client_request_id, p_billing_party_id,
      p_payment_date, p_amount, p_payment_type, nullif(p_payment_method, ''),
      nullif(p_reference, ''), nullif(p_notes, '')
    ) returning * into v_payment;
  exception when unique_violation then
    select * into v_payment
    from public.owner_payments p
    where p.organization_id = v_organization_id
      and p.client_request_id = p_client_request_id
    limit 1;
  end;

  if v_payment.id is null then
    raise exception 'Unable to save. Please try again.' using errcode = '23514';
  end if;
  return v_payment;
end;
$$;

revoke all on table public.organizations from public, anon, authenticated;
grant select on table public.organizations to authenticated;

revoke all on table public.organization_members from public, anon, authenticated;
grant select on table public.organization_members to authenticated;

revoke all on function public.set_organizations_updated_at() from public, anon, authenticated;

revoke all on function public.get_billing_party_summaries(uuid) from public, anon, authenticated;
grant execute on function public.get_billing_party_summaries(uuid) to authenticated;

revoke all on function public.get_billing_party_ledger(uuid, uuid) from public, anon, authenticated;
grant execute on function public.get_billing_party_ledger(uuid, uuid) to authenticated;

revoke all on function public.get_billing_party_statement(uuid, uuid, date, date) from public, anon, authenticated;
grant execute on function public.get_billing_party_statement(uuid, uuid, date, date) to authenticated;

revoke all on function public.create_bill(uuid, text, uuid, text, text, text, text, text, text, text, text, text, date, text, text, date, text, text, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, text, text) from public, anon;
grant execute on function public.create_bill(uuid, text, uuid, text, text, text, text, text, text, text, text, text, date, text, text, date, text, text, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, text, text) to authenticated;

revoke all on function public.update_bill(uuid, text, uuid, text, text, text, text, text, text, text, text, text, date, text, text, date, text, text, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, text, text) from public, anon;
grant execute on function public.update_bill(uuid, text, uuid, text, text, text, text, text, text, text, text, text, date, text, text, date, text, text, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, text, text) to authenticated;

revoke all on function public.create_owner_payment(uuid, uuid, date, numeric, text, text, text, text) from public, anon;
grant execute on function public.create_owner_payment(uuid, uuid, date, numeric, text, text, text, text) to authenticated;

comment on table public.organizations is 'Business ownership boundary for TripLedger operational data.';
comment on table public.organization_members is 'Maps Supabase Auth identities to TripLedger organizations and foundation roles.';
comment on column public.bills.user_id is 'Creator identity retained for audit and backward compatibility; organization_id owns the record.';
comment on column public.billing_parties.user_id is 'Creator identity retained for audit and backward compatibility; organization_id owns the record.';
comment on column public.owner_payments.user_id is 'Creator identity retained for audit and backward compatibility; organization_id owns the record.';

commit;
