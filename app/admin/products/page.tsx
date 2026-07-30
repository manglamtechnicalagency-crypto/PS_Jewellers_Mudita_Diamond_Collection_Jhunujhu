import Link from "next/link";
import { redirect } from "next/navigation";
import LogoutButton from "../_components/LogoutButton";
import { requireAdmin } from "@/src/lib/admin-auth";
import ProductManager from "./ProductManager";
import BulkOperations from "./BulkOperations";
import BulkProductImport from "./BulkProductImport";
import { publicObjectUrl } from "@/src/lib/r2-server";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

/**
 * ?q= is user input. Trimmed and capped; the value is only ever used inside a
 * parameterised PostgREST filter, never concatenated into raw SQL.
 *
 * Commas and parentheses are stripped because PostgREST's `.or()` uses them as
 * its own delimiters — a name containing one would otherwise break the filter
 * apart and change which columns are searched.
 */
function parseQuery(raw: string | string[] | undefined) {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return (value ?? "").replace(/[,()]/g, " ").trim().slice(0, 80);
}

/** ?page= is user input: accept positive integers only, anything else is page 1. */
function parsePage(raw: string | string[] | undefined) {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value || !/^\d+$/.test(value)) return 1;
  const parsed = Number.parseInt(value, 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 1;
}

export default async function AdminProductsPage({
  searchParams,
}: {
  // Next 15+ hands searchParams over as a Promise.
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const requestedPage = parsePage(resolvedSearchParams.page);
  const query = parseQuery(resolvedSearchParams.q);
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
  const client = auth.client;
  const fetchPage = (page: number) => {
    const from = (page - 1) * PAGE_SIZE;
    let request = client
      .from("products")
      .select(
        "id, slug, name, display_price, status, stock_quantity, updated_at",
        { count: "exact" },
      )
      .is("deleted_at", null);
    // Filtered in the query rather than in the browser: the list is paginated
    // at 25, so a client-side filter would only ever search the current page
    // and would confidently report "no results" for a product two pages away.
    if (query) {
      const pattern = `%${query}%`;
      request = request.or(
        `name.ilike.${pattern},sku.ilike.${pattern},slug.ilike.${pattern}`,
      );
    }
    return request
      .order("display_order")
      .order("updated_at", { ascending: false })
      .range(from, from + PAGE_SIZE - 1);
  };

  let { data: products, error: productsError, count } = await fetchPage(requestedPage);
  let currentPage = requestedPage;
  let total = count ?? 0;
  // A .range() past the last row is not an empty result — PostgREST answers 416
  // with code PGRST103, so an out-of-range ?page= arrives here as an *error*.
  // Guarding the clamp on `!productsError` therefore never fired, and a stale
  // bookmark took down the whole screen with "Products could not be loaded".
  const outOfRange =
    productsError?.code === "PGRST103" ||
    /range not satisfiable/i.test(productsError?.message ?? "");
  let totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (outOfRange || (!productsError && requestedPage > totalPages)) {
    currentPage = totalPages;
    const retry = await fetchPage(currentPage);
    products = retry.data;
    productsError = retry.error;
    // The failed first attempt may not have returned a usable count, so recompute
    // the page total from the retry before it is handed to the pagination UI.
    if (retry.count !== null && retry.count !== undefined) {
      total = retry.count;
      totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    }
  }
  if (productsError)
    return (
      <p className="p-10">
        Products could not be loaded right now. Please try again later.
      </p>
    );

  const pageProducts = products ?? [];
  const rangeStart = total === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const rangeEnd = total === 0 ? 0 : rangeStart + pageProducts.length - 1;

  const productIds = pageProducts.map((product) => product.id);
  const { data: productMedia } = productIds.length
    ? await client
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
  const productsWithImages = pageProducts.map((product) => ({
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
              Create, edit, publish, delete, and synchronize catalogue records.
            </p>
          </div>
          <LogoutButton />
        </header>
        <ProductManager
          initialProducts={productsWithImages}
          pagination={{ page: currentPage, pageSize: PAGE_SIZE, total, totalPages, rangeStart, rangeEnd }}
          query={query}
        />
        {/* Only rendered for roles the bulk and import APIs actually accept —
            a viewer would otherwise get a 403 after filling the form in. */}
        {auth.role === "super_admin" || auth.role === "admin" || auth.role === "editor" ? (
          <>
            <BulkOperations products={pageProducts.map((product) => ({ id: product.id, name: product.name }))} />
            <BulkProductImport />
          </>
        ) : null}
      </div>
    </main>
  );
}
