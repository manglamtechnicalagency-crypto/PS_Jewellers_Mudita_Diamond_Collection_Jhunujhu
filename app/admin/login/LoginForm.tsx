"use client";

import { useState, type FormEvent } from "react";
import { createSupabaseBrowserClient } from "@/src/lib/supabase/browser";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    const client = createSupabaseBrowserClient();
    if (!client) {
      setError("Admin authentication is not configured. Add the Supabase variables to the server environment.");
      setPending(false);
      return;
    }

    const { error: signInError } = await client.auth.signInWithPassword({ email, password });
    if (signInError) {
      setError("Sign-in failed. Check your credentials and try again.");
      setPending(false);
      return;
    }

    const { data: factors } = await client.auth.mfa.listFactors();
    const verifiedTotp = factors?.totp?.some((factor) => factor.status === "verified");
    if (!verifiedTotp) {
      await client.auth.signOut();
      setError("This account must complete TOTP enrollment before it can access the admin panel.");
      setPending(false);
      return;
    }

    window.location.assign("/admin");
  }

  return (
    <form className="mt-8 flex flex-col gap-4" onSubmit={submit}>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Email
        <input required type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} className="rounded-xs border border-line px-3 py-2.5" />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Password
        <input required type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="rounded-xs border border-line px-3 py-2.5" />
      </label>
      {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
      <button disabled={pending} className="rounded-xs bg-ink px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">
        {pending ? "Verifying…" : "Continue"}
      </button>
    </form>
  );
}
