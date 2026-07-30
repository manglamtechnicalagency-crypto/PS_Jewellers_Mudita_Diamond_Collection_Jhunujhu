# Live gold & silver market rates

Read-only reference widget on the admin dashboard (`/admin`). Shows live
international spot converted to INR, plus a derived regional figure, for gold
24K/22K/18K and 999 fine silver — per gram, per 10 g, and per tola.

**No API key. No signup. No quota.** Both upstreams are free and keyless, so the
feature works on a fresh clone with zero configuration.

## Data sources

| Leg | Endpoint | Returns |
| --- | --- | --- |
| Metal spot | `https://api.gold-api.com/price/XAU` and `/XAG` | USD per troy ounce, updated continuously |
| USD → INR | `https://open.er-api.com/v6/latest/USD` | Exchange rate, **refreshed about once a day** |

Per-gram INR = `usdPerOunce / 31.1034768 × usdInr`.

## Honest limits — read this before trusting a number

- **The FX leg is not real-time.** Metal spot is live; the exchange rate is
  roughly daily. On a day the rupee moves sharply, the INR figure lags. It is
  the price of a keyless source. If you need tick-level INR, you need a paid
  INR-denominated feed.
- **There is no previous close.** The free feed publishes none and offers no
  history endpoint, so the up/down percentage compares against **today's first
  reading**, captured once per IST calendar day and cached for 24 h. It means
  the same thing all day and survives instance churn, but it is a session-open
  comparison, not a close-to-close one.
- **The regional figure is derived, not quoted.** No free API sells Indian
  regional bullion rates. The widget builds it:

  ```
  spot  ->  x (1 + duty%)  ->  x (1 + GST%)  ->  x (1 + local basis%)
  ```

  Those percentages are configuration, and **the duty one dominates**. If it is
  stale, every number on the dashboard is wrong by that amount.

## Accuracy

Measured against rates published by Indian sources on **30 July 2026**, using
that day's international spot and USD/INR:

| | Derived | Published (ex-GST) | Drift |
| --- | --- | --- | --- |
| Gold 24K | ₹14,424/g | ₹14,433/g | **−0.06%** |
| Gold 22K | ₹13,222/g | ₹13,230/g | **−0.06%** |
| Silver 999 | ₹212/g | ₹212/g | **−0.08%** |

`tests/metal-market-rates.test.ts` locks this in. The guard fails if anyone
changes the duty default, the karat ratios, the levy order, or reintroduces a
silver fineness multiplier.

Three things had to be right to get here, and each was wrong at first:

1. **Import duty is 15%, not 6%.** India raised it (10% BCD + 5% AIDC) on
   **13 May 2026**. The 6% default read every rate ~5% low. *This is a policy
   number — re-check it at every Union Budget.*
2. **Publish ex-GST.** IBJA, GoodReturns, Tanishq and the broker apps all quote
   before GST; the 3% goes on at the counter. `METAL_RATES_GST_PERCENT` is `0`
   by default for exactly this reason. Set it to `3` only if you want a
   tax-inclusive counter price, and accept that it will then sit ~3% above every
   source you compare against.
3. **Exact karat ratios.** 22K is 24K × 22/24 = 0.91667, not the rounded 0.916
   hallmark stamp. And the XAG quote is *already* fine silver — the old ×0.999
   was double-counting purity.

### Calibration

Gold needs no local basis by default; silver ships with 2%, an observed physical
premium in the Indian market. To re-calibrate against your own sarafa:

1. Note the widget's **Spot /g** figure for the metal.
2. Note today's published or board rate for the same metal, ex-GST.
3. `basis% = (published / (spot × (1 + duty%/100)) − 1) × 100`
4. Put the result in `METAL_RATES_GOLD_PREMIUM_PERCENT` or
   `METAL_RATES_SILVER_PREMIUM_PERCENT`.

Do this after a duty change, or any time the widget drifts more than ~1% from
your board.

### The accuracy ceiling

**100% is not reachable this way, and you should not plan around it.** Indian
published rates come from IBJA polling physical dealers; they carry a local
basis that moves independently of international spot. On top of that the free FX
feed updates about once a day, so a sharp rupee move shows up as error until it
refreshes. Realistic sustained accuracy is **~0.5–2%** with the calibration
above. If you need tick-exact parity with a broker, you need a paid
INR-denominated feed or an IBJA licence — not a keyless API.

## What this is not

It does **not** set prices. The feed never writes to the `metal_rates` table.
Product pricing continues to use the rates an admin enters manually in
**Catalogue settings** (`PATCH /api/admin/metal-rates`). The two systems are
deliberately separate so a bad upstream response cannot reprice the catalogue.

## Files

| Path | Role |
| --- | --- |
| `src/lib/metal-market-rates.ts` | Config, upstream parsing, conversion maths. Pure and framework-free. |
| `src/lib/metal-market-rates-server.ts` | Next.js Data Cache layer. Server-only. |
| `app/admin/page.tsx` | Server-renders the first reading and passes it to the widget. |
| `app/api/admin/metal-market-rates/route.ts` | Admin-gated `GET` for the Refresh button. No mutations. |
| `app/admin/_components/MarketRatesWidget.tsx` | Client widget. |
| `tests/metal-market-rates.test.ts` | Unit tests. |

The split is deliberate: the maths is unit tested with `node:test`, which has no
Next.js request context, and `unstable_cache` requires one.

## Caching

Three entries in the Next.js Data Cache, each with a lifetime matched to how
fast its upstream actually moves:

| Entry | TTL | Why |
| --- | --- | --- |
| spot (XAU, XAG) | `METAL_MARKET_RATES_CACHE_SECONDS`, default 600 s | Metal prices move continuously |
| FX | 6 h | The feed publishes roughly once a day; a 10-minute TTL re-read an identical number |
| daily baseline | 24 h, keyed by IST day | Movement comparison, captured once per trading day |

An earlier version kept this in a module-scoped variable. On serverless that
memory belongs to a single instance, so the hit rate approached zero in
production and the movement baseline reset constantly. The Data Cache is shared
across instances, which is what makes the TTLs above real rather than
decorative.

The dashboard **server-renders** its first reading, so rates appear in the
initial HTML with no spinner and no fetch waterfall. The API route serves the
Refresh button and scripted checks.

## Configuration

Everything is optional. Defaults work as-is.

```
METAL_MARKET_RATES_MODE=              # live (default) | mock | off
METALS_API_URL=https://api.gold-api.com/price
FX_API_URL=https://open.er-api.com/v6/latest/USD
METAL_MARKET_RATES_CACHE_SECONDS=600
METAL_RATES_IMPORT_DUTY_PERCENT=15    # 10% BCD + 5% AIDC, since 13 May 2026
METAL_RATES_GST_PERCENT=0             # sources publish ex-GST
METAL_RATES_GOLD_PREMIUM_PERCENT=0
METAL_RATES_SILVER_PREMIUM_PERCENT=2
METAL_RATES_REGION_LABEL=Jhunjhunu, Rajasthan
```

### Modes

| `METAL_MARKET_RATES_MODE` | Result |
| --- | --- |
| unset | **live** in every environment — real rates, no key needed |
| `live` | live |
| `mock` | fixed offline sample numbers, no network. Banner says "Sample data". |
| `off` | widget shows "turned off for this environment" |

Live is the default everywhere because there is no quota to protect. `mock`
exists for offline work and CI and is **never** a silent fallback — if the
upstream fails, you get stale-but-real data or an error, never invented numbers.

Bounds are enforced, not assumed:

- `METAL_MARKET_RATES_CACHE_SECONDS` is **clamped** to 300–900.
- Duty, GST and both premium values must each parse as a number in 0–100, or
  the endpoint returns `invalid_config` rather than rendering a nonsense rate.
- The legacy `METAL_RATES_REGIONAL_PREMIUM_PERCENT` is still honoured as the
  fallback for both metals, so an existing deployment keeps its calibration.
- An unrecognised `METAL_MARKET_RATES_MODE` is an error, never a fallback.

## Verify

```powershell
npm run test
npm run type-check
npm run build
```

Then, signed in as an admin:

1. Open `/admin`. The widget sits above "Next action". Rates should be present
   in the very first paint — no spinner. View source: the numbers are in the
   server-rendered HTML.
2. You should see real rates and **no** "Sample data" banner. If that banner
   appears, `METAL_MARKET_RATES_MODE` is set to `mock`.
3. Hit **Refresh** twice within the TTL — the second is served from the Data
   Cache and makes no upstream call.
4. Sanity-check 24K per 10 g against GoodReturns or your sarafa board. Expect
   within ~1%. If it is off by ~5%, check the import duty first — that is the
   single most likely cause. Note published rates are ex-GST and exclude making
   charges, which this widget also does not model.

Direct check:

```powershell
curl -i https://YOUR-HOST/api/admin/metal-market-rates
```

Unauthenticated it returns `401`. Authenticated it returns
`{ "data": { ... }, "cached": false }`.

## Failure behaviour

Ladder: fresh cache → upstreams → retained last-known-good marked `stale` →
error. Either leg failing (metal or FX) makes the whole reading stale rather
than mixing a fresh price with a guessed rate. An outage degrades the widget to
a dated number behind an amber **Stale data** banner. It never blanks the
dashboard and never invents a price.

| Symptom | Cause | Fix |
| --- | --- | --- |
| "Live market rates are turned off" | `MODE=off` | Unset it, or set `live` |
| `invalid_config` | bad mode string or out-of-range percentage | Check the values above |
| Amber **Stale data** banner | an upstream was unreachable | Usually transient; the shown rate is the last good one. Check both endpoints in a browser. |
| `provider_unavailable` (502) | upstream failed with nothing cached | Same as above; resolves on the first successful fetch |
| "Sample data" banner | `MODE=mock` | Unset `METAL_MARKET_RATES_MODE` |
| "No baseline yet" on every card | the day's first reading has not been captured | Expected on the very first load of an IST day. Refresh once. |
| Every rate ~5% low | `METAL_RATES_IMPORT_DUTY_PERCENT` stale after a duty change | Set it to the current total duty |
| Every rate ~3% high | `METAL_RATES_GST_PERCENT` set to 3 | Set it to 0; sources publish ex-GST |
| One metal off, the other fine | local basis needs calibrating | Run the Calibration procedure above |

Server-side failures log as `[metal-market-rates] provider_fetch_failed` with
the mode and an error label (`spot_status_503`, `fx_shape_unrecognised`, …).

## Known limits

- **The stale-data fallback is still process-local.** The primary cache is the
  shared Data Cache, but the last-known-good copy used during an upstream outage
  lives in instance memory. On a cold instance during an outage there is nothing
  to fall back to and the route returns 502 — the honest answer rather than a
  fabricated price. If you want stale-mode to survive cold starts, move
  `lastKnownGood` behind the same Upstash client `src/lib/upload-rate-limit.ts`
  uses.
- **Baseline costs one extra pair of upstream calls per IST day.**
- **Silver purity assumption**: the XAG spot is treated as fine silver and
  scaled by 0.999.
