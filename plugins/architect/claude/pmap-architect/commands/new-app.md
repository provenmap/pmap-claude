---
category: author
description: "Author · WRITE-CAPABLE: Plan a new system on the existing landscape — grill, place it, sketch its target architecture, draft its founding intent"
argument-hint: "<name or idea>"
allowed-tools: Read, AskUserQuestion, Bash(node:*), mcp__plugin_pmap-architect_provenmap__*
---

Architecture-first inception of one system on a landscape that already exists. Grill first, then
build. Read [`${CLAUDE_PLUGIN_ROOT}/knowledge/landscape-modeling/SKILL.md`](../knowledge/landscape-modeling/SKILL.md)
(placement, archetypes, the L1-sketch divergence),
[`${CLAUDE_PLUGIN_ROOT}/knowledge/architect-core/SKILL.md`](../knowledge/architect-core/SKILL.md), and
[`${CLAUDE_PLUGIN_ROOT}/knowledge/board-reading/SKILL.md`](../knowledge/board-reading/SKILL.md); the founding intent
uses [`${CLAUDE_PLUGIN_ROOT}/knowledge/intents-authoring/SKILL.md`](../knowledge/intents-authoring/SKILL.md).

## Workflow

At each step change, render the banner with:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-architect.js --spine new-app --step <n> [--banked '<json>']
```

`<n>` is this step's number (3.5 for the styling step). Pass `--banked` with a flat JSON object
of the name/value facts captured so far. Print the result **verbatim** in place of the
`**Step N/M — <name>**` banner — do not reformat, reorder, or summarise.

### Step 1 — grill

Bounded rounds: purpose (one sentence); where it sits on the landscape (read root `get_nodes` /
`get_edges`, propose neighbours); archetype — an **app archetype** matching its repo scope if it
will have a repo, else a system archetype; what it owns (data, endpoints, events — the L1
skeleton); what it replaces or splits (existing nodes to re-wire). Keep the running plan in a
drafts file.

### Step 2 — place on the landscape

First `get_write_session`: pre-existing uncommitted changes are surfaced and the architect
decides — combined commit later, or pause (architect-core). Then `create_nodes` on root (the
node + proposed edges, correct archetype + container; `--validate diagram` first) →
`create_board(ownerNodeSlug, newBoardSlug, name)` — the writes join the working copy
automatically. Repo-backed systems are placed as **root landscape nodes only** (app-nesting
rule); if this is an extraction from an existing app, say so: new node + board here, re-wiring
intents there.

### Step 3 — sketch the L1 target

Draw the L1 skeleton on the new board (containers + key components + edges from the grill) —
the deliberate divergence landscape-modeling documents. Narrate the reconciliation truth: when
the repo binds and pushes, analysis reconciles against this sketch — expect intents where
reality disagrees. Then the closing move (architect-core): `preview_write_session_commit` →
present the plan → title/summary (AskUserQuestion) → `commit_write_session` → narrate the
generated intents, offer `publish`.

### Step 3.5 — style the sketch (board-styling skill)

Style the L1 board you just sketched before moving on — read
[`${CLAUDE_PLUGIN_ROOT}/knowledge/board-styling/SKILL.md`](../knowledge/board-styling/SKILL.md), run
`--style-signals --board <slug>`, plan (fresh board: style everything; an L1 sketch usually
reads `flow` with the app's core service as the one lg node), `--validate styles`, then the
`apply_*` calls. Two failed validation rounds → skip, note it, continue; /style-board recovers
later.

### Step 4 — close the binding gate, then land the founding intent

Draft the founding intent in-session (full intents-authoring quality, kept in the drafts file),
then close the gate without a portal trip:

- System has a repo → offer `convert_node_to_app {nodeSlug, branch, observationType}`
  (landscape-modeling rules; credentials never issued here — the developer's code plugin
  connects separately). `observationType` is `'new_app'` for the planned system this command
  exists for (a freshly created empty repo is still `'new_app'`); `'existing_app'` only when
  the grill revealed the code already exists.
- Planning material is a document → `bind_reference_source` on the new board (enough to
  author).
- Architect defers → the classic narration: _"Intents need a code-bound board — bind the repo,
  then rerun `/author-intent <board>` and I'll land this draft."_

Once authorable: `create_intent` (with `anchors[]` grounding the L1 sketch), then enrich via
the intents-authoring describe loop.

### Step 5 — build prep (new_app only)

Converted with `observationType: 'new_app'` → one AskUserQuestion: **Prep the build now?**

- **Now** → read [`${CLAUDE_PLUGIN_ROOT}/knowledge/app-readiness/SKILL.md`](../knowledge/app-readiness/SKILL.md)
  and continue in-session — the grill's drafts file carries straight into the spec set, then
  skills. (Commands can't invoke each other; this is the architect-core inline handoff.)
- **Later** → name it: _"run `/prepare-app <board>` when ready — it resumes from live state."_

## Failure branches

- Tools missing / connection errors → `ProvenMap not configured — run /login (browser) or /configure (manual) first`
- 401 → `Your ProvenMap architect token was rejected — run /login to reconnect`
- Empty root (no landscape to place on) → this is `/setup-workspace` territory; say so.
- Write tools absent → read-only token: grill + emit the plan as markdown; name the
  `read_write` requirement.
