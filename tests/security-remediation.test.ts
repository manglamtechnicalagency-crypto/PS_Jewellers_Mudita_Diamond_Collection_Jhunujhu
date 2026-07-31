import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const migration = readFileSync(
  new URL("../supabase/migrations/0022_security_and_atomicity.sql", import.meta.url),
  "utf8",
);

describe("security remediation migration", () => {
  it("requires AAL2 inside the database role helpers", () => {
    assert.match(migration, /auth\.jwt\(\).*aal/s);
    assert.match(migration, /create or replace function public\.is_admin_or_editor/s);
    assert.match(migration, /create or replace function public\.is_admin\(/s);
  });

  it("revokes direct anonymous writes and base-table reads", () => {
    assert.match(migration, /revoke insert on public\.enquiries from anon/s);
    assert.match(migration, /revoke insert on public\.product_reviews from anon/s);
    assert.match(migration, /revoke select on public\.products from anon/s);
    assert.match(migration, /revoke select on public\.media from anon/s);
  });

  it("tolerates deployments where optional engagement tables are absent", () => {
    assert.match(migration, /to_regclass\('public\.appointments'\)/);
    assert.match(migration, /to_regclass\('public\.newsletter_subscribers'\)/);
  });

  it("provides transaction-scoped product write RPCs", () => {
    assert.match(migration, /create or replace function public\.save_product_atomic/s);
    assert.match(migration, /create or replace function public\.bulk_update_products_atomic/s);
    assert.match(migration, /create or replace function public\.import_products_atomic/s);
  });
});

describe("API request ceilings", () => {
  it("does not parse unbounded JSON in route handlers", () => {
    const routes = [
      "../app/api/admin/media/route.ts",
      "../app/api/admin/products/route.ts",
      "../app/api/admin/products/[id]/route.ts",
      "../app/api/admin/products/bulk/route.ts",
      "../app/api/admin/products/import/route.ts",
      "../app/api/admin/settings/route.ts",
      "../app/api/admin/taxonomy/route.ts",
      "../app/api/admin/reviews/route.ts",
      "../app/api/admin/pin/route.ts",
      "../app/api/admin/pin/verify/route.ts",
      "../app/api/admin/metal-rates/route.ts",
      "../app/api/admin/media/presign/route.ts",
      "../app/api/admin/products/[id]/media/route.ts",
    ];
    for (const route of routes) {
      const source = readFileSync(new URL(route, import.meta.url), "utf8");
      assert.doesNotMatch(source, /request\.json\(\)/, route);
      assert.match(source, /readJsonWithLimit/, route);
    }
  });
});

describe("browser CI isolation", () => {
  it("defaults to a local built app and never embeds production", () => {
    const config = readFileSync(new URL("../playwright.config.ts", import.meta.url), "utf8");
    assert.doesNotMatch(config, /vercel\.app/);
    assert.match(config, /127\.0\.0\.1/);
    assert.match(config, /webServer/);
  });
});
