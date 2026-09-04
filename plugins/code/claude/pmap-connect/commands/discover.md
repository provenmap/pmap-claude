---
category: understand
description: "Understand · Discover the insights and context boards worth showing — ranked by the graph, picked by you or chosen for you, authored in parallel, pushed to ProvenMap"
argument-hint: "[count] [--auto] [--lens reliability,onboarding,ownership] [--board <slug>] [focus]"
allowed-tools: Read, Glob, Grep, Write, Bash(node:*), AskUserQuestion, Task
---

**Print every `display` verbatim; branch only on exit codes and named JSON fields.** Any `pmap-insights.js` exit 1, or exit 3 with `errorType: "auth_invalid"` → **connect-now offer**; other exit 3 → report `error` verbatim and stop.

**-1 Preflight** — `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-preflight.js`: 0 → go; 1 → **connect-now offer**; 2 (binding unverified) → print `error`, stop, name `/status`; 11 (branch mismatch) → AskUserQuestion per the branch-mismatch prompt in `${CLAUDE_PLUGIN_ROOT}/knowledge/provenmap-integration/SKILL.md`.

**0 Feature** — `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-insights.js --get-insight-skill architecture-highlights --domain connect`. Exit 3 (not found) → stop: "This ProvenMap server doesn't expose architecture highlights yet — ask your admin to upgrade".

**1 Plan** — from the command argument: a leading integer → `--count <n>`; `--board <slug>` → `--board-slug <slug>`; `--lens` passes through; a focus prompt → the lenses it matches (say which in one line). Then `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-insights.js --discover [--board-slug <slug>] [--lens <a,b>] [--count <n>] --domain connect`. Exit 2 → stop: "No board data found — run `/sync` first". Print `display`.

**Steps 2–7 — read `${CLAUDE_PLUGIN_ROOT}/knowledge/discover-authoring/references/discover-workflow.md` NOW and follow it exactly; improvise nothing.** Step map: **2 Frame** — one AskUserQuestion (choose for me / show the menu; the lens), skipped by `--auto` and wherever no prompt can be answered · **3 Pick** — auto takes the ★ set; the menu is two multi-select questions over the Id column · **4 Briefs** — `--briefs <ids> --rules …` · **5 Author** — waves of ≤4 `insight-author` agents (Task), one brief each; inline and sequential when Task is unavailable · **6 Push in order** — `--save-insight` / `--push-context-board`, both `--require-pack --push`; exit 3 → fix once, else mark failed and continue · **7 Report** — `--report`, verbatim.

**Close:** `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-status.js --after discover --domain connect` — print verbatim.

## Connect-now offer

Trigger: not configured, or `errorType: "auth_invalid"`. AskUserQuestion "Connect to ProvenMap now?":

- **Connect now** → browser login: each `display` **in your reply**: `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-login.js --start`, then `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-login.js --poll --host claude --domain connect` (timeout ~250s). `complete` → resume the failed step; else stop (display explains).
- **Not now** → stop: "ProvenMap not configured — run `/login` (browser) or `/configure` (manual) first" (rejected: "Your ProvenMap credentials were rejected — run `/login` to reconnect").
