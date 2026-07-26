import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { buildContentSecurityPolicy } from "./src/lib/security-headers";

const isDevelopment = process.env.NODE_ENV === "development";

function createNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}

/**
 * Refreshes the Supabase session for admin routes and stamps a per-request
 * nonce-based CSP on every response. Next reads `x-nonce` and applies it to the
 * scripts it emits, which is what lets us drop `'unsafe-inline'` from script-src.
 */
export async function proxy(request: NextRequest) {
  const nonce = createNonce();
  const csp = buildContentSecurityPolicy({ nonce, isDevelopment });

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("content-security-policy", csp);

  const applyCsp = (response: NextResponse) => {
    response.headers.set("Content-Security-Policy", csp);
    return response;
  };

  const isAdminRoute = request.nextUrl.pathname.startsWith("/admin");

  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey =
    process.env.SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Storefront routes need the CSP but no session refresh.
  if (!isAdminRoute || !url || !publishableKey) {
    return applyCsp(NextResponse.next({ request: { headers: requestHeaders } }));
  }

  let response = NextResponse.next({ request: { headers: requestHeaders } });
  const client = createServerClient(url, publishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(values) {
        values.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request: { headers: requestHeaders } });
        values.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  try {
    await client.auth.getUser();
  } catch (error) {
    // A transient auth refresh failure should not turn every admin request into
    // an unhandled middleware exception; the page/API will enforce auth again.
    console.error("[supabase-proxy] session_refresh_failed", { errorName: error instanceof Error ? error.name : "UnknownError" });
  }

  return applyCsp(response);
}

export const config = {
  matcher: [
    // Everything except Next's static assets and the image optimizer, which are
    // served before the proxy runs and do not execute scripts.
    "/((?!_next/static|_next/image|favicon.ico|assets/|.*\\.(?:png|jpg|jpeg|gif|webp|avif|svg|ico|mp4|webm)$).*)",
  ],
};
