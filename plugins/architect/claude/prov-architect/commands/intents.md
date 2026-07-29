---
category: author
description: "Author · WRITE-CAPABLE: List, author, and manage board intents — the impact→attach→describe loop; drafts land for in-platform review"
argument-hint: "[board-slug] [intent-slug | --from-spec <spec-slug>]"
allowed-tools: AskUserQuestion, Bash(node:*), mcp__plugin_prov-architect_provenmap__*
---

Work the intent queue of a board: list and read intents, turn anything into governed,
well-anchored work, and manage the lifecycle. Authoring runs the **impact → attach → describe**
loop from the **intents-authoring** skill; load it (and **architect-core**) first.

## Workflow

1. **Session hygiene** — `--session list`; reconcile dangling candidates (architect-core).
2. **Resolve and route** — argument or session board; classify per the architect-core taxonomy
   (intents are legal only on code-bound boards — route up/split before any write).
3. **List** — `list_intents` (`scope: 'tree'` for the subtree). Table: slug, name, state,
   priority, staleness. Flag `needs_clarification` and `stale` rows — they need the architect
   first.
4. **Branch:**
   - **Read** → `get_intent`; directive, anchors (with notes), origin, resolution history.
     `implemented` without `verifiedAt` is a claim, not proof — say so.
   - **Author, handed over** (`--from-spec <slug>`, or arriving from `/author-spec` /
     `/adopt-adr`): for an approved spec, propose requirement **groupings** (each group = ONE
     coherent intent), confirm (AskUserQuestion — genuine decision point),
     `promote_spec_requirements`, then enrich each minted draft via the describe loop and
     apply it with `update_intent` (anchors + notes land on the real intent).
   - **Author, free-form** ("here's what I want done"): classify per board-reading —
     *diagram-shaped* → make the board edit (write session; on a governed board it stages its
     own `board_diff` intent), then optional context anchors via the loop; *code-shaped* →
     directive intent through the full loop (sweep → collision check → propose → describe →
     land, `--validate intent` before `create_intent`); *both* → edit first, then the directive
     intent citing the staged elements.
   - **Queue management** → `transition_intent` (draft→open locks it for developer pulls;
     →rejected reverts staged changes — state that consequence), `assign_intent` (empty list
     clears). `needs_clarification` → read the developer's question, revise via
     `update_intent`, re-open via `transition_intent` (the full loop, in-session).
   - **Delete** → `delete_intent` withdraws everything staged; only
     draft/open/needs_clarification can be deleted. Confirm via AskUserQuestion only for bulk
     deletion.
5. **Report** every write from its result message, slug-first; multi-board sets narrate their
   shared write session. No dead ends: name the next command (`/board`, `/insights`, `/specs`).

## Failure branches

- Tools missing / connection errors → `ProvenMap not configured — run /login (browser) or /configure (manual) first`
- 401 → `Your ProvenMap architect token was rejected — run /login to reconnect`
- Board not code-bound (400 "…code-bound board") → never reaches the user raw: route per the
  taxonomy and name the binding prerequisite.
- Write tools absent from the tool list → the token is read-only: say a `read_write` token is
  needed to author, and continue with reads.
