import { ApplicationError } from "../../core/ApplicationError";
import { createProductSchema, type CreateProductInput } from "./product.schemas";
import { ProductRepository } from "./product.repository";

export class ProductService {
  constructor(private readonly repository: ProductRepository) {}

  async list() {
    const result = await this.repository.list();
    if (result.error) throw new ApplicationError("Products could not be loaded", "database_error", 500);
    return result.data;
  }

  async create(input: unknown, actorId: string) {
    const parsed = createProductSchema.safeParse(input);
    if (!parsed.success) throw new ApplicationError("Product fields are invalid", "validation_error", 422);
    return this.createValidated(parsed.data, actorId);
  }

  private async createValidated(input: CreateProductInput, actorId: string) {
    const result = await this.repository.create({ ...input, actorId });
    if (result.error) {
      const duplicate = result.error.code === "23505";
      const duplicateText = `${result.error.message ?? ""} ${result.error.details ?? ""}`.toLowerCase();
      const message = duplicateText.includes("slug")
        ? "A product with this generated URL already exists. Please try again."
        : "A product with these details already exists.";
      throw new ApplicationError(duplicate ? message : "Product could not be created", duplicate ? "duplicate_product" : "database_error", duplicate ? 409 : 500);
    }
    // Price the product immediately. A create that skipped this left
    // display_price null, so the storefront rendered "On request" for a product
    // that had a perfectly good price until someone re-saved it by hand.
    const repriced = await this.repository.reprice(result.data.id, actorId);
    return repriced ?? result.data;
  }
}
