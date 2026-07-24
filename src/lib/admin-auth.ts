import { createSupabaseServerClient } from "./supabase/server";

export type AdminRole = "super_admin" | "admin" | "editor" | "viewer";

export async function requireAdmin(allowedRoles: AdminRole[] = ["super_admin", "admin", "editor", "viewer"]) {
  const client = await createSupabaseServerClient();
  if (!client) return { client: null, user: null, role: null, error: "not_configured" as const };

  const { data: userData } = await client.auth.getUser();
  if (!userData.user) return { client, user: null, role: null, error: "unauthorized" as const };

  const { data: profile } = await client.from("profiles").select("role").eq("id", userData.user.id).single();
  const role = profile?.role as AdminRole | undefined;
  if (!role || !allowedRoles.includes(role)) return { client, user: userData.user, role: role ?? null, error: "forbidden" as const };

  return { client, user: userData.user, role, error: null };
}

export function hasValidSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const requestUrl = new URL(request.url);
  return origin === requestUrl.origin;
}
