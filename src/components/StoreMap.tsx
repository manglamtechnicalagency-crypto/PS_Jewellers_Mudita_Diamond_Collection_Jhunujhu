"use client";

import { useState } from "react";
import {
  SHOWROOM,
  SHOWROOM_ADDRESS,
  SHOWROOM_DIRECTIONS_URL,
  SHOWROOM_EMBED_URL,
} from "../../config/contact";

/**
 * Interactive Google Maps preview of the showroom, loaded on demand.
 *
 * WHY CLICK-TO-LOAD: this renders in the site footer, so an always-on iframe
 * would pull Google's frame, scripts and cookies into every page view on the
 * site — a real cost on mobile connections and an unnecessary third-party
 * touch for visitors who never look at the map. Nothing is requested from
 * Google until someone actually clicks.
 *
 * Once loaded the embed is the genuine article: pan, zoom, satellite, Street
 * View, all of it. `output=embed` needs no API key and no billing account.
 *
 * Requires `frame-src https://www.google.com https://maps.google.com` in the
 * CSP — see src/lib/security-headers.ts.
 */

type StoreMapProps = {
  /** Tailwind aspect/height classes for the frame. */
  className?: string;
  /** Small footprint drops the address overlay; used in the footer. */
  compact?: boolean;
};

export default function StoreMap({ className = "aspect-[4/3] sm:aspect-[16/9]", compact = false }: StoreMapProps) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className={`relative w-full overflow-hidden rounded-xs border border-line bg-cream ${className}`}>
      {loaded ? (
        <iframe
          // `title` is what a screen reader announces for the frame; without it
          // the embed is an unlabelled black box.
          title={`Google Map showing ${SHOWROOM.name}, ${SHOWROOM_ADDRESS}`}
          src={SHOWROOM_EMBED_URL}
          className="absolute inset-0 h-full w-full border-0"
          loading="lazy"
          // Google needs neither our cookies nor our origin to render a pin.
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
      ) : (
        <button
          type="button"
          onClick={() => setLoaded(true)}
          className="group absolute inset-0 flex h-full w-full flex-col items-center justify-center gap-3 p-6 text-center transition-colors hover:bg-white"
          aria-label={`Load the interactive Google Map for ${SHOWROOM.name}, ${SHOWROOM_ADDRESS}`}
        >
          <span
            aria-hidden="true"
            className="flex h-12 w-12 items-center justify-center rounded-full border border-gold-500 text-gold-600 transition-colors group-hover:bg-gold-500 group-hover:text-white"
          >
            {/* Map pin. Inline so it costs no request and inherits currentColor. */}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-6 w-6">
              <path d="M12 21s7-5.686 7-11a7 7 0 1 0-14 0c0 5.314 7 11 7 11Z" strokeLinejoin="round" />
              <circle cx="12" cy="10" r="2.5" />
            </svg>
          </span>
          <span className="font-serif text-lg text-ink">View map</span>
          {!compact ? (
            <span className="max-w-xs text-xs leading-5 text-muted">
              {SHOWROOM_ADDRESS}
              <br />
              Loads Google Maps when you tap.
            </span>
          ) : (
            <span className="text-xs text-muted">Loads Google Maps when you tap.</span>
          )}
        </button>
      )}
    </div>
  );
}

/** Address, directions and listing links. Rendered beside the map. */
export function StoreDetails({ className = "" }: { className?: string }) {
  return (
    <div className={className}>
      <address className="not-italic text-sm leading-6 text-ink-soft">
        <strong className="block font-serif text-lg text-ink">{SHOWROOM.name}</strong>
        {SHOWROOM.addressLines.map((line) => (
          <span key={line} className="block">
            {line}
          </span>
        ))}
      </address>
      <div className="mt-4 flex flex-col gap-2 text-sm">
        <a className="text-ink-soft hover:text-gold-600" href={`tel:+91${SHOWROOM.phone}`}>
          Phone: {SHOWROOM.phone}
        </a>
        <a
          className="text-ink-soft hover:text-gold-600"
          href={`https://wa.me/${SHOWROOM.phone.length === 10 ? `91${SHOWROOM.phone}` : SHOWROOM.phone}`}
        >
          WhatsApp: {SHOWROOM.phone}
        </a>
        <a className="text-ink-soft hover:text-gold-600" href={`mailto:${SHOWROOM.email}`}>
          {SHOWROOM.email}
        </a>
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        <a
          href={SHOWROOM_DIRECTIONS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-12 items-center justify-center rounded-xs bg-ink px-5 text-sm font-semibold text-white transition-colors hover:bg-gold-500"
        >
          Get directions
        </a>
        <a
          href={SHOWROOM.mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-12 items-center justify-center rounded-xs border border-line px-5 text-sm font-semibold text-ink transition-colors hover:border-gold-500"
        >
          Open in Google Maps
        </a>
      </div>
    </div>
  );
}
