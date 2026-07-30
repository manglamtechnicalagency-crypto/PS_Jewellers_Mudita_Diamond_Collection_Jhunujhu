export const WHATSAPP_NUMBER = "919829407255";

/**
 * Showroom location, used by the store map, the contact page and the footer.
 *
 * Coordinates were resolved from the showroom's own Google Maps listing
 * (https://maps.app.goo.gl/u6Cqf7fED4WPxboV7) on 30 July 2026. If the listing
 * is ever moved or re-pinned, update `latitude`/`longitude` here — every map,
 * embed and directions link on the site derives from these two numbers.
 */
export const SHOWROOM = {
  name: "PS Jewellers",
  latitude: 28.1151852,
  longitude: 75.3905706,
  addressLines: ["Oriental Tower, Road No. 1, Shop No. 1", "Jhunjhunu, Rajasthan"],
  phone: "9829407255",
  email: "subhashsoni334@gmail.com",
  /** Canonical listing. Kept as the short link so it survives Google URL changes. */
  mapsUrl: "https://maps.app.goo.gl/u6Cqf7fED4WPxboV7",
} as const;

/**
 * Social profiles.
 *
 * The URL is stored without the `?igsh=...` parameter that Instagram appends to
 * shared links. That token identifies the share it came from, not the profile —
 * baking it into every page would send Instagram a referral signal on behalf of
 * every visitor, and it can expire.
 */
export const SOCIAL = {
  instagram: {
    handle: "ps_jewellersjjn",
    url: "https://www.instagram.com/ps_jewellersjjn",
  },
} as const;

/** Single-line address, for aria labels and structured data. */
export const SHOWROOM_ADDRESS = SHOWROOM.addressLines.join(", ");

/**
 * Keyless interactive embed. `output=embed` is the classic form and needs no
 * API key or billing account, unlike the Maps Embed API and Static Maps API.
 */
export const SHOWROOM_EMBED_URL = `https://www.google.com/maps?q=${SHOWROOM.latitude},${SHOWROOM.longitude}&z=17&hl=en&output=embed`;

/** Official directions deep link. Also keyless. Opens the visitor's map app on mobile. */
export const SHOWROOM_DIRECTIONS_URL = `https://www.google.com/maps/dir/?api=1&destination=${SHOWROOM.latitude},${SHOWROOM.longitude}`;

/**
 * Opening hours, shown on the store locator page.
 *
 * DELIBERATELY EMPTY. Publishing guessed hours for a physical showroom sends
 * customers to a closed shutter, which is worse than publishing nothing — so
 * the hours block renders only when this array is populated.
 *
 * To switch it on, add entries such as:
 *   { days: "Monday – Saturday", hours: "10:30 am – 8:00 pm" },
 *   { days: "Sunday", hours: "Closed" },
 */
export const SHOWROOM_HOURS: ReadonlyArray<{ days: string; hours: string }> = [];
