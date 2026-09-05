---
category: map
description: "Map · Analyze codebase architecture with layered board support"
argument-hint:
  [--clean | --drill <parent-board-slug>/<node-slug> | --board <slug> | --all | --auto]
allowed-tools: Read, Glob, Grep, Write, Bash(node:*, git:*), AskUserQuestion, Task
---

Print every `display` verbatim; branch only on exit codes and named fields.

**Dispatch:** `--clean` full re-plan+re-analysis; `--drill <parent>/<node>` child board (`--clean`: only it); `--board <slug>` refresh stale/incomplete; `--all` all layers; `--auto` unattended (`--auto-plan` loop; prompts stop); no flag: incremental (else full).

**-2 Preflight** — `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-preflight.js` (whole-tree `--clean`: add `--no-repair`): 0 → continue; 1 → connect-now offer (--auto: stop, print `error` verbatim); 2 → print `error`, stop, name `/status`; 11 → branch-mismatch prompt in `${CLAUDE_PLUGIN_ROOT}/knowledge/provenmap-integration/SKILL.md` (--auto: stop).

**-1 Archetype gate** — `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-precondition.js --kind code`: `gate_off`/`ok` → proceed; `pending` → warn with `reason`; exit 10 (strict only) → AskUserQuestion per the reference (--auto: stop); 1/2 → print `error`, stop.

**Read `${CLAUDE_PLUGIN_ROOT}/knowledge/codebase-analysis/references/analyze-workflow.md` NOW and follow it exactly; improvise nothing.**

**Step map (in order — at Steps -2, 0, 4.5, 8, 9 first: `pmap-prepass.js --spine analyze --step <n> --with-coverage`, exit 3: report drift, continue):**

- -0.5 `pmap-prepass.js --coverage` (exit 2 → stop)
- 0 `pmap-archetypes.js --kind code` catalogue + role map (`--role-map`)
- 0.5 server boards `pmap-boards.js` (fail → warn, continue)
- 1 manifest + board slug (none → connect-now)
- 1.5 worklist: plan + `--claim-check --changed-since auto`; empty → up to date, stop
- 2–4 config + stacks from the digest (script-owned)
- 4.5 `--scope-unit` read + `--detail`; slice only inlined clusters
- 4.6 `--group-plan --layer <n>` (no marks); evidence flip → ask first
- 5 carry child units + own files; `planUnitId`; write board JSON
- 5.5 `--claim-check`; exit 3 → fix double claim, re-run
- 6 `--rollup <slug> --apply` (exit 3 → fix; re-read board) + semantic edges, one per pair; 5+ isolated → relationship-detector agents (read-only, max 4, one message)
- 7 propose depth → `metadata.proposedDrillDowns`
- 8 write board: truthful `analyzedBy`
- 8.3 gate `--board-report <slug>`; exit 3 → stop board, fix; settle every advisory
- 8.4 styling `--style-signals` → plan → `--validate-styles` (max 2 rounds; never blocks)
- 8.45 `--fields` (fail → go on) → `--finalize <slug>`
- 8.5 `--coverage`; dashboard verbatim
- 8.6 next area: your read + AskUserQuestion (multiSelect for 2+ builds; last: Sync what I have)
- 8.7 fan-out: architecture-analyzer agents via `--dispatch-prompt`, one message; no stubs; 8.45 per join; final `--coverage`
- 9 report: re-run `--board-report`, verbatim + final dashboard.

**Outcome:** `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-status.js --brief --domain code --command analyze` → Done · Left · Next, per `${CLAUDE_PLUGIN_ROOT}/knowledge/outcome/SKILL.md`.

## Connect-now offer

Trigger: not configured, or `errorType: "auth_invalid"`. AskUserQuestion "Connect to ProvenMap now?":

- **Connect now** → login: each `display` **in your reply**: `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-login.js --start`, then `--poll --host claude --analyze-cmd analyze` (~250s). `complete` → resume the failed step; else stop (display explains).
- **Not now** → stop: "ProvenMap not configured — run `/login` (browser) or `/configure` (manual) first" (rejected: "Your ProvenMap credentials were rejected — run `/login` to reconnect").
