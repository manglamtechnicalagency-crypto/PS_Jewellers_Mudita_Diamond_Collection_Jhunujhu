import type { Metadata } from "next";
import EnrollMfaForm from "./EnrollMfaForm";
import BrandLogo from "@/src/components/BrandLogo";

/**
 * One-time authenticator setup for an admin account that has none.
 *
 * Cannot sit behind the admin gate: that gate requires AAL2, which is exactly
 * what this page exists to make possible. See EnrollMfaForm for how the
 * exposure is narrowed.
 */

export const metadata: Metadata = {
  title: "Set up two-factor authentication",
  // Never index an auth surface.
  robots: { index: false, follow: false },
};

export default function EnrollMfaPage() {
  return (
    <main className="min-h-screen bg-cream px-5 py-16 text-ink">
      <div className="mx-auto max-w-md rounded-xs border border-line bg-white p-8 shadow-sm">
        <BrandLogo className="h-24 w-24" priority />
        <h1 className="mt-3 font-serif text-4xl">Set up two-factor</h1>
        <p className="mt-2 text-sm leading-6 text-ink-soft">
          Admin access requires an authenticator app. Use this once, on an account that does not have one yet. If your
          account is already set up, sign in normally instead.
        </p>
        <EnrollMfaForm />
      </div>
    </main>
  );
}
