---
category: author
description: "Author · WRITE-CAPABLE: Bootstrap an empty workspace — map the estate that exists, or found a new product line: interview, system landscape, app boards or strategic-only scaffold, binding handoff"
allowed-tools: Read, AskUserQuestion, Bash(node:*), mcp__plugin_pmap-architect_provenmap__*
---

The top of the funnel: a ready-but-empty workspace and an architect who either knows the org or
is founding something new. Fork first, interview briefly, draw the landscape on the root board,
then — map mode — generate app boards and hand off bindings, or — found mode — stop at the
strategic level and name the graduation path. Doctrine, archetype selection, both divergences,
and the checklist contract live in
[`${CLAUDE_PLUGIN_ROOT}/knowledge/landscape-modeling/SKILL.md`](../knowledge/landscape-modeling/SKILL.md) — read it
plus [`${CLAUDE_PLUGIN_ROOT}/knowledge/architect-core/SKILL.md`](../knowledge/architect-core/SKILL.md) and
[`${CLAUDE_PLUGIN_ROOT}/knowledge/board-reading/SKILL.md`](../knowledge/board-reading/SKILL.md). Glyphs elsewhere
follow architect-core's formatting norms; step banners come from the interview spine below, not
hand-written.

## Workflow

At each step change, render the banner with:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-architect.js --spine setup-workspace --step <n> [--interview-mode map|found] [--banked '<json>']
```

`<n>` is this step's number (3.5 for the styling step). Add `--interview-mode map|found` once
Step 2's fork is answered, and `--banked` with a flat JSON object of the name/value facts
captured so far. Print the result **verbatim** in place of the `**Step N/M — <name>**` banner —
do not reformat, reorder, or summarise.

### Step 1 — detect the state

`get_board_tree('root')` + `get_workboard_details('root')` + `list_source_bindings('root')` —
and `get_write_session`: if the working copy already holds uncommitted changes, surface them
(boards + counts) and ask — continue (this flow's commit would carry them too) or pause for the
architect to decide the pending work first (architect-core).

- **Empty root** (0 nodes/edges, ≤1 top-level board, no bindings) → full interview, starting at
  the fork.
- **Sparse root, no code-plugin binding anywhere yet** → _continue_ mode: extend what exists,
  don't restart (keep the mode the scaffold drafts file recorded; ask the fork only if no
  drafts file exists).
- **Populated or bound** → this command's window has closed: route to `/board` (landscape mode)
  or `/new-app` and say why — after the first repo binds, additions go one system at a time.

### Step 2 — the fork, the source gate, then the interview (ELICIT)

**The fork** (AskUserQuestion, the first interview move): _"Are we mapping an estate that
exists, or founding something new?"_

**The source gate (map mode only, before any estate question)** — AskUserQuestion,
multi-select, mixing is normal: **describe it in conversation** · **scan repo folders** ·
**share documents** (landscape-modeling has the full contract). For scan: the architect names
the paths, then

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-architect.js --scan-repos --paths <p1,p2,...>
```

and the output becomes interview _candidates_ presented for confirm/rename/drop — never
conclusions; relay `skipped[]` and `truncated` honestly. **Never touch the filesystem, git
state, or any repository unprompted.** Record the gate choice and any scan inventory in the
drafts file — a resumed interview neither re-asks nor re-scans.

- **Map what exists** (map mode) — the org interview: what the org does (one line — becomes the
  root board description via `apply_diagram_info`); the systems that exist today, each with an
  explicit **kind** — `repo` (own repository + scope: web, backend, mono-repo, worker…) /
  `new-app` (being built now, will have its own repository + scope) / `no-repo` (existing, no
  repository) / `SaaS` (third-party integration) / `planned` (decided, nobody building it yet);
  the infra worth showing at L0; actors/user types; real zones for grouping.
  **Nothing defaults to repo-backed** — batch ONE follow-up question for unclassified systems.
  For anything not yet real, the deciding question is **"will it have its own repository?"** —
  yes ⇒ `new-app` (binds in-session), no ⇒ `planned` (graduates later). Never invent a system.
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

`get_archetypes` first. Present the plan: a fenced ASCII sketch of the landscape first
(containers as boxes, systems inside with kind chips, arrows for the main edges — the L0
budget keeps it readable), then the table (system, kind, archetype, container, repo/scope) —
**one go-ahead, then the batch without re-asking** (AskUserQuestion for the go-ahead). Then: validate
the payload (`--validate diagram`) → containers, then ONE `create_nodes` call, then ONE
`create_edges` call — every write joins the working copy automatically.

- Map mode: `repo` **and `new-app`** systems get **app archetypes** (that's what makes them
  bindable — a repository that does not exist yet still gets one); `no-repo` get system
  archetypes; `SaaS` gets the external-integration archetype; `planned` gets a system archetype
  + the graduation-path narration (found-mode treatment — landscape-modeling).
- Found mode: **system archetypes only** — a planned system is not yet bindable; the plan
  table's kind column reads `planned`. Narrate the founding truth: _"this is target state —
  systems graduate as they become real."_

### Step 3.5 — style the landscape (board-styling skill)

The landscape commits styled, not raw. Read
[`${CLAUDE_PLUGIN_ROOT}/knowledge/board-styling/SKILL.md`](../knowledge/board-styling/SKILL.md) and run its pipeline
on the board
you just drew: `--style-signals --board <slug>` → author the plan (this is a fresh board — style
everything; root landscape doctrine: C4-shaped, externals xs, flow/horizontal unless the signals
argue otherwise) → `--validate styles` → the three `apply_*` calls. Everything joins the same
working copy as the nodes and edges — one commit ships structure and styling together.

If validation fails twice, skip styling (say so) and continue to Step 4; the architect can run
/style-board later.

### Step 4 — generate app boards (APP BOARDS — map mode only)

`create_board(ownerNodeSlug, newBoardSlug, name)` per `repo`- and `new-app`-kind node (both are
repo-backed; a repository that does not exist yet still gets its board). Born empty — **never
draw inside**: content arrives from developer pushes. If the response carries a server-built
`viewUrl`, print `🔗 View board: <url>`; absent or null → skip silently.

Found mode: **skipped entirely** — no app boards, no bindings. Say why: the workspace stays at
the strategic level; boards arrive at graduation (landscape-modeling's graduation path).

### Step 5 — commit the scaffold, complete the bindings (or hand off)

The closing move (architect-core): `preview_write_session_commit` → present the plan → ask for
title/summary (AskUserQuestion) → `commit_write_session` → narrate what was generated, printing
`🔗 View board: <url>` for any board whose tool response carried a server-built `viewUrl` —
top-level on `create_board`/`convert_node_to_app`, but `result.intents[].viewUrl` (one per minted
intent, each pointing at that intent's root board, none when the commit mints no intent) on the
commit itself, so print one line per distinct url, not one per intent. Skip silently when absent.
Then:

- **Map mode:** per repo-backed node — `repo` **and `new-app` alike, never only the `repo`
  ones** — offer to complete the binding **in-session**:
  `convert_node_to_app {nodeSlug, branch, observationType}` (landscape-modeling has the rules —
  eligibility pre-check, archetype requirement, credentials never issued here).
  `observationType` follows the kind, with no re-asking: `'existing_app'` for `repo`, `'new_app'`
  for `new-app` (its branch is the one the first push will use — a repository that is empty or
  not yet created is still `'new_app'`). Every `'new_app'` conversion routes into build prep —
  offer prep-now inline (app-readiness skill) for a lone graduation, else name
  `/prepare-app <board>`. Repos the architect defers stay on the checklist.
- **Found mode:** no binding offers — the checklist carries the graduation path instead of
  repos-to-bind.

Render the checklist and print **verbatim** (converted nodes read as confirmations):

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-architect.js --render-scaffold --file <scaffold.json>
```

Delete the drafts file once handed off.

### Step 6 — next steps, ranked

Map mode:

1. **Developers connect each bound repo** (code plugin `/login` + `/configure`, first push) —
   the app boards fill from code; then `/author-intent` on the first app.
2. **Prep any `new_app` conversion for building** → `/prepare-app <board>` (spec intents +
   skills; the attention queue lists them until prepped).
3. **Add the next system later** → `/new-app` (the standing next step).
4. **Watch the estate** → `/hub`.

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
