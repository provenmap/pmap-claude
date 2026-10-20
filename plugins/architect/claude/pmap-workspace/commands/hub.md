---
category: explore
description: "Explore · The command center, attention-first — what needs the architect, then the portfolio"
allowed-tools: Read, Bash(node:*), mcp__provenmap__*
---

The morning sweep: lead with **what needs the architect**, ranked, before any inventory. Read
[`${CLAUDE_PLUGIN_ROOT}/knowledge/architect-core/SKILL.md`](../knowledge/architect-core/SKILL.md) (taxonomy, batch
state reads) and [`${CLAUDE_PLUGIN_ROOT}/knowledge/work-items-authoring/SKILL.md`](../knowledge/work-items-authoring/SKILL.md)'s
staleness/verification semantics.

## Workflow

1. **Attention queue** — run and print the `display` **verbatim** (it includes the "since your
   last visit" delta, the ranked queue, and each scheduled repo's recent runs):

   ```bash
   node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-architect.js --attention
   ```

   The queue is the hub's own, app by app, most in need first — the same facts the browser
   shows. Add judgment on top: for implemented claims awaiting proof worth checking now, sample
   `get_work_item` for `verifiedAt` (say when you sampled); connect queue items to what you know
   from the session. A stopped scheduled run's line already carries its fix; a repo waiting for
   its first push carries the bootstrap offer; a new app awaiting prep carries `/prepare-app`.
2. **What changed** — `get_change_diary {workBoardSlug: 'root'}`. Lead with its top `entries`:
   each one's `title` and `what` as written, its app, the rules it hit with their `impact`, an
   open flag, and its `reach` (who depends on it) when present. Then the `active` apps in one
   line and the `silent` ones in another. An entry's week opens in `get_change_period` when the
   architect asks. No entries and no active apps means no repo has run `/changes` yet: say so
   once, as a fact.
3. **Then the portfolio** — `--classify-tree` (one level, cached ~1h); print its table verbatim.
   It carries class and binding flavor; a board with layers below shows `+N layers`. To dig
   into one, run `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-architect.js --classify-tree --board <slug>`
   and print it verbatim.
4. **Outcome:** `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-architect.js --brief --command hub` → Done · Left · Next, per `${CLAUDE_PLUGIN_ROOT}/knowledge/outcome/SKILL.md`.

Script not configured (exit 1, no grant) → fall back to the direct read: `get_hub_status
{workBoardSlug: 'root', scope: 'tree', include: ['scheduledRuns']}` and render
`fleetAttention.rows` app by app — each fact's `label` as written, a stopped run's `fix` beside
it — then `fleetAttention.more`, then `workspaceAttention` under a **Workspace** heading (a
`detached-boards` fact names layer boards whose opening node went; they are kept or deleted on
the boards page, or reattached with `create_board` on the same slug), then per repo in
`scheduledRuns` the newest run's outcome and reason, and the last success when it did not succeed.

Empty root state → skip the dashboard, offer `/setup` (the workspace is waiting for
its estate: map what exists, or found something new).

## Failure branches

- Tools missing / connection errors → `ProvenMap not configured — run /login (browser) or /configure (manual) first`
- 401 → `Your ProvenMap MCP access token was rejected — run /login to reconnect`
