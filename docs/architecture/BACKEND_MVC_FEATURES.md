# Backend MVC and Feature Architecture

## Decision

The application uses a modular monolith inside the Next.js runtime. Each backend feature owns its schemas, repository, service, and route adapter. Route handlers are controllers: they authenticate, parse transport input, call an application service, and map errors to HTTP responses.

## Runtime structure

```text
app/api/**/route.ts                 Controller / HTTP adapter
src/server/core/**                  Shared application primitives
src/server/features/<feature>/**   Feature boundary
  *.schemas.ts                      Zod transport/application validation
  *.repository.ts                   Supabase/R2/D1 persistence adapter
  *.service.ts                      Business rules and use cases
  index.ts                          Public feature exports
```

Current example:

```text
app/api/admin/products/route.ts
  -> src/server/features/products/ProductService
  -> src/server/features/products/ProductRepository
  -> Supabase
```

## MVC responsibilities

- Model: database rows, schemas, repository mappings, and persistence constraints.
- View: React Server Components and client admin components under `app/admin`.
- Controller: Next.js route handlers. No pricing, authorization policy, or persistence orchestration belongs in a route handler.
- Service: use cases such as create product, publish product, replace media, and update metal rate.

## Feature boundaries

Planned and existing feature packages:

- `products`: catalogue CRUD, publication, pricing inputs, stock, product-media links.
- `media`: R2 object lifecycle, metadata, usage checks, replacement, and product links.
- `taxonomy`: categories, collections, and subcategories.
- `pricing`: metal rates, weight-based calculation, and rate history.
- `pages`: page records and scheduled modules.
- `enquiries`: public capture and staff workflow.
- `audit`: immutable audit read models and event policies.

Features may depend on `core` and their own repositories. A feature must not import another feature's repository directly; use an application service or explicit port when cross-feature coordination is required.

## Rules

1. Validate all external input at the controller boundary and again in services when a use case can be called internally.
2. Keep provider clients server-only. R2 credentials never cross into `app` client components.
3. Repositories return persistence results; services decide domain outcomes.
4. Use database RPCs for atomic multi-table writes such as media registration plus product linking.
5. Controllers return stable error codes and generic production-safe messages.
6. Add a feature test beside the feature for schemas and pure business rules; add route tests for authorization and error mapping.

## Why modular monolith first

The project has one deployment, one Supabase security boundary, and one R2 account. Splitting immediately would duplicate authentication, migrations, observability, and deployment complexity without improving isolation. The feature boundaries create seams for later extraction while keeping local development and transactions simple.
