"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import HomePage from "./storefront-pages/HomePage";
import ShopPage from "./storefront-pages/ShopPage";
import ProductPage from "./storefront-pages/ProductPage";
import SimplePage from "./storefront-pages/SimplePage";
import NotFoundPage from "./storefront-pages/NotFoundPage";
import {
  SHOP_ALIASES,
  SIMPLE_ROUTES,
  filterProductsForRoute,
  findCatalogueRoute,
} from "./lib/storefront-routes";
import type { SectionMediaMap } from "./lib/site-sections";
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
  // Gold is the homepage focus, so the hero CTA leads to the gold collection
  // by default. Both fields remain admin-editable in Admin → Settings.
  primaryCtaLabel: "Shop Gold Collection",
  primaryCtaHref: "/gold-jewellery",
};

function normalizePath(pathname: string): string {
  const path = pathname.replace(/\/+$/, "") || "/";
  return path.toLowerCase();
}

// Category resolution now lives in src/lib/storefront-routes.ts, alongside the
// nav, the sitemap, and every other listing route, so the four lists cannot
// drift apart again.

export default function App({
  initialProducts,
}: {
  initialProducts?: Product[];
}) {
  const [recentlyViewed, setRecentlyViewed] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [hydrated, setHydrated] = useState(false);
  // The server always supplies this (published catalogue, or the seed file in
  // development). Importing the seed here as a fallback pulled all ~46 KB of
  // src/data.ts into the client bundle for every visitor.
  const [catalogueProducts, setCatalogueProducts] = useState<Product[]>(
    initialProducts ?? [],
  );
  const [homepageSettings, setHomepageSettings] = useState<HomepageSettings>(
    defaultHomepageSettings,
  );
  // Admin-assigned section images. Empty until the fetch lands, and every
  // consumer falls back to its bundled asset, so first paint is never blank.
  const [sectionMedia, setSectionMedia] = useState<SectionMediaMap>({});
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
    const refreshSectionMedia = async () => {
      try {
        const response = await fetch("/api/public/site-media", {
          cache: "no-store",
        });
        if (!response.ok) return;
        const payload = (await response.json()) as {
          data?: SectionMediaMap | null;
        };
        if (!cancelled && payload.data) setSectionMedia(payload.data);
      } catch {
        // Bundled storefront assets remain in place when the CMS is offline.
      }
    };
    void refreshHomepageSettings();
    void refreshSectionMedia();
    // Refresh once when a shopper returns to a backgrounded tab. The server
    // payload is authoritative; no permanent polling or broad database
    // realtime subscription is required in the public browser.
    const onVisible = () => { if (document.visibilityState === "visible") void refreshCatalogue(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
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
    return (
      <HomePage
        appState={appState}
        settings={homepageSettings}
        products={catalogueProducts}
        sectionMedia={sectionMedia}
      />
    );
  if (SHOP_ALIASES.includes(path))
    return <ShopPage appState={appState} customProducts={catalogueProducts} />;

  // Every product listing — /shop, the category pages, and the tag-style pages
  // (New In, Bridal, Offers, Best Sellers, sub-categories) — resolves through
  // one table. A "category" route also preselects the dropdown so the existing
  // pages behave exactly as before.
  const catalogueRoute = findCatalogueRoute(path);
  if (catalogueRoute) {
    // A category route hands over the WHOLE catalogue and just preselects the
    // dropdown, so the shopper can switch category without leaving the page.
    // Pre-filtering here would strand them: picking "Rings" on /gold-jewellery
    // would return nothing. Every other kind has no dropdown equivalent, so it
    // filters up front.
    const isCategory = catalogueRoute.kind === "category";
    return (
      <ShopPage
        appState={appState}
        title={catalogueRoute.title}
        customProducts={isCategory ? catalogueProducts : filterProductsForRoute(catalogueRoute, catalogueProducts)}
        initialFilter={isCategory ? (catalogueRoute.value ?? "") : ""}
        initialSort={catalogueRoute.kind === "new-arrivals" ? "newest" : "featured"}
        emptyMessage={catalogueRoute.emptyMessage}
      />
    );
  }

  const simpleType = SIMPLE_ROUTES[path];
  if (simpleType) return <SimplePage appState={appState} type={simpleType} />;
  if (path.startsWith("/product/") || path.startsWith("/project/")) {
    const slug = path.split("/").pop() ?? "";
    const product = catalogueProducts.find((item) => item.slug === slug);
    // Phase 2 fix (see Phases.md): an unknown slug now renders NotFoundPage
    // instead of silently falling back to the first product in the catalogue.
    return product ? (
      <ProductPage product={product} appState={appState} catalogue={catalogueProducts} />
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
