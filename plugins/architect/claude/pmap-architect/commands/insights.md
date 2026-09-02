---
category: review
description: "Review · Review insight batches and promote reviewed insights into draft intents"
argument-hint: "[board-slug] [insight-id]"
allowed-tools: Read, AskUserQuestion, mcp__plugin_pmap-architect_provenmap__*
---

Review a board's stored insights — batch by batch — decide what deserves delivery,
and promote it. Can also record an analysis you performed in this session as a draft batch. The
review workflow and promotion semantics live in
[`${CLAUDE_PLUGIN_ROOT}/knowledge/insights-review/SKILL.md`](../knowledge/insights-review/SKILL.md) — read it (and
[`${CLAUDE_PLUGIN_ROOT}/knowledge/architect-core/SKILL.md`](../knowledge/architect-core/SKILL.md)) first.

## Workflow

1. **Resolve the board** (argument / session board / `get_board_tree` + AskUserQuestion).
2. **List** — `list_insights` (filter by `templateSlug` if the user names one; `scope: 'tree'`
   for the subtree). Table: batchId, template, when, insight count, entry boards.
3. **Review** — `list_insights {batchId}` for the batch's insights with their ids, then
   `get_insight` on the ones worth reading in full (name, anchored elements slug-first,
   severity, trail, any proposal). Triage with the architect — which are real, which
   deserve delivery. Cite insight names.
4. **Promote** — AskUserQuestion to confirm the selection (genuine decision point: this generates
   work), then `promote_insights` with the reviewed insight ids — one **draft** intent each.
   Report generated intents by slug → `/intents` to open/assign them.
5. **Record (optional)** — if the session produced a real analysis of its own, offer
   `create_insight` to store it as a draft batch per the skill. For a _structured_ review from
   scratch (org template or ad-hoc dimension, insights defended before recording), `/assess`
   is the front door — same skill, full arc.

**Close:** `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-architect.js --after insights` — print verbatim.

## Failure branches

- Tools missing / connection errors → `ProvenMap not configured — run /login (browser) or /configure (manual) first`
- 401 → `Your ProvenMap architect token was rejected — run /login to reconnect`
- `promote_insights` / `create_insight` absent → read-only token: review still works;
  promotion needs a `read_write` token.
