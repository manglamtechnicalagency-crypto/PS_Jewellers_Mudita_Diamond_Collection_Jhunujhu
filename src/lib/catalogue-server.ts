import { cache } from "react";
import type { Product } from "../types";
import { createSupabaseServiceClient } from "./supabase/service";
import { buildCatalogueProducts } from "./catalogue-data";

/**
 * Returns public product slugs from the published catalogue view.
 * A null result means catalogue storage is unavailable or not configured;
 * callers must not substitute draft or source-file records for SEO output.
 */
export const getPublishedProductSlugs = cache(async function getPublishedProductSlugs(): Promise<string[] | null> {
  const client = createSupabaseServiceClient();
  if (!client) return null;
  const { data: rows, error } = await client
    .from("catalogue_products")
    .select("id, slug")
    .order("display_order")
    .limit(500);
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
});

export const getPublishedCatalogue = cache(async function getPublishedCatalogue(): Promise<Product[] | null> {
  const client = createSupabaseServiceClient();
  if (!client) return null;
  const { data: rows, error } = await client
    .from("catalogue_products")
    .select("*")
    .order("display_order")
    .limit(500);
  if (error) {
    console.error("[catalogue-server] products_load_failed", {
      errorName: error.name,
    });
    return null;
  }
  const ids = rows.map((row) => row.id);
  const { data: links, error: linksError } = ids.length
    ? await client
        .from("product_media")
        .select("product_id, role, display_order, media:media_id!inner(storage_key, mime_type, alt_text, review_status)")
        .in("product_id", ids)
        .eq("media.review_status", "approved")
        .order("display_order")
        .limit(2_500)
    : { data: [], error: null };
  if (linksError) return null;
  return buildCatalogueProducts(
    rows,
    (links ?? []) as Array<{
      product_id: string;
      role: string;
      media: Record<string, unknown> | Record<string, unknown>[] | null;
    }>,
  );
});
