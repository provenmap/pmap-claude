---
category: author
description: "Author · WRITE-CAPABLE: List, author, and manage board intents — the impact→attach→describe loop; drafts land for in-platform review"
argument-hint: "[board-slug] [intent-slug]"
allowed-tools: Read, AskUserQuestion, Bash(node:*), mcp__plugin_pmap-architect_provenmap__*
---

Work a board's intent queue: list, read, author governed anchored work, and manage
lifecycle. Authoring runs the **impact → attach → describe** loop from
`${CLAUDE_PLUGIN_ROOT}/knowledge/intents-authoring/SKILL.md` — read it (and
`${CLAUDE_PLUGIN_ROOT}/knowledge/architect-core/SKILL.md`) first.

## Workflow

1. **Working-copy check** — `get_write_session`: uncommitted changes are surfaced (boards +
   counts) and the architect decides — one combined commit later, or pause first
   (architect-core).
2. **Resolve and route** — argument or session board; classify per architect-core taxonomy
   (intents legal only on code-bound boards — route up/split before any write).
3. **List** — `list_intents` (`scope: 'tree'` for the subtree). Table: slug, name, state,
   priority, staleness. Flag `needs_clarification`/`stale` rows for the architect.
4. **Branch:**
   - **Read** → `get_intent`; directive, anchors (with notes), origin, resolution history.
     `implemented` without `verifiedAt` is a claim, not proof — say so.
   - **Author, handed over** (arriving from `/author-intent`, `/adopt-adr`, or `/insights`):
     drafts exist — enrich each via the describe loop (shaping skipped), run the
     materialization gates and the pre-land self-review + read-back gate, apply with
     `update_intent` (anchors + notes land on the real intent), release with
     `transition_intent`.
   - **Author, free-form** ("here's what I want done"): classify per
     `${CLAUDE_PLUGIN_ROOT}/knowledge/board-reading/SKILL.md` —
     _diagram-shaped_ → make the board edit (joins the working copy; committing generates the
     `board_diff` intent), optional context anchors via the loop; _code-shaped_ → directive
     intent through the full loop (shape → sweep → gates → propose → describe → grill →
     self-review → read-back → land, `--validate intent` before `create_intent`); _both_ → edit
     first, then the directive intent citing them.
   - **Queue management** → `transition_intent` (draft→open locks it for developer pulls;
     →rejected reverts staged changes — say so), `assign_intent` (empty list clears).
     `needs_clarification` → read the developer's question, revise via `update_intent`,
     re-open via `transition_intent` (the full loop, in-session).
   - **Delete** → `delete_intent` withdraws everything staged; only
     draft/open/needs_clarification can be deleted. Confirm via AskUserQuestion only for bulk
     deletion.
5. **Close** — if this session made board edits: `preview_write_session_commit` → present the
   plan → title/summary (AskUserQuestion) → `commit_write_session` → narrate generated intents
   by slug, offer `publish`. Report writes from the result message, slug-first.

**Close:** `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-architect.js --after intents` — print verbatim.

## Failure branches

- Tools missing / connection errors → `ProvenMap not configured — run /login (browser) or /configure (manual) first`
- 401 → `Your ProvenMap architect token was rejected — run /login to reconnect`
- Board not code-bound (400 "…code-bound board") → never surfaces raw: route per the taxonomy
  and name the binding prerequisite.
- Write tools absent → read-only token: name the `read_write` need; continue with reads.
