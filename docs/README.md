# Project documentation map

## Start here

- `../README.md` — setup, routes, and runtime overview.
- `../Memory.md` — verified implementation state and handoff notes.
- `ADMIN_IMPLEMENTATION.md` — admin setup and current delivery.
- `architecture/BACKEND_MVC_FEATURES.md` — MVC responsibilities, feature ownership, and backend structure.
- `architecture/MICROSERVICES_EVOLUTION.md` — target service topology and extraction plan.
- `architecture/ADR-001-MODULAR-MONOLITH-FIRST.md` — decision record for the current architecture.
- `quality/CODERABBIT.md` — CodeRabbit setup, local review gate, and review responsibilities.
- `security/` — upload threat model, environment, checklist, and remaining risks.

## Root architecture documents

`../PRD.md`, `../Architecture.md`, `../Design.md`, `../Rules.md`, and `../Phases.md` remain the project-level product and engineering documents. Their current-state corrections at the top of each file are authoritative; historical sections are retained for context and must not override the current code. If a historical section says the project has no backend or no database, treat that as superseded by the current Next.js/Supabase/R2 implementation.

## Directory ownership

| Directory | Responsibility |
|---|---|
| `app/` | Next.js routes, layouts, API handlers, and route-local UI |
| `src/components/` | Shared storefront UI |
| `src/storefront-pages/` | Public route-level storefront views |
| `src/lib/` | Server integrations, auth helpers, upload policy, and reusable domain utilities |
| `src/server/core/` | Framework-independent application primitives and shared errors |
| `src/server/features/` | Feature-owned schemas, repositories, services, and public exports |
| `src/data.ts` | Development catalogue fallback; published public reads come from the Supabase catalogue view |
| `public/assets/` | Runtime-owned public hero media |
| `supabase/migrations/` | Versioned Postgres schema and RLS policies |
| `docs/` | Human and agent documentation |
| `archive/` | Retained, non-runtime legacy material |
| `.agents/`, `.codex/` | Project-local agent workflow configuration |
