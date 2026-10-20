---
category: author
description: "Author · WRITE-CAPABLE: Plan a new system on the existing landscape — grill, place it, sketch its target architecture, draft its founding work item"
argument-hint: "<name or idea>"
allowed-tools: Read, Write, AskUserQuestion, Bash(node:*), mcp__provenmap__*
---

Read `${CLAUDE_PLUGIN_ROOT}/knowledge/landscape-modeling/SKILL.md`, `${CLAUDE_PLUGIN_ROOT}/knowledge/architect-core/SKILL.md`,
`${CLAUDE_PLUGIN_ROOT}/knowledge/board-reading/SKILL.md` and
`${CLAUDE_PLUGIN_ROOT}/knowledge/work-items-authoring/SKILL.md`.

## Workflow

At each step change, render the banner:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-architect.js --spine new-app --step <n> [--banked '<json>']
```

`<n>` is the step number; `--banked` is a flat JSON object of facts so far. Print it
**verbatim**.

### Step 1 — grill

Work landscape-modeling's /new-app grill agenda in bounded rounds, reading root
`get_nodes`/`get_edges` to propose neighbours.

### Step 2 — place on the landscape

`get_write_session` first — architect-core's non-empty-session gate. Then the placement plan
(node + edges, right archetype + container; landscape-modeling's plan file) →
`node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-architect.js --render-plan --file <plan.json> --known-slugs <root slugs>`:
exit 3 → fix, re-run. Print `display` **verbatim**, ask `goAhead` as given (on *Let me pick*, then `pick.rounds`),
then from `--plan-approve`'s wire: `create_nodes` + `create_edges` on root → `create_board`.
Repo-backed systems are root nodes only (app-nesting rule); say so if this extracts from an
existing app.

### Step 3 — sketch the L1 target

Draw the L1 skeleton on the new board — landscape-modeling's deliberate divergence; narrate
its reconciliation truth. Then architect-core's closing move: `preview_write_session_commit` →
title/summary (AskUserQuestion) → `commit_write_session` → offer `publish`.

### Step 3.5 — style the sketch

Style the fresh L1 sketch — read `${CLAUDE_PLUGIN_ROOT}/knowledge/board-styling/SKILL.md` and run
its pipeline (`--style-signals --board <slug>` → plan → `--validate styles` → `apply_*`
calls); say in the closing line how many elements carry no token. Two failed rounds → skip, note it, continue; /style-board
recovers later.

### Step 4 — binding gate, then founding work item

Draft the founding work item in-session (work-items-authoring quality), then
close landscape-modeling's binding gate:

- Has a repo → offer `convert_node_to_app` with `observationType: 'new_app'` for the system
  planned here, `'existing_app'` only if the grill found existing code.
- Planning material is a doc → `bind_reference_source` on the new board.
- Architect defers → narrate the code-bound-board prerequisite; name `/author-work-item <board>`
  as the resume.

Once authorable: `create_work_item` (`anchors[]` grounds the L1 sketch), then the
work-items-authoring describe loop.

### Step 5 — build prep (new_app only)

Converted as `new_app` → one AskUserQuestion: **Prep the build now?**

- **Now** → read `${CLAUDE_PLUGIN_ROOT}/knowledge/app-readiness/SKILL.md` and continue in-session;
  the grill's answers carry into the spec set, then skills (architect-core's inline handoff).
- **Later** → close.

**Outcome:** `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-architect.js --brief --command new-app --facts '{"board":"<slug>","observationType":"<observationType>"}'` → Done · Left · Next, per `${CLAUDE_PLUGIN_ROOT}/knowledge/outcome/SKILL.md`.

## Failure branches

- Tools missing / connection errors → `ProvenMap not configured — run /login (browser) or /configure (manual) first`
- 401 → `Your ProvenMap MCP access token was rejected — run /login to reconnect`
- Empty root, nothing to place on → `/setup` territory; say so.
- Write tools absent → read-only token: grill, emit the plan as markdown, name the
  `read_write` need.
