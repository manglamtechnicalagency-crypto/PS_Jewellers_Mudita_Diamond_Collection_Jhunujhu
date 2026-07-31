import { redirect } from "next/navigation";
import Link from "next/link";
import LogoutButton from "../_components/LogoutButton";
import { requireAdmin } from "@/src/lib/admin-auth";
import SectionGallery from "./SectionGallery";

export const dynamic = "force-dynamic";

/**
 * Section-oriented view of the media library: one card per storefront image
 * slot, showing what is live right now and letting an admin replace it.
 *
 * The flat library at /admin/media still exists for product media. This page
 * exists because a flat list cannot answer the only question an admin actually
 * has here — "what is on the homepage hero, and how do I change it?".
 *
 * Authorisation is enforced here on the server and again in every API route it
 * calls. Hiding the page is not the control.
 */
export default async function AdminMediaGalleryPage() {
  const auth = await requireAdmin(["super_admin", "admin", "editor"]);
  if (auth.error === "not_configured")
    return <p className="p-10">Configure Supabase before managing website images.</p>;
  if (auth.error === "unauthorized" || auth.error === "mfa_required") redirect("/admin/login");
  if (auth.error === "forbidden")
    return <p className="p-10">You do not have permission to manage website images.</p>;
  if (auth.error === "internal")
    return <p className="p-10">Website images could not be loaded right now.</p>;

  return (
    <main className="min-h-screen bg-cream px-5 py-8 text-ink lg:px-10">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-col justify-between gap-4 border-b border-line pb-6 sm:flex-row sm:items-end">
          <div>
            <Link href="/admin" className="text-sm text-gold-600 hover:underline">
              ← Dashboard
            </Link>
            <h1 className="mt-3 font-serif text-4xl">Website images</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-soft">
              Each card is one place on the live website. Upload an image to
              replace what visitors see. A section with no uploaded image keeps
              the design&rsquo;s built-in picture, so nothing ever goes blank.
            </p>
          </div>
          <LogoutButton />
        </header>
        <SectionGallery />
      </div>
    </main>
  );
}
