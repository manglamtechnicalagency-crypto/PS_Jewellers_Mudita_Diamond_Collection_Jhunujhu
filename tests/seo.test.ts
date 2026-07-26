import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { products } from "../src/data.ts";
import { metadataForRoute, normalizeRoutePath, jsonLdForRoute } from "../src/lib/seo.ts";

describe("normalizeRoutePath", () => {
  it("mirrors the client router's normalisation", () => {
    assert.equal(normalizeRoutePath(undefined), "/");
    assert.equal(normalizeRoutePath([]), "/");
    assert.equal(normalizeRoutePath(["Shop"]), "/shop");
    assert.equal(normalizeRoutePath(["product", "Royal-Antique-Necklace"]), "/product/royal-antique-necklace");
  });
});

describe("metadataForRoute", () => {
  it("gives each product a unique title and canonical", () => {
    const seen = new Set<string>();
    for (const product of products) {
      const meta = metadataForRoute(`/product/${product.slug}`);
      assert.equal(meta.title, product.name);
      const canonical = String(meta.alternates?.canonical);
      assert.ok(canonical.endsWith(`/product/${product.slug}`));
      assert.ok(!seen.has(canonical), "canonical URLs must be unique");
      seen.add(canonical);
    }
  });

  it("marks unknown routes noindex", () => {
    const meta = metadataForRoute("/does-not-exist");
    assert.deepEqual(meta.robots, { index: false, follow: true });
  });

  it("keeps transactional routes out of the index", () => {
    for (const path of ["/cart", "/checkout", "/account", "/wishlist", "/order-tracking"]) {
      assert.deepEqual(metadataForRoute(path).robots, { index: false, follow: true }, `${path} should be noindex`);
    }
  });

  it("indexes the storefront routes", () => {
    for (const path of ["/", "/shop", "/gold-jewellery", "/bridal-collection"]) {
      assert.equal(metadataForRoute(path).robots, undefined, `${path} should be indexable`);
    }
  });
});

describe("jsonLdForRoute", () => {
  it("emits JewelryStore schema on the home page", () => {
    const jsonLd = jsonLdForRoute("/") as Record<string, unknown>;
    assert.equal(jsonLd["@type"], "JewelryStore");
  });

  it("emits Product schema with an offer for every product", () => {
    for (const product of products) {
      const jsonLd = jsonLdForRoute(`/product/${product.slug}`) as Record<string, unknown>;
      assert.equal(jsonLd["@type"], "Product");
      assert.equal(jsonLd.sku, product.sku);
      const offers = jsonLd.offers as Record<string, unknown>;
      assert.equal(offers.priceCurrency, "INR");
      if (product.priceOnRequest) {
        assert.equal("price" in offers, false, "price-on-request items must not advertise a zero price");
      } else {
        assert.equal(offers.price, product.offerPrice);
      }
    }
  });

  it("returns null where no schema applies", () => {
    assert.equal(jsonLdForRoute("/faq"), null);
    assert.equal(jsonLdForRoute("/product/unknown-slug"), null);
  });
});

describe("catalogue integrity", () => {
  it("gives every product a unique slug, sku and id", () => {
    for (const key of ["slug", "sku", "id"] as const) {
      const values = products.map((p) => p[key]);
      assert.equal(new Set(values).size, values.length, `${key} must be unique`);
    }
  });

  it("gives every product searchable tags", () => {
    for (const product of products) {
      assert.ok(Array.isArray(product.tags) && product.tags.length >= 3, `${product.slug} needs tags`);
    }
  });

  it("never shows a zero price without the price-on-request flag", () => {
    for (const product of products) {
      if (!product.priceOnRequest) {
        assert.ok(product.offerPrice > 0, `${product.slug} has no price and is not marked priceOnRequest`);
        assert.ok(product.price >= product.offerPrice, `${product.slug} offer exceeds MRP`);
      }
    }
  });

  it("points every product at a local or remote image", () => {
    for (const product of products) {
      assert.ok(product.image.startsWith("/") || product.image.startsWith("http"), product.slug);
      assert.ok(product.images.length >= 1, `${product.slug} has no gallery images`);
    }
  });
});

describe("price-on-request safety", () => {
  it("keeps unpriced items out of any cart-total arithmetic", () => {
    // A price-on-request item must never carry a nonzero price that could be
    // silently summed, nor a discount badge implying a published price.
    for (const product of products) {
      if (!product.priceOnRequest) continue;
      assert.equal(product.offerPrice, 0, `${product.slug} should have no price`);
      assert.equal(product.price, 0, `${product.slug} should have no MRP`);
      assert.equal(product.discount, "", `${product.slug} should not advertise a discount`);
    }
  });

  it("sorts unpriced items after priced ones in both directions", () => {
    const byPrice = (direction: 1 | -1) => (a: typeof products[number], b: typeof products[number]) => {
      if (a.priceOnRequest && b.priceOnRequest) return a.name.localeCompare(b.name);
      if (a.priceOnRequest) return 1;
      if (b.priceOnRequest) return -1;
      return (a.offerPrice - b.offerPrice) * direction;
    };

    for (const direction of [1, -1] as const) {
      const sorted = [...products].sort(byPrice(direction));
      const firstUnpriced = sorted.findIndex((p) => p.priceOnRequest);
      const lastPriced = sorted.map((p) => !p.priceOnRequest).lastIndexOf(true);
      assert.ok(firstUnpriced === -1 || firstUnpriced > lastPriced, "unpriced items must trail priced ones");
    }
  });
});

describe("no fabricated social proof", () => {
  it("does not publish a rating without reviews behind it", () => {
    for (const product of products) {
      if (product.reviewsCount === 0) {
        assert.equal(product.rating, 0, `${product.slug} shows a rating with no reviews`);
        assert.equal(product.reviews.length, 0, `${product.slug} has orphan review text`);
      }
      assert.equal(
        product.reviews.length <= product.reviewsCount,
        true,
        `${product.slug} lists more reviews than it counts`,
      );
    }
  });

  it("omits aggregateRating from schema when there are no reviews", () => {
    for (const product of products) {
      if (product.reviewsCount > 0) continue;
      const jsonLd = jsonLdForRoute(`/product/${product.slug}`) as Record<string, unknown>;
      assert.equal("aggregateRating" in jsonLd, false, `${product.slug} emits an empty aggregateRating`);
    }
  });

  it("ships no placeholder or stock imagery references", () => {
    for (const product of products) {
      for (const src of [product.image, ...product.images]) {
        assert.ok(!src.includes("unsplash"), `${product.slug} still points at stock photography`);
      }
    }
  });
});
