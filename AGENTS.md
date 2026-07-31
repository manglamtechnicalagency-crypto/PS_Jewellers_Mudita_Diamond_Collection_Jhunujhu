# PS Jewellers — Project Agent Guide

This project uses the ECC Codex workflow from `affaan-m/ECC`.

## Current project surface (authoritative, 2026-07-31)

- Next.js App Router + React 19 + TypeScript strict mode + Tailwind CSS.
- Client code lives in `src/`.
- Next.js App Router routes and server handlers live in `app/`; deployment target is Vercel.
- R2 credentials are server-only. Never place them in `NEXT_PUBLIC_` variables or client bundles.
- Supabase/Postgres is the production catalogue, settings, enquiry, media-metadata, and admin data source. `src/data.ts` is development fallback only.
- Cloudflare R2 buckets are configured as `ps-jewellers` (clean media) and `ps-jewellers-quarantine-prod` (private quarantine).
- Supabase migrations are applied and synchronized through `0023`; the obsolete `appointments` table is intentionally absent.
- Production URL: `https://ps-jewellers-mudita-diamond-collect.vercel.app`.

## Required workflow

1. Trace the real execution path before editing.
2. Keep changes scoped to the requested behavior.
3. Validate all API boundary input, authentication, authorization, size limits, and error responses.
4. Never hardcode secrets. Update `.env.example` when adding environment variables.
5. Run `npm run type-check` and `npm run build` after changes.
6. For database changes, add an ordered Supabase migration and run `npx supabase migration list` plus `npx supabase db push` against the linked project.
7. Review the final diff for secrets, unrelated changes, and generated files.

## Project commands

```powershell
npm install
npm run dev
npm run type-check
npm run build
npx supabase migration list
npx supabase db push
```

ECC skills are available under `.agents/skills/`. Use `verification-loop` for release checks, `security-review` for API or credential changes, and `frontend-patterns` for React UI work.

<!-- CAVEMAN:BEGIN -->

## Response style — caveman mode, always on

Active by default in this repo, every session, no command needed. Full rules and
levels in `CLAUDE.md`. Short version:

- Cut filler. No "Sure!", no "Let me…", no recap, no summary section.
- Fragments over sentences. Verdict first, reason second.
- One line per finding, file and line first.
- **Never compress** code, commands, paths, URLs, env names, error text, or any
  user-facing storefront copy — byte-for-byte exact.
- Brevity never overrides the workflow above. Still trace the path, still flag
  risk, still run `npm run type-check` and `npm run build`.
- Match the user's language. Compress style, never translate.

User says "normal mode" → off for that session.

<!-- CAVEMAN:END -->
