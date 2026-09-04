---
category: author
description: "Author · WRITE-CAPABLE: Bootstrap an empty workspace — map what exists, or found a new product line: system landscape, app boards, binding handoff"
allowed-tools: Read, AskUserQuestion, Bash(node:*), mcp__plugin_pmap-architect_provenmap__*
---

Read `${CLAUDE_PLUGIN_ROOT}/knowledge/<skill>/SKILL.md`: landscape-modeling (doctrine, agendas,
archetypes), architect-core, board-reading; board-styling, app-readiness at their steps.

## Workflow

Print each step banner **verbatim**:
`node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-architect.js --spine setup-workspace --step <n>
[--interview-mode map|found] [--banked '<json>']`

### Step 1 — detect the state

`get_board_tree` + `get_workboard_details` + `list_source_bindings` on `root`, then
`get_write_session` — architect-core's non-empty-session gate: the architect decides, combine or
pause. Route:

- **Empty root** → full interview, from the fork.
- **Sparse, unbound root** → _continue_: extend, don't restart, on the drafts file's mode.
- **Populated or bound** → window closed: `/board` or `/new-app`; say why.

### Step 2 — fork, source gate, interview

**The fork** (AskUserQuestion): map an existing estate, or found something new?

**The source gate** (map mode, before any estate question; AskUserQuestion, multi-select):
describe in conversation / scan repo folders / share documents; a scan runs
`node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-architect.js --scan-repos --paths <p1,p2,...>`.

Then work landscape-modeling's agenda; its one-line opener is the root board description
(`apply_diagram_info`).

### Step 3 — draw the landscape

`get_archetypes` first. Present landscape-modeling's plan for **one** go-ahead
(AskUserQuestion), then batch: `--validate diagram` → containers → ONE `create_nodes` → ONE
`create_edges`. Archetypes follow the kind (map) or are system-only (found).

### Step 3.5 — style the landscape

Run board-styling's pipeline on the new board: `--style-signals --board <slug>` → plan →
`--validate styles` → `apply_*`. Two failed rounds → skip, say so, continue; /style-board
recovers later.

### Step 4 — generate app boards

`create_board` per repo-backed node: **never draw inside**. Found mode: **skipped** — no boards or bindings; say why.

### Step 5 — commit the scaffold, complete the bindings

Architect-core's closing move: `preview_write_session_commit` → title/summary (AskUserQuestion) →
`commit_write_session`.

- **Map:** offer `convert_node_to_app` per repo-backed node (landscape-modeling's rules);
  `observationType` never re-asked: `'existing_app'` for `repo`, `'new_app'` for `new-app`, and
  `'new_app'` → build prep: app-readiness inline, or `/prepare-app <board>`.
- **Found:** no binding offers; the checklist carries the graduation path.

Then run `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-architect.js --render-scaffold --file
<scaffold.json>` and print its output **verbatim**; delete the drafts file.

### Step 6 — close

**Outcome:** `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-architect.js --brief --command setup-workspace --facts '{"mode":"<map|found>"}'` → Done · Left · Next, per `${CLAUDE_PLUGIN_ROOT}/knowledge/outcome/SKILL.md` (map mode carries the developers' hand-off). Walk away → `discard_write_session` unwinds it.

## Failure branches

- Tools missing / connection errors → `ProvenMap not configured — run /login (browser) or /configure (manual) first`
- 401 → `Your ProvenMap architect token was rejected — run /login to reconnect`
- Write tools absent → read-only token: fork + interview, plan as markdown, name the
  `read_write` need.
