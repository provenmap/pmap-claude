---
category: author
description: "Author · WRITE-CAPABLE: Beautify a board — deterministic signals, a styling plan you approve, validated and applied as journaled writes"
argument-hint: "[board-slug]"
allowed-tools: Read, AskUserQuestion, Bash(node:*), mcp__plugin_pmap-architect_provenmap__*
---

Style one board end-to-end: signals → plan → validate → apply. Methodology and doctrine live in
`${CLAUDE_PLUGIN_ROOT}/knowledge/board-styling/SKILL.md` — read it first. All writes are journaled
(working copy), so the architect previews and commits like any board edit.

## Workflow

### Step 1 — pick the target

- Slug argument given → use it.
- No argument → run `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-architect.js --style-signals --scan` and
  print its `display` verbatim. Offer the least-styled boards (AskUserQuestion, ≤4 options). Rows with `?` counts mean the server predates the styling read surface — say so and
  let the architect name a board anyway.

### Step 2 — signals

Run `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-architect.js --style-signals --board <slug>`; print the
`display` verbatim. Note `signalsPath` from the JSON — the validate step needs it.

If the board's elements already show styling (précis `styling` non-null on many elements),
summarize what exists from the applied tokens (e.g. "services are `application`, edges mostly
`synchronous`") and ask (AskUserQuestion): restyle everything, style only unstyled elements, or
stop. Respect the answer for the whole run; when restyling, present current → proposed.

### Step 3 — plan

Author the styling plan per the board-styling skill (composition, semantics, icons — the plan
file shape is in its references/styling-vocabulary.md). Present the plan compactly: the
composition line, sizes table (with reasons), token groups, icon choices (catalog hit or Lucide
fallback per node). Say how many elements were left
untouched because their archetype already speaks for them — a quality signal, not an omission. Get approval (AskUserQuestion: apply / adjust / stop).

### Step 4 — validate

Write the plan to a temp file. Run
`node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-architect.js --validate styles --file <plan.json> --against <signalsPath>`.

- Exit 0 → continue (one line per warning).
- Exit 3 → fix the reported issues, re-validate. After two failed rounds: stop and say
  `Styling validation keeps failing — the board structure may need work first; run /board <slug> to inspect it.`

### Step 5 — apply, preview, commit

Three batched calls, in order, skipping omitted sections: `apply_composition` →
`apply_semantic_styles` → `apply_icon_shape_styles`. Then architect-core's standard closing move
(preview → title/summary via AskUserQuestion → commit). Report before/after: styled counts from
Step 2 vs the applied plan (nodes sized, tokens applied, composition set). To abandon instead:
`discard_write_session` (warn it reverts the WHOLE working copy).

**Outcome:** `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-architect.js --brief --command style-board --facts '{"board":"<slug>"}'` → Done · Left · Next, per `${CLAUDE_PLUGIN_ROOT}/knowledge/outcome/SKILL.md`.

## Failure branches

- CLI exit 1 → `ProvenMap not configured — run /login (browser) or /configure (manual) first`
- CLI exit 2 / MCP 401 → `Your ProvenMap architect token was rejected — run /login to reconnect`
- An apply_* call rejects the payload → relay the tool error verbatim, drop that section, continue
  with the rest; name what was skipped in the final report.
- Board not found → likely outside the token's board restriction; re-orient with `get_board_tree`.
