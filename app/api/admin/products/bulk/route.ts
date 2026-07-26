import { NextResponse } from "next/server";
import { z } from "zod";
import { hasValidSameOrigin, requireAdmin } from "@/src/lib/admin-auth";

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
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { message: "Invalid JSON" } },
      { status: 400 },
    );
  }
  const parsed = schema.safeParse(body);
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
  if (parsed.data.priceAdjustment !== undefined) {
    const { data: rows, error: readError } = await auth.client
      .from("products")
      .select("id, base_price, price_mode")
      .in("id", parsed.data.ids)
      .is("deleted_at", null);
    if (readError)
      return NextResponse.json(
        { error: { message: "Products could not be loaded" } },
        { status: 500 },
      );
    if ((rows ?? []).some((row) => row.price_mode !== "fixed"))
      return NextResponse.json(
        {
          error: {
            message:
              "Bulk price adjustments require fixed-price products; update weight-based pricing through metal rates or product pricing fields.",
          },
        },
        { status: 422 },
      );
    for (const row of rows ?? []) {
      const nextBasePrice = Math.max(
        0,
        Number(row.base_price ?? 0) + parsed.data.priceAdjustment,
      );
      const { error: updateError } = await auth.client
        .from("products")
        .update({
          ...change,
          base_price: nextBasePrice,
          updated_by: auth.user.id,
        })
        .eq("id", row.id);
      const { data: rawCalculation } = await auth.client
        .rpc("calculate_product_price", { product_id: row.id })
        .maybeSingle();
      const calculation = rawCalculation as {
        is_priceable?: boolean;
        total?: number;
      } | null;
      const { error } = updateError
        ? { error: updateError }
        : await auth.client
            .from("products")
            .update({
              display_price: calculation?.is_priceable
                ? calculation.total
                : null,
              price_on_request: !calculation?.is_priceable,
              updated_by: auth.user.id,
            })
            .eq("id", row.id);
      if (error)
        return NextResponse.json(
          { error: { message: "Bulk update failed" } },
          { status: 500 },
        );
    }
  } else {
    const { error } = await auth.client
      .from("products")
      .update({ ...change, updated_by: auth.user.id })
      .in("id", parsed.data.ids)
      .is("deleted_at", null);
    if (error)
      return NextResponse.json(
        { error: { message: "Bulk update failed" } },
        { status: 500 },
      );
  }
  return NextResponse.json(
    { data: { updated: parsed.data.ids.length } },
    { headers: { "Cache-Control": "no-store" } },
  );
}
