# PS Jewellers — session handoff

**Repo:** `manglamtechnicalagency-crypto/PS_Jewellers_Mudita_Diamond_Collection_Jhunujhu`
**Branch:** `main` @ `507af95` — local and `origin/main` identical. This handoff file is currently untracked.
**Stack:** Next.js 16.2.11 (App Router, Turbopack) · React 19 · TS strict · Tailwind · Supabase · Cloudflare R2 · Vercel
**Production:** https://ps-jewellers-mudita-diamond-collect.vercel.app
**Supabase project ref:** `rghpbiltmbqetmqfyjte`

Everything below is merged to `main` and deployed unless flagged otherwise.

---

## 1. Open items — read this first

### 1.1 BLOCKING: production DB is missing migration 0017

`supabase/migrations/0017_product_care_instructions.sql` was never applied to
production. It adds `products.care_instructions`.

The admin product editor sends `careInstructions` on **every** save (built from
`textFields`, sent as `""` when blank), so every product save against that
database hit a Postgres `42703`/`PGRST204` and surfaced as a bare
*"Product could not be updated"*.

Code now degrades gracefully (see §2.3), but **the field will not persist until
the column exists.** Verify:

```sql
select column_name from information_schema.columns
where table_schema='public' and table_name='products'
  and column_name='care_instructions';
```

Zero rows ⇒ run `0017_product_care_instructions.sql`. It is
`add column if not exists`, so it is safe to run regardless.

**Audit the other migrations at the same time.** If 0017 was skipped, others
likely were too.

### 1.2 `0020_remove_book_appointment.sql` has not been run anywhere

Committed but never executed. It is **destructive**: `drop table if exists
public.appointments cascade`, plus deletes the `book-appointment` row from
`pages` and strips `secondaryCtaLabel`/`secondaryCtaHref` from the
`site_settings.homepage` blob.

Nothing in the running app reads any of it, so this is cleanup, not a
prerequisite. Back up before running.

### 1.3 Repo has mixed line endings and no `.gitattributes`

**85 tracked files contain CRLF, the rest are LF.** No `.gitattributes` exists.

This repeatedly produced phantom whole-file diffs — at one point `git status`
showed 20 modified files of which 15 were pure CRLF noise, including
`README.md` and files never touched. Committing that would have rewritten the
repo.

Mitigation used all session: before every commit, restore files whose diff is
empty under `--ignore-all-space`, and match each file's existing convention
rather than normalising it.

```bash
for f in $(git diff --name-only); do
  if [ -z "$(git diff --ignore-all-space --stat -- "$f")" ]; then git checkout -- "$f"; fi
done
```

**Recommended:** a dedicated `.gitattributes` + normalisation commit, on its own
branch, touching nothing else. Not done — it is a large diff that should not
ride along with a feature.

### 1.4 `next-env.d.ts` churns between dev and build

The dev server rewrites the import to `./.next/dev/types/routes.d.ts`; a
production build writes `./.next/types/routes.d.ts`. It was reverted before
every commit.

Worth knowing: I initially claimed committing the dev variant would break CI's
type-check. **That was wrong** — verified empirically. `skipLibCheck: true`
(set in `tsconfig.json`) makes TypeScript ignore unresolved imports inside
`.d.ts` files, so both variants pass with no `.next` present at all. The revert
is tidiness only.

### 1.5 Not yet verified in this session

- `npm run build` — verified locally: successful production build.
- Playwright browser tests (`npm run test:browser`).
- The **reviews submission flow** end-to-end against the live database.
- The **MFA enrollment/replacement** flows against a real Supabase session.
- The Google Map render and the CSP `frame-src` change in a real browser.

---

## 2. Admin fixes

### 2.1 Production admin login was impossible — no TOTP factor enrolled

**Symptom:** login worked on localhost, failed in production with *"This account
must complete TOTP enrollment before it can access the admin panel."*

**Cause:** `app/admin/login/LoginForm.tsx:9`

```ts
const mfaBypassed =
  process.env.NEXT_PUBLIC_ADMIN_MFA_BYPASS === "true" && process.env.NODE_ENV !== "production";
```

Locally both halves are true, so line 57 jumps straight to `/admin` — **local
logins never performed 2FA at all.** In production the guard is permanently
false, so `LoginForm` reaches the factor check, finds no verified TOTP factor,
and stops. The account had never been enrolled; `docs/admin/ADMIN_IMPLEMENTATION.md`
lists it as setup step 3 and it was skipped.

Production **cannot** be bypassed — the `NODE_ENV !== "production"` clause means
setting `ADMIN_MFA_BYPASS=true` on Vercel does nothing. Supabase also offers no
way to enroll a factor for a user from its dashboard; `mfa.enroll()` must run as
that signed-in user.

**Added two enrollment paths** (`e78616b`):

| Path | File | Notes |
| --- | --- | --- |
| CLI | `scripts/enroll-admin-mfa.mjs` | Writes QR to OS temp dir, never the repo |
| Web | `app/admin/enroll-mfa/` | For future admins |

Both need only the password — enrollment cannot sit behind the gate it exists to
unlock. Narrowed by: refusing outright if a verified factor already exists (so
it cannot swap an attacker's authenticator in for the owner's), signing out on
failure, and returning identical messages for a bad password and an unknown
account (not an account-existence oracle).

`app/admin/layout.tsx` deliberately does **not** gate, so `/admin/enroll-mfa` is
reachable while signed out. Confirmed before shipping.

`LoginForm` now links to enrollment instead of dead-ending, and shows an amber
**"Two-factor is bypassed in this environment"** banner locally.

**Residual risk, unavoidable:** whoever knows an admin password can enroll their
own authenticator on an account that has none.

⚠️ **A previously exposed admin password must be considered compromised.** Rotate
the admin credential before production use; do not record the password here.

### 2.2 Authenticator management in settings — `36e5b34`, `2402723`

`app/admin/settings/MfaManager.tsx`, wired into `app/admin/settings/page.tsx`.

Hit **"AAL2 required to enroll a new factor"** on localhost. Supabase refuses
`mfa.enroll()` at AAL1 once an account has a verified factor — and the local
bypass leaves the session at AAL1.

Not routed around. The panel now **challenges the current authenticator first**
and steps the session up to AAL2. Correct regardless of the error: re-proving
possession before rebinding 2FA means an unlocked signed-in session cannot be
used to point 2FA at another phone.

Three invariants, documented in the file header:

1. **Step up first** — AAL2 before any change.
2. **Add before remove** — new factor enrolled and verified while the old one
   still works. Reversing this means closing the tab mid-flow leaves the account
   with no second factor, i.e. lockout only fixable by editing the DB.
3. **Removal is explicit** — per-factor Remove buttons; **the last remaining
   verified factor can never be removed.**

### 2.3 Product save failed on missing `care_instructions` — `1662073`

`app/api/admin/products/[id]/route.ts`. Two defects:

1. The retry for a missing column stripped `care_instructions` from the
   **SELECT** but re-sent the **same UPDATE payload** — Postgres rejected it
   identically. The fallback was a no-op. Now removed from the write too.
2. **Nothing was logged.** The generic client message is deliberate, but the
   server discarded the Postgres error, making the failure undiagnosable even
   with Vercel logs. Error code + PostgREST message now logged server-side.

Also renamed the submit button to **"Save Product"**.

### 2.4 "Price on request" was recalculated away — `c0b01ea`

Setting a product to Price on request appeared to save; the storefront kept
showing a price.

Same request, two writes: line ~292 correctly wrote
`price_on_request: true, display_price: null`, then the repricing block wrote
`price_on_request: false` with a computed total. The admin reported *"pricing
recalculated live"*, which read like success.

The block ran because its conditions are mostly *"did the client send this
field?"* (`basePrice`, `metalType`, `netWeightGrams`, …) and `ProductEditor`
sends all of them on every save. Now skipped entirely when
`priceMode === "on_request"`.

`app/api/admin/products/bulk/route.ts` has the same pattern but is **safe** — it
422s any non-`fixed` product before reaching that code.

⚠️ **Rows already flipped by this bug keep the wrong value until re-saved.**

### 2.5 Description no longer required to publish — `b802331`

Removed from `ProductEditor`'s save handler. It was client-side only, no server
or DB constraint. **Untouched:** primary-image requirement, fixed-price
requirement, publish-preview acknowledgement.

Trade-off accepted by the user: a published product can now have an empty
description.

### 2.6 Media delete looked like it did nothing — `855df53`

Not silent — **invisible**. `remove()` wrote failures to the shared `message`
line, which renders inside the upload panel at the **top** of the page (~line
407). Clicking Delete on a tile further down put the explanation off-screen.

- Errors now render **on the clicked tile**, with a "Deleting…" state.
- **409 now names the blocking product** (was "Unlink this media from its
  product", useless with 17 products).
- **503 `storage_cleanup_pending` bug:** that status means the DB row *was*
  archived and only the R2 delete failed. It was treated as total failure, so
  the tile stayed for a record that no longer existed and retrying returned
  "Media was not found". Tile is now removed and the narrower problem reported.

### 2.7 Product search — `507af95`

Search box beside "+ Add New Product" matching name, SKU, slug.

**Filtered in the Supabase query, not the browser.** The list is server-paginated
at 25, so a client filter would only search the visible page and report "no
results" for a product two pages away.

- Plain GET form — works without JS, linkable, survives refresh.
- Submitting drops `?page` (a search always starts at page 1).
- Pagination links carry `?q` or page 2 silently drops the filter.
- Query trimmed, capped at 80 chars, commas/parens stripped — PostgREST uses
  those as `.or()` delimiters.

---

## 3. Storefront features

### 3.1 Live gold & silver market rates — `89ea354` (merged via PR #3)

| File | Role |
| --- | --- |
| `src/lib/metal-market-rates.ts` | Pure: config, parsing, maths. Framework-free, unit tested. |
| `src/lib/metal-market-rates-server.ts` | Next.js Data Cache layer. Server-only. |
| `app/api/admin/metal-market-rates/route.ts` | Admin-gated GET (Refresh button). |
| `app/admin/_components/MarketRatesWidget.tsx` | Client widget. |
| `docs/admin/MARKET_RATES.md` | Setup, calibration, accuracy ceiling. |

**Keyless, no API key, no billing:**
`api.gold-api.com/price/{XAU,XAG}` (USD/oz) × `open.er-api.com/v6/latest/USD`.

**Accuracy vs published Indian rates, 30 Jul 2026:** gold 24K −0.06%, 22K
−0.06%, silver 999 −0.08%. A regression test locks this and fails if anyone
reverts the constants.

Three corrections were required, **all initially wrong**:

1. **Import duty is 15%, not 6%** — India raised it (10% BCD + 5% AIDC) on
   **13 May 2026**, after the model cutoff. The 6% default read every rate ~5%
   low. *Policy number — re-check at every Union Budget.*
2. **Quote ex-GST.** IBJA/GoodReturns/Tanishq publish before GST.
   `METAL_RATES_GST_PERCENT` defaults to `0`.
3. **Exact karat ratios** (22/24, not the rounded 0.916 stamp), and no fineness
   multiplier on silver — the XAG quote is already fine metal.

**Caching:** spot ~10 min, FX 6 h, daily baseline 24 h keyed by **IST** day. The
original module-scoped cache had a near-zero hit rate on serverless and reset
the movement baseline constantly.

**Scope is read-only** — never writes `metal_rates`. Selling rates stay manual.

**Known ceiling:** ~0.5–2%. The FX feed updates ~daily; "previous close" does
not exist in a free feed so ▲▼ compares against today's first reading.
`METAL_RATES_SILVER_PREMIUM_PERCENT` ships at 2 (observed local basis);
`METAL_RATES_GOLD_PREMIUM_PERCENT` at 0.

### 3.2 Book Appointment removed — `c673b8b`

Route, footer pair, hero secondary CTA, store-locator button, SEO entry,
`SimplePage` type member, settings schema/form, README.

`SettingsManager` now picks only known fields — the stored row may retain the
old keys and spreading it raw into a `.strict()` schema would 422 the save.

`Architecture.md`, `Design.md`, `PRD.md` still mention it; those are dated audit
records, left alone deliberately.

### 3.3 Google Map — `e6c9a79`

`src/components/StoreMap.tsx` (+ `StoreDetails` export), on store locator,
contact, and footer.

**Click-to-load, not an always-on iframe** — it renders in the footer, so an
eager embed would pull Google's frame/scripts/cookies into every page view.
Keyless (`output=embed`, `dir/?api=1`).

**Coordinates `28.1151852, 75.3905706`** live in `config/contact.ts`. Every map,
embed and directions link derives from them.

**CSP change:** `frame-src 'none'` → `'self' https://www.google.com
https://maps.google.com`. `frame-ancestors 'none'` and `X-Frame-Options: DENY`
untouched — the site still cannot be embedded. Tests assert both halves,
including that the two directives are never confused.

`SHOWROOM_HOURS` ships **empty on purpose**; the hours block renders only when
populated. Guessed hours send customers to a closed shutter.

### 3.4 Customer reviews — `b482707`, `f82a32a`

Most infrastructure already existed since `0003_storefront_engagement.sql`
(table, RLS, moderation API, admin panel) and had **never been connected**.

Missing and now added:
- `app/api/public/reviews/route.ts` — GET (approved, via `product_reviews_public`
  view) and POST (rate-limited, same-origin).
- `src/components/ProductReviews.tsx` — list + form, below the long description.

`src/lib/catalogue-data.ts:31` hardcoded `reviews: []`, so the old markup could
never render. It was dead code keyed on `review.name`, a shape the DB does not
use.

Submissions insert with table defaults and **never set status or any moderation
column** — deliberate, so a later edit cannot quietly self-approve public input.

**Moderation kept** (user's choice). `f82a32a` shows the submitter their own
review immediately on a dashed gold "Awaiting approval" card captioned "Only you
can see it" — held in component state, never merged into the public list.

Admin moderation panel needed no new UI but was **not showing `author_email`**,
the whole reason it is collected. Now a `mailto:` link.

`product_reviews_refresh_rating` trigger already keeps `rating_average` /
`rating_count` in sync.

### 3.5 Instagram — `b395999`

`@ps_jewellersjjn` in footer Visit column, store locator, contact.
`src/components/InstagramIcon.tsx` (inline SVG, matches `WhatsAppIcon`).

**`?igsh=...` stripped** — a per-share tracking token, not part of the profile
address; it would send Instagram a referral signal for every visitor and can
expire. Stored URL: `https://www.instagram.com/ps_jewellersjjn`.

`rel="noopener noreferrer"` on both links. One link per page — a bottom-bar
duplicate was drafted and dropped.

### 3.6 Smaller items

- `d54d4e3` — brand crest +25% everywhere. Header bar had to grow with it
  (`h-16`→`h-20`, `lg:h-20`→`lg:h-24`); square slots became `w-auto` (asset is
  4:5 portrait, so `h-20 w-20` letterboxed it); `sizes` raised to
  `(max-width: 1024px) 80px, 96px` or Next served an undersized file.
- `5c687d8` — removed `💬` from the WhatsApp button label; it already rendered
  `<WhatsAppIcon />`, so two glyphs showed.
- `be36404` — removed the media-library subtitle; cleared 2 lint warnings (the
  `eslint-disable` directives for `@next/next/no-img-element` were never
  suppressing anything and were themselves the only lint problem).
  **`npm run lint` is clean: 0 errors, 0 warnings.**

---

## 4. Environment variables added

```
# Market rates — all optional, defaults work with no config
METAL_MARKET_RATES_MODE=              # live (default) | mock | off
METALS_API_URL=https://api.gold-api.com/price
FX_API_URL=https://open.er-api.com/v6/latest/USD
METAL_MARKET_RATES_CACHE_SECONDS=600  # clamped 300-900
METAL_RATES_IMPORT_DUTY_PERCENT=15    # 10% BCD + 5% AIDC, since 13 May 2026
METAL_RATES_GST_PERCENT=0             # sources publish ex-GST
METAL_RATES_GOLD_PREMIUM_PERCENT=0
METAL_RATES_SILVER_PREMIUM_PERCENT=2
METAL_RATES_REGION_LABEL=Jhunjhunu, Rajasthan
```

`METAL_RATES_REGIONAL_PREMIUM_PERCENT` (legacy) is still honoured as the
fallback for both metals.

---

## 5. Tooling constraint that shaped this session

The agent sandbox capped some commands at **45 seconds** and killed background
processes between calls. Current local verification completed successfully:
`npm run build`, `npm run type-check`, `npm run lint`, and `npm test`.

The earlier slow-mount timeout no longer reproduces in the current workspace.
The full configured checks now finish successfully:

| Scope | Result | Time |
| --- | --- | --- |
| `npm run type-check` | clean, exit 0 | ~44s |
| `npm run lint` | clean, exit 0 | ~60s |
| `npm test` | 145/145 passed | ~9s |
| `npm run build` | successful | ~53s |

**Standing state: 145/145 tests pass, type-check clean, lint clean.**

---

## 6. Suggested next steps

1. Run migration **0017** on production; audit the rest.
2. Confirm the previously exposed admin credential was rotated; keep the new credential out of repository files.
3. Re-save any product previously set to "Price on request" (§2.4).
4. Test the reviews flow end-to-end: submit → confirm not public → approve →
   confirm public.
5. Test MFA replacement on localhost, then sign out/in with the new device
   before relying on it.
6. Verify the map renders and no CSP violation appears in the console.
7. `.gitattributes` + line-ending normalisation, on its own branch (§1.3).
8. Consider whether `npm run verify` should gate pushes — CI runs on push to
   `main`, so failures land on main rather than being caught first.
