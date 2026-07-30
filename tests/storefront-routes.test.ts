import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CATALOGUE_ROUTES,
  NAV_LINKS,
  SIMPLE_ROUTES,
  filterProductsForRoute,
  findCatalogueRoute,
  isRenderablePath,
  renderablePaths,
} from "../src/lib/storefront-routes.ts";
import { STATIC_ROUTE_META } from "../src/lib/seo.ts";
import type { Product } from "../src/types.ts";

function product(overrides: Partial<Product> = {}): Product {
  return {
    id: "1", slug: "x", name: "Plain Gold Bangle", category: "Gold Jewellery", collection: "",
    sku: "SKU", price: 1000, offerPrice: 1000, discount: "", availability: "In Stock",
    hallmark: "", certification: "", purity: "22K", weight: "5 g", stoneType: "", occasion: "",
    image: "a.jpg", images: ["a.jpg"], rating: 0, reviewsCount: 0, badge: "", tags: [],
    highlights: [], description: "", specs: {}, care: [], reviews: [],
    ...overrides,
  };
}

describe("storefront route table", () => {
  it("every navigation link resolves to a renderable path", () => {
    // The regression this guards: New In, Bridal and Offers sat in the header
    // pointing at paths the router did not handle, returning a 404 body at 200.
    for (const [label, path] of NAV_LINKS) {
      assert.equal(isRenderablePath(path), true, `nav link "${label}" -> ${path} is not renderable`);
    }
  });

  it("covers the three formerly dead navigation routes", () => {
    for (const path of ["/new-arrivals", "/bridal-collection", "/offers"]) {
      assert.ok(findCatalogueRoute(path), `${path} has no catalogue route`);
      assert.equal(isRenderablePath(path), true);
    }
  });

  it("every route carrying SEO metadata is renderable", () => {
    // Anything in STATIC_ROUTE_META gets indexable metadata and a canonical URL,
    // so it must render real content.
    const notRenderable = Object.keys(STATIC_ROUTE_META).filter((path) => !isRenderablePath(path));
    assert.deepEqual(notRenderable, [], `metadata exists for unrenderable paths: ${notRenderable.join(", ")}`);
  });

  it("has no duplicate paths across the table", () => {
    const all = [...CATALOGUE_ROUTES.map((route) => route.path), ...Object.keys(SIMPLE_ROUTES)];
    assert.equal(new Set(all).size, all.length, "duplicate route path");
  });

  it("treats product and unknown paths correctly", () => {
    assert.equal(isRenderablePath("/product/anything"), true);
    assert.equal(isRenderablePath("/definitely-not-a-page"), false);
    assert.ok(renderablePaths().includes("/"));
  });
});

describe("filterProductsForRoute", () => {
  const items = [
    product({ id: "new", badge: "New Arrival" }),
    product({ id: "best", badge: "Best Seller" }),
    product({ id: "sale", discount: "10% off", price: 1000, offerPrice: 900 }),
    product({ id: "onrequest", priceOnRequest: true, discount: "10% off" }),
    product({ id: "bridal", tags: ["Bridal", "Wedding"] }),
    product({ id: "ring", category: "Rings" }),
  ];
  const run = (path: string) => {
    const route = findCatalogueRoute(path);
    assert.ok(route, `${path} missing`);
    return filterProductsForRoute(route, items).map((item) => item.id);
  };

  it("filters new arrivals and best sellers by badge", () => {
    assert.deepEqual(run("/new-arrivals"), ["new"]);
    assert.deepEqual(run("/best-sellers"), ["best"]);
  });

  it("treats a discount or a genuine offer price as an offer", () => {
    assert.deepEqual(run("/offers"), ["sale"]);
  });

  it("never lists a price-on-request item as an offer", () => {
    // It carries a discount string but publishes no price, so a shopper would
    // see "Price on request" under an Offers heading.
    assert.equal(run("/offers").includes("onrequest"), false);
  });

  it("matches keyword routes against name, tags, category and stone", () => {
    assert.deepEqual(run("/bridal-collection"), ["bridal"]);
    // Every seeded item is named "Plain Gold Bangle", so /bangles matches all.
    assert.equal(run("/bangles").length, items.length);
  });

  it("returns everything for /shop", () => {
    assert.equal(run("/shop").length, items.length);
  });

  it("matches any one of a route's synonym terms", () => {
    // Regional synonyms matter here: /nose-pin has to find both "Nath" and
    // "Nose Ring", and a single term left /chains matching nothing at all.
    const pieces = [
      product({ id: "nath", name: "Elegant Diamond Nath" }),
      product({ id: "nosering", name: "Gold Nose Ring" }),
      product({ id: "haar", name: "Oxidised Silver Long Haar" }),
      product({ id: "payal", name: "Silver Payal" }),
    ];
    const ids = (path: string) => {
      const route = findCatalogueRoute(path);
      assert.ok(route, `${path} missing`);
      return filterProductsForRoute(route, pieces).map((p) => p.id).sort();
    };
    assert.deepEqual(ids("/nose-pin"), ["nath", "nosering"]);
    assert.deepEqual(ids("/chains"), ["haar"]);
    assert.deepEqual(ids("/anklets"), ["payal"]);
  });

  it("every keyword route declares at least one term", () => {
    const missing = CATALOGUE_ROUTES.filter((r) => r.kind === "keyword" && !(r.terms?.length || r.value)).map((r) => r.path);
    assert.deepEqual(missing, []);
  });

  it("filters category routes by exact category", () => {
    assert.deepEqual(run("/rings"), ["ring"]);
  });
});
