import { NextResponse } from "next/server";
import { z } from "zod";
import { hasValidSameOrigin, requireAdmin } from "@/src/lib/admin-auth";
import { readJsonWithLimit } from "@/src/lib/request-body";

const termSchema = z.object({
  kind: z.enum(["category", "collection", "subcategory"]),
  name: z.string().trim().min(1).max(100),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(120),
  parentId: z.string().uuid().nullable().optional(),
  displayOrder: z.number().int().min(0).max(100000).default(0),
}).strict();

function response(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status, headers: { "Cache-Control": "no-store" } });
}

async function writeGate(request: Request) {
  if (!hasValidSameOrigin(request)) return { response: response(403, "invalid_origin", "Request origin is not allowed") } as const;
  const auth = await requireAdmin(["super_admin", "admin", "editor"]);
  if (auth.error === "not_configured") return { response: response(503, "not_configured", "Admin storage is not configured") } as const;
  if (auth.error === "internal") return { response: response(500, "internal_error", "Admin authentication is temporarily unavailable") } as const;
  if (auth.error !== null) return { response: response(auth.error === "forbidden" ? 403 : 401, "unauthorized", "You do not have permission to manage taxonomy") } as const;
  return { auth } as const;
}

export async function GET() {
  const auth = await requireAdmin();
  if (auth.error === "not_configured") return NextResponse.json({ error: { code: "not_configured", message: "Admin storage is not configured" } }, { status: 503 });
  if (auth.error !== null) return NextResponse.json({ error: { code: "unauthorized", message: "Authentication is required" } }, { status: 401 });
  const { data, error } = await auth.client.from("taxonomy_terms").select("id, kind, name, slug").eq("is_active", true).order("kind").order("display_order");
  if (error) return NextResponse.json({ error: { code: "database_error", message: "Taxonomy could not be loaded" } }, { status: 500 });
  return NextResponse.json({ data }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const gate = await writeGate(request);
  if ("response" in gate) return gate.response;
  const bodyResult = await readJsonWithLimit(request, 32_000);
  if (!bodyResult.ok) return response(bodyResult.reason === "too_large" ? 413 : 400, bodyResult.reason === "too_large" ? "payload_too_large" : "invalid_json", bodyResult.reason === "too_large" ? "Request body is too large" : "Request body must be valid JSON");
  const parsed = termSchema.safeParse(bodyResult.value);
  if (!parsed.success) return response(422, "validation_error", "Taxonomy fields are invalid");
  const term = parsed.data;
  const { data, error } = await gate.auth.client.from("taxonomy_terms").insert({ kind: term.kind, name: term.name, slug: term.slug, parent_id: term.parentId ?? null, display_order: term.displayOrder }).select("id, kind, name, slug, parent_id, display_order, is_active").single();
  if (error) return response(error.code === "23505" ? 409 : 500, error.code === "23505" ? "duplicate_term" : "database_error", error.code === "23505" ? "A taxonomy term with this slug already exists" : "Taxonomy term could not be created");
  return NextResponse.json({ data }, { status: 201, headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(request: Request) {
  const gate = await writeGate(request);
  if ("response" in gate) return gate.response;
  const id = new URL(request.url).searchParams.get("id");
  if (!id || !z.string().uuid().safeParse(id).success) return response(422, "validation_error", "Taxonomy id is invalid");
  const bodyResult = await readJsonWithLimit(request, 32_000);
  if (!bodyResult.ok) return response(bodyResult.reason === "too_large" ? 413 : 400, bodyResult.reason === "too_large" ? "payload_too_large" : "invalid_json", bodyResult.reason === "too_large" ? "Request body is too large" : "Request body must be valid JSON");
  const parsed = termSchema.partial().safeParse(bodyResult.value);
  if (!parsed.success) return response(422, "validation_error", "Taxonomy fields are invalid");
  const term = parsed.data;
  const update = { ...(term.kind === undefined ? {} : { kind: term.kind }), ...(term.name === undefined ? {} : { name: term.name }), ...(term.slug === undefined ? {} : { slug: term.slug }), ...(term.parentId === undefined ? {} : { parent_id: term.parentId }), ...(term.displayOrder === undefined ? {} : { display_order: term.displayOrder }) };
  const { data, error } = await gate.auth.client.from("taxonomy_terms").update(update).eq("id", id).select("id, kind, name, slug, parent_id, display_order, is_active").single();
  if (error) return response(error.code === "23505" ? 409 : 500, error.code === "23505" ? "duplicate_term" : "database_error", error.code === "23505" ? "A taxonomy term with this slug already exists" : "Taxonomy term could not be updated");
  return NextResponse.json({ data }, { headers: { "Cache-Control": "no-store" } });
}

export async function DELETE(request: Request) {
  const gate = await writeGate(request);
  if ("response" in gate) return gate.response;
  const id = new URL(request.url).searchParams.get("id");
  if (!id || !z.string().uuid().safeParse(id).success) return response(422, "validation_error", "Taxonomy id is invalid");
  const { error } = await gate.auth.client.from("taxonomy_terms").update({ is_active: false }).eq("id", id).eq("is_active", true);
  if (error) return response(error.code === "23503" ? 409 : 500, error.code === "23503" ? "term_in_use" : "database_error", error.code === "23503" ? "This taxonomy term is still in use" : "Taxonomy term could not be archived");
  return NextResponse.json({ data: { id } }, { headers: { "Cache-Control": "no-store" } });
}
