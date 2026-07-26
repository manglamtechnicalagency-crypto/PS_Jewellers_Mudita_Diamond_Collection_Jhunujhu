import { z } from "zod";

export const createProductSchema = z.object({
  sku: z.string().trim().min(1).max(80),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(160),
  name: z.string().trim().min(1).max(180),
  shortDescription: z.string().trim().max(500).default(""),
  categoryId: z.string().uuid(),
  collectionId: z.string().uuid().nullable().default(null),
  priceMode: z.enum(["fixed", "on_request", "weight_based"]).default("fixed"),
  basePrice: z.number().nonnegative().nullable().default(null),
  stockQuantity: z.number().int().nonnegative().default(0),
  status: z.enum(["draft", "published", "archived"]).default("draft"),
}).strict();

export type CreateProductInput = z.infer<typeof createProductSchema>;
