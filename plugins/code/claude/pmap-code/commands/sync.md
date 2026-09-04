---
category: map
description: "Map · Sync architecture analysis to ProvenMap"
argument-hint: [--board <slug> | --all]
allowed-tools: Read, Bash(node:*), AskUserQuestion
---

Print every `display` verbatim; branch only on exit codes and named fields.

**Modes:** `--board <slug>` = that board; `--all` = every in-scope board; none = the only board, else list them and ask which.

**0 Preflight** — `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-preflight.js`: 0 → go (`repairs.boardsRecovered` non-empty = state restored from the server, per its `display`); 1 (not connected / credentials rejected) → **connect-now offer**; 2 (binding unverified) → print `error`, stop, name `/status`; 11 branch mismatch → AskUserQuestion per the branch-mismatch prompt in `${CLAUDE_PLUGIN_ROOT}/knowledge/provenmap-integration/SKILL.md`.

**1 Config** — read `.provenmap/config.json` (`boardSlug`, `branch`, `baseUrl`, credentials); missing, or no `boardSlug` → **connect-now offer**. **2 Manifest** — read `.provenmap/boards/manifest.json` (the boards and their `layer`); missing → stop, name `/analyze`.

**Steps 2.5–6 — read `${CLAUDE_PLUGIN_ROOT}/knowledge/claude-code-plugin-sync/references/sync-workflow.md` NOW and follow it exactly; improvise nothing.** It holds every call, flag, branch, prompt, and rule: **2.5** binding-scope check — the **user** chooses migrate / clean slate / skip; only in-scope boards sync · **3** pick the mode's boards · **3.5** board URLs + orphaned child boards · **3.6** archetype attributes — `pmap-archetypes.js --fields`, then per board `pmap-prepass.js --attributes <slug> --apply` (exit 1/3 → report, keep the board, continue) · **3.8** integrity gate (`pmap-prepass.js --validate`) — **exit 3 stops the sync: push nothing** · **4** push ascending by `layer`, ≤3 concurrent per layer (`pmap-sync.js`; `--no-verify` skips the read-back, discouraged) · **5** parse the CLI JSON — always surface `conflicts`, `deletedOnServer`, `verify`, `replaceFullPayload` · **6** report each board, then coverage, styling, orphaned boards.

**`pmap-sync.js` exits** — 0 success. 1 config error → **connect-now offer**; a **branch mismatch** and an **out-of-scope board** also exit 1 — relay `error` verbatim (it names the fix; config is fine), and offer Step 2.5's cleanup for out-of-scope. 2 analysis file error → name `/analyze`. 3 validation error → relay `error` verbatim; `Invalid archetypes:` → the reference's Step 5 catalogue-gap sentence, then stop; never alter the server or its DB. 4 API error → relay `error` verbatim; the CLI already retries transient failures and maps HTTP errors; don't re-derive them. `errorType: "auth_invalid"` → **connect-now offer**. `errorType: "forbidden"` → surface the server's message verbatim, never offer re-login; repair per the reference's *inconsistent board tree* section.

**Outcome:** `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-status.js --brief --domain code --command sync` → Done · Left · Next, per `${CLAUDE_PLUGIN_ROOT}/knowledge/outcome/SKILL.md`.

## Connect-now offer

Trigger: not configured, or `errorType: "auth_invalid"`. AskUserQuestion "Connect to ProvenMap now?":

- **Connect now** → browser login: each `display` **in your reply**: `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-login.js --start`, then `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-login.js --poll --host claude --domain code` (timeout ~250s). `complete` → resume the failed step; else stop (display explains).
- **Not now** → stop: "ProvenMap not configured — run `/login` (browser) or `/configure` (manual) first" (rejected: "Your ProvenMap credentials were rejected — run `/login` to reconnect").
