import type { ReactNode } from "react";
import { requireAdmin } from "@/src/lib/admin-auth";
import IdleLock from "./_components/IdleLock";

export const dynamic = "force-dynamic";

/**
 * Mounts the idle lock for signed-in admins who have configured a PIN.
 *
 * Deliberately does NOT gate access — each admin page already runs its own
 * requireAdmin check and redirects. Adding a second gate here would only
 * duplicate that logic, and this layout also wraps the unauthenticated pages
 * (login, forgot-password, reset-password), which must stay reachable.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const auth = await requireAdmin();

  // Unauthenticated, MFA-incomplete, or non-admin: nothing to lock.
  if (auth.error !== null || !auth.client) return <>{children}</>;

  const { data } = await auth.client
    .from("profiles")
    .select("pin_hash")
    .eq("id", auth.user.id)
    .single();

  return (
    <>
      {children}
      {data?.pin_hash ? <IdleLock displayName={auth.displayName ?? ""} /> : null}
    </>
  );
}
