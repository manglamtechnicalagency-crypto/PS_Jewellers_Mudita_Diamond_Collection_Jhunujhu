"use client";

import { useEffect } from "react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[app-error-boundary]", { name: error.name, digest: error.digest });
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-cream px-5 text-ink">
      <section className="max-w-md rounded-xs border border-line bg-white p-8 text-center shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-600">PS Jewellers</p>
        <h1 className="mt-3 font-serif text-3xl">Something went wrong</h1>
        <p className="mt-3 text-sm leading-6 text-ink-soft">We could not load this page. Please try again.</p>
        <button onClick={() => reset()} className="mt-6 rounded-xs bg-ink px-4 py-3 text-sm font-semibold text-white">Try again</button>
      </section>
    </main>
  );
}
