import type { ReactNode } from "react";
import Header from "./Header";
import Footer from "./Footer";
import FloatingContactButtons from "./FloatingContactButtons";
import type { AppState } from "../types";

interface SiteLayoutProps {
  children: ReactNode;
  appState?: AppState;
  footer?: boolean;
}

export default function SiteLayout({ children, appState, footer = true }: SiteLayoutProps) {
  return (
    <div id="top" className="flex min-h-screen flex-col bg-paper">
      {/* WCAG 2.4.1 Bypass Blocks: keyboard and screen-reader users otherwise
          tab through the entire header nav on every page before reaching
          content. Visible only when focused. */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-xs focus:bg-ink focus:px-4 focus:py-3 focus:text-sm focus:font-semibold focus:text-white"
      >
        Skip to main content
      </a>
      <Header appState={appState} />
      <main id="main" tabIndex={-1} className="flex-1">{children}</main>
      {footer && <Footer />}
      {/* The storefront's only conversion path is a WhatsApp enquiry, and this
          widget was fully built but rendered nowhere — dead code on every page
          since before the current branch. */}
      <FloatingContactButtons />
    </div>
  );
}
