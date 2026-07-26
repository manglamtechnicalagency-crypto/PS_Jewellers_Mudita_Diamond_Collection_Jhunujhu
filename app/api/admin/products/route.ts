import { NextResponse } from "next/server";
import { hasValidSameOrigin, requireAdmin } from "@/src/lib/admin-auth";
import { isApplicationError } from "@/src/server/core/ApplicationError";
import { ProductRepository, ProductService } from "@/src/server/features/products";

function errorResponse(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET() {
  try {
    const auth = await requireAdmin();
    if (auth.error === "not_configured") return errorResponse(503, "not_configured", "Admin storage is not configured");
    if (auth.error === "internal") return errorResponse(500, "internal_error", "Admin authentication is temporarily unavailable");
    if (auth.error === "unauthorized") return errorResponse(401, "unauthorized", "Authentication is required");
    if (auth.error === "mfa_required") return errorResponse(401, "mfa_required", "Two-factor verification is required");
    if (auth.error === "forbidden") return errorResponse(403, "forbidden", "You do not have permission to view products");

    const service = new ProductService(new ProductRepository(auth.client));
    return NextResponse.json({ data: await service.list() }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[admin-products] list_failed", { errorName: error instanceof Error ? error.name : "UnknownError" });
    return errorResponse(500, "internal_error", "Products could not be loaded");
  }
}

export async function POST(request: Request) {
  try {
    if (!hasValidSameOrigin(request)) return errorResponse(403, "invalid_origin", "Request origin is not allowed");
    const auth = await requireAdmin(["super_admin", "admin", "editor"]);
    if (auth.error === "not_configured") return errorResponse(503, "not_configured", "Admin storage is not configured");
    if (auth.error === "internal") return errorResponse(500, "internal_error", "Admin authentication is temporarily unavailable");
    if (auth.error === "unauthorized") return errorResponse(401, "unauthorized", "Authentication is required");
    if (auth.error === "mfa_required") return errorResponse(401, "mfa_required", "Two-factor verification is required");
    if (auth.error === "forbidden") return errorResponse(403, "forbidden", "You do not have permission to create products");

    let input: unknown;
    try { input = await request.json(); } catch { return errorResponse(400, "invalid_json", "Request body must be valid JSON"); }
    const service = new ProductService(new ProductRepository(auth.client));
    return NextResponse.json({ data: await service.create(input, auth.user.id) }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (isApplicationError(error)) return errorResponse(error.status, error.code, error.message);
    console.error("[admin-products] create_failed", { errorName: error instanceof Error ? error.name : "UnknownError" });
    return errorResponse(500, "internal_error", "Product could not be created");
  }
}
