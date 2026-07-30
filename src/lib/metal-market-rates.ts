/**
 * Pure market-rate logic: configuration, upstream parsing, conversion maths.
 *
 * FRAMEWORK-FREE ON PURPOSE. No next/*, no React, no module-level cache. Every
 * branch here is unit testable with node:test and `fetch` is always injected.
 * The Next.js caching layer lives in `metal-market-rates-server.ts`; keeping the
 * two apart is what lets the maths be tested without a request context.
 *
 * PROVIDERS — both free and keyless. No account, no credential to leak:
 *   - Metal spot: https://api.gold-api.com/price/{XAU|XAG}  -> USD per troy ounce
 *   - USD -> INR: https://open.er-api.com/v6/latest/USD
 *
 * SCOPE: read-only reference data for the admin dashboard. It never writes to
 * the `metal_rates` table. Selling rates stay manual, entered by an admin in
 * /admin/catalogue, and remain the single source of truth for product pricing.
 * See docs/admin/MARKET_RATES.md.
 */

/** Troy ounce in grams. Both metal feeds quote per troy ounce. */
export const GRAMS_PER_TROY_OUNCE = 31.1034768;

/** Indian tola. 1 tola = 3/8 troy ounce exactly. */
export const GRAMS_PER_TOLA = 11.6638038;

/**
 * Karat purity as a fraction of fine metal.
 *
 * Exact karat ratios (22/24, 18/24), NOT the rounded 0.916 hallmark stamp.
 * Indian rate publishers derive 22K as 24K x 22/24: on 30 Jul 2026 GoodReturns
 * showed 24K ₹14,433/g and 22K ₹13,230/g, a ratio of 0.91667. Using 0.916 put
 * 22K about ₹10/g light for no reason.
 */
export const KARAT_FINENESS = { "24K": 1, "22K": 22 / 24, "18K": 18 / 24 } as const;

/**
 * India's total import duty on gold and silver: 10% BCD + 5% AIDC.
 *
 * VERIFY THIS BEFORE TRUSTING THE WIDGET. It is a policy number that moves at
 * budget time and it dominates the final figure — it was 6% until 13 May 2026,
 * when it was raised to 15%. A stale value here made every rate on the
 * dashboard read about 5% low. See docs/admin/MARKET_RATES.md.
 *
 * Last verified: 30 July 2026.
 */
export const DEFAULT_IMPORT_DUTY_PERCENT = 15;

/**
 * GST is deliberately excluded from the headline figure by default.
 *
 * IBJA, GoodReturns, Tanishq and the broker apps all quote gold and silver
 * ex-GST; the 3% is added at the counter. Including it here would put the
 * dashboard ~3% above every source an admin would compare against.
 */
export const DEFAULT_GST_PERCENT = 0;

/**
 * Observed local basis of Indian 999 silver over international spot.
 *
 * Silver carries a persistently wider physical premium in India than gold does.
 * Calibrated 30 Jul 2026: spot ₹180.6/g x 1.15 duty = ₹207.7 against a
 * published ₹212/g, a 2.1% gap. Gold needed no equivalent adjustment that day
 * (₹14,401 derived vs ₹14,433 published, 0.2%).
 *
 * This is an observation, not a law. Re-calibrate with the procedure in the
 * docs if the widget drifts from your sarafa's board.
 */
export const DEFAULT_SILVER_PREMIUM_PERCENT = 2;

export const DEFAULT_METALS_API_URL = "https://api.gold-api.com/price";
export const DEFAULT_FX_API_URL = "https://open.er-api.com/v6/latest/USD";

/**
 * Cache lifetimes, split by how fast each upstream actually moves.
 *
 * Refreshing FX on the spot cadence bought nothing: open.er-api.com publishes
 * roughly once a day, so a 10-minute TTL spent one upstream call in three to
 * re-read an identical number.
 */
export const SPOT_CACHE_SECONDS_DEFAULT = 600; // 10 min — metal spot is live
export const FX_CACHE_SECONDS = 21_600; // 6 h  — FX publishes ~daily
export const BASELINE_CACHE_SECONDS = 86_400; // 24 h — today's opening reading

export type MetalRatesMode = "live" | "mock" | "off";

export type MetalRatesConfig = {
  mode: MetalRatesMode;
  metalsApiUrl: string;
  fxApiUrl: string;
  cacheSeconds: number;
  /** Customs/import duty applied to landed bullion, percent. */
  importDutyPercent: number;
  /** GST on the duty-inclusive value, percent. Default 0 — sources quote ex-GST. */
  gstPercent: number;
  /** Local basis over spot for gold, percent. */
  goldPremiumPercent: number;
  /** Local basis over spot for silver, percent. Silver's is structurally wider. */
  silverPremiumPercent: number;
  /** Human label for the adjusted column, e.g. "Jhunjhunu". */
  regionLabel: string;
};

export type ConfigResult =
  | { ok: true; config: MetalRatesConfig }
  | { ok: false; reason: "disabled" | "invalid_config"; message: string };

export type UnitPrices = { perGram: number; per10Gram: number; perTola: number };

export type RateEntry = {
  /** Stable key, e.g. "gold_24k". */
  id: string;
  label: string;
  metal: "gold" | "silver";
  purity: string;
  /** International spot converted to INR, before Indian duty/GST/premium. */
  spot: UnitPrices;
  /** Spot plus import duty, GST and the configured regional premium. */
  regional: UnitPrices;
  /**
   * Percent change of spot against today's first reading (IST). The keyless
   * feed publishes no previous close and offers no history endpoint, so the
   * day's opening reading is the most stable baseline obtainable. null before
   * a baseline exists.
   */
  changePercent: number | null;
  direction: "up" | "down" | "flat" | "unknown";
};

/** Per-gram INR readings used as the movement baseline. */
export type Baseline = { gold: number; silver: number; capturedAt: string };

export type MarketRatesPayload = {
  mode: MetalRatesMode;
  regionLabel: string;
  adjustments: {
    importDutyPercent: number;
    gstPercent: number;
    goldPremiumPercent: number;
    silverPremiumPercent: number;
  };
  /** USD -> INR rate used for the conversion. */
  usdInr: number;
  /** When the FX feed last published (ISO), or null when it did not say. */
  fxUpdatedAt: string | null;
  /** Provider quote time for the metal spot (ISO). */
  quotedAt: string;
  /** When this server fetched it (ISO). */
  fetchedAt: string;
  /** When today's comparison baseline was captured (ISO), or null. */
  baselineAt: string | null;
  /** True when an upstream failed and this is the retained last-known-good copy. */
  stale: boolean;
  /** Present only when `stale` is true: why the refresh failed, admin-safe wording. */
  staleReason?: string;
  rates: RateEntry[];
};

const MIN_CACHE_SECONDS = 300; // 5 minutes
const MAX_CACHE_SECONDS = 900; // 15 minutes

function readPercent(raw: string | undefined, fallback: number): number | null {
  if (raw === undefined || raw.trim() === "") return fallback;
  const value = Number(raw);
  // Reject NaN, Infinity, negatives, and absurd values that would silently
  // produce a nonsense rate on the dashboard.
  if (!Number.isFinite(value) || value < 0 || value > 100) return null;
  return value;
}

/**
 * Resolve configuration from the environment.
 *
 * Both providers are keyless, so live is the default in every environment —
 * there is no quota to protect and no reason to show a developer fake numbers.
 * "mock" remains available for offline work and CI, but only when asked for.
 */
export function resolveMarketRatesConfig(env: Record<string, string | undefined> = process.env): ConfigResult {
  const explicitMode = env.METAL_MARKET_RATES_MODE?.trim().toLowerCase();

  let mode: MetalRatesMode;
  if (explicitMode === undefined || explicitMode === "") {
    mode = "live";
  } else if (explicitMode === "live" || explicitMode === "mock" || explicitMode === "off") {
    mode = explicitMode;
  } else {
    return {
      ok: false,
      reason: "invalid_config",
      message: `METAL_MARKET_RATES_MODE must be "live", "mock", or "off" (received "${explicitMode}").`,
    };
  }

  if (mode === "off") {
    return { ok: false, reason: "disabled", message: "Live market rates are turned off for this environment." };
  }

  const importDutyPercent = readPercent(env.METAL_RATES_IMPORT_DUTY_PERCENT, DEFAULT_IMPORT_DUTY_PERCENT);
  const gstPercent = readPercent(env.METAL_RATES_GST_PERCENT, DEFAULT_GST_PERCENT);
  // Legacy single knob still honoured as the fallback for both metals so an
  // existing deployment that set it keeps its calibration after this split.
  const sharedPremium = readPercent(env.METAL_RATES_REGIONAL_PREMIUM_PERCENT, Number.NaN);
  const goldPremiumPercent = readPercent(
    env.METAL_RATES_GOLD_PREMIUM_PERCENT,
    sharedPremium !== null && Number.isFinite(sharedPremium) ? sharedPremium : 0,
  );
  const silverPremiumPercent = readPercent(
    env.METAL_RATES_SILVER_PREMIUM_PERCENT,
    sharedPremium !== null && Number.isFinite(sharedPremium) ? sharedPremium : DEFAULT_SILVER_PREMIUM_PERCENT,
  );
  if (
    importDutyPercent === null ||
    gstPercent === null ||
    sharedPremium === null ||
    goldPremiumPercent === null ||
    silverPremiumPercent === null
  ) {
    return {
      ok: false,
      reason: "invalid_config",
      message:
        "METAL_RATES_IMPORT_DUTY_PERCENT, METAL_RATES_GST_PERCENT, METAL_RATES_GOLD_PREMIUM_PERCENT and METAL_RATES_SILVER_PREMIUM_PERCENT must each be a number between 0 and 100.",
    };
  }

  const rawCache = env.METAL_MARKET_RATES_CACHE_SECONDS?.trim();
  let cacheSeconds = SPOT_CACHE_SECONDS_DEFAULT;
  if (rawCache) {
    const parsed = Number(rawCache);
    if (!Number.isFinite(parsed)) {
      return { ok: false, reason: "invalid_config", message: "METAL_MARKET_RATES_CACHE_SECONDS must be a number." };
    }
    // Clamp rather than reject: the bound exists to be a good citizen against a
    // free public endpoint, and a surprising-but-working dashboard beats a 500.
    cacheSeconds = Math.min(MAX_CACHE_SECONDS, Math.max(MIN_CACHE_SECONDS, Math.round(parsed)));
  }

  return {
    ok: true,
    config: {
      mode,
      metalsApiUrl: (env.METALS_API_URL?.trim() || DEFAULT_METALS_API_URL).replace(/\/+$/, ""),
      fxApiUrl: env.FX_API_URL?.trim() || DEFAULT_FX_API_URL,
      cacheSeconds,
      importDutyPercent,
      gstPercent,
      goldPremiumPercent,
      silverPremiumPercent,
      regionLabel: env.METAL_RATES_REGION_LABEL?.trim() || "Jhunjhunu, Rajasthan",
    },
  };
}

/** Round to paise. Money must never carry float noise into the UI. */
export function roundPaise(value: number): number {
  return Math.round(value * 100) / 100;
}

export function toUnitPrices(perGram: number): UnitPrices {
  return {
    perGram: roundPaise(perGram),
    per10Gram: roundPaise(perGram * 10),
    perTola: roundPaise(perGram * GRAMS_PER_TOLA),
  };
}

/**
 * Apply the Indian landed-cost stack to an international spot price.
 *
 * Order mirrors how the levies actually apply: duty on the landed value, GST on
 * the duty-inclusive value, local basis on top. Validated against published
 * Indian rates for 30 Jul 2026 — see the regression test in
 * tests/metal-market-rates.test.ts, which fails if this drifts.
 *
 * Still a configurable approximation, not an official quote. The UI labels it
 * as derived.
 */
export function applyRegionalAdjustment(
  spotPerGram: number,
  config: Pick<MetalRatesConfig, "importDutyPercent" | "gstPercent">,
  premiumPercent: number,
): number {
  const withDuty = spotPerGram * (1 + config.importDutyPercent / 100);
  const withGst = withDuty * (1 + config.gstPercent / 100);
  return withGst * (1 + premiumPercent / 100);
}

export function percentChange(current: number, previous: number | null | undefined): number | null {
  if (previous === null || previous === undefined) return null;
  if (!Number.isFinite(previous) || previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 10000) / 100;
}

export function directionOf(changePercent: number | null): RateEntry["direction"] {
  if (changePercent === null) return "unknown";
  if (changePercent > 0) return "up";
  if (changePercent < 0) return "down";
  return "flat";
}

/**
 * Calendar day in IST, e.g. "2026-07-30".
 *
 * The showroom trades on Indian hours, so the daily movement baseline must roll
 * over at Indian midnight. Using the server's local day would reset the
 * comparison in the middle of a Jhunjhunu trading session.
 */
export function istDayKey(at: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(at);
}

/** Normalised spot quote, in USD per troy ounce. */
export type SpotQuote = { usdPerOunce: number; updatedAt: string | null };

/**
 * Parse a gold-api.com response.
 * Shape: {"symbol":"XAU","price":4069.699951,"currency":"USD","updatedAt":"..."}
 */
export function parseSpotResponse(raw: unknown): SpotQuote | null {
  if (typeof raw !== "object" || raw === null) return null;
  const body = raw as Record<string, unknown>;
  const price = typeof body.price === "number" ? body.price : null;
  if (price === null || !Number.isFinite(price) || price <= 0) return null;
  return { usdPerOunce: price, updatedAt: typeof body.updatedAt === "string" ? body.updatedAt : null };
}

export type FxQuote = { usdInr: number; updatedAt: string | null };

/**
 * Parse an open.er-api.com response.
 * Shape: {"result":"success","rates":{"INR":95.85,...},"time_last_update_unix":...}
 */
export function parseFxResponse(raw: unknown): FxQuote | null {
  if (typeof raw !== "object" || raw === null) return null;
  const body = raw as Record<string, unknown>;
  const rates = body.rates;
  if (typeof rates !== "object" || rates === null) return null;
  const inr = (rates as Record<string, unknown>).INR;
  if (typeof inr !== "number" || !Number.isFinite(inr) || inr <= 0) return null;
  const unix = body.time_last_update_unix;
  return {
    usdInr: inr,
    updatedAt: typeof unix === "number" && Number.isFinite(unix) ? new Date(unix * 1000).toISOString() : null,
  };
}

/**
 * Deterministic offline data for `mock` mode. Only reachable when an operator
 * sets METAL_MARKET_RATES_MODE=mock; it is never a silent fallback.
 */
export function mockSpot(symbol: "XAU" | "XAG"): SpotQuote {
  return symbol === "XAU" ? { usdPerOunce: 4069.7, updatedAt: null } : { usdPerOunce: 58.59, updatedAt: null };
}

export type FetchLike = (
  input: string,
  init?: { headers?: Record<string, string>; signal?: AbortSignal },
) => Promise<Response>;

/** Never let a hung public endpoint hold an admin request open. */
async function getJson(url: string, fetchImpl: FetchLike, label: string): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetchImpl(url, { headers: { Accept: "application/json" }, signal: controller.signal });
    if (!response.ok) throw new Error(`${label}_status_${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchSpotQuote(
  symbol: "XAU" | "XAG",
  config: MetalRatesConfig,
  fetchImpl: FetchLike,
): Promise<SpotQuote> {
  if (config.mode === "mock") return mockSpot(symbol);
  const parsed = parseSpotResponse(await getJson(`${config.metalsApiUrl}/${symbol}`, fetchImpl, "spot"));
  if (!parsed) throw new Error("spot_shape_unrecognised");
  return parsed;
}

export async function fetchFxQuote(config: MetalRatesConfig, fetchImpl: FetchLike): Promise<FxQuote> {
  if (config.mode === "mock") return { usdInr: 95.86, updatedAt: null };
  const parsed = parseFxResponse(await getJson(config.fxApiUrl, fetchImpl, "fx"));
  if (!parsed) throw new Error("fx_shape_unrecognised");
  return parsed;
}

/** USD per troy ounce -> INR per gram. */
export function toInrPerGram(usdPerOunce: number, usdInr: number): number {
  return (usdPerOunce / GRAMS_PER_TROY_OUNCE) * usdInr;
}

export function buildRates(
  goldPerGramInr: number,
  silverPerGramInr: number,
  baseline: Baseline | null,
  config: MetalRatesConfig,
): RateEntry[] {
  const goldChange = percentChange(goldPerGramInr, baseline?.gold ?? null);
  const silverChange = percentChange(silverPerGramInr, baseline?.silver ?? null);

  const entries: RateEntry[] = [];

  for (const karat of ["24K", "22K", "18K"] as const) {
    const spotPerGram = goldPerGramInr * KARAT_FINENESS[karat];
    entries.push({
      id: `gold_${karat.toLowerCase()}`,
      label: `Gold Rate (${karat})`,
      metal: "gold",
      purity: karat,
      spot: toUnitPrices(spotPerGram),
      regional: toUnitPrices(applyRegionalAdjustment(spotPerGram, config, config.goldPremiumPercent)),
      changePercent: goldChange,
      direction: directionOf(goldChange),
    });
  }

  // No fineness multiplier: the XAG quote already IS 999+ fine silver. The
  // earlier x0.999 was double-counting purity and shaved 0.1% off every figure.
  entries.push({
    id: "silver_999",
    label: "Silver Rate (999 fine)",
    metal: "silver",
    purity: "999",
    spot: toUnitPrices(silverPerGramInr),
    regional: toUnitPrices(applyRegionalAdjustment(silverPerGramInr, config, config.silverPremiumPercent)),
    changePercent: silverChange,
    direction: directionOf(silverChange),
  });

  return entries;
}

/** Assemble the payload from already-fetched parts. Pure. */
export function composeMarketRates(input: {
  gold: SpotQuote;
  silver: SpotQuote;
  fx: FxQuote;
  baseline: Baseline | null;
  config: MetalRatesConfig;
  nowMs: number;
}): MarketRatesPayload {
  const { gold, silver, fx, baseline, config, nowMs } = input;
  const goldPerGramInr = toInrPerGram(gold.usdPerOunce, fx.usdInr);
  const silverPerGramInr = toInrPerGram(silver.usdPerOunce, fx.usdInr);
  const fetchedAt = new Date(nowMs).toISOString();

  return {
    mode: config.mode,
    regionLabel: config.regionLabel,
    adjustments: {
      importDutyPercent: config.importDutyPercent,
      gstPercent: config.gstPercent,
      goldPremiumPercent: config.goldPremiumPercent,
      silverPremiumPercent: config.silverPremiumPercent,
    },
    usdInr: fx.usdInr,
    fxUpdatedAt: fx.updatedAt,
    quotedAt: gold.updatedAt ?? fetchedAt,
    fetchedAt,
    baselineAt: baseline?.capturedAt ?? null,
    stale: false,
    rates: buildRates(goldPerGramInr, silverPerGramInr, baseline, config),
  };
}

export type MarketRatesFailureReason = "disabled" | "invalid_config" | "provider_unavailable";

export type MarketRatesResult =
  | { ok: true; payload: MarketRatesPayload; cached: boolean }
  | { ok: false; reason: MarketRatesFailureReason; message: string };
