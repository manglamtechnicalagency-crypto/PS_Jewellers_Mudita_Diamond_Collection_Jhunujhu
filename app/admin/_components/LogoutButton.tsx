"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/src/lib/supabase/browser";
import BrandLogo from "@/src/components/BrandLogo";

export default function LogoutButton() {
  const [error, setError] = useState(false);
  const [pending, setPending] = useState(false);

  async function logout() {
    setError(false);
    setPending(true);
    try {
      const client = createSupabaseBrowserClient();
      if (!client) throw new Error("not_configured");
      const { error: signOutError } = await client.auth.signOut();
      if (signOutError) throw signOutError;
      window.location.assign("/admin/login");
    } catch {
      setError(true);
      setPending(false);
    }
  }

  return <div className="flex items-center gap-3"><BrandLogo className="h-10 w-10" /><button onClick={logout} disabled={pending} className="text-sm text-ink-soft hover:text-gold-600 disabled:opacity-50">{pending ? "Logging out…" : "Log out"}</button>{error ? <span role="alert" className="text-xs text-red-700">Logout failed</span> : null}</div>;
}
