---
category: build
description: "Build · Pull architect-authored intents for your board and implement them in this project. WRITE-CAPABLE: edits project files, with your approval at each step"
argument-hint: [<intentId> | --list]
allowed-tools: Read, Glob, Grep, Edit, Write, Bash, AskUserQuestion
---

**Write-capable.** No edit before the user picks an intent and you claim it; show every change; no resolution before they see the outcome and say yes.

Print every `display` verbatim; branch only on exit codes and named fields.

**-1 Preflight** — `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-preflight.js`: 0 → go; 1 (not connected / credentials rejected) → **connect-now offer**; 2 (binding unverified) → print `error`, stop, name `/status`; 11 (branch mismatch) → AskUserQuestion per the branch-mismatch prompt in `${CLAUDE_PLUGIN_ROOT}/knowledge/provenmap-integration/SKILL.md`.

**0 Pull** — `boardSlug` from `.provenmap/config.json`, then `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-intents.js --list --board-slug <boardSlug>`. Exit 1, or exit 3 with credentials rejected → **connect-now offer**; other exit 3, `featureAvailable: false`, or `count: 0` → stop. `intents[]` is in pick order.

**1 Pick** — an intent id in the command argument → Step 2. Else `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-intents.js --select-start` (`notAvailable: true` → fallback), then `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-intents.js --select-poll --max-wait 240` (~250s Bash timeout): `complete` → already claimed, payload included — Step 2 gate, then Step 5; `pending` → re-run, ask the user before giving up; exit 2 (denied/expired) → `--select-start` again or fallback; exit 3 → stop. **Fallback:** AskUserQuestion, top 3 of `intents[]` (label = name, description = priority/status + summary), "Other" = another # or id.

**Steps 2–8 — read `${CLAUDE_PLUGIN_ROOT}/knowledge/intent-gap-review/references/implementation-workflow.md` NOW and follow it exactly; improvise nothing.** It holds every CLI call, branch, prompt, and rule: **2** gate the pick (`stale` → user's explicit override) · **3** claim (single-winner) · **4** show + map to source · **4.5** gap review — mandatory, never edit before it · **5** implement (user approves each edit) · **6** verify + record evidence · **7** resolve — only after the user confirms · **8** reject / other-resolution (user-approved `--note`).

**Resolution exits** — 0 recorded; 1 `verifyRequired: true` (implemented only) → evidence first, Step 6; 2 not found → re-run `--list`; 3 unresolvable status (claim first), API error, or `notAvailable: true` → say the decision was NOT recorded.

**Outcome:** `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-status.js --brief --domain code --command intents` → Done · Left · Next, per `${CLAUDE_PLUGIN_ROOT}/knowledge/outcome/SKILL.md`.

## Connect-now offer

Trigger: not configured, or `errorType: "auth_invalid"`. AskUserQuestion "Connect to ProvenMap now?":

- **Connect now** → browser login: each `display` **in your reply**: `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-login.js --start`, then `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-login.js --poll --host claude --domain code` (timeout ~250s). `complete` → resume the failed step; else stop (display explains).
- **Not now** → stop: "ProvenMap not configured — run `/login` (browser) or `/configure` (manual) first" (rejected: "Your ProvenMap credentials were rejected — run `/login` to reconnect").
