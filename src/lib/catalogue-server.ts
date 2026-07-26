import type { Product } from "../types";
import { createSupabaseServerClient } from "./supabase/server";
import { buildCatalogueProducts } from "./catalogue-data";

/**
 * Returns public product slugs from the published catalogue view.
 * A null result means catalogue storage is unavailable or not configured;
 * callers must not substitute draft or source-file records for SEO output.
 */
export async function getPublishedProductSlugs(): Promise<string[] | null> {
  const client = await createSupabaseServerClient();
  if (!client) return null;
  const { data: rows, error } = await client
    .from("catalogue_products")
    .select("id, slug")
    .order("display_order");
  if (error) {
    console.error("[catalogue-server] product_slugs_load_failed", {
      errorName: error.name,
    });
    return null;
  }
  const ids = rows.map((row) => row.id).filter((id): id is string => typeof id === "string");
  const { data: links, error: linksError } = ids.length
    ? await client
        .from("product_media")
        .select("product_id, media:media_id!inner(review_status)")
        .in("product_id", ids)
        .eq("media.review_status", "approved")
    : { data: [], error: null };
  if (linksError) return null;
  const mediaProductIds = new Set((links ?? []).map((link) => link.product_id));
  return rows
    .filter((row) => mediaProductIds.has(row.id))
    .map((row) => row.slug)
    .filter(
      (slug): slug is string => typeof slug === "string" && slug.length > 0,
    );
}

export async function getPublishedCatalogue(): Promise<Product[] | null> {
  const client = await createSupabaseServerClient();
  if (!client) return null;
  const { data: rows, error } = await client
    .from("catalogue_products")
    .select("*")
    .order("display_order");
  if (error) {
    console.error("[catalogue-server] products_load_failed", {
      errorName: error.name,
    });
    return null;
  }
  const ids = rows.map((row) => row.id);
  const [
    { data: links, error: linksError },
    { data: reviews, error: reviewsError },
  ] = ids.length
    ? await Promise.all([
        client
          .from("product_media")
          .select(
            "product_id, role, display_order, media:media_id!inner(storage_key, mime_type, alt_text, review_status)",
          )
          .in("product_id", ids)
          .eq("media.review_status", "approved")
          .order("display_order"),
        client
          .from("product_reviews")
          .select("product_id, author_name, rating, body")
          .eq("status", "approved")
          .in("product_id", ids)
          .order("created_at", { ascending: false }),
      ])
    : [
        { data: [], error: null },
        { data: [], error: null },
      ];
  if (linksError || reviewsError) return null;
  return buildCatalogueProducts(
    rows,
    (links ?? []) as Array<{
      product_id: string;
      role: string;
      media: Record<string, unknown> | Record<string, unknown>[] | null;
    }>,
  ).map((product) => {
    const productReviews = (reviews ?? [])
      .filter((review) => review.product_id === product.id)
      .map((review) => ({
        name: review.author_name,
        rating: review.rating,
        comment: review.body,
      }));
    return {
      ...product,
      reviews: productReviews,
      reviewsCount: productReviews.length || product.reviewsCount,
    };
  });
}
