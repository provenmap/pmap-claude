---
name: landscape-modeling
description: How to model an org's digital estate on the ProvenMap root landscape — the inception doctrine, archetype selection, and the binding handoff. Use when bootstrapping an empty workspace (/setup-workspace), placing a new system (/new-app), or editing the root landscape in a /board session. Key capabilities: the modelling doctrine (model what exists, one node per system), app archetypes as the bindability lever, domain-group containers, the L0 granularity budget, the binding-handoff checklist, skill-profiles-start-empty truth.
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
- The interview is *a few short questions, not a form* — stop as soon as you can name the apps.
  Do not interrogate.

## Archetype selection — the bindability lever

Call `get_archetypes` first; never guess names. Archetype choice is **how a node becomes
app-bindable**: the app-group archetypes carry the catalogue type the platform derives the
repo's scope from (`create_nodes` has no separate field for it).

- **Repo-backed systems** get an app archetype matching the repo's scope: `web-app`,
  `backend-app`, `mono-repo`, `microservice-app`, `mobile-app`, `desktop-app`, `device-app`,
  `worker-app`, `gateway-app`, `integration-app`, `library-app`, `function-app`, `infra-app`,
  `data-app`, `agent-app`, `custom-app`.
- **Repo-less systems** get a system archetype from the catalogue (generic system, service,
  frontend app); SaaS and third parties get the external-integration archetype; people and
  user types get the actor archetype.
- **Grouping containers** come from the domain-group family (security zone, data platform,
  external integrations, infrastructure group, messaging group, …) — use them only where
  the org's zones are real. Containment guidance is advisory; the server enforces only
  "parent must be a container".

## Drawing the landscape

Root board only. Order per the diagram contract (board-reading): containers first → nodes (ONE
`create_nodes` call) → edges (ONE `create_edges` call — an edge wherever two systems actually
connect: sync calls, async messages, data flows, dependencies). **L0 budget: 10–30 nodes** —
shared platforms worth showing, not every server. Pre-flight the payload before any write:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/prov-architect.js --validate diagram --file <payload.json> [--known-slugs <existing,slugs>]
```

Confirmation posture (the platform's own): present the plan as a table (system, archetype,
container, repo?), get **one** conversational go-ahead, then proceed through the batch without
re-asking per call. The whole scaffold gathers in the working copy, so walking away mid-setup
is recoverable — but discard reverts the WHOLE session (app-made changes included): confirm
with the named boards + counts first (architect-core).

## App boards and the nesting rule

`create_board(ownerNodeSlug, newBoardSlug, name)` per repo-backed node — it creates the board
AND points the landscape node at it as its drill-down. The board is born **EMPTY**. Over MCP,
`create_board` works for **root-board nodes only**.

**App-nesting rule:** a governing repo can never bind to a board with an app board anywhere
above or below it. So repo-backed slots live on the root landscape; a layer under an app board
is permanently a plain layer; and "extract this component into its own service" means a new
landscape node + board (+ re-wiring intents), never bind-in-place. Relay the server's refusal
verbatim if it fires.

## Completing the binding — `convert_node_to_app`

A repo-backed slot completes **in-session**: `convert_node_to_app {nodeSlug, branch}` turns a
root-landscape node into an app in one act — ensures its layer board, registers the
code-plugin source, binds it GOVERNING on the branch. Rules:

- The node's **archetype must be app-bindable** (an app archetype — that's what sets the repo
  scope). A generic-system node refuses; fix the archetype first.
- **Pre-check eligibility** with `--classify-tree` (bind-eligibility column) before offering
  it; if the server still refuses (app-nesting rule), relay the refusal verbatim.
- **Credentials are never issued here** — the tool deliberately returns none. The developer
  connects the repository with the code plugin (`/login` + `/configure` against the layer
  board) and makes the first push.
- Advisory documents attach with `bind_reference_source {workBoardSlug, title, type, url|content}`
  — a reference binding, exempt from the nesting rule, and enough to author intents.

## The handoff checklist

Whether bindings were completed in-session or deferred, close the scaffold with the
deterministic checklist (converted nodes become confirmations; deferred repos become the
developer to-do):

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/prov-architect.js --render-scaffold --file <scaffold.json>
```

The scaffold JSON: `{ workspaceName?, boards[{slug,name,ownerNodeSlug}],
reposToBind[{repo,boardSlug,role,branch}], notes[] }`. Print the output verbatim. One truth it
carries that must never be softened: **skill profiles start EMPTY** — nothing is auto-seeded
by binding; skills are composed in the platform's skill storefront afterwards. (The platform's
own inception prompt claims a recipe seeds the profile — that is drift; do not repeat it.)

## Deliberate divergence: the /new-app L1 sketch

The wizard's "never draw inside an app board" guards scaffold handoffs, where developer pushes
supply the truth. `/new-app` is different: the system is being *planned*, there is no code yet,
and the architect's target sketch is the point. Drawing the L1 skeleton there is deliberate —
narrate the reconciliation truth: when the repo binds and pushes, analysis reconciles against
the sketch, and intents appear where reality disagrees.
