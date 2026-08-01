---
category: review
description: "Review · Review insight runs and promote reviewed findings into draft intents"
argument-hint: "[board-slug] [insight-id]"
allowed-tools: AskUserQuestion, mcp__plugin_pmap-arch_provenmap__*
---

Review stored insight runs on a board — findings, suggestions — decide what deserves delivery,
and promote it. Can also record an analysis you performed in this session as a draft run. The
review workflow and promotion semantics live in the **insights-review** skill; load it (and
**architect-core**) first.

## Workflow

1. **Resolve the board** (argument / session board / `get_board_tree` + AskUserQuestion).
2. **List** — `list_insights` (filter by `templateSlug` if the user names one; `scope: 'tree'`
   for the subtree). Table: id/slug, template, when, finding counts.
3. **Review** — `get_insight` on the chosen run: walk findings (name, anchored elements
   slug-first, severity) and suggestions. Triage with the architect — which are real, which
   deserve delivery. Cite finding names.
4. **Promote** — AskUserQuestion to confirm the selection (genuine decision point: this mints
   work), then `promote_insight_findings` with the reviewed ids — one **draft** intent each.
   Report minted intents by slug → `/intents` to open/assign them.
5. **Record (optional)** — if the session produced a real analysis of its own, offer
   `create_insight` to store it as a draft run per the skill. For a *structured* review from
   scratch (org template or ad-hoc dimension, findings defended before recording), `/assess`
   is the front door — same skill, full arc.

## Failure branches

- Tools missing / connection errors → `ProvenMap not configured — run /login (browser) or /configure (manual) first`
- 401 → `Your ProvenMap architect token was rejected — run /login to reconnect`
- `promote_insight_findings` / `create_insight` absent → read-only token: review still works;
  promotion needs a `read_write` token.
