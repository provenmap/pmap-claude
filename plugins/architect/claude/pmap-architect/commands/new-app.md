---
category: author
description: "Author · WRITE-CAPABLE: Plan a new system on the existing landscape — grill, place it, sketch its target architecture, draft its founding intent"
argument-hint: "<name or idea>"
allowed-tools: Read, AskUserQuestion, Bash(node:*), mcp__plugin_pmap-architect_provenmap__*
---

Architecture-first inception of one system on an existing landscape. Grill first, then build.
Read `${CLAUDE_PLUGIN_ROOT}/knowledge/landscape-modeling/SKILL.md` (grill agenda, L1 sketch,
binding gate), `${CLAUDE_PLUGIN_ROOT}/knowledge/architect-core/SKILL.md`,
`${CLAUDE_PLUGIN_ROOT}/knowledge/board-reading/SKILL.md` and
`${CLAUDE_PLUGIN_ROOT}/knowledge/intents-authoring/SKILL.md`.

## Workflow

At each step change, render the banner:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-architect.js --spine new-app --step <n> [--banked '<json>']
```

`<n>` is the step number (3.5 for styling); `--banked` is a flat JSON object of facts so far.
Print it **verbatim** as the step banner — do not reformat, reorder, or summarise.

### Step 1 — grill

Work landscape-modeling's /new-app grill agenda in bounded rounds, reading root
`get_nodes`/`get_edges` to propose neighbours. Keep the plan in a drafts file.

### Step 2 — place on the landscape

`get_write_session` first — architect-core's non-empty-session gate. Surface what's pending;
the architect decides: combine or pause. Then `create_nodes` on root (node + edges, right
archetype + container; `--validate diagram` first) → `create_board`. Repo-backed systems are
root nodes only (app-nesting rule); say so if this extracts from an existing app.

### Step 3 — sketch the L1 target

Draw the L1 skeleton on the new board — landscape-modeling's deliberate divergence; narrate
its reconciliation truth. Then architect-core's closing move: `preview_write_session_commit` →
title/summary (AskUserQuestion) → `commit_write_session` → offer `publish`.

### Step 3.5 — style the sketch

Style the fresh L1 sketch — read `${CLAUDE_PLUGIN_ROOT}/knowledge/board-styling/SKILL.md` and run
its pipeline (`--style-signals --board <slug>` → plan → `--validate styles` → `apply_*`
calls). Two failed rounds → skip, note it, continue; /style-board recovers later.

### Step 4 — binding gate, then founding intent

Draft the founding intent in-session (intents-authoring quality, in the drafts file), then
close landscape-modeling's binding gate:

- Has a repo → offer `convert_node_to_app` with `observationType: 'new_app'` for the system
  planned here, `'existing_app'` only if the grill found existing code.
- Planning material is a doc → `bind_reference_source` on the new board.
- Architect defers → narrate the code-bound-board prerequisite; name `/author-intent <board>`
  as the resume.

Once authorable: `create_intent` (`anchors[]` grounds the L1 sketch), then the
intents-authoring describe loop.

### Step 5 — build prep (new_app only)

Converted as `new_app` → one AskUserQuestion: **Prep the build now?**

- **Now** → read `${CLAUDE_PLUGIN_ROOT}/knowledge/app-readiness/SKILL.md` and continue in-session;
  the drafts file carries into the spec set, then skills (architect-core's inline handoff).
- **Later** → _"run `/prepare-app <board>` when ready — it resumes from live state."_

## Failure branches

- Tools missing / connection errors → `ProvenMap not configured — run /login (browser) or /configure (manual) first`
- 401 → `Your ProvenMap architect token was rejected — run /login to reconnect`
- Empty root, nothing to place on → `/setup-workspace` territory; say so.
- Write tools absent → read-only token: grill, emit the plan as markdown, name the
  `read_write` need.
