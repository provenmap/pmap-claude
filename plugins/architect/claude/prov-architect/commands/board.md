---
category: explore
description: "Explore · Orient on a ProvenMap board and work it — explore, analyze, and make governed edits"
argument-hint: "[board-slug]"
allowed-tools: AskUserQuestion, Bash(node:*), mcp__plugin_prov-architect_provenmap__*
---

Open an architect working session on a board: orient on its structure, then follow the
architect's lead — questions, analysis, and governed board edits. Methodology lives in the
**board-reading** skill (orientation, navigation, analysis, the diagram tool contract) and
**architect-core** (scope, passive review, formatting) — load both.

## Workflow

### Step 1 — resolve the board

- Slug argument given → use it directly.
- No argument → call `get_board_tree`. One board → use it. Several → AskUserQuestion with the
  top-level boards (slug + name; offer drilling into layers). A board-restricted token sees only
  its subtree — scope to what the tree returns.

### Step 2 — classify, then orient

Classify the board per the architect-core taxonomy (board-reading has the method), and orient
accordingly:

- **Empty root** → don't orient on nothing; offer `/setup-workspace`.
- **Root / landscape** → orient as a **portfolio** (apps + health + cross-app edges), not a
  canvas walk; landscape edits follow the **landscape-modeling** skill (app archetypes for
  bindable slots, the app-nesting rule).
- **Plain layer** → orient normally, and note that facet work (specs/intents) routes up to the
  owning app board.
- **App board** → the full board-reading orientation sequence (`get_workboard_details`,
  `get_hub_status`, `list_intents`, `list_insights`).

Summarize slug-first: purpose, domains/containers, layers, work in flight. Then invite
direction — the session is conversational from here.

### Step 3 — work

Answer, analyze, and edit per the board-reading skill. After any write, narrate the governance
state from the result message: **"staged as intent `<slug>` — delete it to revert"**. Use a
write session for multi-step edits (recorded in the session ledger — architect-core). For
"drill this container into its own board": `create_board {ownerNodeSlug, newBoardSlug, name,
ownerBoardSlug: <this board>}` — the container becomes the drill-down; on a governed board the
creation stages for review. Say plainly that a layer under an app board stays a plain layer
permanently (app-nesting rule) — never pitch it as a future app slot.

## Failure branches

- Tools missing entirely / connection errors → `ProvenMap not configured — run /login (browser) or /configure (manual) first`
- 401 from any call → `Your ProvenMap architect token was rejected — run /login to reconnect`
- "board not found" on a slug the tree did not return → likely outside the token's board
  restriction; say so and re-orient with `get_board_tree`.
- Write refused with `scope_violation` → relay the message; writes are fenced to the token's
  scope. Do not retry blind.
