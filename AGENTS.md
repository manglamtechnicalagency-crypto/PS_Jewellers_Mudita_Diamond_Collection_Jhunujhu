# PS Jewellers — Project Agent Guide

This project uses the ECC Codex workflow from `affaan-m/ECC`.

## Project surface

- Next.js App Router + React 19 + TypeScript strict mode + Tailwind CSS.
- Client code lives in `src/`.
- Vercel serverless routes live in `api/`.
- R2 credentials are server-only. Never place them in `NEXT_PUBLIC_` variables or client bundles.
- `src/data.ts` is the current catalogue source; Supabase, Sanity, and R2 integrations remain opt-in scaffolding unless a task explicitly wires them.

## Required workflow

1. Trace the real execution path before editing.
2. Keep changes scoped to the requested behavior.
3. Validate all API boundary input, authentication, authorization, size limits, and error responses.
4. Never hardcode secrets. Update `.env.example` when adding environment variables.
5. Run `npm run type-check` and `npm run build` after changes.
6. Review the final diff for secrets, unrelated changes, and generated files.

## Project commands

```powershell
npm install
npm run dev
npm run type-check
npm run build
```

ECC skills are available under `.agents/skills/`. Use `verification-loop` for release checks, `security-review` for API or credential changes, and `frontend-patterns` for React UI work.
