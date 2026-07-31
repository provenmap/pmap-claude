---
category: author
description: "Author · WRITE-CAPABLE: Plan a new system on the existing landscape — grill, place it, sketch its target architecture, draft its founding intent"
argument-hint: "<name or idea>"
allowed-tools: AskUserQuestion, Bash(node:*), mcp__plugin_prov-architect_provenmap__*
---

Architecture-first inception of one system on a landscape that already exists. Grill first, then
build. Load **landscape-modeling** (placement, archetypes, the L1-sketch divergence),
**architect-core**, and **board-reading**; the founding intent uses **intents-authoring**.

## Workflow

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
minted intents, offer `publish`.

### Step 4 — close the binding gate, then land the founding intent

Draft the founding intent in-session (full intents-authoring quality, kept in the drafts file),
then close the gate without a portal trip:

- System has a repo → offer `convert_node_to_app {nodeSlug, branch}` (landscape-modeling
  rules; credentials never issued here — the developer's code plugin connects separately).
- Planning material is a document → `bind_reference_source` on the new board (enough to
  author).
- Architect defers → the classic narration: *"Intents need a code-bound board — bind the repo,
  then rerun `/author-intent <board>` and I'll land this draft."*

Once authorable: `create_intent` (with `anchors[]` grounding the L1 sketch), then enrich via
the intents-authoring describe loop.

## Failure branches

- Tools missing / connection errors → `ProvenMap not configured — run /login (browser) or /configure (manual) first`
- 401 → `Your ProvenMap architect token was rejected — run /login to reconnect`
- Empty root (no landscape to place on) → this is `/setup-workspace` territory; say so.
- Write tools absent → read-only token: grill + emit the plan as markdown; name the
  `read_write` requirement.
