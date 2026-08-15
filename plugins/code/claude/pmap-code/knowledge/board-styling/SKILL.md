---
name: board-styling
description: Author a styling plan for an analyzed board — deterministic signals, model judgment, offline validation. Use when /analyze finishes a board, when running /restyle, or when the user asks to beautify a board or diagram. Covers semantic tokens, size presets, composition, and icons.
---

# Board styling (code domain)

Styling makes an analyzed board read professionally: semantics where they add something
(Role/State/Severity tokens), size to build hierarchy, composition (arrangement + orientation +
density per board/container), then icons. The full vocabulary tables and six worked examples
live in [references/styling-vocabulary.md](references/styling-vocabulary.md) and
[references/styling-examples.md](references/styling-examples.md) — the plan-file shape there is
exactly what this domain uses.

## The archetype test

Every element already carries its archetype's styling, and a node token **replaces fill +
stroke + text**. So a token that restates the archetype trades the analyzer's own per-archetype
palette for a duplicate. Per element, in order:

1. **Does it warrant a token at all?** Does this module/component/service demand different
   treatment from its peers? Most don't.
2. **Read the archetype's `styling`** in the signals view's `archetypeStyling` map.
   `assertsKind` true → it already says what kind of thing this is; don't spend a Role token
   saying it again. `styling: null` → style-less archetype, so a Role token is the only thing
   that will state its role: send it. Archetype missing from the map → the catalogue isn't
   known here (no cached archetypes); judge on the description alone.
3. **Only then pick the category.** **Role** is for style-less archetypes. **State**/**Severity**
   carry instance facts no archetype can (`legacy`, `degraded`, `failing`) — the same token on
   half the board asserts nothing. **Emphasis** is attention, never identity; `neutral` asserts
   nothing at all, so omit the element instead of styling it neutral.

**Size is the instrument.** It is its own style type — it never overwrites archetype identity —
so use it freely to make the diagram explain itself, with or without a token: key components
larger, incidental ones smaller. Keep `lg`/`xl` a minority anyway (the validator warns, it does
not block). `xs` is a legibility choice, not a peripheral marker: the label renders below the
shape on one truncating line, so it suits icon-backed short names; an icon-less or long-named
node takes `sm`.

## The four moves

1. **Signals** — `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-prepass.js --style-signals <board-slug>`
   (offline: reads `.provenmap/boards/<slug>.json` plus the cached archetype catalogue). Print
   `display` verbatim; note `signalsPath`.
2. **Plan** — author the `StylingPlan` JSON guided by the signals, applying the archetype test
   above to every element (prominence → `lg`/`xl`, container profiles + board suggestion →
   composition; among the archetypes that earn a Role token, one Role token per archetype —
   group containers by archetype first, then pick the **most specific applicable Role token**
   per group). Each size or token that departs from the default (`md`, no token) carries a
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
