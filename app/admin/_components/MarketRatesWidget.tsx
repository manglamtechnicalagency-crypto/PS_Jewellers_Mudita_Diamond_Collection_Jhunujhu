"use client";

import { useCallback, useState } from "react";
import type { MarketRatesPayload, RateEntry } from "@/src/lib/metal-market-rates";

/**
 * Dashboard widget for live gold and silver reference rates.
 *
 * Reference data only. Nothing here writes a rate — selling rates are set by an
 * admin in Catalogue settings. The copy says so, because a number on a
 * dashboard that looks authoritative will be treated as authoritative.
 *
 * The first reading arrives as a prop from the Server Component, so the rates
 * are in the initial HTML. There is no fetch-on-mount and no spinner on load;
 * the client only fetches when an admin presses Refresh.
 */

type ApiSuccess = { data: MarketRatesPayload; cached: boolean };
type ApiError = { error: { code: string; message: string } };

export type MarketRatesInitial =
  | { ok: true; payload: MarketRatesPayload }
  | { ok: false; message: string };

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const timestamp = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" });

function formatRupees(value: number): string {
  return currency.format(value);
}

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "unknown";
  return timestamp.format(date);
}

function MovementBadge({ entry }: { entry: RateEntry }) {
  if (entry.direction === "unknown" || entry.changePercent === null) {
    // Shown only before the day's opening baseline has been captured.
    return <span className="whitespace-nowrap text-xs text-muted">No baseline yet</span>;
  }
  const isUp = entry.direction === "up";
  const isFlat = entry.direction === "flat";
  const arrow = isFlat ? "→" : isUp ? "▲" : "▼";
  const tone = isFlat ? "text-muted" : isUp ? "text-emerald-700" : "text-red-700";
  const magnitude = Math.abs(entry.changePercent).toFixed(2);
  return (
    <span className={`whitespace-nowrap text-xs font-semibold ${tone}`} title="Change since today's first reading">
      <span aria-hidden="true">{arrow}</span> {magnitude}%
      <span className="sr-only">
        {isFlat ? " unchanged" : isUp ? " up" : " down"} since today&apos;s first reading
      </span>
    </span>
  );
}

function RateCard({ entry, regionLabel }: { entry: RateEntry; regionLabel: string }) {
  return (
    <article className="rounded-xs border border-line bg-white p-4">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold leading-5 text-ink">{entry.label}</h3>
        <MovementBadge entry={entry} />
      </div>
      <p className="mt-3 font-serif text-2xl tabular-nums text-ink">
        {formatRupees(entry.regional.perGram)}
        <span className="ml-1 text-sm text-muted">/g</span>
      </p>
      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-ink-soft">
        <dt className="text-muted">Per 10 g</dt>
        <dd className="text-right tabular-nums">{formatRupees(entry.regional.per10Gram)}</dd>
        <dt className="text-muted">Per tola</dt>
        <dd className="text-right tabular-nums">{formatRupees(entry.regional.perTola)}</dd>
        <dt className="text-muted">Spot /g</dt>
        <dd className="text-right tabular-nums">{formatRupees(entry.spot.perGram)}</dd>
      </dl>
      <p className="mt-2 text-[11px] leading-4 text-muted">{regionLabel}: spot plus duty, GST and premium.</p>
    </article>
  );
}

export default function MarketRatesWidget({ initial }: { initial: MarketRatesInitial }) {
  const [payload, setPayload] = useState<MarketRatesPayload | null>(initial.ok ? initial.payload : null);
  const [error, setError] = useState<string | null>(initial.ok ? null : initial.message);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const response = await fetch("/api/admin/metal-market-rates", { cache: "no-store" });
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        setError((body as ApiError | null)?.error?.message ?? "Market rates could not be loaded right now.");
        return;
      }
      setPayload((body as ApiSuccess).data);
      setError(null);
    } catch {
      // Network-level failure in the browser (offline, blocked). The server
      // already logs upstream failures; there is nothing useful to log here.
      // The previously rendered rates stay on screen rather than blanking.
      setError("Market rates could not be refreshed. Check your connection and try again.");
    } finally {
      setRefreshing(false);
    }
  }, []);

  return (
    <section className="rounded-xs border border-line bg-white p-6" aria-labelledby="market-rates-heading">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-600">Market reference</p>
          <h2 id="market-rates-heading" className="mt-2 font-serif text-2xl">
            Live gold &amp; silver rates
            {payload ? <span className="text-muted"> — {payload.regionLabel}</span> : null}
          </h2>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={refreshing}
          className="self-start rounded-xs border border-line px-3 py-2 text-sm font-semibold text-ink hover:border-gold-500 disabled:opacity-50"
        >
          {refreshing ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {error ? (
        <p className="mt-4 rounded-xs border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="status">
          {error}
        </p>
      ) : null}

      {payload ? (
        <>
          {payload.stale ? (
            <p
              className="mt-4 rounded-xs border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"
              role="status"
            >
              <strong>Stale data.</strong> {payload.staleReason} Last successful update{" "}
              {formatTimestamp(payload.fetchedAt)}.
            </p>
          ) : null}

          {payload.mode === "mock" ? (
            <p className="mt-4 rounded-xs border border-line bg-cream p-3 text-sm text-ink-soft" role="status">
              <strong>Sample data.</strong> This environment is running in mock mode. These are not market rates.
            </p>
          ) : null}

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {payload.rates.map((entry) => (
              <RateCard key={entry.id} entry={entry} regionLabel={payload.regionLabel} />
            ))}
          </div>

          <div className="mt-4 flex flex-col gap-1 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
            <p>Spot quoted {formatTimestamp(payload.quotedAt)}</p>
            <p>
              Derived: +{payload.adjustments.importDutyPercent}% duty
              {payload.adjustments.gstPercent > 0 ? `, +${payload.adjustments.gstPercent}% GST` : ", ex-GST"}, local
              basis +{payload.adjustments.goldPremiumPercent}% gold / +{payload.adjustments.silverPremiumPercent}%
              silver
            </p>
          </div>
          <p className="mt-3 text-xs leading-5 text-ink-soft">
            Reference only. Live international spot converted at ₹{payload.usdInr.toFixed(2)}/USD
            {payload.fxUpdatedAt ? ` (rate published ${formatTimestamp(payload.fxUpdatedAt)})` : ""}; the free exchange
            feed refreshes about once a day. {payload.regionLabel}{" "}
            figures add import duty and the local basis, quoted <strong>ex-GST</strong> to match how IBJA and the rate
            portals publish — add {payload.adjustments.gstPercent > 0 ? "nothing further" : "3% GST"} for a counter
            price. They are an estimate, not an official association or sarafa rate. Percentages compare against
            today&apos;s first reading
            {payload.baselineAt ? ` (${formatTimestamp(payload.baselineAt)})` : ""}, not a market close. Product pricing
            still uses the rates you set in <span className="font-semibold">Catalogue settings</span>.
          </p>
        </>
      ) : null}
    </section>
  );
}
