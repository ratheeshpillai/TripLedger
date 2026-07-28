begin;

revoke all on function public.get_billing_party_summaries() from public;
revoke all on function public.get_billing_party_ledger(uuid) from public;

grant execute on function public.get_billing_party_summaries() to authenticated;
grant execute on function public.get_billing_party_ledger(uuid) to authenticated;

commit;

-- Rollback, if needed after review:
-- begin;
-- grant execute on function public.get_billing_party_summaries() to public;
-- grant execute on function public.get_billing_party_ledger(uuid) to public;
-- commit;
