"use client";

import { useEffect, useState } from "react";

/**
 * Sets, changes, or removes the idle-lock PIN for the signed-in admin.
 *
 * The PIN is per-account and only ever affects that account's lock screen — it
 * is not a shared credential and grants no access on its own.
 */

// Warned about, not blocked. These are the first entries anyone guessing would
// try, but the PIN only reopens a locked screen on a session that has already
// passed password + TOTP — it is not the credential protecting the account — so
// the choice belongs to the operator.
const WEAK_PINS = new Set(["123456", "000000", "111111", "222222", "333333", "444444", "555555", "666666", "777777", "888888", "999999", "654321", "121212", "112233", "123123"]);

function weaknessWarning(pin: string): string | null {
  if (WEAK_PINS.has(pin)) return "Saved. Note this is one of the most commonly guessed PINs — fine for a counter screen lock, worth changing if the machine is ever unattended in public.";
  if (/^(?:0123|1234|2345|3456|4567|5678|6789)/.test(pin)) return "Saved. Note this PIN starts with sequential digits, which is among the first things anyone would try.";
  return null;
}

export default function PinManager() {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void fetch("/api/admin/pin", { cache: "no-store" })
      .then((response) => response.json())
      .then((payload: { data?: { configured?: boolean } }) => setConfigured(Boolean(payload.data?.configured)))
      .catch(() => setConfigured(false));
  }, []);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setMessage("");
    if (!/^[0-9]{6}$/.test(pin)) { setMessage("The PIN must be exactly 6 digits."); return; }
    if (pin !== confirmPin) { setMessage("The two PINs do not match."); return; }

    const warning = weaknessWarning(pin);
    setBusy(true);
    try {
      const response = await fetch("/api/admin/pin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pin }) });
      const payload = await response.json() as { error?: { message?: string } };
      if (!response.ok) throw new Error(payload.error?.message ?? "The PIN could not be saved");
      setConfigured(true);
      setPin("");
      setConfirmPin("");
      setMessage(warning ?? "PIN saved. The screen will lock after 5 minutes of inactivity.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The PIN could not be saved");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm("Remove the PIN? The admin screen will stop locking automatically.")) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/pin", { method: "DELETE" });
      if (!response.ok) throw new Error("The PIN could not be removed");
      setConfigured(false);
      setMessage("PIN removed. The screen will no longer lock on inactivity.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The PIN could not be removed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-8 rounded-xs border border-line bg-white p-5 sm:p-6">
      <h2 className="font-serif text-2xl">Screen lock PIN</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-soft">
        After 5 minutes of inactivity the admin screen locks and reopens with this
        6-digit PIN, so you do not retype your password and authenticator code
        each time you step away. Five wrong entries signs you out completely.
      </p>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
        This is a convenience lock for an unattended screen, not a replacement for
        your password. Anyone who takes the unlocked machine can still reach the
        data underneath, so sign out properly at the end of a shift.
      </p>
      <p className="mt-4 text-sm font-medium">
        Status: {configured === null ? "Checking…" : configured ? "PIN is set" : "No PIN set — the screen does not lock"}
      </p>
      <form onSubmit={save} className="mt-5 grid max-w-md gap-4">
        <label className="text-sm font-medium">
          {configured ? "New PIN" : "PIN"}
          <input
            className="mt-1 min-h-11 w-full border border-line p-3 font-mono tracking-[0.3em] sm:tracking-[0.4em]"
            type="password"
            inputMode="numeric"
            autoComplete="new-password"
            maxLength={6}
            value={pin}
            onChange={(event) => setPin(event.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
          />
        </label>
        <label className="text-sm font-medium">
          Confirm PIN
          <input
            className="mt-1 min-h-11 w-full border border-line p-3 font-mono tracking-[0.3em] sm:tracking-[0.4em]"
            type="password"
            inputMode="numeric"
            autoComplete="new-password"
            maxLength={6}
            value={confirmPin}
            onChange={(event) => setConfirmPin(event.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
          />
        </label>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <button type="submit" disabled={busy} className="min-h-11 w-full bg-ink px-4 py-3 text-sm font-semibold text-white disabled:opacity-50 sm:w-auto">
            {busy ? "Saving…" : configured ? "Change PIN" : "Set PIN"}
          </button>
          {configured ? (
            <button type="button" onClick={() => void remove()} disabled={busy} className="min-h-11 w-full border border-red-200 px-4 py-3 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50 sm:w-auto">
              Remove PIN
            </button>
          ) : null}
        </div>
      </form>
      {message ? <p className="mt-4 text-sm text-ink-soft" role="status">{message}</p> : null}
    </section>
  );
}
