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
      throw new ApplicationError(duplicate ? "SKU or slug already exists" : "Product could not be created", duplicate ? "duplicate_product" : "database_error", duplicate ? 409 : 500);
    }
    return result.data;
  }
}
