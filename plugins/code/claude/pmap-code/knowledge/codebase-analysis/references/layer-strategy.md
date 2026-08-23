# Board Layer Strategy Reference

## Overview

Large codebases are analyzed progressively using layered boards. Each board represents a scope of analysis with appropriate granularity.

## Board Root and Domain Grouping (All Layers)

The board itself is always the root container. Do not create a single all-encompassing domain_group that wraps every other node. However, **multiple domain_group nodes for logical grouping ARE expected**.

**DON'T** — one wrapper around everything: `{ "slug": "my-project", "type": "domain_group" }` with all nodes as children.
**DON'T** — everything flat with no grouping at all.
**DO** — create domain groups based on natural boundaries (e.g., "Backend Services", "Frontend", "External Integrations") sitting directly on the board (no `parentSlug`), with child components nested inside via `parentSlug`.

See `references/archetype-rules.md` → "Board Root and Domain Grouping" for full Do/Don't examples.

## Container vs. Drill-down Nodes (Critical — All Layers)

**A node must NEVER be both a container (with visible children) AND a drill-down target (with `layerBoardSlug`).**

- **Drill-down node** (`layerBoardSlug` set): Opaque — no other node on this board has `parentSlug` pointing to it. Its internals live on the child board.
- **Container node** (other nodes have `parentSlug` pointing to it): Groups visible children on the current board. Must NOT have `layerBoardSlug`.

If you need both grouping AND drill-down for a subsystem, choose drill-down. The child board can use its own containers for internal grouping.

### Why this matters

When a domain_group container has visible children AND drills down, the children appear on both the parent board and the child board — duplicating nodes across layers.

### What decides the grouping

Not node count — **coupling**. `pmap-prepass --group-plan` computes candidate groups from the
import graph and returns, per group, its `cohesion` (how much of its coupling stays inside),
`density` (how interconnected its members are), `folderAgreement` (how far it matches a
directory), and a verdict:

| verdict | meaning |
| --- | --- |
| `container` | one `domain_group` holding these members |
| `drill-down` | too interconnected to read flat — opaque node + `layerBoardSlug` |
| `dissolve` | members lean outward more than they cohere — place them individually |

`parents[]` proposes **containers inside containers** (sibling groups sharing an ancestor,
sparse enough between them to stay readable). `roles[]` says which nodes belong at board root
and why — `cross-cutting` (serves several groups), `boundary` (an adapter facing out of scope),
or `isolated`/`no-group` (no evidence; your judgment).

Asked for a layer (`--layer <n>`), the plan also plans against that layer's node band and
reports `predictedNodeCount` (clustered candidates **plus** board-root candidates), `layerBand`,
and `budgetVerdict` (`fits` | `over-band` | `under-band`). An over-band plan escalates the
largest eligible cluster to `drill-down` and says so in that cluster's evidence —
`escalated: plan would hold <N> nodes vs band high <H>` — and where a recursive pass finds real
sub-structure inside it, those sub-groups arrive as `subClusters` (ready-made groups for the
child board).

A board of 20 uncoupled nodes needs no containers; a board of 6 tightly-coupled ones may need
two. The plan proposes, you name and may override — record an override the topology cannot
justify by starting the container's description with `Grouping rationale:`.

### Grouping floor and ceiling

Node count does not tell you *how* to group — the clusters come from coupling, not from a
count. But node count is a hard **floor and ceiling** pair, and drill-down nodes
(`layerBoardSlug` set) are exempt from both counts — their detail lives on a child board:

- **Floor (enforced):** a board with more than 8 non-drill-down nodes must have at least one
  `domain_group` with at least one node nested under it. A flat L0 landscape of pure
  drill-down systems is a legal shape. `--board-report`, `--validate` and `/sync` all enforce
  this (exit 3).
- **Ceiling (A-CONTAINER-CEILING, L0/L1 only, advisory):** a container with more than 8
  inline (non-drill-down) children is one layer's detail drawn on this board. Default to
  making it an opaque drill-down node (set `layerBoardSlug`, move the children to the child
  board) or splitting it; keeping it inline is allowed with a `Drill-down rationale: …` line
  in its description — the board report lists every recorded override so the user sees the
  judgment call before `/sync`. This **warns, it does not fail the board**: at L0 the
  ceiling, the >8-node grouping floor and the 30-file broad-claim limit all press at once,
  and drill-down is the single move that satisfies all three — so reach for it first rather
  than carving nodes to fit.

Group by coupling; never leave a board over 8 non-drill-down nodes flat, and never let one
container hold a whole layer inline without saying why.

## Board Grain — decided per board, not from the depth number

The ladder below is the **vocabulary** (what each layer answers and how many nodes it is
budgeted for). What a *given* board looks like is decided by that board's own group plan.

**Scope: banded layer plans only** (`budgetVerdict` non-null, layer ≥ 1). A plan whose
`budgetVerdict` is `null` — the `--layer 0` re-grain, or a plan run without `--layer` — is
**not** terminal and is outside this rule entirely: L0's grain is fixed by the L0 — System
Context definition below, and any other board should be re-planned with its own `--layer`
before its grain is decided.

- **Container-grade** — the plan proposes drill-downs (any `drill-down` verdict, or a cluster
  whose evidence carries `escalated: plan would hold <N> nodes vs band high <H>`) **or**
  `budgetVerdict` is `over-band`. Its nodes are containers, deployable-internal modules and
  **opaque drill-downs**. Component-grade types (`service_component`, `controller_component`,
  `repository_component`, `ui_component`, `page_component`, `layout_component`, …) are the
  smell: when they would be more than half such a board's nodes, the layer being authored is
  the one below the one that was asked for — consume `subClusters`/escalations and plan
  drill-downs instead.
- **Terminal** — the plan proposes no drill-downs and `budgetVerdict` is `fits` (or
  `under-band`). Component-grade nodes are correct here **at any depth**: a small subtree's L1
  legitimately reads like a component diagram, and forcing container grain onto it invents
  empty pass-through layers.
- **An escalated cluster carrying no `subClusters`** is a domain-boundary judgment call, not a
  defect — the recursive pass re-seeds from directories and cannot see the internal boundaries
  of a folder-hostile blob. Split it into nameable drill-downs/containers from its member list
  and the skeleton digest (paths, names, types — no file reads), or keep it as ONE opaque
  drill-down. Never inline its members flat.
- `predictedNodeCount` is a **candidate** count, not a promise: folding or omitting root-level
  files while authoring is legitimate, and the verdict is still the signal to plan against.

The board's description records the chosen nature in one sentence — container-grade with N
drill-downs, or terminal.

### Root hygiene (L1+)

A loose leaf at board root joins a container, becomes a drill-down, or the board's description
records why it is a genuine singleton — bootstrap/app-module wiring is the legitimate class.
Board-root candidates count toward `predictedNodeCount`, so a board that hoards them reads
over-band for a reason.

## Layer Definitions

The node targets below are **budgets, not grain mandates** — they say how many nodes a layer
can carry, while the board's own group plan says whether it is container-grade or terminal
(see "Board Grain" above).

### L0 — System Context

- **Scope**: This system's own deployables, plus the externally-evidenced systems they talk to (C4 System Context)
- **Target**: 10-30 nodes
- **Node types**: This repo's deployables (as opaque drill-down nodes) at the center, externally-evidenced systems (databases, third-party APIs/SaaS, providers) around them. Use domain_group containers only for small clusters that won't drill down.
- **When**: Default analysis, first run

#### Building the L0 System Context

Build a C4 System Context, not an inventory. The board answers one question: _what is this
system, and what does it talk to?_ Keep to 10-30 nodes, in two rings:

- **Center — this system's own deployables.** The apps, services and workers this repo
  ships, at the grain the `--group-plan --layer 0` plan used (declared workspaces, or
  top-level directories in a single-package repo). One node per thing that ships and can
  fail on its own — not one per folder.
- **Around them — externally-evidenced systems.** Databases, third-party APIs/SaaS, queues,
  auth/payment/email/observability providers. The evidence is deterministic and already in
  front of you: the digest's `stacks.dependencies[]`, the `infra` classification (a
  `migration`, `terraform`, `kubernetes` or `serverless` file names the datastore or
  platform it provisions), and the skeleton's `externalImports` accounting. Add a system
  only where there is evidence for it; never populate this ring from guesswork about a
  typical stack.
- **Lean and flat.** Every internal node with internals worth seeing is an **opaque
  drill-down** (`layerBoardSlug`) into its L1 container board — not a container with
  children here. A flat L0 of drill-down systems plus their external neighbours is the
  intended shape, and drill-down nodes are exempt from the grouping floor.

**`dependencies[]` is the external-system evidence.** A vendor SDK there (payments, auth,
email, observability, search, feature flags) is a third party this codebase talks to, and
that is what an `external_system` node is for. Read the list and decide; do **not** guess
vendor names and grep the tree for each one — anything you failed to guess stays invisible,
and the list already names them all. Grep only to find *where* a dependency you selected is
used, once you have chosen it. Caveat: the list is parsed from `package.json`
`dependencies` only — for a non-JS workspace, or for a service reached over plain HTTP with
no SDK, you still read code to find it.

**Drill-down is the default at L0, not a garnish.** An analysed node may claim at most 29
files, and L0 is capped at 10-30 nodes — so a repo of any size cannot be covered by
analysed L0 nodes alone. Any node that would claim 30 or more files gets `layerBoardSlug`
(a proposed child-board slug); a drill-down node has no file limit and defers its detail to
that board. Splitting a 200-file domain into seven 29-file L0 nodes is the wrong repair —
it blows the node budget and creates an edge hairball. Reach for splitting only when a node
is modestly over and genuinely holds two concerns.

**L0 targets significance, not exhaustiveness.** Coverage is satisfied when every file is
claimed by _some_ node — and a container may claim its whole subtree via `coveredFiles` and
defer the detail to a child board (`layerBoardSlug`). Do NOT generate an L0 node per
leftover directory just to claim its files; fold small leftovers into the nearest
significant container and let the drill-down carry the detail. More L0 nodes means more
rolled-up L0 edges — breadth here is what creates hairballs.

### L1 — Domain Drill-down

- **Scope**: Single domain, workspace, or major service
- **Target**: 10-40 nodes per board
- **Node types**: Services, controllers, modules within the domain
- **Grouping**: From the grouping plan's clusters, parents and root-level roles (see above). Same container vs. drill-down rule applies — if an L1 node drills to L2, it must be opaque.
- **When**: User drills into an L0 node

### L2 — Component Drill-down

- **Scope**: Single service or module
- **Target**: 5-20 nodes per board
- **Node types**: Individual classes, handlers, internal modules
- **Grouping**: From the grouping plan. A small board with real coupling still earns containers; a large uncoupled one does not.
- **When**: User drills into an L1 node

### L3 — Detail (opt-in)

- **Scope**: Deep internals of a single component
- **Target**: 5-15 nodes per board
- **Node types**: Methods, internal flows, data transformations
- **When**: User explicitly requests deep analysis

## File Organization

```
.provenmap/boards/
  manifest.json                      # Master index of all boards
  my-project-overview.json           # L0 analysis
  my-project-auth-domain.json        # L1 analysis
  my-project-auth-user-service.json  # L2 analysis
  stores/
    my-project-overview.store.json   # L0 sync state
    my-project-auth-domain.store.json # L1 sync state
```

## Drill-Down Candidates

The group plan is the primary trigger: a cluster with `verdict: "drill-down"`, or one the
layer band escalated (`escalated: …` in its evidence). The heuristics below cover what the
plan cannot see:

1. It represents a domain/service with 5+ internal source files
2. It contains sub-domains or distinct internal modules
3. The current layer's granularity hides important internal architecture

Mark candidates by:

- Setting `layerBoardSlug` on the node
- Adding the node slug to `drillDownNodes` in the analysis output

## Board Slug Resolution

Board slugs are resolved from the server whenever possible:

1. **L0 (root board)**: Read from config `boardSlug` field (set during `/configure`). This is the root board slug created in the ProvenMap UI.
2. **L1+ (child boards)**: Check the server board map (fetched via `pmap-boards.js`):
   - If a child board exists on the server for this parent board + parent node → use the server's slug
   - If no match → generate locally as `<parent-slug>--<node-slug>` (will be created on the server during `/sync`)

### Slug Format for Locally Generated Slugs

```
<parent-board-slug>--<node-slug>
```

Examples:

- L0: `root` (from server/config — not generated locally)
- L1: `root--auth-domain`, `root--payments-domain`
- L2: `root--auth-domain--user-service`

## Manifest Structure

The manifest at `.provenmap/boards/manifest.json` tracks all boards:

```json
{
  "version": 2,
  "projectName": "my-app",
  "updatedAt": "ISO-timestamp",
  "boards": {
    "my-app-overview": {
      "boardSlug": "my-app-overview",
      "name": "My App Overview",
      "layer": 0,
      "parentBoardSlug": null,
      "parentNodeSlug": null,
      "analysisFile": ".provenmap/boards/my-app-overview.json",
      "storeFile": ".provenmap/boards/stores/my-app-overview.store.json",
      "lastAnalyzedAt": "ISO-timestamp",
      "lastSyncedAt": null,
      "nodeCount": 15,
      "edgeCount": 22
    }
  }
}
```
