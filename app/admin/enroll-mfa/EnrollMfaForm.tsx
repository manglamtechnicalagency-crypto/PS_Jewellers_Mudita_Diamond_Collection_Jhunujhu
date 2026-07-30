"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/src/lib/supabase/browser";

/**
 * One-time TOTP enrollment for an admin account that has no verified factor.
 *
 * Production requires AAL2 (src/lib/admin-auth.ts). An account with no verified
 * factor cannot sign in at all, which makes this a chicken-and-egg problem:
 * enrollment cannot itself sit behind the admin gate. So it is reachable with
 * the password alone — the same trust level Supabase's own recommended flow
 * uses.
 *
 * That is a real exposure, and it is deliberately narrowed:
 *
 *  - If the account ALREADY has a verified factor, this refuses and sends the
 *    user to the normal login. So it can never be used to silently swap an
 *    attacker's authenticator in for the owner's.
 *  - It signs out immediately on failure, so no usable session is left behind.
 *  - It never reveals whether an email exists: a bad password and an unknown
 *    account produce the same message.
 *
 * The remaining risk is unavoidable and worth stating plainly: whoever knows an
 * admin password can enroll their own authenticator on an account that has none.
 * Use a strong password, and enroll promptly rather than leaving accounts bare.
 */

type Stage = "credentials" | "scan" | "done";

const inputClass =
  "min-h-11 rounded-xs border border-line px-3 text-ink focus:border-gold-500 focus:outline-none focus:ring-2 focus:ring-gold-200";

export default function EnrollMfaForm() {
  const [stage, setStage] = useState<Stage>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function abort(message: string) {
    const client = createSupabaseBrowserClient();
    await client?.auth.signOut();
    setStage("credentials");
    setPassword("");
    setCode("");
    setQrCode(null);
    setSecret(null);
    setFactorId(null);
    setError(message || null);
  }

  async function startEnrollment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const client = createSupabaseBrowserClient();
    if (!client) {
      setError("Admin authentication is not configured.");
      setPending(false);
      return;
    }

    try {
      const { error: signInError } = await client.auth.signInWithPassword({ email, password });
      if (signInError) {
        // Same message for a wrong password and an unknown account: anything
        // more specific turns this into an account-existence oracle.
        setError("Sign-in failed. Check your credentials and try again.");
        return;
      }

      const { data: factors, error: factorsError } = await client.auth.mfa.listFactors();
      if (factorsError) {
        await abort("Existing two-factor settings could not be checked. Please try again.");
        return;
      }

      if (factors?.totp?.some((factor) => factor.status === "verified")) {
        await abort(
          "This account already has an authenticator. Sign in normally — if you lost the device, ask the project owner to remove the factor in Supabase first.",
        );
        return;
      }

      // Clear a half-finished earlier attempt so this page can be retried.
      for (const stale of factors?.totp?.filter((factor) => factor.status !== "verified") ?? []) {
        await client.auth.mfa.unenroll({ factorId: stale.id });
      }

      const { data: enrolled, error: enrollError } = await client.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: `admin-${Date.now()}`,
      });
      if (enrollError || !enrolled) {
        await abort("Could not start enrollment. Please try again.");
        return;
      }

      setQrCode(enrolled.totp.qr_code);
      setSecret(enrolled.totp.secret);
      setFactorId(enrolled.id);
      setStage("scan");
      setPassword("");
    } catch {
      setError("Enrollment is temporarily unavailable. Please try again.");
    } finally {
      setPending(false);
    }
  }

  async function confirmCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const client = createSupabaseBrowserClient();
    if (!client || !factorId) {
      await abort("Enrollment session expired. Please start again.");
      setPending(false);
      return;
    }

    try {
      const { data: challenge, error: challengeError } = await client.auth.mfa.challenge({ factorId });
      if (challengeError || !challenge) {
        setError("Could not verify that code. Please try again.");
        return;
      }

      const { error: verifyError } = await client.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code: code.trim(),
      });
      if (verifyError) {
        setError("That code was not accepted. Check your authenticator and the clock on your device.");
        setCode("");
        return;
      }

      // Sign out deliberately: enrollment is not a login. The operator now goes
      // through the real gate, which proves the factor works end to end.
      await client.auth.signOut();
      setStage("done");
    } catch {
      setError("Verification is temporarily unavailable. Please try again.");
    } finally {
      setPending(false);
    }
  }

  if (stage === "done") {
    return (
      <div className="mt-8 flex flex-col gap-4">
        <p className="text-sm leading-6 text-ink-soft">
          Your authenticator is enrolled and verified. Sign in with your password, then the 6-digit code.
        </p>
        <Link
          href="/admin/login"
          className="inline-flex min-h-12 items-center justify-center rounded-xs bg-ink px-4 text-sm font-semibold text-white transition-colors hover:bg-gold-500"
        >
          Go to sign in
        </Link>
      </div>
    );
  }

  if (stage === "scan") {
    return (
      <form className="mt-8 flex flex-col gap-4" onSubmit={confirmCode}>
        <p className="text-sm leading-6 text-ink-soft">
          Scan this with Google Authenticator, Authy or 1Password, then enter the 6-digit code it shows.
        </p>
        {qrCode ? (
          // Supabase returns the QR as an SVG data URI. Rendered with <img> so
          // the markup is never injected into the page.
          <img
            src={qrCode}
            alt="QR code for enrolling this account in your authenticator app"
            className="mx-auto h-48 w-48 rounded-xs border border-line bg-white p-2"
          />
        ) : null}
        {secret ? (
          <p className="text-center text-xs text-muted">
            Cannot scan? Enter this key manually:
            <br />
            <code className="mt-1 inline-block break-all font-mono text-ink">{secret}</code>
          </p>
        ) : null}
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
          {pending ? "Verifying…" : "Confirm and finish"}
        </button>
        <button
          type="button"
          onClick={() => void abort("")}
          className="min-h-11 text-sm font-medium text-gold-600 hover:underline"
        >
          Start over
        </button>
      </form>
    );
  }

  return (
    <form className="mt-8 flex flex-col gap-4" onSubmit={startEnrollment}>
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
      <button
        disabled={pending}
        className="min-h-12 rounded-xs bg-ink px-4 text-sm font-semibold text-white transition-colors hover:bg-gold-500 disabled:opacity-50"
      >
        {pending ? "Checking…" : "Begin enrollment"}
      </button>
      <Link
        href="/admin/login"
        className="inline-flex min-h-11 items-center justify-center text-center text-sm font-medium text-gold-600 hover:underline"
      >
        Back to sign in
      </Link>
    </form>
  );
}
