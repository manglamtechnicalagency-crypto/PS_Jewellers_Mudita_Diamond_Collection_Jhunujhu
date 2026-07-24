"use client";

import { createSupabaseBrowserClient } from "@/src/lib/supabase/browser";

export default function LogoutButton() {
  async function logout() {
    const client = createSupabaseBrowserClient();
    await client?.auth.signOut();
    window.location.assign("/admin/login");
  }

  return <button onClick={logout} className="text-sm text-ink-soft hover:text-gold-600">Log out</button>;
}
