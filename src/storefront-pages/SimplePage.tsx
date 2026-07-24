import SiteLayout from "../components/SiteLayout";
import { blogPosts, trustItems } from "../data";
import type { AppState } from "../types";

export type SimplePageType =
  | "account"
  | "tracking"
  | "store"
  | "appointment"
  | "about"
  | "contact"
  | "faq"
  | "privacy"
  | "terms"
  | "returns"
  | "blog";

interface SimplePageProps {
  appState?: AppState;
  type: SimplePageType;
}

const copy: Record<SimplePageType, [string, string]> = {
  account: ["My Account", "Login/profile UI placeholder for the ecommerce demo. Customers can review wishlist, cart and order status in a real build."],
  tracking: ["Order Tracking", "Track jewellery orders with demo status, insured delivery notes and showroom support."],
  store: ["Store Locator", "PS Jewellers, Bikaner, Rajasthan. Visit the showroom for bridal consultation, gold jewellery and diamond collections."],
  appointment: ["Book Appointment", "Reserve a private jewellery consultation for bridal sets, diamond rings, or gold investment pieces."],
  about: ["About PS Jewellers", "A premium jewellery ecommerce demo built around trust, hallmarking, certified diamonds and elegant retail presentation."],
  contact: ["Contact", "Speak with PS Jewellers for product enquiries, appointments and showroom visits in Bikaner."],
  faq: ["FAQ", "Common questions about hallmarking, demo pricing, cart flow, checkout UI, exchange policy and product certification."],
  privacy: ["Privacy Policy", "Demo privacy content for customer data, enquiries, wishlist, cart and appointment forms."],
  terms: ["Terms & Conditions", "Demo website terms for product information, pricing, offers and showroom consultation."],
  returns: ["Return Policy", "Demo return and exchange policy for hallmarked jewellery and certified diamonds."],
  blog: ["Blog", "Jewellery buying guides, styling notes and customer education content for the ecommerce demo."],
};

export default function SimplePage({ appState, type }: SimplePageProps) {
  const [title, text] = copy[type] ?? copy.about;

  return (
    <SiteLayout appState={appState}>
      <section className="border-b border-line bg-cream px-5 py-12 lg:px-10">
        <div className="mx-auto max-w-content">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gold-600">PS Jewellers</p>
          <h1 className="mt-2 font-serif text-4xl text-ink sm:text-5xl">{title}</h1>
          <p className="mt-2 text-ink-soft">{text}</p>
        </div>
      </section>

      {type === "blog" ? (
        <section className="mx-auto max-w-content px-5 py-12 lg:px-10">
          <div className="grid gap-8 sm:grid-cols-3">
            {blogPosts.map((post) => (
              <article key={post.title} className="rounded-xs border border-line bg-white p-4">
                <img src={post.image} alt="" className="mb-4 aspect-video w-full rounded-xs object-cover" />
                <p className="text-xs font-semibold uppercase tracking-wide text-gold-600">{post.date}</p>
                <h2 className="mt-1 font-serif text-lg text-ink">{post.title}</h2>
                <span className="mt-2 inline-block text-sm text-gold-600">Read article</span>
              </article>
            ))}
          </div>
        </section>
      ) : (
        <section className="mx-auto max-w-content px-5 py-12 lg:px-10">
          <div className="rounded-xs border border-line bg-cream p-10 text-center">
            <h2 className="font-serif text-2xl text-ink">{title}</h2>
            <p className="mx-auto mt-3 max-w-xl text-ink-soft">{text}</p>
            <a href="/shop" className="mt-6 inline-block rounded-xs bg-gold-500 px-6 py-3 text-sm font-semibold text-white hover:bg-gold-600">
              Continue Shopping
            </a>
          </div>
          <div className="mt-10 grid grid-cols-2 gap-6 sm:grid-cols-4">
            {trustItems.map((item) => (
              <div key={item} className="text-center">
                <strong className="block font-serif text-lg text-gold-600">{item}</strong>
                <span className="text-xs text-muted">PS Jewellers demo assurance</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </SiteLayout>
  );
}
