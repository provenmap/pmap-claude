---
category: explore
description: "Explore · The command center, attention-first — what needs the architect, then the portfolio"
allowed-tools: Read, Bash(node:*), mcp__plugin_pmap-architect_provenmap__*
---

The morning sweep: lead with **what needs the architect**, ranked, before any inventory. Read
[`${CLAUDE_PLUGIN_ROOT}/knowledge/architect-core/SKILL.md`](../knowledge/architect-core/SKILL.md) (taxonomy, batch
state reads) and [`${CLAUDE_PLUGIN_ROOT}/knowledge/intents-authoring/SKILL.md`](../knowledge/intents-authoring/SKILL.md)'s
staleness/verification semantics.

## Workflow

1. **Attention queue** — run and print the `display` **verbatim** (it includes the "since your
   last visit" delta and the ranked queue):

   ```bash
   node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-architect.js --attention
   ```

   Then add judgment on top: for `implemented` claims worth checking now, sample `get_intent`
   for `verifiedAt` (say when you sampled); connect queue items to what you know from the
   session. The report's "Waiting for first push" boards (also `governing · never pushed` in
   the classify table) are board-init territory — the bootstrap offer is already in the line.
   The report's "New apps awaiting build prep" boards are app-readiness territory — the
   `/prepare-app` pointer is already in the line.
2. **Then the portfolio** — `--classify-tree` (cached ~1h); print its table verbatim. It
   already carries class, binding flavor, and the "+N not classified" cap line.
3. **Outcome:** `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-architect.js --brief --command hub` → Done · Left · Next, per `${CLAUDE_PLUGIN_ROOT}/knowledge/outcome/SKILL.md`.

Script not configured (exit 1, no grant) → fall back to the direct reads: `get_hub_status
(scope: 'tree')` + `list_intents(scope: 'tree')` at root, render the same queue shape.

Empty root state → skip the dashboard, offer `/setup-workspace` (the workspace is waiting for
its estate: map what exists, or found something new).

## Failure branches

- Tools missing / connection errors → `ProvenMap not configured — run /login (browser) or /configure (manual) first`
- 401 → `Your ProvenMap architect token was rejected — run /login to reconnect`
