---
name: board-styling
description: How to style a ProvenMap board so it reads professionally — composition, size hierarchy and icons first, semantic tokens sparingly. Use when authoring or beautifying any board (inline in setup-workspace/new-app/board writes, or via /style-board). Covers the signals→plan→validate→apply pipeline and the three apply_* tools.
---

# Board styling — professional by default

Styling is judgment guided by facts. The pipeline is always the same four moves:

1. **Signals** — `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-architect.js --style-signals --board <slug>`
   computes deterministic facts (hubs, external cohort, container profiles, archetype profiles,
   arrangement suggestion) and writes a signals file (path in the JSON output). Its `display` is a
   bounded summary you print verbatim; **author from `signals` on the payload**, which carries
   every element's own reason. Never re-derive these facts by hand.
2. **Plan** — you decide: composition, sizes, icons, and the few tokens that earn a place. The signals' `archetypeProfiles`
   already tell you what each archetype asserts — every token decision below is judged against
   them, so do **not** call `get_archetypes` here; step 1 fetched the catalogue once. **Resolve icons first**: before any
   token or size is final, collect every node whose archetype is a brand, cloud provider or SaaS
   integration and send all their names in ONE `match_icons` call (never one call per node). For a
   matched name, pass its top hit's `svgPath` verbatim as `iconUrl`; choose a `lucideIconName` only
   for the names the response lists in `unmatched`. Record per node which happened —
   `catalog:<svgPath>` or `lucide:<Name> (no catalog match)` — so the architect can tell "no better
   icon exists" from "nobody looked". Then write ONE JSON file mirroring the three apply_* payloads
   (shape in references/styling-vocabulary.md).
3. **Validate** — `--validate styles --file <plan.json> --against <signals file>`. Exit 3 = fix
   the reported issues and re-validate. A coverage or saturation **warning** (most nodes or
   edges tokened, one Role token past a quarter of the board) means the plan over-styled: cut
   the excess and re-validate rather than applying it. Two failed rounds = stop styling, ship the structure,
   point at /style-board.
4. **Apply** — three batched MCP calls in this order: `apply_composition`,
   `apply_semantic_styles`, `apply_icon_shape_styles` (skip any section the plan omits). One
   call per tool — never per element. All three are journaled writes: they join the working
   copy and preview/commit/discard like any diagram write.

## Doctrine

- **Tokens are the exception.** Composition, size and icons style the board; a semantic token
  is spent only where an element must be told apart from its neighbours and nothing else says
  why. The budget: tokened nodes stay a minority of the nodes, tokened edges a minority of the
  edges, and a plan with **no tokens at all is normal** — never add one to make the pass feel
  finished. Every token must state a fact about the architecture (role, state, flow,
  severity); if you can't say what it asserts *that its neighbours don't share*, don't apply it.
- **A token must assert what the archetype cannot.** Styling starts on top of styling the
  archetype already applied. Each category paints through its own channel (table in the
  vocabulary), so tokens from different categories layer — but a **Role** token still takes the
  fill tint and stroke colour, which is where an archetype asserts kind: a Role that merely
  restates the archetype trades its palette for a duplicate. Per element, in order:
  1. **Does it warrant a token at all?** Does the *requirement* demand this element be told
     apart from its neighbours? Most elements on a good board carry none.
  2. **Find its archetype in the signals' `archetypeProfiles`.** *Asserts kind*
     means it already says what kind of thing this is — don't spend a Role token repeating it.
     *Style-less* means a Role token is *allowed* to speak, not that it must.
  3. **Only then pick the category.** Reserve **Role** for style-less archetypes, and only
     while the group taking it is a small minority — about a quarter of the board's nodes at
     most. Role is granted per archetype group (next rule), so a style-less archetype that
     covers much of the board would put one token on all of them, which tells nothing apart:
     leave them untokened and name the gap — the fix is the archetype's own styling
     (/archetypes), not a token per element. **State** and
     **Severity** carry instance facts no archetype can (`legacy`, `degraded`, `failing`,
     `error`) — the same token on half the board asserts nothing, so use them where elements
     genuinely differ — the default state (`active`, `healthy`) is not a fact worth a token
     unless the board is *about* that contrast. **Emphasis** is attention, never identity; `neutral` asserts nothing at
     all — omit the element instead.
- **Size is the instrument, and a minority.** Size is its own style type: it never overwrites
  archetype identity, so it is where you have free rein to make the diagram explain itself —
  key components larger, incidental ones smaller, and a size needs no accompanying token. Keep
  lg/xl a minority anyway: if everything is large, nothing is (the validator warns, it does not
  block). `xs` is a legibility choice — the label renders below the shape on one truncating
  line, so it suits icon-backed short names; an icon-less or long-named node takes `sm`.
- **One Role token per archetype per board — group first, then choose.** Among the archetypes
  that earn a Role token at all, the rule constrains containers that *share* an archetype; it
  does not mean every container on the board takes the same token. Group containers by
  archetype, then pick the **most specific applicable Role token** per group, defaulting to a
  shared token only within a group. Same archetype, same role — a split legend reads as an
  error. (The validator warns; deviate only deliberately.)
- **Every deviation states its reason.** When you present the plan, each size or token that
  departs from the default (`md`, no token) carries a one-line why — "xl: the system under
  discussion", "xs: peripheral, icon-backed", "integration: style-less archetype, nothing else
  states its role". A bare table invites "why is that big?" and cannot be reviewed.
- **Composition by board type.** C4-context root: `flow` + `horizontal`, externals small at the
  edges. Containment-heavy structure: `hierarchy`. Peer mesh with no dominant direction:
  `network` (never give it an orientation — the validator rejects it). Set the board once,
  override only containers that genuinely read differently. Density: `tight` for dense
  infrastructure, `airy` for a centrepiece diagram.
- **A freshly sketched app L1** (`/new-app` Step 3.5) has nothing styled yet, so every element
  is *eligible* — the token budget still holds. Expect composition `flow`, the app's core
  service as the one `lg` node, and few or no tokens.
- **A freshly drawn root landscape** (`/setup-workspace` Step 3.5) commits styled, not raw:
  the same case, shaped by the C4-context root composition above (`flow` + `horizontal`,
  externals small) unless the signals argue otherwise. Styled means composed and sized — not
  tokened throughout.
- **Root boards are C4-shaped.** The system under discussion is the one xl node; people and
  externals surround it; flows are labelled edges.
- **Edges: token the deviation, never the norm.** Read the board's dominant flow first. Only
  edges that differ from it take a Flow token (synchronous = solid, asynchronous = dashed,
  stream = thick) — line grammar only, the edge keeps its archetype's colour and arrowhead; the dominant flow stays untokened, and a board whose edges all flow the
  same way takes **no Flow tokens** — say it once in the board description
  (`apply_diagram_info`) instead. Edges carry Flow/State/Severity tokens only — no sizes, no
  Role.
- **Respect existing styling.** Node/edge précis carry a compact `styling` field — the applied
  semantic tokens (`semantics`), size preset, icon strategy — and get_workboard_details a
  `stylingSummary`. An element with non-null `styling` was authored: restyle it only when the
  architect asked for a restyle, and when you do, present current → proposed from its tokens
  rather than styling blind. `semantics: null` on a styled element means it predates token
  provenance — treat it as authored-with-unknown-tokens. A null `stylingSummary` means an older
  server: styling still works, idempotency checks don't.
- **Changing an archetype after styling clobbers semantic styles** (the archetype's styles
  replace by style type, and the tokens' record of the element's own paint goes stale). Style
  after structure is settled.

## Worked examples

Six exemplar boards with signals, plans, and rationale: references/styling-examples.md. The
same datasets are test fixtures in the plugin repo — they always validate clean.

## Vocabulary

Full token/size/arrangement/density/icon tables: references/styling-vocabulary.md.
