import type { NextConfig } from "next";
import { buildContentSecurityPolicy, STATIC_SECURITY_HEADERS } from "./src/lib/security-headers";

const remotePatterns: NonNullable<NextConfig["images"]>["remotePatterns"] = [
  { protocol: "https", hostname: "images.unsplash.com" },
  // Cloudflare R2 public development buckets use pub-<id>.r2.dev hosts.
  { protocol: "https", hostname: "*.r2.dev" },
];

// Allow optimised images from the R2 public bucket when it is configured.
try {
  if (process.env.NEXT_PUBLIC_R2_PUBLIC_URL) {
    const { hostname } = new URL(process.env.NEXT_PUBLIC_R2_PUBLIC_URL);
    remotePatterns.push({ protocol: "https", hostname });
  }
} catch {
  // Malformed URL: fall through with Unsplash only rather than failing the build.
}

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  turbopack: {
    root: process.cwd(),
  },
  images: {
    remotePatterns,
    formats: ["image/avif", "image/webp"],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Nonce-less fallback. `proxy.ts` overrides this per request with a
          // nonce-based policy; this exists so responses that skip the proxy
          // still carry a policy.
          {
            key: "Content-Security-Policy",
            value: buildContentSecurityPolicy({ isDevelopment: process.env.NODE_ENV === "development" }),
          },
          ...STATIC_SECURITY_HEADERS,
        ],
      },
    ];
  },
};

export default nextConfig;
