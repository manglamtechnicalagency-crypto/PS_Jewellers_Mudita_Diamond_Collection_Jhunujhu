import { useState, type FormEvent } from "react";
import SiteLayout from "../components/SiteLayout";
import { formatPrice } from "../data";
import type { AppState } from "../types";

interface CheckoutPageProps {
  appState: AppState;
}

export default function CheckoutPage({ appState }: CheckoutPageProps) {
  const [submitted, setSubmitted] = useState(false);
  const total = appState.cartProducts.reduce((sum, item) => sum + item.offerPrice * item.quantity, 0);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // Demo-only: no data is transmitted or persisted anywhere. This confirmation
    // state exists purely so the non-functional form doesn't feel broken
    // (see Phases.md Phase 2 — "checkout confirmation" fix).
    setSubmitted(true);
  };

  return (
    <SiteLayout appState={appState}>
      <section className="border-b border-line bg-cream px-5 py-12 lg:px-10">
        <div className="mx-auto max-w-content">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gold-600">Checkout UI</p>
          <h1 className="mt-2 font-serif text-4xl text-ink sm:text-5xl">Secure demo checkout.</h1>
          <p className="mt-2 text-ink-soft">No real payment is collected. This is only a frontend ecommerce demo.</p>
        </div>
      </section>

      <section className="mx-auto grid max-w-content gap-8 px-5 py-10 lg:grid-cols-[1fr_320px] lg:px-10">
        {submitted ? (
          <div className="flex flex-col items-start gap-3 rounded-xs border border-gold-300 bg-gold-50 p-8">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gold-500 text-white">✓</span>
            <h2 className="font-serif text-2xl text-ink">Demo order simulated</h2>
            <p className="max-w-md text-ink-soft">
              No real payment was processed and nothing was sent anywhere — this confirmation exists only to show what a completed
              checkout would look like in the real product.
            </p>
            <a href="/shop" className="mt-2 text-sm font-semibold text-gold-600 hover:underline">
              Continue shopping →
            </a>
          </div>
        ) : (
          <form className="flex flex-col gap-4 rounded-xs border border-line bg-white p-6" onSubmit={handleSubmit}>
            <label className="flex flex-col gap-1 text-sm font-medium text-ink-soft">
              Full Name
              <input required placeholder="Customer name" className="rounded-xs border border-line px-3 py-2.5 text-ink focus:border-gold-500 focus:outline-none" />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-ink-soft">
              Mobile Number
              <input required placeholder="+91 99999 99999" className="rounded-xs border border-line px-3 py-2.5 text-ink focus:border-gold-500 focus:outline-none" />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-ink-soft">
              Email
              <input required type="email" placeholder="customer@example.com" className="rounded-xs border border-line px-3 py-2.5 text-ink focus:border-gold-500 focus:outline-none" />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-ink-soft">
              Delivery Address
              <textarea required rows={4} placeholder="Address, city, pincode" className="rounded-xs border border-line px-3 py-2.5 text-ink focus:border-gold-500 focus:outline-none" />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-ink-soft">
              Payment Method
              <select className="rounded-xs border border-line px-3 py-2.5 text-ink focus:border-gold-500 focus:outline-none">
                <option>Demo Secure Payment</option>
                <option>Pay at Store</option>
                <option>Bank Transfer Demo</option>
              </select>
            </label>
            <button type="submit" className="mt-2 rounded-xs bg-gold-500 py-3 text-sm font-semibold text-white transition-colors hover:bg-gold-600">
              Place Demo Order
            </button>
          </form>
        )}

        <aside className="h-fit rounded-xs border border-line bg-cream p-6">
          <h2 className="font-serif text-xl text-ink">Checkout Summary</h2>
          {appState.cartProducts.map((item) => (
            <p key={item.id} className="mt-3 flex justify-between text-sm text-ink-soft">
              <span>{item.name} × {item.quantity}</span>
              <strong className="text-ink">{formatPrice(item.offerPrice * item.quantity)}</strong>
            </p>
          ))}
          <p className="mt-4 flex justify-between border-t border-line pt-4 text-sm font-semibold">
            <span>Total</span>
            <strong className="text-gold-600">{formatPrice(total)}</strong>
          </p>
        </aside>
      </section>
    </SiteLayout>
  );
}
