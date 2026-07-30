import { redirect } from "next/navigation";
import Link from "next/link";
import LogoutButton from "./_components/LogoutButton";
import MarketRatesWidget, { type MarketRatesInitial } from "./_components/MarketRatesWidget";
import { getMarketRates } from "@/src/lib/metal-market-rates-server";
import { requireAdmin } from "@/src/lib/admin-auth";
import BrandLogo from "@/src/components/BrandLogo";

const navigation = [
  { label: "Products", href: "/admin/products" },
  { label: "Media Library", href: "/admin/media" },
  { label: "Catalogue settings", href: "/admin/catalogue" },
  { label: "Site settings", href: "/admin/settings" },
];

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const auth = await requireAdmin();
  if (auth.error === "not_configured") {
    return <AdminSetupMessage />;
  }
  if (auth.error === "unauthorized" || auth.error === "mfa_required")
    redirect("/admin/login");
  if (auth.error === "internal") return <AdminErrorMessage />;
  if (auth.error === "forbidden")
    return <p className="p-10">Your account is not assigned an admin role.</p>;

  // requireAdmin already resolved the profile; re-querying it here would be a
  // second round trip on every dashboard load.
  const client = auth.client;
  const displayName = auth.displayName;
  const role = auth.role;

  // Market rates ride along in the same Promise.all so the upstream latency
  // overlaps the Supabase counts instead of stacking on top of them. Its
  // failure must never gate the dashboard, so it is handled separately below
  // rather than joining the error check.
  const [products, activeProducts, media, productMedia, marketRates] =
    await Promise.all([
      client
        .from("products")
        .select("id", { count: "exact", head: true })
        .is("deleted_at", null),
      client
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("status", "published")
        .is("deleted_at", null),
      client
        .from("media")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true)
        .is("deleted_at", null),
      client
        .from("product_media")
        .select("media_id", { count: "exact", head: true }),
      getMarketRates(),
    ]);

  const initialMarketRates: MarketRatesInitial = marketRates.ok
    ? { ok: true, payload: marketRates.payload }
    : { ok: false, message: marketRates.message };
  if (
    products.error ||
    activeProducts.error ||
    media.error ||
    productMedia.error
  ) {
    console.error("[admin-dashboard] data_load_failed", {
      products: products.error?.code,
      activeProducts: activeProducts.error?.code,
      media: media.error?.code,
      productMedia: productMedia.error?.code,
    });
    return <AdminErrorMessage />;
  }

  const cards = [
    ["Total products", products.count ?? 0],
    ["Published", activeProducts.count ?? 0],
    ["Active media", media.count ?? 0],
    ["Product-linked media", productMedia.count ?? 0],
  ];

  return (
    <main className="min-h-screen bg-cream text-ink">
      <div className="mx-auto flex max-w-[1440px] flex-col lg:flex-row">
        <aside className="border-b border-line bg-white px-6 py-6 lg:min-h-screen lg:w-64 lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between lg:block">
            <div>
              <BrandLogo className="h-24 w-auto" priority />
              <p className="mt-2 font-serif text-2xl">Control panel</p>
            </div>
            <LogoutButton />
          </div>
          <nav
            className="mt-10 grid grid-cols-2 gap-2 lg:grid-cols-1"
            aria-label="Admin navigation"
          >
            {navigation.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="rounded-xs px-3 py-2.5 text-sm text-ink-soft hover:bg-cream"
              >
                {item.label}
              </Link>
            ))}
            <Link href="/admin/products/new" className="rounded-xs bg-ink px-3 py-2.5 text-sm font-semibold text-white hover:bg-gold-500 lg:mt-2">
              + Add New Product
            </Link>
          </nav>
        </aside>
        <section className="flex-1 px-5 py-8 lg:px-10 lg:py-12">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-600">
                Dashboard
              </p>
              <h1 className="mt-2 font-serif text-4xl">
                Good to see you, {displayName || "admin"}.
              </h1>
            </div>
            <span className="text-sm text-muted">Role: {role}</span>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
            {cards.map(([label, value]) => (
              <article
                key={label}
                className="rounded-xs border border-line bg-white p-5"
              >
                <p className="text-sm text-muted">{label}</p>
                <p className="mt-3 font-serif text-3xl">{value}</p>
              </article>
            ))}
          </div>
          <div className="mt-8">
            <MarketRatesWidget initial={initialMarketRates} />
          </div>
          <div className="mt-8">
            <section className="rounded-xs border border-line bg-white p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-600">
                Next action
              </p>
              <h2 className="mt-2 font-serif text-2xl">
                {products.count
                  ? "Keep the storefront current"
                  : "Start the live catalogue"}
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-soft">
                {products.count
                  ? `${activeProducts.count ?? 0} products are published and ${media.count ?? 0} media assets are active. Update products or replace live images from the management screens.`
                  : "The database is ready, but it has no products yet. Add the first product, then attach its images or video from the media library."}
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href="/admin/products"
                  className="rounded-xs bg-ink px-4 py-3 text-sm font-semibold text-white hover:bg-gold-500"
                >
                  {products.count ? "Manage products" : "Add first product"}
                </Link>
                <Link
                  href="/admin/media"
                  className="rounded-xs border border-line px-4 py-3 text-sm font-semibold text-ink hover:border-gold-500"
                >
                  Open media library
                </Link>
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}

function AdminSetupMessage() {
  return (
    <main className="min-h-screen bg-cream px-5 py-16">
      <div className="mx-auto max-w-xl rounded-xs border border-line bg-white p-8">
        <BrandLogo className="h-28 w-auto" priority />
        <h1 className="mt-3 font-serif text-4xl">Admin setup required</h1>
        <p className="mt-4 text-sm leading-6 text-ink-soft">
          The admin panel is server-protected, but Supabase is not configured in
          this environment. Add the documented variables, run the migration in
          `supabase/migrations/0001_admin_foundation.sql`, enable TOTP MFA, and
          assign an admin role.
        </p>
      </div>
    </main>
  );
}

function AdminErrorMessage() {
  return (
    <main className="min-h-screen bg-cream px-5 py-16">
      <div className="mx-auto max-w-xl rounded-xs border border-line bg-white p-8">
        <BrandLogo className="h-28 w-auto" priority />
        <h1 className="mt-3 font-serif text-4xl">Admin data unavailable</h1>
        <p className="mt-4 text-sm leading-6 text-ink-soft">
          We could not load the admin data right now. Check the Supabase
          configuration and try again.
        </p>
      </div>
    </main>
  );
}
