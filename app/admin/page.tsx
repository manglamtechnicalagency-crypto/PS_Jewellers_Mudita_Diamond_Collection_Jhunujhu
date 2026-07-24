import { redirect } from "next/navigation";
import LogoutButton from "./_components/LogoutButton";
import { createSupabaseServerClient } from "@/src/lib/supabase/server";

const navigation = ["Products", "Media Library", "Pages & Modules", "Metal Rates", "Enquiries", "Audit Log", "Settings"];

export default async function AdminPage() {
  const client = await createSupabaseServerClient();
  if (!client) {
    return <AdminSetupMessage />;
  }

  const { data: userData } = await client.auth.getUser();
  if (!userData.user) redirect("/admin/login");

  const { data: profile } = await client.from("profiles").select("display_name, role").eq("id", userData.user.id).single();
  if (!profile || !["super_admin", "admin", "editor", "viewer"].includes(profile.role)) {
    return <p className="p-10">Your account is not assigned an admin role.</p>;
  }

  const [products, activeProducts, enquiries, auditLogs] = await Promise.all([
    client.from("products").select("id", { count: "exact", head: true }).is("deleted_at", null),
    client.from("products").select("id", { count: "exact", head: true }).eq("status", "published").is("deleted_at", null),
    client.from("enquiries").select("id", { count: "exact", head: true }).eq("status", "new"),
    client.from("audit_logs").select("id", { count: "exact", head: true }),
  ]);

  const cards = [
    ["Total products", products.count ?? 0],
    ["Published", activeProducts.count ?? 0],
    ["New enquiries", enquiries.count ?? 0],
    ["Audit events", auditLogs.count ?? 0],
  ];

  return (
    <main className="min-h-screen bg-cream text-ink">
      <div className="mx-auto flex max-w-[1440px] flex-col lg:flex-row">
        <aside className="border-b border-line bg-white px-6 py-6 lg:min-h-screen lg:w-64 lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between lg:block">
            <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-600">PS Jewellers</p><p className="mt-2 font-serif text-2xl">Control panel</p></div>
            <LogoutButton />
          </div>
          <nav className="mt-10 grid grid-cols-2 gap-2 lg:grid-cols-1" aria-label="Admin navigation">
            {navigation.map((item, index) => <a key={item} href={index === 0 ? "/admin/products" : "#"} className={`rounded-xs px-3 py-2.5 text-sm ${index === 0 ? "bg-gold-50 font-semibold text-gold-900" : "text-ink-soft hover:bg-cream"}`}>{item}</a>)}
          </nav>
        </aside>
        <section className="flex-1 px-5 py-8 lg:px-10 lg:py-12">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-600">Dashboard</p><h1 className="mt-2 font-serif text-4xl">Good to see you, {profile.display_name || "admin"}.</h1></div><span className="text-sm text-muted">Role: {profile.role}</span></div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([label, value]) => <article key={label} className="rounded-xs border border-line bg-white p-5"><p className="text-sm text-muted">{label}</p><p className="mt-3 font-serif text-3xl">{value}</p></article>)}</div>
          <div className="mt-8 rounded-xs border border-line bg-white p-6"><h2 className="font-serif text-2xl">Admin foundation ready</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-ink-soft">Products, media, page modules, taxonomy, metal rates, enquiries, and immutable audit records are now represented in the Supabase migration. Complete the migration and assign a role before using mutation screens.</p></div>
        </section>
      </div>
    </main>
  );
}

function AdminSetupMessage() {
  return <main className="min-h-screen bg-cream px-5 py-16"><div className="mx-auto max-w-xl rounded-xs border border-line bg-white p-8"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-600">PS Jewellers</p><h1 className="mt-3 font-serif text-4xl">Admin setup required</h1><p className="mt-4 text-sm leading-6 text-ink-soft">The admin panel is server-protected, but Supabase is not configured in this environment. Add the documented variables, run the migration in `supabase/migrations/0001_admin_foundation.sql`, enable TOTP MFA, and assign an admin role.</p></div></main>;
}
