"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import HomePage from "./storefront-pages/HomePage";
import ShopPage from "./storefront-pages/ShopPage";
import ProductPage from "./storefront-pages/ProductPage";
import SimplePage from "./storefront-pages/SimplePage";
import NotFoundPage from "./storefront-pages/NotFoundPage";
import { createSupabaseBrowserClient } from "./lib/supabase/browser";
import {
  SHOP_ALIASES,
  SIMPLE_ROUTES,
  filterProductsForRoute,
  findCatalogueRoute,
} from "./lib/storefront-routes";
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
    void refreshHomepageSettings();
    // The catalogue is already rendered on the server. Avoid a duplicate
    // request during first paint; the interval and realtime channel keep it
    // fresh after the page is interactive.
    // Realtime below is the primary freshness mechanism; this interval only
    // covers a dropped socket. Skipping hidden tabs stops a backgrounded phone
    // from pulling the full catalogue every 30 seconds all day.
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void refreshCatalogue();
    }, 60_000);
    const onVisible = () => { if (document.visibilityState === "visible") void refreshCatalogue(); };
    document.addEventListener("visibilitychange", onVisible);
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
      document.removeEventListener("visibilitychange", onVisible);
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
