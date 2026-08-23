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

1. **Path-first.** The path *is* the demo. Each insight ships ≥1 `InsightPath` connecting several nodes. Findings exist mainly to give path steps a `findingRef` (colour + priority).
2. **Edge-grounded.** Every consecutive pair of path steps must traverse a real edge from the board's `edges[]`. A path that invents connections is worse than no path — it misrepresents the architecture. Cross-board hops are fine when the flow genuinely continues across boards (register both boards in scope).
3. **Visually varied.** Across the set, use different **polarities** (observation / risk / opportunity) so the board shows a spread of colour, and different **path shapes** (linear flow, fan-out cascade, chokepoint chain).
4. **Legible.** 3–6 nodes on a path's main line. Use `branches[]` to fan out from a high-degree node — a hub-and-spokes branch reads instantly and is the most compelling shape on a board.
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
| `future-readiness` | opportunity | Seam → strained area → proposed change | any + a `GraphSuggestion` |

**Preference order**, when the account has them: `feature-journey` (observation flow), `blast-radius` (risk cascade), `hidden-dependency` (risk/observation chokepoint), then `how-does-it-work` / `onboarding-map` / `future-readiness`. If the preferred set is unavailable, fall back to any skills in the `discovery`, `reliability`, or `architecture_health` categories.

If a focus prompt names a concern (security, performance, cost), include that skill too — but still pair it with at least one path-producing skill so the demo has a path.

## The context pack

`pmap-insights.js --build-context --demo` writes the pack to `.provenmap/insights/<board>.context.json` — the canonical path `--save-insight --demo` reads back for its quality gates. It gives you, without any manual indexing:

- **node index** — `pack.elements[]` (`{key, board, slug, type, name, description}`), with pre-assigned scope keys
- **edge adjacency** — `pack.edges[]` (`{board, sourceKey, targetKey, type, description}`) — the source of truth for path grounding
- **degree** — `pack.degree[]` (`{key, board, fanIn, fanOut}`), ranked most-connected first — your hub/chokepoint shortlist
- **context vars** — `pack.boards[].context`

`--demo` bounds the universe to the target board plus its direct children — no siblings.

Fallback, and for a single small board where the pack is overkill: on a non-zero exit, read `.provenmap/boards/<board>.json` directly and index it by hand per [../insights/references/graph-context.md](../insights/references/graph-context.md).

## Assembling the payload

One push payload per chosen skill:

1. **Scope first (copy from the pack).** Copy `pack.scopeBoards` into `scope.boards`. For every node you cite, copy its row from `pack.elements` into `scope.elements` keeping the pre-assigned `key` and `board` verbatim, adding `role` (`focus`/`context`). Cite only what you use; never re-generate keys. Anything you spot in source that has no row in `pack.elements` belongs in a `GraphSuggestion` (`action: "add"`, `element: null`), not a cited finding.
2. **1–3 findings.** Just enough to anchor the path — each path's key step should carry a `findingRef`. Use `recommendation` for `risk`/`opportunity`, `context` for `observation`/`strength` (never both).
3. **At least one multi-node path** — build it with the checklist below.
4. **Optional: one suggestion** (`add`/`modify`/`remove`) to show structural proposals render.
5. Give the insight a **distinct polarity** from the others in the set (see *Visually varied*, above).
6. Write a tight markdown `content` report and a `title` / `description`.

`--save-insight --demo` validates all of it before pushing: Zod, then `validateScopeReferences` (ElementKey/BoardAlias/findingRef resolve; unique ids; no consecutive-duplicate steps; `recommendation`/`context` mutually exclusive), the pack gates (cited elements exist in the pack), and the demo gates — ≥1 path with ≥3 connected nodes, and every same-board path step pair edge-grounded against the pack.

## Building a path (the checklist)

- **Scope before steps.** Register every node you cite in `scope.elements` first (*Assembling the payload*, step 1). Paths and findings reference those keys, never raw slugs.
- **Pick the hub from the graph.** Read fan-in/fan-out straight from `pack.degree` (ranked most-connected first). The top node is your branch point for a fan-out path; a node with high `fanIn` is your chokepoint for a hidden-dependency path.
- **Main line: 3–6 nodes**, each consecutive pair a real edge. Direction can follow or reverse an edge — what matters is that the edge exists.
- **Branches for fan-out.** Attach `branches[]` to the hub step, one branch per dependent — each branch element must also share a real edge with the hub.
- **No consecutive duplicates.** An element may reappear later in a genuinely different role (distinct `label`), never back-to-back.
- **Anchor with `findingRef`.** Put the insight's main finding on the hub/origin step so the path inherits its colour and priority.
- **`defaultBoard`** = the board alias most steps belong to.

## Re-running a demo

Each skill has a `resultsMode`: `replace` (a new run overwrites the previous run of that skill) or `append` (a new run adds alongside). Surface this to the user — for a repeatable demo, `replace` skills stay clean across runs while `append` skills accumulate.

## References

- [references/path-recipes.md](references/path-recipes.md) — three reusable, archetype-agnostic path recipes with worked examples
- [../insights/references/report-output-format.md](../insights/references/report-output-format.md) — Scope, ElementInsight, InsightPath, GraphSuggestion schemas (shared with `/insights`)
- [../insights/references/graph-context.md](../insights/references/graph-context.md) — extracting node/edge context from board JSON
