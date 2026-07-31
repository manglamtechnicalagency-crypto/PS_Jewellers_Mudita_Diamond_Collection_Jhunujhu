# Catalogue classification and the website image gallery

Covers two changes that ship together:

1. products are now classified explicitly instead of having their category
   inferred from metal purity and free text;
2. administrators can place images into named storefront sections.

---

## 1. Root cause

`/gold-jewellery`, `/silver-jewellery` and `/diamond-jewellery` had no field to
filter on, so `ShopPage.matchesInitial` inferred the category at read time:

```ts
if (filter === "Gold Jewellery")
  return product.purity.toLowerCase().includes("gold") ||
         product.purity.includes("22K") ||
         product.purity.includes("18K");
```

`purity` describes material composition. A diamond ring is mounted in 18K gold,
so it carries `purity: "18K Gold"` and appeared under **Gold Jewellery**.

The same function matched jewellery *type* by substring across a blob of name,
category, collection, stone type and tags. Two further defects followed:

| Filter | Matched | Because |
| --- | --- | --- |
| Rings | every earring, the nose ring, "Ring Mount" | `"earrings".includes("ring")` |
| Necklaces | mangalsutra **bracelets** | the tag `"Mangalsutra Bracelet"` contains `"mangalsutra"` |
| Diamond Jewellery | diamond-**cut** gold bangles (`stoneType: "None"`), every CZ piece, everything in the Celeste collection | tag `"Diamond Cut"`, plus `searchable.includes("cz")` and a collection-name check |

New Arrivals had an equivalent problem: `/new-arrivals` filtered on badge
*text* (`badge === "New Arrival"`). Badge copy is editorial, so renaming a badge
silently emptied the page, and a genuinely new product with a different badge
never appeared.

## 2. New fields

| Field | Type | Where |
| --- | --- | --- |
| `products.jewellery_category` | enum `gold │ silver │ diamond │ platinum`, nullable | migration `0021` |
| `Product.jewelleryCategory` | `JewelleryCategory │ ""` | `src/types.ts` |
| `Product.isNewArrival` | `boolean` — surfaces the existing `products.is_new_arrival` | `src/types.ts` |
| `Product.publishedAt` | ISO string — surfaces the existing `products.publish_at`, falling back to `created_at` | `src/types.ts` |

No new timestamp column was added: `publish_at` already existed (migration
`0009`).

Three separate concepts, deliberately not merged:

| Concept | Field | Example |
| --- | --- | --- |
| Jewellery type | `products.category_id` → `category` | `Rings`, `Earrings` |
| Merchandising class | `jewellery_category` | `diamond` |
| Material composition | `metal_purity` → `purity` | `18K Gold` |

A diamond ring set in 18K gold is `category: "Rings"`,
`jewelleryCategory: "diamond"`, `purity: "18K Gold"`. It belongs on the Diamond
page and nowhere near the Gold page.

### Canonical values

Stored lowercase: `gold`, `silver`, `diamond`, `platinum`. Normalise only at
input and migration boundaries. `""` on a `Product` means *unclassified legacy
row*, and such a product is **excluded** from every metal/stone page rather than
guessed into one — visibly missing is correctable, silently misfiled is not.

## 3. Migration and rollback

`supabase/migrations/0021_jewellery_category.sql`, in one transaction:

1. creates the enum type;
2. adds the column **nullable** — no existing row is invalidated;
3. adds a partial index on `(jewellery_category, status)`;
4. backfills deterministically (below);
5. creates `public.jewellery_category_audit`;
6. recreates `public.catalogue_products` with `jewellery_category` and
   `publish_at` exposed.

No row is deleted or duplicated; no id, slug, price, media link, review or
inventory value is touched.

Rollback SQL is at the bottom of the migration file. It drops the audit view,
restores the `0017` definition of `catalogue_products`, drops the index, column
and type.

### Backfill rules — evidence order

```
1. stone_type names a real diamond   → diamond
   (matches \mdiamonds?\M and NOT "diamond cut" — that is a finish)
2. metal_type/metal_purity: platinum → platinum
3. metal_type/metal_purity: silver   → silver
4. metal_type/metal_purity: gold     → gold
5. otherwise                         → NULL, manual review
```

Product name and filename are never consulted: *"Dual-Tone Diamond-Cut Gold
Bangles"* contains "diamond" and is not diamond jewellery.

### Audit process

```sql
select * from public.jewellery_category_audit where needs_manual_review;
```

Columns: `product_id, sku, name, status, old_metal_type, old_metal_purity,
old_stone_type, jewellery_category, evidence, confidence, needs_manual_review`.

Classify every flagged row in Admin → Products. Only once the query returns no
rows may you consider `alter table public.products alter column
jewellery_category set not null;` — that is a separate, deliberate migration and
is intentionally not part of `0021`.

### Seed catalogue (`src/data.ts`)

All 17 demo products were classified with the same rules: 3 gold, 6 silver,
8 diamond. `isNewArrival` mirrors the previous `badge: "New Arrival"` (3
products). `publishedAt` is assigned in descending catalogue order from
2026-07-20, three days apart, purely so the demo has a deterministic sort key.

## 4. Admin workflow

**Add / edit product** now has a required **Jewellery category** select in
Essentials, beside (and distinct from) Category.

- Required, with **no default**. `createProductSchema` rejects a missing or
  out-of-enum value with *"Select a jewellery category: gold, silver, diamond or
  platinum."* Nothing ever defaults to Gold or Diamond.
- `PATCH /api/admin/products/[id]` treats an omitted field as *unchanged*.
  Editing media or the New Arrival flag cannot clear the classification, and
  setting the classification cannot touch the New Arrival flag.
- If the database has not run `0021`, the update route detects the missing
  column, drops it from both the write and the projection, and saves the rest —
  the same guard already used for `care_instructions`.

**Mark as New Arrival** stays where it was, in the merchandising flags.

**Bulk CSV import** (`/api/admin/products/import`) now requires a
`jewelleryCategory` column, validated against the same enum before insert. The
import writes straight to the table and does not pass through
`createProductSchema`, so without this every imported product landed with a NULL
classification and was invisible on every category page with no error. Header
row:

```
slug,name,categorySlug,jewelleryCategory,collectionSlug,priceMode,basePrice,stockQuantity,status
```

## 5. New Arrivals logic

```ts
products.filter(p => p.isNewArrival === true && isActiveProduct(p))
        .sort(publishedAt DESC, then id ASC)
```

`isActiveProduct` is the single place the "is this live?" rule lives. Draft,
archived and soft-deleted rows are already excluded in SQL by
`catalogue_products`, so the remaining check is that the product has a
renderable image — the one unpublishable state that survives the view, since
media approval can be revoked independently of the product.

- `publishedAt` falls back to `created_at` when `publish_at` is null.
- The `id` tiebreak keeps ordering stable when two products share a timestamp,
  so a grid does not reshuffle between renders.
- Results are deduplicated by id.
- The **NEW** badge is rendered by `ProductCard` only when `isNewArrival` is
  true. Exact stale newness copy on an unflagged product ("New", "New In",
  "New Arrival", "New Arrivals", "Just In") is suppressed; unrelated badges that
  merely contain the word, such as "New Season", are left alone.
- `/new-arrivals` uses `kind: "new-arrivals"` and opens on **Newest First**.
- `/shop` gained a **Newest First** sort option.

Homepage:

- **Featured collections** now contains a **Gold · New arrivals** subsection —
  `jewelleryCategory === "gold" && isNewArrival`, up to 4, newest first, with an
  empty state linking to the full gold collection.
- The general **New arrivals** rail uses the same helper without the category
  filter, and has its own empty state.
- Featured products leads with up to 4 gold pieces before topping up from the
  rest of the catalogue.
- A dedicated **Gold jewellery** product rail sits under the gold banner.
- The hero CTA now honours `primaryCtaHref` (it was hardcoded to `/shop` while
  the label came from settings) and defaults to `/gold-jewellery`, with a
  secondary "Shop All Jewellery" link.

## 6. Media section keys

Declared in `src/lib/site-sections.ts` — the single source of truth read by both
the admin UI and the storefront.

| Key | Slot | Min size | Ratio | Max |
| --- | --- | --- | --- | --- |
| `home.hero.poster` | Hero background image | 1600×900 | 16:9 | 5 MB |
| `home.hero.video` | Hero background video | 1280×720 | 16:9 | 10 MB |
| `home.collection.heritage-antique` | Featured tile | 800×600 | 4:3 | 5 MB |
| `home.collection.celeste-diamonds` | Featured tile | 800×600 | 4:3 | 5 MB |
| `home.collection.maharani-bridal` | Featured tile | 800×600 | 4:3 | 5 MB |
| `home.collection.everyday-luxe` | Featured tile | 800×600 | 4:3 | 5 MB |
| `home.collection.oxidised-heritage` | Featured tile | 800×600 | 4:3 | 5 MB |
| `home.gold-banner` | Gold Jewellery banner | 1200×800 | 3:2 | 5 MB |
| `home.gallery.1` … `.6` | Gallery strip | 800×800 | 1:1 | 5 MB |

Accepted formats: JPEG, PNG, WebP, AVIF for images; MP4, WebM for video.
Aspect ratio is enforced with a 15% tolerance.

Client-supplied keys are **not** arbitrary: both `POST` and `PATCH` on
`/api/admin/media` restrict `sectionKey` to this list via a Zod enum.

## 7. Storage lifecycle

`/admin/media-gallery` renders one card per slot: what is live, the required
dimensions, an alt-text field, and Upload / Replace / Remove.

Publish and replace:

1. validate in the browser (MIME, real leading bytes, byte size, intrinsic
   dimensions, aspect ratio) — fast, specific errors;
2. presign, then `PUT` to R2;
3. `POST /api/admin/media` re-validates MIME and size server-side against the
   same section config, registers the row with its `section_key`, approves it,
   and **then** clears `section_key` from every other row in that slot — all in
   the one request.

Steps 3's ordering is what makes replacement safe: the new row exists before the
old one is stood down, so the section is never empty, and because the stand-down
happens server-side a dropped connection or a closed tab cannot leave two rows
assigned to one slot. If the stand-down alone fails, the API returns `201` with a
`warning` — the new image is live, only the stale assignment remains — and the
admin UI surfaces that instead of claiming plain success.

Section media is approved (`review_status = 'approved'`) at the moment it is
assigned, on the same terms as product media, and `/api/public/site-media`
requires `approved`. Assignment is the deliberate publish action; without this
pairing an upload sat "pending" in the review queue while already rendering to
every visitor.

Removal unassigns; it does **not** delete the asset, because the same file may
be used by a product or another slot.

### Not implemented — image processing

Auto-rotate, EXIF stripping, resizing and re-encoding to WebP/AVIF are **not**
implemented. Uploads go browser → R2 through a presigned URL, so no server ever
holds the bytes, and no image library (`sharp` or equivalent) is installed.
Adding this means either routing uploads through a server route or an R2 event
worker. Until then, EXIF metadata written by phones and cameras is preserved in
the stored file — treat it as public.

## 8. Frontend rendering and cache invalidation

`GET /api/public/site-media` returns `{ [sectionKey]: { url, alt, mimeType } }`
for rows that carry a declared key and are active, newest first per slot. Only
declared keys are returned.

`App.tsx` fetches it and passes the map to `HomePage`; every consumer renders
`sectionImage(key, bundledFallback)`. **Every slot keeps its bundled asset as a
fallback**, so an empty CMS, a failed request or an unconfigured R2 renders
exactly the site that shipped.

Invalidation: the route is `dynamic = "force-dynamic"` with
`Cache-Control: no-store`, and the client fetch is `cache: "no-store"`. A
publish is visible on the next page load — no build, no manual purge. The
storefront also holds a Supabase realtime subscription on `media`, `products`
and `product_media` which refreshes the catalogue in place.

## 9. Security

Unchanged and still enforced server-side on every request:

- admin session + role check (`super_admin`, `admin`, `editor`) on the page and
  in every API route — hiding UI is not a control;
- mandatory 2FA path untouched;
- same-origin check on all mutating media routes;
- Zod validation on every payload; `sectionKey` restricted to a fixed enum;
- section media cannot also be product media (rejected at the API);
- storefront reads require `is_active` **and** `review_status = 'approved'`;
- MIME and size re-validated server-side against the section config;
- storage keys are generated server-side by the presign route, so no client
  string reaches a path;
- errors are returned as codes and safe messages; raw database and storage
  errors are logged, never returned;
- no new public write endpoint. `/api/public/site-media` is read-only.

Known gap: file *signature* verification runs in the browser only, for the same
reason as the image processing gap above — the server never sees the bytes.

## 10. Future maintenance

- **Adding a storefront slot**: add an entry to `SITE_SECTIONS`, then read it
  with `sectionImage(key, fallback)`. The admin dropdown, the gallery page, the
  API enum and the public endpoint all update from that one list.
- **Adding a merchandising class** (e.g. `rose-gold`): extend the Postgres enum,
  `JewelleryCategory`, the two Zod enums, and
  `STOREFRONT_FILTER_TO_CATEGORY`. `tests/catalogue-classification.test.ts`
  fails until the storefront filter agrees.
- **Never** reintroduce `purity`, product name, or tag matching for the primary
  category. `tests/catalogue-classification.test.ts` contains regression tests
  named after each original defect.
- Before making `jewellery_category` NOT NULL, confirm
  `select count(*) from jewellery_category_audit where needs_manual_review` is
  zero.
