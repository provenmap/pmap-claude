# Orienting on a board, and working it

The per-class orientation moves behind `/board` Step 2, plus the three working moves that need
more than a line: drilling a container down, the grouping review, and inline styling scope.

## The orientation move per board class

Classify first (architect-core's taxonomy table — tree position, `list_source_bindings`,
`isChildLayer`), then orient the way that class deserves. Never orient on nothing: an empty board
gets a bootstrap offer, not a walk-through of zero nodes.

| Class               | How it is recognized                                                                                   | Orientation move                                                                                                                             |
| ------------------- | ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **Empty root**      | root, 0 nodes/edges, no bindings anywhere                                                              | Offer `/setup-workspace` — the estate has to exist before it can be read.                                                                    |
| **Empty app board** | 0 nodes/edges, below root, with a code-plugin binding — or unbound but with an app-archetype owner node | Offer the **board bootstrap**: read `${CLAUDE_PLUGIN_ROOT}/knowledge/board-init/SKILL.md` and run it inline.                                                                   |
| **Empty plain layer** | 0 nodes/edges, `isChildLayer`, no app-ness                                                           | Offer the **lightweight** board-init variant: sketch the sub-structure, or route up to the owning app board.                                  |
| **Root / landscape** | root of the tree / the tree seed                                                                        | Orient as a **portfolio** — apps, health, cross-app edges — not a canvas walk. Landscape edits follow `${CLAUDE_PLUGIN_ROOT}/knowledge/landscape-modeling/SKILL.md` (app archetypes for bindable slots, the app-nesting rule). |
| **Plain layer**     | `isChildLayer`, no binding                                                                             | Orient normally, and say that facet work (intents) routes up to the owning app board.                                                        |
| **App board**       | has a code-plugin binding                                                                              | The full orientation sequence: `get_workboard_details`, `get_hub_status`, `list_intents`, `list_insights`.                                    |

Whichever class it is, summarize slug-first — purpose, domains/containers, layers, work in
flight — then invite direction.

## Drilling a container into its own board

`create_board {ownerNodeSlug, newBoardSlug, name, ownerBoardSlug: <the board you are on>}` — the
container becomes the drill-down, journaled like any other diagram write. Say plainly that a layer
under an app board stays a plain layer **permanently** (the app-nesting rule); never pitch it as a
future app slot.

## Reading the grouping review

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-architect.js --group-plan --board <slug>
```

Print its `display` verbatim. It reads the board's containment against how its elements actually
relate — seeded from the board's own parent tree, so `drift[]` is what has stopped holding, not an
unrelated re-partition.

- `verdict: "dissolve"` — the zone groups by label rather than by boundary.
- `verdict: "drill-down"` — the zone has outgrown one board; offer `create_board`.
- `parents[]` — proposes a zone inside a zone.

Every move re-parents a node: walk the drift with the architect and apply only what **they**
confirm. A zone that is deliberate but has no edges to justify it (a vendor cohort, a compliance
boundary) stays — record why by starting its description with `Grouping rationale:`, and the gate
stops flagging it.

## Inline styling scope

A full visual pass over the board is `/style-board`. Inline styling in a working session covers
**only** the elements that session touched: when a write batch added or rewired elements, offer a
scoped pass over just those (read `${CLAUDE_PLUGIN_ROOT}/knowledge/board-styling/SKILL.md`), match the
conventions the rest of the board already carries, and never restyle untouched elements inline.
