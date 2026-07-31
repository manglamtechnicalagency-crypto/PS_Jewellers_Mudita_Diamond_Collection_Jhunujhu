# AI Development Rules

> **Current project baseline — 2026-07-31:** This is a deployed Next.js 16 App Router + React 19 + TypeScript project on Vercel. Supabase/Postgres is wired for catalogue, settings, enquiries, media metadata, and admin workflows; Cloudflare R2 is wired for media; Upstash Redis is optional shared rate limiting. Use `app/` and `src/` as the live code surface. Do not describe this repository as a Vite SPA, backend-less demo, or Sanity scaffold. Supabase migrations through `0023` are the current schema baseline.

> **Security correction:** Use Next.js App Router and TypeScript/Tailwind only. Never expose Supabase secret keys, R2 access keys, quarantine credentials, or Upstash tokens to the browser. Preserve validation, authorization, CSRF/origin checks, rate limits, and safe errors on every server route. Where historical text below conflicts with this correction, the current code and this notice win.

## 1. Purpose

This file is the mandatory operating policy for every AI coding agent (and human contributor) working on this repository — the PS Jewellers e-commerce demo (`motion-photography-react-clone`). It exists because this codebase has a documented history of scope drift: it began as an unrelated photography-portfolio clone and was re-purposed into a jewellery e-commerce demo, leaving significant dead code behind (see Architecture.md §2). Every rule below exists to prevent that pattern from repeating.

## 2. Instruction Priority

Agents must follow instructions in this order:
1. Security and legal requirements
2. Rules.md (this file)
3. PRD.md
4. Architecture.md
5. Design.md
6. Phases.md
7. Memory.md (once created)
8. Task-specific instructions from the user

When documents conflict, **stop and record the conflict** in Memory.md (once it exists) or in your response to the user — do not silently pick a side.

## 3. Before Coding

Before writing any code, the agent must:
- Read PRD.md, Architecture.md, Rules.md, Design.md, and Phases.md in full.
- Read Memory.md if it exists.
- Inspect the specific files relevant to the requested task (`Read`, don't assume).
- Identify the current phase in Phases.md and confirm the task belongs to it.
- Verify whether any new dependency is genuinely required (see §7).
- Identify every file the change will touch, including any file that imports the changed file.
- Preserve current working functionality — this app has no test suite, so manual verification (§25) is the only safety net.
- State a short implementation plan before making changes for anything beyond a trivial one-line fix.
- Define how the change will be validated (build passes, manual click-through, etc.).

## 4. Scope Control

- Work only on the requested phase or task in Phases.md.
- Do not perform unrelated refactoring in the same change (e.g., don't "clean up" unrelated CSS while fixing a routing bug).
- Do not delete or modify the dead photography-template files (§2 in Architecture.md) unless the task is explicitly the Phase 1 cleanup — removing them silently as a "side effect" of another task is prohibited even though they are unused, because their removal should be a reviewable, intentional change.
- Do not add authentication, payment processing, or backend endpoints speculatively — these are explicitly Future scope per PRD.md §24 and require stakeholder sign-off first.
- Do not change the public route table in `App.jsx` (adding/removing/renaming routes) without flagging it as a scope decision to the user.
- Record any deferred work as a note back to the user rather than silently implementing it.

## 5. Approved Technologies

**v2 update:** the stack changed in the v2 rewrite. Based on what is actually installed and used (Verified in `package.json` and `src/`):
- **Framework:** React (functional components + hooks only — no class components exist and none should be introduced).
- **Language:** **TypeScript**, `strict: true`. All new files must be `.ts`/`.tsx`, not `.js`/`.jsx`. See §9 (now applicable — rewritten below).
- **Build tool:** Vite.
- **Styling:** **Tailwind CSS**, using the design tokens defined in `tailwind.config.ts` (see Design.md for the full token table). Do not write new plain CSS beyond what's already in `src/index.css` (Tailwind directives + the two hand-written exceptions: `.reveal` keyframe-adjacent classes and the reduced-motion block) — express new styling as Tailwind utility classes.
- **State:** Built-in React hooks (`useState`, `useEffect`, `useMemo`), typed via `src/types.ts`. Introducing Context API is acceptable if prop drilling becomes a genuine blocker — flag this to the user first rather than assuming.
- **Backend-as-a-service (scaffolded, approved for continued use):** Supabase (`@supabase/supabase-js`) for a future database/auth backend, Sanity (`@sanity/client`) for future content management, Cloudflare R2 (via `@aws-sdk/client-s3` on the server side only) for future file storage. All three are currently scaffolded but unwired — see `src/lib/supabase.ts`, `src/lib/sanity.ts`, `src/lib/r2-server.ts`/`src/lib/r2-upload.ts`, and `api/r2-presign.ts`. Wiring real data through them is approved future work, not scope creep, since the client explicitly requested these integrations.

Any technology not on this list requires explicit user approval before installation, even if it seems "obviously" useful (e.g., React Router, a form library, an animation library).

## 6. Prohibited Technologies

- Do not add a second UI framework or component library without approval.
- Do not add a second CSS approach (styled-components, CSS Modules, Emotion, a second utility framework) alongside Tailwind without approval.
- Do not add state-management libraries (Redux, MobX, Zustand, Recoil) without approval — current scale does not need them.
- Do not add a second backend-as-a-service alongside Supabase/Sanity/R2 (e.g. Firebase, a competing CMS, S3 directly) without approval — three is already a lot for this project's size; don't add a fourth.
- Do not import `src/lib/r2-server.ts` (or any future server-only module) from anything under `src/pages/` or `src/components/` — that would either crash (env vars are undefined client-side) or leak credentials into the bundle. Server-only code belongs under `api/` or a module clearly named `*-server.ts` that only `api/` files import.
- Do not introduce a general-purpose backend framework (Express, NestJS, etc.) without explicit approval — the `api/` directory pattern (Vercel serverless functions) is the approved server-side approach for now.

## 7. Dependency Rules

- Reuse what's already installed; this project intentionally has a minimal dependency footprint (`react`, `react-dom`, `vite`, `@vitejs/plugin-react`, `typescript`).
- Do not install a package to solve something a few lines of vanilla JS/CSS can solve (e.g., don't add a debounce library for one search input — write a 5-line debounce or use `useDeferredValue`).
- Before installing anything, check current dependency versions and confirm compatibility with React 19 and Vite's current major version.
- All dependencies today are pinned to `"latest"` — this is a known issue (Architecture.md §2), not a pattern to continue. Any new dependency added must use an explicit version range, not `"latest"`.
- Document every added dependency: what it's for, and why the built-in/existing tools were insufficient.
- Remove unused dependencies when discovered (flag `typescript` for removal or actual use — do not leave it in limbo across multiple sessions without raising it).
- Never edit `package-lock.json` by hand.

## 8. Coding Standards

- **Language:** JavaScript (JSX), ES modules. No TypeScript today — do not introduce `.ts`/`.tsx` files without an explicit, approved migration phase, since there is no `tsconfig.json` and no build support currently configured for it.
- **Type-safety:** N/A (no TypeScript); use clear prop shapes and defensive `?.` optional chaining as already practiced throughout the codebase (e.g., `appState?.cart?.reduce(...)`).
- **Naming conventions:** Match existing patterns — PascalCase for components and their files (`ProductCard.jsx`), camelCase for functions/variables, kebab-case for CSS classes (e.g., `.product-card__body`), SCREAMING_SNAKE_CASE is not used anywhere and should not be introduced without reason.
- **Function/file size:** Follow existing proportions — most components are 10–90 lines; `HomePage.jsx` (149 lines) and `data.js` (617 lines) are the largest files today. If a new component would exceed roughly 150 lines, consider splitting it.
- **Component responsibilities:** One page = one route-level concern; shared UI goes in `components/`, never duplicated inline across pages.
- **Commenting:** Match the existing sparse style — comments only where behavior is non-obvious (e.g., the existing comment in `storeValue` explaining why `localStorage` failures are swallowed). Do not add comment noise to self-explanatory code.
- **Import order:** External packages first, then local imports (components, then data), matching existing files.
- **Formatting:** No Prettier/ESLint config exists; match the existing style exactly (double quotes, semicolons, 2-space indentation, trailing commas in multiline literals) until a formatter is formally adopted.
- **Dead code:** Never leave new dead code. If a task supersedes existing code, remove the superseded code in the same change (except the historical photography-template dead code, which is handled per §4).

## 9. TypeScript Rules

**Now applicable — v2 update.** The entire codebase is TypeScript (`strict: true`, `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`).
- Do not use `any` unless justified with a comment explaining why (none currently exist in the codebase — keep it that way).
- Prefer the shared domain types in `src/types.ts` (`Product`, `AppState`, `CartLine`, `CartProduct`, etc.) over redefining local shapes. If the Supabase/Sanity backend ever becomes the real data source, update `src/types.ts` to match the real schema rather than letting types drift.
- Validate external data at runtime once any real network/API data enters the app (nothing does yet — `src/data.ts` is a static, already-typed module, so no runtime validation is needed today). When Supabase/Sanity calls are actually wired up, add runtime validation (e.g. zod) at that boundary rather than trusting `any`-cast API responses.
- `.find()`/`.filter()` results that can be `undefined` must be null-checked before use — see `App.tsx`'s product-slug lookup for the established pattern (renders `NotFoundPage` rather than assuming a match).
- Use discriminated unions for complex UI state where it clarifies intent (e.g. `SimplePage`'s `SimplePageType` union is the existing pattern to follow for similar "one component, many variants" cases).
- Type JSX event handlers using React's imported event types (`FormEvent<HTMLFormElement>`, etc.) rather than the bare `React.FormEvent` namespace reference unless `React` is also imported as a value in that file.
- `tsc --noEmit` (via `npm run type-check` or as part of `npm run build`) is the dev-time gate. It has **not** been run successfully in this sandbox (network/mount restrictions block `npm install`) — treat any TS-related claim in this codebase as unverified until someone runs it locally and confirms.
- `api/*.ts` files (Vercel serverless functions) are **not** covered by the root `tsconfig.json`'s `include: ["src"]` — they're a separate concern typed via `@vercel/node`. If `api/` grows beyond the one R2 function, consider adding a dedicated `tsconfig` for it.

## 10. Component Rules

- Keep components focused on one responsibility, matching the existing pattern (e.g., `ProductCard` renders a product summary and exposes cart/wishlist actions; it does not fetch data or manage routing).
- Separate presentation from state logic: state mutations belong in the `appState` methods defined in `App.jsx`, not scattered across components — follow the existing pattern where components call `appState.addToCart(product)` rather than mutating cart state directly.
- Do not create a new generic/abstract component "just in case" — every existing component maps to a genuine, currently-used need.
- Add loading/error/empty states only where genuinely needed (there is no async data today, so loading states are not currently applicable — but empty states, per the existing `emptyMessage` pattern, are expected for any new list view).
- Maintain accessibility: reuse existing patterns like `aria-label`, `aria-expanded`, and `aria-hidden` as seen in `Header.jsx`.
- Avoid excessive prop drilling: `appState` is already the accepted mechanism for shared state; don't invent a second parallel mechanism.

## 11. Backend Rules

**Minimal backend now exists — v2 update.** `api/r2-presign.ts` is currently the only server-side code in this project. Rules for it, and for any future `api/` route:
- Validate every input from `request.body`/`request.query` — `r2-presign.ts` validates `fileName`/`contentType` presence and allowlists content types; follow this pattern for new routes.
- Never echo internal error details (env var names, stack traces, SDK error objects) back to the client — log server-side (`console.error`), return a generic message (see `r2-presign.ts`'s catch block).
- Any route touching Supabase/Sanity/R2 write operations must use the server-only credential (`SUPABASE_SERVICE_ROLE_KEY`, `SANITY_WRITE_TOKEN`, `R2_ACCESS_KEY_ID`/`R2_SECRET_ACCESS_KEY`) — never the `VITE_`-prefixed client keys, which are read-only/RLS-scoped by design.
- Full backend architecture (business logic layering, transactions, etc.) remains **not yet applicable** beyond this one narrow upload-URL endpoint — this section should be substantially rewritten once a real backend (database tables, business logic) exists, not just a single presign function.

## 12. Database Rules

**Not applicable today** — no database exists. Rules must be written before any database is introduced.

## 13. API Rules

**Not applicable today** — no API exists. Rules must be written before any API is introduced.

## 14. Authentication Rules

**Not applicable today** — no authentication exists. Do not implement partial/fake authentication (e.g., a `localStorage` flag pretending to be a login) as a shortcut; if authentication is requested, treat it as a new, fully-scoped feature requiring PRD.md and Architecture.md updates first.

## 15. Security Rules

Even without a backend, the agent must never:
- Commit secrets, API keys, or credentials of any kind. `.env.example` (placeholder values only) and a `.env`/`.env.local` entry in `.gitignore` now exist — keep both in sync whenever a new env var is added, and never commit an actual `.env` file.
- Render unsanitized/user-controlled HTML via `dangerouslySetInnerHTML` — none of the current code does this; keep it that way.
- Build any dynamic HTML/SQL string by concatenation once a backend exists.
- Log form input values (name, email, phone, address) to the console or any external service, even temporarily during debugging — remove all `console.log` debugging statements before considering a task complete.
- Disable any security-relevant browser behavior (e.g., removing `rel="noopener"` from external links, if added) to "fix" an unrelated bug.

## 16. Error-Handling Rules

- Do not use empty `catch` blocks without at least a comment explaining why the error is intentionally ignored — follow the existing pattern in `App.jsx`'s `readStored`/`storeValue`, which both explain the tolerated failure mode.
- When adding new features that can fail (e.g., a future fetch call), never silently swallow the error without a user-visible fallback.
- Since there is no error boundary today, any new top-level render path that could throw should be scoped so a failure doesn't blank the entire app — flag this gap to the user if a task would make it more likely to be hit (e.g., adding a new data source).
- Distinguish expected states (e.g., "no products match your filter") from unexpected failures (e.g., a malformed product object) in any new code.

## 17. UI and UX Rules

- Follow Design.md exactly for colors, typography, spacing, and component patterns — do not introduce new colors, fonts, or spacing values ad hoc.
- Maintain the existing responsive breakpoints (1180px, 760px) rather than inventing new ones.
- Preserve keyboard operability of interactive elements (buttons, links, form controls) — do not replace semantic `<button>`/`<a>` elements with non-interactive `<div>`s with click handlers.
- Maintain visible focus states — do not add `outline: none` without providing a replacement focus style.
- Use semantic HTML consistent with existing markup (`<header>`, `<nav>`, `<main>`, `<footer>`, `<article>`, `<section>` are already used throughout).
- Avoid introducing layout shift — if adding images, follow the existing pattern of providing intrinsic sizing where practical.
- Any destructive action (e.g., a future "clear cart" button) must require confirmation, matching general UX best practice even though no such action exists yet.

## 18. Accessibility Rules

Target WCAG 2.1 AA where practical, building on what already exists:
- Keyboard access: all interactive elements must be reachable and operable via keyboard (verify with Tab/Enter/Space when adding new interactive UI).
- Focus visibility: do not remove default focus rings without an equivalent replacement.
- Color contrast: check new text/background combinations against the existing palette (Design.md §4) for AA contrast, particularly gold-on-dark combinations which can be borderline.
- Form labels: any new form field must have an associated `<label>`, matching the existing `CheckoutPage.jsx` pattern.
- Alternative text: every `<img>` must have a meaningful `alt` (note: several decorative images in the current code use empty `alt=""` intentionally, e.g., thumbnail buttons in `ProductPage.jsx` — this is acceptable for decorative-only images, not for informative ones).
- Semantic heading order: don't skip heading levels within a page.
- Reduced motion: the existing `@media (prefers-reduced-motion: reduce)` block in `styles.css` must be respected/extended for any new animation.

## 19. Performance Rules

- Avoid unnecessary client-side JavaScript — this app is intentionally lightweight; don't add heavy dependencies for minor visual effects.
- Optimize any newly added images (appropriately sized, compressed, using an owned/bundled asset rather than a new hotlinked URL — see Architecture.md's flagged risk about Unsplash hotlinking).
- Avoid duplicate re-renders: memoize expensive derived data with `useMemo` as the existing code already does in `ShopPage.jsx` and `ProductPage.jsx`.
- Do not introduce global re-renders by lifting state higher than necessary.
- Keep the manual router (`App.jsx`) fast — avoid adding expensive computation to the top-level render path that runs on every navigation.

## 20. Testing Rules

**No test infrastructure currently exists** (Architecture.md §18). Until a testing framework is formally adopted (see Phases.md), the agent must:
- Manually verify every affected route in a browser (or via `npm run build && npm run preview`) after any change.
- Explicitly state in the task summary which routes/flows were manually checked and which were not.
- Not claim "tested" without describing the actual verification performed.
- When a testing framework is adopted (Phases.md Phase 2/9), write tests for new logic going forward and flag, but do not silently skip, gaps in coverage for pre-existing code.

## 21. Git Rules

- Make focused, single-purpose changes; do not bundle unrelated fixes into one change.
- Do not modify files unrelated to the task (this is especially important given the amount of pre-existing dead code in this repo — touching it "while you're in there" is prohibited outside a dedicated cleanup task).
- Write clear, specific commit/change descriptions naming the actual files and behavior changed.
- Never commit `.env` files, `node_modules`, or `dist` (already correctly excluded in `.gitignore`).
- Review the full diff before considering a change complete.
- Keep `package-lock.json` in sync with `package.json` — run `npm install` after any dependency change rather than hand-editing the lock file.

## 22. File-Modification Rules

Before changing a file:
- Read the complete file, not just the section you expect to touch.
- Check every file that imports it (e.g., before changing `ProductCard.jsx`'s prop shape, check `HomePage.jsx`, `ShopPage.jsx`, and `ProductPage.jsx`, all of which render it).
- Preserve existing local patterns (naming, structure, style) rather than imposing a different personal style.
- Prefer a targeted edit over a full-file rewrite when only part of a file needs to change.
- Do not delete a component/page/export without first confirming (via search) that nothing imports it — except the already-documented dead-code list in Architecture.md §2, which is a known, pre-verified exception.

## 23. Commands and Tool Use

- Use `npm` commands consistent with `package.json` scripts (`npm run dev`, `npm run build`, `npm run preview`) — there is no `yarn.lock` or `pnpm-lock.yaml`, so do not introduce a different package manager.
- Avoid destructive commands (no `rm -rf` outside of build artifact cleanup, no force-pushes, no repository resets).
- Do not run any command that modifies files outside this repository.
- There are no database migrations to run (no database exists) — do not fabricate or run any migration-like command.
- Never claim a command succeeded without actually checking its output/exit status.

## 24. Prohibited Actions

The agent must not:
- Fabricate files, test results, or implementation status that were not actually created or verified.
- Mark a task complete when the build fails, a route errors, or a claimed feature does not actually work when clicked through.
- Silently resurrect or repurpose the dead photography-template code as if it were part of the current product, without flagging the origin and getting explicit confirmation.
- Silently expand scope (e.g., turning a "fix the checkout form's copy" task into "wire up a real payment gateway") — always flag scope changes back to the user.
- Add placeholder/mock logic to a path that is supposed to be real (e.g., faking a successful payment without clearly labeling it as a demo simulation, as the existing checkout copy already correctly does).
- Remove or weaken a working feature to make an unrelated change easier.

## 25. Required Completion Checks

Before marking any task complete:
- Run `npm run build` and confirm it completes without errors.
- Manually load the affected route(s) via `npm run dev` or `npm run preview` and click through the relevant flow.
- Check the browser console for new errors or warnings introduced by the change.
- Verify responsive behavior at both the 1180px and 760px breakpoints (or via browser device emulation) if the change touches layout.
- Review the final diff for unrelated changes before reporting completion.
- Confirm no dead code or unused imports were introduced.
- Confirm Design.md and this file's rules were followed for any new UI.

## 26. Failure Protocol

When blocked:
1. State the exact blocker precisely (e.g., "the build fails with error X at file Y line Z").
2. Include the actual error message/output, not a paraphrase.
3. Explain what was attempted to resolve it.
4. Do not work around the blocker destructively (e.g., do not delete a failing feature to make the build pass).
5. Record the blocker in Memory.md once that file exists.
6. Continue with other, unblocked, in-scope work if it's safe and doesn't depend on the blocker.

## 27. Documentation Rules

Update documentation when:
- A feature is completed — update Phases.md status and, if scope changed, PRD.md.
- The architecture changes (new dependency, new pattern, routing library adopted, etc.) — update Architecture.md, including a new ADR if it was a deliberate technical decision.
- A dependency is added or removed — note it in Architecture.md §3/§20 and in the relevant Phases.md task.
- A database, API, or backend is introduced for the first time — fill in the currently "Not applicable" sections of Architecture.md (§8–13) and Rules.md (§11–14) before writing the corresponding code, not after.
- A major decision is made (e.g., choosing a payment gateway) — record it as an ADR in Architecture.md.
- A blocker is identified — record it in Memory.md once that file exists.
- Once implementation begins, create/update Memory.md after every meaningful session per its own instructions.
