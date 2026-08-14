---
name: board-styling
description: Author a styling plan for an analyzed board — deterministic signals, model judgment, offline validation. Use when /analyze finishes a board, when running /restyle, or when the user asks to beautify a board or diagram. Covers semantic tokens, size presets, composition, and icons.
---

# Board styling (code domain)

Styling makes an analyzed board read professionally: semantics first (Role/State/Severity
tokens), then size (a strict minority of `lg`/`xl`; peripheral/external nodes shrink to `xs`),
then composition (arrangement + orientation + density per board/container), then icons. The
doctrine, full vocabulary tables, and six worked examples live in
[references/styling-vocabulary.md](references/styling-vocabulary.md) and
[references/styling-examples.md](references/styling-examples.md) — the plan-file shape there is
exactly what this domain uses.

## The four moves

1. **Signals** — `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-prepass.js --style-signals <board-slug>`
   (offline: reads `.provenmap/boards/<slug>.json`). Print `display` verbatim; note
   `signalsPath`.
2. **Plan** — author the `StylingPlan` JSON guided by the signals (prominence → `lg`/`xl`,
   external cohort → `xs`, container profiles + board suggestion → composition, one Role token
   per archetype — group containers by archetype first, then pick the
   **most specific applicable Role token** per group, defaulting to a shared token only within
   a group). Each size or token that departs from the default (`md`, no token) carries a
   one-line why when you present the plan. Edge requests use the signals view's edge slugs
   (`src->tgt@type`). Code-domain plans are **complete restyles** — the local view carries no
   existing styling, and the apply endpoint replaces same-category styling (last writer wins).
3. **Validate** — `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-prepass.js --validate-styles --file
   <plan.json> --against <signalsPath>`. Exit 3 → fix and re-validate, max 2 rounds, then
   continue unstyled and point at `/restyle`.
4. **Save** — write the validated plan to `.provenmap/styling/<board-slug>.plan.json`. `/sync`
   applies it automatically after that board's next successful push and deletes it; `/restyle`
   applies on demand via `pmap-sync.js --apply-styles <slug>`.

Icons in this domain use `lucideIconName` + `shapeType` (the enum in the vocabulary reference) —
the `iconUrl` catalog search is architect-only, so never plan an `iconUrl` here.

Styling never blocks analysis or sync: a failed plan leaves the board unstyled and structure
still ships.
