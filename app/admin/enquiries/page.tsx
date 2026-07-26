import Link from "next/link";
import { redirect } from "next/navigation";
import LogoutButton from "../_components/LogoutButton";
import { requireAdmin } from "@/src/lib/admin-auth";
import EnquiryManager from "./EnquiryManager";

export const dynamic = "force-dynamic";
export default async function EnquiriesPage() {
  const auth = await requireAdmin();
  if (auth.error === "not_configured")
    return <p className="p-10">Configure Supabase before using enquiries.</p>;
  if (auth.error === "unauthorized" || auth.error === "mfa_required")
    redirect("/admin/login");
  if (auth.error === "forbidden")
    return (
      <p className="p-10">You do not have permission to view enquiries.</p>
    );
  if (auth.error === "internal")
    return <p className="p-10">Enquiries could not be loaded right now.</p>;
  const [{ data, error }, { data: staff }] = await Promise.all([
    auth.client
      .from("enquiries")
      .select(
        "id, enquiry_number, name, email, phone, message, product_id, status, source, preferred_contact, assigned_to, internal_notes, next_follow_up_at, created_at, products(name, sku, slug)",
      )
      .order("created_at", { ascending: false })
      .limit(25),
    auth.client
      .from("profiles")
      .select("id, display_name")
      .in("role", ["super_admin", "admin", "editor"])
      .order("display_name"),
  ]);
  if (error)
    return <p className="p-10">Enquiries could not be loaded right now.</p>;
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
            <h1 className="mt-3 font-serif text-4xl">Enquiries</h1>
            <p className="mt-2 text-sm text-ink-soft">
              CRM queue with lifecycle status, ownership, follow-ups, timeline,
              search and export.
            </p>
          </div>
          <LogoutButton />
        </header>
        <EnquiryManager initialEnquiries={data ?? []} staff={staff ?? []} />
      </div>
    </main>
  );
}
