import { NextResponse } from "next/server";
import { z } from "zod";
import { hasValidSameOrigin } from "@/src/lib/request-origin";
import { createSupabaseServerClient } from "@/src/lib/supabase/server";
import { randomUUID } from "node:crypto";
import { consumeUploadRateLimit, getTrustedClientKey } from "@/src/lib/upload-rate-limit";

const enquirySchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    email: z.string().trim().email().max(254).optional().or(z.literal("")),
    phone: z
      .string()
      .trim()
      .regex(/^[0-9+()\-.\s]{6,20}$/),
    message: z.string().trim().min(1).max(4000),
    source: z.enum(["product_enquiry", "whatsapp"]),
    preferredContact: z.enum(["email", "phone", "whatsapp"]),
    productIds: z.array(z.string().trim().min(1).max(100)).max(50),
    idempotencyKey: z.string().uuid().optional(),
    selectedOptions: z
      .record(z.string().max(80), z.string().max(120))
      .refine((value) => Object.keys(value).length <= 10, "Too many selected options")
      .optional(),
    consent: z.literal(true),
    pageUrl: z.string().url().max(1000).optional(),
    referrer: z.string().url().max(1000).optional(),
    utmSource: z.string().max(120).optional(),
    utmMedium: z.string().max(120).optional(),
    utmCampaign: z.string().max(120).optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.preferredContact === "email" && !value.email)
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["email"], message: "Email is required when email is the preferred contact" });
  });

function errorResponse(status: number, code: string, message: string) {
  return NextResponse.json(
    { error: { code, message } },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  if (!hasValidSameOrigin(request))
    return errorResponse(
      403,
      "invalid_origin",
      "Request origin is not allowed",
    );
  const clientKey = getTrustedClientKey(request);
  if (!clientKey.trusted || !clientKey.key)
    return errorResponse(503, "rate_limit_unavailable", "Enquiry requests cannot be attributed to a client");
  const limit = await consumeUploadRateLimit(`enquiry:${clientKey.key}`);
  if (limit.limited)
    return NextResponse.json({ error: { code: "rate_limited", message: "Too many enquiries" } }, { status: 429, headers: { "Cache-Control": "no-store", "Retry-After": String(limit.retryAfterSeconds) } });
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 32_000)
    return errorResponse(413, "payload_too_large", "Enquiry is too large");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(
      400,
      "invalid_json",
      "Request body must be valid JSON",
    );
  }
  const parsed = enquirySchema.safeParse(body);
  if (!parsed.success)
    return errorResponse(422, "validation_error", "Enquiry fields are invalid");

  const client = await createSupabaseServerClient();
  if (!client)
    return errorResponse(
      503,
      "not_configured",
      "Enquiries are temporarily unavailable",
    );
  const whatsappNumber = (
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? ""
  ).replace(/\D/g, "");
  if (!/^\d{8,15}$/.test(whatsappNumber))
    return errorResponse(
      503,
      "whatsapp_not_configured",
      "Showroom WhatsApp is not configured",
    );

  const productIds = parsed.data.productIds;
  if (productIds.some((id) => !z.string().uuid().safeParse(id).success))
    return errorResponse(422, "validation_error", "Product IDs are invalid");
  const { data: products, error: productsError } = productIds.length
    ? await client
        .from("products")
        .select(
      "id, name, sku, slug, metal_purity, display_price, price_on_request, stock_status, category_id",
        )
        .in("id", productIds)
        .eq("status", "published")
        .is("deleted_at", null)
    : { data: [], error: null };
  if (productsError || products?.length !== productIds.length)
    return errorResponse(
      422,
      "product_unavailable",
      "One or more selected products are no longer available",
    );
  if (parsed.data.idempotencyKey) {
    const { data: existing } = await client
      .from("enquiries")
      .select("id, enquiry_number")
      .eq("idempotency_key", parsed.data.idempotencyKey)
      .maybeSingle();
    if (existing)
      return NextResponse.json(
        {
          data: {
            accepted: true,
            id: existing.id,
            enquiryNumber: existing.enquiry_number,
            whatsappUrl: `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`Hello PS Jewellers, my enquiry ID is ${existing.enquiry_number}. Please confirm today's price and showroom availability.`)}`,
          },
        },
        { headers: { "Cache-Control": "no-store" } },
      );
  }
  const productId = productIds.length === 1 ? productIds[0] : null;
  const enquiryNumber = `PSJ-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${randomUUID().slice(0, 8).toUpperCase()}`;
  const { data: inserted, error } = await client
    .from("enquiries")
    .insert({
      enquiry_number: enquiryNumber,
      name: parsed.data.name,
      email: parsed.data.email || null,
      phone: parsed.data.phone,
      message: parsed.data.message,
      product_id: productId,
      source: parsed.data.source,
      preferred_contact: parsed.data.preferredContact,
      product_snapshot: products ?? [],
      selected_options: parsed.data.selectedOptions ?? {},
      idempotency_key: parsed.data.idempotencyKey ?? randomUUID(),
      consent_at: new Date().toISOString(),
      page_url: parsed.data.pageUrl ?? "",
      referrer: parsed.data.referrer ?? "",
      utm_source: parsed.data.utmSource ?? "",
      utm_medium: parsed.data.utmMedium ?? "",
      utm_campaign: parsed.data.utmCampaign ?? "",
    })
    .select("id, enquiry_number")
    .single();
  if (error) {
    if (error.code === "23505" && parsed.data.idempotencyKey) {
      const { data: existing } = await client
        .from("enquiries")
        .select("id, enquiry_number")
        .eq("idempotency_key", parsed.data.idempotencyKey)
        .maybeSingle();
      if (existing)
        return NextResponse.json({ data: { accepted: true, id: existing.id, enquiryNumber: existing.enquiry_number, whatsappUrl: `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`Hello PS Jewellers, my enquiry ID is ${existing.enquiry_number}. Please confirm today's price and showroom availability.`)}` } }, { headers: { "Cache-Control": "no-store" } });
    }
    console.error("[public-enquiries] insert_failed", {
      errorName: error.name,
      code: error.code,
    });
    return errorResponse(500, "database_error", "Enquiry could not be sent");
  }
  let siteOrigin = new URL(request.url).origin;
  try {
    if (process.env.NEXT_PUBLIC_SITE_URL) siteOrigin = new URL(process.env.NEXT_PUBLIC_SITE_URL).origin;
  } catch {
    // Keep the validated request origin when configuration is malformed.
  }
  const whatsappMessage = [
    `Hello PS Jewellers,`,
    `Enquiry ID: ${inserted.enquiry_number}`,
    ...(products ?? []).map(
      (item, index) => [
        `${index + 1}. ${item.name} (${item.sku})`,
        `Purity: ${item.metal_purity || "Not specified"}`,
        `Displayed Price: ${item.price_on_request ? "On enquiry" : item.display_price ?? "On enquiry"}`,
        `Product URL: ${siteOrigin}/product/${encodeURIComponent(item.slug)}`,
      ].join("\n"),
    ),
    `Preferences: ${Object.entries(parsed.data.selectedOptions ?? {}).map(([key, value]) => `${key}=${value}`).join(", ") || "None provided"}`,
    `Please confirm today’s price and showroom availability.`,
  ].join("\n");
  return NextResponse.json(
    {
      data: {
        accepted: true,
        id: inserted.id,
        enquiryNumber: inserted.enquiry_number,
        whatsappUrl: `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`,
      },
    },
    { status: 201, headers: { "Cache-Control": "no-store" } },
  );
}
