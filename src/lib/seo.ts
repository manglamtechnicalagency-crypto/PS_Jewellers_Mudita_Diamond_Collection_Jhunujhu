import type { Metadata } from "next";
import { products } from "../data";
import type { Product } from "../types";

export const SITE_NAME = "PS Jewellers";
export const SITE_DESCRIPTION =
  "Luxury gold, diamond and bridal jewellery from PS Jewellers, Jhunjhunu, Rajasthan. BIS hallmarked gold, certified diamonds and bridal heirlooms.";

/** Absolute origin used for canonical URLs and OpenGraph. */
export function siteUrl(): string {
  const configured =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : undefined) ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined) ??
    "http://localhost:3000";
  return configured.replace(/\/$/, "");
}

export function absoluteUrl(path: string): string {
  return `${siteUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}

interface StaticRouteMeta {
  title: string;
  description: string;
}

/**
 * Titles and descriptions for the non-product routes handled by the storefront
 * catch-all. Keys are normalised, lowercase, trailing-slash-free paths.
 */
export const STATIC_ROUTE_META: Record<string, StaticRouteMeta> = {
  "/": {
    title: "Luxury Gold, Diamond & Bridal Jewellery",
    description: SITE_DESCRIPTION,
  },
  "/shop": {
    title: "Shop All Jewellery",
    description: "Browse the full PS Jewellers catalogue — gold, diamond, bridal and everyday jewellery with hallmarking and certification details.",
  },
  "/gold-jewellery": {
    title: "Gold Jewellery",
    description: "BIS hallmarked 22K and 18K gold jewellery for everyday wear and festive occasions, from PS Jewellers Jhunjhunu.",
  },
  "/diamond-jewellery": {
    title: "Diamond Jewellery",
    description: "Certified diamond rings, necklaces and earrings for engagements, anniversaries and evening wear.",
  },
  "/bridal-collection": {
    title: "Bridal Collection",
    description: "Grand bridal jewellery sets, kundan and polki designs crafted for wedding-day presence.",
  },
  "/rings": { title: "Rings", description: "Gold and diamond rings for engagements, gifting and daily wear." },
  "/necklaces": { title: "Necklaces", description: "Antique, temple and contemporary necklace designs in hallmarked gold." },
  "/chains": { title: "Chains", description: "Lightweight and statement gold chains for men and women." },
  "/bracelets": { title: "Bracelets", description: "Diamond and gold bracelets, from everyday styles to occasion pieces." },
  "/bangles": { title: "Bangles", description: "Traditional and modern gold bangles in 22K and 18K." },
  "/earrings": { title: "Earrings", description: "Studs, hoops and jhumkas in hallmarked gold and certified diamonds." },
  "/pendants": { title: "Pendants", description: "Gold and diamond pendants for gifting and daily wear." },
  "/mangalsutra": { title: "Mangalsutra", description: "Traditional and contemporary mangalsutra designs in hallmarked gold." },
  "/maang-tikka": {
    title: "Maang Tikka",
    description: "Bridal and festive maang tikka in oxidised 925 silver and hallmarked gold, from PS Jewellers Jhunjhunu.",
  },
  "/nose-pin": {
    title: "Nose Pins & Nath",
    description: "Diamond and gold nath, nose rings and nose pins for brides and festive wear, from PS Jewellers Jhunjhunu.",
  },
  "/anklets": {
    title: "Anklets & Payal",
    description: "Handcrafted 925 sterling silver anklets and payal in leaf, heritage and oxidised designs.",
  },
  "/silver-jewellery": {
    title: "Silver Jewellery",
    description: "Oxidised 925 sterling silver jhumkas, chokers, long haars and maang tikka in temple and Rajwadi styles.",
  },
  "/new-arrivals": { title: "New Arrivals", description: "The newest jewellery designs added to the PS Jewellers collection." },
  "/best-sellers": { title: "Best Sellers", description: "The most loved gold, diamond and bridal pieces at PS Jewellers." },
  "/offers": { title: "Offers", description: "Current offers and savings across the PS Jewellers jewellery collection." },
  "/wishlist": { title: "Wishlist", description: "Jewellery you have saved to revisit before your showroom appointment." },
  "/cart": { title: "Your Bag", description: "Review the jewellery in your PS Jewellers bag." },
  "/checkout": { title: "Checkout", description: "Complete your PS Jewellers enquiry." },
  "/account": { title: "Account", description: "Your PS Jewellers account." },
  "/order-tracking": { title: "Order Tracking", description: "Track the status of your PS Jewellers order." },
  "/store-locator": {
    title: "Store Locator",
    description: "Visit PS Jewellers at Oriental Tower Road No. 1, Shop No. 1, Jhunjhunu, Rajasthan.",
  },
  "/book-appointment": {
    title: "Book an Appointment",
    description: "Reserve a bridal styling or jewellery consultation at the PS Jewellers Jhunjhunu showroom.",
  },
  "/about": { title: "About Us", description: "The story behind PS Jewellers, Jhunjhunu." },
  "/blog": { title: "Jewellery Guides", description: "Buying guides on hallmarking, diamond certification and bridal styling." },
  "/contact": { title: "Contact", description: "Contact PS Jewellers for enquiries, appointments and showroom visits." },
  "/faq": { title: "FAQ", description: "Answers to common questions about hallmarking, certification, delivery and exchange." },
  "/privacy-policy": { title: "Privacy Policy", description: "How PS Jewellers handles your information." },
  "/terms": { title: "Terms", description: "Terms and conditions for using the PS Jewellers website." },
  "/return-policy": { title: "Return Policy", description: "PS Jewellers exchange and return terms." },
};

/** Mirrors the route normalisation in `src/App.tsx`. */
export function normalizeRoutePath(segments: string[] | undefined): string {
  const joined = `/${(segments ?? []).join("/")}`;
  return (joined.replace(/\/+$/, "") || "/").toLowerCase();
}

export function findProductBySlug(slug: string): Product | undefined {
  return products.find((product) => product.slug === slug);
}

function buildMetadata({
  title,
  description,
  path,
  images,
  type = "website",
}: {
  title: string;
  description: string;
  path: string;
  images?: string[];
  type?: "website" | "article";
}): Metadata {
  const url = absoluteUrl(path);
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type,
      url,
      siteName: SITE_NAME,
      title: `${title} | ${SITE_NAME}`,
      description,
      images: images?.map((image) => ({ url: image })),
      locale: "en_IN",
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | ${SITE_NAME}`,
      description,
      images,
    },
  };
}

export function metadataForRoute(path: string): Metadata {
  if (path.startsWith("/product/") || path.startsWith("/project/")) {
    const slug = path.split("/").pop() ?? "";
    const product = findProductBySlug(slug);

    if (!product) {
      return {
        title: "Page Not Found",
        description: "The page you are looking for is no longer available.",
        robots: { index: false, follow: true },
      };
    }

    return buildMetadata({
      title: product.name,
      description: `${product.description} ${product.purity}, ${product.weight}. ${product.hallmark}.`.slice(0, 300),
      path: `/product/${product.slug}`,
      images: product.images.slice(0, 4),
    });
  }

  const staticMeta = STATIC_ROUTE_META[path];
  if (!staticMeta) {
    return {
      title: "Page Not Found",
      description: "The page you are looking for is no longer available.",
      robots: { index: false, follow: true },
    };
  }

  // Transactional and personal routes carry no SEO value and should not be indexed.
  const noIndexRoutes = ["/cart", "/checkout", "/account", "/wishlist", "/order-tracking"];

  return {
    ...buildMetadata({ title: staticMeta.title, description: staticMeta.description, path }),
    ...(noIndexRoutes.includes(path) ? { robots: { index: false, follow: true } } : {}),
  };
}

export function buildProductMetadata(product: Product): Metadata {
  return buildMetadata({
    title: product.name,
    description: `${product.description} ${product.purity}, ${product.weight}. ${product.hallmark}.`.slice(0, 300),
    path: `/product/${product.slug}`,
    images: product.images.slice(0, 4),
  });
}

/** Organisation + LocalBusiness schema for the site root. */
export function organisationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "JewelryStore",
    name: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: siteUrl(),
    telephone: "+91-9829407255",
    email: "subhashsoni334@gmail.com",
    address: {
      "@type": "PostalAddress",
      streetAddress: "Oriental Tower Road No. 1, Shop No. 1",
      addressLocality: "Jhunjhunu",
      addressRegion: "Rajasthan",
      addressCountry: "IN",
    },
    priceRange: "₹₹₹",
  };
}

export function productJsonLd(product: Product) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    sku: product.sku,
    image: product.images,
    category: product.category,
    brand: { "@type": "Brand", name: SITE_NAME },
    material: product.purity,
    weight: product.weight,
    // Google rejects an AggregateRating with a zero count, and publishing one
    // without real reviews behind it is a manual-action risk.
    ...(product.reviewsCount > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: product.rating,
            reviewCount: product.reviewsCount,
          },
        }
      : {}),
    offers: {
      "@type": "Offer",
      url: absoluteUrl(`/product/${product.slug}`),
      priceCurrency: "INR",
      // Google rejects a zero price. Items sold on enquiry advertise the
      // currency and availability but no price value.
      ...(product.priceOnRequest ? {} : { price: product.offerPrice }),
      availability:
        product.availability.toLowerCase().includes("stock") && !product.availability.toLowerCase().includes("out")
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      seller: { "@type": "Organization", name: SITE_NAME },
    },
  };
}

export function jsonLdForRoute(path: string): object | null {
  if (path === "/") return organisationJsonLd();
  if (path.startsWith("/product/") || path.startsWith("/project/")) {
    const product = findProductBySlug(path.split("/").pop() ?? "");
    return product ? productJsonLd(product) : null;
  }
  return null;
}
