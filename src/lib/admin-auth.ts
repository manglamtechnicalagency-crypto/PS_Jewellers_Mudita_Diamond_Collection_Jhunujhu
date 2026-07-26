import { createSupabaseServerClient } from "./supabase/server";


export type AdminRole = "super_admin" | "admin" | "editor" | "viewer";

export const ADMIN_ROLES: AdminRole[] = ["super_admin", "admin", "editor", "viewer"];

// Testing-only escape hatch. Production always requires AAL2, even if an
// accidentally deployed environment variable is present.
export const isAdminMfaBypassed =
  process.env.ADMIN_MFA_BYPASS === "true" && process.env.NODE_ENV !== "production";

/**
 * Server-side admin gate.
 *
 * Order matters: session → assurance level → role. The MFA check must happen on
 * the server because the browser sign-in form cannot be trusted to run — a caller
 * can obtain session cookies straight from the Supabase token endpoint (the
 * publishable key is public by design) and skip the login UI entirely.
 */
export async function requireAdmin(allowedRoles: AdminRole[] = ADMIN_ROLES) {
  try {
    const client = await createSupabaseServerClient();
    if (!client) return { client: null, user: null, role: null, error: "not_configured" as const };

    const { data: userData, error: userError } = await client.auth.getUser();
    if (userError) {
      if (userError.status === 401 || (userError.status === 400 && /session|token|jwt/i.test(userError.message))) {
        return { client, user: null, role: null, error: "unauthorized" as const };
      }
      console.error("[admin-auth] user_lookup_failed", { errorName: userError.name });
      return { client, user: null, role: null, error: "internal" as const };
    }
    if (!userData.user) return { client, user: null, role: null, error: "unauthorized" as const };

    if (!isAdminMfaBypassed) {
      // Require a completed TOTP challenge, not merely an enrolled factor.
      const { data: assurance, error: assuranceError } = await client.auth.mfa.getAuthenticatorAssuranceLevel();
      if (assuranceError) {
        console.error("[admin-auth] aal_lookup_failed", { errorName: assuranceError.name });
        return { client, user: userData.user, role: null, error: "internal" as const };
      }
      if (assurance.currentLevel !== "aal2") {
        return { client, user: userData.user, role: null, error: "mfa_required" as const };
      }
    }

    const { data: profile, error: profileError } = await client
      .from("profiles")
      .select("id, display_name, role")
      .eq("id", userData.user.id)
      .single();

    if (profileError && profileError.code !== "PGRST116") {
      console.error("[admin-auth] profile_lookup_failed", { errorName: profileError.name, code: profileError.code });
      return { client, user: userData.user, role: null, error: "internal" as const };
    }

    const role = profile?.role as AdminRole | undefined;
    if (!role || !allowedRoles.includes(role)) {
      return { client, user: userData.user, role: role ?? null, error: "forbidden" as const };
    }

    return {
      client,
      user: userData.user,
      role,
      displayName: (profile?.display_name as string | null) ?? null,
      error: null,
    };
  } catch (error) {
    console.error("[admin-auth] unexpected_failure", { errorName: error instanceof Error ? error.name : "UnknownError" });
    return { client: null, user: null, role: null, error: "internal" as const };
  }
}

// Re-exported so existing call sites keep working; the implementation lives in
// a framework-free module so it can be unit tested.
export { hasValidSameOrigin } from "./request-origin";
