---
category: explore
description: "Explore · Orient on a ProvenMap board and work it — explore, analyze, and make governed edits"
argument-hint: "[board-slug]"
allowed-tools: Read, AskUserQuestion, Bash(node:*), mcp__plugin_pmap-architect_provenmap__*
---

Open an architect working session on a board: orient on its structure, then follow the
architect's lead — questions, analysis, and governed board edits. Methodology lives in
[`${CLAUDE_PLUGIN_ROOT}/knowledge/board-reading/SKILL.md`](../knowledge/board-reading/SKILL.md) (orientation,
navigation, analysis, the diagram tool contract) and
[`${CLAUDE_PLUGIN_ROOT}/knowledge/architect-core/SKILL.md`](../knowledge/architect-core/SKILL.md) (scope, passive
review, formatting) — read both. When classification meets an empty board below root, read
[`${CLAUDE_PLUGIN_ROOT}/knowledge/board-init/SKILL.md`](../knowledge/board-init/SKILL.md) and run its bootstrap
inline.

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
- **Empty app board** (0 nodes/edges, below root, with a code-plugin binding — or unbound with
  an app-archetype owner node) → don't orient on nothing; offer the **board bootstrap**
  (read [`${CLAUDE_PLUGIN_ROOT}/knowledge/board-init/SKILL.md`](../knowledge/board-init/SKILL.md) and run it
  inline).
- **Empty plain layer** (0 nodes/edges, `isChildLayer`, no app-ness) → offer the lightweight
  board-init variant: sketch the sub-structure, or route up to the owning app board.
- **Root / landscape** → orient as a **portfolio** (apps + health + cross-app edges), not a
  canvas walk; landscape edits follow
  [`${CLAUDE_PLUGIN_ROOT}/knowledge/landscape-modeling/SKILL.md`](../knowledge/landscape-modeling/SKILL.md)
  (app archetypes for bindable slots, the app-nesting rule).
- **Plain layer** → orient normally, and note that facet work (intents) routes up to the
  owning app board.
- **App board** → the full board-reading orientation sequence (`get_workboard_details`,
  `get_hub_status`, `list_intents`, `list_insights`).

Summarize slug-first: purpose, domains/containers, layers, work in flight. Then invite
direction — the session is conversational from here.

### Step 3 — work

Answer, analyze, and edit per the board-reading skill. Writes join the architect's working copy
automatically — after a write batch, narrate the journal: **"Saved to your working copy — N
uncommitted changes across M boards"** (nothing is staged and no intent exists yet). For
"drill this container into its own board": `create_board {ownerNodeSlug, newBoardSlug, name,
ownerBoardSlug: <this board>}` — the container becomes the drill-down, journaled like any other
diagram write. Say plainly that a layer under an app board stays a plain layer permanently
(app-nesting rule) — never pitch it as a future app slot. For a full visual pass over this
board, hand off to /style-board — inline styling here covers only elements this session touches
(read [`${CLAUDE_PLUGIN_ROOT}/knowledge/board-styling/SKILL.md`](../knowledge/board-styling/SKILL.md)).

For "is this board grouped right?", "should X sit inside Y?", or after a batch that added
several elements, run the grouping review:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-architect.js --group-plan --board <slug>
```

Print its `display` **verbatim**. It reads the board's containment against how its elements
actually relate — seeded from the board's own parent tree, so `drift[]` is what has stopped
holding, not an unrelated re-partition. Zones with `verdict: "dissolve"` group by label rather
than by boundary; `verdict: "drill-down"` has outgrown one board (offer `create_board`);
`parents[]` proposes a zone inside a zone. Every move re-parents a node — walk the drift with
the architect and apply only what they confirm. A zone that is deliberate but has no edges to
justify it (a vendor cohort, a compliance boundary) stays: record why by starting its
description with `Grouping rationale:`, and the gate stops flagging it.

When a write batch added or rewired elements, offer a scoped styling pass over just those
elements (read [`${CLAUDE_PLUGIN_ROOT}/knowledge/board-styling/SKILL.md`](../knowledge/board-styling/SKILL.md); the
précis `styling` field shows what the rest of the board
already has — match its conventions, never restyle untouched elements inline).

**Closing move (any session that wrote):** `preview_write_session_commit` → present the plan
(per-root `+add ~modify −remove`, conflicts, what commits plain; the session may include the
architect's own web-app changes — say so) → ask for title/summary (AskUserQuestion) →
`commit_write_session` → narrate the generated intents by slug, offer `publish: true`. Or, if the
architect wants to abandon the batch: confirm the named boards + counts from
`get_write_session`, then `discard_write_session` — it reverts the WHOLE working copy, app-made
changes included; render `{reverted, conflicted, skipped}` honestly.

## Failure branches

- Tools missing entirely / connection errors → `ProvenMap not configured — run /login (browser) or /configure (manual) first`
- 401 from any call → `Your ProvenMap architect token was rejected — run /login to reconnect`
- "board not found" on a slug the tree did not return → likely outside the token's board
  restriction; say so and re-orient with `get_board_tree`.
- Write refused with `scope_violation` → relay the message; writes are fenced to the token's
  scope. Do not retry blind.
