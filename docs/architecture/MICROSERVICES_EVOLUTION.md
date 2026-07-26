# Microservices Architecture and Extraction Plan

## Target topology

```text
Admin/Public Web (Next.js BFF)
          |
          +--> Catalogue Service ---- Supabase catalogue schema
          +--> Media Service -------- Cloudflare R2 + media metadata
          +--> Content Service ------ pages/modules/settings
          +--> Enquiry Service ------ enquiries/notifications
          +--> Audit Service -------- append-only audit stream/store
          +--> Pricing Service ------ metal rates and price calculations
```

The current Next.js application is the BFF and hosts these feature services in-process. `src/server/features` is the extraction seam. A future service replaces an in-process repository with an HTTP or message-bus adapter while the use-case contract stays stable.

## Service ownership

| Service | Owns | Must not own |
|---|---|---|
| Catalogue | products, taxonomy, product publication | R2 credentials, page layout |
| Media | R2 objects, media metadata, usage links | product pricing |
| Content | pages, modules, navigation, SEO | product rows |
| Pricing | metal rates, price calculation history | media files |
| Enquiry | enquiries, status workflow, notifications | admin roles |
| Audit | append-only action events and retention | mutable business records |

## Communication

- Synchronous HTTP for admin reads and user-facing commands requiring an immediate result.
- Events for catalogue publication, media replacement, metal-rate changes, and audit fan-out.
- Every event includes `eventId`, `eventType`, `occurredAt`, `actorId`, `entityId`, and `schemaVersion`.
- Consumers are idempotent; retries use exponential backoff and a dead-letter queue.

## Extraction sequence

1. Finish feature services and repository interfaces in the modular monolith.
2. Add contract tests around service inputs, outputs, and stable error codes.
3. Add an outbox table/worker for domain events; do not publish directly inside request code.
4. Extract Media first because R2 lifecycle and image processing are independently scalable.
5. Extract Enquiry next because notifications and staff workflows have a different load profile.
6. Extract Pricing only after price calculation contracts and rate consistency checks are stable.
7. Extract Catalogue and Content last; they have the strongest transactional and SEO coupling.

## Non-goals

- No fake localhost microservices.
- No distributed transactions across Supabase and R2. Use an explicit saga/compensation workflow for object upload and metadata registration.
- No shared database writes between independently deployed services. During migration, read-only compatibility views are temporary and versioned.

## Required production infrastructure before extraction

- API gateway/WAF and service-to-service authentication.
- Central logs, metrics, traces, and correlation IDs.
- Durable queue/outbox with replay and dead-letter handling.
- Independent CI/CD, secrets, migrations, backups, and rollback per service.
- Contract and consumer-driven integration tests.
