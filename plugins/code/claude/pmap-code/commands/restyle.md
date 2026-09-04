---
category: map
description: "Map · Restyle an analyzed board on demand — offline signals, a styling plan you approve, applied to the platform"
argument-hint: "[board-slug]"
allowed-tools: AskUserQuestion, Read, Write, Bash(node:*)
---

Restyle one board end-to-end: signals → plan → validate → apply. Methodology and vocabulary live
in `${CLAUDE_PLUGIN_ROOT}/knowledge/board-styling/SKILL.md` — read it first.

## Workflow

### Step 1 — pick the target

- Slug argument given → use it.
- No argument → run `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-sync.js --style-scan` and print its
  `display` verbatim. Offer the least-styled boards (AskUserQuestion, ≤4 options). Rows
  with `?` counts mean the server predates the styling read surface — say so and let the user
  name a board anyway.

### Step 2 — signals

Run `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-prepass.js --style-signals <slug>`; print the `display`
verbatim. Note `signalsPath` from the JSON. If it fails with "No local analysis", stop:
`Board "<slug>" has no local analysis — run /analyze first.`

### Step 3 — plan

Author the styling plan per the board-styling skill. Present it compactly: the composition line,
sizes table (who is enlarged or shrunk, and why), token groups, icon choices. Every size carries
a one-line reason, and every token states what it asserts that the element's archetype cannot.
Say how many elements were left untouched because their archetype already speaks for them — a quality signal, not an omission. Get approval (AskUserQuestion: apply / adjust /
stop).

### Step 4 — validate + save

Write the plan to `.provenmap/styling/<slug>.plan.json`. Run
`node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-prepass.js --validate-styles --file .provenmap/styling/<slug>.plan.json --against <signalsPath>`.

- Exit 0 → continue (one line per warning).
- Exit 3 → fix the reported issues, re-validate. After two failed rounds: stop and say
  `Styling validation keeps failing — the board structure may need work first; run /analyze on it, then /restyle.`

### Step 5 — apply

Run `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-sync.js --apply-styles <slug>`. Branch on the JSON:

- `stylingReport.applied: true` → report nodes/edges styled, containers composed, board
  composition, icons applied; list any `skipped[]` entries one line each. Done — the board is
  styled on the server; no /sync needed.
- `reason: "feature_unavailable"` → print the `error` field verbatim (the canonical
  server-upgrade sentence) and stop.
- `reason: "validation_failed"` → the board JSON changed since Step 4 — rerun from Step 2.
- Exit 1 with a config error → make the **connect-now offer** (below)
- `errorType: "auth_invalid"` → make the **connect-now offer** (below)
- Any other error → relay the CLI's `error` field; the styling can be retried with /restyle.

**Outcome:** `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-status.js --brief --domain code --command restyle` → Done · Left · Next, per `${CLAUDE_PLUGIN_ROOT}/knowledge/outcome/SKILL.md`.

### Connect-now offer

Trigger: not configured, or `errorType: "auth_invalid"`. AskUserQuestion "Connect to ProvenMap now?":

- **Connect now** → browser login: each `display` **in your reply**: `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-login.js --start`, then `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-login.js --poll --host claude --domain code` (timeout ~250s). `complete` → resume the failed step; else stop (display explains).
- **Not now** → stop: "ProvenMap not configured — run `/login` (browser) or `/configure` (manual) first" (rejected: "Your ProvenMap credentials were rejected — run `/login` to reconnect").
