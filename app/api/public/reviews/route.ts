import { NextResponse } from "next/server";
import { z } from "zod";
import { hasValidSameOrigin } from "@/src/lib/request-origin";
import { createSupabaseServerClient } from "@/src/lib/supabase/server";
import { consumeUploadRateLimit, getTrustedClientKey } from "@/src/lib/upload-rate-limit";

/**
 * Public product reviews: read approved ones, submit a new one.
 *
 * Reads go through `product_reviews_public`, the view that filters to approved
 * rows and omits author_email. Reviewer addresses are additionally withheld
 * from anon by a column-level grant, so a mistake here cannot leak them.
 *
 * Submissions are inserted with the table defaults, which the RLS policy
 * "public submits reviews" requires: status 'pending', no moderation fields
 * set, and the product must actually be published. Nothing reaches the
 * storefront until a staff member approves it in the admin moderation panel.
 *
 * Deliberately does NOT set status, is_verified_purchase or any moderation
 * column. Sending them explicitly would still satisfy the policy today, but it
 * invites a later edit that quietly self-approves a public submission.
 */

const MAX_REVIEWS = 50;

const submitSchema = z
  .object({
    productId: z.string().uuid(),
    // Matches the table's own CHECK constraints, so a bad value fails here with
    // a clear 422 rather than as an opaque database error.
    authorName: z.string().trim().min(1).max(80),
    authorEmail: z.string().trim().email().max(254),
    rating: z.number().int().min(1).max(5),
    title: z.string().trim().max(140).default(""),
    body: z.string().trim().min(1).max(4000),
  })
  .strict();

function errorResponse(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET(request: Request) {
  const productId = new URL(request.url).searchParams.get("productId") ?? "";
  if (!z.string().uuid().safeParse(productId).success) {
    return errorResponse(422, "validation_error", "A valid product id is required");
  }

  const client = await createSupabaseServerClient();
  if (!client) return errorResponse(503, "not_configured", "Reviews are temporarily unavailable");

  const { data, error } = await client
    .from("product_reviews_public")
    .select("id, author_name, rating, title, body, is_verified_purchase, created_at")
    .eq("product_id", productId)
    .order("created_at", { ascending: false })
    .limit(MAX_REVIEWS);

  if (error) {
    console.error("[public-reviews] read_failed", { code: error.code });
    return errorResponse(500, "database_error", "Reviews could not be loaded");
  }

  return NextResponse.json(
    { data: data ?? [] },
    // Short cache: reviews change rarely, but a newly approved one should not
    // take minutes to appear.
    { headers: { "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=300" } },
  );
}

export async function POST(request: Request) {
  if (!hasValidSameOrigin(request)) {
    return errorResponse(403, "invalid_origin", "Request origin is not allowed");
  }

  // A public write endpoint on a live storefront. Without a limiter this is an
  // open door for review spam.
  const clientKey = getTrustedClientKey(request);
  if (!clientKey.trusted || !clientKey.key) {
    return errorResponse(503, "rate_limit_unavailable", "Review submissions cannot be attributed to a client");
  }
  const limit = await consumeUploadRateLimit(`review:${clientKey.key}`);
  if (limit.limited) {
    return NextResponse.json(
      { error: { code: "rate_limited", message: "Too many reviews submitted. Please try again later." } },
      { status: 429, headers: { "Cache-Control": "no-store", "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 16_000) {
    return errorResponse(413, "payload_too_large", "Review is too long");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "invalid_json", "Request body must be valid JSON");
  }

  const parsed = submitSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(422, "validation_error", "Please check the rating, review and email and try again");
  }

  const client = await createSupabaseServerClient();
  if (!client) return errorResponse(503, "not_configured", "Reviews are temporarily unavailable");

  const { error } = await client.from("product_reviews").insert({
    product_id: parsed.data.productId,
    author_name: parsed.data.authorName,
    author_email: parsed.data.authorEmail,
    rating: parsed.data.rating,
    title: parsed.data.title,
    body: parsed.data.body,
  });

  if (error) {
    // 42501 is RLS refusing the insert, which here means the product is not
    // published (or does not exist) — a client problem, not a server fault.
    if (error.code === "42501") {
      return errorResponse(422, "product_unavailable", "This product is not available for review");
    }
    console.error("[public-reviews] insert_failed", { code: error.code, message: error.message });
    return errorResponse(500, "database_error", "Your review could not be submitted");
  }

  return NextResponse.json(
    {
      data: {
        accepted: true,
        message: "Thank you. Your review has been sent for approval and will appear once our team has checked it.",
      },
    },
    { status: 201, headers: { "Cache-Control": "no-store" } },
  );
}
