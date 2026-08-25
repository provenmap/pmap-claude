---
name: demonstrative-insights
description: How to craft a small, high-impact set of demonstrative insights that showcase the insights feature on a board — choosing path-friendly skills for visual variety, reading the context pack, assembling and validating each push payload, building edge-grounded multi-node paths, and applying reusable path recipes. Used by /demo-insights.
user-invokable: false
metadata:
  author: ProvenMap
  version: 0.1.0
---

# Demonstrative Insights — Methodology

`/demo-insights` invokes this skill to seed a board with a few insights that look great immediately — the goal is **demonstration**, not exhaustive analysis. The schema and push pipeline are identical to `/insights` (see [../insights/references/report-output-format.md](../insights/references/report-output-format.md)); what differs is *what you optimise for*.

## Analytical vs demonstrative

| | `/insights` (analytical) | `/demo-insights` (demonstrative) |
|---|---|---|
| Goal | Find what's true and actionable | Make the board legible and impressive in one glance |
| Findings | As many as warranted | 1–3 per insight — just enough to anchor a path |
| Paths | When the skill calls for them | **Always** — at least one multi-node path per insight |
| Coverage | Thorough; read source as needed | Graph-first and fast; read source only to verify a claim |
| Variety | Driven by evidence | Deliberate — distinct polarities and path shapes across the set |
| Size | Whatever the analysis yields | 2–4 insights total; small enough to take in at once |

## What makes a good demonstrative insight

1. **Trail-first.** The trail *is* the demo. Each insight ships a multi-stop `trail` connecting several nodes. Board and node slugs come directly from the pack — never invent them.
2. **Edge-grounded.** Every consecutive stop pair must traverse a real edge from `pack.edges`. A trail that invents connections is worse than no trail — it misrepresents the architecture. Cross-board hops are fine when the flow genuinely continues across boards.
3. **Visually varied.** Across the set, use different **polarities** (observation / risk / opportunity) so the board shows a spread of colour, and different **trail shapes** (linear flow, fan-out cascade, chokepoint chain).
4. **Legible.** 3–6 stops on a trail's main line. Use branch stops (same `from` value, distinct `branchLabel`) to fan out from a high-degree node — a hub-and-spokes shape reads instantly and is the most compelling shape on a board.
5. **Fast.** The board JSON already carries node descriptions and edges. Trust it. Only open source files to confirm a specific number you want to cite (e.g. "imported ~125 times").

## Selecting the skills (skill → polarity → path shape)

Pick skills that each produce a *different* kind of path:

| Skill | Natural polarity | Path shape | Recipe |
|---|---|---|---|
| `feature-journey` | observation | Linear execution flow, entrypoint → engine → leaf | Execution Journey |
| `how-does-it-work` | observation | Linear request trace | Execution Journey |
| `blast-radius` | risk | SPOF root → hub → fan-out to dependents | Blast-Radius Cascade |
| `hidden-dependency` | risk / observation | Many callers → one chokepoint (fan-in) | Hidden-Dependency Chokepoint |
| `onboarding-map` | observation | Importance-ordered tour | Execution Journey (broadened) |
| `future-readiness` | opportunity | Seam → strained area → proposed change | any + a `proposal` |

**Preference order**, when the account has them: `feature-journey` (observation flow), `blast-radius` (risk cascade), `hidden-dependency` (risk/observation chokepoint), then `how-does-it-work` / `onboarding-map` / `future-readiness`. If the preferred set is unavailable, fall back to any skills in the `discovery`, `reliability`, or `architecture_health` categories.

If a focus prompt names a concern (security, performance, cost), include that skill too — but still pair it with at least one path-producing skill so the demo has a path.

## The context pack

`pmap-insights.js --build-context --demo` writes the pack to `.provenmap/insights/<board>.context.json` — the canonical path `--save-insight --demo` reads back for its quality gates. It gives you, without any manual indexing:

- **node index** — `pack.elements[]` (`{key, board, slug, type, name, description}`); use `board` + `slug` as trail stop values
- **edge adjacency** — `pack.edges[]` (`{board, sourceKey, targetKey, type, description}`) — the source of truth for path grounding
- **degree** — `pack.degree[]` (`{key, board, fanIn, fanOut}`), ranked most-connected first — your hub/chokepoint shortlist
- **context vars** — `pack.boards[].context`

`--demo` bounds the universe to the target board plus its direct children — no siblings.

Fallback, and for a single small board where the pack is overkill: on a non-zero exit, read `.provenmap/boards/<board>.json` directly and index it by hand per [../insights/references/graph-context.md](../insights/references/graph-context.md).

## Assembling the payload

One push payload per chosen skill — a `PushInsightsCommand` with `insights: InsightDraft[]`:

1. **1–3 findings.** Each is one `InsightDraft`. Use `recommendation` for `risk`/`opportunity`, `context` for `observation`/`strength` (never both in the same finding).
2. **Multi-stop trail on every finding** — build it with the checklist below. Trail `board` and `node` values must be canonical slugs from the pack.
3. **Optional: one proposal** (`action: "add"|"modify"|"remove"`, `targetType: "node"|"edge"`) on one finding, to show structural proposals render. When adding a node, mark it `proposed: true` in the trail; when adding an edge, add a `proposedEdge` via hop.
4. Give each insight a **distinct polarity** from the others in the set (see *Visually varied*, above).
5. Write a tight markdown `content` report and a `title` / `description`.

`--save-insight --demo` validates all of it before pushing: Zod schema (trail board/node slugs, advice mutually exclusive), the pack gates (every trail stop grounded in the pack), and the demo gates — ≥1 insight with ≥3 connected trail stops, and every same-board consecutive stop pair edge-grounded against the pack.

## Building a trail (the checklist)

- **Pick nodes from the pack.** Use `pack.degree` (ranked most-connected first) to identify the hub (`fanIn` for chokepoints, `fanOut` for blast-radius roots). Every stop's `board` and `node` must be canonical slugs from `pack.boards[].slug` / `pack.elements[].slug`.
- **Main line: 3–6 stops**, each consecutive pair grounded on a real edge. Each stop after the first carries `from` (prior stop id) and `via: { kind: "edge", edge: "<edge-slug>" }`.
- **Branches for fan-out.** Add extra stops sharing the same `from` as the hub stop, each with a distinct `branchLabel`. Every branch stop must also share a real edge with the hub.
- **No consecutive duplicates.** A node may reappear later in a genuinely different role (distinct `note`), never back-to-back.
- **First stop is the anchor.** The `trail` field lives on the `InsightDraft` — there is no separate findingRef; the finding's polarity and priority apply to the whole trail.

## Re-running a demo

Each skill has a `resultsMode`: `replace` (a new run overwrites the previous run of that skill) or `append` (a new run adds alongside). Surface this to the user — for a repeatable demo, `replace` skills stay clean across runs while `append` skills accumulate.

## References

- [references/path-recipes.md](references/path-recipes.md) — three reusable, archetype-agnostic path recipes with worked examples
- [../insights/references/report-output-format.md](../insights/references/report-output-format.md) — InsightDraft, Trail, Stop, Proposal schemas (shared with `/insights`)
- [../insights/references/graph-context.md](../insights/references/graph-context.md) — extracting node/edge context from board JSON
