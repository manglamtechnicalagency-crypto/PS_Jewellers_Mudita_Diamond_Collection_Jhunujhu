"use client";

import { useState, type FormEvent } from "react";
import { createSupabaseBrowserClient } from "@/src/lib/supabase/browser";

export default function PasswordManager() {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
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
      setError("Password management is not configured.");
      return;
    }
    setPending(true);
    try {
      const { error: updateError } = await client.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message || "Password could not be updated.");
        return;
      }
      setPassword("");
      setConfirmation("");
      setMessage("Password updated successfully. TOTP MFA remains enabled.");
    } catch {
      setError("Password could not be updated. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={save} className="mt-6 grid gap-4 rounded-xs border border-line bg-white p-6">
      <div>
        <h2 className="font-serif text-2xl">Admin password</h2>
        <p className="mt-1 text-sm text-ink-soft">Change the signed-in admin password. Use the Forgot password link on the sign-in page if you cannot sign in.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium">New password<input required minLength={12} type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1 w-full border border-line p-3" /></label>
        <label className="text-sm font-medium">Confirm new password<input required minLength={12} type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="mt-1 w-full border border-line p-3" /></label>
      </div>
      {error ? <p role="alert" className="text-sm text-error">{error}</p> : null}
      {message ? <p role="status" className="text-sm text-ink-soft">{message}</p> : null}
      <button disabled={pending} className="w-fit bg-ink px-5 py-3 text-sm font-semibold text-white hover:bg-gold-500 disabled:opacity-50">{pending ? "Updating…" : "Update admin password"}</button>
    </form>
  );
}
