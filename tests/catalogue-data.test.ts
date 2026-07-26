import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildCatalogueProducts } from "../src/lib/catalogue-data.ts";

describe("database catalogue mapping", () => {
  it("maps approved media and drops products without usable media", () => {
    const previous = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;
    process.env.NEXT_PUBLIC_R2_PUBLIC_URL = "https://media.example.test";
    try {
      const products = buildCatalogueProducts(
        [
          { id: "p1", slug: "ring", name: "Ring", display_price: 100, base_price: 120 },
          { id: "p2", slug: "missing", name: "Missing" },
        ],
        [
          { product_id: "p1", role: "primary", media: { storage_key: "products/p1/main.webp", mime_type: "image/webp" } },
        ],
      );
      assert.equal(products.length, 1);
      assert.equal(products[0]?.image, "https://media.example.test/products/p1/main.webp");
      assert.equal(products[0]?.offerPrice, 100);
    } finally {
      if (previous === undefined) delete process.env.NEXT_PUBLIC_R2_PUBLIC_URL;
      else process.env.NEXT_PUBLIC_R2_PUBLIC_URL = previous;
    }
  });

  it("rejects malformed media rows without throwing", () => {
    process.env.NEXT_PUBLIC_R2_PUBLIC_URL = "https://media.example.test";
    const products = buildCatalogueProducts(
      [{ id: "p1", slug: "broken", name: "Broken" }],
      [{ product_id: "p1", role: "primary", media: { storage_key: "", mime_type: "image/webp" } }],
    );
    assert.deepEqual(products, []);
  });
});
