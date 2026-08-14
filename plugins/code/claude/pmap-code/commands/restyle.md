---
category: map
description: "Map · Restyle an analyzed board on demand — offline signals, a styling plan you approve, applied to the platform"
argument-hint: "[board-slug]"
allowed-tools: AskUserQuestion, Read, Write, Bash(node:*)
---

Restyle one board end-to-end: signals → plan → validate → apply. Methodology and vocabulary live
in [`${CLAUDE_PLUGIN_ROOT}/knowledge/board-styling/SKILL.md`](../knowledge/board-styling/SKILL.md) — read it first.

## Workflow

### Step 1 — pick the target

- Slug argument given → use it.
- No argument → run `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-sync.js --style-scan` and print its
  `display` verbatim. Offer the least-styled boards (AskUserQuestion, up to 4 options). Rows
  with `?` counts mean the server predates the styling read surface — say so and let the user
  name a board anyway.

### Step 2 — signals

Run `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-prepass.js --style-signals <slug>`; print the `display`
verbatim. Note `signalsPath` from the JSON. If it fails with "No local analysis", stop:
`Board "<slug>" has no local analysis — run /analyze first.`

### Step 3 — plan

Author the styling plan per the board-styling skill. Present it compactly: the composition line,
sizes table (who gets lg/xl and why, the xs cohort), token groups, icon choices. Every size or
token that deviates from the default carries a one-line reason. Get approval (AskUserQuestion:
apply / adjust / stop).

### Step 4 — validate + save

Write the plan to `.provenmap/styling/<slug>.plan.json`. Run
`node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-prepass.js --validate-styles --file .provenmap/styling/<slug>.plan.json --against <signalsPath>`.

- Exit 0 → continue (mention warnings, one line each).
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

### Connect-now offer

Used whenever ProvenMap is not configured or the credentials were rejected (`errorType: "auth_invalid"`). Ask with **AskUserQuestion** — "Connect to ProvenMap now?" (**Connect now** / **Not now**):

- **Connect now** → run the browser login here, printing each JSON `display` verbatim **in your reply** (the Bash output panel is collapsed for the user): `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-login.js --start`, then `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-login.js --poll --host claude --domain code` (generous Bash timeout, e.g. 250s). On `status: "complete"`, resume this command from the step that failed; anything else — stop, the display explains.
- **Not now** → stop with the canonical message: "ProvenMap not configured — run `/login` (browser) or `/configure` (manual) first" (or, when credentials were rejected: "Your ProvenMap credentials were rejected — run `/login` to reconnect").
