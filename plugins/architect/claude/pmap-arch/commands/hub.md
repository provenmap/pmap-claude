---
category: explore
description: "Explore · The command center, attention-first — what needs the architect, then the portfolio"
allowed-tools: Bash(node:*), mcp__plugin_pmap-arch_provenmap__*
---

The morning sweep: lead with **what needs the architect**, ranked, before any inventory. Load
**architect-core** (taxonomy, batch state reads) and the **intents-authoring** skill's
staleness/verification semantics.

## Workflow

1. **Attention queue** — run and print the `display` **verbatim** (it includes the "since your
   last visit" delta and the ranked queue):

   ```bash
   node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-arch.js --attention
   ```

   Then add judgment on top: for `implemented` claims worth checking now, sample `get_intent`
   for `verifiedAt` (say when you sampled); connect queue items to what you know from the
   session. The report's "Waiting for first push" boards (also `governing · never pushed` in
   the classify table) are board-init territory — the bootstrap offer is already in the line.
2. **Then the portfolio** — `--classify-tree` (cached ~1h); print its table verbatim. It
   already carries class, binding flavor, and the "+N not classified" cap line.
3. **Close with next actions ranked** — every line names a command.

Script not configured (exit 1, no grant) → fall back to the direct reads: `get_hub_status
(scope: 'tree')` + `list_intents(scope: 'tree')` at root, render the same queue shape.

Empty root state → skip the dashboard, offer `/setup-workspace` (the workspace is waiting for
its estate: map what exists, or found something new).

## Failure branches

- Tools missing / connection errors → `ProvenMap not configured — run /login (browser) or /configure (manual) first`
- 401 → `Your ProvenMap architect token was rejected — run /login to reconnect`
