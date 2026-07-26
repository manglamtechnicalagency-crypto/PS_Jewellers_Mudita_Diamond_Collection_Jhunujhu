# ADR-001: Modular Monolith Before Microservices

- Status: Accepted
- Date: 2026-07-26

## Context

The website needs product, media, pricing, content, enquiry, audit, and authentication capabilities. The current deployment is a Next.js application backed by Supabase and Cloudflare R2. The request also requires MVC and feature-based organization with a future microservices architecture.

## Decision

Implement MVC and feature boundaries inside a modular monolith first. Keep controllers in Next.js route handlers, business logic in feature services, and persistence behind repositories. Document microservice extraction seams and event contracts without adding network hops or duplicate infrastructure prematurely.

## Alternatives considered

- Immediate microservices: rejected; introduces distributed auth, deployment, observability, and transaction failure modes before load or team boundaries justify them.
- Flat route-handler logic: rejected; makes business rules hard to test and extraction expensive.
- Shared utility-only structure: rejected; does not establish ownership or prevent feature coupling.

## Consequences

Positive: simpler deployment, local transactions, shared authentication, faster development, and clear future extraction points.

Trade-off: service isolation is logical rather than process-level until a feature is extracted. Repository contracts and event/outbox work must be completed before independent deployment.
