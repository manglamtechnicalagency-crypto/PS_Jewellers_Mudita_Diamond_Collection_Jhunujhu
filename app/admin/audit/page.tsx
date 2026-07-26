import { redirect } from "next/navigation";
import Link from "next/link";
import { requireAdmin } from "@/src/lib/admin-auth";
import LogoutButton from "../_components/LogoutButton";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  const auth = await requireAdmin(["super_admin", "admin"]);
  if (auth.error === "not_configured" || auth.error === "internal")
    return <p className="p-10">Audit log is unavailable.</p>;
  if (auth.error === "unauthorized" || auth.error === "mfa_required")
    redirect("/admin/login");
  if (auth.error === "forbidden")
    return <p className="p-10">Only administrators can view the audit log.</p>;
  const { data, error } = await auth.client
    .from("audit_logs")
    .select(
      "id, action, entity_type, entity_id, previous_value, new_value, created_at, profiles(display_name)",
    )
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) return <p className="p-10">Audit log could not be loaded.</p>;
  return (
    <main className="min-h-screen bg-cream px-5 py-8 text-ink lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="flex items-end justify-between border-b border-line pb-6">
          <div>
            <Link
              href="/admin"
              className="text-sm text-gold-700 hover:underline"
            >
              ← Dashboard
            </Link>
            <h1 className="mt-3 font-serif text-4xl">Audit log</h1>
            <p className="mt-2 text-sm text-ink-soft">
              Immutable before-and-after records for catalogue and admin
              changes.
            </p>
          </div>
          <LogoutButton />
        </header>
        <div className="mt-8 overflow-x-auto rounded-xs border border-line bg-white">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b border-line bg-cream text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">When</th>
                <th className="px-4 py-3">Actor</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Entity</th>
                <th className="px-4 py-3">Change</th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-line last:border-0"
                >
                  <td className="px-4 py-3">
                    {new Date(item.created_at).toLocaleString("en-IN")}
                  </td>
                  <td className="px-4 py-3">
                    {actorName(
                      (item as unknown as { profiles?: unknown }).profiles,
                    )}
                  </td>
                  <td className="px-4 py-3 font-semibold uppercase">
                    {item.action}
                  </td>
                  <td className="px-4 py-3">
                    {item.entity_type}
                    <br />
                    <span className="text-xs text-muted">
                      {item.entity_id ?? "—"}
                    </span>
                  </td>
                  <td className="max-w-md px-4 py-3 text-xs text-ink-soft">
                    <details>
                      <summary>View before/after</summary>
                      <pre className="mt-2 whitespace-pre-wrap">
                        {JSON.stringify(
                          {
                            before: item.previous_value,
                            after: item.new_value,
                          },
                          null,
                          2,
                        )}
                      </pre>
                    </details>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!data?.length ? (
            <p className="p-8 text-center text-sm text-muted">
              No audit events yet.
            </p>
          ) : null}
        </div>
      </div>
    </main>
  );
}

function actorName(value: unknown) {
  const profile = Array.isArray(value) ? value[0] : value;
  return (
    (profile as { display_name?: string } | null)?.display_name ?? "System"
  );
}
