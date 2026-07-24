# Project documentation map

## Start here

- `../README.md` — setup, routes, and runtime overview.
- `../Memory.md` — verified implementation state and handoff notes.
- `ADMIN_IMPLEMENTATION.md` — admin setup and current delivery.
- `security/` — upload threat model, environment, checklist, and remaining risks.

## Root architecture documents

`../PRD.md`, `../Architecture.md`, `../Design.md`, `../Rules.md`, and `../Phases.md` remain the project-level product and engineering documents. Their current-state corrections at the top of each file are authoritative; historical sections are retained for context and must not override the current code.

## Directory ownership

| Directory | Responsibility |
|---|---|
| `app/` | Next.js routes, layouts, API handlers, and route-local UI |
| `src/components/` | Shared storefront UI |
| `src/storefront-pages/` | Public route-level storefront views |
| `src/lib/` | Server integrations, auth helpers, upload policy, and reusable domain utilities |
| `src/data.ts` | Temporary catalogue seed/source until public reads migrate to Supabase |
| `public/assets/` | Runtime-owned public hero media |
| `supabase/migrations/` | Versioned Postgres schema and RLS policies |
| `docs/` | Human and agent documentation |
| `archive/` | Retained, non-runtime legacy material |
| `.agents/`, `.codex/` | Project-local agent workflow configuration |
