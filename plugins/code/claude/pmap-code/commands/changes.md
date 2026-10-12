---
category: understand
description: "Understand · Read this repo's git history into change periods — who did what, when, which rules fired — one record per week or month, pushed to ProvenMap"
argument-hint: "[--since <date>] [--recompute] [--facts-only]"
allowed-tools: Read, Bash(node:*), AskUserQuestion, Task
---

Print every `display` verbatim; branch only on exit codes and named JSON fields. `pmap-changes.js` always exits 0: a period never stops a run.

**0 Preflight** — `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-preflight.js`: 0 → go; 1 (not connected / credentials rejected) → **connect-now offer**; 2 (binding unverified) → print `error`, stop, name `/status`; 11 branch mismatch → AskUserQuestion per the branch-mismatch prompt in `${CLAUDE_PLUGIN_ROOT}/knowledge/provenmap-integration/SKILL.md`.

**Steps 1–3 — read `${CLAUDE_PLUGIN_ROOT}/knowledge/claude-code-plugin-sync/references/change-periods.md` NOW and follow it exactly; improvise nothing.** It holds every flag, branch, the writing rules and the prose budget.

- **1 Compute** — `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-changes.js --model <the model you run as> --host claude --domain code`, passing through `--since`, `--recompute` and `--facts-only` from the command argument. `changes: "none"` → say its `detail` in one line and go to the Outcome (`older_server`: this ProvenMap server predates change periods; `not_a_git_repo` and `nothing_missing` are not errors). `changes: "written"` → the draft at `draftPath`; `fill` lists every sentence to write, newest period first.
- **2 Prose** — up to 24 `fill` entries: read each entry's `read` in the draft and write its sentence (or, for a slot with `accepts`, one of those words) inline, by the reference's rules, through `--fill <draftPath> --prose <n>="<sentence>"`. More than 24: write the first 24 inline, then the rest in waves of ≤4 `change-period-author` agents (Task), **one agent per period**, each told the draft path, its `period` index and its slot numbers; inline and sequential when Task is unavailable. `--facts-only`: skip this step. Null beats a guess: leave a slot out rather than invent.
- **3 Send** — `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-changes.js --send <draftPath>`: print `display` verbatim. `changes: "unsent"` → relay `detail`; the draft is kept, say `--send` can be retried.

**Outcome:** `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-status.js --brief --command changes` → Done · Left · Next, per `${CLAUDE_PLUGIN_ROOT}/knowledge/outcome/SKILL.md`.

## Connect-now offer

Trigger: not configured, or `errorType: "auth_invalid"`. AskUserQuestion "Connect to ProvenMap now?":

- **Connect now** → browser login: each `display` **in your reply**: `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-login.js --start`, then `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-login.js --poll --host claude --domain code` (timeout ~250s). `complete` → resume the failed step; else stop (display explains).
- **Not now** → stop: "ProvenMap not configured — run `/login` (browser) or `/configure` (manual) first" (rejected: "Your ProvenMap credentials were rejected — run `/login` to reconnect").
