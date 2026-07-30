import { unstable_cache } from "next/cache";
import {
  BASELINE_CACHE_SECONDS,
  FX_CACHE_SECONDS,
  composeMarketRates,
  fetchFxQuote,
  fetchSpotQuote,
  istDayKey,
  resolveMarketRatesConfig,
  toInrPerGram,
  type Baseline,
  type FetchLike,
  type FxQuote,
  type MarketRatesPayload,
  type MarketRatesResult,
  type MetalRatesConfig,
  type SpotQuote,
} from "./metal-market-rates";

/**
 * SERVER-ONLY caching layer for the market rates widget.
 *
 * Why this file exists separately from metal-market-rates.ts: the maths and
 * parsing are unit tested with node:test, which has no Next.js request context.
 * `unstable_cache` requires one. Splitting keeps the logic testable and the
 * caching real.
 *
 * WHY unstable_cache AND NOT A MODULE VARIABLE: the previous implementation
 * held the cache in a module-scoped object. On serverless that memory belongs
 * to one instance, so hit rate approached zero in production — nearly every
 * dashboard load made three upstream calls, and the movement baseline reset
 * constantly. The Next.js Data Cache is shared across instances, so the TTLs
 * below are real rather than decorative.
 *
 * Three cache entries, each with a lifetime matched to how fast its upstream
 * actually moves:
 *   spot      ~10 min (configurable, clamped 5-15) — gold/silver move constantly
 *   fx          6 h                                 — publishes roughly daily
 *   baseline   24 h, keyed by IST day               — today's opening reading
 */

const SPOT_TAG = "metal-market-rates:spot";
const FX_TAG = "metal-market-rates:fx";
const BASELINE_TAG = "metal-market-rates:baseline";

/**
 * The real network fetch, narrowed to the injectable shape the pure module
 * expects. Written as an explicit wrapper rather than passing `globalThis.fetch`
 * directly so the assignment is checked rather than relying on parameter
 * variance rules.
 *
 * Note this is NOT a Next.js-patched cached fetch: caching is done explicitly
 * with unstable_cache below, where the TTL per upstream is visible.
 */
const realFetch: FetchLike = (input, init) => globalThis.fetch(input, init);

async function loadSpot(symbol: "XAU" | "XAG", config: MetalRatesConfig): Promise<SpotQuote> {
  // unstable_cache keys on the callback arguments, so mode and URL must be part
  // of the key: flipping to mock must not serve a cached live number.
  const cached = unstable_cache(
    async (sym: "XAU" | "XAG") => fetchSpotQuote(sym, config, realFetch),
    ["metal-spot", symbol, config.mode, config.metalsApiUrl],
    { revalidate: config.cacheSeconds, tags: [SPOT_TAG] },
  );
  return cached(symbol);
}

async function loadFx(config: MetalRatesConfig): Promise<FxQuote> {
  const cached = unstable_cache(
    async () => fetchFxQuote(config, realFetch),
    ["metal-fx", config.mode, config.fxApiUrl],
    { revalidate: FX_CACHE_SECONDS, tags: [FX_TAG] },
  );
  return cached();
}

/**
 * Today's opening reading, in INR per gram, captured once per IST day.
 *
 * The free feed publishes no previous close and has no history endpoint, so a
 * true session close is not obtainable. The first reading of the Indian
 * calendar day is the most stable baseline available, and unlike the old
 * "previous reading in this process" it survives instance churn and gives a
 * percentage that means the same thing all day.
 *
 * Costs one extra pair of upstream calls per day.
 */
async function loadBaseline(config: MetalRatesConfig, dayKey: string): Promise<Baseline> {
  const cached = unstable_cache(
    async (day: string) => {
      const [gold, silver, fx] = await Promise.all([
        fetchSpotQuote("XAU", config, realFetch),
        fetchSpotQuote("XAG", config, realFetch),
        fetchFxQuote(config, realFetch),
      ]);
      return {
        gold: toInrPerGram(gold.usdPerOunce, fx.usdInr),
        silver: toInrPerGram(silver.usdPerOunce, fx.usdInr),
        capturedAt: new Date().toISOString(),
        day,
      } satisfies Baseline & { day: string };
    },
    ["metal-baseline", config.mode, config.metalsApiUrl, dayKey],
    { revalidate: BASELINE_CACHE_SECONDS, tags: [BASELINE_TAG] },
  );
  return cached(dayKey);
}

/**
 * Last successful payload, kept in instance memory purely as a degraded-mode
 * net. It is NOT the primary cache — the Data Cache above is. On a warm
 * instance it turns an upstream outage into a stale banner instead of an error.
 * On a cold instance there is nothing to fall back to and the route returns 502,
 * which is the honest answer.
 */
let lastKnownGood: MarketRatesPayload | null = null;

export async function getMarketRates(): Promise<MarketRatesResult> {
  const configResult = resolveMarketRatesConfig();
  if (!configResult.ok) {
    return { ok: false, reason: configResult.reason, message: configResult.message };
  }
  const config = configResult.config;
  const dayKey = istDayKey();

  try {
    // The baseline resolves from cache on every request after the day's first,
    // so this is one Data Cache read, not an extra round trip.
    const [gold, silver, fx, baseline] = await Promise.all([
      loadSpot("XAU", config),
      loadSpot("XAG", config),
      loadFx(config),
      loadBaseline(config, dayKey).catch(() => null),
    ]);

    const payload = composeMarketRates({ gold, silver, fx, baseline, config, nowMs: Date.now() });
    lastKnownGood = payload;
    return { ok: true, payload, cached: false };
  } catch (error) {
    // Log the label, not the raw message: upstream errors can echo back a URL.
    const errorName = error instanceof Error ? error.message : "unknown_error";
    console.error("[metal-market-rates] provider_fetch_failed", { mode: config.mode, errorName });

    if (lastKnownGood) {
      return {
        ok: true,
        cached: true,
        payload: {
          ...lastKnownGood,
          stale: true,
          staleReason: "The rates provider could not be reached, so the last known rates are shown.",
        },
      };
    }

    return {
      ok: false,
      reason: "provider_unavailable",
      message: "Live market rates are unavailable right now and no recent rates are cached.",
    };
  }
}

/** Test seam for the degraded-mode net. Never call from application code. */
export function __resetLastKnownGood(): void {
  lastKnownGood = null;
}
