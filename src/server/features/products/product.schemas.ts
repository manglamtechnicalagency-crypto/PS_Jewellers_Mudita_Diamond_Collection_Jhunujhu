import { z } from "zod";

export const createProductSchema = z.object({
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(160),
  // Optional: the repository generates one when omitted. Previously unaccepted,
  // which made an operator-supplied SKU impossible to set at creation time.
  sku: z.string().trim().min(1).max(80).optional(),
  name: z.string().trim().min(1).max(180),
  shortDescription: z.string().trim().max(500).default(""),
  longDescription: z.string().trim().max(5000).default(""),
  careInstructions: z.string().trim().max(5000).default(""),
  categoryId: z.string().uuid(),
  subcategoryId: z.string().uuid().nullable().default(null),
  /**
   * Primary merchandising class. Required, with NO default: defaulting to any
   * value would silently misfile a product, which is the defect this field
   * exists to fix. Distinct from `categoryId` (jewellery type: Rings, Earrings)
   * and from `metalPurity` (material composition).
   */
  jewelleryCategory: z.enum(["gold", "silver", "diamond", "platinum"], {
    message: "Select a jewellery category: gold, silver, diamond or platinum.",
  }),
  metalType: z.string().trim().max(40).default(""),
  metalPurity: z.string().trim().max(40).default(""),
  metalWeightGrams: z.number().nonnegative().nullable().default(null),
  grossWeightGrams: z.number().nonnegative().nullable().default(null),
  netWeightGrams: z.number().nonnegative().nullable().default(null),
  stoneType: z.string().trim().max(80).default(""),
  stoneCarat: z.number().nonnegative().nullable().default(null),
  stoneClarity: z.string().trim().max(40).default(""),
  stoneColour: z.string().trim().max(40).default(""),
  stoneCount: z.number().int().nonnegative().nullable().default(null),
  certification: z.string().trim().max(160).default(""),
  certificateNumber: z.string().trim().max(120).default(""),
  hallmarkCode: z.string().trim().max(120).default(""),
  collectionId: z.string().uuid().nullable().default(null),
  priceMode: z.enum(["fixed", "on_request", "weight_based"]).default("fixed"),
  basePrice: z.number().nonnegative().nullable().default(null),
  makingCharges: z.number().nonnegative().default(0),
  wastagePercent: z.number().nonnegative().max(100).default(0),
  gstPercent: z.number().nonnegative().max(100).default(3),
  discountType: z.enum(["flat", "percentage"]).nullable().default(null),
  discountValue: z.number().nonnegative().default(0),
  stockQuantity: z.number().int().nonnegative().default(0),
  stockStatus: z.enum(["in_stock", "low_stock", "out_of_stock", "made_to_order"]).default("in_stock"),
  status: z.enum(["draft", "published", "archived"]).default("draft"),
  // Merchandising and SEO fields. The update route has always accepted these;
  // omitting them here forced a create-then-immediately-edit round trip.
  sizeOptions: z.array(z.string().trim().min(1).max(40)).max(50).default([]),
  tags: z.array(z.string().trim().min(1).max(80)).max(100).default([]),
  seoTitle: z.string().trim().max(180).default(""),
  seoDescription: z.string().trim().max(500).default(""),
  seoKeywords: z.array(z.string().trim().min(1).max(80)).max(100).default([]),
  isFeatured: z.boolean().default(false),
  isNewArrival: z.boolean().default(false),
  isBestSeller: z.boolean().default(false),
  displayOrder: z.number().int().nonnegative().default(0),
  workflowStatus: z.enum(["draft", "review", "scheduled", "published", "archived"]).default("draft"),
  publishAt: z.string().datetime().nullable().default(null),
}).strict().superRefine((value, context) => {
  // Mirrors the update route. Without it a product could be created as
  // "fixed price" with no price, which renders as "On request" on the storefront.
  if (value.priceMode === "fixed" && (value.basePrice === null || value.basePrice <= 0)) context.addIssue({ code: "custom", path: ["basePrice"], message: "Enter a regular price, or choose Price on request." });
  if (value.discountType === "percentage" && value.discountValue > 100) context.addIssue({ code: "custom", path: ["discountValue"], message: "Percentage discount must be between 1 and 100." });
  if (value.discountType && value.discountValue <= 0) context.addIssue({ code: "custom", path: ["discountValue"], message: "Offer discount must be greater than zero." });
  if (value.discountType === "flat" && value.basePrice !== null && value.discountValue >= value.basePrice) context.addIssue({ code: "custom", path: ["discountValue"], message: "The offer discount must be lower than the regular price." });
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
