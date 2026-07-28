begin;

create or replace function public.get_billing_party_statement(
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
      and bp.user_id = auth.uid()
      and auth.uid() is not null
      and public.is_mfa_requirement_satisfied()
      and p_from_date is not null
      and p_to_date is not null
      and p_from_date <= p_to_date
  ),
  opening as (
    select coalesce(sum(activity.amount), 0) as opening_balance
    from (
      select coalesce(b.total_amount, 0) as amount
      from public.bills b
      join selected_party sp on sp.id = b.billing_party_id
      where b.user_id = auth.uid()
        and b.trip_date < p_from_date

      union all

      select -coalesce(p.amount, 0) as amount
      from public.owner_payments p
      join selected_party sp on sp.id = p.billing_party_id
      where p.user_id = auth.uid()
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
    where b.user_id = auth.uid()
      and b.trip_date between p_from_date and p_to_date

    union all

    select
      p.payment_date as entry_date,
      p.payment_type as entry_type,
      p.id as reference_id,
      coalesce(nullif(p.reference, ''), replace(p.payment_type, '_', ' '))::text as description,
      0::numeric as debit_amount,
      coalesce(p.amount, 0) as credit_amount,
      p.created_at as sort_timestamp
    from public.owner_payments p
    join selected_party sp on sp.id = p.billing_party_id
    where p.user_id = auth.uid()
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
    from opening o
    cross join totals t
  ),
  numbered_entries as (
    select
      pe.*,
      ss.opening_balance
        + sum(pe.debit_amount - pe.credit_amount) over (
          order by pe.entry_date asc, pe.sort_timestamp asc, pe.reference_id asc
          rows between unbounded preceding and current row
        ) as running_balance
    from period_entries pe
    cross join statement_summary ss
  )
  select
    sp.id as billing_party_id,
    sp.name as display_name,
    sp.company_name,
    p_from_date as from_date,
    p_to_date as to_date,
    ss.opening_balance,
    ss.total_billed,
    ss.total_received,
    ss.closing_balance,
    greatest(ss.closing_balance, 0) as closing_outstanding,
    greatest(-ss.closing_balance, 0) as advance_available,
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

revoke all on function public.get_billing_party_statement(uuid, date, date) from public;
revoke all on function public.get_billing_party_statement(uuid, date, date) from anon;
grant execute on function public.get_billing_party_statement(uuid, date, date) to authenticated;

revoke create on schema public from public;
revoke create on schema public from anon;
revoke create on schema public from authenticated;

comment on function public.get_billing_party_statement(uuid, date, date)
  is 'Returns a driver-owned Owner / Company statement with opening balance, period totals, closing position, and deterministic period transactions.';

commit;

-- Rollback, if needed after review:
-- begin;
-- revoke all on function public.get_billing_party_statement(uuid, date, date) from authenticated;
-- drop function if exists public.get_billing_party_statement(uuid, date, date);
-- commit;
