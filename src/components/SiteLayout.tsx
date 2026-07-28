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
      <Header appState={appState} />
      <main className="flex-1">{children}</main>
      {footer && <Footer />}
      <FloatingContactButtons />
    </div>
  );
}
