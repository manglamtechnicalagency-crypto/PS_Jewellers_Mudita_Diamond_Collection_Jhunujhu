import Link from "next/link";
import { redirect } from "next/navigation";
import LogoutButton from "../_components/LogoutButton";
import { requireAdmin } from "@/src/lib/admin-auth";
import CatalogueSettings from "./CatalogueSettings";

export const dynamic = "force-dynamic";

export default async function CatalogueSettingsPage() {
  const auth = await requireAdmin();
  if (auth.error === "not_configured") return <p className="p-10">Configure Supabase before using catalogue settings.</p>;
  if (auth.error === "unauthorized" || auth.error === "mfa_required") redirect("/admin/login");
  if (auth.error === "forbidden") return <p className="p-10">You do not have permission to manage catalogue settings.</p>;
  if (auth.error === "internal") return <p className="p-10">Catalogue settings could not be loaded right now.</p>;
  const { data: taxonomy, error: taxonomyError } = await auth.client.from("taxonomy_terms").select("id, kind, name, slug, parent_id, display_order, is_active").eq("is_active", true).order("kind").order("display_order");
  const { data: rates, error: ratesError } = await auth.client.from("metal_rates").select("id, metal, purity, rate_per_gram, effective_at, manual_override").order("metal").order("purity");
  if (taxonomyError || ratesError) return <p className="p-10">Catalogue settings could not be loaded right now.</p>;
  return <main className="min-h-screen bg-cream px-5 py-8 text-ink lg:px-10"><div className="mx-auto max-w-6xl"><header className="flex flex-col justify-between gap-4 border-b border-line pb-6 sm:flex-row sm:items-end"><div><Link href="/admin" className="text-sm text-gold-600 hover:underline">← Dashboard</Link><h1 className="mt-3 font-serif text-4xl">Catalogue settings</h1><p className="mt-2 text-sm text-ink-soft">Manage categories, collections, subcategories, and the rates used by weight-based pricing.</p></div><LogoutButton /></header><CatalogueSettings initialTaxonomy={taxonomy ?? []} initialRates={rates ?? []} /></div></main>;
}
