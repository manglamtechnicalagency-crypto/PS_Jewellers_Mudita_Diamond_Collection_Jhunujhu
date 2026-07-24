# Project Requirements Document

> **Current implementation correction — 2026-07-24:** The project is **PS Jewellers**, not Vedant Jewellers. It is a Next.js 16 + TypeScript + Tailwind client-demo storefront. Product data is static (`src/data.ts`), browser-only cart state is stored in `localStorage`, and checkout remains a clearly labelled non-payment demo. The only backend surface is the protected R2 presign route. References below to Vite, `src/pages`, Supabase, Sanity, or a live commerce backend are historical and must not be used for implementation. See `Memory.md` and `docs/security/` for the current verified state.

## 1. Document Information

- **Project name:** Vedant Jewellers — E-commerce Demo Website (repo name: `motion-photography-react-clone`)
- **Version:** 1.0.0 (per `package.json`)
- **Status:** Working front-end prototype / client demo. No backend, no real commerce processing.
- **Last updated:** 2026-07-24
- **Document owner:** Unassigned — **[OPEN QUESTION]** who owns this document going forward (agency, freelancer, or PS Jewellers internal team)?
- **Stakeholders:** PS Jewellers / Vedant Jewellers (client), the development team producing this demo. No other stakeholders are identified in the repository.

> **Verification note:** This PRD is reconstructed entirely from the current codebase (`src/`, `package.json`, `README.md`, `index.html`) because no pre-existing product requirements document, ticket tracker, or brief was found in the repository. Every requirement below is either **Verified** (observed directly in code) or **Assumed** (inferred business intent, explicitly marked). Nothing here should be treated as a confirmed business decision until a stakeholder signs off.

## 2. Project Overview

**Product summary (Verified):** A single-page React application that presents a fictional/demo luxury jewellery brand, "Vedant Jewellers" (Bikaner, Rajasthan), as a front-end-only e-commerce catalogue. It includes a home page, shop/listing page with filters and sorting, product detail pages, a client-side cart, a non-functional checkout form, a wishlist, and several static informational pages (About, Contact, FAQ, Store Locator, Order Tracking, Blog, Policies).

**Business context (Assumed):** The repository name (`motion-photography-react-clone`) and README ("Editable React/Vite reconstruction of the published Framer website... clean-room React reconstruction based on the public website") indicate this project began as a rebuild of an unrelated photography portfolio site built in Framer, and was subsequently re-skinned with jewellery e-commerce content and copy. This is a verified fact about the codebase's origin, not an assumption — the original photography components and pages (`AboutStudio`, `Hero`, `JournalStrip`, `Moments`, `SelectedWork`, `Services`, `Testimonials`, `FAQ`, `PageHero`, and pages `AboutPage.jsx`, `ContactPage.jsx`, `JournalPage.jsx`, `PortfolioPage.jsx`, `ProjectPage.jsx`) still exist in `src/` but are **not imported or routed by `src/App.jsx`** — they are orphaned/dead code from the earlier template. See Architecture.md §2 for the full list.

**Core problem (Assumed):** PS Jewellers / Vedant Jewellers needs a visual, interactive demonstration of what a premium jewellery e-commerce storefront could look like, to support a sales pitch, design review, or early-stage product conversation — not a production commerce system.

**Proposed solution (Verified, as implemented):** A static-content React SPA with hardcoded demo product data (`src/data.js`, 18 products), client-side state for cart/wishlist/recently-viewed persisted to `localStorage`, and no server, database, authentication, or payment integration of any kind.

**Product vision (Assumed):** Evolve this prototype into a real, transactable jewellery e-commerce platform for Vedant Jewellers, replacing the demo product catalogue with real inventory, wiring the checkout to a real payment gateway, and adding an admin/back-office system. This is an assumption because no such roadmap exists in the repo; it is the logical "next step" implied by the presence of cart/checkout UI. **[OPEN QUESTION]** Confirm with stakeholder whether the end goal is a production store or a permanent interactive demo/pitch asset.

**Project objectives (Assumed, pending confirmation):**
1. Present the Vedant Jewellers brand attractively across devices.
2. Demonstrate a believable shopping flow (browse → filter → product detail → cart → checkout) without real transactions.
3. Serve as a foundation that can later be connected to real data and payments if approved.

## 3. Goals

**Primary goals (Assumed, based on current implementation):**
- Ship a polished, responsive, demo-quality jewellery storefront that can be shown to the client/stakeholders.
- Showcase core e-commerce UX patterns: catalogue browsing, filtering, sorting, search, product detail, cart, wishlist, checkout form.

**Secondary goals (Assumed):**
- Keep the codebase small and dependency-light (currently only `react`, `react-dom`, `vite` — see Architecture.md).
- Deploy easily to static hosts (Vercel and Netlify config files are both present and verified).

**Measurable success criteria:** None are defined anywhere in the repository. **[OPEN QUESTION — must be answered by stakeholder before Phase-based work can claim "done":]**
- What conversion, engagement, or presentation metric defines success for this demo?
- Is there a target launch date or client review date?

## 4. Non-Goals

Explicitly out of scope for the **current** implementation (Verified — none of the following exist in code):
- Real payment processing of any kind (checkout form has no payment gateway integration; the copy explicitly states "No real payment is collected. This is only a frontend ecommerce demo.")
- User authentication / account creation / login (the `/account` route renders static placeholder copy only)
- Order persistence, order history, or order tracking beyond a static placeholder page
- A backend, API, or database — all data is hardcoded in `src/data.js`
- Real inventory management, admin dashboard, or content management system
- Email/SMS notifications of any kind
- Real store-locator map integration (static text only)
- The legacy photography-portfolio content (About Studio, Journal, Portfolio, Moments, Services, motion-photography Testimonials/FAQ) — this is dead code left over from the project's origin and is **not part of the current product** even though the files remain in the repo

## 5. Target Users

### 5.1 Jewellery Shopper (site visitor / demo viewer)
- **Description:** A prospective customer browsing gold, diamond, and bridal jewellery online.
- **Needs:** Browse by category, see pricing, purity, weight, certification, and reviews; save favourites; simulate adding items to a cart.
- **Pain points (Assumed):** Difficulty trusting jewellery purchased online without certification/hallmark transparency; wanting to compare pieces before an in-store visit.
- **Technical ability:** General consumer, any device, no assumed technical skill.
- **Main actions:** Browse home page, filter/search shop page, view product detail, add to cart/wishlist, attempt checkout, book an appointment, find the store.
- **Expected outcomes:** Confidence in product information; ability to shortlist items before an in-person or phone purchase.

### 5.2 Client Stakeholder / Reviewer (PS Jewellers)
- **Description:** The business owner or marketing decision-maker evaluating the demo.
- **Needs:** See a professional, on-brand storefront that reflects the store's positioning (Bikaner, Rajasthan; BIS hallmark; certified diamonds; bridal focus).
- **Pain points (Assumed):** Needs to judge design quality and completeness quickly, without technical setup.
- **Technical ability:** Non-technical.
- **Main actions:** Click through the deployed demo URL, review pages on desktop and mobile.
- **Expected outcomes:** A go/no-go or feedback decision on visual direction and scope.

### 5.3 Developer / AI Coding Agent (maintainer)
- **Description:** Whoever extends this codebase next (human or AI agent).
- **Needs:** Clear architecture, rules, and roadmap to avoid reintroducing dead code or breaking the working demo.
- **Main actions:** Read this documentation set before making changes.
- **Expected outcomes:** Predictable, additive changes; no silent scope expansion.

## 6. User Personas

> **Assumed** — no persona research exists in the repo. These are illustrative placeholders only and require stakeholder validation.

**Priya, 29, Bridal Shopper.** Planning her wedding, researching bridal necklace sets online before visiting a Bikaner showroom in person. Wants certification and hallmark clarity, and to shortlist 3–4 designs via wishlist before her appointment.

**Amit, 42, Gold Investor/Buyer.** Regularly buys gold jewellery for family occasions. Price-sensitive, compares purity (22K) and weight across pieces, sorts by price.

**Meera, 35, Store Owner (PS Jewellers stakeholder).** Wants a digital storefront that matches the showroom's premium positioning and can eventually take real orders.

## 7. User Stories

Each story reflects **currently implemented** behavior unless marked "(Future)". Acceptance criteria describe the verified current behavior — they are not aspirational unless labeled.

**US-1.** As a shopper, I want to browse featured, best-selling, and new-arrival products on the home page, so that I can quickly discover jewellery I might like.
- Acceptance criteria (Verified): Home page (`HomePage.jsx`) renders featured (first 8), best-seller (badge-filtered, max 4), and new-arrival (badge-filtered, max 4) product sets from `src/data.js`.

**US-2.** As a shopper, I want to filter and sort the full catalogue by category and price/rating, so that I can find relevant pieces.
- Acceptance criteria (Verified): `ShopPage.jsx` supports category filter buttons (from `categories` in `data.js`), a sort dropdown (Featured, Price Low→High, Price High→Low, Top Rated), and free-text search across name, id, category, collection, SKU, purity, weight, stone type, occasion, description, highlights, and specs.

**US-3.** As a shopper, I want to view full product details, including price, hallmark, certification, specs, care instructions, and reviews, so that I can evaluate a purchase.
- Acceptance criteria (Verified): `ProductPage.jsx` displays a gallery (with optional hero video for the primary image), pricing with discount, product code/SKU, highlights, a spec grid (category, collection, purity, weight, stone type, occasion, hallmark, certification, plus per-product `specs`), care instructions, static trust badges, and hardcoded reviews. Related products (same category/collection) and recently-viewed products are shown.

**US-4.** As a shopper, I want to add items to a cart and adjust quantities, so that I can simulate a purchase.
- Acceptance criteria (Verified): `CartPage.jsx` lists cart items with quantity +/- controls and a running subtotal; cart state persists to `localStorage` under key `vedant-cart`.

**US-5.** As a shopper, I want to save items to a wishlist, so that I can revisit them later.
- Acceptance criteria (Verified): Wishlist toggle available on `ProductCard` and `ProductPage`; wishlist state persists to `localStorage` under key `vedant-wishlist`; `/wishlist` route shows only wishlisted products via `ShopPage`.

**US-6.** As a shopper, I want to fill out a checkout form, so that I can simulate placing an order.
- Acceptance criteria (Verified): `CheckoutPage.jsx` renders a form (name, mobile, email, address, payment method selector) that does not submit anywhere — `onSubmit` calls `event.preventDefault()` only. No order is created, stored, or transmitted. This is explicitly labeled in the UI copy as a non-functional demo.

**US-7.** As a shopper, I want to search for products via the header search bar, so that I can jump directly to relevant results.
- Acceptance criteria (Verified): `Header.jsx` search form navigates to `/shop?search=<query>` via a full page reload (`window.location.href`); `App.jsx` reads the `search`/`q` query param on load to seed `searchTerm`.

**US-8. (Future/Assumed)** As a shopper, I want to create an account and log in, so that I can track real orders.
- Not implemented. `/account` is a static placeholder page only.

**US-9. (Future/Assumed)** As a shopper, I want to complete a real payment, so that I can actually purchase jewellery online.
- Not implemented. No payment gateway is integrated.

## 8. Functional Requirements

Grouped by module. Priorities reflect what would be required if this demo becomes a real product; current implementation status is noted per feature.

### 8.1 Catalogue & Browsing
| Feature | Description | Roles | Inputs | Processing | Outputs | Validation | Errors | Permissions | Dependencies | Acceptance Criteria | Priority | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Home page merchandising | Featured/new/best-seller product rails | Shopper | none | Filters static `products` array by `badge` field | Rendered product grids | N/A (static data) | None (no error states; empty arrays render nothing) | Public | `src/data.js` | Verified: renders without runtime errors | P0 | Implemented |
| Category shop grid | Filterable/sortable product listing | Shopper | Category click, sort dropdown, search text, URL path (e.g. `/gold-jewellery`) | Client-side `Array.filter`/`sort` in `ShopPage.jsx` | Filtered/sorted grid, result count | None | "No jewellery found." empty state (Verified, `emptyMessage` prop) | Public | `src/data.js`, `App.jsx` category-to-path map | Verified | P0 | Implemented |
| Product detail | Full product info page | Shopper | URL slug (`/product/:slug`) | Lookup in `products` by `slug`; falls back to `products[0]` if not found (no 404) | Detail view, related, recently viewed | None | **Gap:** invalid slugs silently show the first product instead of a not-found state | Public | `src/data.js` | Partially correct — see Known Issues in Architecture.md | P1 | Implemented, with defect |
| Free-text search | Search across product fields | Shopper | Query string | Case-insensitive substring match across concatenated searchable fields | Filtered results | None | Empty results show `emptyMessage` | Public | `ShopPage.jsx` | Verified | P1 | Implemented |

### 8.2 Cart & Wishlist
| Feature | Description | Roles | Inputs | Processing | Outputs | Validation | Errors | Permissions | Dependencies | Acceptance Criteria | Priority | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Add to cart | Add product / increment quantity | Shopper | Product click | `App.jsx` `addToCart` merges into `cart` state array `{id, quantity}` | Updated cart badge count | None | None | Public | `localStorage` (`vedant-cart`) | Verified | P0 | Implemented |
| Update cart quantity | Increment/decrement/remove | Shopper | +/- buttons | `updateCart(id, quantity)`; quantity ≤ 0 removes item | Updated cart list & subtotal | None | None | Public | same | Verified | P0 | Implemented |
| Wishlist toggle | Add/remove favourite | Shopper | Heart icon click | `toggleWishlist` flips membership in `wishlist` array | Wishlist badge count, `/wishlist` listing | None | None | Public | `localStorage` (`vedant-wishlist`) | Verified | P1 | Implemented |
| Recently viewed | Track last 6 viewed products | Shopper | Product page visit | `addRecentlyViewed` unshifts id, dedupes, slices to 6 | "Recently Viewed" rail on product page | None | None | Public | `localStorage` (`vedant-recent`) | Verified | P2 | Implemented |

### 8.3 Checkout (Non-functional demo)
| Feature | Description | Roles | Inputs | Processing | Outputs | Validation | Errors | Permissions | Dependencies | Acceptance Criteria | Priority | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Checkout form | Collect name/mobile/email/address/payment method | Shopper | Form fields | **None** — form submit is intercepted and discarded | No order is created | **None implemented** — no required-field validation, no email/phone format checks | **None implemented** — submission is a no-op | Public | none | Verified as non-functional by design | N/A (demo only) | Implemented as UI shell only |
| Real checkout processing | Persist order, charge payment | Shopper | — | — | — | — | — | — | Payment gateway (none selected) | Not implemented | P0 for any future production launch | **Missing** |

### 8.4 Informational Pages
| Feature | Description | Status |
|---|---|---|
| About, Contact, FAQ, Store Locator, Order Tracking, Book Appointment, Blog, Privacy Policy, Terms, Return Policy | All rendered via one shared `SimplePage.jsx` component keyed by a `type` prop, with hardcoded copy in a `copy` object | Implemented as static content; no forms submit anywhere except Contact/Book Appointment, which have **no input form at all** — they display text only |

## 9. Core Modules

Only modules actually present or clearly implied are listed.

- **Catalogue** (Verified — implemented): product data, listing, filtering, search, detail view.
- **Cart** (Verified — implemented, client-side only): add/update/remove, subtotal.
- **Wishlist** (Verified — implemented, client-side only).
- **Checkout UI** (Verified — implemented as non-functional shell).
- **Static Content / CMS-like pages** (Verified — implemented as hardcoded JSX, not a real CMS).
- **Authentication** (Missing — not implemented; `/account` is a placeholder).
- **Admin Dashboard** (Missing — not implemented; no admin surface exists anywhere).
- **Payments** (Missing — not implemented).
- **Order Management** (Missing — not implemented; `/order-tracking` is a static placeholder).
- **Notifications** (Missing — not implemented).
- **Search** (Verified — implemented client-side only, no backend indexing).

## 10. Roles and Permissions

**Verified:** The application has exactly one implicit role — **Public Visitor**. There is no authentication, session, or role differentiation anywhere in the code. Every route and action is available to anyone who loads the page.

| Capability | Public Visitor | Admin (Future/Assumed) |
|---|---|---|
| View catalogue | ✅ | ✅ |
| Add to cart/wishlist | ✅ (client-side only) | ✅ |
| Checkout | UI only, non-functional | N/A |
| Manage products | ❌ Not implemented | Would be required (Future) |
| View orders | ❌ Not implemented | Would be required (Future) |
| Manage users | ❌ Not implemented | Would be required (Future) |

**[OPEN QUESTION]** If this becomes a real store, will PS Jewellers manage inventory themselves (requiring an admin role) or will inventory be managed externally?

## 11. User Flows

### 11.1 Browse → Product Detail → Cart (Verified, implemented)
1. Visitor lands on `/` (Home).
2. Clicks a category, collection, or product card.
3. Arrives at `/shop` (optionally pre-filtered) or `/product/:slug`.
4. On the shop page, filters by category, sorts, or searches.
5. Clicks a product to view `/product/:slug`.
6. Clicks "Add to Cart" — cart badge updates immediately; no page navigation required.
7. Optionally clicks the cart icon to review `/cart`, adjusts quantities.
8. Clicks "Proceed to Checkout" → `/checkout`.
9. Fills the form and submits — **no data is sent anywhere; the page does not change or confirm anything.** This is a UX gap even for a demo (see Architecture.md Known Issues) — a "demo order placed" confirmation state does not exist.

### 11.2 Search Flow (Verified)
1. Visitor types in the header search box (desktop or mobile menu).
2. Submits the form → full-page navigation to `/shop?search=<term>`.
3. `App.jsx` reads the query param on load and seeds `searchTerm`.
4. `ShopPage.jsx` filters the catalogue against the term.

### 11.3 Wishlist Flow (Verified)
1. Visitor clicks the heart icon on any product card or the product detail page.
2. Item toggles in/out of `wishlist` state, persisted to `localStorage`.
3. Visitor navigates to `/wishlist` to see only wishlisted items (rendered via `ShopPage` with `customProducts`).

### 11.4 Registration / Login (Not implemented)
No such flow exists. `/account` renders static placeholder text only.

### 11.5 Payment Flow (Not implemented)
No such flow exists beyond the non-functional checkout form described above.

## 12. Data Requirements

**Core entity: Product** (defined in `src/data.js`, 18 hardcoded records). Verified fields per product:
`id, slug, name, category, collection, sku, price, offerPrice, discount, availability, hallmark, certification, purity, weight, stoneType, occasion, image, video (optional), images[], rating, reviewsCount, badge, highlights[], description, specs{}, care[], reviews[]{name, rating, comment}`

**Other static entities (Verified, all hardcoded arrays/objects in `data.js`):** `categories` (14 strings), `collections` (4 objects: title, copy, image), `offers` (3 strings), `trustItems`, `testimonials` (3), `blogPosts`/`journalPosts` (3, aliased), `projects` (derived map of `products`, appears to be leftover support for the orphaned `ProjectPage.jsx`/`PortfolioPage.jsx`).

**Client-side state entities (Verified, in `localStorage`, unencrypted, no expiry):**
- `vedant-wishlist`: array of product ids
- `vedant-cart`: array of `{id, quantity}`
- `vedant-recent`: array of up to 6 product ids

**Data ownership:** All product data is hardcoded in source and shipped in the client bundle. There is no data owner or update workflow — changing a product requires a code change and redeploy.

**Data retention:** `localStorage` persists indefinitely on the visitor's device until cleared; there is no server-side retention because there is no server.

**Sensitive data:** None is currently collected (checkout form fields are never transmitted or stored). **If checkout is made functional in the future**, name/mobile/email/address will become PII requiring explicit handling — see Rules.md §15 and PRD §16.

**Validation requirements:** None currently exist on any form field. This is a gap that must be addressed before any form becomes functional (P0 for Future).

## 13. Integrations

**Verified — none.** No third-party API, SDK, analytics, payment gateway, CMS, or messaging service is wired into the code. Image assets reference the public Unsplash CDN by hot-linked URL (`images.unsplash.com`) for all non-hero product photography — this is a **licensing risk**, not a real integration (see Risks §21).

| Integration | Status |
|---|---|
| Payment gateway | Not integrated — **[OPEN QUESTION]** which gateway (Razorpay, Stripe, PayU, etc.) is required for India-based transactions? |
| Analytics | Not integrated |
| Email/SMS | Not integrated |
| Maps / Store locator | Not integrated (static text) |
| CMS | Not integrated (content hardcoded in `data.js` and JSX) |
| Unsplash (image hotlinking) | De facto dependency; not a formal integration; must be replaced with licensed/owned photography before production use per README's own disclaimer |

## 14. Notifications

**Verified — none implemented.** No email, SMS, push, or in-app notification exists anywhere in the codebase.

## 15. Non-Functional Requirements

- **Performance:** No code-splitting, lazy loading, or image optimization is implemented. All 18 product images are Unsplash-hosted with `?w=1400` query params (no responsive `srcset`). **Measurable target: [OPEN QUESTION — none defined; recommend Lighthouse Performance ≥ 90 on mobile before production].**
- **Scalability:** N/A at present — static SPA with no backend. Scaling considerations only apply once real data/backend are introduced.
- **Security:** No authentication, no server, no secrets in the current build — attack surface is minimal today, but see Rules.md/Architecture.md for requirements once forms and payments become real.
- **Accessibility:** Not audited. Header/mobile menu use `aria-label`/`aria-expanded`; most interactive elements lack focus-visible styling verification. **Target: WCAG 2.1 AA — not currently verified.**
- **SEO:** `index.html` has a single static `<title>` and `<meta description>` for the entire SPA; there is no per-route meta tag management (no `react-helmet` or equivalent), so `/shop`, `/product/:slug`, etc. all share identical title/description. This is a real SEO gap.
- **Reliability / Availability:** Static hosting (Vercel/Netlify configs present) implies high availability at the CDN level; no uptime target is defined.
- **Maintainability:** Codebase is small (~2,600 lines) but contains significant dead code (see Architecture.md §2), which increases maintenance risk if not cleaned up.
- **Browser support:** Not documented. Assume evergreen browsers (Chrome, Safari, Edge, Firefox, latest 2 versions) given the modern React/Vite stack. **[OPEN QUESTION]** IE11 or older Android WebView support is not a design goal.
- **Device support:** CSS includes breakpoints at 1180px and 760px (Verified in `styles.css`), indicating desktop/tablet/mobile responsive intent.
- **Localization:** Single-language (English) content; currency formatting uses `Intl.NumberFormat("en-IN", { currency: "INR" })` (Verified in `data.js`). No i18n framework present.
- **Observability:** None. No logging, error tracking, or monitoring of any kind.

## 16. Security Requirements

**Current state (Verified):** Minimal attack surface — no server, no auth, no secrets, no data transmission. The primary risks today are client-side only (e.g., XSS if user-controlled content is ever rendered without escaping — not currently the case since React auto-escapes and no `dangerouslySetInnerHTML` is used anywhere in the codebase — verified by absence of that string in `src/`).

**Requirements for any future production version (not yet applicable, documented for planning):**
- Authentication: not designed yet — **[OPEN QUESTION]**.
- Authorization: not designed yet.
- Input validation: must be added to the checkout form and any future account forms, both client- and server-side.
- Password storage: N/A until accounts exist; must use a modern adaptive hash (e.g., bcrypt/argon2) when implemented.
- Session handling: N/A until a backend exists.
- CSRF/XSS protection: N/A today (no state-changing server requests exist); required once a backend is added.
- Injection prevention: N/A today (no database).
- Rate limiting: N/A today.
- File-upload security: N/A — no upload feature exists.
- Secrets management: N/A today — no `.env` file or example exists in the repo at all. **[GAP]** If a payment gateway or analytics key is added later, a `.env.example` must be created and secrets must never be committed.
- Audit logging: N/A today.
- Data privacy: No personal data is currently collected or stored server-side. If checkout becomes functional, a privacy policy update and data-handling review are required (the current `/privacy-policy` page is placeholder copy only).

## 17. Analytics and Tracking

**Verified — none implemented.** No analytics events, conversion tracking, user properties, or KPI dashboards exist in the codebase.

## 18. Assumptions

1. This project is a client-facing demo/pitch asset, not (yet) a production e-commerce store — **inferred from checkout copy explicitly stating "No real payment is collected."**
2. "Vedant Jewellers" is a placeholder brand name used for this demo and may differ from the final PS Jewellers branding. **[OPEN QUESTION]**
3. The client wants a mobile-responsive experience (inferred from the presence of breakpoints and a mobile menu).
4. The eventual goal may be a real transactable store — not confirmed.
5. Product images sourced from Unsplash are placeholders only and are expected to be replaced with licensed/owned photography before any public or commercial launch (this is explicitly stated in the README's disclaimer).

## 19. Constraints

- **Budget:** Unknown — not documented.
- **Technology:** Project already committed to React 19 (via `"latest"` in `package.json`) + Vite + plain CSS, no TypeScript despite `typescript` being listed as a dependency (see Architecture.md — this is currently unused/dead weight).
- **Time:** Unknown — no deadline documented.
- **Legal:** Hotlinked Unsplash imagery must be replaced or properly licensed before commercial launch; "BIS Hallmark" and "certification" claims are marketing copy for a demo and must not be presented as real certifications to real customers.
- **Platform:** Static hosting only (Vercel/Netlify configured); no server runtime is currently provisioned.
- **Team:** Unknown — not documented.

## 20. Dependencies

**Internal:** None — this is a standalone repository with no shared libraries or monorepo packages.

**External (Verified in `package.json`):** `react`, `react-dom`, `vite`, `@vitejs/plugin-react`, `typescript` (declared but unused — no `.ts`/`.tsx` files exist and no `tsconfig.json` is present in the repo).

## 21. Risks

| Risk | Probability | Impact | Mitigation | Owner |
|---|---|---|---|---|
| Hotlinked Unsplash images break, change, or create licensing exposure | Medium | Medium | Replace with owned/licensed, locally-bundled assets before production; already flagged in README | Unassigned |
| Dead "photography portfolio" code (About/Journal/Portfolio/Project pages and their components) confuses future contributors or AI agents into resurrecting unrelated features | High (already caused ambiguity in this PRD's authoring) | Medium | Explicitly document as dead code (done here); remove in a dedicated cleanup phase (see Phases.md Phase 1) | Unassigned |
| Checkout form gives no confirmation feedback, creating a broken-feeling UX even for a labeled demo | High | Low–Medium | Add a clear "Demo order simulated" success state (see Phases.md) | Unassigned |
| Invalid product slug silently falls back to `products[0]` instead of a 404, hiding bugs and confusing SEO/crawlers | Medium | Low | Route to `NotFoundPage` for unknown slugs | Unassigned |
| No real validation on checkout inputs; if a backend is bolted on quickly, unsanitized input could be persisted | Low today, High if checkout is wired to a backend without review | High (future) | Enforce validation rules before connecting any backend (see Rules.md) | Unassigned |
| No documented business requirements before this PRD; risk of scope drift without stakeholder sign-off | High | High | Require explicit stakeholder confirmation of Open Questions before further feature work | Unassigned |

## 22. Acceptance Criteria

The **current demo** is considered complete for its stated purpose when:
- All routes in `App.jsx` render without console errors on desktop and mobile viewport widths.
- `npm run build` completes successfully and `npm run preview` serves the built site correctly.
- Dead legacy photography-template files are either removed or explicitly documented as intentionally retained (see Phases.md Phase 1).
- Checkout, cart, and wishlist flows behave as described in §7/§8 above.

Acceptance criteria for a **future production store** cannot be finalized until the Open Questions in §23 are answered by the stakeholder.

## 23. Open Questions

1. Is the end goal a permanent interactive sales/demo asset, or a path to a real transactable e-commerce store?
2. Who is the confirmed document owner and business stakeholder for sign-off?
3. Should the orphaned photography-portfolio pages/components be deleted, or is there a reason to keep them (e.g., reused on a different property)?
4. If a real store is the goal: which payment gateway, which order-management approach, and who manages inventory (the client or a developer)?
5. What is the correct final brand name — "Vedant Jewellers" or "PS Jewellers" — and is the Bikaner, Rajasthan location detail accurate or placeholder?
6. What is the target launch date or next review milestone?
7. Are the Unsplash-hosted images acceptable for a private demo, or must they be replaced immediately for legal reasons even pre-launch?

## 24. Future Enhancements

Explicitly excluded from the current release, valid for later consideration once the Open Questions above are resolved:
- User accounts, authentication, and order history.
- Real payment gateway integration.
- Admin/back-office product and inventory management.
- Real store-locator map (e.g., Google Maps embed).
- Email/SMS order notifications.
- Per-route SEO metadata and structured data (schema.org Product markup) for real search visibility.
- Analytics and conversion tracking.
- Replacing hardcoded `data.js` with a real CMS or headless commerce backend.
