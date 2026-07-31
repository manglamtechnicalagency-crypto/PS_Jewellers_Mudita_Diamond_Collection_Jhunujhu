# Development Phases

> **Current delivery status — 2026-07-31:** Core implementation is complete through database and infrastructure integration. Supabase migrations `0001`–`0023` are applied remotely and locally; R2 buckets exist; Vercel is the production target. Remaining release work is environment-variable verification, a fresh production deployment, endpoint smoke checks, accessibility/UX hardening, and the R2 quarantine verification worker. Historical phase descriptions below remain roadmap context; this status block is authoritative.

> **Implementation correction:** The Next.js migration, PS Jewellers rebrand, Supabase integration, R2 presign security hardening, migrations, tests, type-check, and production build have been completed. Do not reset status to the old Vite/backend-less baseline.

## 1. Roadmap Overview

- **Current project stage:** Working Vercel-hosted Next.js showroom with Supabase catalogue/admin workflows and Cloudflare R2 media integration. Some legacy photography files remain archived/non-runtime.
- **MVP target:** The current demo already satisfies a "presentable client demo" MVP for browsing/cart/wishlist/checkout-UI. What's missing is cleanup, correctness fixes, and documentation-driven guardrails — covered in Phases 0–3 below. Phases 4+ only apply if the stakeholder confirms the goal is a real, transactable store (see PRD.md Open Questions).
- **Total planned phases:** 9 (0–8). Phases 4–8 are conditional on stakeholder confirmation that a production store is the goal.
- **Phase dependency summary:** Phases 0–3 are sequential and unconditional. Phases 4–8 depend on Phase 3 and on stakeholder answers to PRD.md §23 Open Questions.
- **Release strategy:** Vercel production deployment. Environment changes require a new deployment; validate `/api/catalogue`, `/api/public/settings`, and `/api/public/site-media` after release.

## 2. Phase Status Legend

- Not Started
- In Progress
- Blocked
- In Review
- Completed
- Deferred

## 3. Phase Execution Rules

- Complete one phase before starting dependent phases.
- Validate each phase independently using its own Test Plan and Exit Criteria.
- Update Memory.md after meaningful progress (once Memory.md exists — see Rules.md §27).
- Do not mark a phase complete until all exit criteria pass.
- Record blockers and deferred items explicitly rather than silently dropping them.
- Phases 4–8 must not begin until the stakeholder has answered the Open Questions in PRD.md §23 — starting them earlier risks building the wrong thing.

## 4. Phase Summary Table

| Phase | Name | Goal | Dependencies | Status |
|---|---|---|---|---|
| 0 | Repository Audit & Documentation Baseline | Establish verified documentation (this document set) | None | Completed |
| 1 | Cleanup & Stabilization | Remove dead code, pin dependencies, fix known defects | Phase 0 | Not Started |
| 2 | Correctness & UX Gaps | Fix checkout confirmation, 404 handling, per-route SEO metadata | Phase 1 | Not Started |
| 3 | Baseline Quality Tooling | Add linting, formatting, minimal tests, basic CI | Phase 1 | Not Started |
| 4 | Stakeholder Decision Gate | Confirm production-store scope with client | Phase 2, 3 | Not Started |
| 5 | Backend Foundation (conditional) | Introduce API/database if approved | Phase 4 | Not Started |
| 6 | Authentication (conditional) | Real accounts/login if approved | Phase 5 | Not Started |
| 7 | Payments & Real Checkout (conditional) | Real payment gateway if approved | Phase 5 | Not Started |
| 8 | Production Launch Readiness (conditional) | Observability, SEO, legal/licensing, launch checklist | Phase 6, 7 | Not Started |

## Phase 0 — Repository Audit & Documentation Baseline

### Objective
Produce verified, implementation-ready documentation (PRD.md, Architecture.md, Rules.md, Phases.md, Design.md) grounded entirely in the actual current codebase, distinguishing implemented from planned functionality and flagging all open questions.

### Scope
Reading and documenting the existing repository. No code changes.

### Out of Scope
Any code modification, dependency change, or feature work.

### Dependencies
None.

### Tasks
- [x] Inspect full repository structure, config, and source files.
- [x] Identify live vs. dead code paths (confirmed via import-graph search).
- [x] Produce PRD.md distinguishing Verified from Assumed requirements.
- [x] Produce Architecture.md reflecting actual implementation, including "Not applicable" sections for backend/database/API/auth that don't exist yet.
- [x] Produce Rules.md scoped to the actual stack in use.
- [x] Produce this Phases.md roadmap.
- [x] Produce Design.md from the actual `styles.css` tokens and component patterns.
- [ ] Deferred: Memory.md — intentionally not created yet; create it when implementation work (Phase 1) begins.

### Technical Work
Documentation only — no frontend/backend/database/API/security/testing code work in this phase.

### Deliverables
`PRD.md`, `Architecture.md`, `Rules.md`, `Phases.md`, `Design.md` in the project root.

### Acceptance Criteria
All five documents exist, are internally consistent with each other, and every non-obvious claim is traceable to a specific file or line in the repository.

### Test Plan
Manual cross-check: every "Verified" claim in each document was confirmed by directly reading the referenced file.

### Risks
Documentation could go stale if code changes without doc updates — mitigated by Rules.md §27 (documentation update obligations).

### Exit Criteria
Documents committed to the project root; ready for Phase 1 to begin.

### Status
**Completed**

---

## Phase 1 — Cleanup & Stabilization

### Objective
Remove or explicitly resolve the dead-code and stability risks identified during the audit, without changing any user-visible behavior of the live application.

### Scope
- Decide the fate of the dead photography-template files (`AboutPage.jsx`, `ContactPage.jsx`, `JournalPage.jsx`, `PortfolioPage.jsx`, `ProjectPage.jsx`, and their exclusive components: `AboutStudio`, `Hero`, `JournalStrip`, `Moments`, `SelectedWork`, `Services`, `Testimonials`, `FAQ`, `PageHero`, `SectionHeading`, `ArrowIcon`) and the unused `data.js` exports (`projects`, `journalPosts`).
- Pin all `package.json` dependency versions to explicit semver ranges instead of `"latest"`.
- Resolve the unused `typescript` dependency (remove it, or explicitly adopt TypeScript in a dedicated later phase — not both left ambiguous).
- Confirm and document the single actual deployment target (Vercel or Netlify) rather than maintaining both configs indefinitely without clarity.

### Out of Scope
Any new feature, any visual redesign, any behavior change to live pages.

### Dependencies
Phase 0 documentation; stakeholder confirmation on whether to delete or archive the dead files (**[OPEN QUESTION]** — default recommendation is deletion, since they are unreachable and unrelated to the jewellery product).

### Tasks
- [ ] Get explicit go-ahead (or default-approval) to delete the dead-code files listed above.
- [ ] Remove dead files and their now-unused `data.js` exports (`projects`, `journalPosts`) if approved.
- [ ] Pin `react`, `react-dom`, `vite`, `@vitejs/plugin-react`, `typescript` to explicit versions in `package.json`; run `npm install` to refresh the lock file.
- [ ] Resolve the `typescript` dependency (remove, or flag for a future migration phase and leave a comment/README note explaining why it's present but unused).
- [ ] Confirm and document (in README or Architecture.md) the single actual hosting target.

### Technical Work
- **Frontend work:** Delete unused files; confirm no remaining imports reference them (`grep` verification).
- **Backend work:** N/A.
- **Database work:** N/A.
- **API work:** N/A.
- **Security work:** N/A.
- **Testing work:** Manual click-through of every live route after deletion to confirm nothing broke.
- **Documentation work:** Update Architecture.md §2/§12 to remove now-resolved dead-code notes (or mark them "Resolved — removed in Phase 1").

### Deliverables
- Cleaned `src/` tree with no unreferenced files.
- `package.json` with pinned versions.
- Updated Architecture.md reflecting the cleanup.

### Acceptance Criteria
- `grep` for each deleted component's name returns zero remaining references.
- `npm run build` succeeds with no new warnings about missing imports.
- All previously-working routes still render identically.

### Test Plan
- **Unit tests:** N/A (none exist yet — see Phase 3).
- **Integration tests:** N/A yet.
- **End-to-end scenarios:** Manually visit every route in `App.jsx`'s route table; confirm each renders without console errors.
- **Manual checks:** Confirm `npm run dev` and `npm run build` both succeed.
- **Error cases:** Confirm deleting files did not break any import elsewhere (search-verified).
- **Permission checks:** N/A (no roles exist).
- **Responsive checks:** Spot-check home and shop pages at 1180px and 760px breakpoints.

### Risks
Deleting a file that turns out to have a hidden reference (e.g., dynamic import) — mitigated by an exhaustive `grep` pass before deletion, as already performed during Phase 0 audit.

### Exit Criteria
- All required tasks finished.
- Build passes.
- No console errors on any live route.
- Documentation updated.
- Memory.md created and updated with this phase's outcome (per Rules.md §27 — this is the first implementation phase, so Memory.md should be created now).

### Status
**Not Started**

---

## Phase 2 — Correctness & UX Gaps

### Objective
Fix the specific, verified defects identified in the audit that affect the demo's credibility, without expanding scope beyond what's documented in PRD.md.

### Scope
- Fix `ProductPage.jsx` so an unknown/invalid slug renders `NotFoundPage` instead of silently falling back to `products[0]`.
- Add a clear, labeled confirmation state to the checkout form (e.g., "Demo order simulated — no real payment was processed") after submission, so the non-functional checkout doesn't feel broken.
- Add per-route `<title>`/meta description handling (even a simple `document.title = ...` side effect per page is acceptable at this scale) so `/`, `/shop`, `/product/:slug`, etc. don't all share identical metadata.
- Add basic required-field indication (not full validation, since checkout remains non-functional by design) to the checkout form so it doesn't look unfinished.

### Out of Scope
Real payment processing, real order persistence, real backend validation — these remain Future scope pending PRD.md Open Questions resolution.

### Dependencies
Phase 1 (clean baseline).

### Tasks
- [ ] Fix invalid-slug handling in `ProductPage.jsx` (route to `NotFoundPage` when `products.find(...)` returns nothing).
- [ ] Add a checkout success/confirmation UI state.
- [ ] Add per-route document title updates.
- [ ] Add `loading="lazy"` to below-the-fold `<img>` tags as a low-risk performance improvement.

### Technical Work
- **Frontend work:** Modify `ProductPage.jsx`, `CheckoutPage.jsx`, and add a small shared `useDocumentTitle`-style effect (or equivalent) used per page.
- **Backend work:** N/A.
- **Database work:** N/A.
- **API work:** N/A.
- **Security work:** N/A (no new inputs are transmitted anywhere).
- **Testing work:** Manual verification of each fixed flow.
- **Documentation work:** Update PRD.md §8.3 (checkout table) and Architecture.md §15 (Known Issues) to mark these as resolved.

### Deliverables
Updated `ProductPage.jsx`, `CheckoutPage.jsx`, and any shared title-management utility.

### Acceptance Criteria
- Visiting `/product/does-not-exist` renders `NotFoundPage`, not the first product.
- Submitting the checkout form shows a clear "demo order" confirmation message.
- Each major route has a distinct browser tab title.

### Test Plan
- **Manual checks:** Visit an invalid product slug; submit checkout with and without filled fields; inspect tab title across at least 5 different routes.
- **Error cases:** Confirm the checkout confirmation clearly does not claim a real order was placed.
- **Responsive checks:** Confirm the new confirmation UI works at both breakpoints.

### Risks
Scope creep toward "just add real checkout validation while I'm in there" — explicitly prohibited by Rules.md §4; flag instead of implementing.

### Exit Criteria
All tasks complete, build passes, no console errors, PRD.md/Architecture.md updated, Memory.md updated.

### Status
**Not Started**

---

## Phase 3 — Baseline Quality Tooling

### Objective
Establish the minimum quality infrastructure (linting, formatting, a first test, basic CI) needed so future phases have a safety net, without over-engineering for a project of this size.

### Scope
- Add ESLint + Prettier configuration matching the existing code style (double quotes, semicolons, 2-space indent).
- Add Vitest + React Testing Library as the test framework.
- Write a small number of high-value tests: `formatPrice`, `App.jsx`'s `addToCart`/`updateCart`/`toggleWishlist` logic, and a smoke test that each route renders without throwing.
- Add a minimal GitHub Actions (or equivalent) CI workflow running lint + test + build on every push.

### Out of Scope
100% test coverage, end-to-end (Playwright/Cypress) testing — not justified at this project size yet; revisit if Phase 5+ proceeds.

### Dependencies
Phase 1 (clean baseline), Phase 2 (fixed known defects, so tests aren't written against known-broken behavior).

### Tasks
- [ ] Add ESLint config (React + hooks rules) and Prettier config; fix any resulting lint errors.
- [ ] Add Vitest + React Testing Library; configure `vite.config.js` test environment.
- [ ] Write unit tests for `formatPrice` and the cart/wishlist reducer-like logic extracted (if needed) from `App.jsx`.
- [ ] Write a smoke test rendering each route.
- [ ] Add a CI workflow file running `npm run lint`, `npm test`, `npm run build`.

### Technical Work
- **Frontend work:** Possibly extract cart/wishlist logic from `App.jsx` into testable pure functions if needed for clean unit testing.
- **Testing work:** As described in Scope.
- **Documentation work:** Update Architecture.md §18 (Testing Architecture) and §20 (CI/CD) to reflect the new setup, replacing "none exists" with the actual configuration.

### Deliverables
`.eslintrc`/`eslint.config.js`, `.prettierrc`, test files, CI workflow file.

### Acceptance Criteria
- `npm run lint` and `npm test` both exist as scripts and pass.
- CI runs on every push/PR and fails the build if lint/test/build fails.

### Test Plan
Covered by the tests themselves; validate CI by pushing a deliberately failing change to a branch and confirming CI catches it, then reverting.

### Risks
Over-investing in tooling for a small demo — mitigated by deliberately scoping this to "baseline," not comprehensive coverage.

### Exit Criteria
Lint, tests, and CI all green on the main branch; Architecture.md and Rules.md §20 updated to remove "no test infrastructure" language; Memory.md updated.

### Status
**Not Started**

---

## Phase 4 — Stakeholder Decision Gate

### Objective
Obtain explicit stakeholder answers to the Open Questions in PRD.md §23 before any further backend/auth/payment work begins.

### Scope
Present the current, cleaned-up demo to the stakeholder; collect decisions on: end goal (permanent demo vs. real store), document ownership, brand name confirmation, payment gateway choice (if applicable), inventory management approach, and launch timeline.

### Out of Scope
Any code work.

### Dependencies
Phase 2, Phase 3 (a stable, tested demo is a better artifact to review than a rough one).

### Tasks
- [ ] Schedule/conduct stakeholder review.
- [ ] Record answers to all PRD.md §23 Open Questions.
- [ ] Update PRD.md to convert resolved "Assumed"/"Open Question" items to confirmed requirements.
- [ ] Decide whether Phases 5–8 proceed, and in what order/priority.

### Technical Work
None — this is a decision-making phase.

### Deliverables
Updated PRD.md with resolved Open Questions; a go/no-go decision on Phases 5–8, recorded in Memory.md.

### Acceptance Criteria
Every Open Question in PRD.md §23 has either a confirmed answer or an explicit "deferred, revisit by [date]" note.

### Test Plan
N/A — non-technical phase.

### Risks
Proceeding to Phase 5+ without this gate risks building backend/auth/payment infrastructure the client doesn't actually want — this is the single highest-impact risk in the whole roadmap.

### Exit Criteria
Stakeholder sign-off recorded; PRD.md updated; Phases 5–8 either scheduled or marked Deferred.

### Status
**Not Started**

---

## Phase 5 — Backend Foundation (Conditional)

### Objective
Introduce a real backend and database only if Phase 4 confirms the goal is a production store.

### Scope
To be defined at Phase 4 time — must include choice of stack (documented as an ADR in Architecture.md before implementation begins, per Rules.md §27), a formal `Product` schema derived from PRD.md §12, and migration of `data.js` content into the new data store.

### Out of Scope
Anything not explicitly scoped at Phase 4.

### Dependencies
Phase 4 stakeholder approval.

### Tasks
- [ ] To be defined after Phase 4. Do not pre-build.

### Technical Work / Deliverables / Acceptance Criteria / Test Plan / Risks / Exit Criteria
**Deferred — to be fully specified only after Phase 4 confirms this phase is needed.** Pre-specifying backend architecture now would violate Rules.md §4 (no speculative features).

### Status
**Not Started** (conditional — may become **Deferred** permanently depending on Phase 4 outcome)

---

## Phase 6 — Authentication (Conditional)

### Objective
Add real user accounts/login only if approved in Phase 4 and dependent on Phase 5's backend.

### Scope / Tasks / Technical Work / Deliverables / Acceptance Criteria / Test Plan / Risks / Exit Criteria
**Deferred — to be fully specified only after Phase 4/5 confirm this phase is needed.**

### Dependencies
Phase 5.

### Status
**Not Started** (conditional)

---

## Phase 7 — Payments & Real Checkout (Conditional)

### Objective
Wire the existing checkout UI to a real, chosen payment gateway only if approved in Phase 4.

### Scope / Tasks / Technical Work / Deliverables / Acceptance Criteria / Test Plan / Risks / Exit Criteria
**Deferred — to be fully specified only after Phase 4/5 confirm this phase is needed and a payment gateway is selected.** This phase carries the highest security and compliance weight of the entire roadmap (PCI-relevant concerns, real PII handling) and must not be started without a full security review plan in place first.

### Dependencies
Phase 5.

### Status
**Not Started** (conditional)

---

## Phase 8 — Production Launch Readiness (Conditional)

### Objective
Final hardening before any real public/commercial launch: observability, per-route SEO/structured data, legal review of imagery licensing and certification claims, accessibility audit, and a formal launch checklist.

### Scope / Tasks / Technical Work / Deliverables / Acceptance Criteria / Test Plan / Risks / Exit Criteria
**Deferred — to be fully specified only once Phases 5–7 (or whichever subset is approved) are underway or complete.**

### Dependencies
Phase 6, Phase 7 (or whichever subset applies).

### Status
**Not Started** (conditional)
