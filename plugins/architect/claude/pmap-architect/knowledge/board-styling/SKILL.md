---
name: board-styling
description: How to style a ProvenMap board so it reads professionally — semantic tokens, size hierarchy, composition, icons. Use when authoring or beautifying any board (inline in setup-workspace/new-app/board writes, or via /style-board). Covers the signals→plan→validate→apply pipeline and the three apply_* tools.
---

# Board styling — professional by default

Styling is judgment guided by facts. The pipeline is always the same four moves:

1. **Signals** — `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-architect.js --style-signals --board <slug>`
   prints deterministic facts (hubs, external cohort, container profiles, arrangement suggestion)
   and writes a signals file (path in the JSON output). Never re-derive these facts by hand.
2. **Plan** — you decide: tokens, sizes, composition, icons. **Resolve icons first**: before any
   token or size is final, collect every node whose archetype is a brand, cloud provider or SaaS
   integration and send all their names in ONE `match_icons` call (never one call per node). For a
   matched name, pass its top hit's `svgPath` verbatim as `iconUrl`; choose a `lucideIconName` only
   for the names the response lists in `unmatched`. Record per node which happened —
   `catalog:<svgPath>` or `lucide:<Name> (no catalog match)` — so the architect can tell "no better
   icon exists" from "nobody looked". Then write ONE JSON file mirroring the three apply_* payloads
   (shape in references/styling-vocabulary.md).
3. **Validate** — `--validate styles --file <plan.json> --against <signals file>`. Exit 3 = fix
   the reported issues and re-validate. Two failed rounds = stop styling, ship the structure,
   point at /style-board.
4. **Apply** — three batched MCP calls in this order: `apply_composition`,
   `apply_semantic_styles`, `apply_icon_shape_styles` (skip any section the plan omits). One
   call per tool — never per element. All three are journaled writes: they join the working
   copy and preview/commit/discard like any diagram write.

## Doctrine

- **Semantics first, decoration never.** Every token must state a fact about the architecture
  (role, state, flow, severity). If you can't say what a token asserts, don't apply it.
- **Size is hierarchy, and a minority.** The signals' prominence list are your lg/xl candidates
  — cap enforced at 10% of leaf nodes. If everything is large, nothing is. The external cohort
  all goes xs (label renders below the shape); shrinking many externals at once is correct.
- **One Role token per archetype per board — group first, then choose.** The rule constrains
  containers that *share* an archetype; it does not mean every container on the board takes the
  same token. Group containers by archetype, then pick the **most specific applicable Role token**
  per group (an `external_integrations` container takes `integration`, not the `domain_boundary`
  its neighbours take), defaulting to a shared token only within a group. Same archetype, same
  role — a split legend reads as an error. (The validator warns; deviate only deliberately.)
- **Every deviation states its reason.** When you present the plan, each size or token that
  departs from the default (`md`, no token) carries a one-line why — "xl: the system under
  discussion", "xs: external cohort", "integration: third-party SaaS boundary". A bare table
  invites "why is that big?" and cannot be reviewed.
- **Composition by board type.** C4-context root: `flow` + `horizontal`, externals xs at the
  edges. Containment-heavy structure: `hierarchy`. Peer mesh with no dominant direction:
  `network` (never give it an orientation — the validator rejects it). Set the board once,
  override only containers that genuinely read differently. Density: `tight` for dense
  infrastructure, `airy` for a centrepiece diagram.
- **Root boards are C4-shaped.** The system under discussion is the one xl node; people and
  externals surround it; flows are labelled edges with Flow tokens.
- **Edges carry Flow/State/Severity tokens only** — no sizes, no Role. Synchronous = solid,
  asynchronous = dashed, stream = animated: the token IS the edge style.
- **Respect existing styling.** Node/edge précis carry a compact `styling` field — the applied
  semantic tokens (`semantics`), size preset, icon strategy — and get_workboard_details a
  `stylingSummary`. An element with non-null `styling` was authored: restyle it only when the
  architect asked for a restyle, and when you do, present current → proposed from its tokens
  rather than styling blind. `semantics: null` on a styled element means it predates token
  provenance — treat it as authored-with-unknown-tokens. A null `stylingSummary` means an older
  server: styling still works, idempotency checks don't.
- **Changing an archetype after styling clobbers semantic styles** (platform merges by style
  type). Style after structure is settled.

## Worked examples

Six exemplar boards with signals, plans, and rationale: references/styling-examples.md. The
same datasets are test fixtures in the plugin repo — they always validate clean.

## Vocabulary

Full token/size/arrangement/density/icon tables: references/styling-vocabulary.md.
