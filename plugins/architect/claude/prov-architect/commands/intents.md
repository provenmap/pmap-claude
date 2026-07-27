---
category: author
description: "Author · WRITE-CAPABLE: List, author, and manage board intents — drafts land for in-platform review"
argument-hint: "[board-slug] [intent-slug]"
allowed-tools: AskUserQuestion, mcp__plugin_prov-architect_provenmap__*
---

Work the intent queue of a board: list and read intents, author new drafts, and manage the
lifecycle (open, assign, reject, delete). All authoring rules — lifecycle, anchoring, structured
directives — live in the **intents-authoring** skill; load it (and **architect-core**) first.

## Workflow

1. **Resolve the board** (argument, or the session's current board from `/board`; otherwise
   `get_board_tree` + AskUserQuestion).
2. **List** — `list_intents` (add `scope: 'tree'` when the user wants the whole subtree). Render
   a table: slug, name, state, priority, staleness. Flag `needs_clarification` and `stale` rows —
   they need the architect's attention first.
3. **Branch on what the user wants:**
   - **Read** → `get_intent`; present directive, anchors (with notes), origin, resolution
     history. `implemented` without `verifiedAt` is a claim, not proof — say so.
   - **Author** → gather name + directive + anchors per the skill's structured-directive rules,
     then `create_intent`. Narrate: staged as a **draft** for in-platform review.
   - **Queue management** → `transition_intent` (draft→open locks it for developer pulls;
     →rejected reverts any staged board changes — state that consequence when rejecting),
     `assign_intent` (empty list clears).
   - **Delete** → `delete_intent` withdraws everything the intent staged; only
     draft/open/needs_clarification can be deleted. Confirm via AskUserQuestion only for bulk
     deletion — single deletes proceed and report.
4. **Report** every write from its result message, slug-first. No dead ends: name the next
   command (`/board` to see anchored elements, `/insights` to review findings worth promoting).

## Failure branches

- Tools missing / connection errors → `ProvenMap not configured — run /login (browser) or /configure (manual) first`
- 401 → `Your ProvenMap architect token was rejected — run /login to reconnect`
- Write tools absent from the tool list → the token is read-only: say a `read_write` token is
  needed to author, and continue with reads.
