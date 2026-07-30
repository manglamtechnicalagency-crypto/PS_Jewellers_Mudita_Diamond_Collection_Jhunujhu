import { NextResponse } from "next/server";
import { requireAdmin } from "@/src/lib/admin-auth";
import { getMarketRates } from "@/src/lib/metal-market-rates-server";
import type { MarketRatesFailureReason } from "@/src/lib/metal-market-rates";

/**
 * Read-only live market reference rates for the admin dashboard.
 *
 * GET only. This endpoint never mutates anything — in particular it does not
 * touch the `metal_rates` table that drives product pricing. That table stays
 * manual (PATCH /api/admin/metal-rates). Keeping the two apart means a bad
 * provider response can never reprice the catalogue.
 *
 * The dashboard server-renders its first reading directly via getMarketRates,
 * so this route exists for the widget's Refresh button and for scripted checks.
 *
 * Every admin role may read it; the numbers are reference data, not a control.
 */

export const dynamic = "force-dynamic";

// Upstream responses are cached in the Next.js Data Cache. The HTTP response is
// no-store so a shared proxy never serves one admin's snapshot to another after
// it has gone stale.
const NO_STORE = { "Cache-Control": "no-store" } as const;

const STATUS_BY_REASON: Record<MarketRatesFailureReason, number> = {
  disabled: 503,
  invalid_config: 503,
  provider_unavailable: 502,
};

export async function GET() {
  const auth = await requireAdmin();
  if (auth.error === "not_configured") {
    return NextResponse.json(
      { error: { code: "not_configured", message: "Admin storage is not configured" } },
      { status: 503, headers: NO_STORE },
    );
  }
  if (auth.error !== null) {
    return NextResponse.json(
      { error: { code: "unauthorized", message: "Authentication is required" } },
      { status: auth.error === "forbidden" ? 403 : 401, headers: NO_STORE },
    );
  }

  const result = await getMarketRates();
  if (!result.ok) {
    // `message` is written for an admin to read and contains no credentials,
    // no URLs, and no raw provider error text.
    return NextResponse.json(
      { error: { code: result.reason, message: result.message } },
      { status: STATUS_BY_REASON[result.reason], headers: NO_STORE },
    );
  }

  return NextResponse.json({ data: result.payload, cached: result.cached }, { headers: NO_STORE });
}
