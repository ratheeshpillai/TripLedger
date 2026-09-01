begin;

create table public.driver_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  driver_id uuid not null,
  invited_email text not null,
  token_hash bytea not null unique,
  status text not null default 'pending',
  expires_at timestamptz not null default (now() + interval '7 days'),
  invited_by uuid references auth.users(id) on delete set null,
  accepted_by uuid references auth.users(id) on delete set null,
  accepted_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint driver_invitations_driver_fk
    foreign key (driver_id, organization_id)
    references public.drivers (id, organization_id),
  constraint driver_invitations_email_chk check (
    invited_email = lower(btrim(invited_email))
    and length(invited_email) between 3 and 320
    and invited_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  ),
  constraint driver_invitations_status_chk check (
    status in ('pending', 'accepted', 'expired', 'cancelled')
  ),
  constraint driver_invitations_lifecycle_chk check (
    (status = 'accepted' and accepted_by is not null and accepted_at is not null and cancelled_at is null)
    or (status = 'cancelled' and accepted_by is null and accepted_at is null and cancelled_at is not null)
    or (status in ('pending', 'expired') and accepted_by is null and accepted_at is null and cancelled_at is null)
  )
);

create unique index driver_invitations_one_pending_driver_uidx
  on public.driver_invitations (driver_id)
  where status = 'pending';

create index driver_invitations_organization_created_idx
  on public.driver_invitations (organization_id, created_at desc, id);

create index driver_invitations_driver_created_idx
  on public.driver_invitations (driver_id, created_at desc, id);

create function public.set_driver_invitations_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_driver_invitations_updated_at
before update on public.driver_invitations
for each row execute function public.set_driver_invitations_updated_at();

alter table public.driver_invitations enable row level security;

create policy "Fleet managers can view driver invitations"
on public.driver_invitations for select
to authenticated
using (
  (select private.can_manage_drivers(organization_id))
  and public.is_mfa_requirement_satisfied()
);

create function public.create_driver_invitation(
  p_organization_id uuid,
  p_driver_id uuid,
  p_invited_email text
)
returns table (
  invitation_id uuid,
  organization_id uuid,
  driver_id uuid,
  invited_email text,
  status text,
  expires_at timestamptz,
  invited_by uuid,
  created_at timestamptz,
  invitation_token text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text := lower(btrim(coalesce(p_invited_email, '')));
  v_driver_user_id uuid;
  v_token text;
  v_invitation public.driver_invitations%rowtype;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'invitation_auth_required';
  end if;
  if not public.is_mfa_requirement_satisfied() then
    raise exception using errcode = '42501', message = 'invitation_mfa_required';
  end if;
  if not private.can_manage_drivers(p_organization_id) then
    raise exception using errcode = '42501', message = 'invitation_permission_denied';
  end if;
  if length(v_email) not between 3 and 320
    or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception using errcode = '22023', message = 'invitation_email_invalid';
  end if;

  select d.user_id
  into v_driver_user_id
  from public.drivers d
  where d.id = p_driver_id
    and d.organization_id = p_organization_id
  for update;

  if not found then
    raise exception using errcode = '22023', message = 'invitation_driver_unavailable';
  end if;
  if v_driver_user_id is not null then
    raise exception using errcode = '23505', message = 'invitation_driver_already_linked';
  end if;

  update public.driver_invitations di
  set status = 'expired'
  where di.driver_id = p_driver_id
    and di.organization_id = p_organization_id
    and di.status = 'pending'
    and di.expires_at <= now();

  if exists (
    select 1
    from public.driver_invitations di
    where di.driver_id = p_driver_id
      and di.organization_id = p_organization_id
      and di.status = 'pending'
  ) then
    raise exception using errcode = '23505', message = 'invitation_already_pending';
  end if;

  v_token := encode(extensions.gen_random_bytes(32), 'hex');

  insert into public.driver_invitations (
    organization_id,
    driver_id,
    invited_email,
    token_hash,
    invited_by
  ) values (
    p_organization_id,
    p_driver_id,
    v_email,
    extensions.digest(convert_to(v_token, 'UTF8'), 'sha256'),
    v_user_id
  )
  returning * into v_invitation;

  return query select
    v_invitation.id,
    v_invitation.organization_id,
    v_invitation.driver_id,
    v_invitation.invited_email,
    v_invitation.status,
    v_invitation.expires_at,
    v_invitation.invited_by,
    v_invitation.created_at,
    v_token;
exception
  when unique_violation then
    raise exception using errcode = '23505', message = 'invitation_already_pending';
end;
$$;

create function public.cancel_driver_invitation(
  p_organization_id uuid,
  p_invitation_id uuid
)
returns public.driver_invitations
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invitation public.driver_invitations%rowtype;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'invitation_auth_required';
  end if;
  if not public.is_mfa_requirement_satisfied() then
    raise exception using errcode = '42501', message = 'invitation_mfa_required';
  end if;
  if not private.can_manage_drivers(p_organization_id) then
    raise exception using errcode = '42501', message = 'invitation_permission_denied';
  end if;

  select di.*
  into v_invitation
  from public.driver_invitations di
  where di.id = p_invitation_id
    and di.organization_id = p_organization_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'invitation_not_found';
  end if;
  if v_invitation.status = 'accepted' then
    raise exception using errcode = 'P0001', message = 'invitation_already_accepted';
  end if;
  if v_invitation.status = 'cancelled' then
    raise exception using errcode = 'P0001', message = 'invitation_already_cancelled';
  end if;
  if v_invitation.status = 'expired' or v_invitation.expires_at <= now() then
    raise exception using errcode = 'P0001', message = 'invitation_expired';
  end if;

  update public.driver_invitations di
  set status = 'cancelled', cancelled_at = now()
  where di.id = v_invitation.id
  returning * into v_invitation;

  return v_invitation;
end;
$$;

create function public.get_driver_invitation(p_invitation_token text)
returns table (
  invitation_id uuid,
  organization_name text,
  driver_name text,
  invited_email text,
  status text,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_user_email text;
  v_email_confirmed_at timestamptz;
  v_invitation public.driver_invitations%rowtype;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'invitation_auth_required';
  end if;
  if not public.is_mfa_requirement_satisfied() then
    raise exception using errcode = '42501', message = 'invitation_mfa_required';
  end if;

  select lower(btrim(u.email)), u.email_confirmed_at
  into v_user_email, v_email_confirmed_at
  from auth.users u
  where u.id = v_user_id;

  if v_email_confirmed_at is null then
    raise exception using errcode = '42501', message = 'invitation_email_unverified';
  end if;

  select di.*
  into v_invitation
  from public.driver_invitations di
  where di.token_hash = extensions.digest(convert_to(coalesce(p_invitation_token, ''), 'UTF8'), 'sha256');

  if not found then
    raise exception using errcode = 'P0001', message = 'invitation_not_found';
  end if;
  if v_user_email is distinct from v_invitation.invited_email then
    raise exception using errcode = '42501', message = 'invitation_email_mismatch';
  end if;

  return query
  select
    v_invitation.id,
    o.name,
    d.name,
    v_invitation.invited_email,
    case
      when v_invitation.status = 'pending' and v_invitation.expires_at <= now() then 'expired'
      else v_invitation.status
    end,
    v_invitation.expires_at
  from public.organizations o
  join public.drivers d
    on d.id = v_invitation.driver_id
   and d.organization_id = v_invitation.organization_id
  where o.id = v_invitation.organization_id;
end;
$$;

create function public.accept_driver_invitation(p_invitation_token text)
returns table (
  invitation_id uuid,
  organization_name text,
  driver_name text,
  accepted_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_user_email text;
  v_email_confirmed_at timestamptz;
  v_invitation public.driver_invitations%rowtype;
  v_driver public.drivers%rowtype;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'invitation_auth_required';
  end if;
  if not public.is_mfa_requirement_satisfied() then
    raise exception using errcode = '42501', message = 'invitation_mfa_required';
  end if;

  select lower(btrim(u.email)), u.email_confirmed_at
  into v_user_email, v_email_confirmed_at
  from auth.users u
  where u.id = v_user_id;

  if v_email_confirmed_at is null then
    raise exception using errcode = '42501', message = 'invitation_email_unverified';
  end if;

  select di.*
  into v_invitation
  from public.driver_invitations di
  where di.token_hash = extensions.digest(convert_to(coalesce(p_invitation_token, ''), 'UTF8'), 'sha256')
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'invitation_not_found';
  end if;
  if v_invitation.status = 'accepted' then
    raise exception using errcode = 'P0001', message = 'invitation_already_accepted';
  end if;
  if v_invitation.status = 'cancelled' then
    raise exception using errcode = 'P0001', message = 'invitation_cancelled';
  end if;
  if v_invitation.status = 'expired' or v_invitation.expires_at <= now() then
    raise exception using errcode = 'P0001', message = 'invitation_expired';
  end if;
  if v_user_email is distinct from v_invitation.invited_email then
    raise exception using errcode = '42501', message = 'invitation_email_mismatch';
  end if;

  select d.*
  into v_driver
  from public.drivers d
  where d.id = v_invitation.driver_id
    and d.organization_id = v_invitation.organization_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'invitation_driver_unavailable';
  end if;
  if v_driver.user_id is not null then
    raise exception using errcode = '23505', message = 'invitation_driver_already_linked';
  end if;
  if exists (
    select 1
    from public.drivers d
    where d.organization_id = v_invitation.organization_id
      and d.user_id = v_user_id
      and d.id <> v_invitation.driver_id
  ) then
    raise exception using errcode = '23505', message = 'invitation_user_already_linked';
  end if;

  insert into public.organization_members (organization_id, user_id, role)
  values (v_invitation.organization_id, v_user_id, 'member')
  on conflict (organization_id, user_id) do nothing;

  update public.drivers d
  set user_id = v_user_id
  where d.id = v_invitation.driver_id
    and d.organization_id = v_invitation.organization_id;

  update public.driver_invitations di
  set status = 'accepted', accepted_by = v_user_id, accepted_at = now()
  where di.id = v_invitation.id
  returning * into v_invitation;

  return query
  select v_invitation.id, o.name, v_driver.name, v_invitation.accepted_at
  from public.organizations o
  where o.id = v_invitation.organization_id;
end;
$$;

revoke all on table public.driver_invitations from public, anon, authenticated;
grant select on table public.driver_invitations to authenticated;

-- Account links are created only by accept_driver_invitation().
revoke insert, update on table public.drivers from authenticated;
grant insert (id, organization_id, name, phone, status) on table public.drivers to authenticated;
grant update (name, phone, status) on table public.drivers to authenticated;

revoke all on function public.set_driver_invitations_updated_at() from public, anon, authenticated, service_role;
revoke all on function public.create_driver_invitation(uuid, uuid, text) from public, anon, authenticated, service_role;
revoke all on function public.cancel_driver_invitation(uuid, uuid) from public, anon, authenticated, service_role;
revoke all on function public.get_driver_invitation(text) from public, anon, authenticated, service_role;
revoke all on function public.accept_driver_invitation(text) from public, anon, authenticated, service_role;

grant execute on function public.create_driver_invitation(uuid, uuid, text) to authenticated;
grant execute on function public.cancel_driver_invitation(uuid, uuid) to authenticated;
grant execute on function public.get_driver_invitation(text) to authenticated;
grant execute on function public.accept_driver_invitation(text) to authenticated;

comment on table public.driver_invitations is
  'Time-limited invitations that link an authenticated user to an existing organization-owned driver identity.';
comment on column public.driver_invitations.token_hash is
  'SHA-256 digest of a high-entropy invitation token; the raw token is returned only when an invitation is created.';
comment on function public.accept_driver_invitation(text) is
  'Atomically verifies the invited authenticated identity, adds member access, links drivers.user_id, and accepts the invitation.';

commit;
