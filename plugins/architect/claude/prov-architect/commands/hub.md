---
category: explore
description: "Explore · Workspace dashboard — board tree, intent counts, latest insights, binding health"
allowed-tools: mcp__plugin_prov-architect_provenmap__*
---

The architect's command centre: one rollup of everything in flight across the workspace (or the
token's board subtree).

## Workflow

1. `get_board_tree` — the board hierarchy in reach.
2. `get_hub_status` with `scope: 'tree'` on the root board — intent counts, latest insight run,
   binding health, aggregated over the subtree.
3. Render one dashboard (you format — keep it stable):
   - **Boards** — table: slug, name, depth/drill path.
   - **Intents** — counts by state; flag `needs_clarification` and `stale` explicitly (they need
     the architect — see the intents-authoring skill).
   - **Insights** — latest run summary; note if findings await review.
   - **Bindings** — health per the status payload; a broken binding means the board no longer
     tracks its source.
4. Close with the next actions ranked (e.g. "2 intents need clarification → `/intents`", "new
   findings → `/insights`", "orient on a board → `/board <slug>`"). Every line names a command.

## Failure branches

- Tools missing / connection errors → `ProvenMap not configured — run /login (browser) or /configure (manual) first`
- 401 → `Your ProvenMap architect token was rejected — run /login to reconnect`
