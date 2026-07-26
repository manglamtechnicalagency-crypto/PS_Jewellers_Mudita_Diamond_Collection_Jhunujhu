import SiteLayout from "../components/SiteLayout";
import { blogPosts, trustItems } from "../data";
import type { AppState } from "../types";
import Image from "next/image";

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
  account: ["My Account", "Sign-in is coming soon. For now your wishlist, bag and recently viewed pieces are saved on this device."],
  tracking: ["Order Tracking", "Reserved a piece? Call or WhatsApp the showroom with your reservation reference and we will confirm its status."],
  store: ["Store Locator", "PS Jewellers, Jhunjhunu, Rajasthan. Visit the showroom for bridal consultation, gold jewellery and diamond collections."],
  appointment: ["Book Appointment", "Reserve a private jewellery consultation for bridal sets, diamond rings, or gold investment pieces."],
  about: ["About PS Jewellers", "PS Jewellers serves Jhunjhunu with BIS hallmarked gold, certified diamonds and handcrafted 925 silver. Every piece is photographed in our own studio and listed with its weight and hallmarking."],
  contact: ["Contact", "Speak with PS Jewellers for product enquiries, appointments and showroom visits in Jhunjhunu."],
  faq: ["FAQ", "Common questions about hallmarking, pricing, reservations, exchange and certification."],
  privacy: ["Privacy Policy", "How PS Jewellers handles enquiry details, appointment requests and the wishlist stored on your device."],
  terms: ["Terms & Conditions", "Terms covering product information, pricing, reservations and showroom consultations."],
  returns: ["Return Policy", "Exchange and buy-back terms for hallmarked gold, certified diamonds and silver jewellery."],
  blog: ["Blog", "Buying guides, styling notes and care advice for gold, diamond and silver jewellery."],
};

export default function SimplePage({ appState, type }: SimplePageProps) {
  const [title, text] = copy[type] ?? copy.about;

  return (
    <SiteLayout appState={appState}>
      <section className="border-b border-line bg-cream px-4 py-10 sm:px-5 sm:py-12 lg:px-10">
        <div className="mx-auto max-w-content">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-600 sm:text-sm">PS Jewellers</p>
          <h1 className="mt-2 font-serif text-3xl text-ink sm:text-4xl lg:text-5xl">{title}</h1>
          <p className="mt-2 text-sm text-ink-soft sm:text-base">{text}</p>
        </div>
      </section>

      {type === "blog" ? (
        <section className="mx-auto max-w-content px-5 py-12 lg:px-10">
          <div className="grid gap-8 sm:grid-cols-3">
            {blogPosts.map((post) => (
              <article key={post.title} className="rounded-xs border border-line bg-white p-4">
                <Image src={post.image} alt="" width={640} height={360} sizes="(max-width: 640px) 100vw, 33vw" className="mb-4 aspect-video w-full rounded-xs object-cover" />
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
                <span className="text-xs text-muted">PS Jewellers assurance</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </SiteLayout>
  );
}
