import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createProductSchema } from "../src/server/features/products/product.schemas.ts";

const CATEGORY_ID = "3f0d6bb2-6b4b-4c3f-9a2f-8f6f1b2c3d4e";

/**
 * Smallest payload that satisfies the schema. `priceMode` defaults to "fixed",
 * so a positive `basePrice` is mandatory even though the field itself is
 * nullable — see the superRefine in product.schemas.ts.
 */
function base(overrides: Record<string, unknown> = {}) {
  return {
    slug: "solitaire-ring",
    name: "Solitaire Ring",
    categoryId: CATEGORY_ID,
    basePrice: 50000,
    ...overrides,
  };
}

/** Drops a key from a payload without tripping `noUnusedLocals`. */
function omit(payload: Record<string, unknown>, key: string): Record<string, unknown> {
  const copy = { ...payload };
  delete copy[key];
  return copy;
}

function issues(input: unknown) {
  const parsed = createProductSchema.safeParse(input);
  // `assert.fail` returns never, which narrows `parsed` to the failure branch.
  if (parsed.success) assert.fail("expected the payload to be rejected");
  return parsed.error.issues;
}

/** Collects the `path[0]` of every issue so assertions do not depend on order. */
function issuePaths(input: unknown): string[] {
  return issues(input).map((issue) => String(issue.path[0] ?? ""));
}

function messageFor(input: unknown, field: string): string | undefined {
  return issues(input).find((issue) => issue.path[0] === field)?.message;
}

describe("createProductSchema — required fields", () => {
  it("accepts the minimal valid payload", () => {
    const parsed = createProductSchema.safeParse(base());
    assert.equal(parsed.success, true);
  });

  it("applies documented defaults", () => {
    const parsed = createProductSchema.parse(base());
    assert.equal(parsed.priceMode, "fixed");
    assert.equal(parsed.status, "draft");
    assert.equal(parsed.workflowStatus, "draft");
    assert.equal(parsed.gstPercent, 3);
    assert.equal(parsed.makingCharges, 0);
    assert.equal(parsed.stockStatus, "in_stock");
    assert.deepEqual(parsed.tags, []);
    assert.deepEqual(parsed.seoKeywords, []);
    assert.equal(parsed.subcategoryId, null);
    assert.equal(parsed.collectionId, null);
    assert.equal(parsed.publishAt, null);
    assert.equal(parsed.discountType, null);
    assert.equal(parsed.discountValue, 0);
    assert.equal(parsed.isFeatured, false);
    assert.equal(parsed.displayOrder, 0);
  });

  it("rejects a missing name and a missing category", () => {
    assert.ok(issuePaths(omit(base(), "name")).includes("name"));
    assert.ok(issuePaths(omit(base(), "categoryId")).includes("categoryId"));
  });

  it("rejects an empty name", () => {
    assert.ok(issuePaths(base({ name: "" })).includes("name"));
  });

  it("rejects a non-uuid categoryId", () => {
    assert.ok(issuePaths(base({ categoryId: "cat-rings" })).includes("categoryId"));
  });

  it("is strict — unknown keys are rejected rather than silently dropped", () => {
    const parsed = createProductSchema.safeParse(base({ role: "super_admin" }));
    assert.equal(parsed.success, false, "unknown keys must not pass through to the repository");
  });

  it("trims string fields", () => {
    const parsed = createProductSchema.parse(base({ name: "  Solitaire Ring  " }));
    assert.equal(parsed.name, "Solitaire Ring");
  });
});

describe("createProductSchema — slug", () => {
  const valid = ["ring", "solitaire-ring", "ring-22k-gold", "a1"];
  const invalid = ["Solitaire-Ring", "solitaire ring", "-ring", "ring-", "ring--gold", "ring_gold", ""];

  it("accepts lowercase hyphenated slugs", () => {
    for (const slug of valid) {
      assert.equal(createProductSchema.safeParse(base({ slug })).success, true, slug);
    }
  });

  it("rejects uppercase, spaces, underscores and stray hyphens", () => {
    for (const slug of invalid) {
      assert.ok(issuePaths(base({ slug })).includes("slug"), slug);
    }
  });

  it("rejects a slug over 160 characters", () => {
    assert.ok(issuePaths(base({ slug: "a".repeat(161) })).includes("slug"));
  });
});

describe("createProductSchema — fixed price requires a base price", () => {
  it("rejects fixed pricing with a null base price", () => {
    assert.ok(issuePaths(base({ priceMode: "fixed", basePrice: null })).includes("basePrice"));
  });

  it("rejects fixed pricing when basePrice is omitted (it defaults to null)", () => {
    assert.ok(issuePaths(omit(base(), "basePrice")).includes("basePrice"));
  });

  it("rejects a zero base price under fixed pricing", () => {
    assert.ok(issuePaths(base({ priceMode: "fixed", basePrice: 0 })).includes("basePrice"));
  });

  it("carries the operator-facing message", () => {
    assert.equal(
      messageFor(base({ basePrice: null }), "basePrice"),
      "Enter a regular price, or choose Price on request.",
    );
  });

  it("allows a null base price for on_request and weight_based pricing", () => {
    for (const priceMode of ["on_request", "weight_based"]) {
      const parsed = createProductSchema.safeParse(base({ priceMode, basePrice: null }));
      assert.equal(parsed.success, true, priceMode);
    }
  });

  it("rejects a negative base price", () => {
    assert.ok(issuePaths(base({ basePrice: -1 })).includes("basePrice"));
  });

  it("rejects an unknown price mode", () => {
    assert.ok(issuePaths(base({ priceMode: "auction" })).includes("priceMode"));
  });
});

describe("createProductSchema — discount rules", () => {
  it("rejects a percentage discount above 100", () => {
    const paths = issuePaths(base({ discountType: "percentage", discountValue: 101 }));
    assert.ok(paths.includes("discountValue"));
  });

  it("accepts a percentage discount of exactly 100", () => {
    assert.equal(
      createProductSchema.safeParse(base({ discountType: "percentage", discountValue: 100 })).success,
      true,
    );
  });

  it("rejects a zero discount when a discount type is set", () => {
    assert.equal(
      messageFor(base({ discountType: "flat", discountValue: 0 }), "discountValue"),
      "Offer discount must be greater than zero.",
    );
  });

  it("rejects a flat discount that meets or exceeds the base price", () => {
    assert.ok(issuePaths(base({ basePrice: 1000, discountType: "flat", discountValue: 1000 })).includes("discountValue"));
    assert.ok(issuePaths(base({ basePrice: 1000, discountType: "flat", discountValue: 1500 })).includes("discountValue"));
  });

  it("accepts a flat discount below the base price", () => {
    const parsed = createProductSchema.safeParse(base({ basePrice: 1000, discountType: "flat", discountValue: 999 }));
    assert.equal(parsed.success, true);
  });

  it("ignores discount value checks when no discount type is set", () => {
    // discountValue defaults to 0 and no discountType is present, so the
    // "greater than zero" rule must not fire on an ordinary product.
    assert.equal(createProductSchema.safeParse(base({ discountValue: 0 })).success, true);
  });

  it("rejects an unknown discount type", () => {
    assert.ok(issuePaths(base({ discountType: "bogof" })).includes("discountType"));
  });

  it("rejects a negative discount value", () => {
    assert.ok(issuePaths(base({ discountType: "flat", discountValue: -5 })).includes("discountValue"));
  });
});

describe("createProductSchema — array and numeric caps", () => {
  it("caps tags at 100 entries", () => {
    assert.equal(createProductSchema.safeParse(base({ tags: Array(100).fill("gold") })).success, true);
    assert.ok(issuePaths(base({ tags: Array(101).fill("gold") })).includes("tags"));
  });

  it("caps seoKeywords at 100 entries", () => {
    assert.ok(issuePaths(base({ seoKeywords: Array(101).fill("ring") })).includes("seoKeywords"));
  });

  it("caps sizeOptions at 50 entries", () => {
    assert.equal(createProductSchema.safeParse(base({ sizeOptions: Array(50).fill("12") })).success, true);
    assert.ok(issuePaths(base({ sizeOptions: Array(51).fill("12") })).includes("sizeOptions"));
  });

  it("rejects empty tag entries", () => {
    assert.ok(issuePaths(base({ tags: [""] })).includes("tags"));
  });

  it("caps wastagePercent and gstPercent at 100", () => {
    assert.ok(issuePaths(base({ wastagePercent: 101 })).includes("wastagePercent"));
    assert.ok(issuePaths(base({ gstPercent: 101 })).includes("gstPercent"));
  });

  it("requires whole numbers for counts", () => {
    assert.ok(issuePaths(base({ stockQuantity: 1.5 })).includes("stockQuantity"));
    assert.ok(issuePaths(base({ stoneCount: 2.5 })).includes("stoneCount"));
    assert.ok(issuePaths(base({ displayOrder: 0.5 })).includes("displayOrder"));
  });

  it("rejects negative weights", () => {
    assert.ok(issuePaths(base({ netWeightGrams: -0.1 })).includes("netWeightGrams"));
    assert.ok(issuePaths(base({ grossWeightGrams: -1 })).includes("grossWeightGrams"));
  });
});

describe("createProductSchema — publishAt and status enums", () => {
  it("accepts an ISO datetime or null", () => {
    assert.equal(createProductSchema.safeParse(base({ publishAt: "2026-01-01T00:00:00.000Z" })).success, true);
    assert.equal(createProductSchema.safeParse(base({ publishAt: null })).success, true);
  });

  it("rejects a date-only publishAt", () => {
    assert.ok(issuePaths(base({ publishAt: "2026-01-01" })).includes("publishAt"));
  });

  it("accepts every documented status and workflow status", () => {
    for (const status of ["draft", "published", "archived"]) {
      assert.equal(createProductSchema.safeParse(base({ status })).success, true, status);
    }
    for (const workflowStatus of ["draft", "review", "scheduled", "published", "archived"]) {
      assert.equal(createProductSchema.safeParse(base({ workflowStatus })).success, true, workflowStatus);
    }
  });

  it("rejects an unknown stock status", () => {
    assert.ok(issuePaths(base({ stockStatus: "backordered" })).includes("stockStatus"));
  });
});
