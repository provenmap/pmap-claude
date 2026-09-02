---
category: map
description: "Map · Analyze codebase architecture with layered board support"
argument-hint:
  [--clean | --drill <parent-board-slug>/<node-slug> | --all | --auto]
allowed-tools: Read, Glob, Grep, Write, Bash(node:*, git:*), AskUserQuestion, Task
---

Print every `display` verbatim; branch only on exit codes and named fields.

**Dispatch (argument):** `--clean` full re-analysis; `--drill <parent>/<node>` child board (add `--clean`: rebuild only it); `--all` all layers; `--auto` unattended (`--auto-plan` owns the loop; prompts become stops); no flag: incremental (full when impossible).

**-2 Preflight** — `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-preflight.js` (whole-tree `--clean`: add `--no-repair`): 0 → continue; 1 → connect-now offer (--auto: stop, print `error` verbatim); 2 → print `error`, stop, name `/status`; 11 → branch-mismatch prompt in `${CLAUDE_PLUGIN_ROOT}/knowledge/provenmap-integration/SKILL.md` (--auto: stop).

**-1 Archetype gate** — `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-precondition.js --kind code`: `gate_off`/`ok` → silent proceed; `pending` → warn with `reason`; exit 10 (strict only) → AskUserQuestion per the reference (--auto: stop); 1/2 → print `error`, stop.

**Read `${CLAUDE_PLUGIN_ROOT}/knowledge/codebase-analysis/references/analyze-workflow.md` NOW and follow it exactly; improvise nothing.**

**Step map (in order — at Steps -2, 0, 4.5, 8, 9 first: `pmap-prepass.js --spine analyze --step <n> --with-coverage`, exit 3: report drift, continue):**

- -0.5 `pmap-prepass.js --coverage` (exit 2 → stop)
- 0 `pmap-archetypes.js --kind code` catalogue + role map (`--role-map`)
- 0.5 server boards `pmap-boards.js` (fail → warn, continue)
- 1 manifest + board slug (none → connect-now)
- 1.5 worklist: ledger + `--claim-check --changed-since auto`; empty → up to date, stop
- 2–4 config + stacks from the digest (script-owned)
- 4.5 skeleton read + `--detail`; slice only inlined clusters
- 4.6 `--group-plan --layer <n>`; evidence flip → ask first
- 5 you author nodes: grain from plan; claim coveredFiles; write board JSON
- 5.5 `--claim-check`; exit 3 → fix double claim, re-run
- 6 `--rollup <slug> --apply` (exit 3 → fix; re-read board) + semantic edges; 3+ groups → relationship-detector agents (read-only, max 4, one message)
- 7 drill-down candidates: `layerBoardSlug`
- 8 write board: `analyzedAtCommit`, truthful `analyzedBy`
- 8.3 gate `--board-report <slug>`; exit 3 → stop board, fix; settle every advisory
- 8.4 styling `--style-signals` → plan → `--validate-styles` (max 2 rounds; never blocks)
- 8.5 `--coverage`; dashboard verbatim
- 8.6 next area: your read + AskUserQuestion (multiSelect for 2+ drill-downs; last: Sync what I have)
- 8.7 fan-out: architecture-analyzer agents (layer-board / incremental-refresh), one message; only the orchestrator writes manifest/coverage/parent boards; join → one 8.5
- 9 manifest; drop mirror metadata
- Report: re-run `--board-report`, verbatim + final dashboard.

**Close:** `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-status.js --after analyze --domain code` — print verbatim.

## Connect-now offer

Trigger: not configured, or `errorType: "auth_invalid"`. AskUserQuestion "Connect to ProvenMap now?":

- **Connect now** → browser login: each `display` **in your reply**: `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-login.js --start`, then `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-login.js --poll --analyze-cmd analyze` (timeout ~250s). `complete` → resume the failed step; else stop (display explains).
- **Not now** → stop: "ProvenMap not configured — run `/login` (browser) or `/configure` (manual) first" (rejected: "Your ProvenMap credentials were rejected — run `/login` to reconnect").
