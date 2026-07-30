"use client";

import { useState, type FormEvent } from "react";
import { createSupabaseBrowserClient } from "@/src/lib/supabase/browser";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setPending(true);
    const client = createSupabaseBrowserClient();
    if (!client) {
      setMessage("Password recovery is not configured. Please contact the site administrator.");
      setPending(false);
      return;
    }

    try {
      const { error } = await client.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/admin/reset-password`,
      });
      setMessage(error
        ? "Password reset is temporarily unavailable. Please try again or contact the site administrator."
        : "If that email is registered, a password-reset link has been sent.");
    } catch {
      setMessage("Password reset is temporarily unavailable. Please try again or contact the site administrator.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="mt-8 flex flex-col gap-4" onSubmit={submit}>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Admin email
        <input
          required
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="min-h-11 rounded-xs border border-line px-3 text-ink focus:border-gold-500 focus:outline-none focus:ring-2 focus:ring-gold-200"
        />
      </label>
      <button disabled={pending} className="min-h-12 rounded-xs bg-ink px-4 text-sm font-semibold text-white hover:bg-gold-500 disabled:opacity-50">
        {pending ? "Sending…" : "Send reset link"}
      </button>
      {message ? <p role="status" className="text-sm text-ink-soft">{message}</p> : null}
    </form>
  );
}
