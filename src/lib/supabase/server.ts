import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createSupabaseServerClient() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey =
    process.env.SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !publishableKey) return null;

  const cookieStore = await cookies();
  return createServerClient(url, publishableKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(values) {
        try {
          values.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Components cannot always write cookies; middleware refreshes them.
        }
      },
    },
  });
}

export async function getAdminUser() {
  const client = await createSupabaseServerClient();
  if (!client) return null;
  try {
    const { data, error } = await client.auth.getUser();
    if (error) {
      console.error("[supabase-server] user_lookup_failed", { errorName: error.name });
      return null;
    }
    return data.user;
  } catch (error) {
    console.error("[supabase-server] user_lookup_failed", { errorName: error instanceof Error ? error.name : "UnknownError" });
    return null;
  }
}
