---
category: author
description: "Author · WRITE-CAPABLE: Bootstrap an empty workspace — map the estate that exists, or found a new product line: interview, system landscape, app boards or strategic-only scaffold, binding handoff"
allowed-tools: AskUserQuestion, Bash(node:*), mcp__plugin_prov-architect_provenmap__*
---

The top of the funnel: a ready-but-empty workspace and an architect who either knows the org or
is founding something new. Fork first, interview briefly, draw the landscape on the root board,
then — map mode — mint app boards and hand off bindings, or — found mode — stop at the
strategic level and name the graduation path. Doctrine, archetype selection, both divergences,
and the checklist contract live in **landscape-modeling**; load it plus **architect-core** and
**board-reading**.

## Workflow

### Step 1 — detect the state

`get_board_tree('root')` + `get_workboard_details('root')` + `list_source_bindings('root')` —
and `get_write_session`: if the working copy already holds uncommitted changes, surface them
(boards + counts) and ask — continue (this flow's commit would carry them too) or pause for the
architect to decide the pending work first (architect-core).

- **Empty root** (0 nodes/edges, ≤1 top-level board, no bindings) → full interview, starting at
  the fork.
- **Sparse root, no code-plugin binding anywhere yet** → *continue* mode: extend what exists,
  don't restart (keep the mode the scaffold drafts file recorded; ask the fork only if no
  drafts file exists).
- **Populated or bound** → this command's window has closed: route to `/board` (landscape mode)
  or `/new-app` and say why — after the first repo binds, additions go one system at a time.

### Step 2 — the fork, then the interview (ELICIT)

**The fork** (AskUserQuestion, the first interview move): *"Are we mapping an estate that
exists, or founding something new?"*

- **Map what exists** (map mode) — the org interview: what the org does (one line — becomes the
  root board description via `apply_diagram_info`); the systems that exist today; which have
  their **own repository** (and its scope: web, backend, mono-repo, worker…); external
  SaaS/integrations; the infra worth showing at L0; actors/user types; real zones for grouping.
  Never invent a system.
- **Found something new** (found mode) — the product-line interview: what's being built and for
  whom (one line — the root board description via `apply_diagram_info`); the intended systems
  and what each owns; actors/user types; external SaaS it will lean on; real zones. Stop when
  the intended systems have names. Never invent beyond what the architect has decided
  (landscape-modeling, founding-landscape divergence).

A few short questions, not a form — stop as soon as you can name the systems. Keep the running
scaffold plan (including the chosen mode) as a drafts file (architect-core) so setup is
resumable. Mixed answers are normal: real systems named in found mode are treated as map mode
treats them.

### Step 3 — draw the landscape (LANDSCAPE)

`get_archetypes` first. Present the plan (table: system, archetype, container, repo?) — **one
go-ahead, then the batch without re-asking** (AskUserQuestion for the go-ahead). Then: validate
the payload (`--validate diagram`) → containers, then ONE `create_nodes` call, then ONE
`create_edges` call — every write joins the working copy automatically.

- Map mode: repo-backed systems get **app archetypes** (that's what makes them bindable);
  repo-less get system archetypes.
- Found mode: **system archetypes only** — a planned system is not yet bindable; the plan
  table's repo? column reads `planned`. Narrate the founding truth: *"this is target state —
  systems graduate as they become real."*

### Step 4 — mint app boards (APP BOARDS — map mode only)

`create_board(ownerNodeSlug, newBoardSlug, name)` per repo-backed node. Born empty — **never
draw inside**: content arrives from developer pushes.

Found mode: **skipped entirely** — no app boards, no bindings. Say why: the workspace stays at
the strategic level; boards arrive at graduation (landscape-modeling's graduation path).

### Step 5 — commit the scaffold, complete the bindings (or hand off)

The closing move (architect-core): `preview_write_session_commit` → present the plan → ask for
title/summary (AskUserQuestion) → `commit_write_session` → narrate what was minted. Then:

- **Map mode:** per repo-backed node, offer to complete the binding **in-session**:
  `convert_node_to_app {nodeSlug, branch}` (landscape-modeling has the rules — eligibility
  pre-check, archetype requirement, credentials never issued here). Repos the architect defers
  stay on the checklist.
- **Found mode:** no binding offers — the checklist carries the graduation path instead of
  repos-to-bind.

Render the checklist and print **verbatim** (converted nodes read as confirmations):

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/prov-architect.js --render-scaffold --file <scaffold.json>
```

Delete the drafts file once handed off.

### Step 6 — next steps, ranked

Map mode:

1. **Developers connect each bound repo** (code plugin `/login` + `/configure`, first push) —
   the app boards fill from code; then `/author-intent` on the first app.
2. **Add the next system later** → `/new-app` (the standing next step).
3. **Watch the estate** → `/hub`.

Found mode:

1. **Graduate the first real system** → `/new-app <name>` (fix archetype to an app archetype →
   `convert_node_to_app` → L1 sketch + founding intent).
2. **Keep shaping the strategic landscape** → `/board`.
3. **Watch the estate** → `/hub`.

If the architect walks away mid-setup: the scaffold sits uncommitted in their working copy —
`discard_write_session` unwinds it (landscape + boards), but it reverts the WHOLE session,
app-made changes included: confirm with the named boards + counts from `get_write_session`
first, and render `{reverted, conflicted, skipped}` honestly.

## Failure branches

- Tools missing / connection errors → `ProvenMap not configured — run /login (browser) or /configure (manual) first`
- 401 → `Your ProvenMap architect token was rejected — run /login to reconnect`
- Write tools absent → read-only token: run the fork + interview, emit the plan as markdown, and
  name the `read_write` requirement.
