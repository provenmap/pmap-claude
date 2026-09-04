# Context-board payload

The drawn answer both plugins push — the code and connect plugins over
`POST /code-plugin/context-boards` (`pmap-insights.js --push-context-board`), the architect over
the MCP `create_context_board` tool (`pmap-architect.js --push-context-board`). The server
materialises it as a `contextmap` board outside the tree: a default layout, the nodes (a node
another node names as `parentSlug` becomes a container), the edges, the semantic styles, and a
provenance reference on every element back to the board and element it was drawn from.

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
    "flow": [{ "sourceSlug": "orders", "targetSlug": "event-bus" }]
  },
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
| `styles` | `emphasis`/`subtle` name payload nodes; `flow` pairs name payload edges |
| `ledger` | local bookkeeping; stripped before the wire |

## The gates (both pushers, before any network call)

1. Schema (the shape above).
2. Wiring: every `parentSlug`, `subject`, edge endpoint and style slug names a payload node; a
   node never contains itself; every `flow` pair is a payload edge.
3. Provenance against the pack (`--require-pack`): every node's `source` resolves to a pack
   element on that board and is not a port; every edge's `source.edge` is a pack edge on that
   board joining exactly the two drawn nodes' source elements.

A payload the recommender drew passes all three by construction. The agent changes only
`name`, `question`, `description` and `nodes[].note`.

## What the server answers

`{ success, boardSlug, viewUrl, nodes, edges }` — `viewUrl` is a server-built link to the board
(null on an older server). A delete answers `{ deleted, boardSlug, reason? }`; a board that is
not a `contextmap`, or one the server declines to remove, comes back `deleted: false` with a
reason rather than an error, so a re-run's cleanup never removes a real board.
