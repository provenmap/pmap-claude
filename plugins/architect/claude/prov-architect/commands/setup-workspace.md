---
category: author
description: "Author · WRITE-CAPABLE: Bootstrap an empty workspace — interview the architect, draw the org's system landscape, mint app boards, hand off repo binding"
allowed-tools: AskUserQuestion, Bash(node:*), mcp__plugin_prov-architect_provenmap__*
---

The top of the funnel: a ready-but-empty workspace and an architect who knows the org. Interview
briefly, draw the L0 landscape on the root board, mint app boards for repo-backed systems, and
end at the binding-handoff checklist. Doctrine, archetype selection, and the checklist contract
live in **landscape-modeling**; load it plus **architect-core** and **board-reading**.

## Workflow

### Step 1 — detect the state

`get_board_tree('root')` + `get_workboard_details('root')` + `list_source_bindings('root')` —
and `get_write_session`: if the working copy already holds uncommitted changes, surface them
(boards + counts) and ask — continue (this flow's commit would carry them too) or pause for the
architect to decide the pending work first (architect-core).

- **Empty root** (0 nodes/edges, ≤1 top-level board, no bindings) → full interview.
- **Sparse root, no code-plugin binding anywhere yet** → *continue* mode: extend what exists,
  don't restart.
- **Populated or bound** → this command's window has closed: route to `/board` (landscape mode)
  or `/new-app` and say why — after the first repo binds, additions go one system at a time.

### Step 2 — the org interview (ELICIT)

A few short questions, not a form — stop as soon as you can name the apps (doctrine in
landscape-modeling). Dimensions: what the org does (one line — becomes the root board
description via `apply_diagram_info`); the systems that exist today; which have their **own
repository** (and its scope: web, backend, mono-repo, worker…); external SaaS/integrations; the
infra worth showing at L0; actors/user types; real zones for grouping. Never invent a system.
Keep the running scaffold plan as a drafts file (architect-core) so setup is resumable.

### Step 3 — draw the landscape (LANDSCAPE)

`get_archetypes` first. Present the plan (table: system, archetype, container, repo?) — **one
go-ahead, then the batch without re-asking** (AskUserQuestion for the go-ahead). Then: validate
the payload (`--validate diagram`) → containers, then ONE `create_nodes` call, then ONE
`create_edges` call — every write joins the working copy automatically. Repo-backed systems get
**app archetypes** (that's what makes them bindable); repo-less get system archetypes.

### Step 4 — mint app boards (APP BOARDS)

`create_board(ownerNodeSlug, newBoardSlug, name)` per repo-backed node. Born empty — **never
draw inside**: content arrives from developer pushes.

### Step 5 — commit the scaffold, complete the bindings (or hand off)

The closing move (architect-core): `preview_write_session_commit` → present the plan → ask for
title/summary (AskUserQuestion) → `commit_write_session` → narrate what was minted. Then, per
repo-backed node, offer to complete the binding **in-session**: `convert_node_to_app
{nodeSlug, branch}` (landscape-modeling has the rules — eligibility pre-check, archetype
requirement, credentials never issued here). Repos the architect defers stay on the checklist.
Render it and print **verbatim** (converted nodes read as confirmations):

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/prov-architect.js --render-scaffold --file <scaffold.json>
```

Delete the drafts file once handed off.

### Step 6 — next steps, ranked

1. **Developers connect each bound repo** (code plugin `/login` + `/configure`, first push) —
   the app boards fill from code; then `/author-intent` on the first app.
2. **Add the next system later** → `/new-app` (the standing next step).
3. **Watch the estate** → `/hub`.

If the architect walks away mid-setup: the scaffold sits uncommitted in their working copy —
`discard_write_session` unwinds it (landscape + boards), but it reverts the WHOLE session,
app-made changes included: confirm with the named boards + counts from `get_write_session`
first, and render `{reverted, conflicted, skipped}` honestly.

## Failure branches

- Tools missing / connection errors → `ProvenMap not configured — run /login (browser) or /configure (manual) first`
- 401 → `Your ProvenMap architect token was rejected — run /login to reconnect`
- Write tools absent → read-only token: run the interview, emit the plan as markdown, and name
  the `read_write` requirement.
