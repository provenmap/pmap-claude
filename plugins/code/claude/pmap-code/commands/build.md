---
category: build
description: "Build · Build the app from the platform's spec — compiled skills, intents, board design, aspect contracts. WRITE-CAPABLE: creates and edits project files (after you approve the plan)"
argument-hint: [--plan | <focus prompt>]
allowed-tools: Read, Glob, Grep, Edit, Write, Bash, AskUserQuestion
---

**Write-capable.** No project file is created or edited before the user approves the plan (Step 3); always show what changed.

**Display contract:** print every `display` verbatim in your reply; never reformat it; branch only on exit codes and the named fields.

**0 Preflight** (script-enforced, not your judgement) — `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-preflight.js`. 0 → go (`display` reports any `repairs.boardsRecovered` restore) · 1 (not connected / credentials rejected) → **connect-now offer** · 2 (binding unverified) → print `error`, stop, name `/status` · 11 (branch mismatch) → AskUserQuestion per the branch-mismatch prompt in `${CLAUDE_PLUGIN_ROOT}/knowledge/provenmap-integration/SKILL.md`.

**1 Assemble the spec pack** — `boardSlug` from `.provenmap/config.json`, then `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-build.js --board-slug <boardSlug>`. Exit 1 (not configured), or exit 3 with `errorType: "auth_invalid"` → **connect-now offer**; other exit 3 → stop, report `error` verbatim; exit 0 → print `display`. Pack notes: relay the note on `skills.available: false`, report the sections in `warnings[]`; neither blocks the build.

**1.5 Skills freshness** — if the pack (`packPath`) has `skills.available` and (`skills.upstreamChanged` or `skills.compiledCount` is 0), sync first — a stale spec builds the wrong app: `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-skills.js --sync --board-slug <boardSlug>`; report it (name protected `localEdits[]`), then re-run `pmap-build.js` once.

**2 Branch on `nextAction`** — `none` → nothing to build from: "Compile skills for this app on the ProvenMap portal (or author a board design / intents), then re-run `/build`", stop · `map` → source but no spec: map it first — `/analyze` then `/sync`, stop · `intents` → spec built, only intent work remains: point at `/intents`, stop · `build` → continue.

**Steps 3–5 — read `${CLAUDE_PLUGIN_ROOT}/knowledge/platform-driven-build/SKILL.md` NOW and follow it exactly; improvise nothing.** It holds every source, invocation, branch, and rule: **3** plan from the spec — **the user approves the plan** before any file is touched, and a `--plan` argument stops there · **4** implement unit by unit — intent-covered units go through the intent machinery, and **the user confirms** before any resolution · **5** close the loop — `/analyze`, then `/sync`.

## Connect-now offer

Used whenever ProvenMap is not configured or the credentials were rejected (`errorType: "auth_invalid"`). Ask with **AskUserQuestion** — "Connect to ProvenMap now?" (**Connect now** / **Not now**):

- **Connect now** → run the browser login here, printing each JSON `display` verbatim **in your reply** (the Bash output panel is collapsed for the user): `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-login.js --start`, then `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-login.js --poll --analyze-cmd analyze` (generous Bash timeout, e.g. 250s). On `status: "complete"`, resume this command from the step that failed; anything else — stop, the display explains.
- **Not now** → stop with the canonical message: "ProvenMap not configured — run `/login` (browser) or `/configure` (manual) first" (or, when credentials were rejected: "Your ProvenMap credentials were rejected — run `/login` to reconnect").
