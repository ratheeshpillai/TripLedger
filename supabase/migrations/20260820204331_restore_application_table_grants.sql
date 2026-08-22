begin;

-- Supabase CLI projects no longer auto-grant Data API table privileges.
-- Keep writes that have authoritative RPCs restricted to those RPCs.
revoke all on table public.bills from public, anon, authenticated;
grant select, delete on table public.bills to authenticated;

revoke all on table public.billing_parties from public, anon, authenticated;
grant select, insert, update, delete on table public.billing_parties to authenticated;

revoke all on table public.owner_payments from public, anon, authenticated;
grant select, update, delete on table public.owner_payments to authenticated;

revoke all on table public.app_preferences from public, anon, authenticated;
grant select, insert, update on table public.app_preferences to authenticated;

-- Normalize function privileges independently of project-level auto-grant settings.
do $function_grants$
declare
  target_function regprocedure;
begin
  for target_function in
    select p.oid::regprocedure
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = any (array[
        'calculate_bill_values',
        'create_bill',
        'create_owner_payment',
        'enforce_billing_parties_user_cap',
        'enforce_bills_user_cap',
        'enforce_owner_payments_user_cap',
        'get_billing_party_ledger',
        'get_billing_party_statement',
        'get_billing_party_summaries',
        'is_mfa_requirement_satisfied',
        'prevent_billing_party_delete_with_activity',
        'protect_billing_parties_immutable_fields',
        'protect_bills_immutable_fields',
        'protect_owner_payments_immutable_fields',
        'set_app_preferences_updated_at',
        'set_billing_parties_updated_at',
        'set_bills_updated_at',
        'set_owner_payments_updated_at',
        'update_bill',
        'validate_bill_billing_party',
        'validate_owner_payment_billing_party'
      ])
  loop
    execute format(
      'revoke all on function %s from public, anon, authenticated',
      target_function
    );
  end loop;
end
$function_grants$;

grant execute on function public.is_mfa_requirement_satisfied() to authenticated;
grant execute on function public.get_billing_party_summaries() to authenticated;
grant execute on function public.get_billing_party_ledger(uuid) to authenticated;
grant execute on function public.get_billing_party_statement(uuid, date, date) to authenticated;
grant execute on function public.create_bill(uuid, text, uuid, text, text, text, text, text, text, text, text, text, date, text, text, date, text, text, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, text, text) to authenticated;
grant execute on function public.update_bill(uuid, text, uuid, text, text, text, text, text, text, text, text, text, date, text, text, date, text, text, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, text, text) to authenticated;
grant execute on function public.create_owner_payment(uuid, uuid, date, numeric, text, text, text, text) to authenticated;

commit;
