"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import HomePage from "./storefront-pages/HomePage";
import ShopPage from "./storefront-pages/ShopPage";
import ProductPage from "./storefront-pages/ProductPage";
import SimplePage from "./storefront-pages/SimplePage";
import CartPage from "./storefront-pages/CartPage";
import CheckoutPage from "./storefront-pages/CheckoutPage";
import NotFoundPage from "./storefront-pages/NotFoundPage";
import { products } from "./data";
import type { AppState, CartLine, CartProduct, Product } from "./types";

function normalizePath(pathname: string): string {
  const path = pathname.replace(/\/+$/, "") || "/";
  return path.toLowerCase();
}

function categoryFromPath(path: string): string | undefined {
  const map: Record<string, string> = {
    "/gold-jewellery": "Gold",
    "/diamond-jewellery": "Diamond",
    "/bridal-collection": "Bridal Jewellery",
    "/rings": "Rings",
    "/necklaces": "Necklaces",
    "/chains": "Chains",
    "/bracelets": "Bracelets",
    "/bangles": "Bangles",
    "/earrings": "Earrings",
    "/pendants": "Pendants",
    "/mangalsutra": "Mangalsutra",
    "/new-arrivals": "New Arrival",
    "/best-sellers": "Best Seller",
    "/offers": "Offers",
  };
  return map[path];
}

export default function App() {
  const [wishlist, setWishlist] = useState<string[]>(() => readStored("vedant-wishlist", []));
  const [cart, setCart] = useState<CartLine[]>(() => readStored("vedant-cart", []));
  const [recentlyViewed, setRecentlyViewed] = useState<string[]>(() => readStored("vedant-recent", []));
  const [searchTerm, setSearchTerm] = useState<string>(() => getInitialSearch());
  const path = normalizePath(usePathname() || "/");

  useEffect(() => storeValue("vedant-wishlist", wishlist), [wishlist]);
  useEffect(() => storeValue("vedant-cart", cart), [cart]);
  useEffect(() => storeValue("vedant-recent", recentlyViewed), [recentlyViewed]);

  const wishlistProducts = useMemo<Product[]>(
    () => products.filter((product) => wishlist.includes(product.id)),
    [wishlist],
  );

  const cartProducts = useMemo<CartProduct[]>(
    () =>
      cart
        .map((item) => {
          const product = products.find((candidate) => candidate.id === item.id);
          return product ? { ...product, quantity: item.quantity } : null;
        })
        .filter((item): item is CartProduct => item !== null),
    [cart],
  );

  const appState: AppState = {
    wishlist,
    cart,
    cartProducts,
    wishlistProducts,
    recentlyViewed,
    searchTerm,
    setSearchTerm,
    addToCart(product) {
      setCart((items) => {
        const existing = items.find((item) => item.id === product.id);
        if (existing) {
          return items.map((item) => (item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item));
        }
        return [...items, { id: product.id, quantity: 1 }];
      });
    },
    updateCart(id, quantity) {
      setCart((items) =>
        quantity <= 0 ? items.filter((item) => item.id !== id) : items.map((item) => (item.id === id ? { ...item, quantity } : item)),
      );
    },
    toggleWishlist(product) {
      setWishlist((items) => (items.includes(product.id) ? items.filter((id) => id !== product.id) : [...items, product.id]));
    },
    addRecentlyViewed(product) {
      setRecentlyViewed((items) => [product.id, ...items.filter((id) => id !== product.id)].slice(0, 6));
    },
  };

  if (path === "/") return <HomePage appState={appState} />;
  if (path === "/shop" || path === "/portfolio") return <ShopPage appState={appState} />;
  const filterFromCategoryPath = categoryFromPath(path);
  if (filterFromCategoryPath) return <ShopPage appState={appState} initialFilter={filterFromCategoryPath} />;
  if (path === "/wishlist")
    return <ShopPage appState={appState} title="Wishlist" customProducts={wishlistProducts} emptyMessage="Your wishlist is empty." />;
  if (path === "/cart") return <CartPage appState={appState} />;
  if (path === "/checkout") return <CheckoutPage appState={appState} />;
  if (path === "/account") return <SimplePage appState={appState} type="account" />;
  if (path === "/order-tracking") return <SimplePage appState={appState} type="tracking" />;
  if (path === "/store-locator") return <SimplePage appState={appState} type="store" />;
  if (path === "/book-appointment") return <SimplePage appState={appState} type="appointment" />;
  if (path === "/about") return <SimplePage appState={appState} type="about" />;
  if (path === "/blog" || path === "/journal") return <SimplePage appState={appState} type="blog" />;
  if (path === "/contact") return <SimplePage appState={appState} type="contact" />;
  if (path === "/faq") return <SimplePage appState={appState} type="faq" />;
  if (path === "/privacy-policy") return <SimplePage appState={appState} type="privacy" />;
  if (path === "/terms") return <SimplePage appState={appState} type="terms" />;
  if (path === "/return-policy") return <SimplePage appState={appState} type="returns" />;
  if (path.startsWith("/product/") || path.startsWith("/project/")) {
    const slug = path.split("/").pop() ?? "";
    const product = products.find((item) => item.slug === slug);
    // Phase 2 fix (see Phases.md): an unknown slug now renders NotFoundPage
    // instead of silently falling back to the first product in the catalogue.
    return product ? <ProductPage product={product} appState={appState} /> : <NotFoundPage appState={appState} />;
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
