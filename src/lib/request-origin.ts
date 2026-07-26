/**
 * Pure request predicates, deliberately free of Next and Supabase imports so
 * they can be unit tested without a framework runtime.
 */

/**
 * Rejects cross-site state-changing requests.
 *
 * A browser always sends `Origin` on cross-origin POSTs, so a mismatch is a
 * definite reject. A missing `Origin` means either a same-origin non-CORS
 * request or a non-browser client; we additionally require `Sec-Fetch-Site` to
 * be same-origin/none when the browser supplies it.
 */
export function hasValidSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  const requestUrl = new URL(request.url);

  if (origin) return origin === requestUrl.origin;

  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite) return fetchSite === "same-origin" || fetchSite === "none";

  // Neither header present: not a modern browser context. Allow, since such a
  // client cannot carry the victim's cookies in a CSRF scenario.
  return true;
}
