import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEFAULT_FX_API_URL,
  DEFAULT_IMPORT_DUTY_PERCENT,
  DEFAULT_METALS_API_URL,
  DEFAULT_SILVER_PREMIUM_PERCENT,
  FX_CACHE_SECONDS,
  GRAMS_PER_TOLA,
  GRAMS_PER_TROY_OUNCE,
  SPOT_CACHE_SECONDS_DEFAULT,
  applyRegionalAdjustment,
  buildRates,
  composeMarketRates,
  directionOf,
  fetchFxQuote,
  fetchSpotQuote,
  istDayKey,
  parseFxResponse,
  parseSpotResponse,
  percentChange,
  resolveMarketRatesConfig,
  toInrPerGram,
  toUnitPrices,
  type FetchLike,
  type MetalRatesConfig,
} from "../src/lib/metal-market-rates.ts";

function config(overrides: Partial<MetalRatesConfig> = {}): MetalRatesConfig {
  return {
    mode: "live",
    metalsApiUrl: DEFAULT_METALS_API_URL,
    fxApiUrl: DEFAULT_FX_API_URL,
    cacheSeconds: SPOT_CACHE_SECONDS_DEFAULT,
    importDutyPercent: DEFAULT_IMPORT_DUTY_PERCENT,
    gstPercent: 0,
    goldPremiumPercent: 0,
    silverPremiumPercent: DEFAULT_SILVER_PREMIUM_PERCENT,
    regionLabel: "Jhunjhunu, Rajasthan",
    ...overrides,
  };
}

/** Minimal Response stand-in; only `ok`, `status` and `json` are consumed. */
function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return { ok, status, json: async () => body } as unknown as Response;
}

/** Routes upstream calls by URL, mirroring the real endpoints. */
function upstream(
  options: { gold?: number; silver?: number; inr?: number; failOn?: "spot" | "fx" } = {},
): { fetchImpl: FetchLike; calls: () => string[] } {
  const { gold = 4069.7, silver = 58.59, inr = 100, failOn } = options;
  const calls: string[] = [];
  const fetchImpl: FetchLike = async (url) => {
    calls.push(url);
    if (url.includes("/XAU")) {
      if (failOn === "spot") return jsonResponse({ error: "down" }, false, 503);
      return jsonResponse({ symbol: "XAU", price: gold, currency: "USD", updatedAt: "2026-07-30T03:05:21Z" });
    }
    if (url.includes("/XAG")) {
      return jsonResponse({ symbol: "XAG", price: silver, currency: "USD", updatedAt: "2026-07-29T18:12:26Z" });
    }
    if (failOn === "fx") return jsonResponse({ error: "down" }, false, 500);
    return jsonResponse({ result: "success", rates: { INR: inr }, time_last_update_unix: 1785283351 });
  };
  return { fetchImpl, calls: () => calls };
}

describe("resolveMarketRatesConfig", () => {
  it("defaults to live in every environment because both providers are keyless", () => {
    for (const nodeEnv of ["development", "test", "production"]) {
      const result = resolveMarketRatesConfig({ NODE_ENV: nodeEnv });
      assert.equal(result.ok, true, `${nodeEnv} should resolve`);
      assert.equal(result.ok && result.config.mode, "live", `${nodeEnv} should be live`);
    }
  });

  it("needs no API key to run live", () => {
    const result = resolveMarketRatesConfig({ NODE_ENV: "production" });
    assert.equal(result.ok, true);
    assert.equal(result.ok && result.config.metalsApiUrl, DEFAULT_METALS_API_URL);
    assert.equal(result.ok && result.config.fxApiUrl, DEFAULT_FX_API_URL);
  });

  it("labels the derived figure for the showroom's own city by default", () => {
    const result = resolveMarketRatesConfig({});
    assert.equal(result.ok && result.config.regionLabel, "Jhunjhunu, Rajasthan");
  });

  it("lets the region label be overridden", () => {
    const result = resolveMarketRatesConfig({ METAL_RATES_REGION_LABEL: "Jaipur" });
    assert.equal(result.ok && result.config.regionLabel, "Jaipur");
  });

  it("honours an explicit mock mode", () => {
    const result = resolveMarketRatesConfig({ NODE_ENV: "production", METAL_MARKET_RATES_MODE: "mock" });
    assert.equal(result.ok && result.config.mode, "mock");
  });

  it("rejects an unknown mode instead of silently falling back", () => {
    const result = resolveMarketRatesConfig({ METAL_MARKET_RATES_MODE: "sandbox" });
    assert.equal(result.ok, false);
    assert.equal(!result.ok && result.reason, "invalid_config");
  });

  it("reports disabled when the feature is switched off", () => {
    const result = resolveMarketRatesConfig({ METAL_MARKET_RATES_MODE: "off" });
    assert.equal(!result.ok && result.reason, "disabled");
  });

  it("clamps the spot cache TTL into the 5-15 minute band", () => {
    const tooShort = resolveMarketRatesConfig({ METAL_MARKET_RATES_CACHE_SECONDS: "5" });
    const tooLong = resolveMarketRatesConfig({ METAL_MARKET_RATES_CACHE_SECONDS: "99999" });
    assert.equal(tooShort.ok && tooShort.config.cacheSeconds, 300);
    assert.equal(tooLong.ok && tooLong.config.cacheSeconds, 900);
  });

  it("caches FX far longer than spot, because it only publishes daily", () => {
    assert.ok(FX_CACHE_SECONDS > SPOT_CACHE_SECONDS_DEFAULT * 10, "FX TTL should dwarf the spot TTL");
  });

  it("rejects out-of-range adjustment percentages", () => {
    const negative = resolveMarketRatesConfig({ METAL_RATES_GST_PERCENT: "-3" });
    const absurd = resolveMarketRatesConfig({ METAL_RATES_IMPORT_DUTY_PERCENT: "400" });
    const garbage = resolveMarketRatesConfig({ METAL_RATES_SILVER_PREMIUM_PERCENT: "abc" });
    assert.equal(!negative.ok && negative.reason, "invalid_config");
    assert.equal(!absurd.ok && absurd.reason, "invalid_config");
    assert.equal(!garbage.ok && garbage.reason, "invalid_config");
  });

  it("strips a trailing slash from a custom metals URL", () => {
    const result = resolveMarketRatesConfig({ METALS_API_URL: "https://example.test/price/" });
    assert.equal(result.ok && result.config.metalsApiUrl, "https://example.test/price");
  });
});

describe("istDayKey", () => {
  it("rolls over at Indian midnight, not the server's", () => {
    // 2026-07-30T19:00:00Z is 2026-07-31 00:30 IST — already the next IST day.
    assert.equal(istDayKey(new Date("2026-07-30T19:00:00Z")), "2026-07-31");
    // 2026-07-30T18:00:00Z is 2026-07-30 23:30 IST — still the same IST day.
    assert.equal(istDayKey(new Date("2026-07-30T18:00:00Z")), "2026-07-30");
  });
});

describe("unit conversion and adjustment maths", () => {
  it("derives 10 g and tola from the per-gram price", () => {
    const units = toUnitPrices(100);
    assert.equal(units.per10Gram, 1000);
    assert.equal(units.perTola, Math.round(100 * GRAMS_PER_TOLA * 100) / 100);
  });

  it("converts USD per troy ounce to INR per gram", () => {
    assert.equal(Math.round(toInrPerGram(GRAMS_PER_TROY_OUNCE, 100) * 100) / 100, 100);
  });

  it("compounds duty, GST and premium in levy order", () => {
    const value = applyRegionalAdjustment(1000, { importDutyPercent: 10, gstPercent: 3 }, 1);
    // 1000 * 1.10 * 1.03 * 1.01
    assert.equal(Math.round(value * 100) / 100, 1144.33);
  });

  it("returns spot unchanged when every adjustment is zero", () => {
    assert.equal(applyRegionalAdjustment(5000, { importDutyPercent: 0, gstPercent: 0 }, 0), 5000);
  });

  it("computes percent change and direction", () => {
    assert.equal(percentChange(110, 100), 10);
    assert.equal(percentChange(90, 100), -10);
    assert.equal(directionOf(percentChange(110, 100)), "up");
    assert.equal(directionOf(percentChange(90, 100)), "down");
    assert.equal(directionOf(percentChange(100, 100)), "flat");
  });

  it("treats a missing or nonsensical baseline as unknown, not zero", () => {
    assert.equal(percentChange(100, null), null);
    assert.equal(percentChange(100, 0), null);
    assert.equal(directionOf(null), "unknown");
  });
});

describe("provider response parsing", () => {
  it("reads the gold-api.com spot shape", () => {
    const quote = parseSpotResponse({ symbol: "XAU", price: 4069.7, currency: "USD", updatedAt: "2026-07-30T03:05:21Z" });
    assert.equal(quote?.usdPerOunce, 4069.7);
    assert.equal(quote?.updatedAt, "2026-07-30T03:05:21Z");
  });

  it("rejects a spot response with no usable price", () => {
    assert.equal(parseSpotResponse({ price: 0 }), null);
    assert.equal(parseSpotResponse({ error: "rate limited" }), null);
    assert.equal(parseSpotResponse(null), null);
    assert.equal(parseSpotResponse("XAU"), null);
  });

  it("reads the open.er-api.com FX shape", () => {
    const fx = parseFxResponse({ result: "success", rates: { USD: 1, INR: 95.858965 }, time_last_update_unix: 1785283351 });
    assert.equal(fx?.usdInr, 95.858965);
    assert.equal(fx?.updatedAt, new Date(1785283351 * 1000).toISOString());
  });

  it("rejects an FX response missing INR", () => {
    assert.equal(parseFxResponse({ result: "success", rates: { EUR: 0.87 } }), null);
    assert.equal(parseFxResponse({ result: "error" }), null);
    assert.equal(parseFxResponse(null), null);
  });
});

describe("fetchSpotQuote / fetchFxQuote", () => {
  it("hits the symbol-specific endpoint", async () => {
    const stub = upstream();
    await fetchSpotQuote("XAG", config(), stub.fetchImpl);
    assert.deepEqual(stub.calls(), [`${DEFAULT_METALS_API_URL}/XAG`]);
  });

  it("throws a labelled error on a non-OK status so the caller can log it safely", async () => {
    const stub = upstream({ failOn: "spot" });
    await assert.rejects(() => fetchSpotQuote("XAU", config(), stub.fetchImpl), /spot_status_503/);
  });

  it("throws when the payload shape is unrecognised", async () => {
    const bad: FetchLike = async () => jsonResponse({ nope: true });
    await assert.rejects(() => fetchSpotQuote("XAU", config(), bad), /spot_shape_unrecognised/);
    await assert.rejects(() => fetchFxQuote(config(), bad), /fx_shape_unrecognised/);
  });

  it("serves offline data in mock mode without touching the network", async () => {
    const neverCall: FetchLike = async () => {
      throw new Error("mock mode must not call the provider");
    };
    const quote = await fetchSpotQuote("XAU", config({ mode: "mock" }), neverCall);
    assert.equal(quote.usdPerOunce, 4069.7);
    const fx = await fetchFxQuote(config({ mode: "mock" }), neverCall);
    assert.ok(fx.usdInr > 0);
  });
});

describe("buildRates", () => {
  it("emits 24K, 22K, 18K gold and 999 silver", () => {
    const rates = buildRates(10000, 100, null, config());
    assert.deepEqual(rates.map((rate) => rate.id), ["gold_24k", "gold_22k", "gold_18k", "silver_999"]);
    assert.equal(rates[0].label, "Gold Rate (24K)");
    assert.equal(rates[3].label, "Silver Rate (999 fine)");
  });

  it("scales gold spot by karat fineness", () => {
    const rates = buildRates(10000, 100, null, config());
    // Exact karat ratios, matching how Indian publishers derive them.
    assert.equal(rates[1].spot.perGram, 9166.67); // 22K = 22/24
    assert.equal(rates[2].spot.perGram, 7500); // 18K = 18/24
  });

  it("reports unknown movement when there is no baseline", () => {
    const rates = buildRates(10000, 100, null, config());
    assert.equal(rates[0].changePercent, null);
    assert.equal(rates[0].direction, "unknown");
  });

  it("compares against today's opening baseline", () => {
    const baseline = { gold: 9900, silver: 100, capturedAt: "2026-07-30T03:30:00.000Z" };
    const rates = buildRates(10000, 99, baseline, config());
    assert.equal(rates[0].direction, "up");
    assert.equal(rates[1].direction, "up", "every gold purity shares the metal's movement");
    assert.equal(rates[3].direction, "down");
  });

  it("keeps the regional figure above spot once a premium is set", () => {
    const rates = buildRates(10000, 100, null, config({ goldPremiumPercent: 2 }));
    assert.ok(rates[0].regional.perGram > rates[0].spot.perGram);
  });
});

describe("composeMarketRates", () => {
  const parts = {
    gold: { usdPerOunce: 4069.7, updatedAt: "2026-07-30T03:05:21Z" },
    silver: { usdPerOunce: 58.59, updatedAt: "2026-07-29T18:12:26Z" },
    fx: { usdInr: 100, updatedAt: "2026-07-29T00:02:31.000Z" },
    config: config(),
    nowMs: Date.parse("2026-07-30T09:00:00.000Z"),
  };

  it("converts through FX and surfaces the rate it used", () => {
    const payload = composeMarketRates({ ...parts, baseline: null });
    const expected = Math.round(((4069.7 / GRAMS_PER_TROY_OUNCE) * 100) * 100) / 100;
    assert.equal(payload.rates[0].spot.perGram, expected);
    assert.equal(payload.usdInr, 100);
    assert.equal(payload.stale, false);
    assert.equal(payload.baselineAt, null);
  });

  it("prefers the provider quote time over the fetch time", () => {
    const payload = composeMarketRates({ ...parts, baseline: null });
    assert.equal(payload.quotedAt, "2026-07-30T03:05:21Z");
  });

  it("falls back to the fetch time when the provider omits a timestamp", () => {
    const payload = composeMarketRates({
      ...parts,
      gold: { usdPerOunce: 4069.7, updatedAt: null },
      baseline: null,
    });
    assert.equal(payload.quotedAt, new Date(parts.nowMs).toISOString());
  });

  it("reports when the baseline was captured", () => {
    const baseline = { gold: 12000, silver: 180, capturedAt: "2026-07-30T03:30:00.000Z" };
    const payload = composeMarketRates({ ...parts, baseline });
    assert.equal(payload.baselineAt, "2026-07-30T03:30:00.000Z");
    assert.notEqual(payload.rates[0].changePercent, null);
  });
});

/**
 * Accuracy regression guard.
 *
 * Locks the derivation against rates published by Indian sources on
 * 30 July 2026, using the international spot and USD/INR of that day. If
 * someone changes the duty default, the karat ratios, the levy order, or
 * reintroduces a silver fineness multiplier, these fail loudly instead of
 * quietly putting the dashboard several percent away from every broker an
 * admin would compare against.
 *
 * Published that day (GoodReturns / goldpriceindia, ex-GST):
 *   gold 24K  ₹14,433/g      gold 22K  ₹13,230/g      silver 999  ₹212/g
 */
describe("accuracy against published Indian rates (30 Jul 2026)", () => {
  const XAU_USD_PER_OZ = 4069.7;
  const XAG_USD_PER_OZ = 58.594;
  const USD_INR = 95.86;

  const PUBLISHED = { gold24k: 14_433, gold22k: 13_230, silver999: 212 };
  /** Tolerance. The user's stated bar is 80-90%; this holds to within 3%. */
  const TOLERANCE = 0.03;

  function within(actual: number, expected: number, label: string) {
    const drift = Math.abs(actual - expected) / expected;
    assert.ok(
      drift <= TOLERANCE,
      `${label}: derived ₹${actual.toFixed(0)}/g vs published ₹${expected}/g — ${(drift * 100).toFixed(2)}% off, over the ${(TOLERANCE * 100).toFixed(0)}% bar`,
    );
  }

  const rates = buildRates(
    toInrPerGram(XAU_USD_PER_OZ, USD_INR),
    toInrPerGram(XAG_USD_PER_OZ, USD_INR),
    null,
    config(),
  );
  const byId = Object.fromEntries(rates.map((rate) => [rate.id, rate]));

  it("matches published 24K gold", () => {
    within(byId.gold_24k.regional.perGram, PUBLISHED.gold24k, "gold 24K");
  });

  it("matches published 22K gold", () => {
    within(byId.gold_22k.regional.perGram, PUBLISHED.gold22k, "gold 22K");
  });

  it("matches published 999 silver", () => {
    within(byId.silver_999.regional.perGram, PUBLISHED.silver999, "silver 999");
  });

  it("reproduces the published 22K/24K ratio exactly", () => {
    const derived = byId.gold_22k.regional.perGram / byId.gold_24k.regional.perGram;
    assert.equal(Math.round(derived * 100000) / 100000, Math.round((22 / 24) * 100000) / 100000);
  });

  it("would drift far out of tolerance on the pre-May-2026 6% duty", () => {
    // Guards the specific regression that shipped: a stale duty default read
    // roughly 5% low against every Indian source.
    const stale = buildRates(
      toInrPerGram(XAU_USD_PER_OZ, USD_INR),
      toInrPerGram(XAG_USD_PER_OZ, USD_INR),
      null,
      config({ importDutyPercent: 6 }),
    );
    const drift = Math.abs(stale[0].regional.perGram - PUBLISHED.gold24k) / PUBLISHED.gold24k;
    assert.ok(drift > TOLERANCE, "the old 6% duty should be detectably wrong");
  });
});
