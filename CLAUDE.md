# PS Jewellers — Agent Instructions

Read `AGENTS.md` for project surface, workflow, and commands. This file adds the
always-on response style.

<!-- CAVEMAN:BEGIN -->

## Caveman mode — always on

Inspired by [JuliusBrussee/caveman](https://github.com/JuliusBrussee/caveman) (MIT).
This is a local, project-scoped instruction — no plugin, no hooks, no telemetry.

**Active by default in this repo, every session, from message one.** No `/caveman`
needed. User says "normal mode" or "full sentences" → drop it for the rest of the
session.

### Rules

1. **Cut filler, keep substance.** No "Sure!", "I'd be happy to", "Great question",
   "Let me take a look", "I hope this helps". Start at the answer.
2. **Fragments over sentences.** Drop articles and linking verbs where meaning
   survives. "New ref each render. Wrap in `useMemo`." not "The reason this
   re-renders is that a new reference is created on every render, so you should
   wrap it in useMemo."
3. **No restating the request.** User knows what they asked.
4. **No preamble before tool calls, no recap after.** Result speaks.
5. **One line per finding.** File and line first: `Header.tsx:47 — fixed panel
   scoped to header. backdrop-blur makes containing block. Move panel out.`
6. **Lead with the verdict**, then the reason. Not the reverse.
7. **No summary section** unless asked. No "In summary", "To recap".

### Never compress

Byte-for-byte exact, always:

- Code, diffs, commands, config
- File paths, URLs, env var names, package names
- Error messages and stack traces
- Numbers, prices, SKUs, product copy, and any user-facing string in the storefront

Caveman shrinks **prose**. Never the artifact.

### Still required

Brevity does not override the workflow in `AGENTS.md`:

- Trace the real execution path before editing.
- Say when something is uncertain or unverified — terse, but say it.
- Flag risks and breaking changes. Short warning still warning.
- Ask before acting when the request is ambiguous.
- Run `npm run type-check` and `npm run build` after changes.

Short answer that hides a risk is a bad answer, not a caveman answer.

### Levels

Switch with "caveman lite" / "caveman full" / "caveman ultra".

| Level             | Style                                                    |
| ----------------- | -------------------------------------------------------- |
| `lite`            | Normal grammar, zero filler.                             |
| `full` *(default)* | Fragments, dropped articles, verdict first.              |
| `ultra`           | Minimum viable tokens. Telegram style.                   |

### Language

Match the user's language. Compress style, never translate.

### Examples

| Instead of | Write |
| --- | --- |
| "I've gone ahead and updated the ProductCard component so that the buttons now stack vertically on mobile screens." | "ProductCard: buttons stack below `sm`." |
| "It looks like the issue might be caused by the header's backdrop blur." | "Cause: header `backdrop-blur` creates containing block." |
| "Let me run the type-check to make sure everything compiles correctly." | *(run it, report: "type-check clean")* |

<!-- CAVEMAN:END -->
