import type { MetadataRoute } from "next";
import { STATIC_ROUTE_META, absoluteUrl } from "@/src/lib/seo";
import { getPublishedProductSlugs } from "@/src/lib/catalogue-server";
import { isRenderablePath } from "@/src/lib/storefront-routes";

export const dynamic = "force-dynamic";

// Personal and transactional routes carry no SEO value.
const EXCLUDED = new Set(["/cart", "/checkout", "/wishlist", "/order-tracking"]);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date();

  const staticRoutes = Object.keys(STATIC_ROUTE_META)
    .filter((path) => !EXCLUDED.has(path))
    // Never advertise a URL the router cannot render. Twelve paths had metadata
    // and a sitemap entry while returning the not-found page at HTTP 200.
    .filter((path) => isRenderablePath(path))
    .map((path) => ({
      url: absoluteUrl(path),
      lastModified,
      changeFrequency: (path === "/" ? "daily" : "weekly") as "daily" | "weekly",
      priority: path === "/" ? 1 : path === "/shop" ? 0.9 : 0.7,
    }));

  const publishedSlugs = await getPublishedProductSlugs();
  const productRoutes = (publishedSlugs ?? []).map((slug) => ({
    url: absoluteUrl(`/product/${slug}`),
    lastModified,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  return [...staticRoutes, ...productRoutes];
}
