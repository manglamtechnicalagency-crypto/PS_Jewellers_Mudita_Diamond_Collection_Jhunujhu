import { NextResponse } from "next/server";
import { z } from "zod";
import { hasValidSameOrigin, requireAdmin } from "@/src/lib/admin-auth";
import { readJsonWithLimit } from "@/src/lib/request-body";

const schema = z
  .object({
    ids: z.array(z.string().uuid()).min(1).max(100),
    status: z.enum(["draft", "published", "archived"]).optional(),
    stockStatus: z
      .enum(["in_stock", "low_stock", "out_of_stock", "made_to_order"])
      .optional(),
    priceAdjustment: z
      .number()
      .finite()
      .min(-100000000)
      .max(100000000)
      .optional(),
    tags: z.array(z.string().trim().min(1).max(80)).max(100).optional(),
  })
  .strict()
  .refine(
    (value) =>
      value.status ||
      value.stockStatus ||
      value.priceAdjustment !== undefined ||
      value.tags,
    "At least one bulk change is required",
  );

export async function PATCH(request: Request) {
  if (!hasValidSameOrigin(request))
    return NextResponse.json(
      { error: { message: "Request origin is not allowed" } },
      { status: 403 },
    );
  const auth = await requireAdmin(["super_admin", "admin", "editor"]);
  if (auth.error === "not_configured")
    return NextResponse.json(
      { error: { message: "Admin storage is not configured" } },
      { status: 503 },
    );
  if (auth.error !== null)
    return NextResponse.json(
      { error: { message: "You do not have permission" } },
      { status: auth.error === "forbidden" ? 403 : 401 },
    );
  const bodyResult = await readJsonWithLimit(request, 128_000);
  if (!bodyResult.ok) {
    return NextResponse.json(
      { error: { message: bodyResult.reason === "too_large" ? "Request body is too large" : "Invalid JSON" } },
      { status: bodyResult.reason === "too_large" ? 413 : 400 },
    );
  }
  const parsed = schema.safeParse(bodyResult.value);
  if (!parsed.success)
    return NextResponse.json(
      { error: { message: "Bulk fields are invalid" } },
      { status: 422 },
    );
  const change = {
    ...(parsed.data.status ? { status: parsed.data.status } : {}),
    ...(parsed.data.stockStatus
      ? { stock_status: parsed.data.stockStatus }
      : {}),
    ...(parsed.data.tags ? { tags: parsed.data.tags } : {}),
  };
  const { data, error } = await auth.client.rpc("bulk_update_products_atomic", {
    p_ids: parsed.data.ids,
    p_change: change,
    p_price_adjustment: parsed.data.priceAdjustment ?? null,
  });
  if (error)
    return NextResponse.json(
      { error: { message: error.code === "22023" ? error.message : "Bulk update failed" } },
      { status: error.code === "P0002" ? 404 : error.code === "22023" ? 422 : 500 },
    );
  return NextResponse.json(
    { data: { updated: data ?? 0 } },
    { headers: { "Cache-Control": "no-store" } },
  );
}
