import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  byJewelleryCategory,
  isActiveProduct,
  matchesJewelleryCategory,
  matchesJewelleryType,
  matchesStorefrontFilter,
  newArrivals,
  sortByNewest,
} from "../src/lib/catalogue-filters.ts";
import { buildCatalogueProducts } from "../src/lib/catalogue-data.ts";
import { filterProductsForRoute, findCatalogueRoute } from "../src/lib/storefront-routes.ts";
import { products as seedProducts } from "../src/data.ts";
import type { JewelleryCategory, Product } from "../src/types.ts";

/**
 * The production defect these tests lock down: metal/stone category pages were
 * derived from `purity` and free-text tags, so a diamond ring with
 * `purity: "18K Gold"` appeared under Gold Jewellery, and "Rings" matched
 * "ear-RING-s".
 */

function product(overrides: Partial<Product> = {}): Product {
  return {
    id: "p-1",
    slug: "test-product",
    name: "Test Product",
    category: "Rings",
    jewelleryCategory: "gold",
    isNewArrival: false,
    publishedAt: "2026-01-01T00:00:00.000Z",
    collection: "Celeste Diamonds",
    sku: "SKU-1",
    price: 0,
    offerPrice: 0,
    discount: "",
    availability: "In Stock",
    hallmark: "",
    certification: "",
    purity: "18K Gold",
    weight: "",
    stoneType: "",
    occasion: "",
    image: "https://media.example.test/a.webp",
    images: ["https://media.example.test/a.webp"],
    rating: 0,
    reviewsCount: 0,
    badge: "",
    tags: [],
    highlights: [],
    description: "",
    specs: {},
    care: [],
    reviews: [],
    ...overrides,
  };
}

describe("classification matrix", () => {
  it("gold + new appears under Gold and New Arrivals only", () => {
    const item = product({ jewelleryCategory: "gold", isNewArrival: true });
    assert.equal(matchesStorefrontFilter(item, "Gold Jewellery"), true);
    assert.equal(matchesStorefrontFilter(item, "Diamond Jewellery"), false);
    assert.equal(matchesStorefrontFilter(item, "Silver Jewellery"), false);
    assert.deepEqual(newArrivals([item]).map((entry) => entry.id), ["p-1"]);
  });

  it("gold + not new appears under Gold but not New Arrivals", () => {
    const item = product({ jewelleryCategory: "gold", isNewArrival: false });
    assert.equal(matchesStorefrontFilter(item, "Gold Jewellery"), true);
    assert.deepEqual(newArrivals([item]), []);
  });

  it("REGRESSION: diamond mounted in 18K gold is Diamond, never Gold", () => {
    const item = product({
      name: "Diamond Halo Ring",
      category: "Rings",
      jewelleryCategory: "diamond",
      purity: "18K Gold",
      stoneType: "Round Brilliant Cut Diamond",
    });
    assert.equal(matchesStorefrontFilter(item, "Diamond Jewellery"), true);
    assert.equal(matchesStorefrontFilter(item, "Gold Jewellery"), false);
  });

  it("silver + new appears under Silver and New Arrivals, never Gold", () => {
    const item = product({ jewelleryCategory: "silver", purity: "925 Sterling Silver", isNewArrival: true });
    assert.equal(matchesStorefrontFilter(item, "Silver Jewellery"), true);
    assert.equal(matchesStorefrontFilter(item, "Gold Jewellery"), false);
    assert.equal(newArrivals([item]).length, 1);
  });

  it("changing gold to diamond moves the product between pages", () => {
    const before = product({ jewelleryCategory: "gold" });
    const after = { ...before, jewelleryCategory: "diamond" as JewelleryCategory };
    assert.equal(byJewelleryCategory([before], "gold").length, 1);
    assert.equal(byJewelleryCategory([after], "gold").length, 0);
    assert.equal(byJewelleryCategory([after], "diamond").length, 1);
  });

  it("clearing the New Arrival flag leaves the category untouched", () => {
    const before = product({ jewelleryCategory: "gold", isNewArrival: true });
    const after = { ...before, isNewArrival: false };
    assert.equal(matchesStorefrontFilter(after, "Gold Jewellery"), true);
    assert.deepEqual(newArrivals([after]), []);
  });

  it("an unclassified legacy product is excluded, never guessed into a category", () => {
    const item = product({ jewelleryCategory: "", purity: "22K Gold" });
    assert.equal(matchesStorefrontFilter(item, "Gold Jewellery"), false);
    assert.equal(matchesStorefrontFilter(item, "Diamond Jewellery"), false);
    // Still reachable through the unfiltered listing and its jewellery type.
    assert.equal(matchesStorefrontFilter(item, "Recommended"), true);
    assert.equal(matchesStorefrontFilter(item, "Rings"), true);
  });
});

describe("jewellery type matching", () => {
  it("REGRESSION: earrings never match the Rings filter", () => {
    const earrings = product({ category: "Earrings", name: "Diamond Stud Earrings" });
    assert.equal(matchesJewelleryType(earrings, "Rings"), false);
    assert.equal(matchesJewelleryType(earrings, "Earrings"), true);
  });

  it("matches multi-word categories on whole words", () => {
    assert.equal(matchesJewelleryType(product({ category: "Diamond Rings" }), "Rings"), true);
    assert.equal(matchesJewelleryType(product({ category: "Gold Rings" }), "Rings"), true);
  });

  it("REGRESSION: mangalsutra bracelets are not necklaces", () => {
    const bracelet = product({
      category: "Bracelets",
      name: "Trio Diamond Mangalsutra Bracelet",
      tags: ["Mangalsutra Bracelet", "Hand Mangalsutra"],
    });
    assert.equal(matchesJewelleryType(bracelet, "Necklaces"), false);
  });

  it("REGRESSION: a diamond-cut gold bangle is not diamond jewellery", () => {
    const bangle = product({
      category: "Bangles",
      name: "Dual-Tone Diamond-Cut Gold Bangles",
      jewelleryCategory: "gold",
      stoneType: "None",
      tags: ["Diamond Cut"],
    });
    assert.equal(matchesStorefrontFilter(bangle, "Diamond Jewellery"), false);
    assert.equal(matchesStorefrontFilter(bangle, "Gold Jewellery"), true);
  });
});

describe("new arrivals ordering", () => {
  const older = product({ id: "old", isNewArrival: true, publishedAt: "2026-01-01T00:00:00.000Z" });
  const newer = product({ id: "new", isNewArrival: true, publishedAt: "2026-06-01T00:00:00.000Z" });

  it("sorts newest first", () => {
    assert.deepEqual(sortByNewest([older, newer]).map((item) => item.id), ["new", "old"]);
  });

  it("is stable when timestamps match", () => {
    const a = product({ id: "aaa", publishedAt: "2026-06-01T00:00:00.000Z" });
    const b = product({ id: "bbb", publishedAt: "2026-06-01T00:00:00.000Z" });
    assert.deepEqual(sortByNewest([b, a]).map((item) => item.id), ["aaa", "bbb"]);
    assert.deepEqual(sortByNewest([a, b]).map((item) => item.id), ["aaa", "bbb"]);
  });

  it("filters to one merchandising class and honours the limit", () => {
    const silver = product({ id: "s", jewelleryCategory: "silver", isNewArrival: true, publishedAt: "2026-07-01T00:00:00.000Z" });
    const result = newArrivals([older, newer, silver], { jewelleryCategory: "gold", limit: 1 });
    assert.deepEqual(result.map((item) => item.id), ["new"]);
  });

  it("returns no duplicates", () => {
    const result = newArrivals([older, newer, older]);
    assert.equal(new Set(result.map((item) => item.id)).size, result.length);
  });

  it("/new-arrivals uses the flag, not badge text", () => {
    const route = findCatalogueRoute("/new-arrivals");
    assert.ok(route);
    assert.equal(route.kind, "new-arrivals");
    const badgedButNotFlagged = product({ id: "badge-only", badge: "New Arrival", isNewArrival: false });
    const flagged = product({ id: "flagged", badge: "Premium", isNewArrival: true });
    const listed = filterProductsForRoute(route, [badgedButNotFlagged, flagged]);
    assert.deepEqual(listed.map((item) => item.id), ["flagged"]);
  });
});

describe("serializer", () => {
  it("passes the stored classification through and never infers one", () => {
    const previous = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;
    process.env.NEXT_PUBLIC_R2_PUBLIC_URL = "https://media.example.test";
    try {
      const [classified, unclassified] = buildCatalogueProducts(
        [
          {
            id: "p1",
            slug: "halo-ring",
            name: "Halo Ring",
            jewellery_category: "diamond",
            metal_purity: "18K Gold",
            is_new_arrival: true,
            publish_at: "2026-05-01T00:00:00.000Z",
            created_at: "2026-01-01T00:00:00.000Z",
          },
          {
            id: "p2",
            slug: "legacy",
            name: "Legacy Bangle",
            metal_purity: "22K Gold",
            created_at: "2026-02-01T00:00:00.000Z",
          },
        ],
        [
          { product_id: "p1", role: "primary", media: { storage_key: "products/p1/a.webp", mime_type: "image/webp" } },
          { product_id: "p2", role: "primary", media: { storage_key: "products/p2/a.webp", mime_type: "image/webp" } },
        ],
      );
      assert.equal(classified?.jewelleryCategory, "diamond");
      assert.equal(classified?.isNewArrival, true);
      assert.equal(classified?.publishedAt, "2026-05-01T00:00:00.000Z");
      // 22K Gold purity must NOT become a gold classification.
      assert.equal(unclassified?.jewelleryCategory, "");
      assert.equal(unclassified?.isNewArrival, false);
      assert.equal(unclassified?.publishedAt, "2026-02-01T00:00:00.000Z");
    } finally {
      if (previous === undefined) delete process.env.NEXT_PUBLIC_R2_PUBLIC_URL;
      else process.env.NEXT_PUBLIC_R2_PUBLIC_URL = previous;
    }
  });
});

describe("seed catalogue is fully classified", () => {
  it("every seed product carries a canonical classification", () => {
    for (const item of seedProducts) {
      assert.ok(
        ["gold", "silver", "diamond", "platinum"].includes(item.jewelleryCategory),
        `${item.id} has no jewelleryCategory`,
      );
      assert.equal(typeof item.isNewArrival, "boolean");
      assert.ok(!Number.isNaN(Date.parse(item.publishedAt)), `${item.id} has an unparseable publishedAt`);
    }
  });

  it("REGRESSION: no diamond-classified seed product appears under Gold", () => {
    const goldPage = seedProducts.filter((item) => matchesJewelleryCategory(item, "gold"));
    assert.ok(goldPage.length > 0);
    assert.ok(goldPage.every((item) => item.jewelleryCategory === "gold"));
    assert.ok(
      goldPage.every((item) => !/Round Brilliant Cut Diamond/i.test(item.stoneType)),
      "a real-diamond piece leaked onto the gold page",
    );
  });
});

describe("active product guard", () => {
  it("treats a product with imagery as active", () => {
    assert.equal(isActiveProduct(product()), true);
  });

  it("excludes a product with no renderable image", () => {
    const imageless = product({ image: "", images: [] });
    assert.equal(isActiveProduct(imageless), false);
    assert.deepEqual(newArrivals([{ ...imageless, isNewArrival: true }]), []);
  });
});
