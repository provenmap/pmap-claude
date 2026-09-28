---
name: discover-authoring
description: How /discover turns a scored graph reading into insights and context boards worth showing — the plan and its menu, the recommended set, the briefs, the authoring agents, the push order and the report. Use when running /discover, when authoring one discover brief, or when reading a discover plan or ledger. Key capabilities — the two answer shapes, the wow levers, the network-free agent contract, the push-in-order rule, re-runs that replace.
user-invokable: false
metadata:
  author: ProvenMap
  version: 1.0.0
---

# Discover — authoring the answers a graph can give

`/discover` is graph-first, then read. A script reads the context pack and scores what the
architecture can answer on its own: **insights** (an observation about one element from its own
characteristics, traced as a trail) and **context boards** (why something matters, drawn as a
small board of its relationships). Before anything is suggested, the orchestrator reads the code
behind the strongest rows and curates them: what stands out, a sharper question and the
non-obvious angle per row, the rows set aside. The user takes that set or picks from the menu.
Agents author the picks in parallel from a brief, built around the angle; a script pushes them
in order; a report closes.

The same skill serves the ProvenMap Code, Connect and Architect plugins. Only the universe
differs: the bound board's tree for code and connect, the whole workspace for the architect.

## The two answer shapes

| | Insight | Context board |
|---|---|---|
| Answers | "Why does everything run through `x`?" | "What is the blast radius of `x`?" |
| Anchored on | one element, with an edge-grounded trail | one subject, with its neighbourhood drawn |
| Lives | under the trail's entry board, in the Insights Bar | in the hub's Context boards card, outside the tree |
| Filed as | the `architecture-highlights` skill, one batch per run | a `contextmap` board with provenance on every element |
| Script owns | the trail, polarity, priority, measurement | the nodes, edges, containment, styles |
| Agent owns | name, evidence prose, advice, up to two point findings | name, question, description, the per-node notes |

## The wow levers (the script enforces them; the agent keeps them)

- **The read is the wow.** A count is what anyone could say; the finding the code shows is what
  the owner did not know: two callers with half the system behind them, a "helper" every write
  funnels through, one entry path that skips the validation. The script finds where to look and
  keeps test and example code out of the set; the read (workflow Step 2) finds what is there and
  writes it as the question, the angle and the evidence the author builds on.
- **The trail is the demo.** Every insight ships a multi-stop trail; a fan-out from a hub
  (branch stops sharing one `from`) reads instantly; a `layer` hop makes the camera fly.
- **Half the insights cross a layer when the tree has one** — and every crossing means
  something: a chokepoint or cascade descends into the dependent onto the code that makes the
  call, a journey walks a boundary port's edge and climbs from it onto the node it stands
  for, a hand-off names the one element inside a drill-down that talks to its siblings. The
  script proves each hop the way the server does ([references/families.md](references/families.md),
  "Layer crossings"); on the landscape, a flow across apps.
- **Variety in the set** — distinct polarities across the insights, no two items on one anchor,
  every level the universe has, at most one ghost proposal.
- **C4-shaped context boards** — the level in the reading strip; the subject the one `xl`; the
  first ring `lg` so its notes read on the canvas; people and externals small; the answer's path
  the heavy edges, each with its flow kind; kind left to the archetype. The script decides all
  of it ([references/c4-reading.md](references/c4-reading.md)); the push applies it.

## What a brief is

`--briefs` writes one JSON per chosen candidate: the candidate itself (trail or drawn board,
ready to copy), the slice of the pack around it (its elements plus one hop, with their edges and
boards), the archetype families it needs, the org's context-tag names, the single `output` path
to write, and the `rules` path — [references/authoring.md](references/authoring.md), the
agent-facing contract. The layout keeps preparation and results apart: `discover/` holds only
the plan, the briefs, the context packs and the ledger; an insight's output lands in
`insights/<id>.json` and a context board's in `context-maps/<id>.json` (under `.provenmap/`
for the code and connect plugins, under the working set for the architect). `verify` says what the agent may read beyond the brief: `source` (code
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
   push; its insight batches ride the ledger as `cleanup.insightBatches` and are named in
   `replacesBatchIds` on this run's first insight push, so their unreviewed insights go as the
   new batch lands (reviewed ones stay). Only a run for the same primary board carries them. A
   board edited since we drew it is kept and named.

## References

- [references/authoring.md](references/authoring.md) — the agent contract: how to author one brief into an insight push or a context-board payload
- [references/families.md](references/families.md) — every candidate family: the question it answers, the shape it draws, the prose that fits it
- [references/context-board-payload.md](references/context-board-payload.md) — the context-board payload schema and its gates
- [references/c4-reading.md](references/c4-reading.md) — how a drawn board reads as a C4 diagram: what each instrument asserts, and the note style per level
- [references/discover-workflow.md](references/discover-workflow.md) — the command's Steps 2–8, clause by clause: the read, the frame, the pick, the briefs, the authoring, the pushes, the report
- `${CLAUDE_PLUGIN_ROOT}/knowledge/insight-writing/SKILL.md` — how every insight and context-board word is written (shared with `/insights`)
