import Link from "next/link";
import { redirect } from "next/navigation";
import LogoutButton from "../../_components/LogoutButton";
import { requireAdmin } from "@/src/lib/admin-auth";
import ProductForm from "../ProductForm";

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  const auth = await requireAdmin(["super_admin", "admin", "editor"]);
  if (auth.error === "not_configured") return <p className="p-10">Configure Supabase before creating products.</p>;
  if (auth.error === "unauthorized" || auth.error === "mfa_required") redirect("/admin/login");
  if (auth.error === "forbidden") return <p className="p-10">You do not have permission to create products.</p>;
  if (auth.error) return <p className="p-10">Product form is unavailable right now.</p>;
  return <main className="min-h-screen bg-cream px-5 py-8 text-ink lg:px-10"><div className="mx-auto max-w-6xl"><header className="flex flex-col justify-between gap-4 border-b border-line pb-6 sm:flex-row sm:items-end"><div><Link href="/admin/products" className="text-sm text-gold-600 hover:underline">← Products</Link><h1 className="mt-3 font-serif text-4xl">Add new product</h1><p className="mt-2 text-sm text-ink-soft">Create a catalogue product with pricing, publishing, and media.</p></div><LogoutButton /></header><ProductForm /></div></main>;
}
