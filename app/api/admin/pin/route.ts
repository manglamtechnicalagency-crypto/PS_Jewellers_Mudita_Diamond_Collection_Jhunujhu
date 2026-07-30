import { NextResponse } from "next/server";
import { z } from "zod";
import { hasValidSameOrigin, requireAdmin } from "@/src/lib/admin-auth";

/**
 * Manages the calling admin's idle-lock PIN.
 *
 * The PIN is a convenience layer over an already-authenticated session, not a
 * credential in its own right — every route here still sits behind the full
 * requireAdmin gate (session, AAL2, role). Setting a PIN never grants access;
 * it only decides whether the lock screen appears after inactivity.
 */

const bodySchema = z.object({ pin: z.string().regex(/^[0-9]{6}$/) }).strict();

function errorResponse(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status, headers: { "Cache-Control": "no-store" } });
}

async function gate(request: Request) {
  if (!hasValidSameOrigin(request)) return { response: errorResponse(403, "invalid_origin", "Request origin is not allowed") } as const;
  const auth = await requireAdmin();
  if (auth.error === "not_configured") return { response: errorResponse(503, "not_configured", "Admin storage is not configured") } as const;
  if (auth.error === "unauthorized" || auth.error === "mfa_required") return { response: errorResponse(401, "unauthorized", "Authentication is required") } as const;
  if (auth.error === "internal") return { response: errorResponse(500, "internal_error", "Admin authentication is temporarily unavailable") } as const;
  if (auth.error === "forbidden") return { response: errorResponse(403, "forbidden", "Your account is not assigned an admin role") } as const;
  return { auth } as const;
}

export async function GET(request: Request) {
  const result = await gate(request);
  if ("response" in result) return result.response;
  const { data, error } = await result.auth.client
    .from("profiles")
    .select("pin_hash, pin_last_rotated_at")
    .eq("id", result.auth.user.id)
    .single();
  if (error) return errorResponse(500, "database_error", "PIN status could not be read");
  // Never return the hash itself — only whether one exists.
  return NextResponse.json(
    { data: { configured: Boolean(data?.pin_hash), lastRotatedAt: data?.pin_last_rotated_at ?? null } },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  const result = await gate(request);
  if ("response" in result) return result.response;
  let body: unknown;
  try { body = await request.json(); } catch { return errorResponse(400, "invalid_json", "Request body must be valid JSON"); }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return errorResponse(422, "validation_error", "The PIN must be exactly 6 digits");

  const { error } = await result.auth.client.rpc("set_admin_pin", { p_pin: parsed.data.pin });
  if (error) {
    console.error("[admin-pin] set_failed", { code: error.code });
    return errorResponse(500, "database_error", "The PIN could not be saved");
  }
  return NextResponse.json({ data: { configured: true } }, { headers: { "Cache-Control": "no-store" } });
}

export async function DELETE(request: Request) {
  const result = await gate(request);
  if ("response" in result) return result.response;
  const { error } = await result.auth.client.rpc("clear_admin_pin");
  if (error) {
    console.error("[admin-pin] clear_failed", { code: error.code });
    return errorResponse(500, "database_error", "The PIN could not be removed");
  }
  return NextResponse.json({ data: { configured: false } }, { headers: { "Cache-Control": "no-store" } });
}
