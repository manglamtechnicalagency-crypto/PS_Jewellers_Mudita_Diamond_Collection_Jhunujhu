import Link from "next/link";
import { redirect } from "next/navigation";
import LogoutButton from "../_components/LogoutButton";
import { requireAdmin } from "@/src/lib/admin-auth";
import SettingsManager from "./SettingsManager";
import PasswordManager from "./PasswordManager";
import PinManager from "./PinManager";
import MfaManager from "./MfaManager";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const auth = await requireAdmin();
  if (auth.error === "not_configured") return <p className="p-10">Configure Supabase before using settings.</p>;
  if (auth.error === "unauthorized" || auth.error === "mfa_required") redirect("/admin/login");
  if (auth.error === "forbidden") return <p className="p-10">You do not have permission to manage settings.</p>;
  if (auth.error === "internal") return <p className="p-10">Settings could not be loaded right now.</p>;
  const { data, error } = await auth.client.from("site_settings").select("setting_key, value").eq("setting_key", "homepage").maybeSingle();
  if (error) return <p className="p-10">Settings could not be loaded right now.</p>;
  const value = (data?.value ?? {}) as Record<string, string>;
  return <main className="min-h-screen bg-cream px-5 py-8 text-ink lg:px-10"><div className="mx-auto max-w-4xl"><header className="flex flex-col justify-between gap-4 border-b border-line pb-6 sm:flex-row sm:items-end"><div><Link href="/admin" className="text-sm text-gold-600 hover:underline">← Dashboard</Link><h1 className="mt-3 font-serif text-4xl">Site settings</h1><p className="mt-2 text-sm text-ink-soft">Edit homepage copy and calls to action. Changes are stored in Supabase and consumed by the public website.</p></div><LogoutButton /></header><SettingsManager initialValue={value} /><PasswordManager /><MfaManager /><PinManager /></div></main>;
}
