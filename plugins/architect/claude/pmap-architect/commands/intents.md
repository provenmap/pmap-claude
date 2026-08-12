---
category: author
description: "Author · WRITE-CAPABLE: List, author, and manage board intents — the impact→attach→describe loop; drafts land for in-platform review"
argument-hint: "[board-slug] [intent-slug]"
allowed-tools: Read, AskUserQuestion, Bash(node:*), mcp__plugin_pmap-architect_provenmap__*
---

Work the intent queue of a board: list and read intents, turn anything into governed,
well-anchored work, and manage the lifecycle. Authoring runs the **impact → attach → describe**
loop from [`${CLAUDE_PLUGIN_ROOT}/knowledge/intents-authoring/SKILL.md`](../knowledge/intents-authoring/SKILL.md)
— read it (and [`${CLAUDE_PLUGIN_ROOT}/knowledge/architect-core/SKILL.md`](../knowledge/architect-core/SKILL.md)) first.

## Workflow

1. **Working-copy check** — `get_write_session`: if the session already holds uncommitted
   changes, surface them (boards + counts) before writing — this flow's commit would carry them
   too, so the architect decides: continue (one combined commit) or resolve the pending work
   first (architect-core).
2. **Resolve and route** — argument or session board; classify per the architect-core taxonomy
   (intents are legal only on code-bound boards — route up/split before any write).
3. **List** — `list_intents` (`scope: 'tree'` for the subtree). Table: slug, name, state,
   priority, staleness. Flag `needs_clarification` and `stale` rows — they need the architect
   first.
4. **Branch:**
   - **Read** → `get_intent`; directive, anchors (with notes), origin, resolution history.
     `implemented` without `verifiedAt` is a claim, not proof — say so.
   - **Author, handed over** (arriving from `/author-intent`, `/adopt-adr`, or `/insights`):
     the drafts already exist — enrich each via the describe loop (shaping is skipped: the
     finding or decision already prescribed the approach), run the materialization gates and
     the pre-land self-review + read-back gate, then apply with `update_intent` (anchors +
     notes land on the real intent) and release with `transition_intent`.
   - **Author, free-form** ("here's what I want done"): classify per
     [`${CLAUDE_PLUGIN_ROOT}/knowledge/board-reading/SKILL.md`](../knowledge/board-reading/SKILL.md) —
     _diagram-shaped_ → make the board edit (it joins the working copy; committing later generates
     the `board_diff` intent), then optional context anchors via the loop; _code-shaped_ →
     directive intent through the full loop (shape when unsettled → holistic sweep →
     materialization gates → propose → describe → grill → self-review → read-back → land,
     `--validate intent` before `create_intent`); _both_ → edit first, then the directive
     intent citing the edited elements.
   - **Queue management** → `transition_intent` (draft→open locks it for developer pulls;
     →rejected reverts staged changes — state that consequence), `assign_intent` (empty list
     clears). `needs_clarification` → read the developer's question, revise via
     `update_intent`, re-open via `transition_intent` (the full loop, in-session).
   - **Delete** → `delete_intent` withdraws everything staged; only
     draft/open/needs_clarification can be deleted. Confirm via AskUserQuestion only for bulk
     deletion.
5. **Close** — if this session made board edits, run the closing move: `preview_write_session_commit`
   → present the plan → title/summary (AskUserQuestion) → `commit_write_session` → narrate the
   generated intents by slug, offer `publish`. Report every write from its result message,
   slug-first. No dead ends: name the next command (`/board`, `/insights`, `/hub`).

## Failure branches

- Tools missing / connection errors → `ProvenMap not configured — run /login (browser) or /configure (manual) first`
- 401 → `Your ProvenMap architect token was rejected — run /login to reconnect`
- Board not code-bound (400 "…code-bound board") → never reaches the user raw: route per the
  taxonomy and name the binding prerequisite.
- Write tools absent from the tool list → the token is read-only: say a `read_write` token is
  needed to author, and continue with reads.
