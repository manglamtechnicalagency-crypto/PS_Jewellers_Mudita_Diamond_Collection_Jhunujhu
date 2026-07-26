import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { assets, blogPosts, collections, products } from "../src/data.ts";

/**
 * Guards against dead local asset paths.
 *
 * `src/data.ts` refers to files under `public/` by URL path. Nothing in the type
 * system connects the two, so renaming a file in `public/assets` leaves a string
 * that type-checks, builds, and renders as a broken image at runtime. This is
 * exactly how `/assets/vedant-hero.jpg` survived a rename and shipped broken.
 */
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function localPathsOf(value: unknown, sink: Set<string>): void {
  if (typeof value === "string") {
    if (value.startsWith("/") && !value.startsWith("//")) sink.add(value);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => localPathsOf(item, sink));
    return;
  }
  if (value && typeof value === "object") {
    Object.values(value as Record<string, unknown>).forEach((item) => localPathsOf(item, sink));
  }
}

function resolvePublic(urlPath: string): string {
  return path.join(projectRoot, "public", decodeURIComponent(urlPath));
}

describe("local asset references", () => {
  it("resolves every product image and video to a file in public/", () => {
    const missing: string[] = [];

    for (const product of products) {
      const refs = new Set<string>();
      localPathsOf(product.image, refs);
      localPathsOf(product.images, refs);
      if (product.video) localPathsOf(product.video, refs);

      for (const ref of refs) {
        if (!existsSync(resolvePublic(ref))) missing.push(`${product.slug} -> ${ref}`);
      }
    }

    assert.deepEqual(missing, [], `missing product assets:\n${missing.join("\n")}`);
  });

  it("resolves shared assets, collection and blog imagery", () => {
    const refs = new Set<string>();
    localPathsOf(assets, refs);
    localPathsOf(collections, refs);
    localPathsOf(blogPosts, refs);

    const missing = [...refs].filter((ref) => !existsSync(resolvePublic(ref)));
    assert.deepEqual(missing, [], `missing shared assets:\n${missing.join("\n")}`);
  });

  it("uses no remote host outside the configured next/image allowlist", () => {
    // next.config.ts permits images.unsplash.com plus the optional R2 origin.
    // Anything else renders as a 400 from the image optimizer.
    const allowed = ["images.unsplash.com"];
    if (process.env.NEXT_PUBLIC_R2_PUBLIC_URL) {
      allowed.push(new URL(process.env.NEXT_PUBLIC_R2_PUBLIC_URL).hostname);
    }

    const offenders: string[] = [];
    for (const product of products) {
      for (const src of [product.image, ...product.images]) {
        if (!src.startsWith("http")) continue;
        const { hostname } = new URL(src);
        if (!allowed.includes(hostname)) offenders.push(`${product.slug} -> ${hostname}`);
      }
    }

    assert.deepEqual(offenders, [], `hosts missing from next.config remotePatterns:\n${offenders.join("\n")}`);
  });
});
