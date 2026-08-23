---
category: explore
description: "Explore · Orient on a ProvenMap board and work it — explore, analyze, and make governed edits"
argument-hint: "[board-slug]"
allowed-tools: Read, AskUserQuestion, Bash(node:*), mcp__plugin_pmap-architect_provenmap__*
---

Open an architect working session: orient on the board, then follow the architect's lead. First
read `${CLAUDE_PLUGIN_ROOT}/knowledge/board-reading/SKILL.md` (orientation, analysis, the diagram
contract) and `${CLAUDE_PLUGIN_ROOT}/knowledge/architect-core/SKILL.md` (taxonomy, scope, passive review,
the working copy).

## Workflow

### Step 1 — resolve the board

- Slug argument given → use it directly.
- No argument → call `get_board_tree`. One board → use it. Several → AskUserQuestion with the
  top-level boards (slug + name; offer drilling into layers). A board-restricted token sees only
  its subtree — scope to what the tree returns.

### Step 2 — classify, then orient

Classify per the architect-core taxonomy; per-class detection facts and orientation moves are in
`${CLAUDE_PLUGIN_ROOT}/knowledge/board-reading/references/orientation.md`:

- **Empty root** → don't orient on nothing; offer `/setup-workspace`.
- **Empty app board** / **empty plain layer** → don't orient on nothing; read
  `${CLAUDE_PLUGIN_ROOT}/knowledge/board-init/SKILL.md` and run its bootstrap inline — the full one for an
  app board, the lightweight variant for a layer (or route up to the owning app board).
- **Root / landscape** → orient as a **portfolio**, not a canvas walk; landscape edits follow
  `${CLAUDE_PLUGIN_ROOT}/knowledge/landscape-modeling/SKILL.md`.
- **Plain layer** → orient normally; say that facet work (intents) routes up to the owning app board.
- **App board** → the full board-reading orientation sequence (`get_workboard_details`,
  `get_hub_status`, `list_intents`, `list_insights`).

Then summarize slug-first and invite direction — the session is conversational from here.

### Step 3 — work

Answer, analyze, and edit per the board-reading skill; every write joins the architect's working
copy — narrate its journal line (architect-core) after each batch. Drilling a container down
(`create_board`), and the scoped styling pass to offer after a batch that added or rewired
elements (a full pass is /style-board), are in the orientation reference.

For "is this board grouped right?", "should X sit inside Y?", or after a batch that added
several elements, run the grouping review:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-architect.js --group-plan --board <slug>
```

Print its `display` **verbatim** (a summary); read verdicts from the JSON's `clusters`/`drift`
and the `Grouping rationale:` override per that reference. Every move re-parents a node — apply only what the architect confirms.

**Closing move (any session that wrote), per architect-core:** `preview_write_session_commit` →
present the plan → ask for title/summary (AskUserQuestion) → `commit_write_session` → narrate the
generated intents by slug, offer `publish: true`. To abandon instead: confirm the boards + counts
from `get_write_session`, then `discard_write_session` — it reverts the WHOLE working copy.

## Failure branches

- Tools missing / connection errors → `ProvenMap not configured — run /login (browser) or /configure (manual) first`
- 401 from any call → `Your ProvenMap architect token was rejected — run /login to reconnect`
- "board not found" on a slug the tree did not return → likely outside the token's board
  restriction; say so and re-orient with `get_board_tree`.
- Write refused with `scope_violation` → relay the message; writes are fenced to the token's
  scope. Do not retry blind.
