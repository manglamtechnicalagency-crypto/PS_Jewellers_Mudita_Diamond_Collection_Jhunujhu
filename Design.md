# Design System

> **Current live UI baseline — 2026-07-31:** The active storefront is the Next.js App Router implementation in `app/` and `src/`, styled with Tailwind and the current global CSS. Public catalogue content is server-rendered from the published Supabase view when configured; unavailable production data shows the intentional fail-closed state. Treat old JSX/Vite/CSS observations below as historical audit notes, not implementation guidance.

> **Current implementation correction:** The current brand is PS Jewellers. The source of truth for UI tokens and responsive styling is `tailwind.config.ts`, `app/globals.css`, and active `.tsx` components. References below to Vedant, Vite, `index.html`, old CSS classes, or retired dark-theme markup must not be used to change the active interface.

> **v2.0 update notice:** the visual system changed substantially in the v2 rewrite, per an explicit client requirement: **dark theme → light, gold-on-white theme**, matching a reference product-page screenshot the client supplied, and **hand-written `styles.css` → Tailwind CSS** (`tailwind.config.ts`). §4 (Color System) and §6 (Typography) below have been rewritten to reflect the new, actual tokens in `tailwind.config.ts`. Sections describing component patterns (§13–§20) still describe the v1 dark-theme markup structurally (cards, nav, forms, page templates) — the *structure* mostly carried over into the v2 JSX, but the *colors/classes* referenced in those sections are now stale and should be read as "this pattern exists, described in v1 terms" rather than literal current class names. Treat `tailwind.config.ts` and the actual `.tsx` files as the source of truth for exact values; this document is a map, not the territory.

> The rest of this document (below the two rewritten sections) is reconstructed entirely from the **v1** shipped `src/styles.css` (753 lines, now deleted) and the JSX markup that consumed it, kept here for structural/pattern reference. There is no external brand guideline, Figma file, or style guide in the repository. Every token and pattern below is **Verified** (taken directly from the CSS/JSX) unless marked **Assumed**. Do not introduce new colors, fonts, spacing, or component styles without updating this document first (see Rules.md §17).

## 1. Design Overview

- **Brand personality (Assumed, inferred from copy and visual treatment):** Premium, traditional-luxury, editorial. Dark, near-black backgrounds with warm gold accents and a serif display typeface evoke a high-end Indian jewellery showroom rather than a mass-market storefront.
- **Visual direction (Verified):** Dark theme by default (`--ink: #080705` background, `--ivory: #fffaf0` text) with a warm gold accent (`--gold`, `--gold-2`) and cream/paper tones (`--paper`, `--ivory`) used for light panels (e.g., product cards).
- **Target audience (Assumed):** Indian jewellery shoppers, particularly bridal and gold-investment buyers (per PRD.md personas).
- **Design principles (Assumed, inferred from consistent execution):** Large serif display headlines with tight/negative letter-spacing for a fashion-editorial feel; generous whitespace via `clamp()`-based responsive padding; subtle scroll-reveal motion; minimal iconography (text-based UI, a single ♥ glyph for wishlist).
- **Desired emotional response (Assumed):** Trust, exclusivity, craftsmanship.

## 2. Existing Design Assessment

- **Existing visual style (Verified):** A single, consistent visual language is applied across all *live* routes — dark hero sections, serif headlines, gold accents, cream product cards.
- **Existing inconsistencies (Verified):** The dead/unreachable photography-template pages (`AboutPage`, `ContactPage`, `JournalPage`, `PortfolioPage`, `ProjectPage` and their components) may reference CSS classes with a different visual intent from the original photography clone. Since they are unreachable via routing, they do not currently create a *visible* inconsistency, but any CSS classes they use that are also used by live pages should be treated with care during the Phase 1 cleanup (Phases.md) to avoid accidentally deleting styles the live app still needs.
- **Existing reusable components (Verified):** `ProductCard`, buttons following the shared `.button-link`-style selector group, form controls in `CheckoutPage`, the `shop-hero`/`commerce-section` page-header pattern reused across nearly every page.
- **Accessibility issues (Verified gaps):** No documented focus-style audit; color contrast of gold-on-dark and gold-on-cream combinations has not been formally checked against WCAG AA (see Design.md §22 and Rules.md §18).
- **Responsive issues:** None catastrophic observed in the CSS; two breakpoints (`1180px`, `760px`) cover the transition from desktop to mobile — tablet-specific tuning between these two points is minimal (a documented simplification, not necessarily a defect).
- **Assets that should be preserved:** The hero image/video (`ps-hero.jpg`, `ps-hero-video.mp4`) are the only fully-owned, locally bundled photography assets and should be preserved; all other product imagery is hotlinked from Unsplash and is a **replace-before-production** item (see PRD.md Risks).

## 3. Brand Identity

**Not formally defined anywhere in the repository.** There is no logo file, no logo usage guideline, and no brand imagery style guide. The current "logo" is a text wordmark: `PS Jewellers` rendered in the header (`src/components/Header.tsx`), with "PS" in ink and "Jewellers" in `gold-500`. The historical `Footer.jsx` decorative wordmark no longer exists. **Brand name resolved 2026-07-25: PS Jewellers.** **[OPEN QUESTION]** Whether a real logo mark will be supplied.

## 4. Color System (v2 — current, gold-on-white theme)

All values are **Verified**, taken directly from `tailwind.config.ts`:

| Token | Value | Usage |
|---|---|---|
| `ink` (DEFAULT) | `#171a23` | Primary text color, dark section backgrounds (hero, category band, footer CTA band) |
| `ink-soft` (`ink.soft`, i.e. `text-ink-soft`) | `#3d4152` | Secondary body text |
| `gold-50` → `gold-900` | `#fbf4e6` → `#3f2e14` | Full gold ramp; `gold-500` (`#c1912b`) is the primary brand accent (buttons, price, kickers, links); `gold-300`/`gold-600` used for hover/border variants |
| `paper` | `#ffffff` | Primary page background (replaces v1's dark `--ink` background — this is the core theme flip) |
| `cream` | `#fbf8f2` | Secondary warm surface — section backgrounds, cards, filter sidebar |
| `line` | `#ece3d2` | Hairline borders/dividers |
| `muted` | `#7a7566` | Tertiary/muted text (meta info, timestamps) |
| `success` | `#3f7a4e` | Reserved for future success states (e.g. a real checkout confirmation) — not yet used in any component class |
| `error` | `#b3423a` | Reserved for future form-error states — not yet used in any component class |
| `warning` | `#b9822f` | Reserved for future warning states — not yet used in any component class |

**Semantic colors are now defined as tokens** (closing the v1 gap noted below), but **not yet applied to any component** — no page currently has error/success/warning UI states, since checkout validation still doesn't exist beyond the `required` HTML attribute and the demo confirmation screen. Wiring these tokens into actual error/success UI is a Phase 2-equivalent follow-up, not yet done.

**Contrast considerations:** `gold-500` (`#c1912b`) on `paper` (`#ffffff`) and `ink` (`#171a23`) on `paper` have not been formally measured against WCAG AA in this pass — verify with a contrast checker before treating Rules.md §18 as satisfied, same caveat as v1 carried forward.

<details>
<summary>v1 color system (historical, dark theme — superseded)</summary>

| Token | Value | Usage |
|---|---|---|
| `--ink` | `#080705` | Primary background (near-black) |
| `--ink-2` | `#11100c` | Secondary dark surface |
| `--gold` | `#d6ad62` | Primary accent |
| `--gold-2` | `#f3d58a` | Brighter gold accent |
| `--paper` | `#f7f1e7` | Light warm surface |
| `--ivory` | `#fffaf0` | Primary text on dark backgrounds |
| `--muted` | `#8f8678` | Secondary/muted text |
| `--line` | `rgba(214, 173, 98, 0.22)` | Hairline borders (translucent gold) |
| `--glass` | `rgba(17, 16, 12, 0.62)` | Overlay/glass-panel backgrounds |
| `--shadow` | `0 24px 80px rgba(0, 0, 0, 0.32)` | Elevation shadow |

</details>

## 5. Theme

- **Light theme:** Not implemented as a separate mode — the app is dark-by-default globally (`body { background: var(--ink); color: var(--ivory); }`). Individual light-toned *sections* exist (e.g., product cards use `--paper`/`--ivory` backgrounds against the dark page), but there is no user-toggleable light/dark theme.
- **Dark theme:** The default and only theme.
- **Surface hierarchy:** `--ink` (page background) → `--ink-2` (alternating dark sections, e.g. `.commerce-section--dark`) → `--paper`/`--ivory` (card/panel surfaces) → `--glass` (overlay panels, e.g. `.glass-panel` on info pages).
- **Overlay behavior:** `.lux-hero__shade` darkens the hero video/image for text legibility; `.glass-panel` uses the `--glass` translucent background for content cards over imagery.
- **Shadow treatment:** Minimal — `--shadow` is defined but sparingly applied; most depth comes from color contrast rather than heavy shadows, consistent with the flat/editorial visual style.
- **Theme-switching behavior:** Not implemented; no toggle exists.

## 6. Typography (v2 — current)

**Verified, from `tailwind.config.ts` and `index.html`:**

- **Primary (display/serif) font:** `font-serif` → `"Playfair Display", Georgia, "Times New Roman", serif`. **Playfair Display is now loaded as a real web font** via a Google Fonts `<link>` in `index.html` (weights 400/600, plus italic 400) — this closes the v1 gap where the serif face silently fell back to system fonts on non-Apple platforms. Used for all headlines, prices, product names, section titles — same usage rule as v1.
- **Secondary (body/sans) font:** `font-sans` → `Inter, ui-sans-serif, system-ui, ...` — also now loaded as a real web font (weights 400/500/600) rather than relying on it being a system font. Applied as the `body` default in `src/index.css`.
- **Kicker/label style:** small, uppercase, letter-spaced gold text (`text-sm font-semibold uppercase tracking-[0.2em] text-gold-600`) — new pattern introduced in v2 to match the reference screenshot's "TRADITIONAL LUXURY" style label above headings; used consistently across `SectionTitle` (HomePage), `ProductPage`'s category label, and every page's hero band.
- **Heading scale:** Now expressed with Tailwind responsive utilities (`text-4xl sm:text-5xl lg:text-7xl` etc.) rather than v1's `clamp()` CSS. Same general proportions carried over — large, tight-tracking serif display type for hero/section headings; `font-weight: 400`–`600` (Playfair Display's available weights), no black/900 weight used.
- **Body scale:** Tailwind's default type scale (`text-sm`, `text-base`, `text-lg`, etc.) — no custom root font-size override.
- **Letter spacing:** Tight tracking is no longer applied to headings in v2 (Tailwind's default `tracking-normal` is used for `font-serif` headings) — this is a **deliberate simplification** versus v1's negative-tracking editorial look, since the reference screenshot the client supplied uses more conventional heading spacing. Wide tracking (`tracking-[0.2em]`, uppercase) is still used for kicker/label text.
- **Usage rules:** Unchanged — serif for headlines/prices/product names, sans for everything else.

<details>
<summary>v1 typography (historical — superseded, no longer loaded as a web font)</summary>

`--serif: "Iowan Old Style", "Baskerville", "Times New Roman", serif` (system-font fallback only, not loaded as a web font — this was a known gap); tight negative letter-spacing (`-.05em` to `-.06em`) on large display headings; `clamp()`-based responsive sizing.

</details>

## 7. Spacing System

**Verified:** No discrete spacing scale (e.g., a `--space-1` … `--space-8` token set) exists. Spacing is expressed via one primary responsive token, `--pad: clamp(20px, 4vw, 72px)`, used as horizontal page padding, plus ad hoc pixel values throughout individual rules (e.g., `margin: 0 0 8px`, `gap: 24px`). **Recommendation for future consistency (not yet adopted):** formalize a scale such as 4/8/12/16/24/32/48/64/96px and refactor ad hoc values onto it during a dedicated design-system hardening phase — do not do this opportunistically inside unrelated feature work (see Rules.md §4).

## 8. Layout System

- **Maximum container width (Verified):** `--max: 1440px` — used to cap the width of major content sections (e.g., `.product-long-copy`, footer).
- **Grid:** No CSS Grid framework/utility system; individual components use `display: grid` or `display: flex` directly with hand-tuned column counts (e.g., `.product-grid`, `.product-grid--four`).
- **Gutters:** Controlled per-component via `gap` properties, not a global gutter token.
- **Section spacing:** Sections use the shared `.commerce-section` class as a consistent vertical rhythm unit across the home page and other content pages.
- **Content width:** Bound by `--max` plus the responsive `--pad` horizontal inset.
- **Sidebar width:** The shop page filter sidebar (`.shop-filter`) has an implicit width via its grid/flex parent (`.shop-layout`) — no fixed pixel width token is defined; it's laid out as a grid column.
- **Header height:** Not fixed via a token; `Header.jsx` is a flex layout that sizes to content.
- **Footer structure:** Three-part footer — CTA band (`.footer__cta`), link columns (`.footer__details`: Shop / Support / Visit), decorative oversized wordmark, and a bottom legal bar (`.footer__bottom`).

## 9. Responsive Breakpoints

**Verified, the only two breakpoints defined in `styles.css`:**

| Breakpoint | Value | Behavior |
|---|---|---|
| Desktop (default) | > 1180px | Full desktop nav, multi-column grids |
| Tablet/small-desktop | ≤ 1180px | First responsive adjustment tier (`@media (max-width: 1180px)`) |
| Mobile | ≤ 760px | `--pad` collapses to a fixed `20px`; mobile nav drawer (`Header.jsx` `.mobile-menu`) becomes the primary navigation; further layout collapse (e.g., single-column grids) |

There is no separate "large mobile" or "large desktop" breakpoint tier — the system intentionally uses just two responsive steps. **[Assumed simplification, acceptable for current scope; document here as the confirmed source of truth rather than inventing additional breakpoints elsewhere in the codebase.]**

## 10. Border Radius

**Verified — very limited use.** Only one explicit `border-radius: 999px` (fully rounded/pill shape) was found, applied twice in `styles.css` (once for a pill-style element, once inside a mobile-menu-related rule). Most surfaces (cards, buttons, inputs) use **sharp, unrounded corners (`0`)** by omission — this is a deliberate part of the current editorial-luxury aesthetic (sharp edges rather than soft rounded cards) and should be preserved unless a redesign is explicitly approved.

## 11. Shadows and Elevation

**Verified — a single elevation token exists:** `--shadow: 0 24px 80px rgba(0, 0, 0, 0.32)`. It is applied sparingly; the design otherwise relies on color/contrast rather than shadow-based depth. Do not introduce a multi-level elevation system without design approval — it would be inconsistent with the current flat, high-contrast aesthetic.

## 12. Iconography

**Verified — minimal, text-first iconography:**
- No icon library (no Lucide/Feather/FontAwesome/etc.) is installed or imported anywhere.
- The only glyph icon in the live app is the wishlist heart, implemented as a literal `♥` Unicode character (`ProductCard.jsx`, `ProductPage.jsx` equivalents), styled via the `.icon-action`/`.is-active` classes.
- The mobile menu toggle (`Header.jsx` `.menu-toggle`) is built from two plain `<span>` elements styled into a hamburger/X via CSS transforms — not an icon font/SVG.
- An `ArrowIcon.jsx` component exists but is **only used by dead code** (see Architecture.md §2) — do not treat it as part of the live icon system.
- **Accessibility requirement:** the `♥` glyph button already has `aria-label="Toggle wishlist"` — preserve this pattern for any new icon-only button.

## 13. Buttons

**Verified — one shared visual treatment applied across multiple selectors** (`styles.css` line ~104): `.button-link`, `.lux-hero__actions a`, `.appointment-band a`, `.order-summary a`, `.checkout-form button`, `.detail-actions button`, `.detail-actions a` all share the same base button styling and the same `:hover` treatment (line ~119), giving a single consistent "primary action" button look across the whole app regardless of whether it's a `<button>` or `<a>`.

- **Default:** Solid-styled action element (exact colors defined inline in the shared selector block — gold/ink combination consistent with the palette).
- **Hover:** `transition: transform .25s ease, background .25s ease, color .25s ease, border-color .25s ease` — implies a color/transform shift on hover across all button-like elements uniformly.
- **Active/Focus/Disabled/Loading states:** **Not explicitly styled** — no `:active`, `:focus-visible`, `:disabled`, or loading-spinner styling was found for buttons anywhere in `styles.css`. **[GAP — flagged for Rules.md §18 accessibility compliance; add explicit focus-visible styling before considering the design system "production ready."]**
- **Variants actually present in the live app (Verified, by usage, not by dedicated CSS class per variant):**
  - Primary CTA (shared `.button-link`-style group above) — "Shop Collection", "Book Appointment", "Proceed to Checkout", "Add to Wishlist", etc.
  - Icon-only (`.icon-action`, the wishlist heart)
  - Filter/toggle button (`.shop-filter button`, with `.is-active` state)
  - Quantity stepper button (`.quantity-control button`, plain bordered square)
  - Category rail link (styled as a button-like pill in `.category-rail`)
  - There is **no dedicated "destructive" or "secondary" button variant** — every action uses the same primary treatment. This is a simplification, not necessarily a defect, but should be a deliberate decision if a "Remove from cart" or similarly destructive action is added later (see Rules.md §17).

## 14. Form Controls

**Verified, from `CheckoutPage.jsx` and `Header.jsx` search forms — the only forms in the live app:**

- **Text input / Email / Textarea:** Used in `CheckoutPage.jsx` (name, mobile, email, address) with a `<label>` wrapping each `<input>`/`<textarea>`, and `placeholder` text as the only in-field guidance. No visible persistent label styling beyond the wrapping `<label>` text itself; no help text, no validation, no error state exists for any of them today (see §4 Color System gap).
- **Select:** Used for the checkout "Payment Method" dropdown (native `<select>`, unstyled beyond base form treatment) and the shop page sort dropdown.
- **Search field:** `Header.jsx` implements a custom search form (desktop and mobile variants) — text input plus a submit button, no autocomplete/suggestions.
- **Checkbox / Radio / Switch / Date picker / File upload:** **Not present anywhere in the live app.** No design pattern exists for these yet — must be designed fresh if a future feature needs them (e.g., a real account/registration form).
- **Disabled state:** Not styled anywhere — no `:disabled` CSS rule exists.
- **Focus state:** Not explicitly styled — relies on browser default focus ring, which is visually inconsistent with the dark theme's gold/ivory palette. **[GAP — same as button focus state above.]**

## 15. Cards

**Verified — one primary card pattern:** `ProductCard.jsx` / `.product-card` (with a `.product-card--compact` modifier used in "related products," "best sellers," and "new arrivals" rails). Structure: media (image + badge), body (category label, name, wishlist toggle), price row (offer price, original price, discount badge), meta row (purity, weight, rating), action row (Add to Cart, Quick View).

Other card-like patterns observed: `.collection-card` (home page featured collections), `.glass-panel` (info-page content card using the `--glass` overlay token), cart line-item (`.cart-item`), order summary panel (`.order-summary`). There is no single generic "Card" component in code — each is a purpose-built pattern sharing the same visual language (sharp corners, gold accents, serif headings) rather than a shared React component. **Recommendation (not yet adopted):** if more card variants are needed, consider extracting a shared base `Card` component to reduce duplication — flag this as a proposal, not a silent refactor (Rules.md §4).

## 16. Navigation

- **Header (Verified, `Header.jsx`):** Fixed structure — brand wordmark, desktop nav links (`Home, Shop, Collections, Gold, Diamond, Bridal, Offers, Store`), header actions (search form, Wishlist with count badge, Cart with count badge, Account link), and a hamburger toggle for mobile.
- **Desktop navigation:** Horizontal link row, plain `<a>` tags, no dropdown/mega-menu.
- **Mobile navigation:** Full-screen (or near-full-screen) drawer (`.mobile-menu.is-open`), triggered by the hamburger button; includes brand, location subtitle, a duplicated search form, the same nav links (staggered-in via a `--menu-index` CSS custom property per item), and duplicated Wishlist/Cart/Account actions.
- **Sidebar:** Only on the shop page (`.shop-filter`) — category filter buttons plus a "Clear Search" button when a search term is active.
- **Breadcrumbs:** **Not implemented anywhere.**
- **Tabs:** **Not implemented anywhere.**
- **Pagination:** **Not implemented** — the shop grid renders all filtered results at once (see Architecture.md §17 performance note).
- **Footer navigation:** Three link columns (Shop, Support, Visit) plus a bottom legal bar (Privacy, Terms) — see §8 above.

## 17. Feedback Components

**Verified — very limited set exists:**
- **Empty states:** Implemented (`"No jewellery found."` default, customizable via `emptyMessage` prop; `"Your cart is empty."` inline on the cart page).
- **Toasts / Alerts / Banners / Progress indicators / Skeleton loaders / Error states / Success states:** **None exist anywhere in the codebase.** There is no toast/notification system, no loading skeleton, and — critically — no success confirmation after checkout submission (flagged as a UX gap in PRD.md/Phases.md Phase 2). Any of these introduced in the future must follow the color/typography rules already established in this document rather than inventing a new visual language.

## 18. Overlay Components

**Verified — none of the classic overlay patterns are implemented.** No modal, drawer (aside from the mobile nav drawer, which is navigation, not a content overlay), popover, tooltip, dropdown menu (beyond native `<select>`), or confirmation dialog exists anywhere in the app. The mobile nav is the closest analogue to a "drawer" pattern and can serve as a starting visual reference (full-bleed dark panel, staggered link entrance) if a true modal/drawer is needed later.

## 19. Tables and Data Display

**Verified — no `<table>` element or data-table component exists anywhere in the app.** Product data is always presented as cards or key/value "spec grid" blocks (`.spec-grid` in `ProductPage.jsx`, rendered as a CSS grid of label/value pairs, not a semantic table). If a future admin surface needs tabular data, this will be new design territory not covered by the existing system.

## 20. Page Templates

**Verified templates actually in use, mapped to live routes:**

| Template | Used by | Structure |
|---|---|---|
| Landing/Home | `HomePage.jsx` (`/`) | Video hero → collection grid → category rail → featured products → split showcase → new arrivals → offer band → best sellers → trust band → testimonials → Instagram-style image strip → appointment CTA → newsletter → blog preview |
| Listing | `ShopPage.jsx` (`/shop`, category routes, `/wishlist`) | `.shop-hero` header → sidebar filters + toolbar (count, sort) → product grid or empty state |
| Detail | `ProductPage.jsx` (`/product/:slug`) | Gallery + info panel → long-copy description/specs/care → trust band → reviews → related products → recently viewed |
| Cart | `CartPage.jsx` (`/cart`) | `.shop-hero` header → cart item list + order summary sidebar |
| Form/Checkout | `CheckoutPage.jsx` (`/checkout`) | `.shop-hero` header → checkout form + summary sidebar |
| Simple/Info | `SimplePage.jsx` (11 static content types) | `.shop-hero` header → either an article grid (blog) or a glass-panel info block + trust band |
| Error | `NotFoundPage.jsx` | Minimal — uses `ButtonLink` to return home; **[GAP]** not yet reviewed against the rest of the design system in depth — verify visual consistency here during Phase 2 |
| Settings/Dashboard | **Not implemented** — no such page exists. |

## 21. Animation and Motion

- **Duration scale (Verified, sampled values):** `.25s` (hover/interaction transitions — the dominant duration), `.28s`–`.3s` (menu toggle/mobile nav), `.7s`–`.8s` (image zoom on hover, scroll-reveal).
- **Easing:** Predominantly `ease`; scroll-reveal uses a custom cubic-bezier (`cubic-bezier(.2,.7,.2,1)`) for a more deliberate "settle" feel.
- **Hover transitions:** Color/background/border/transform shifts on links, buttons, and product images (subtle scale/zoom on card images).
- **Page transitions:** **None** — navigation is a full browser page load (see Architecture.md ADR-001), so there is no client-side page-transition animation.
- **Modal transitions:** N/A — no modals exist.
- **Scroll animations:** Implemented via `Reveal.jsx` (an `IntersectionObserver`-based fade/slide-up-on-scroll wrapper, class `.reveal`, with a `--reveal-delay` custom property for staggering).
- **Loading animation:** **None exists** — no async operations currently require one.
- **Reduced-motion behavior (Verified):** `@media (prefers-reduced-motion: reduce)` in `styles.css` disables/shortens `scroll-behavior`, `animation-duration`, `animation-iteration-count`, and `transition-duration` globally — this is a genuinely good existing accessibility feature and must be preserved in any future CSS changes.

## 22. Accessibility

- **Minimum contrast:** Not formally measured (see §4). **Action item, not yet complete.**
- **Focus styles:** Not explicitly defined for buttons/inputs/links beyond browser defaults (see §13/§14 gaps). **Action item.**
- **Touch-target size:** Not formally audited; several buttons (e.g., `.quantity-control button` at `34px × 34px`) are close to but may fall slightly short of the commonly recommended 44×44px minimum touch target — worth reviewing in a dedicated accessibility pass (Phases.md Phase 8, or earlier if prioritized).
- **Keyboard behavior:** Native interactive elements are used throughout (`<button>`, `<a>`, `<input>`, `<select>`), which provides baseline keyboard operability by default; no custom keyboard-trap risk was identified (e.g., the mobile menu does not appear to trap focus, which is itself worth verifying explicitly as a future accessibility task).
- **Form-error behavior:** **Not implemented** (no validation exists yet — see §14).
- **Screen-reader labels:** Present for icon-only/ambiguous controls (`aria-label` on wishlist heart, cart/wishlist header links, menu toggle; `aria-expanded`/`aria-hidden` on the mobile menu) — this existing pattern should be replicated for any new icon-only control.
- **Semantic structure:** Generally good — `<header>`, `<nav>`, `<main>` (via `SiteLayout`), `<footer>`, `<article>`, `<section>` are used appropriately throughout.
- **Reduced-motion support:** Implemented globally (see §21) — a genuine strength of the current codebase.

## 23. Content Style

**Verified, from actual copy across the app:**
- **Heading style:** Sentence case for most headings (e.g., "Luxury jewellery crafted for life's finest occasions."), not Title Case.
- **Button labels:** Action-oriented, concise ("Shop Collection", "Add to Cart", "Book Appointment", "Buy Now (Demo)" — note the explicit "(Demo)" qualifier used to keep the non-functional nature honest to the user).
- **Error messages:** N/A — none exist yet to establish a pattern from.
- **Empty-state language:** Plain, direct ("No jewellery found.", "Your cart is empty.", "Your wishlist is empty.").
- **Confirmation language:** N/A — none exists yet (flagged as a Phase 2 gap).
- **Capitalization:** Mixed Title Case for nav/footer labels, sentence case for body copy and headings — consistent with current usage; preserve this distinction rather than forcing uniform casing.
- **Date formatting:** No real dates are rendered anywhere (blog posts use category labels like "Buyer Guide" instead of actual dates) — no date-format convention has been established yet.
- **Number formatting:** `Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })` — Indian-locale currency formatting with no decimal places (Verified in `data.js` `formatPrice`). Any future numeric display should follow this same locale convention for consistency.
- **Currency formatting:** As above — always INR, always via `formatPrice`, never hardcoded `₹` string concatenation. Preserve this pattern for any new price display.

## 24. Design Tokens

CSS custom properties, exactly as implemented in `src/styles.css` `:root` (the authoritative, implementation-ready token set):

```css
:root {
  --ink: #080705;
  --ink-2: #11100c;
  --gold: #d6ad62;
  --gold-2: #f3d58a;
  --paper: #f7f1e7;
  --ivory: #fffaf0;
  --muted: #8f8678;
  --line: rgba(214, 173, 98, 0.22);
  --glass: rgba(17, 16, 12, 0.62);
  --shadow: 0 24px 80px rgba(0, 0, 0, 0.32);
  --max: 1440px;
  --pad: clamp(20px, 4vw, 72px);
  --serif: "Iowan Old Style", "Baskerville", "Times New Roman", serif;
  --sans: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}
```

Any new token must be added to this block and documented here in the same change — do not introduce ad hoc new custom properties scattered elsewhere in the stylesheet.

## 25. Component State Matrix

| Component | Default | Hover | Focus | Active | Selected | Loading | Disabled | Empty | Error | Success |
|---|---|---|---|---|---|---|---|---|---|---|
| Primary button (`.button-link` group) | ✅ Verified | ✅ Verified | ❌ Not styled | ❌ Not styled | N/A | ❌ N/A today | ❌ Not styled | N/A | N/A | N/A |
| Shop filter button | ✅ Verified | Implied by base button rules | ❌ Not styled | N/A | ✅ `.is-active` | N/A | N/A | N/A | N/A | N/A |
| Wishlist icon button | ✅ Verified | Implied | ❌ Not styled | N/A | ✅ `.is-active` | N/A | N/A | N/A | N/A | N/A |
| Product card | ✅ Verified | ✅ Image zoom/transform | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A |
| Checkout form fields | ✅ Verified (base only) | ❌ Not styled | ❌ Not styled | N/A | N/A | N/A | ❌ Not styled | N/A | ❌ Not implemented | ❌ Not implemented |
| Shop grid | ✅ Verified | N/A | N/A | N/A | N/A | N/A | N/A | ✅ `emptyMessage` | N/A | N/A |

Cells marked ❌ are genuine, verified gaps — not oversights in this document. They should be prioritized according to Phases.md before this design system can be considered accessibility-complete.

## 26. Design QA Checklist

Use this before considering any UI change "done" (ties directly to Rules.md §25):

- [ ] Brand consistency: uses only the tokens in §24, the serif/sans usage rules in §6, and existing component patterns in §13–§20.
- [ ] Spacing consistency: uses `--pad`/`--max` and matches the visual rhythm of `.commerce-section`.
- [ ] Typography consistency: serif for headings/prices, sans for everything else; weight stays at 400 unless a clear, approved reason exists to deviate.
- [ ] Responsive validation: checked at both 1180px and 760px breakpoints.
- [ ] Contrast validation: new text/background combinations checked against WCAG AA, especially gold-on-dark and gold-on-cream pairings.
- [ ] Focus-state validation: every new interactive element has a visible focus indicator (even though this is currently a gap app-wide, do not add more untested elements to the gap — fix forward).
- [ ] Component-state validation: hover/active/selected/disabled states considered and either implemented or explicitly deferred with a note.
- [ ] Layout-shift check: new images/content don't cause visible reflow on load.
- [ ] Cross-browser check: verify the serif font fallback renders acceptably on a non-Apple platform (Windows/Android), given the known font-loading gap in §6.
