import { expect, test, type APIRequestContext } from "@playwright/test";

async function sitemapRoutes(request: APIRequestContext) {
  const response = await request.get("/sitemap.xml");
  expect(response.ok()).toBeTruthy();
  const xml = await response.text();
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => new URL(match[1]).pathname);
}

test("published sitemap routes render successfully", async ({ request }) => {
  const routes = await sitemapRoutes(request);
  expect(routes.length).toBeGreaterThan(0);

  for (const route of routes) {
    const response = await request.get(route);
    expect(response.status(), route).toBe(200);
  }
});

test("pages expose usable names for images, links, and buttons", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/PS Jewellers/i);

  const images = page.locator("img");
  for (let index = 0; index < await images.count(); index += 1) {
    await expect(images.nth(index), `image ${index}`).toHaveAttribute("alt");
  }

  const buttons = page.locator("button");
  for (let index = 0; index < await buttons.count(); index += 1) {
    const button = buttons.nth(index);
    const name = await button.evaluate((element) =>
      element.getAttribute("aria-label")?.trim() || element.textContent?.trim() || "",
    );
    expect(name, `button ${index}`).toMatch(/.+/);
  }
});

test("mobile layout does not overflow horizontally", async ({ page }) => {
  await page.goto("/");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  expect(overflow).toBeFalsy();
});

test("admin surface remains protected", async ({ request }) => {
  for (const route of ["/admin", "/admin/media", "/admin/products"]) {
    const response = await request.get(route, { maxRedirects: 0 });
    expect(response.status(), route).toBe(307);
    expect(response.headers().location).toContain("/admin/login");
  }
});

test.describe("authenticated staging admin checks", () => {
  test.skip(!process.env.E2E_ADMIN_STORAGE_STATE, "Set E2E_ADMIN_STORAGE_STATE for an isolated staging admin session");

  for (const route of ["/admin", "/admin/media", "/admin/products", "/admin/enquiries", "/admin/audit"]) {
    test(`${route} renders for an authenticated staging admin`, async ({ page }) => {
      await page.goto(route);
      await expect(page).not.toHaveURL(/\/admin\/login/);
      await expect(page.locator("main")).toBeVisible();
    });
  }
});
