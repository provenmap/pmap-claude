---
name: board-init
description: Bootstrap an existing-but-empty board below root into an implementable app design. Use when /board meets an empty app board (bound governing/reference, pre-first-push, or unbound with an app-archetype owner node) or an empty plain layer, or when /start routes a "shape/prepare/initialize this empty board" ask. Key capabilities: the two entry styles (architecture-first, pages-first via author_pages), intended-aspect authoring (author_endpoints, author_tables, author_channels), the implementor bar, rich-metadata discipline, reference-doc binding, founding intents, skills prep with configure_skills, per-tool degradation rules.
---

# Board Init

The bootstrap for a board that exists but holds nothing yet. The exit bar for every run:
**an implementor picking up an intent on this board knows where everything goes.**

## When this applies

- **Empty app board** — 0 nodes/edges, below root, with a code-plugin binding (governing or
  reference) and no push yet — or unbound, but its owner node carries an **app archetype**
  (a minted app slot).
- **Empty plain layer** — 0 nodes/edges, `isChildLayer`, no app-ness anywhere in its line: the
  lightweight variant at the bottom of this skill.

Never on the root (that is `/setup-workspace` territory) and never on a board with content
(normal `/board` work). Classification comes from the architect-core taxonomy — `/board`
Step 2 detects these states and offers this workflow inline.

## The interview

Bounded rounds, mirroring `/new-app`'s grill — but read before asking: the root landscape
already says who this app's neighbours are (`get_nodes` / `get_edges` at root), and a binding's
reference docs may already answer questions (`list_source_bindings` + `get_source_content`).
Ask only what's left:

- Purpose (one sentence — becomes the board description via `apply_diagram_info`).
- What the app owns: data, endpoints, events — the L1 skeleton.
- Actors/user types it serves.

Then the entry-style choice (AskUserQuestion, a genuine decision point): **architecture-first**
or **pages-first**. Keep the running plan as a drafts file (architect-core) so the interview
survives interruption.

## Architecture-first

The `/new-app` L1-sketch divergence (landscape-modeling), applied to a board that already
exists: `get_archetypes` first → containers, then ONE `create_nodes` call, then ONE
`create_edges` call — `--validate diagram` pre-flight before any write. Then the
rich-metadata discipline:

- **Every node gets a description** — what an implementor finds (or creates) there, not a
  restatement of its name.
- **The board description** states purpose + stack intent (`apply_diagram_info`).
- Semantic styles where they carry meaning (`apply_semantic_styles`), never as decoration.

Narrate the reconciliation truth: when the repo binds and pushes, analysis reconciles against
this sketch — expect intents where reality disagrees.

## Pages-first

The Product-perspective entry — the app as its surface. Enumerate the intended pages with the
architect: route, title, purpose, outbound nav targets, auth roles. Then write them:

```
author_pages {workBoardSlug, pages: [{slug, routePattern, title, purpose, navTargets, requiredRoles}]}
```

Rows land as **manual provenance** (analyzer pushes never overwrite them), journal into the
working copy like every other write, and reconcile when the repo's first push arrives —
narrate that truth. Upserts key on `slug`; on a row the analyzer owns, only the human fields
(purpose/owners) are writable — relay the tool's restriction message plainly.

Then **derive the architecture from the pages**: page clusters → the components serving them
(ONE `create_nodes` / ONE `create_edges`, as above); API and data needs land as node
descriptions. The diagram and the page inventory should tell one story.

### The other intended-aspect families

Pages are the entry, not the ceiling — when the interview surfaced them, author the rest of
the intended design the same way (each upserts by slug, manual provenance, journaled,
reconciles on push; on analyzer-owned rows only the human fields are writable):

- `author_endpoints {workBoardSlug, endpoints: [{slug, method, path, purpose, requiredRoles, ownerNodeSlug}]}`
  — the intended API surface.
- `author_tables {workBoardSlug, tables: [{slug, name, purpose, columns: [{name, type, note}], ownerNodeSlug}]}`
  — the intended data model (columns render into the table's usage notes).
- `author_channels {workBoardSlug, channels: [{slug, name, broker, purpose, producers, consumers, ownerNodeSlug}]}`
  — the intended event catalog (broker is required — it's identity-stable).

Author only what the interview actually settled — an intended aspect is a claim the architect
is making, never filler.

**Degradation (per tool):** any `author_*` tool absent from the token's tool list (older
server) → capture that inventory as a structured reference doc via `bind_reference_source
{type: 'inline_text'}` and say what the server upgrade unlocks — never claim a capability the
tool list doesn't carry.

## Converge — the implementor bar

Whichever entry style ran, close against the same checklist:

1. **Documents bound** — PRDs, design docs, decision material the architect has:
   `bind_reference_source` (a bound document is something intents can point back at).
2. **Founding intent(s) authored** — where the board is authorable (governing or reference
   binding), run the intents-authoring describe loop. Unbound board → offer the binding first,
   the `/new-app` Step 4 gate verbatim: *"Intents need a code-bound board — bind the repo, then
   rerun `/author-intent <board>` and I'll land this draft."*
3. **Skills prepared** — see below.
4. **The closing move** (architect-core): `preview_write_session_commit` → present the plan →
   title/summary (AskUserQuestion) → `commit_write_session` → narrate the minted intents,
   offer `publish`.

## Skills prep

`get_skill_profile` + `list_skill_library`, then propose an activation set from the interview
(stack, app archetype, what the app owns) — one conversational go-ahead, then:

```
configure_skills {boardSlug, activations: [{moduleSlug, enabled}]}
```

This applies immediately (not via the working copy) — confirm before calling. Truth to carry:
**skill profiles start EMPTY** — nothing is auto-seeded by binding.

**Degradation:** `configure_skills` absent from the tool list → present the proposed set as a
checklist and hand off to the platform's skill storefront.

## Empty-layer variant

A plain layer under an app board gets the light pass only: the interview's purpose question,
a sub-structure sketch (diagram + descriptions), the closing move. No pages, no skills, no
intents here — facet work routes UP to the owning app board (app-nesting rule); say so.
