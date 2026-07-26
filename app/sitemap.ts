import type { MetadataRoute } from "next";
import { STATIC_ROUTE_META, absoluteUrl } from "@/src/lib/seo";
import { getPublishedProductSlugs } from "@/src/lib/catalogue-server";

export const dynamic = "force-dynamic";

// Personal and transactional routes carry no SEO value.
const EXCLUDED = new Set(["/cart", "/checkout", "/account", "/wishlist", "/order-tracking"]);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date();

  const staticRoutes = Object.keys(STATIC_ROUTE_META)
    .filter((path) => !EXCLUDED.has(path))
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
