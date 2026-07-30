"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { createSupabaseBrowserClient } from "@/src/lib/supabase/browser";

/**
 * Replace the authenticator app bound to the signed-in admin account.
 *
 * For a new phone, a wiped device, or an authenticator that has drifted. Unlike
 * /admin/enroll-mfa — which exists for an account with NO factor and therefore
 * cannot sit behind the admin gate — this page is only reachable by a session
 * that has already completed a TOTP challenge (AAL2, enforced by requireAdmin).
 * Whoever is here has already proven they hold the current authenticator.
 *
 * Order matters and is deliberate: enroll the new factor, verify a code from
 * it, and only then remove the old one. Removing first would leave the account
 * with no working second factor if the admin closed the tab midway — and since
 * production cannot bypass MFA, that means locked out of their own storefront
 * until someone edits the database.
 */

type Factor = { id: string; status: string; friendly_name?: string; created_at?: string };

const dateFormat = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" });

export default function MfaManager() {
  const [factors, setFactors] = useState<Factor[] | null>(null);
  const [stage, setStage] = useState<"idle" | "scan">("idle");
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [newFactorId, setNewFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
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
      // Clear any half-finished attempt first: Supabase rejects a second
      // enrollment that reuses a friendly name, so a previous abandoned run
      // would otherwise block this one permanently.
      for (const stale of (factors ?? []).filter((factor) => factor.status !== "verified")) {
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
    } catch {
      setError("A new authenticator could not be prepared. Please try again.");
    } finally {
      setPending(false);
    }
  }

  async function confirmReplacement(event: FormEvent<HTMLFormElement>) {
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

      // New factor proven. Only now retire the old ones.
      let removalFailed = false;
      for (const old of verified.filter((factor) => factor.id !== newFactorId)) {
        const { error: unenrollError } = await client.auth.mfa.unenroll({ factorId: old.id });
        if (unenrollError) removalFailed = true;
      }

      setStage("idle");
      setQrCode(null);
      setSecret(null);
      setNewFactorId(null);
      setCode("");
      setMessage(
        removalFailed
          ? "New authenticator verified, but an older one could not be removed. Both will work — remove the old device from Supabase Auth."
          : "Authenticator replaced. Your previous device no longer works; use the new one at your next sign-in.",
      );
      await loadFactors();
    } catch {
      setError("Verification is temporarily unavailable. Please try again.");
    } finally {
      setPending(false);
    }
  }

  function cancel() {
    // The unverified factor is left in place; startReplacement clears it on the
    // next attempt. Deleting it here would need another round trip for no gain.
    setStage("idle");
    setQrCode(null);
    setSecret(null);
    setNewFactorId(null);
    setCode("");
    setError("");
  }

  return (
    <section className="mt-6 grid gap-4 rounded-xs border border-line bg-white p-6">
      <div>
        <h2 className="font-serif text-2xl">Authenticator app</h2>
        <p className="mt-1 text-sm leading-6 text-ink-soft">
          Two-factor verification is mandatory in production and cannot be switched off. Replace the authenticator when
          you change phone or lose the device.
        </p>
      </div>

      {factors === null ? (
        <p className="text-sm text-muted">Checking your current authenticator…</p>
      ) : verified.length ? (
        <ul className="grid gap-1 text-sm text-ink-soft">
          {verified.map((factor) => (
            <li key={factor.id}>
              Active authenticator
              {factor.created_at ? ` · added ${dateFormat.format(new Date(factor.created_at))}` : ""}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-error">
          No verified authenticator is attached to this account.
        </p>
      )}

      {stage === "scan" ? (
        <form className="grid gap-4" onSubmit={confirmReplacement}>
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
            {pending ? "Preparing…" : verified.length ? "Replace authenticator" : "Set up authenticator"}
          </button>
          <p className="text-xs leading-5 text-muted">
            You will scan a QR code and enter one code to confirm. The old device stops working only once the new one is
            confirmed.
          </p>
        </>
      )}
    </section>
  );
}
