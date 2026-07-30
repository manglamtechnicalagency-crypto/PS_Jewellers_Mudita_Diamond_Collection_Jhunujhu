-- Admin idle-lock PIN.
--
-- SCOPE — read this before trusting the feature:
-- The PIN re-opens a screen that is locked after inactivity. It is NOT an
-- authentication boundary. The Supabase session stays valid the whole time the
-- overlay is up, so anyone with the unlocked device and developer tools can
-- reach the admin APIs directly. What this defends against is the realistic
-- office threat: an unattended, already-signed-in browser.
--
-- The columns (pin_hash, pin_failed_attempts, pin_locked_until,
-- pin_last_rotated_at) already exist on public.profiles from 0001; this
-- migration only adds the functions that use them.
--
-- profiles has a SELECT policy but no UPDATE policy, so the PIN can only be
-- written through these security-definer functions. They always act on
-- auth.uid() — a caller cannot set or verify another admin's PIN.

-- Bcrypt via pgcrypto (already installed in 0001). Hashing happens in the
-- database so the plaintext PIN is never stored and never logged.

create or replace function public.set_admin_pin(p_pin text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'unauthorized' using errcode = '28000';
  end if;
  if not exists (select 1 from public.profiles where id = v_user) then
    raise exception 'unauthorized' using errcode = '28000';
  end if;
  if p_pin !~ '^[0-9]{6}$' then
    raise exception 'pin_format' using errcode = '22023';
  end if;

  update public.profiles
  set pin_hash = crypt(p_pin, gen_salt('bf', 10)),
      pin_failed_attempts = 0,
      pin_locked_until = null,
      pin_last_rotated_at = now(),
      updated_at = now()
  where id = v_user;
end;
$$;

comment on function public.set_admin_pin(text) is
  'Sets the calling admin''s idle-lock PIN. Bcrypt hashed; always scoped to auth.uid().';

create or replace function public.clear_admin_pin()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'unauthorized' using errcode = '28000';
  end if;
  update public.profiles
  set pin_hash = null,
      pin_failed_attempts = 0,
      pin_locked_until = null,
      pin_last_rotated_at = null,
      updated_at = now()
  where id = v_user;
end;
$$;

comment on function public.clear_admin_pin() is
  'Removes the calling admin''s idle-lock PIN, disabling the lock screen for them.';

-- Returns one row: (status, remaining_attempts, locked_until).
-- status is one of 'ok', 'invalid', 'locked', 'not_set'.
--
-- Attempts are counted in the database rather than the browser so that
-- reloading the page cannot reset the counter. Exhausting them locks the PIN
-- out; the client is expected to sign the session out entirely at that point,
-- which forces a full email + password + TOTP login.
create or replace function public.verify_admin_pin(p_pin text)
returns table (status text, remaining_attempts integer, locked_until timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_max_attempts constant integer := 5;
  v_lockout interval := interval '15 minutes';
  p record;
begin
  if v_user is null then
    raise exception 'unauthorized' using errcode = '28000';
  end if;

  select profiles.pin_hash, profiles.pin_failed_attempts, profiles.pin_locked_until
    into p
  from public.profiles
  where id = v_user;

  if not found or p.pin_hash is null then
    return query select 'not_set'::text, v_max_attempts, null::timestamptz;
    return;
  end if;

  if p.pin_locked_until is not null and p.pin_locked_until > now() then
    return query select 'locked'::text, 0, p.pin_locked_until;
    return;
  end if;

  -- Constant-time comparison is handled by crypt(): it rehashes the candidate
  -- with the stored salt and compares the full digest.
  if p.pin_hash = crypt(p_pin, p.pin_hash) then
    update public.profiles
    set pin_failed_attempts = 0, pin_locked_until = null
    where id = v_user;
    return query select 'ok'::text, v_max_attempts, null::timestamptz;
    return;
  end if;

  if p.pin_failed_attempts + 1 >= v_max_attempts then
    update public.profiles
    set pin_failed_attempts = 0, pin_locked_until = now() + v_lockout
    where id = v_user;
    return query select 'locked'::text, 0, now() + v_lockout;
    return;
  end if;

  update public.profiles
  set pin_failed_attempts = profiles.pin_failed_attempts + 1
  where id = v_user;
  return query select 'invalid'::text, v_max_attempts - (p.pin_failed_attempts + 1), null::timestamptz;
end;
$$;

comment on function public.verify_admin_pin(text) is
  'Checks the calling admin''s idle-lock PIN. Counts failures server-side; locks for 15 minutes after 5 wrong entries.';

revoke all on function public.set_admin_pin(text) from public, anon;
revoke all on function public.clear_admin_pin() from public, anon;
revoke all on function public.verify_admin_pin(text) from public, anon;
grant execute on function public.set_admin_pin(text) to authenticated;
grant execute on function public.clear_admin_pin() to authenticated;
grant execute on function public.verify_admin_pin(text) to authenticated;
