import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import LogoutButton from "../../_components/LogoutButton";
import { requireAdmin } from "@/src/lib/admin-auth";
import ProductEditor from "./ProductEditor";
import ProductWorkflowTools from "./ProductWorkflowTools";

export const dynamic = "force-dynamic";

export default async function ProductEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const auth = await requireAdmin();
  if (auth.error === "not_configured")
    return <p className="p-10">Configure Supabase before editing products.</p>;
  if (auth.error === "unauthorized" || auth.error === "mfa_required")
    redirect("/admin/login");
  if (auth.error === "forbidden")
    return <p className="p-10">You do not have permission to edit products.</p>;
  if (auth.error === "internal")
    return <p className="p-10">Product could not be loaded right now.</p>;
  const { id } = await params;
  const [product, media, reviews, pricing, priceHistory] = await Promise.all([
    auth.client
      .from("products")
      .select("*")
      .eq("id", id)
      .is("deleted_at", null)
      .single(),
    auth.client
      .from("product_media")
      .select(
        "media_id, role, display_order, media:media_id(id, storage_key, original_filename, mime_type, title, alt_text)",
      )
      .eq("product_id", id)
      .order("display_order"),
    auth.client
      .from("product_reviews")
      .select(
        "id, author_name, rating, title, body, status, is_verified_purchase, created_at, moderation_note",
      )
      .eq("product_id", id)
      .order("created_at", { ascending: false }),
    auth.client
      .rpc("calculate_product_price", { product_id: id })
      .maybeSingle(),
    auth.client
      .from("product_price_history")
      .select(
        "id, previous_display_price, new_display_price, previous_price_on_request, new_price_on_request, created_at",
      )
      .eq("product_id", id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);
  if (product.error || !product.data) notFound();
  return (
    <main className="min-h-screen bg-cream px-5 py-8 text-ink lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col justify-between gap-4 border-b border-line pb-6 sm:flex-row sm:items-end">
          <div>
            <Link
              href="/admin/products"
              className="text-sm text-gold-600 hover:underline"
            >
              ← Products
            </Link>
            <h1 className="mt-3 font-serif text-4xl">Edit product</h1>
            <p className="mt-2 text-sm text-ink-soft">
              Every saved field is persisted to Supabase and reflected in the
              live catalogue according to publication status.
            </p>
          </div>
          <LogoutButton />
        </header>
        <ProductEditor
          initialProduct={product.data}
          initialMedia={media.data ?? []}
          initialReviews={reviews.data ?? []}
          initialPricing={pricing.data ?? null}
        />
        <ProductWorkflowTools
          productId={id}
          productName={product.data.name}
          slug={product.data.slug}
          priceHistory={priceHistory.data ?? []}
        />
      </div>
    </main>
  );
}
