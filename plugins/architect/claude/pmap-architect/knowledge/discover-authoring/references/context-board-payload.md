# Context-board payload

The drawn answer both plugins push — the code and connect plugins over
`POST /code-plugin/context-boards` (`pmap-insights.js --push-context-board`), the architect over
the MCP `create_context_board` tool (`pmap-architect.js --push-context-board`). The server
materialises it as a `contextmap` board outside the tree: the composition the payload names (or
a default layout), the nodes (a node another node names as `parentSlug` becomes a container), the
edges, the C4 instruments in `styles`, and a provenance reference on every element back to the
board and element it was drawn from.

```json
{
  "name": "Blast radius of Event Bus",
  "question": "What is the blast radius of `event-bus`?",
  "description": "≤500 chars — what the board shows and why it matters",
  "subject": "event-bus",
  "nodes": [
    {
      "slug": "event-bus",
      "name": "Event Bus",
      "type": "message_broker",
      "parentSlug": null,
      "description": "copied from the source element, ≤500",
      "note": "why this node is on the board, ≤300",
      "source": { "board": "root", "node": "event-bus" }
    }
  ],
  "edges": [
    {
      "sourceSlug": "orders",
      "targetSlug": "event-bus",
      "type": "publishes-to",
      "description": null,
      "source": { "board": "root", "edge": "orders--publishes-to--event-bus" }
    }
  ],
  "styles": {
    "emphasis": ["event-bus"],
    "subtle": ["commerce"],
    "flow": [{ "sourceSlug": "orders", "targetSlug": "event-bus" }],
    "sizes": [{ "slug": "event-bus", "size": "xl" }, { "slug": "orders", "size": "lg" }],
    "tokens": [{ "slug": "event-bus", "token": "warning" }],
    "edges": [{ "sourceSlug": "orders", "targetSlug": "event-bus", "flow": "asynchronous", "weight": "heavy" }],
    "composition": { "arrangement": "flow", "orientation": "horizontal" }
  },
  "view": { "model": "c4", "level": "container" },
  "ledger": { "runId": "…", "candidateId": "blast-radius-map-event-bus", "family": "blast-radius-map", "level": "landscape" }
}
```

| Field | Rule |
|---|---|
| `name` | 2–100 chars |
| `question` | 1–400 chars; the board's description leads with it on the server |
| `description` | ≤500 chars, optional |
| `subject` | a payload node slug |
| `nodes` | 1–25; `slug` unique in the payload; `type` is the source element's archetype name; `parentSlug` names another payload node or is null; `source` names a real pack element (never a boundary port) |
| `edges` | ≤400; endpoints are payload node slugs; `source.edge` is the pack edge slug, verbatim, and that edge must join the two nodes' source elements |
| `styles.emphasis` / `subtle` | payload node slugs; `emphasis` is attention, never kind — at most 10% of leaf nodes (the server refuses more), the subject first |
| `styles.flow` | payload edge pairs on the answer's path — what an older server reads; a current one reads `edges[].weight` |
| `styles.sizes` | `{slug, size}` per leaf node, `xs`–`xxl`; never a container; the subject is `xl`, the first ring `lg` (its notes show on the canvas), people and externals `xs`/`sm` |
| `styles.tokens` | `{slug, token}` — State (`active`…`failing`) or Severity (`info`…`error`) only; instance facts no archetype knows |
| `styles.edges` | `{sourceSlug, targetSlug, flow?, weight?}` per payload edge — `flow` is `synchronous`/`asynchronous`/`stream`/`bidirectional`, `weight` is `light`/`normal`/`heavy` |
| `styles.composition` | `{arrangement: flow\|hierarchy\|network, orientation?, density?}`; orientation only on `flow` or `hierarchy` |
| `view` | `{model: "c4", level: context\|container\|component}` — shown in the board's reading strip |
| `ledger` | local bookkeeping; stripped before the wire |

The instruments follow one rule: **a token asserts only what the archetype cannot.** Kind —
person, external, datastore, queue, component — is the archetype's, seeded from `type`; that is
why no Role token exists on this wire. See [c4-reading.md](c4-reading.md) for how each
instrument is chosen and what the notes should say at each level.

## The gates (both pushers, before any network call)

1. Schema (the shape above).
2. Wiring: every `parentSlug`, `subject`, edge endpoint and style slug names a payload node; a
   node never contains itself; every `flow` and `edges[]` pair is a payload edge; no `sizes`
   entry names a container; `emphasis` stays under the cap. The lg-and-above share is reported
   as a warning, never refused — a context board exists to explain those nodes.
3. Provenance against the pack (`--require-pack`): every node's `source` resolves to a pack
   element on that board and is not a port; every edge's `source.edge` is a pack edge on that
   board joining exactly the two drawn nodes' source elements.

A payload the recommender drew passes all three by construction. The agent changes only
`name`, `question`, `description` and `nodes[].note`; `styles` and `view` are copied verbatim.

## What the server answers

`{ success, boardSlug, viewUrl, nodes, edges }` — `viewUrl` is a server-built link to the board
(null on an older server). A delete answers `{ deleted, boardSlug, reason? }`; a board that is
not a `contextmap`, or one the server declines to remove, comes back `deleted: false` with a
reason rather than an error, so a re-run's cleanup never removes a real board.
