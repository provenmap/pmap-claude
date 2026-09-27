---
name: landscape-modeling
description: How to model an org's digital estate on the ProvenMap root landscape — the inception doctrine, archetype selection, and the binding handoff. Use when bootstrapping an empty workspace (/setup-workspace), placing a new system (/new-app), or editing the root landscape in a /board session. Key capabilities: the modelling doctrine (model what exists, one node per system), the source gate and shallow repo scan (--scan-repos), the Aspire AppHost landscape proposal, per-system kinds, app archetypes as the bindability lever, domain-group containers, the L0 granularity budget, the binding-handoff checklist, skill-profiles-start-empty truth, the /setup-workspace interview agendas and plan sketch, the /new-app grill agenda and binding gate. Covers both map mode (model what exists) and found mode (founding landscape for a new product line — strategic-only, graduation path).
---

# Landscape Modeling

<!-- Distilled from platform's inception mode and archetype seeds:
     services/prompts/modes/inception/inception.prompt.ts (doctrine, workflow,
     approvals posture — rules carried verbatim where quoted),
     seeds/data/archetypes/app-archetypes-seed-data.ts (the app archetype group),
     .docs/core-concepts/board-tree.md (app-nesting rule),
     .docs/getting-started/quick-start.md. One deliberate divergence is
     documented at the bottom. -->

## The doctrine (inception rules, carried verbatim)

- **Model what EXISTS, not what could.** A small honest landscape beats an aspirational one.
- **One node per system.**
- Only a node with a real repository gets an app board. A system with no repo is just a node on
  the landscape.
- **Never draw inside a bound app board.** Its nodes, edges and aspects arrive from the
  developer's first push; anything you draw there is a claim the plugin would have to reconcile
  against reality.
- If the architect is vague about a system, **ask — never invent a service to fill out the
  diagram**.
- **Estate facts come from the architect, never from ambient exploration.** Never touch the
  filesystem, git state, or any repository unprompted — no listing directories "to get
  oriented". Scanning is a gated offer (the source gate below): only via `--scan-repos`, only
  on architect-given paths. Scan output is interview *candidates* the architect confirms,
  renames, or drops — never conclusions.
- The interview is *a few short questions, not a form* — stop as soon as you can name the apps.
  Do not interrogate.

## The source gate and the shallow scan (map mode)

Before any estate question, ask how the architect wants to convey the estate
(AskUserQuestion, multi-select — mixing is normal): **describe in conversation** · **scan
repo folders** (they name the paths) · **share documents** (read in-session). Record the
choice — and any scan inventory — in the drafts file (architect-core): a resumed interview
neither re-asks the gate nor re-scans. Found mode skips the gate (nothing exists to scan);
a real repo named mid-interview may still get the scan offer (per-answer fork, below).

The scan is shallow by design — identity facts only, depth 1, never recursive — with one
bounded exception: it looks for .NET Aspire AppHost projects (below).

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-architect.js --scan-repos --paths <p1,p2,...>
```

Each candidate carries `{path, dirName, isGitRepo, gitRemote, manifestKind, manifestName,
readmeTitle, monorepoHint}`; the result carries `skipped[]` and `truncated` (the 200-entry
cap is always reported — relay it, never hide it), plus `appHosts[]` and `walkTruncated[]`.
Deep analysis stays the code plugin's job after binding. Your job on the output is judgment:
dedupe, propose system names, kinds, and repo scopes, and feed the confirmation table — scan
output never bypasses the interview.

## An Aspire AppHost: the landscape is already written

An AppHost (`AddProject`, `AddPostgres`, `WithReference`, …) is the runtime topology as code.
When the scan reports `appHosts[]`, the landscape comes from it — not from READMEs, and not
from asking the architect to list systems the code already names. Several AppHosts → ask which
one describes this estate. `walkTruncated[]` names repos the bounded csproj walk could not
finish — relay it: an AppHost deeper than the bound was not seen.

Each AppHost carries its `resources[]`, `references[]`, `unresolved[]` and a `proposal`:

- **`proposal.diagram`** is a ready `create_nodes` + `create_edges` payload for `root`: one
  node per resource (slug = resource name), projects on app archetypes named after their
  csproj, databases inside their server container, one edge per `WithReference` or YARP
  route. `WaitFor` rides its edge as a start-order note; a wait-only pair is never an edge.
  Write it to a file and pre-flight it with `--validate diagram` like any payload.
- **Archetypes are proposals.** Check each against `get_archetypes`; a missing one falls back
  to `data_store` (stores, brokers) or `infrastructure_component` (anything else), and a
  project keeps SOME app archetype — the architect may pick a better one (`backend-app`, …).
- **`conditional` tags** mark resources and edges the AppHost adds only inside an if-block
  (Foundry/Ollama behind a flag). Name them in the plan; the architect keeps or drops each —
  never drop one silently.
- **`omitted[]`** lists what was left off and why (a deployment environment, model deployments
  folded into their AI service, wait-only pairs); relay it in one line.
- **`unresolved[]`** lists calls the reader could not follow (a helper from a package, a
  reference to something it could not resolve), each with file and line. Relay every one and
  ask; never fill a gap with a guess.
- **`proposal.apps[]`** gives each project node's repo match: `matched` (its csproj is in a
  scanned repo; `alsoIn` names the AppHost's own monorepo copy it was preferred over),
  `ambiguous` (ask which repo), `unmatched` (ask: a repo elsewhere, or no repo). Matched is
  the `repo` kind — the architect confirms, never re-classifies from scratch.
- **`proposal.repos[]`** groups project nodes per repo. **One repo binds one app board**: a
  repo with one node slug makes that node its app; a repo several project nodes share (the
  monorepo) → ask which node, if any, it binds to — the rest stay plain nodes, still on app
  archetypes so they can bind once split out.

- **`proposal.boundaryRules[]`** freezes today's data ownership: one `only` rule per database
  the AppHost wires, its referencing projects as the owners (eShop: only `ordering-api` and
  `order-processor` reach `orderingdb`). Each row is a ready `author_boundary_rules` row for
  `root`. Offer them once, after the landscape is drawn (AskUserQuestion, multi-select, each
  named by its sentence); declare the chosen ones, never the rest. A shared store is a finding
  in itself — say so when a rule has more than one owner. The server proves root rules against
  the root's edges, so each shows holds or violated as soon as it lands.

The interview shrinks to what the AppHost cannot know: the one-line opener, actors, systems
outside it (external SaaS, legacy estates), zones. The plan sketch and the confirmation table
are drawn from the proposal; one go-ahead covers the batch as always.

**Binding each service repo.** A repo whose `boundBoardSlug` is set was bound before the
landscape existed: its app board is that board. When app boards are generated, adopt it with
`create_board {ownerNodeSlug: <node>, newBoardSlug: <boundBoardSlug>, name}` — it re-parents an
ownerless board intact (relay a refusal verbatim if another node owns it) — and do **not**
`convert_node_to_app` that node: the repo's binding already governs the adopted board. Every
other confirmed app node completes as usual (`convert_node_to_app`, `observationType:
'existing_app'`). Tell the
developers each remaining service repo binds to its own root node at the code plugin's
`/login` — the board picker offers convertible root nodes — so every repo shares the one slug
the AppHost gave it.

## Archetype selection — the bindability lever

Call `get_archetypes` first; never guess names. Archetype choice is **how a node becomes
app-bindable**: the app-group archetypes carry the catalogue type the platform derives the
repo's scope from (`create_nodes` has no separate field for it).

Every named system gets an explicit **kind** — nothing defaults to repo-backed; batch ONE
follow-up question for systems the architect didn't classify:

| Kind | Archetype | App board? |
|---|---|---|
| `repo` — existing, own repository | app archetype matching the repo scope | yes — binds `existing_app` |
| `new-app` — being built now, will have its own repository | app archetype matching the repo scope | yes — binds `new_app` |
| `no-repo` — existing, no repository | system archetype | no — just a node |
| `SaaS` — third-party integration | external-integration archetype | no |
| `planned` — decided, nobody building it yet | system archetype + graduation-path narration | no — graduates via `/new-app` |

**The lever between `new-app` and `planned` is "will it have its own repository", NOT "does its
code exist yet".** A system being built right now is `new-app`: it gets an app archetype, a
board, and a `new_app` binding that waits on the first push — that is what routes it into build
prep. Only a system nobody is building yet is `planned`. Ask that question directly for anything
not yet real; the two kinds are the interview's mirror of the server's two observation types.

**While you have them answering: ownership.** An archetype declares a field contract, and the
half of it nobody else can supply — `owner`, `stage`, `status`, `criticality` — is exactly what an
architect knows and a codebase never will. When you are already batching the kind question, add
owner and stage for the systems being placed, and write them onto each node's `attributes` map in
the same `create_nodes` call. Two or three evidenced fields, not a questionnaire, and never a
guess — an invented owner is worse than an empty cell. Contract, tiers and merge semantics:
`${CLAUDE_PLUGIN_ROOT}/knowledge/board-reading/references/archetype-attributes.md`.

- **Repo-backed systems** (`repo` and `new-app` alike) get an app archetype matching the repo's
  scope: `web-app`,
  `backend-app`, `mono-repo`, `microservice-app`, `mobile-app`, `desktop-app`, `device-app`,
  `worker-app`, `gateway-app`, `integration-app`, `library-app`, `function-app`, `infra-app`,
  `data-app`, `agent-app`, `custom-app`.
- **Repo-less systems** get a system archetype from the catalogue (generic system, service,
  frontend app); SaaS and third parties get the external-integration archetype; people and
  user types get the actor archetype.
- **Grouping containers** come from the domain-group family (security zone, data platform,
  external integrations, infrastructure group, messaging group, …) — use them only where
  the org's zones are real. A zone is real when its members relate to each other more than
  to the rest of the estate; a box drawn around systems that never touch is a label, and it
  makes the landscape read as arbitrary. On an existing board, stop guessing and measure:
  `pmap-architect.js --group-plan --board <slug>` reports each zone's cohesion, the elements
  that belong at root level (cross-cutting or boundary), zones that have outgrown one board,
  and the drift from the current containment. A zone you keep for a non-topological reason
  (vendor cohort, compliance boundary, org chart) is legitimate — start its description with
  `Grouping rationale:` so the record carries the reason and the gate stands down.
  The server still enforces only "parent must be a container"; the structural gates
  (`--validate diagram`) now also refuse an edge between a node and its own container.

## Drawing the landscape

Root board only. Order per the diagram contract (board-reading): containers first → nodes (ONE
`create_nodes` call) → edges (ONE `create_edges` call — an edge wherever two systems actually
connect: sync calls, async messages, data flows, dependencies). **L0 budget: 10–30 nodes** —
shared platforms worth showing, not every server. Pre-flight the payload before any write:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-architect.js --validate diagram --file <payload.json> [--known-slugs <existing,slugs>]
```

Confirmation posture (the platform's own): present the plan as a table (system, kind,
archetype, container, repo/scope), get **one** conversational go-ahead, then proceed through the batch without
re-asking per call. The whole scaffold gathers in the working copy, so walking away mid-setup
is recoverable — but discard reverts the WHOLE token session (every board it touched): confirm
with the named boards + counts first (architect-core).

## Reading across systems — the root's folded views

Once the apps have adopted `event.catalog` and `api.clients`, the root reads what passes between
them without anyone drawing it: `get_system_view {workBoardSlug: 'root', view: 'events'}` lines up
every app's copy of each channel and event type, and `view: 'calls'` shows which system's code calls
which, over what, and which endpoint each call reaches. Both are folded from the apps' own rows on
every read; nothing is stored on the root.

Each has three findings worth raising, as an insight whose trail runs through the systems involved:

- **Contract drift** — an event type whose subscriber reads a field no publisher sends, or reads it as
  another type. Name the systems and the fields.
- **A call to a service no node answers to** — the code addresses a name the root does not carry.
  Either the landscape is missing a system, or a node is named differently from the code; propose the
  node or the rename.
- **A call with no drawn edge** — the code depends on a system the diagram doesn't show. Propose the
  edge. Root boundary rules already count these calls as evidence (`client-call`), so a rule can read
  violated before anyone draws the line.

## App boards and the nesting rule

`create_board(ownerNodeSlug, newBoardSlug, name)` per repo-backed node — it creates the board
AND points the landscape node at it as its drill-down. The board is born **EMPTY**. Over MCP,
`create_board` works for **root-board nodes only**. Repo-backed means `repo` **and `new-app`**
alike: a repository that does not exist yet still gets its board, and the content arrives from
the developer's first push.

- **Never pass `type`.** A layer under the root is born a `diagram`; `root-board` is the
  workspace's one home board and the server refuses it.
- **One slug per system, forever.** When the slug already exists, the server tells you which of
  two things it was: a board with **no owning node** (a deleted app, an undone layer) is
  **adopted** back under your node with its contents intact — report that, do not treat it as a
  failure; a board that is **another node's live drill-down** is refused and the owner is named —
  use that node (or ask), never invent a second slug for the same system. Two boards for one
  repo is exactly the corruption this rule prevents.

**App-nesting rule:** a governing repo can never bind to a board with an app board anywhere
above or below it. So repo-backed slots live on the root landscape; a layer under an app board
is permanently a plain layer; and "extract this component into its own service" means a new
landscape node + board (+ re-wiring work items), never bind-in-place. Relay the server's refusal
verbatim if it fires.

## Completing the binding — `convert_node_to_app`

A repo-backed slot completes **in-session**: `convert_node_to_app {nodeSlug, branch, observationType}` turns a
root-landscape node into an app in one act — ensures its layer board, registers the
code-plugin source, binds it GOVERNING on the branch. Rules:

- The node's **archetype must be app-bindable** (an app archetype — that's what sets the repo
  scope). A generic-system node refuses; fix the archetype first.
- **`observationType` is required** — the architect's observation, recorded on the binding. In an
  interview it **follows the kind, with no re-asking**: `'existing_app'` for a `repo` slot (the
  code already exists), `'new_app'` for a `new-app` slot (net-new and still being built — a
  freshly created empty repo, or one not created yet, is still `'new_app'`). Found-mode
  graduations and extractions are `'new_app'` too. Only outside an interview, where no kind was
  captured, is it genuinely ambiguous → ask at the gate: _new app still needing implementation
  planning_ vs _existing app now being connected_. A `'new_app'` conversion routes into
  **build prep** next (the app-readiness
  workflow): prep now in-session when it is the run's lone graduation, else name
  `/prepare-app <board>` per app — the attention queue keeps it listed until prepped.
- **Pre-check eligibility** with `--classify-tree` (bind-eligibility column) before offering
  it; if the server still refuses (app-nesting rule), relay the refusal verbatim.
- **Credentials are never issued here** — the tool deliberately returns none. The developer
  connects the repository with the code plugin (`/login` + `/configure` against the layer
  board) and makes the first push.
- Advisory documents attach with `bind_reference_source {workBoardSlug, title, type, url|content}`
  — a reference binding, exempt from the nesting rule, and enough to author work items.

## The handoff checklist

Whether bindings were completed in-session or deferred, close the scaffold with the
deterministic checklist (converted nodes become confirmations; deferred repos become the
developer to-do):

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-architect.js --render-scaffold --file <scaffold.json>
```

The scaffold JSON: `{ workspaceName?, boards[{slug,name,ownerNodeSlug}],
reposToBind[{repo,boardSlug,role,branch}], notes[] }`. Print the output verbatim. One truth it
carries that must never be softened: **skill profiles start EMPTY** — nothing is auto-seeded
by binding; skills are composed in the platform's skill storefront afterwards. (The platform's
own inception prompt claims a recipe seeds the profile — that is drift; do not repeat it.)

## /setup-workspace: the interview agendas, the plan sketch, the spine banner

The fork at the top of the interview (map or found) picks one of two agendas. Both are *a few
short questions, not a form* (the doctrine above), and both open with the one-line answer that
becomes the root board's `description`. The rest of the agenda's answers become its `mdContent`,
a short markdown narrative: what the org does (or what is being built, and for whom), the
systems and what each owns, the actors, the external services it leans on, the zones. Write
both in ONE `apply_diagram_info` call once the interview closes, from the answers only, nothing
the interview didn't establish. The narrative is what the hub's *About this system* card
shows; a root with only the one-liner gives that card a single line to say.

**Map mode — the org interview:** what the org does (one line); the systems that exist today,
each with an explicit **kind** (the table above — nothing defaults to repo-backed, and the
unclassified are batched into ONE follow-up question); the infra worth showing at L0; actors and
user types; the real zones worth grouping.

**Found mode — the product-line interview:** what is being built and for whom (one line); the
intended systems and what each owns; actors and user types; the external SaaS it will lean on;
the real zones. Stop when the intended systems have names, and never invent beyond what the
architect has decided (the founding-landscape divergence below).

**The plan sketch.** Present the scaffold plan as a fenced ASCII sketch of the landscape first —
containers as boxes, the systems inside them with their kind chips, arrows for the main edges,
with the L0 budget keeping it readable — then the confirmation table (system, kind, archetype,
container, repo/scope). In found mode the table's kind column reads `planned`. One go-ahead
covers the whole batch (the confirmation posture above).

**Resuming, and closing the window.** The scaffold drafts file (architect-core) records the
chosen mode: a *continue*-mode run on a sparse, still-unbound root extends what exists rather
than restarting, and re-asks the fork only when there is no drafts file. Once the root is
populated or anything is bound, `/setup-workspace`'s window has closed — after the first repo
binds, systems are added one at a time through `/new-app`.

**The spine banner.** `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-architect.js --spine setup-workspace
--step <n>` renders each step change; `<n>` is the step number (3.5 for the styling step). Add
`--interview-mode map|found` once the fork is answered, and `--banked '<json>'` with a flat JSON
object of the name/value facts captured so far. Print the result verbatim in place of the
`**Step N/M — <name>**` banner — never reformat, reorder, or summarise.

## /new-app: the grill agenda, the L1 sketch, the binding gate

**The grill agenda** — bounded rounds, worked before any write; ask, never invent:

1. **Purpose** — one sentence.
2. **Placement** — where it sits on the landscape: read the root board's nodes and edges, then
   propose its neighbours for the architect to confirm.
3. **Archetype** — an **app archetype** matching its repo scope if it will have a repo (the
   bindability lever above), else a system archetype.
4. **What it owns** — data, endpoints, events. This is the L1 skeleton.
5. **What it replaces or splits** — the existing nodes that need re-wiring.

Keep the running plan in a drafts file (architect-core) so the pass is resumable.

**The L1 sketch — a deliberate divergence.** The wizard's "never draw inside an app board"
guards scaffold handoffs, where developer pushes supply the truth. `/new-app` is different: the
system is being *planned*, there is no code yet, and the architect's target sketch is the
point. Drawing the L1 skeleton there is deliberate: containers, the key components, and the
edges the grill named — nothing invented to fill the diagram. Narrate the reconciliation truth:
when the repo binds and pushes, analysis reconciles against the sketch, and work items appear
where reality disagrees.

**The board's words.** Once the sketch lands, ONE `apply_diagram_info` on the new board:
`description` is the purpose sentence; `mdContent` narrates the grill (purpose, placement and
neighbours, what it owns, what it replaces or splits). It is what the app hub's *About this
system* card shows.

**The binding gate** closes in-session, without a portal trip. Three outcomes:

- **The system has a repo** → offer `convert_node_to_app {nodeSlug, branch, observationType}`
  under the rules above — `'new_app'` for the system being planned here (a freshly created
  empty repo is still `'new_app'`), `'existing_app'` only when the grill revealed the code
  already exists. Credentials are never issued here; the developer connects the repository
  separately with the code plugin.
- **The planning material is a document** → `bind_reference_source` on the new board — a
  reference binding is enough to author work items against.
- **The architect defers** → the classic narration: _"Intents need a code-bound board — bind
  the repo, then rerun `/author-work-item <board>` and I'll land this draft."_

## Deliberate divergence: the founding landscape (found mode)

`/setup-workspace` runs in one of two modes, forked at the top of the interview:

- **Map mode** (default): the estate exists. Every inception rule above applies unchanged —
  model what EXISTS, never invent a system.
- **Found mode**: a product line being conceived from scratch. Nothing exists yet, so "model
  what exists" would model nothing. The divergence: a **founding landscape** models what
  SHOULD exist — the intended systems as root nodes with **system archetypes** (never app
  archetypes), real zones as containers, **no app boards, no bindings**. The rule becomes:
  **never invent beyond what the architect has decided** — grill, don't fabricate; every node
  traces to an interview answer.

Narrate the truth every time: *"this is target state — systems graduate as they become real."*

**Graduation path** (the standing next step of every founding scaffold): when a system becomes
real → `/new-app`-style pass on its node — fix the archetype to an **app archetype** (that's
the bindability lever above) → `create_board` →
`convert_node_to_app {nodeSlug, branch, observationType: 'new_app'}` → L1 sketch + founding
work item. Mixed estates work naturally: the fork is per-answer, not
exclusive — a real system named during a found-mode interview is drawn as in map mode, and a
**planned** system named during a map-mode interview gets found-mode treatment: system
archetype, no board, graduation path narrated. That treatment is for `planned` only: a
**`new-app`** system named during a map-mode interview is repo-backed and binds in-session as
`new_app` — do not route a system someone is actively building down the graduation path.
