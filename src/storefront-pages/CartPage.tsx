import SiteLayout from "../components/SiteLayout";
import { formatPrice } from "../data";
import type { AppState } from "../types";
import Image from "next/image";

interface CartPageProps {
  appState: AppState;
}

export default function CartPage({ appState }: CartPageProps) {
  return (
    <SiteLayout appState={appState}>
      <section className="border-b border-line bg-cream px-4 py-10 sm:px-5 sm:py-12 lg:px-10">
        <div className="mx-auto max-w-content">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-600 sm:text-sm">Shortlist</p>
          <h1 className="mt-2 font-serif text-3xl text-ink sm:text-4xl lg:text-5xl">Your jewellery shortlist.</h1>
          <p className="mt-2 text-sm text-ink-soft sm:text-base">Review your selections, then send an enquiry to the showroom.</p>
        </div>
      </section>

      <section className="mx-auto grid max-w-content gap-6 px-4 py-8 sm:px-5 lg:grid-cols-[1fr_320px] lg:gap-8 lg:px-10 lg:py-10">
        <div className="flex flex-col gap-4">
          {appState.cartProducts.length ? (
            appState.cartProducts.map((item) => (
              <article key={item.id} className="flex flex-wrap items-center gap-4 rounded-xs border border-line bg-white p-3 sm:flex-nowrap sm:p-4">
                <Image src={item.image} alt={item.name} width={80} height={80} sizes="80px" className="h-16 w-16 shrink-0 rounded-xs object-cover sm:h-20 sm:w-20" />
                <div className="min-w-0 flex-1">
                  <h2 className="font-serif text-base text-ink sm:text-lg">{item.name}</h2>
                  <p className="text-xs text-muted sm:text-sm">{item.purity} · {item.weight}</p>
                  <strong className="text-gold-600">Indicative {formatPrice(item.offerPrice)}</strong>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <button
                    onClick={() => appState.updateCart(item.id, item.quantity - 1)}
                    className="flex h-10 w-10 items-center justify-center rounded-xs border border-line text-ink-soft transition-colors hover:border-gold-500"
                  >
                    −
                  </button>
                  <span className="w-6 text-center text-sm">{item.quantity}</span>
                  <button
                    onClick={() => appState.updateCart(item.id, item.quantity + 1)}
                    className="flex h-10 w-10 items-center justify-center rounded-xs border border-line text-ink-soft transition-colors hover:border-gold-500"
                  >
                    +
                  </button>
                </div>
              </article>
            ))
          ) : (
            <div className="rounded-xs border border-dashed border-line py-16 text-center text-ink-soft">Your shortlist is empty.</div>
          )}
        </div>
        <aside className="h-fit rounded-xs border border-line bg-cream p-5 sm:p-6">
          <h2 className="font-serif text-xl text-ink">Shortlist Summary</h2>
          <p className="mt-4 flex justify-between text-sm text-ink-soft">
            <span>Selected pieces</span>
            <strong className="text-ink">{appState.cartProducts.length}</strong>
          </p>
          <p className="mt-2 flex justify-between text-sm text-ink-soft">
            <span>Price</span>
            <strong className="text-ink">Confirmed by showroom</strong>
          </p>
          <a
            href="/checkout"
            className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-xs bg-gold-500 text-center text-sm font-semibold text-white transition-colors hover:bg-gold-600"
          >
            Send Shortlist Enquiry
          </a>
        </aside>
      </section>
    </SiteLayout>
  );
}
