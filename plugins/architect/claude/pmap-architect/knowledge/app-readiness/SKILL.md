---
name: app-readiness
description: Take a new app from placed to build-ready — the readiness bar, the spec grill that lands sequenced intents, and skill selection. Use when a convert_node_to_app ran with observationType 'new_app', when /prepare-app runs, or when the architect asks to "prepare/spec the app", "get it ready to build", "choose its skills". Key capabilities: the three-point readiness bar (founding intent, spec set, skills), spec decomposition with dependsOnSlugs sequencing, judgment-based skill proposal over the library.
---

# App readiness — from placed to build-ready

One workflow, two entries: inline right after a `'new_app'` conversion (`/new-app` Step 5,
`/setup-workspace` Step 5), or standalone any time via `/prepare-app <board>`. Everything is
**recomputed from live state** — nothing about readiness is stored on the server, so the flow
is resumable and idempotent: run it twice, it picks up exactly where reality is.

## The readiness bar

Three items, computed by the script (never hand-derived):

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-architect.js --app-readiness --board <slug>
```

Print the `display` **verbatim** — do not reformat, reorder, or summarise. The bar:

1. **Founding intent landed** — ≥1 intent on the board (what `/new-app` Step 4 produces).
2. **Spec set authored** — the build decomposed past the founding intent (≥2 intents,
   sequenced where order matters).
3. **Skills configured** — ≥1 enabled activation on the board's skill profile.

Work the open items top-to-bottom; each is optional per session — skipping leaves the bar
honest for next time. `ready: true` → narrate the developer handoff and stop.

## Item 1+2 — the spec grill

Full [`${CLAUDE_PLUGIN_ROOT}/knowledge/intents-authoring/SKILL.md`](../intents-authoring/SKILL.md)
machinery — the 10-step loop, the gates, self-review, read-back. Never a lighter fork of it.
What this workflow adds is only the **decomposition heuristic**:

- **Walking skeleton first**: the thinnest end-to-end slice that proves the architecture
  (one route → one service call → one table). It is usually the founding intent.
- **Then feature slices**: each further intent is one vertical slice a developer can land
  independently — bounded set, typically 2–6 total. Not a task list: an intent still meets the
  intents-authoring bar (why worth reading later, directive naming elements by slug, notes per
  anchor).
- **Sequence with `dependsOnSlugs`** where order is real (skeleton before slices; a migration
  before its consumers; a cut-over after both its dual-write and its service identity — an
  intent may wait on several, on this board or another). Omit it where order does not
  matter — sequencing is a statement, not decoration.
- **Anchors ground the L1 sketch**: the board's drawn components are the anchor vocabulary; a
  slice that touches nothing on the board is a sign the sketch is missing a piece — extend the
  sketch first (working copy), then anchor.

Material to seed the grill: the `/new-app` drafts file when running inline; otherwise pull the
board (`get_workboard_details`) and any bound documents (`list_source_bindings` →
`draftedFromSourceSlug` provenance) and grill the gaps per the authoring interview.

## Item 3 — skills

Run [`${CLAUDE_PLUGIN_ROOT}/knowledge/board-init/SKILL.md`](../board-init/SKILL.md)'s **Skills prep**
exactly as written there — `get_skill_profile` + `list_skill_library` → propose an activation
set from what the grill learned (stack, app archetype, what the app owns) → one go-ahead →
`configure_skills {boardSlug, activations}`. All of board-init's rules apply unchanged:
applies immediately (not via the working copy), confirm before calling, degradation to a
checklist when the tool is absent. Truth to carry: **skill profiles start EMPTY** — nothing is
auto-seeded by binding.

"No skills needed" is a legitimate close for this session — say so and move on; the bar item
will show open on a later run and the architect just re-confirms (accepted trade-off of
storing nothing).

## Closing

Intents live in the working copy → the architect-core closing move
(`preview_write_session_commit` → title/summary → `commit_write_session`). Then the handoff,
every line naming its command:

- **Developer builds now or later**: install the code plugin in the repo → `/login` →
  `/build` pulls the compiled skills + these intents. First push reconciles the L1 sketch —
  expect intents where reality disagrees.
- **Architect resumes any time**: `/prepare-app <board>` (live recompute), `/intents` for the
  queue, `/hub` keeps unprepped new apps on the attention queue.
