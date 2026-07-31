-- Documentation only. Purely additive: this migration adds COMMENTs and changes
-- no schema, no policy, no grant, and no data.
--
-- WHY public.profiles HAS RESTRICTED SELECT/UPDATE POLICIES AND NO PUBLIC INSERT/DELETE POLICY
-- =========================================================================
--
-- 0001 enabled RLS on public.profiles and created the read policy. Migration
-- 0002 later added a narrowly scoped self-update policy and an admin policy:
--
--   create policy "users read own profile" on public.profiles
--     for select using (id = auth.uid() or public.is_admin());
--
-- The update policies are guarded by `guard_profile_role_change()` below. They
-- allow profile maintenance while preventing non-super-admin role changes and
-- preventing any admin from changing their own role. There are still no public
-- insert/delete policies.
--
-- Every legitimate write already has a security-definer path that runs as the
-- table owner and therefore bypasses RLS:
--
--   public.handle_new_user()   (0001) — trigger on auth.users; inserts the row.
--   public.set_admin_pin()     (0018) — writes pin_hash for auth.uid() only.
--   public.clear_admin_pin()   (0018) — clears the PIN for auth.uid() only.
--   public.verify_admin_pin()  (0018) — updates the failure counter / lockout.
--
-- Each of those functions scopes its UPDATE to `where id = auth.uid()` and
-- touches only the columns it owns. None of them can write `role`.
--
-- THE ESCALATION GUARD
-- ----------------------------
-- The obvious-looking "let users edit their own profile" policy:
--
--   create policy "users update own profile" on public.profiles
--     for update using (id = auth.uid()) with check (id = auth.uid());
--
-- would be a privilege-escalation bug here, because `role` lives on this same
-- row. The deployed policies are safe only because the BEFORE UPDATE trigger
-- rejects every non-super-admin role change and blocks self-role changes.
--
--   update public.profiles set role = 'super_admin' where id = auth.uid();
--
-- and the USING and WITH CHECK clauses would both still be satisfied. Since
-- public.is_admin() and public.is_admin_or_editor() read `role`, and every
-- catalogue/media/settings policy is built on those two functions, a single
-- self-update would hand the caller the whole admin surface. The server-side
-- gate in src/lib/admin-auth.ts reads the same column, so the API would agree.
--
-- IF PROFILE WRITE POLICIES CHANGE
-- ----------------------------------------
-- Do not remove or weaken the existing role-change trigger. If broader profile
-- writes become necessary, either:
--   (a) add another security-definer function that updates only the specific
--       columns and always filters on auth.uid() (the pattern in 0018); or
--   (b) if a policy is genuinely required, pair it with a column-level
--       `revoke update (role, ...) on public.profiles from authenticated` plus
--       a BEFORE UPDATE trigger that rejects any change to `role` for a
--       non-admin caller. A WITH CHECK clause alone is not sufficient — it
--       cannot see the previous value of the row.

comment on table public.profiles is
  'Admin user records (one per auth.users row). RLS permits self-read and guarded profile updates, plus admin profile management. guard_profile_role_change prevents non-super-admin role changes and self-role changes. Inserts are handled by handle_new_user; PIN fields are written through security-definer functions. See migration 0019 for the rationale.';

comment on column public.profiles.role is
  'Privilege level read by public.is_admin() and public.is_admin_or_editor(), which back nearly every RLS policy in the schema. Self-service writes must never be possible: this column is only writable by a superuser/service role or a security-definer function that does not expose it. See migration 0019.';

comment on policy "users read own profile" on public.profiles is
  'Grants read of a caller''s own row plus full read to admins. Profile updates are separately guarded by the migration 0002 policies and guard_profile_role_change trigger.';
