import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { generateWhatsAppMessage, whatsappHref } from "../src/lib/storefront-enquiry.ts";
import type { Product } from "../src/types.ts";

const product = {
  id: "PSJ-TEST-001",
  slug: "heritage-ring",
  name: "Heritage Halo Ring",
  category: "Gold Rings",
  collection: "Maharani Bridal",
  sku: "PSJ-22K-RG-001",
  price: 0,
  offerPrice: 0,
  discount: "",
  priceOnRequest: true,
  availability: "In Stock",
  hallmark: "BIS 916 Hallmark",
  certification: "PS Authenticity Certificate",
  purity: "22K Gold",
  weight: "4.250 g",
  stoneType: "None",
  occasion: "Wedding",
  image: "/ring.jpg",
  images: ["/ring.jpg"],
  rating: 0,
  reviewsCount: 0,
  badge: "Best Seller",
  tags: ["ring"],
  jewelleryCategory: "gold",
  isNewArrival: false,
  publishedAt: "2026-01-01T00:00:00.000Z",
  highlights: [],
  description: "A classic halo silhouette.",
  specs: {},
  care: [],
  reviews: [],
} satisfies Product;

describe("generateWhatsappMessage", () => {
  it("includes product context and the requested pricing checklist", () => {
    const message = generateWhatsAppMessage(product, "https://psjewellers.com/product/heritage-ring");

    assert.match(message, /Product Name:\nHeritage Halo Ring/);
    assert.match(message, /Category:\nGold Rings/);
    assert.match(message, /Metal:\nNone/);
    assert.match(message, /Purity:\n22K Gold/);
    assert.match(message, /Weight:\n4\.250 g/);
    assert.match(message, /Product Link:\nhttps:\/\/psjewellers\.com\/product\/heritage-ring/);
    assert.match(message, /Today's Price/);
    assert.match(message, /More Images/);
  });
});

describe("whatsappHref", () => {
  it("encodes the generated message for the configured showroom number", () => {
    const href = whatsappHref(product, "919829407255", "https://example.com/p/heritage-ring");

    assert.match(href, /^https:\/\/wa\.me\/919829407255\?text=/);
    assert.match(decodeURIComponent(href), /Heritage Halo Ring/);
  });
});
