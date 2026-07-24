import SiteLayout from "../components/SiteLayout";
import { formatPrice } from "../data";
import type { AppState } from "../types";

interface CartPageProps {
  appState: AppState;
}

export default function CartPage({ appState }: CartPageProps) {
  const total = appState.cartProducts.reduce((sum, item) => sum + item.offerPrice * item.quantity, 0);

  return (
    <SiteLayout appState={appState}>
      <section className="border-b border-line bg-cream px-5 py-12 lg:px-10">
        <div className="mx-auto max-w-content">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gold-600">Shopping Cart</p>
          <h1 className="mt-2 font-serif text-4xl text-ink sm:text-5xl">Your jewellery bag.</h1>
          <p className="mt-2 text-ink-soft">Demo cart UI for client presentation.</p>
        </div>
      </section>

      <section className="mx-auto grid max-w-content gap-8 px-5 py-10 lg:grid-cols-[1fr_320px] lg:px-10">
        <div className="flex flex-col gap-4">
          {appState.cartProducts.length ? (
            appState.cartProducts.map((item) => (
              <article key={item.id} className="flex items-center gap-4 rounded-xs border border-line bg-white p-4">
                <img src={item.image} alt={item.name} className="h-20 w-20 rounded-xs object-cover" />
                <div className="flex-1">
                  <h2 className="font-serif text-lg text-ink">{item.name}</h2>
                  <p className="text-sm text-muted">{item.purity} · {item.weight}</p>
                  <strong className="text-gold-600">{formatPrice(item.offerPrice)}</strong>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => appState.updateCart(item.id, item.quantity - 1)}
                    className="flex h-8 w-8 items-center justify-center rounded-xs border border-line text-ink-soft hover:border-gold-500"
                  >
                    −
                  </button>
                  <span className="w-6 text-center text-sm">{item.quantity}</span>
                  <button
                    onClick={() => appState.updateCart(item.id, item.quantity + 1)}
                    className="flex h-8 w-8 items-center justify-center rounded-xs border border-line text-ink-soft hover:border-gold-500"
                  >
                    +
                  </button>
                </div>
              </article>
            ))
          ) : (
            <div className="rounded-xs border border-dashed border-line py-16 text-center text-ink-soft">Your cart is empty.</div>
          )}
        </div>
        <aside className="h-fit rounded-xs border border-line bg-cream p-6">
          <h2 className="font-serif text-xl text-ink">Order Summary</h2>
          <p className="mt-4 flex justify-between text-sm text-ink-soft">
            <span>Subtotal</span>
            <strong className="text-ink">{formatPrice(total)}</strong>
          </p>
          <p className="mt-2 flex justify-between text-sm text-ink-soft">
            <span>Delivery</span>
            <strong className="text-ink">Insured Demo Delivery</strong>
          </p>
          <a
            href="/checkout"
            className="mt-6 block rounded-xs bg-gold-500 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-gold-600"
          >
            Proceed to Checkout
          </a>
        </aside>
      </section>
    </SiteLayout>
  );
}
