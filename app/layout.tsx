import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PS Jewellers",
  description: "Luxury gold, diamond and bridal jewellery ecommerce experience for Bikaner, Rajasthan.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
