-- TripLedger Phase 1: optional MFA enforcement for bill data.
-- Run after supabase/bills.sql in the Supabase SQL Editor.

create or replace function public.is_mfa_requirement_satisfied()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    not exists (
      select 1
      from auth.mfa_factors
      where user_id = auth.uid()
        and status = 'verified'
    )
    or coalesce(auth.jwt() ->> 'aal' = 'aal2', false);
$$;

revoke all on function public.is_mfa_requirement_satisfied() from public;
grant execute on function public.is_mfa_requirement_satisfied() to authenticated;

drop policy if exists "Users can select their own bills" on public.bills;
create policy "Users can select their own bills"
on public.bills
for select
to authenticated
using (
  auth.uid() = user_id
  and public.is_mfa_requirement_satisfied()
);

drop policy if exists "Users can insert their own bills" on public.bills;
create policy "Users can insert their own bills"
on public.bills
for insert
to authenticated
with check (
  auth.uid() = user_id
  and public.is_mfa_requirement_satisfied()
);

drop policy if exists "Users can update their own bills" on public.bills;
create policy "Users can update their own bills"
on public.bills
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

drop policy if exists "Users can delete their own bills" on public.bills;
create policy "Users can delete their own bills"
on public.bills
for delete
to authenticated
using (
  auth.uid() = user_id
  and public.is_mfa_requirement_satisfied()
);
