---
category: author
description: "Author · WRITE-CAPABLE: List, author, and manage board work items; drafts land for in-platform review"
argument-hint: "[board-slug] [work-item-slug]"
allowed-tools: Read, AskUserQuestion, Bash(node:*), mcp__plugin_pmap-architect_provenmap__*
---

Authoring runs the **impact → attach → describe** loop from
`${CLAUDE_PLUGIN_ROOT}/knowledge/work-items-authoring/SKILL.md` — read it (and
`${CLAUDE_PLUGIN_ROOT}/knowledge/architect-core/SKILL.md`) first.

## Workflow

1. **Working-copy check** — `get_write_session`: uncommitted changes are surfaced (boards +
   counts) and the architect decides: one combined commit later, or pause first
   (architect-core).
2. **Resolve and route** — argument or session board; classify per architect-core taxonomy
   (work items only on code-bound boards — route up/split before any write).
3. **List** — `list_work_items` (`scope: 'tree'` for the subtree). Table: `#n`, type, name,
   epic, state, priority, staleness. Flag `needs_clarification`/`stale` rows for the architect.
   `#n` and a slug both address a work item in `get_work_item`.
4. **Branch:**
   - **Read** → `get_work_item`; directive, anchors (with notes), origin, resolution history.
     `implemented` without `verifiedAt` is a claim, not proof — say so.
   - **Author, handed over** (arriving from `/author-work-item`, `/adopt-adr`, or `/insights`):
     drafts exist — enrich each via the describe loop (shaping skipped), run the
     materialization gates and the pre-land self-review + read-back gate, apply with
     `update_work_item` (anchors + notes land on the real work item), release with
     `transition_work_item`.
   - **Author, free-form** ("here's what I want done"): classify per
     `${CLAUDE_PLUGIN_ROOT}/knowledge/board-reading/SKILL.md` —
     _diagram-shaped_ → make the board edit (joins the working copy; committing generates the
     `board_diff` work item), optional context anchors via the loop; _code-shaped_ → directive
     work item via the full loop (shape → sweep → gates → propose → describe → grill →
     self-review → read-back → land, `--validate work-item` before `create_work_item`); _both_ → edit
     first, then the directive work item citing them.
   - **Queue management** → `transition_work_item` (draft→open locks it for developer pulls;
     →rejected reverts staged changes — say so), `assign_work_item` (empty list clears).
     `needs_clarification` → read the developer's question, revise via `update_work_item`,
     re-open via `transition_work_item` (the full loop, in-session).
   - **Delete** → `delete_work_item` withdraws everything staged; anything but
     assigned/in_progress can be deleted (ask the developer to release those first).
     AskUserQuestion confirms bulk deletion only.
5. **Close** — if this session made board edits: `preview_write_session_commit` → present the
   plan → title/summary (AskUserQuestion) → `commit_write_session` → narrate generated work items
   by slug, offer `publish`. Report writes from the result message, slug-first.

**Outcome:** `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-architect.js --brief --command work-items` → Done · Left · Next, per `${CLAUDE_PLUGIN_ROOT}/knowledge/outcome/SKILL.md`.

## Failure branches

- Tools missing / connection errors → `ProvenMap not configured — run /login (browser) or /configure (manual) first`
- 401 → `Your ProvenMap architect token was rejected — run /login to reconnect`
- Board not code-bound (400 "…code-bound board") → never surfaces raw: route per the taxonomy
  and name the binding prerequisite.
- Write tools absent → read-only token: name the `read_write` need; continue with reads.
