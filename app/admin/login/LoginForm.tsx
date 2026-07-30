"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/src/lib/supabase/browser";

type Stage = "credentials" | "totp";

const mfaBypassed =
  process.env.NEXT_PUBLIC_ADMIN_MFA_BYPASS === "true" && process.env.NODE_ENV !== "production";

const inputClass =
  "min-h-11 rounded-xs border border-line px-3 text-ink focus:border-gold-500 focus:outline-none focus:ring-2 focus:ring-gold-200";

export default function LoginForm() {
  const [stage, setStage] = useState<Stage>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [factorId, setFactorId] = useState<string | null>(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [needsEnrollment, setNeedsEnrollment] = useState(false);

  async function resetSession(message: string) {
    const client = createSupabaseBrowserClient();
    await client?.auth.signOut();
    setStage("credentials");
    setPassword("");
    setCode("");
    setFactorId(null);
    setChallengeId(null);
    setError(message || null);
  }

  async function submitCredentials(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNeedsEnrollment(false);
    setPending(true);

    const client = createSupabaseBrowserClient();
    if (!client) {
      setError("Admin authentication is not configured. Add the Supabase variables to the server environment.");
      setPending(false);
      return;
    }

    try {
      const { error: signInError } = await client.auth.signInWithPassword({ email, password });
      if (signInError) {
        setError("Sign-in failed. Check your credentials and try again.");
        return;
      }

      if (mfaBypassed) {
        window.location.assign("/admin");
        return;
      }

      const { data: factors, error: factorsError } = await client.auth.mfa.listFactors();
      if (factorsError) {
        await resetSession("Two-factor verification could not be checked. Please try again.");
        return;
      }

      const totp = factors?.totp?.find((factor) => factor.status === "verified");
      if (!totp) {
        // Dead end without a route out: the account cannot sign in, and the
        // enrollment page is the only way to fix it. Flag it so the UI can
        // offer the link instead of leaving the operator stuck.
        setNeedsEnrollment(true);
        await resetSession("This account has no authenticator app set up yet. Two-factor is required for admin access.");
        return;
      }

      // Issue the challenge the user must actually answer. Without this the
      // session stays at aal1 and the server gate rejects it.
      const { data: challenge, error: challengeError } = await client.auth.mfa.challenge({ factorId: totp.id });
      if (challengeError || !challenge) {
        await resetSession("Could not start two-factor verification. Please try again.");
        return;
      }

      setFactorId(totp.id);
      setChallengeId(challenge.id);
      setStage("totp");
      setPassword("");
    } catch {
      setError("Sign-in is temporarily unavailable. Please try again.");
    } finally {
      setPending(false);
    }
  }

  async function submitTotp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const client = createSupabaseBrowserClient();
    if (!client || !factorId || !challengeId) {
      await resetSession("Two-factor session expired. Please sign in again.");
      setPending(false);
      return;
    }

    try {
      const { error: verifyError } = await client.auth.mfa.verify({ factorId, challengeId, code: code.trim() });
      if (verifyError) {
        setError("That code was not accepted. Check your authenticator and try again.");
        setCode("");
        return;
      }

      const { data: assurance } = await client.auth.mfa.getAuthenticatorAssuranceLevel();
      if (assurance?.currentLevel !== "aal2") {
        await resetSession("Two-factor verification did not complete. Please sign in again.");
        return;
      }

      window.location.assign("/admin");
    } catch {
      setError("Verification is temporarily unavailable. Please try again.");
    } finally {
      setPending(false);
    }
  }

  if (stage === "totp") {
    return (
      <form className="mt-8 flex flex-col gap-4" onSubmit={submitTotp}>
        <p className="text-sm text-ink-soft">
          Enter the 6-digit code from your authenticator app for <strong className="text-ink">{email}</strong>.
        </p>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Authentication code
          <input
            required
            autoFocus
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
            className={`${inputClass} tracking-[0.4em]`}
          />
        </label>
        {error ? (
          <p role="alert" className="text-sm text-error">
            {error}
          </p>
        ) : null}
        <button
          disabled={pending || code.length !== 6}
          className="min-h-12 rounded-xs bg-ink px-4 text-sm font-semibold text-white transition-colors hover:bg-gold-500 disabled:opacity-50"
        >
          {pending ? "Verifying…" : "Verify and continue"}
        </button>
        <button
          type="button"
          onClick={() => void resetSession("")}
          className="min-h-11 text-sm font-medium text-gold-600 hover:underline"
        >
          Use a different account
        </button>
      </form>
    );
  }

  return (
    <form className="mt-8 flex flex-col gap-4" onSubmit={submitCredentials}>
      {/* Local dev skips the TOTP challenge entirely, which means the sign-in
          you test here is NOT the one production runs. That gap is easy to
          forget and hard to spot, so it is stated on screen rather than left
          buried in an env var. */}
      {mfaBypassed ? (
        <p
          role="status"
          className="rounded-xs border border-amber-300 bg-amber-50 p-3 text-sm leading-5 text-amber-900"
        >
          <strong>Two-factor is bypassed in this environment.</strong> This is not the production sign-in flow —
          production always demands an authenticator code and cannot be bypassed. Test the real path on a deployed
          build.
        </p>
      ) : null}
      <label className="flex flex-col gap-1 text-sm font-medium">
        Email
        <input
          required
          type="email"
          autoComplete="username"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className={inputClass}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Password
        <input
          required
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className={inputClass}
        />
      </label>
      {error ? (
        <p role="alert" className="text-sm text-error">
          {error}
        </p>
      ) : null}
      {needsEnrollment ? (
        <Link
          href="/admin/enroll-mfa"
          className="inline-flex min-h-11 items-center justify-center rounded-xs border border-gold-500 px-4 text-center text-sm font-semibold text-gold-600 transition-colors hover:bg-gold-500 hover:text-white"
        >
          Set up an authenticator app
        </Link>
      ) : null}
      <button
        disabled={pending}
        className="min-h-12 rounded-xs bg-ink px-4 text-sm font-semibold text-white transition-colors hover:bg-gold-500 disabled:opacity-50"
      >
        {pending ? "Checking…" : "Continue"}
      </button>
      <Link href="/admin/forgot-password" className="inline-flex min-h-11 items-center justify-center text-center text-sm font-medium text-gold-600 hover:underline">
        Forgot password?
      </Link>
    </form>
  );
}
