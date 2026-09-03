---
name: board-reading
description: How to orient on and evolve a ProvenMap board over MCP — read the layered graph, analyze it, and make governed diagram edits. Use when exploring a board, answering architecture questions, assessing quality, or adding/updating/removing nodes and edges. Key capabilities: orientation sequence, board-class detection (landscape/app/layer), question-scoped reading and the answer-mode heuristic, cross-board navigation (layers), analysis types and assessment criteria, the diagram tool contract (slugs are the wiring), archetype attributes and who owns which fields, working-copy narration.
---

# Board Reading & Editing

<!-- Distilled from platform board-orchestrator prompt builders:
     services/prompts/modes/standard/hydrated-board.prompt.ts +
     empty-board.prompt.ts (orientation, intent detection, operations) and
     base/diagram-tool-contract.ts (payload shape + slug discipline).
     references/ carries the detailed criteria and payload shapes. -->

## Orientation sequence

To orient on a board, read in this order (each call is cheap; batch where possible):

1. `get_board_tree` — every descendant layer board (slug, name, drill path).
2. `get_workboard_details` — the board itself: structure, nodes, edges, semantic styles.
3. `get_hub_status` — intent counts, latest insight batch, binding health (`scope: 'tree'`
   aggregates the subtree).
4. `list_intents` / `list_insights` — what work and insights are already in flight.

Summarize: purpose, the domains/containers, layer structure, and anything in flight — slug-first,
then invite direction.

## Classifying the board (the architect-core taxonomy, computed)

Before authoring anything, determine the board's class from three facts:

1. **Tree position** — `get_board_tree('root')`: is this the root, a node's layer board, or
   absent from the tree (standalone)?
2. **Bindings** — `list_source_bindings(workBoardSlug)`: a code-plugin binding (governing or
   reference) makes the board an **app board** — the only class where intents are legal.
3. **Layer flag** — `isChildLayer` on the board details: true + no binding = **plain layer**;
   facet work routes up to the nearest bound ancestor.

Root with zero nodes/edges and no bindings anywhere = the **empty-workspace state** — offer
`/setup-workspace` instead of orienting on nothing. Root orientation is a **portfolio** read
(apps, health, cross-app edges), not a canvas walk.

The orientation move each class deserves — and the working moves that need more than a line
(drilling a container into its own board, reading the `--group-plan` grouping review, inline
styling scope) — is in [references/orientation.md](references/orientation.md).

## Question-scoped reading and the answer mode

For a direct question (`/ask-board`), read only what the question needs — no full orientation:
pick the analysis pattern (structural / dependency / assessment / compliance / documentation —
see [references/analysis-patterns.md](references/analysis-patterns.md)), pull the needed slices
(`get_nodes`, `get_edges` with `nodeSlugs`, `get_node_aspects`), follow `childBoardSlug` only
when the answer lives a layer down.

**Answer-mode heuristic:** prose is the default. Escalate to a _drawn_ answer when the answer
IS a subgraph — dependency/impact traces, cross-app flows, "show me how X reaches Y", anything
where prose would enumerate more than ~5 elements plus their relationships. The drawn form:
`create_context_board {name, question}` generates an ephemeral standalone `contextmap` (outside
the tree — clean by construction); draw the answer-subgraph on it with the normal diagram
tools (ungoverned — nothing is staged), hand back its slug + a prose précis, and clean up with
`delete_context_board` when the conversation is done — never `discard_write_session`, which
would revert the architect's whole working copy. When the tool is absent (older server), fall
back to `create_insight` with a `trail` of stops, each naming a board slug and node slug
directly — highlights on the existing canvas; never fake a board.

## Layered boards & cross-board navigation

Boards form a hierarchy: L0 overview (10–30 nodes) → L1 domain → L2 component → L3 detail. A node
whose `childBoardSlug` is set **drills into** a deeper child/layer board:

- `get_child_boards(workBoardSlug)` — list a board's direct layers.
- `get_parent_board(workBoardSlug)` — walk up (null fields at root).
- `get_nodes` / `get_workboard_details` with a child slug — read into any board you discover.

When a question needs detail that lives inside a node's child board, follow the `childBoardSlug`
into it **before** answering.

## Reading the request

Detect what the user wants (from the platform's intent-detection signals):

| Signal       | Keywords                               | Shape                                                         |
| ------------ | -------------------------------------- | ------------------------------------------------------------- |
| Creation     | add, create, new, introduce, build     | new elements integrating with existing structure              |
| Modification | update, change, rename, move, reparent | `get_nodes` first, then `update_nodes`                        |
| Deletion     | remove, delete, drop                   | identify cascade effects first                                |
| Analysis     | show, what, why, how, analyze, assess  | read tools only — report what exists, no speculation          |
| Hybrid       | and, also, then                        | execute in order: analyze → delete → modify → create → verify |

Ambiguous element reference → list the candidates with slugs and ask which one. See
[references/analysis-patterns.md](references/analysis-patterns.md) for the analysis types,
assessment criteria (coupling, single points of failure, cycles, orphans, boundary violations),
and response templates.

## Editing the diagram — the tool contract

Diagram writes (`create_nodes`, `update_nodes`, `delete_nodes`, `create_edges`, `update_edges`,
`delete_edges`, `apply_diagram_info`, `apply_semantic_styles`, `apply_composition`,
`apply_icon_shape_styles` — styling methodology: the board-styling skill) are exposed and
journaled: every write joins the architect's working copy, and **nothing is staged until the
session commits** (on a governed board, commit generates one reviewable `board_diff` intent per
governed root).
Narrate the journal after a batch: "Saved to your working copy — N uncommitted changes across
M boards."

The critical rules (verbatim from the platform contract):

- **SLUGS ARE THE WIRING.** An edge's `sourceSlug`/`targetSlug` and a node's `parentNodeSlug`
  MUST be the EXACT slug of a node you create in the same call, or one returned by `get_nodes`.
  Copy it character-for-character; never invent, abbreviate, rename, or alter a slug.
- Create ALL nodes BEFORE any edges. An edge referencing a slug no node defines fails with
  "node … not found" and lists the valid slugs — pick one of those exactly and retry.
- A node's `slug` is its identity and cannot be changed. The container field is
  `parentNodeSlug`; the identifier is the `slug`.
- A node whose `parentNodeSlug` another node points at IS a container: set that parent's
  `primitiveType` to `container`.
- The array IS the operation — build the complete array and send it in ONE call.
- Call `get_archetypes` before creating: the archetype name sets the visual shape;
  `primitiveType` is the semantic kind, not the shape.

Full payload shapes: [references/diagram-payloads.md](references/diagram-payloads.md).

**Archetype attributes.** An archetype also declares a **field contract** — the properties its
elements carry in the app — and an `attributes` map on any create/update call fills it.
`get_archetypes` with `includeFields` (always paired with `names`) reads the contract;
`get_nodes` / `get_edges` return an `attributes` map on elements that have stored values. The
split of ownership is the point: a bound app board's `/sync` resolves what a repository proves
(language, version, dependencies) and deliberately leaves ownership, lifecycle and operational
facts — `owner`, `stage`, `status`, `sla`, `criticality`, `cloudProvider` — absent, because only
an architect knows them. Fill those where a workflow already has you asking; never guess one, and
never turn the panel into a questionnaire. Merge is per key, so omitting a field never clears it.
See [references/archetype-attributes.md](references/archetype-attributes.md).

## Operation discipline

- **Additive:** integrate, don't isolate — place new elements in the right existing container,
  match granularity and naming, and proactively propose edges to existing nodes.
- **Modification:** slug and archetype can never change (create a new element instead);
  reparent via `parentNodeSlug`; report side effects.
- **Deletion:** deleting a node removes its connected edges automatically; children are NOT
  deleted — they become standalone. State the cascade before deleting when it is significant;
  on a governed board the removal becomes a staged mark only when the session commits.
- **Batch edits:** all writes share the one working copy automatically; close with the
  preview → commit move (architect-core) — or discard, which reverts the whole session.
