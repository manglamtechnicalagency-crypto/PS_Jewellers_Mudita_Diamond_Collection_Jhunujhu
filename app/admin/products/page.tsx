import Link from "next/link";
import { redirect } from "next/navigation";
import LogoutButton from "../_components/LogoutButton";
import { requireAdmin } from "@/src/lib/admin-auth";
import ProductManager from "./ProductManager";
import BulkProductImport from "./BulkProductImport";
import BulkOperations from "./BulkOperations";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  const auth = await requireAdmin();
  if (auth.error === "not_configured")
    return <p className="p-10">Configure Supabase before using products.</p>;
  if (auth.error === "unauthorized" || auth.error === "mfa_required")
    redirect("/admin/login");
  if (auth.error === "forbidden")
    return (
      <p className="p-10">You do not have permission to manage products.</p>
    );
  if (auth.error === "internal" || !auth.client)
    return (
      <p className="p-10">
        Products could not be loaded right now. Please try again later.
      </p>
    );
  const { data: products, error: productsError } = await auth.client
    .from("products")
    .select(
      "id, sku, slug, name, display_price, status, stock_quantity, updated_at",
    )
    .is("deleted_at", null)
    .order("display_order")
    .order("updated_at", { ascending: false });
  if (productsError)
    return (
      <p className="p-10">
        Products could not be loaded right now. Please try again later.
      </p>
    );

  return (
    <main className="min-h-screen bg-cream px-5 py-8 text-ink lg:px-10">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-col justify-between gap-4 border-b border-line pb-6 sm:flex-row sm:items-end">
          <div>
            <Link
              href="/admin"
              className="text-sm text-gold-600 hover:underline"
            >
              ← Dashboard
            </Link>
            <h1 className="mt-3 font-serif text-4xl">Products</h1>
            <p className="mt-2 text-sm text-ink-soft">
              Create, edit, publish, archive, and synchronize catalogue records.
            </p>
          </div>
          <LogoutButton />
        </header>
        <ProductManager initialProducts={products ?? []} />
        <BulkOperations products={products ?? []} />
        <BulkProductImport />
      </div>
    </main>
  );
}
