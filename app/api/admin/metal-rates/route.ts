import { NextResponse } from "next/server";
import { z } from "zod";
import { hasValidSameOrigin, requireAdmin } from "@/src/lib/admin-auth";

const sourceSchema = z.enum(["manual", "market_feed", "supplier", "import"]);
const rateSchema = z.object({
  metal: z.string().trim().min(1).max(40), purity: z.string().trim().min(1).max(20),
  ratePerGram: z.number().finite().positive().max(100000000), effectiveAt: z.string().datetime().optional(),
  manualOverride: z.boolean().default(true), source: sourceSchema.default("manual"),
  reason: z.string().trim().min(1).max(500),
}).strict();

function errorResponse(status: number, code: string, message: string) { return NextResponse.json({ error: { code, message } }, { status, headers: { "Cache-Control": "no-store" } }); }
async function admin(request: Request, roles: ("super_admin" | "admin" | "editor" | "viewer")[] = ["super_admin", "admin"]) {
  if (!hasValidSameOrigin(request) && request.method !== "GET") return { response: errorResponse(403, "invalid_origin", "Request origin is not allowed") } as const;
  const auth = await requireAdmin(roles);
  if (auth.error === "not_configured") return { response: errorResponse(503, "not_configured", "Admin storage is not configured") } as const;
  if (auth.error !== null) return { response: errorResponse(auth.error === "forbidden" ? 403 : 401, "unauthorized", "Authentication is required") } as const;
  return { auth } as const;
}

export async function GET(request: Request) {
  const gate = await admin(request, ["super_admin", "admin", "editor", "viewer"]);
  if ("response" in gate) return gate.response;
  const [rates, history, schedules] = await Promise.all([
    gate.auth.client.from("metal_rates").select("id, metal, purity, rate_per_gram, effective_at, manual_override, updated_by, source, reason").order("metal").order("purity"),
    gate.auth.client.from("metal_rate_history").select("id, metal, purity, previous_rate, new_rate, effective_at, created_at, changed_by, source, reason").order("created_at", { ascending: false }).limit(100),
    gate.auth.client.from("metal_rate_schedules").select("id, metal, purity, rate_per_gram, effective_at, source, reason, created_by, applied_at, created_at").is("applied_at", null).order("effective_at"),
  ]);
  if (rates.error || history.error || schedules.error) return errorResponse(500, "database_error", "Metal rates could not be loaded");
  return NextResponse.json({ data: rates.data, history: history.data, schedules: schedules.data }, { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(request: Request) {
  const gate = await admin(request);
  if ("response" in gate) return gate.response;
  let body: unknown; try { body = await request.json(); } catch { return errorResponse(400, "invalid_json", "Request body must be valid JSON"); }
  const parsed = rateSchema.safeParse(body);
  if (!parsed.success) return errorResponse(422, "validation_error", "Metal rate fields are invalid; reason is required");
  const rate = parsed.data;
  const effectiveAt = rate.effectiveAt ? new Date(rate.effectiveAt) : new Date();
  if (effectiveAt.getTime() > Date.now()) {
    if (effectiveAt.getTime() > Date.now() + 366 * 24 * 60 * 60 * 1000) return errorResponse(422, "validation_error", "A rate cannot be scheduled more than one year ahead");
    const { data, error } = await gate.auth.client.from("metal_rate_schedules").insert({ metal: rate.metal, purity: rate.purity, rate_per_gram: rate.ratePerGram, effective_at: effectiveAt.toISOString(), source: rate.source, reason: rate.reason, created_by: gate.auth.user.id }).select("id, metal, purity, rate_per_gram, effective_at, source, reason, created_at").single();
    if (error) return errorResponse(error.code === "23505" ? 409 : 500, error.code === "23505" ? "duplicate_schedule" : "database_error", error.code === "23505" ? "That rate is already scheduled" : "Metal rate schedule could not be saved");
    return NextResponse.json({ data, scheduled: true }, { headers: { "Cache-Control": "no-store" } });
  }
  const { data, error } = await gate.auth.client.from("metal_rates").upsert({ metal: rate.metal, purity: rate.purity, rate_per_gram: rate.ratePerGram, effective_at: effectiveAt.toISOString(), manual_override: rate.manualOverride, updated_by: gate.auth.user.id, source: rate.source, reason: rate.reason }, { onConflict: "metal,purity" }).select("id, metal, purity, rate_per_gram, effective_at, manual_override, source, reason").single();
  if (error) return errorResponse(500, "database_error", "Metal rate could not be saved");
  return NextResponse.json({ data, recalculated: true }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const gate = await admin(request);
  if ("response" in gate) return gate.response;
  let body: unknown; try { body = await request.json(); } catch { return errorResponse(400, "invalid_json", "Request body must be valid JSON"); }
  const parsed = z.object({ action: z.literal("apply_due") }).strict().safeParse(body);
  if (!parsed.success) return errorResponse(422, "validation_error", "Action is invalid");
  const { data, error } = await gate.auth.client.rpc("apply_due_metal_rate_schedules");
  if (error) return errorResponse(500, "database_error", "Due metal rates could not be applied");
  return NextResponse.json({ applied: data ?? 0, recalculated: true }, { headers: { "Cache-Control": "no-store" } });
}
