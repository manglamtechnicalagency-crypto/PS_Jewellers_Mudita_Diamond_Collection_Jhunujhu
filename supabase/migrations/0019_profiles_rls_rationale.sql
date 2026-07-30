-- Documentation only. Purely additive: this migration adds COMMENTs and changes
-- no schema, no policy, no grant, and no data.
--
-- WHY public.profiles HAS A SELECT POLICY AND NO INSERT/UPDATE/DELETE POLICY
-- =========================================================================
--
-- 0001 enabled RLS on public.profiles and created exactly one policy:
--
--   create policy "users read own profile" on public.profiles
--     for select using (id = auth.uid() or public.is_admin());
--
-- The absence of write policies is deliberate, not an oversight. With RLS
-- enabled and no permissive policy for a command, that command is denied for
-- every non-superuser role. So `authenticated` can read its own row and can
-- write nothing at all, directly.
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
-- THE ESCALATION THIS PREVENTS
-- ----------------------------
-- The obvious-looking "let users edit their own profile" policy:
--
--   create policy "users update own profile" on public.profiles
--     for update using (id = auth.uid()) with check (id = auth.uid());
--
-- is a privilege-escalation bug here, because `role` lives on this same row.
-- Postgres row-level security is row-scoped, not column-scoped: that policy
-- authorises the row, not the columns, so any signed-in user could run
--
--   update public.profiles set role = 'super_admin' where id = auth.uid();
--
-- and the USING and WITH CHECK clauses would both still be satisfied. Since
-- public.is_admin() and public.is_admin_or_editor() read `role`, and every
-- catalogue/media/settings policy is built on those two functions, a single
-- self-update would hand the caller the whole admin surface. The server-side
-- gate in src/lib/admin-auth.ts reads the same column, so the API would agree.
--
-- IF A WRITE POLICY EVER BECOMES NECESSARY
-- ----------------------------------------
-- Do not add a broad UPDATE policy. Either:
--   (a) add another security-definer function that updates only the specific
--       columns and always filters on auth.uid() (the pattern in 0018); or
--   (b) if a policy is genuinely required, pair it with a column-level
--       `revoke update (role, ...) on public.profiles from authenticated` plus
--       a BEFORE UPDATE trigger that rejects any change to `role` for a
--       non-admin caller. A WITH CHECK clause alone is not sufficient — it
--       cannot see the previous value of the row.

comment on table public.profiles is
  'Admin user records (one per auth.users row). RLS: SELECT only ("users read own profile"). There is deliberately no INSERT/UPDATE/DELETE policy — all writes go through the security-definer functions handle_new_user, set_admin_pin, clear_admin_pin and verify_admin_pin. Adding a permissive UPDATE policy would let an authenticated user set their own role column and escalate to super_admin, because RLS is row-scoped and cannot restrict which columns an authorised UPDATE touches. See migration 0019 for the full rationale.';

comment on column public.profiles.role is
  'Privilege level read by public.is_admin() and public.is_admin_or_editor(), which back nearly every RLS policy in the schema. Self-service writes must never be possible: this column is only writable by a superuser/service role or a security-definer function that does not expose it. See migration 0019.';

comment on policy "users read own profile" on public.profiles is
  'Only policy on this table. Grants read of a caller''s own row (plus full read to admins). Write commands have no policy and are therefore denied by RLS for all non-superuser roles — that is intentional. See migration 0019.';
