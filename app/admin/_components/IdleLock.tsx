"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/src/lib/supabase/browser";
import BrandLogo from "@/src/components/BrandLogo";

/**
 * Locks the admin UI after a period of inactivity and reopens it with a 6-digit
 * PIN, so the operator does not retype email + password + TOTP every time they
 * step away from the counter.
 *
 * This is a screen lock, not an authentication boundary. The Supabase session
 * remains valid while the overlay is up, so it does not defend against someone
 * with the unlocked machine and developer tools — it defends against the
 * ordinary case of an unattended, signed-in browser in a showroom.
 *
 * The PIN itself is never held in the browser: entries are posted to
 * /api/admin/pin/verify and checked against a bcrypt hash in Postgres, which
 * also counts failures so a page reload cannot clear them.
 */

const IDLE_TIMEOUT_MS = 5 * 60 * 1000;
const ACTIVITY_EVENTS = ["mousedown", "keydown", "touchstart", "wheel"] as const;
// Survives soft navigation within the admin; cleared when the tab closes.
const LOCK_FLAG = "psj.admin.locked";

export default function IdleLock({ displayName }: { displayName: string }) {
  const [locked, setLocked] = useState(false);
  const [pin, setPin] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  const lock = useCallback(() => {
    setLocked(true);
    setPin("");
    setMessage("");
    try { window.sessionStorage.setItem(LOCK_FLAG, "1"); } catch { /* private mode */ }
  }, []);

  const resetTimer = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(lock, IDLE_TIMEOUT_MS);
  }, [lock]);

  // Restore the locked state across reloads so refreshing the page is not an
  // escape hatch from the overlay.
  useEffect(() => {
    try { if (window.sessionStorage.getItem(LOCK_FLAG) === "1") setLocked(true); } catch { /* private mode */ }
  }, []);

  useEffect(() => {
    if (locked) {
      if (timer.current) clearTimeout(timer.current);
      return;
    }
    resetTimer();
    const onActivity = () => resetTimer();
    ACTIVITY_EVENTS.forEach((event) => window.addEventListener(event, onActivity, { passive: true }));
    return () => {
      ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, onActivity));
      if (timer.current) clearTimeout(timer.current);
    };
  }, [locked, resetTimer]);

  // Focus management for the lock dialog. Without a trap, Tab walks straight
  // out of the overlay and into the admin UI underneath — which is still fully
  // focusable and operable by keyboard even though it looks covered.
  useEffect(() => {
    if (!locked) return;
    inputRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusable = dialog.querySelectorAll<HTMLElement>('input, button, [href], select, textarea, [tabindex]:not([tabindex="-1"])');
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !dialog.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [locked]);

  async function signOut() {
    try {
      const client = createSupabaseBrowserClient();
      await client?.auth.signOut();
    } finally {
      try { window.sessionStorage.removeItem(LOCK_FLAG); } catch { /* private mode */ }
      window.location.assign("/admin/login");
    }
  }

  async function unlock(event: React.FormEvent) {
    event.preventDefault();
    if (pin.length !== 6 || busy) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/pin/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      const payload = await response.json() as { data?: { status?: string; remainingAttempts?: number | null; lockedUntil?: string | null }; error?: { message?: string } };
      const status = payload.data?.status;

      if (status === "ok" || status === "not_set") {
        try { window.sessionStorage.removeItem(LOCK_FLAG); } catch { /* private mode */ }
        setLocked(false);
        setPin("");
        return;
      }
      if (status === "locked") {
        // Too many wrong entries: end the session outright rather than leave a
        // live admin session sitting behind a lock somebody is guessing at.
        setMessage("Too many incorrect attempts. Signing out — sign in again with your email, password, and authenticator.");
        await signOut();
        return;
      }
      const remaining = payload.data?.remainingAttempts;
      setMessage(typeof remaining === "number" ? `Incorrect PIN. ${remaining} attempt${remaining === 1 ? "" : "s"} left before you are signed out.` : payload.error?.message ?? "Incorrect PIN.");
      setPin("");
    } catch {
      setMessage("The PIN could not be checked. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!locked) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Screen locked"
      className="fixed inset-0 z-[100] overflow-y-auto overscroll-contain bg-cream/95 backdrop-blur-sm"
    >
      <div className="flex min-h-full items-center justify-center px-4 py-6 sm:px-5 sm:py-10">
      <div ref={dialogRef} className="w-full max-w-sm rounded-xs border border-line bg-white p-6 shadow-elevated sm:p-8">
        <BrandLogo className="h-12 w-12 sm:h-16 sm:w-16" />
        <h2 className="mt-3 font-serif text-2xl sm:mt-4 sm:text-3xl">Screen locked</h2>
        <p className="mt-2 text-sm text-ink-soft">
          {displayName ? `Signed in as ${displayName}. ` : ""}Enter your 6-digit PIN to continue.
        </p>
        <form onSubmit={unlock} className="mt-5 grid gap-4 sm:mt-6">
          <label className="text-sm font-medium">
            PIN
            <input
              ref={inputRef}
              className="mt-1 min-h-11 w-full border border-line p-3 text-center font-mono text-xl tracking-[0.4em] sm:text-2xl sm:tracking-[0.5em]"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              maxLength={6}
              value={pin}
              onChange={(event) => setPin(event.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
            />
          </label>
          <button
            type="submit"
            disabled={pin.length !== 6 || busy}
            className="min-h-11 w-full bg-ink px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy ? "Checking…" : "Unlock"}
          </button>
          <button
            type="button"
            onClick={() => void signOut()}
            className="inline-flex min-h-11 w-full items-center justify-center text-sm text-ink-soft hover:text-gold-600"
          >
            Sign out instead
          </button>
        </form>
        {message ? <p className="mt-4 text-sm text-red-700" role="alert">{message}</p> : null}
      </div>
      </div>
    </div>
  );
}
