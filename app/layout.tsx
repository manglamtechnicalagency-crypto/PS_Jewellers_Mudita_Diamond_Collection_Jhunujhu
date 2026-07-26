import type { Metadata, Viewport } from "next";
import { SITE_DESCRIPTION, SITE_NAME, siteUrl } from "@/src/lib/seo";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: `${SITE_NAME} — Luxury Gold, Diamond & Bridal Jewellery`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  referrer: "strict-origin-when-cross-origin",
  formatDetection: { telephone: true, address: true },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "en_IN",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-IN">
      <body>{children}</body>
    </html>
  );
}
