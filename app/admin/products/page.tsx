import Link from "next/link";
import { redirect } from "next/navigation";
import LogoutButton from "../_components/LogoutButton";
import { requireAdmin } from "@/src/lib/admin-auth";
import ProductManager from "./ProductManager";
import { publicObjectUrl } from "@/src/lib/r2-server";

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
      "id, slug, name, display_price, status, stock_quantity, updated_at",
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

  const productIds = (products ?? []).map((product) => product.id);
  const { data: productMedia } = productIds.length
    ? await auth.client
        .from("product_media")
        .select("product_id, role, display_order, media:media_id(storage_key, mime_type, alt_text)")
        .in("product_id", productIds)
        .order("display_order")
    : { data: [] };
  const primaryImages = new Map<string, { url: string | null; alt: string }>();
  for (const link of productMedia ?? []) {
    const item = Array.isArray(link.media) ? link.media[0] : link.media;
    if (!item || !String(item.mime_type).startsWith("image/")) continue;
    if (link.role !== "primary" && primaryImages.has(link.product_id)) continue;
    primaryImages.set(link.product_id, { url: publicObjectUrl(String(item.storage_key)), alt: String(item.alt_text ?? "") });
  }
  const productsWithImages = (products ?? []).map((product) => ({
    ...product,
    primary_image_url: primaryImages.get(product.id)?.url ?? null,
    primary_image_alt: primaryImages.get(product.id)?.alt ?? product.name,
  }));

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
        <ProductManager initialProducts={productsWithImages} />
      </div>
    </main>
  );
}
