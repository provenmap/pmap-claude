---
category: review
description: "Review · WRITE-CAPABLE: Run a structured architecture review — frame, sweep, defend the findings, record the run"
argument-hint: "[board-slug] [template-or-dimension]"
allowed-tools: AskUserQuestion, mcp__plugin_pmap-architect_provenmap__*
---

The analyst's periodic review: frame against an org template or an ad-hoc dimension, sweep the
board, review the findings with the architect, and record the surviving analysis as a draft
insight run. The arc (frame→sweep→review→record, template honesty) lives in **insights-review**
("The assess arc"); load it plus **architect-core** and **board-reading**.

## Workflow

1. **Resolve the board** (argument / session board / `get_board_tree` + AskUserQuestion) and
   the scope (board or `tree`).
2. **Frame** — `list_insight_skills` for the org's templates (pull the chosen one's full
   methodology with `get_insight_skill` and follow it faithfully), or an ad-hoc dimension.
3. **Sweep** — read per the frame, apply the criteria, build element-anchored findings +
   suggestions.
4. **Review in reverse** — walk findings with the architect; keep what survives their
   challenge.
5. **Record** — `create_insight` (draft run), then the "Promote any of this to intents?" offer.
   Not now → `/insights` names the run. Every stop names the next command.

## Failure branches

- Tools missing / connection errors → `ProvenMap not configured — run /login (browser) or /configure (manual) first`
- 401 → `Your ProvenMap architect token was rejected — run /login to reconnect`
- `create_insight` absent → read-only token: the review still runs; emit the findings as
  markdown and note recording needs `read_write`.
