begin;

create or replace function pg_temp.assert_true(condition boolean, message text)
returns void language plpgsql as $$
begin
  if not condition then raise exception 'assertion failed: %', message; end if;
end;
$$;
grant execute on function pg_temp.assert_true(boolean, text) to authenticated;

insert into auth.users (id, email, aud, role, created_at, updated_at)
values
  ('41000000-0000-0000-0000-000000000001', 'query-a@example.test', 'authenticated', 'authenticated', now(), now()),
  ('42000000-0000-0000-0000-000000000002', 'query-b@example.test', 'authenticated', 'authenticated', now(), now()),
  ('43000000-0000-0000-0000-000000000003', 'query-empty@example.test', 'authenticated', 'authenticated', now(), now());

create temporary table query_fixture (label text primary key, id uuid not null);
grant select on query_fixture to authenticated;
insert into query_fixture values
  ('org-a', private.default_organization_id('41000000-0000-0000-0000-000000000001')),
  ('org-b', private.default_organization_id('42000000-0000-0000-0000-000000000002')),
  ('org-empty', private.default_organization_id('43000000-0000-0000-0000-000000000003')),
  ('party-a1', '41000000-0000-0000-0000-000000000101'),
  ('party-a2', '41000000-0000-0000-0000-000000000102'),
  ('party-b', '42000000-0000-0000-0000-000000000101');

insert into public.billing_parties (id, organization_id, user_id, name, company_name, created_at)
values
  ((select id from query_fixture where label = 'party-a1'), (select id from query_fixture where label = 'org-a'), '41000000-0000-0000-0000-000000000001', 'Alpha Owner', null, '2026-08-01 08:00:00+00'),
  ((select id from query_fixture where label = 'party-a2'), (select id from query_fixture where label = 'org-a'), '41000000-0000-0000-0000-000000000001', 'Beta Owner', 'Beta Travels', '2026-08-02 08:00:00+00'),
  ((select id from query_fixture where label = 'party-b'), (select id from query_fixture where label = 'org-b'), '42000000-0000-0000-0000-000000000002', 'Private Owner', null, '2026-08-03 08:00:00+00');

insert into public.bills (
  organization_id, user_id, billing_party_id, guest_salutation, guest_name, customer_name, passenger_name,
  driver_name, vehicle_name, vehicle_number, reporting_place, trip_date,
  date, reporting_time, closing_date, closing_time, total_km, total_kilometers,
  extra_km_rate, rate_per_kilometer, extra_km_amount, kilometer_amount,
  fastag, toll_charges, pending_amount, balance_amount, notes, remarks, total_amount, created_at
)
select
  (select id from query_fixture where label = 'org-a'),
  '41000000-0000-0000-0000-000000000001',
  case when sequence <= 15 then (select id from query_fixture where label = 'party-a1') else (select id from query_fixture where label = 'party-a2') end,
  'Mr.',
  'Customer ' || lpad(sequence::text, 2, '0'),
  'Customer ' || lpad(sequence::text, 2, '0'),
  'Customer ' || lpad(sequence::text, 2, '0'),
  'Driver',
  'Innova',
  'MH03TEST' || lpad(sequence::text, 2, '0'),
  case when sequence % 2 = 0 then 'Airport' else 'Hotel' end,
  date '2026-08-01' + (sequence - 1),
  date '2026-08-01' + (sequence - 1),
  '09:00',
  date '2026-08-01' + (sequence - 1),
  '17:00',
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, '', '',
  sequence * 100,
  timestamptz '2026-08-01 09:00:00+00' + (sequence || ' hours')::interval
from generate_series(1, 25) sequence;

insert into public.bills (
  organization_id, user_id, billing_party_id, guest_name, customer_name, passenger_name,
  reporting_place, trip_date, date, reporting_time, closing_date, closing_time,
  total_km, total_kilometers, extra_km_rate, rate_per_kilometer, extra_km_amount,
  kilometer_amount, fastag, toll_charges, pending_amount, balance_amount, notes, remarks, total_amount
)
values (
  (select id from query_fixture where label = 'org-b'), '42000000-0000-0000-0000-000000000002',
  (select id from query_fixture where label = 'party-b'), 'Private Customer', 'Private Customer', 'Private Customer',
  'Private Place', '2026-08-10', '2026-08-10', '09:00', '2026-08-10', '17:00',
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, '', '', 99999
);

insert into public.owner_payments (organization_id, user_id, billing_party_id, payment_date, amount, payment_type, created_at)
values ((select id from query_fixture where label = 'org-a'), '41000000-0000-0000-0000-000000000001', (select id from query_fixture where label = 'party-a1'), '2026-08-15', 1000, 'payment_received', '2026-08-30 10:00:00+00');

select set_config('request.jwt.claims', '{"sub":"41000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1"}', true);
set local role authenticated;

select pg_temp.assert_true(
  (select count(*) = 10 and min(result_count) = 25 and min(result_total) = 32500
   from public.query_bills((select id from query_fixture where label = 'org-a'), 2, 10)),
  'History must return only page two while retaining server-side count and total'
);

select pg_temp.assert_true(
  (select count(*) = 6 and min(result_count) = 6 and min(result_total) = 13500
   from public.query_bills((select id from query_fixture where label = 'org-a'), 1, 20, null, '2026-08-20', '2026-08-25')),
  'History date filters must execute server-side'
);

select pg_temp.assert_true(
  (select min(result_count) = 15
   from public.query_bills((select id from query_fixture where label = 'org-a'), 1, 20, null, null, null, (select id from query_fixture where label = 'party-a1'))),
  'History billing-party filter must execute server-side'
);

select pg_temp.assert_true(
  (select count(*) = 1 and min(result_count) = 1
   from public.query_bills((select id from query_fixture where label = 'org-a'), 1, 20, 'customer 12')),
  'History search must preserve case-insensitive literal contains semantics'
);

select pg_temp.assert_true(
  (select array_agg((bill ->> 'total_amount')::numeric order by ordinal) = array[2500,2400,2300]::numeric[]
   from (select *, row_number() over () ordinal from public.query_bills((select id from query_fixture where label = 'org-a'), 1, 3, null, null, null, null, 'highest')) ranked),
  'Supported sort order must be deterministic and database-side'
);

select pg_temp.assert_true(
  not exists (select 1 from public.query_bills((select id from query_fixture where label = 'org-b'), 1, 20)),
  'A caller must not query another organization by supplying its UUID'
);

select pg_temp.assert_true(
  (select billing_total = 0 and trips_billed = 0 and current_outstanding = 0
   from public.get_dashboard_summary((select id from query_fixture where label = 'org-b'), '2026-08-01', '2026-08-31'))
  and not exists (select 1 from public.get_dashboard_recent_activity((select id from query_fixture where label = 'org-b'), 5)),
  'Dashboard read models must not expose another organization when its UUID is supplied'
);

select pg_temp.assert_true(
  (select billing_total = 32500 and trips_billed = 25 and payments_received = 1000 and current_outstanding = 31500
   from public.get_dashboard_summary((select id from query_fixture where label = 'org-a'), '2026-08-01', '2026-08-31')),
  'Dashboard totals must match fixtures without downloading operational rows'
);

select pg_temp.assert_true(
  (select count(*) = 3 from public.get_dashboard_recent_activity((select id from query_fixture where label = 'org-a'), 3)),
  'Recent activity must return only the requested limit'
);

select pg_temp.assert_true(
  (select count(*) = 6 and sum(amount) = 32500
   from public.get_dashboard_monthly_billing((select id from query_fixture where label = 'org-a'), '2026-03-01')),
  'Monthly dashboard trend must return six server-aggregated months'
);

select pg_temp.assert_true(
  (select display_name = 'Beta Travels' and billed_amount = 20500
   from public.get_dashboard_top_owners((select id from query_fixture where label = 'org-a'), '2026-08-01', 3)
   limit 1),
  'Top owners must be ranked from organization-scoped monthly billing'
);

select pg_temp.assert_true(
  (select billing_total = 0 and trips_billed = 0 and current_outstanding = 0
   from public.get_dashboard_summary((select id from query_fixture where label = 'org-empty'), '2026-08-01', '2026-08-31')),
  'Empty organizations must return a valid zero summary'
);

reset role;
select pg_temp.assert_true(not has_function_privilege('anon', 'public.query_bills(uuid,integer,integer,text,date,date,uuid,text)', 'execute'), 'anonymous bill queries must be blocked');
select pg_temp.assert_true(not has_function_privilege('anon', 'public.get_dashboard_summary(uuid,date,date)', 'execute'), 'anonymous dashboard queries must be blocked');

rollback;
