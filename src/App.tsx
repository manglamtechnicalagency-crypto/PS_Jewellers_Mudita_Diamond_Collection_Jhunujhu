"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import HomePage from "./storefront-pages/HomePage";
import ShopPage from "./storefront-pages/ShopPage";
import ProductPage from "./storefront-pages/ProductPage";
import SimplePage from "./storefront-pages/SimplePage";
import NotFoundPage from "./storefront-pages/NotFoundPage";
import { products } from "./data";
import { createSupabaseBrowserClient } from "./lib/supabase/browser";
import type {
  AppState,
  HomepageSettings,
  Product,
} from "./types";

const defaultHomepageSettings: HomepageSettings = {
  heroEyebrow: "PS Jewellers · Jhunjhunu",
  heroTitle: "Luxury jewellery crafted for life's finest occasions.",
  heroDescription:
    "BIS hallmarked gold, certified diamonds and handcrafted 925 silver, from our Jhunjhunu showroom.",
  primaryCtaLabel: "Shop Collection",
  primaryCtaHref: "/shop",
  secondaryCtaLabel: "Book Appointment",
  secondaryCtaHref: "/book-appointment",
};

function normalizePath(pathname: string): string {
  const path = pathname.replace(/\/+$/, "") || "/";
  return path.toLowerCase();
}

function categoryFromPath(path: string): string | undefined {
  const map: Record<string, string> = {
    "/gold-jewellery": "Gold Jewellery",
    "/diamond-jewellery": "Diamond Jewellery",
    "/rings": "Rings",
    "/necklaces": "Necklaces",
    "/earrings": "Earrings",
    "/silver-jewellery": "Silver Jewellery",
  };
  return map[path];
}

export default function App({
  initialProducts,
}: {
  initialProducts?: Product[];
}) {
  const [recentlyViewed, setRecentlyViewed] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [hydrated, setHydrated] = useState(false);
  const [catalogueProducts, setCatalogueProducts] = useState<Product[]>(
    initialProducts ?? products,
  );
  const [homepageSettings, setHomepageSettings] = useState<HomepageSettings>(
    defaultHomepageSettings,
  );
  const path = normalizePath(usePathname() || "/");

  useEffect(() => {
    setRecentlyViewed(readStored("ps-recent", []));
    setSearchTerm(getInitialSearch());
    setHydrated(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const refreshCatalogue = async () => {
      try {
        const response = await fetch("/api/catalogue", { cache: "no-store" });
        if (!response.ok) return;
        const payload = (await response.json()) as { data?: Product[] | null };
        if (!cancelled && payload.data) setCatalogueProducts(payload.data);
      } catch {
        // The server-rendered catalogue remains available for this session.
      }
    };
    const refreshHomepageSettings = async () => {
      try {
        const response = await fetch("/api/public/settings", {
          cache: "no-store",
        });
        if (!response.ok) return;
        const payload = (await response.json()) as {
          data?: { homepage?: Partial<HomepageSettings> } | null;
        };
        if (!cancelled && payload.data?.homepage)
          setHomepageSettings((current) => ({
            ...current,
            ...payload.data!.homepage,
          }));
      } catch {
        // Built-in defaults remain available when the CMS is unavailable.
      }
    };
    void refreshCatalogue();
    void refreshHomepageSettings();
    const interval = window.setInterval(refreshCatalogue, 30_000);
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      ?.channel("catalogue-live-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "products" },
        () => void refreshCatalogue(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "media" },
        () => void refreshCatalogue(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "product_media" },
        () => void refreshCatalogue(),
      )
      .subscribe();
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      if (supabase && channel) void supabase.removeChannel(channel);
    };
  }, []);

  // Guarded on `hydrated` so the first pass cannot overwrite stored values with
  // the empty initial state.
  useEffect(() => {
    if (hydrated) storeValue("ps-recent", recentlyViewed);
  }, [recentlyViewed, hydrated]);

  const appState: AppState = {
    recentlyViewed,
    searchTerm,
    setSearchTerm,
    addRecentlyViewed(product) {
      setRecentlyViewed((items) =>
        [product.id, ...items.filter((id) => id !== product.id)].slice(0, 6),
      );
    },
  };

  if (path === "/")
    return <HomePage appState={appState} settings={homepageSettings} products={catalogueProducts} />;
  if (path === "/shop" || path === "/portfolio")
    return <ShopPage appState={appState} customProducts={catalogueProducts} />;
  const filterFromCategoryPath = categoryFromPath(path);
  if (filterFromCategoryPath)
    return (
      <ShopPage appState={appState} initialFilter={filterFromCategoryPath} customProducts={catalogueProducts} />
    );
  if (path === "/account")
    return <SimplePage appState={appState} type="account" />;
  if (path === "/order-tracking")
    return <SimplePage appState={appState} type="tracking" />;
  if (path === "/store-locator")
    return <SimplePage appState={appState} type="store" />;
  if (path === "/book-appointment")
    return <SimplePage appState={appState} type="appointment" />;
  if (path === "/about") return <SimplePage appState={appState} type="about" />;
  if (path === "/blog" || path === "/journal")
    return <SimplePage appState={appState} type="blog" />;
  if (path === "/contact")
    return <SimplePage appState={appState} type="contact" />;
  if (path === "/faq") return <SimplePage appState={appState} type="faq" />;
  if (path === "/privacy-policy")
    return <SimplePage appState={appState} type="privacy" />;
  if (path === "/terms") return <SimplePage appState={appState} type="terms" />;
  if (path === "/return-policy")
    return <SimplePage appState={appState} type="returns" />;
  if (path.startsWith("/product/") || path.startsWith("/project/")) {
    const slug = path.split("/").pop() ?? "";
    const product = catalogueProducts.find((item) => item.slug === slug);
    // Phase 2 fix (see Phases.md): an unknown slug now renders NotFoundPage
    // instead of silently falling back to the first product in the catalogue.
    return product ? (
      <ProductPage product={product} appState={appState} />
    ) : (
      <NotFoundPage appState={appState} />
    );
  }

  return <NotFoundPage appState={appState} />;
}

function readStored<T>(key: string, fallback: T): T {
  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

function storeValue<T>(key: string, value: T): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Demo storage can fail in private browsing; the UI still works in memory.
  }
}

function getInitialSearch(): string {
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get("search") || params.get("q") || "";
  } catch {
    return "";
  }
}
