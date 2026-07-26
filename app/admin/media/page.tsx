import { redirect } from "next/navigation";
import Link from "next/link";
import LogoutButton from "../_components/LogoutButton";
import { requireAdmin } from "@/src/lib/admin-auth";
import MediaManager from "./MediaManager";

export const dynamic = "force-dynamic";

export default async function AdminMediaPage() {
  const auth = await requireAdmin();
  if (auth.error === "not_configured") return <p className="p-10">Configure Supabase before using the media library.</p>;
  if (auth.error === "unauthorized" || auth.error === "mfa_required") redirect("/admin/login");
  if (auth.error === "forbidden") return <p className="p-10">You do not have permission to manage media.</p>;
  if (auth.error === "internal") return <p className="p-10">Media could not be loaded right now.</p>;

  return <main className="min-h-screen bg-cream px-5 py-8 text-ink lg:px-10"><div className="mx-auto max-w-6xl"><header className="flex flex-col justify-between gap-4 border-b border-line pb-6 sm:flex-row sm:items-end"><div><Link href="/admin" className="text-sm text-gold-600 hover:underline">← Dashboard</Link><h1 className="mt-3 font-serif text-4xl">Media library</h1><p className="mt-2 text-sm text-ink-soft">Images and videos are stored in Cloudflare R2. Metadata and product links stay synchronized in Supabase.</p></div><LogoutButton /></header><MediaManager /></div></main>;
}
