begin;

create index bills_organization_billing_party_trip_date_idx
  on public.bills (organization_id, billing_party_id, trip_date desc, id desc);

create index owner_payments_organization_billing_party_payment_date_idx
  on public.owner_payments (organization_id, billing_party_id, payment_date desc, id desc);

create index owner_payments_organization_created_at_idx
  on public.owner_payments (organization_id, created_at desc, id desc);

create index billing_parties_organization_created_at_idx
  on public.billing_parties (organization_id, created_at desc, id desc);

create function public.query_bills(
  p_organization_id uuid,
  p_page integer,
  p_page_size integer,
  p_search text default null,
  p_date_from date default null,
  p_date_to date default null,
  p_billing_party_id uuid default null,
  p_sort text default 'newest'
)
returns table (
  bill jsonb,
  billing_party_name text,
  billing_party_company_name text,
  result_count bigint,
  result_total numeric
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_search text := nullif(lower(btrim(p_search)), '');
begin
  if p_page < 1 or p_page_size < 1 or p_page_size > 10000 then
    raise exception 'Invalid bill page request.' using errcode = '22023';
  end if;
  if p_date_from is not null and p_date_to is not null and p_date_from > p_date_to then
    raise exception 'Invalid bill date range.' using errcode = '22023';
  end if;
  if p_sort not in ('newest', 'oldest', 'highest', 'lowest', 'customer', 'owner') then
    raise exception 'Unsupported bill sort.' using errcode = '22023';
  end if;

  return query
  with filtered as (
    select b.*, bp.name as party_name, bp.company_name as party_company_name
    from public.bills b
    left join public.billing_parties bp
      on bp.id = b.billing_party_id
      and bp.organization_id = b.organization_id
    where b.organization_id = p_organization_id
      and (p_billing_party_id is null or b.billing_party_id = p_billing_party_id)
      and (p_date_from is null or b.trip_date >= p_date_from)
      and (p_date_to is null or b.trip_date <= p_date_to)
      and (
        v_search is null
        or position(v_search in lower(coalesce(bp.company_name, bp.name, 'Unassigned'))) > 0
        or position(v_search in lower(btrim(concat_ws(' ', b.guest_salutation, coalesce(b.guest_name, b.customer_name, b.passenger_name, ''))))) > 0
        or position(v_search in lower(coalesce(b.guest_name, b.customer_name, b.passenger_name, ''))) > 0
        or position(v_search in lower(coalesce(b.driver_name, ''))) > 0
        or position(v_search in lower(coalesce(b.vehicle_name, ''))) > 0
        or position(v_search in lower(coalesce(b.vehicle_number, ''))) > 0
        or position(v_search in lower(coalesce(b.reporting_place, b.start_location, ''))) > 0
        or position(v_search in coalesce(b.trip_date, b.date)::text) > 0
        or position(v_search in round(coalesce(b.total_amount, 0))::text) > 0
      )
  ), counted as (
    select
      filtered.*,
      count(*) over () as matched_count,
      coalesce(sum(coalesce(filtered.total_amount, 0)) over (), 0) as matched_total
    from filtered
  )
  select
    to_jsonb(counted) - 'party_name' - 'party_company_name' - 'matched_count' - 'matched_total',
    counted.party_name,
    counted.party_company_name,
    counted.matched_count,
    counted.matched_total
  from counted
  order by
    case when p_sort = 'newest' then counted.trip_date end desc nulls last,
    case when p_sort = 'newest' then counted.updated_at end desc,
    case when p_sort = 'oldest' then counted.trip_date end asc nulls last,
    case when p_sort = 'highest' then counted.total_amount end desc nulls last,
    case when p_sort = 'lowest' then counted.total_amount end asc nulls last,
    case when p_sort = 'customer' then lower(btrim(concat_ws(' ', counted.guest_salutation, coalesce(counted.guest_name, counted.customer_name, counted.passenger_name, '')))) end asc,
    case when p_sort = 'owner' then lower(coalesce(counted.party_company_name, counted.party_name, 'Unassigned')) end asc,
    counted.id asc
  offset (p_page - 1) * p_page_size
  limit p_page_size;
end;
$$;

create function public.get_dashboard_summary(
  p_organization_id uuid,
  p_period_start date,
  p_period_end date
)
returns table (
  billing_total numeric,
  trips_billed bigint,
  payments_received numeric,
  current_outstanding numeric,
  outstanding_owners bigint,
  advance_owners bigint,
  total_advance numeric
)
language sql
stable
security invoker
set search_path = ''
as $$
  with period_bills as (
    select coalesce(sum(b.total_amount), 0) as total, count(*) as bill_count
    from public.bills b
    where b.organization_id = p_organization_id
      and b.trip_date between p_period_start and p_period_end
  ), period_payments as (
    select coalesce(sum(p.amount), 0) as total
    from public.owner_payments p
    where p.organization_id = p_organization_id
      and p.payment_date between p_period_start and p_period_end
  ), party_balances as (
    select
      bp.id,
      coalesce(sum(b.total_amount), 0) - coalesce(max(payments.total_received), 0) as balance
    from public.billing_parties bp
    left join public.bills b
      on b.organization_id = bp.organization_id and b.billing_party_id = bp.id
    left join (
      select p.billing_party_id, sum(p.amount) as total_received
      from public.owner_payments p
      where p.organization_id = p_organization_id
      group by p.billing_party_id
    ) payments on payments.billing_party_id = bp.id
    where bp.organization_id = p_organization_id
    group by bp.id
  )
  select
    period_bills.total,
    period_bills.bill_count,
    period_payments.total,
    coalesce(sum(greatest(party_balances.balance, 0)), 0),
    count(*) filter (where party_balances.balance > 0),
    count(*) filter (where party_balances.balance < 0),
    coalesce(sum(greatest(-party_balances.balance, 0)), 0)
  from period_bills
  cross join period_payments
  left join party_balances on true
  group by period_bills.total, period_bills.bill_count, period_payments.total;
$$;

create function public.get_dashboard_recent_activity(
  p_organization_id uuid,
  p_limit integer default 5
)
returns table (
  activity_type text,
  record_id uuid,
  title text,
  amount numeric,
  business_date date,
  activity_at timestamptz
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  if p_limit < 1 or p_limit > 20 then
    raise exception 'Invalid recent activity limit.' using errcode = '22023';
  end if;

  return query
  select activity.activity_type, activity.record_id, activity.title, activity.amount, activity.business_date, activity.activity_at
  from (
    select
      'bill'::text,
      b.id,
      'Bill added for ' || coalesce(bp.company_name, bp.name, b.guest_name, b.customer_name, b.passenger_name, 'Customer'),
      b.total_amount,
      coalesce(b.trip_date, b.date),
      b.created_at
    from public.bills b
    left join public.billing_parties bp on bp.id = b.billing_party_id and bp.organization_id = b.organization_id
    where b.organization_id = p_organization_id
    union all
    select
      'payment'::text,
      p.billing_party_id,
      'Payment added for ' || coalesce(bp.company_name, bp.name, 'Owner / Company'),
      p.amount,
      p.payment_date,
      p.created_at
    from public.owner_payments p
    join public.billing_parties bp on bp.id = p.billing_party_id and bp.organization_id = p.organization_id
    where p.organization_id = p_organization_id
    union all
    select
      'owner'::text,
      bp.id,
      'Owner added: ' || coalesce(bp.company_name, bp.name),
      null::numeric,
      null::date,
      bp.created_at
    from public.billing_parties bp
    where bp.organization_id = p_organization_id
  ) activity(activity_type, record_id, title, amount, business_date, activity_at)
  order by activity.activity_at desc, activity.activity_type asc, activity.record_id asc
  limit p_limit;
end;
$$;

create function public.get_dashboard_monthly_billing(
  p_organization_id uuid,
  p_first_month date
)
returns table (month_start date, amount numeric)
language sql
stable
security invoker
set search_path = ''
as $$
  with months as (
    select generate_series(
      date_trunc('month', p_first_month)::date,
      (date_trunc('month', p_first_month) + interval '5 months')::date,
      interval '1 month'
    )::date as month_start
  ), totals as (
    select date_trunc('month', b.trip_date)::date as month_start, sum(b.total_amount) as amount
    from public.bills b
    where b.organization_id = p_organization_id
      and b.trip_date >= date_trunc('month', p_first_month)::date
      and b.trip_date < (date_trunc('month', p_first_month) + interval '6 months')::date
    group by date_trunc('month', b.trip_date)::date
  )
  select months.month_start, coalesce(totals.amount, 0)
  from months
  left join totals using (month_start)
  order by months.month_start;
$$;

create function public.get_dashboard_top_owners(
  p_organization_id uuid,
  p_month_start date,
  p_limit integer default 3
)
returns table (
  billing_party_id uuid,
  display_name text,
  billed_amount numeric,
  outstanding_amount numeric
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  if p_limit < 1 or p_limit > 10 then
    raise exception 'Invalid top owner limit.' using errcode = '22023';
  end if;

  return query
  with all_time_bills as (
    select b.billing_party_id, sum(b.total_amount) as total_billed
    from public.bills b
    where b.organization_id = p_organization_id and b.billing_party_id is not null
    group by b.billing_party_id
  ), monthly_bills as (
    select b.billing_party_id, sum(b.total_amount) as billed_amount
    from public.bills b
    where b.organization_id = p_organization_id
      and b.billing_party_id is not null
      and b.trip_date >= date_trunc('month', p_month_start)::date
      and b.trip_date < (date_trunc('month', p_month_start) + interval '1 month')::date
    group by b.billing_party_id
  ), payments as (
    select p.billing_party_id, sum(p.amount) as total_received
    from public.owner_payments p
    where p.organization_id = p_organization_id
    group by p.billing_party_id
  )
  select
    bp.id,
    coalesce(bp.company_name, bp.name),
    mb.billed_amount,
    greatest(coalesce(ab.total_billed, 0) - coalesce(payments.total_received, 0), 0)
  from monthly_bills mb
  join public.billing_parties bp on bp.id = mb.billing_party_id and bp.organization_id = p_organization_id
  left join all_time_bills ab on ab.billing_party_id = bp.id
  left join payments on payments.billing_party_id = bp.id
  order by mb.billed_amount desc, lower(coalesce(bp.company_name, bp.name)) asc, bp.id asc
  limit p_limit;
end;
$$;

revoke all on function public.query_bills(uuid, integer, integer, text, date, date, uuid, text) from public, anon, authenticated;
revoke all on function public.get_dashboard_summary(uuid, date, date) from public, anon, authenticated;
revoke all on function public.get_dashboard_recent_activity(uuid, integer) from public, anon, authenticated;
revoke all on function public.get_dashboard_monthly_billing(uuid, date) from public, anon, authenticated;
revoke all on function public.get_dashboard_top_owners(uuid, date, integer) from public, anon, authenticated;

grant execute on function public.query_bills(uuid, integer, integer, text, date, date, uuid, text) to authenticated;
grant execute on function public.get_dashboard_summary(uuid, date, date) to authenticated;
grant execute on function public.get_dashboard_recent_activity(uuid, integer) to authenticated;
grant execute on function public.get_dashboard_monthly_billing(uuid, date) to authenticated;
grant execute on function public.get_dashboard_top_owners(uuid, date, integer) to authenticated;

commit;
