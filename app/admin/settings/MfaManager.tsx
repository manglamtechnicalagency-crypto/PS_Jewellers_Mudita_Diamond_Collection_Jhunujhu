"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { createSupabaseBrowserClient } from "@/src/lib/supabase/browser";

/**
 * Manage the authenticator apps bound to the signed-in admin account.
 *
 * For a new phone, a wiped device, or an authenticator that has drifted.
 * Unlike /admin/enroll-mfa — which serves an account with NO factor and
 * therefore cannot sit behind the admin gate — this panel is only reachable by
 * a session that has already passed the admin gate.
 *
 * Three rules hold this together:
 *
 * 1. STEP UP FIRST. Supabase refuses mfa.enroll() at AAL1 once an account has a
 *    verified factor ("AAL2 required to enroll a new factor"). Rather than
 *    routing around that, the current device is challenged before anything
 *    changes. Re-proving possession before rebinding two-factor is the correct
 *    model: otherwise anyone who found an unlocked, signed-in admin session
 *    could point 2FA at their own phone. It also makes this work in local
 *    development, where LoginForm skips the TOTP challenge and leaves the
 *    session at AAL1.
 *
 * 2. ADD BEFORE REMOVE. The new factor is enrolled and verified while the old
 *    one still works. Removing first would leave the account with no second
 *    factor the moment the admin closed the tab — and production cannot bypass
 *    MFA, so that is a lockout fixable only by editing the database.
 *
 * 3. REMOVAL IS EXPLICIT. Old devices are never retired automatically. They are
 *    listed with their own Remove button, and the last remaining verified
 *    factor can never be removed.
 */

type Factor = { id: string; status: string; friendly_name?: string; created_at?: string };

const dateFormat = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" });

export default function MfaManager() {
  const [factors, setFactors] = useState<Factor[] | null>(null);
  const [stage, setStage] = useState<"idle" | "verify-current" | "scan">("idle");
  const [currentChallenge, setCurrentChallenge] = useState<{ factorId: string; challengeId: string } | null>(null);
  const [currentCode, setCurrentCode] = useState("");
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [newFactorId, setNewFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadFactors = useCallback(async () => {
    const client = createSupabaseBrowserClient();
    if (!client) return;
    const { data } = await client.auth.mfa.listFactors();
    setFactors((data?.totp ?? []) as Factor[]);
  }, []);

  useEffect(() => {
    void loadFactors();
  }, [loadFactors]);

  const verified = (factors ?? []).filter((factor) => factor.status === "verified");

  /** Enroll the replacement factor. Only reached once the session is AAL2. */
  const enrollNewFactor = useCallback(async () => {
    const client = createSupabaseBrowserClient();
    if (!client) {
      setError("Authentication is not configured.");
      return;
    }
    // Clear a half-finished earlier attempt: Supabase rejects a second
    // enrollment reusing a friendly name, so a stale unverified factor would
    // block every future attempt.
    const { data: latest } = await client.auth.mfa.listFactors();
    for (const stale of (latest?.totp ?? []).filter((factor) => factor.status !== "verified")) {
      await client.auth.mfa.unenroll({ factorId: stale.id });
    }
    const { data, error: enrollError } = await client.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: `admin-${Date.now()}`,
    });
    if (enrollError || !data) {
      setError(enrollError?.message ?? "A new authenticator could not be prepared.");
      return;
    }
    setQrCode(data.totp.qr_code);
    setSecret(data.totp.secret);
    setNewFactorId(data.id);
    setStage("scan");
  }, []);

  async function startReplacement() {
    setError("");
    setMessage("");
    setPending(true);
    const client = createSupabaseBrowserClient();
    if (!client) {
      setError("Authentication is not configured.");
      setPending(false);
      return;
    }
    try {
      const { data: assurance } = await client.auth.mfa.getAuthenticatorAssuranceLevel();
      const existing = verified[0];
      if (assurance?.currentLevel === "aal2" || !existing) {
        await enrollNewFactor();
        return;
      }
      const { data: challenge, error: challengeError } = await client.auth.mfa.challenge({
        factorId: existing.id,
      });
      if (challengeError || !challenge) {
        setError("Could not ask your current authenticator for a code. Please try again.");
        return;
      }
      setCurrentChallenge({ factorId: existing.id, challengeId: challenge.id });
      setStage("verify-current");
    } catch {
      setError("A new authenticator could not be prepared. Please try again.");
    } finally {
      setPending(false);
    }
  }

  async function confirmCurrent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);
    const client = createSupabaseBrowserClient();
    if (!client || !currentChallenge) {
      setError("This step expired. Start again.");
      setPending(false);
      return;
    }
    try {
      const { error: verifyError } = await client.auth.mfa.verify({
        factorId: currentChallenge.factorId,
        challengeId: currentChallenge.challengeId,
        code: currentCode.trim(),
      });
      if (verifyError) {
        setError("That code was not accepted. Check your current authenticator and try again.");
        setCurrentCode("");
        return;
      }
      setCurrentChallenge(null);
      setCurrentCode("");
      await enrollNewFactor();
    } catch {
      setError("Verification is temporarily unavailable. Please try again.");
    } finally {
      setPending(false);
    }
  }

  async function confirmNewFactor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);
    const client = createSupabaseBrowserClient();
    if (!client || !newFactorId) {
      setError("This setup expired. Start again.");
      setPending(false);
      return;
    }
    try {
      const { data: challenge, error: challengeError } = await client.auth.mfa.challenge({
        factorId: newFactorId,
      });
      if (challengeError || !challenge) {
        setError("That code could not be checked. Please try again.");
        return;
      }
      const { error: verifyError } = await client.auth.mfa.verify({
        factorId: newFactorId,
        challengeId: challenge.id,
        code: code.trim(),
      });
      if (verifyError) {
        setError("That code was not accepted. Check the app and your device clock, then try again.");
        setCode("");
        return;
      }
      setStage("idle");
      setQrCode(null);
      setSecret(null);
      setNewFactorId(null);
      setCode("");
      setMessage(
        "New authenticator added and verified. Your old device still works — remove it below once you are sure the new one is set up.",
      );
      await loadFactors();
    } catch {
      setError("Verification is temporarily unavailable. Please try again.");
    } finally {
      setPending(false);
    }
  }

  async function removeFactor(factorId: string) {
    setError("");
    setMessage("");
    // Never let the account be left with nothing. Production cannot bypass MFA,
    // so removing the last factor locks the admin out of their own storefront.
    if (verified.length <= 1) {
      setError("This is your only authenticator. Add a new one first, then remove this.");
      return;
    }
    setRemovingId(factorId);
    const client = createSupabaseBrowserClient();
    if (!client) {
      setError("Authentication is not configured.");
      setRemovingId(null);
      return;
    }
    try {
      const { error: unenrollError } = await client.auth.mfa.unenroll({ factorId });
      if (unenrollError) {
        setError(unenrollError.message || "That authenticator could not be removed.");
        return;
      }
      setMessage("Authenticator removed. It can no longer be used to sign in.");
      await loadFactors();
    } catch {
      setError("That authenticator could not be removed. Please try again.");
    } finally {
      setRemovingId(null);
    }
  }

  function cancel() {
    setStage("idle");
    setQrCode(null);
    setSecret(null);
    setNewFactorId(null);
    setCurrentChallenge(null);
    setCurrentCode("");
    setCode("");
    setError("");
  }

  return (
    <section className="mt-6 grid gap-4 rounded-xs border border-line bg-white p-6">
      <div>
        <h2 className="font-serif text-2xl">Authenticator app</h2>
        <p className="mt-1 text-sm leading-6 text-ink-soft">
          Two-factor verification is mandatory in production and cannot be switched off. Add a new authenticator when
          you change phone, then remove the old one.
        </p>
      </div>

      {factors === null ? (
        <p className="text-sm text-muted">Checking your current authenticator…</p>
      ) : verified.length ? (
        <ul className="grid gap-2">
          {verified.map((factor, index) => (
            <li
              key={factor.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xs border border-line px-4 py-3 text-sm"
            >
              <span className="text-ink-soft">
                <strong className="text-ink">Authenticator {verified.length > 1 ? index + 1 : ""}</strong>
                {factor.created_at ? ` · added ${dateFormat.format(new Date(factor.created_at))}` : ""}
              </span>
              {verified.length > 1 ? (
                <button
                  type="button"
                  onClick={() => void removeFactor(factor.id)}
                  disabled={removingId !== null}
                  className="min-h-11 px-2 text-sm font-semibold text-red-700 hover:underline disabled:opacity-50"
                >
                  {removingId === factor.id ? "Removing…" : "Remove"}
                </button>
              ) : (
                <span className="text-xs text-muted">Only authenticator — add another before removing this</span>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-error">No verified authenticator is attached to this account.</p>
      )}

      {stage === "verify-current" ? (
        <form className="grid gap-4" onSubmit={confirmCurrent}>
          <p className="text-sm leading-6 text-ink-soft">
            Confirm it is you: enter a code from the authenticator you use <strong>now</strong>. Nothing changes until
            you do.
          </p>
          <label className="text-sm font-medium">
            Code from your current authenticator
            <input
              required
              autoFocus
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              value={currentCode}
              onChange={(event) => setCurrentCode(event.target.value.replace(/\D/g, ""))}
              className="mt-1 w-full border border-line p-3 tracking-[0.4em]"
            />
          </label>
          {error ? (
            <p role="alert" className="text-sm text-error">
              {error}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-3">
            <button
              disabled={pending || currentCode.length !== 6}
              className="w-fit bg-ink px-5 py-3 text-sm font-semibold text-white hover:bg-gold-500 disabled:opacity-50"
            >
              {pending ? "Checking…" : "Continue"}
            </button>
            <button
              type="button"
              onClick={cancel}
              className="w-fit border border-line px-5 py-3 text-sm font-semibold text-ink hover:border-gold-500"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : stage === "scan" ? (
        <form className="grid gap-4" onSubmit={confirmNewFactor}>
          <p className="rounded-xs border border-amber-300 bg-amber-50 p-3 text-sm leading-6 text-amber-900">
            <strong>Do not close this page yet.</strong> Your current authenticator keeps working until you enter a code
            from the new one below.
          </p>
          {qrCode ? (
            // Supabase returns the QR as an SVG data URI. Rendered via <img> so
            // the markup is never injected into the page.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={qrCode}
              alt="QR code to add this account to your authenticator app"
              className="h-48 w-48 rounded-xs border border-line bg-white p-2"
            />
          ) : null}
          {secret ? (
            <p className="text-xs text-muted">
              Cannot scan? Enter this key manually:
              <br />
              <code className="mt-1 inline-block break-all font-mono text-ink">{secret}</code>
            </p>
          ) : null}
          <label className="text-sm font-medium">
            Code from the new authenticator
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
              className="mt-1 w-full border border-line p-3 tracking-[0.4em]"
            />
          </label>
          {error ? (
            <p role="alert" className="text-sm text-error">
              {error}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-3">
            <button
              disabled={pending || code.length !== 6}
              className="w-fit bg-ink px-5 py-3 text-sm font-semibold text-white hover:bg-gold-500 disabled:opacity-50"
            >
              {pending ? "Verifying…" : "Confirm new authenticator"}
            </button>
            <button
              type="button"
              onClick={cancel}
              className="w-fit border border-line px-5 py-3 text-sm font-semibold text-ink hover:border-gold-500"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <>
          {error ? (
            <p role="alert" className="text-sm text-error">
              {error}
            </p>
          ) : null}
          {message ? (
            <p role="status" className="text-sm text-ink-soft">
              {message}
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => void startReplacement()}
            disabled={pending}
            className="w-fit bg-ink px-5 py-3 text-sm font-semibold text-white hover:bg-gold-500 disabled:opacity-50"
          >
            {pending ? "Preparing…" : verified.length ? "Add new authenticator" : "Set up authenticator"}
          </button>
          <p className="text-xs leading-5 text-muted">
            You will confirm a code from your current authenticator, scan a QR with the new one, then remove the old
            device yourself using the Remove button above.
          </p>
        </>
      )}
    </section>
  );
}
