import Link from "next/link";
import { redirect } from "next/navigation";
import LogoutButton from "../_components/LogoutButton";
import { requireAdmin } from "@/src/lib/admin-auth";

export default async function AdminProductsPage() {
  const auth = await requireAdmin();
  if (auth.error === "not_configured") return <p className="p-10">Configure Supabase before using products.</p>;
  if (auth.error === "unauthorized") redirect("/admin/login");
  if (auth.error === "forbidden") return <p className="p-10">You do not have permission to manage products.</p>;
  const { data: products } = await auth.client.from("products").select("id, sku, name, display_price, status, stock_quantity, updated_at").is("deleted_at", null).order("display_order").order("updated_at", { ascending: false });

  return <main className="min-h-screen bg-cream px-5 py-8 text-ink lg:px-10"><div className="mx-auto max-w-6xl"><header className="flex flex-col justify-between gap-4 border-b border-line pb-6 sm:flex-row sm:items-end"><div><Link href="/admin" className="text-sm text-gold-600 hover:underline">← Dashboard</Link><h1 className="mt-3 font-serif text-4xl">Products</h1><p className="mt-2 text-sm text-ink-soft">Manage catalogue records stored in Supabase.</p></div><LogoutButton /></header><div className="mt-8 overflow-x-auto rounded-xs border border-line bg-white"><table className="w-full min-w-[700px] text-left text-sm"><thead className="border-b border-line bg-cream text-xs uppercase tracking-wider text-muted"><tr><th className="px-4 py-3">Product</th><th className="px-4 py-3">SKU</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Stock</th><th className="px-4 py-3">Updated</th></tr></thead><tbody>{products?.map((product) => <tr key={product.id} className="border-b border-line last:border-0"><td className="px-4 py-4 font-medium">{product.name}</td><td className="px-4 py-4 text-muted">{product.sku}</td><td className="px-4 py-4">{product.status}</td><td className="px-4 py-4">{product.stock_quantity}</td><td className="px-4 py-4 text-muted">{new Date(product.updated_at).toLocaleDateString("en-IN")}</td></tr>)}</tbody></table>{!products?.length ? <p className="p-8 text-center text-sm text-muted">No products yet. Run the migration and import the existing catalogue before adding records.</p> : null}</div></div></main>;
}
