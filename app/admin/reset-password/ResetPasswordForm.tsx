"use client";

import { useState, type FormEvent } from "react";
import { createSupabaseBrowserClient } from "@/src/lib/supabase/browser";

export default function ResetPasswordForm() {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (password.length < 12) {
      setError("Use at least 12 characters for the new password.");
      return;
    }
    if (password !== confirmation) {
      setError("Passwords do not match.");
      return;
    }

    const client = createSupabaseBrowserClient();
    if (!client) {
      setError("Password recovery is not configured. Please contact the site administrator.");
      return;
    }
    setPending(true);
    try {
      const { error: updateError } = await client.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message || "Password could not be updated. Request a new reset link.");
        return;
      }
      setPassword("");
      setConfirmation("");
      setMessage("Password updated. Sign in again with your new password.");
      await client.auth.signOut();
    } catch {
      setError("Password could not be updated. Request a new reset link.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="mt-8 flex flex-col gap-4" onSubmit={submit}>
      <label className="flex flex-col gap-1 text-sm font-medium">
        New password
        <input required minLength={12} type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="min-h-11 rounded-xs border border-line px-3 text-ink focus:border-gold-500 focus:outline-none focus:ring-2 focus:ring-gold-200" />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Confirm new password
        <input required minLength={12} type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="min-h-11 rounded-xs border border-line px-3 text-ink focus:border-gold-500 focus:outline-none focus:ring-2 focus:ring-gold-200" />
      </label>
      {error ? <p role="alert" className="text-sm text-error">{error}</p> : null}
      {message ? <p role="status" className="text-sm text-ink-soft">{message}</p> : null}
      <button disabled={pending} className="min-h-12 rounded-xs bg-ink px-4 text-sm font-semibold text-white hover:bg-gold-500 disabled:opacity-50">
        {pending ? "Updating…" : "Update password"}
      </button>
    </form>
  );
}
