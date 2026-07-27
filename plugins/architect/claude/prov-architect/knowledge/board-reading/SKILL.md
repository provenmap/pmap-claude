---
name: board-reading
description: How to orient on and evolve a ProvenMap board over MCP — read the layered graph, analyze it, and make governed diagram edits. Use when exploring a board, answering architecture questions, assessing quality, or adding/updating/removing nodes and edges. Key capabilities: orientation sequence, cross-board navigation (layers), analysis types and assessment criteria, the diagram tool contract (slugs are the wiring), staged-edit narration.
---

# Board Reading & Editing

<!-- Distilled from prov-platform board-orchestrator prompt builders:
     services/prompts/modes/standard/hydrated-board.prompt.ts +
     empty-board.prompt.ts (orientation, intent detection, operations) and
     base/diagram-tool-contract.ts (payload shape + slug discipline).
     references/ carries the detailed criteria and payload shapes. -->

## Orientation sequence

To orient on a board, read in this order (each call is cheap; batch where possible):

1. `get_board_tree` — every descendant layer board (slug, name, drill path).
2. `get_workboard_details` — the board itself: structure, nodes, edges, semantic styles.
3. `get_hub_status` — intent counts, latest insight run, binding health (`scope: 'tree'`
   aggregates the subtree).
4. `list_intents` / `list_insights` — what work and findings are already in flight.

Summarize: purpose, the domains/containers, layer structure, and anything in flight — slug-first,
then invite direction.

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

| Signal | Keywords | Shape |
|---|---|---|
| Creation | add, create, new, introduce, build | new elements integrating with existing structure |
| Modification | update, change, rename, move, reparent | `get_nodes` first, then `update_nodes` |
| Deletion | remove, delete, drop | identify cascade effects first |
| Analysis | show, what, why, how, analyze, assess | read tools only — report what exists, no speculation |
| Hybrid | and, also, then | execute in order: analyze → delete → modify → create → verify |

Ambiguous element reference → list the candidates with slugs and ask which one. See
[references/analysis-patterns.md](references/analysis-patterns.md) for the analysis types,
assessment criteria (coupling, single points of failure, cycles, orphans, boundary violations),
and response templates.

## Editing the diagram — the tool contract

Diagram writes (`create_nodes`, `update_nodes`, `delete_nodes`, `create_edges`, `update_edges`,
`delete_edges`, `apply_diagram_info`, `apply_semantic_styles`) are exposed and governed: on a
governed board the change is **staged and mints a reviewable intent** — narrate
"staged as intent `<slug>` — delete it to revert" from the result message.

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

## Operation discipline

- **Additive:** integrate, don't isolate — place new elements in the right existing container,
  match granularity and naming, and proactively propose edges to existing nodes.
- **Modification:** slug and archetype can never change (create a new element instead);
  reparent via `parentNodeSlug`; report side effects.
- **Deletion:** deleting a node removes its connected edges automatically; children are NOT
  deleted — they become standalone. State the cascade before deleting when it is significant;
  on a governed board the removal is staged for review, not applied.
- **Batch edits:** use a write session (see architect-core) so the whole change can be
  discarded as one unit.
