import type { Metadata } from "next";
import { notFound } from "next/navigation";
import App from "@/src/App";
import {
  jsonLdForRoute,
  metadataForRoute,
  normalizeRoutePath,
  productJsonLd,
  organisationJsonLd,
  buildProductMetadata,
} from "@/src/lib/seo";
import { getPublishedCatalogue } from "@/src/lib/catalogue-server";
import { isCatalogueDependentPath, isRenderablePath } from "@/src/lib/storefront-routes";
import { products as developmentProducts } from "@/src/data";

interface StorefrontPageProps {
  params: Promise<{ slug?: string[] }>;
}

export async function generateMetadata({
  params,
}: StorefrontPageProps): Promise<Metadata> {
  const { slug } = await params;
  const path = normalizeRoutePath(slug);
  if (path.startsWith("/product/")) {
    const catalogue = await getPublishedCatalogue();
    const product = catalogue?.find((item) => item.slug === path.split("/").pop());
    return product ? buildProductMetadata(product) : { title: "Page Not Found", robots: { index: false, follow: true } };
  }
  return metadataForRoute(path);
}

export default async function StorefrontPage({ params }: StorefrontPageProps) {
  const { slug } = await params;
  const path = normalizeRoutePath(slug);
  const catalogueDependent = isCatalogueDependentPath(path);
  const catalogue = catalogueDependent ? await getPublishedCatalogue() : [];
  if (catalogueDependent && !catalogue && process.env.NODE_ENV === "production") {
    return (
      <main className="min-h-screen bg-cream px-6 py-24 text-center">
        <h1 className="font-serif text-4xl">Showroom catalogue unavailable</h1>
        <p className="mx-auto mt-4 max-w-lg text-ink-soft">
          Please try again shortly.
        </p>
      </main>
    );
  }
  // Unknown paths previously rendered the not-found page inside a 200 response —
  // a soft 404. Crawlers treat that as a real page and index it.
  if (!isRenderablePath(path)) notFound();

  const product = path.startsWith("/product/") ? catalogue?.find((item) => item.slug === path.split("/").pop()) : undefined;
  if (path.startsWith("/product/") && catalogue && !product) notFound();
  const jsonLd = product ? productJsonLd(product) : path === "/" ? organisationJsonLd() : jsonLdForRoute(path);

  return (
    <>
      {jsonLd ? (
        <script
          type="application/ld+json"
          // Serialised server-side from the published catalogue — no user input
          // reaches this string. `<` is escaped to close off the </script> vector.
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
          }}
        />
      ) : null}
      <App initialProducts={catalogue ?? (catalogueDependent ? developmentProducts : [])} />
    </>
  );
}
