begin;

create extension if not exists "pgcrypto";

do $$
begin
  if to_regprocedure('public.is_mfa_requirement_satisfied()') is null then
    create function public.is_mfa_requirement_satisfied()
    returns boolean
    language sql
    stable
    security definer
    set search_path = ''
    as $function$
      select
        not exists (
          select 1
          from auth.mfa_factors
          where user_id = auth.uid()
            and status = 'verified'
        )
        or coalesce(auth.jwt() ->> 'aal' = 'aal2', false);
    $function$;
  end if;
end;
$$;

revoke all on function public.is_mfa_requirement_satisfied() from public;
grant execute on function public.is_mfa_requirement_satisfied() to authenticated;

create table if not exists public.billing_parties (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  company_name text,
  phone text,
  email text,
  address text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint billing_parties_name_not_blank_chk check (length(btrim(name)) > 0),
  constraint billing_parties_text_lengths_chk check (
    length(name) <= 160
    and (company_name is null or length(company_name) <= 160)
    and (phone is null or length(phone) <= 32)
    and (email is null or length(email) <= 254)
    and (address is null or length(address) <= 1000)
    and (notes is null or length(notes) <= 2000)
  ),
  constraint billing_parties_text_no_nul_chk check (
    encode(convert_to(coalesce(name, ''), 'UTF8'), 'hex') not like '%00%'
    and encode(convert_to(coalesce(company_name, ''), 'UTF8'), 'hex') not like '%00%'
    and encode(convert_to(coalesce(phone, ''), 'UTF8'), 'hex') not like '%00%'
    and encode(convert_to(coalesce(email, ''), 'UTF8'), 'hex') not like '%00%'
    and encode(convert_to(coalesce(address, ''), 'UTF8'), 'hex') not like '%00%'
    and encode(convert_to(coalesce(notes, ''), 'UTF8'), 'hex') not like '%00%'
  )
);

create index if not exists billing_parties_user_id_idx on public.billing_parties (user_id);
create index if not exists billing_parties_user_id_name_idx on public.billing_parties (user_id, lower(name));

create table if not exists public.owner_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  billing_party_id uuid not null references public.billing_parties(id),
  payment_date date not null,
  amount numeric not null,
  payment_type text not null,
  payment_method text,
  reference text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint owner_payments_amount_chk check (amount > 0 and amount <= 10000000),
  constraint owner_payments_type_chk check (payment_type in ('payment_received', 'advance_received')),
  constraint owner_payments_method_chk check (payment_method is null or payment_method in ('cash', 'bank_transfer', 'upi', 'cheque', 'other')),
  constraint owner_payments_text_lengths_chk check (
    (payment_method is null or length(payment_method) <= 32)
    and (reference is null or length(reference) <= 160)
    and (notes is null or length(notes) <= 2000)
  ),
  constraint owner_payments_text_no_nul_chk check (
    encode(convert_to(coalesce(payment_type, ''), 'UTF8'), 'hex') not like '%00%'
    and encode(convert_to(coalesce(payment_method, ''), 'UTF8'), 'hex') not like '%00%'
    and encode(convert_to(coalesce(reference, ''), 'UTF8'), 'hex') not like '%00%'
    and encode(convert_to(coalesce(notes, ''), 'UTF8'), 'hex') not like '%00%'
  )
);

create index if not exists owner_payments_user_id_idx on public.owner_payments (user_id);
create index if not exists owner_payments_billing_party_id_idx on public.owner_payments (billing_party_id);
create index if not exists owner_payments_payment_date_idx on public.owner_payments (payment_date);

alter table public.bills
  add column if not exists billing_party_id uuid null references public.billing_parties(id);

create index if not exists bills_billing_party_id_idx on public.bills (billing_party_id);

create or replace function public.set_billing_parties_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
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
    raise exception 'billing party owner cannot be changed';
  end if;

  new.created_at = old.created_at;
  return new;
end;
$$;

create or replace function public.set_owner_payments_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
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
    raise exception 'owner payment owner cannot be changed';
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
      and bp.user_id = new.user_id
  ) then
    raise exception 'owner payment billing party must belong to the same user';
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
      and bp.user_id = new.user_id
  ) then
    raise exception 'bill billing party must belong to the same user';
  end if;

  return new;
end;
$$;

create or replace function public.prevent_billing_party_delete_with_activity()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (select 1 from public.bills b where b.billing_party_id = old.id)
     or exists (select 1 from public.owner_payments p where p.billing_party_id = old.id) then
    raise exception 'billing party has related bills or payments';
  end if;

  return old;
end;
$$;

drop trigger if exists protect_billing_parties_immutable_fields on public.billing_parties;
drop trigger if exists set_billing_parties_updated_at on public.billing_parties;
drop trigger if exists protect_owner_payments_immutable_fields on public.owner_payments;
drop trigger if exists set_owner_payments_updated_at on public.owner_payments;
drop trigger if exists validate_owner_payment_billing_party on public.owner_payments;
drop trigger if exists validate_bill_billing_party on public.bills;
drop trigger if exists prevent_billing_party_delete_with_activity on public.billing_parties;

create trigger protect_billing_parties_immutable_fields
before update on public.billing_parties
for each row execute function public.protect_billing_parties_immutable_fields();

create trigger set_billing_parties_updated_at
before update on public.billing_parties
for each row execute function public.set_billing_parties_updated_at();

create trigger protect_owner_payments_immutable_fields
before update on public.owner_payments
for each row execute function public.protect_owner_payments_immutable_fields();

create trigger set_owner_payments_updated_at
before update on public.owner_payments
for each row execute function public.set_owner_payments_updated_at();

create trigger validate_owner_payment_billing_party
before insert or update on public.owner_payments
for each row execute function public.validate_owner_payment_billing_party();

create trigger validate_bill_billing_party
before insert or update on public.bills
for each row execute function public.validate_bill_billing_party();

create trigger prevent_billing_party_delete_with_activity
before delete on public.billing_parties
for each row execute function public.prevent_billing_party_delete_with_activity();

alter table public.billing_parties enable row level security;
alter table public.owner_payments enable row level security;

drop policy if exists "Users can select their own billing parties" on public.billing_parties;
create policy "Users can select their own billing parties"
on public.billing_parties
for select
to authenticated
using (
  auth.uid() = user_id
  and public.is_mfa_requirement_satisfied()
);

drop policy if exists "Users can insert their own billing parties" on public.billing_parties;
create policy "Users can insert their own billing parties"
on public.billing_parties
for insert
to authenticated
with check (
  auth.uid() = user_id
  and public.is_mfa_requirement_satisfied()
);

drop policy if exists "Users can update their own billing parties" on public.billing_parties;
create policy "Users can update their own billing parties"
on public.billing_parties
for update
to authenticated
using (
  auth.uid() = user_id
  and public.is_mfa_requirement_satisfied()
)
with check (
  auth.uid() = user_id
  and public.is_mfa_requirement_satisfied()
);

drop policy if exists "Users can delete their own billing parties" on public.billing_parties;
create policy "Users can delete their own billing parties"
on public.billing_parties
for delete
to authenticated
using (
  auth.uid() = user_id
  and public.is_mfa_requirement_satisfied()
);

drop policy if exists "Users can select their own owner payments" on public.owner_payments;
create policy "Users can select their own owner payments"
on public.owner_payments
for select
to authenticated
using (
  auth.uid() = user_id
  and public.is_mfa_requirement_satisfied()
);

drop policy if exists "Users can insert their own owner payments" on public.owner_payments;
create policy "Users can insert their own owner payments"
on public.owner_payments
for insert
to authenticated
with check (
  auth.uid() = user_id
  and public.is_mfa_requirement_satisfied()
  and exists (
    select 1
    from public.billing_parties bp
    where bp.id = owner_payments.billing_party_id
      and bp.user_id = auth.uid()
  )
);

drop policy if exists "Users can update their own owner payments" on public.owner_payments;
create policy "Users can update their own owner payments"
on public.owner_payments
for update
to authenticated
using (
  auth.uid() = user_id
  and public.is_mfa_requirement_satisfied()
)
with check (
  auth.uid() = user_id
  and public.is_mfa_requirement_satisfied()
  and exists (
    select 1
    from public.billing_parties bp
    where bp.id = owner_payments.billing_party_id
      and bp.user_id = auth.uid()
  )
);

drop policy if exists "Users can delete their own owner payments" on public.owner_payments;
create policy "Users can delete their own owner payments"
on public.owner_payments
for delete
to authenticated
using (
  auth.uid() = user_id
  and public.is_mfa_requirement_satisfied()
);

create or replace function public.get_billing_party_summaries()
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
    where b.user_id = auth.uid()
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
    where p.user_id = auth.uid()
    group by p.billing_party_id
  )
  select
    bp.id as billing_party_id,
    bp.name as display_name,
    bp.company_name,
    coalesce(bt.total_billed, 0) as total_billed,
    coalesce(pt.total_received, 0) as total_received,
    coalesce(bt.total_billed, 0) - coalesce(pt.total_received, 0) as net_balance,
    greatest(coalesce(bt.total_billed, 0) - coalesce(pt.total_received, 0), 0) as outstanding_amount,
    greatest(coalesce(pt.total_received, 0) - coalesce(bt.total_billed, 0), 0) as advance_credit,
    coalesce(bt.bill_count, 0) as bill_count,
    coalesce(pt.payment_count, 0) as payment_count,
    bt.latest_bill_date,
    pt.latest_payment_date
  from public.billing_parties bp
  left join bill_totals bt on bt.billing_party_id = bp.id
  left join payment_totals pt on pt.billing_party_id = bp.id
  where bp.user_id = auth.uid()
  order by lower(bp.name), bp.created_at desc;
$$;

create or replace function public.get_billing_party_ledger(p_billing_party_id uuid)
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
  with entries as (
    select
      b.trip_date as entry_date,
      'bill'::text as entry_type,
      b.id as reference_id,
      coalesce(nullif(b.guest_name, ''), 'Bill')::text as description,
      coalesce(b.total_amount, 0) as debit_amount,
      0::numeric as credit_amount,
      b.created_at as sort_timestamp
    from public.bills b
    where b.user_id = auth.uid()
      and b.billing_party_id = p_billing_party_id

    union all

    select
      p.payment_date as entry_date,
      p.payment_type as entry_type,
      p.id as reference_id,
      coalesce(nullif(p.reference, ''), replace(p.payment_type, '_', ' '))::text as description,
      0::numeric as debit_amount,
      p.amount as credit_amount,
      p.created_at as sort_timestamp
    from public.owner_payments p
    where p.user_id = auth.uid()
      and p.billing_party_id = p_billing_party_id
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
  order by e.entry_date asc, e.sort_timestamp asc, e.reference_id asc;
$$;

grant execute on function public.get_billing_party_summaries() to authenticated;
grant execute on function public.get_billing_party_ledger(uuid) to authenticated;

comment on table public.billing_parties is 'Driver-owned Owner / Company directory records. Future owner portal can attach to these parties without replacing the table.';
comment on table public.owner_payments is 'Driver-recorded payments or advances received from an Owner / Company. Ledger balances are calculated from bills and these payments.';

commit;

-- Rollback, if needed after review:
-- begin;
-- drop function if exists public.get_billing_party_ledger(uuid);
-- drop function if exists public.get_billing_party_summaries();
-- drop trigger if exists validate_bill_billing_party on public.bills;
-- drop trigger if exists prevent_billing_party_delete_with_activity on public.billing_parties;
-- drop trigger if exists validate_owner_payment_billing_party on public.owner_payments;
-- drop trigger if exists set_owner_payments_updated_at on public.owner_payments;
-- drop trigger if exists protect_owner_payments_immutable_fields on public.owner_payments;
-- drop trigger if exists set_billing_parties_updated_at on public.billing_parties;
-- drop trigger if exists protect_billing_parties_immutable_fields on public.billing_parties;
-- drop function if exists public.validate_bill_billing_party();
-- drop function if exists public.prevent_billing_party_delete_with_activity();
-- drop function if exists public.validate_owner_payment_billing_party();
-- drop function if exists public.set_owner_payments_updated_at();
-- drop function if exists public.protect_owner_payments_immutable_fields();
-- drop function if exists public.set_billing_parties_updated_at();
-- drop function if exists public.protect_billing_parties_immutable_fields();
-- drop function if exists public.is_mfa_requirement_satisfied(); -- only if this migration created it and no other policies need it
-- alter table public.bills drop column if exists billing_party_id;
-- drop table if exists public.owner_payments;
-- drop table if exists public.billing_parties;
-- commit;
