import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/src/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/admin/", "/api/", "/cart", "/checkout", "/wishlist", "/order-tracking"],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
