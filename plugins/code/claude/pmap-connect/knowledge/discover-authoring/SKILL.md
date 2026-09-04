---
name: discover-authoring
description: How /discover turns a scored graph reading into insights and context boards worth showing — the plan and its menu, the recommended set, the briefs, the authoring agents, the push order and the report. Use when running /discover, when authoring one discover brief, or when reading a discover plan or ledger. Key capabilities — the two answer shapes, the wow levers, the network-free agent contract, the push-in-order rule, re-runs that replace.
user-invokable: false
metadata:
  author: ProvenMap
  version: 1.0.0
---

# Discover — authoring the answers a graph can give

`/discover` is graph-first and fast. A script reads the context pack, scores what the
architecture can answer on its own, and offers two ranked menus: **insights** (an observation
about one element from its own characteristics, traced as a trail) and **context boards** (why
something matters, drawn as a small board of its relationships). The user picks, or asks the
script to choose. Agents author the picks in parallel from a brief; a script pushes them in
order; a report closes.

The same skill serves the ProvenMap Code, Connect and Architect plugins. Only the universe
differs: the bound board's tree for code and connect, the whole workspace for the architect.

## The two answer shapes

| | Insight | Context board |
|---|---|---|
| Answers | "Why does everything run through `x`?" | "What is the blast radius of `x`?" |
| Anchored on | one element, with an edge-grounded trail | one subject, with its neighbourhood drawn |
| Lives | under the trail's entry board, in the Insights Bar | in the hub's Context boards card, outside the tree |
| Filed as | the `architecture-highlights` skill, replace mode | a `contextmap` board with provenance on every element |
| Script owns | the trail, polarity, priority, measurement | the nodes, edges, containment, styles |
| Agent owns | name, evidence prose, advice, up to two point findings | name, question, description, the per-node notes |

## The wow levers (the script enforces them; the agent keeps them)

- **The trail is the demo.** Every insight ships a multi-stop trail; a fan-out from a hub
  (branch stops sharing one `from`) reads instantly; a `layer` descent makes the camera fly.
- **A crossing when the tree has one** — a journey that descends into a drill-down, a flow
  across apps on the landscape.
- **Variety in the set** — distinct polarities across the insights, no two items on one anchor,
  every level the universe has, at most one ghost proposal.
- **Styled context boards** — emphasis on the subject, flow on the answer's path, everything
  else subtle. The push applies the styles the payload names.

## What a brief is

`--briefs` writes one JSON per chosen candidate: the candidate itself (trail or drawn board,
ready to copy), the slice of the pack around it (its elements plus one hop, with their edges and
boards), the archetype families it needs, the org's context-tag names, the single `output` path
to write, and the `rules` path — [references/authoring.md](references/authoring.md), the
agent-facing contract. `verify` says what the agent may read beyond the brief: `source` (code
plugin: files named in element descriptions, to confirm a number) or `pack` (connect,
architect: nothing else).

## Rules that never bend

1. **Copy, never invent.** The trail's stops, `via.edge` slugs, board and node slugs, and a
   drawn board's nodes, edges and sources come from the candidate verbatim. An agent adds prose
   and notes; it never adds a stop, a node, an edge, or a slug. The save gates reject anything
   else, and a board that shows what the architecture lacks is worse than no board.
2. **One file per brief, at `output`.** Nothing else on disk. The reply is one line.
3. **No network.** The pack is the evidence; for code, source files confirm a number.
4. **Push in order, from the orchestrator.** Agents author; the CLI pushes — one paced writer,
   never four. A failed push is fixed once from `validationErrors`, else marked failed and the
   run continues.
5. **Re-runs replace.** The previous run's context boards are removed before this run's first
   push; insights replace through the skill's `replace` mode. A board edited since we drew it is
   kept and named.

## References

- [references/authoring.md](references/authoring.md) — the agent contract: how to author one brief into an insight push or a context-board payload
- [references/families.md](references/families.md) — every candidate family: the question it answers, the shape it draws, the prose that fits it
- [references/context-board-payload.md](references/context-board-payload.md) — the context-board payload schema and its gates
- [references/discover-workflow.md](references/discover-workflow.md) — the command's Steps 2–7, clause by clause
- [../insights/references/report-output-format.md](../insights/references/report-output-format.md) — InsightDraft, Trail, Stop, Proposal (shared with `/insights`)
