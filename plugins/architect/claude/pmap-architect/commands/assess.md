---
category: review
description: "Review · WRITE-CAPABLE: Run a structured architecture review — frame, sweep, defend the insights, record the batch"
argument-hint: "[board-slug] [template-or-dimension]"
allowed-tools: Read, AskUserQuestion, mcp__plugin_pmap-architect_provenmap__*
---

The analyst's periodic review: frame against an org template or an ad-hoc dimension, sweep the
board, review the insights with the architect, and record the surviving analysis as a draft
insight batch. The arc (frame→sweep→review→record, template honesty) lives in
[`${CLAUDE_PLUGIN_ROOT}/knowledge/insights-review/SKILL.md`](../knowledge/insights-review/SKILL.md) ("The assess
arc") — read it plus [`${CLAUDE_PLUGIN_ROOT}/knowledge/architect-core/SKILL.md`](../knowledge/architect-core/SKILL.md)
and [`${CLAUDE_PLUGIN_ROOT}/knowledge/board-reading/SKILL.md`](../knowledge/board-reading/SKILL.md).

## Workflow

1. **Resolve the board** (argument / session board / `get_board_tree` + AskUserQuestion) and
   the scope (board or `tree`).
2. **Frame** — `list_insight_skills` for the org's templates (pull the chosen one's full
   methodology with `get_insight_skill` and follow it faithfully), or an ad-hoc dimension.
3. **Sweep** — read per the frame, apply the criteria, build element-anchored insights
   (`InsightDraft[]` with trails); structural changes go as `proposal` on the insight.
4. **Review in reverse** — walk the insights with the architect; keep what survives their
   challenge.
5. **Record** — `create_insight` (draft batch), then the "Promote any of this to intents?" offer.
   Not now → close.

**Outcome:** `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-architect.js --brief --command assess` → Done · Left · Next, per `${CLAUDE_PLUGIN_ROOT}/knowledge/outcome/SKILL.md`.

## Failure branches

- Tools missing / connection errors → `ProvenMap not configured — run /login (browser) or /configure (manual) first`
- 401 → `Your ProvenMap architect token was rejected — run /login to reconnect`
- `create_insight` absent → read-only token: the review still runs; emit the insights as
  markdown and note recording needs `read_write`.
