import { useState, type FormEvent } from "react";
import SiteLayout from "../components/SiteLayout";
import type { AppState } from "../types";
import {
  createStorefrontEnquiry,
  shortlistMessage,
} from "../lib/storefront-enquiry";

interface CheckoutPageProps {
  appState: AppState;
}

export default function CheckoutPage({ appState }: CheckoutPageProps) {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [idempotencyKey] = useState(() =>
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`,
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const result = await createStorefrontEnquiry({
        name: String(form.get("name") ?? ""),
        phone: String(form.get("phone") ?? ""),
        email: String(form.get("email") ?? ""),
        message: shortlistMessage(
          appState.cartProducts,
          String(form.get("message") ?? ""),
        ),
        preferredContact: String(form.get("preferredContact") ?? "email") as
          "email" | "phone" | "whatsapp",
        productIds: appState.cartProducts.map((item) => item.id),
        idempotencyKey,
        selectedOptions: {
          size: String(form.get("size") ?? ""),
          purity: String(form.get("purity") ?? ""),
          colour: String(form.get("colour") ?? ""),
          preferredVisitDate: String(form.get("preferredVisitDate") ?? ""),
          preferredVisitTime: String(form.get("preferredVisitTime") ?? ""),
        },
      });
      setSubmitted(true);
      window.location.assign(result.whatsappUrl);
    } catch {
      setError(
        "We could not send your enquiry. Please try again or contact the showroom directly.",
      );
    }
  };

  return (
    <SiteLayout appState={appState}>
      <section className="border-b border-line bg-cream px-4 py-10 sm:px-5 sm:py-12 lg:px-10">
        <div className="mx-auto max-w-content">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-600 sm:text-sm">
            Enquiry
          </p>
          <h1 className="mt-2 font-serif text-3xl text-ink sm:text-4xl lg:text-5xl">
            Send your jewellery enquiry.
          </h1>
          <p className="mt-2 text-sm text-ink-soft sm:text-base">
            Share your details and the showroom will confirm availability,
            sizing and price.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-content gap-6 px-4 py-8 sm:px-5 lg:grid-cols-[1fr_320px] lg:gap-8 lg:px-10 lg:py-10">
        {submitted ? (
          <div className="flex flex-col items-start gap-3 rounded-xs border border-gold-300 bg-gold-50 p-8">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gold-500 text-white">
              ✓
            </span>
            <h2 className="font-serif text-2xl text-ink">Enquiry received</h2>
            <p className="max-w-md text-ink-soft">
              Thank you. The showroom will contact you using your preferred
              contact method to discuss your shortlist.
            </p>
            <a
              href="/shop"
              className="mt-2 text-sm font-semibold text-gold-600 hover:underline"
            >
              Continue shopping →
            </a>
          </div>
        ) : (
          <form
            className="flex flex-col gap-4 rounded-xs border border-line bg-white p-6"
            onSubmit={handleSubmit}
          >
            <label className="flex flex-col gap-1 text-sm font-medium text-ink-soft">
              Full Name
              <input
                required
                name="name"
                placeholder="Customer name"
                className="rounded-xs border border-line px-3 py-2.5 text-ink focus:border-gold-500 focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-ink-soft">
              Mobile Number
              <input
                required
                name="phone"
                placeholder="+91 99999 99999"
                className="rounded-xs border border-line px-3 py-2.5 text-ink focus:border-gold-500 focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-ink-soft">
              Email (optional)
              <input
                name="email"
                type="email"
                placeholder="customer@example.com"
                className="rounded-xs border border-line px-3 py-2.5 text-ink focus:border-gold-500 focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-ink-soft">
              Size preference (optional)
              <input name="size" placeholder="e.g. 16, 18, adjustable" className="rounded-xs border border-line px-3 py-2.5 text-ink focus:border-gold-500 focus:outline-none" />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-ink-soft">
              Purity preference (optional)
              <input name="purity" placeholder="e.g. 22K, 18K" className="rounded-xs border border-line px-3 py-2.5 text-ink focus:border-gold-500 focus:outline-none" />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-ink-soft">
              Colour preference (optional)
              <input name="colour" placeholder="e.g. yellow gold, rose gold" className="rounded-xs border border-line px-3 py-2.5 text-ink focus:border-gold-500 focus:outline-none" />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-ink-soft">
              Preferred visit date (optional)
              <input name="preferredVisitDate" type="date" className="rounded-xs border border-line px-3 py-2.5 text-ink focus:border-gold-500 focus:outline-none" />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-ink-soft">
              Preferred visit time (optional)
              <input name="preferredVisitTime" type="time" className="rounded-xs border border-line px-3 py-2.5 text-ink focus:border-gold-500 focus:outline-none" />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-ink-soft">
              Enquiry Details
              <textarea
                name="message"
                rows={4}
                placeholder="Size, design, occasion or any other requirement"
                className="rounded-xs border border-line px-3 py-2.5 text-ink focus:border-gold-500 focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-ink-soft">
              Preferred Contact
              <select
                name="preferredContact"
                className="rounded-xs border border-line px-3 py-2.5 text-ink focus:border-gold-500 focus:outline-none"
              >
                <option value="email">Email</option>
                <option value="phone">Phone</option>
                <option value="whatsapp">WhatsApp</option>
              </select>
            </label>
            <label className="flex items-start gap-2 text-sm text-ink-soft">
              <input required type="checkbox" name="consent" />I consent to PS
              Jewellers contacting me about this enquiry.
            </label>
            {error ? (
              <p role="alert" className="text-sm text-red-700">
                {error}
              </p>
            ) : null}
            <button
              type="submit"
              className="mt-2 rounded-xs bg-gold-500 py-3 text-sm font-semibold text-white transition-colors hover:bg-gold-600"
            >
              Send Enquiry
            </button>
          </form>
        )}

        <aside className="h-fit rounded-xs border border-line bg-cream p-6">
          <h2 className="font-serif text-xl text-ink">Shortlist Summary</h2>
          {appState.cartProducts.map((item) => (
            <p
              key={item.id}
              className="mt-3 flex justify-between text-sm text-ink-soft"
            >
              <span>
                {item.name} × {item.quantity}
              </span>
              <strong className="text-ink">{item.quantity} selected</strong>
            </p>
          ))}
          <p className="mt-4 flex justify-between border-t border-line pt-4 text-sm font-semibold">
            <span>Price</span>
            <strong className="text-gold-600">On enquiry</strong>
          </p>
        </aside>
      </section>
    </SiteLayout>
  );
}
