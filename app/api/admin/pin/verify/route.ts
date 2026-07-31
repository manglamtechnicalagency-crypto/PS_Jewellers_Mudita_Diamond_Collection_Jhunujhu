import { NextResponse } from "next/server";
import { z } from "zod";
import { hasValidSameOrigin, requireAdmin } from "@/src/lib/admin-auth";
import { readJsonWithLimit } from "@/src/lib/request-body";

/**
 * Verifies the idle-lock PIN for the current session.
 *
 * Failure counting lives in the database (see verify_admin_pin in
 * 0018_admin_pin_lock.sql) so that reloading the page cannot reset it. After
 * five wrong entries the PIN locks for fifteen minutes and the client signs the
 * session out, forcing a full email + password + TOTP login.
 */

const bodySchema = z.object({ pin: z.string().regex(/^[0-9]{6}$/) }).strict();

function errorResponse(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  if (!hasValidSameOrigin(request)) return errorResponse(403, "invalid_origin", "Request origin is not allowed");
  const auth = await requireAdmin();
  if (auth.error === "not_configured") return errorResponse(503, "not_configured", "Admin storage is not configured");
  if (auth.error === "unauthorized" || auth.error === "mfa_required") return errorResponse(401, "unauthorized", "Authentication is required");
  if (auth.error === "internal") return errorResponse(500, "internal_error", "Admin authentication is temporarily unavailable");
  if (auth.error === "forbidden") return errorResponse(403, "forbidden", "Your account is not assigned an admin role");

  const bodyResult = await readJsonWithLimit(request, 4_096);
  if (!bodyResult.ok) return errorResponse(bodyResult.reason === "too_large" ? 413 : 400, bodyResult.reason === "too_large" ? "payload_too_large" : "invalid_json", bodyResult.reason === "too_large" ? "Request body is too large" : "Request body must be valid JSON");
  const parsed = bodySchema.safeParse(bodyResult.value);
  // A malformed PIN is treated as a wrong PIN rather than a distinct error, so
  // the response shape gives an attacker nothing extra to work with.
  if (!parsed.success) return NextResponse.json({ data: { status: "invalid", remainingAttempts: null } }, { status: 401, headers: { "Cache-Control": "no-store" } });

  const { data, error } = await auth.client.rpc("verify_admin_pin", { p_pin: parsed.data.pin }).maybeSingle();
  if (error) {
    console.error("[admin-pin-verify] failed", { code: error.code });
    return errorResponse(500, "database_error", "The PIN could not be verified");
  }
  const result = data as { status?: string; remaining_attempts?: number; locked_until?: string | null } | null;
  const status = result?.status ?? "invalid";
  const payload = {
    data: {
      status,
      remainingAttempts: result?.remaining_attempts ?? null,
      lockedUntil: result?.locked_until ?? null,
    },
  };
  // "not_set" means no PIN is configured, so there is nothing to unlock — the
  // client should simply drop the overlay rather than trap the operator.
  const httpStatus = status === "ok" || status === "not_set" ? 200 : 401;
  return NextResponse.json(payload, { status: httpStatus, headers: { "Cache-Control": "no-store" } });
}
