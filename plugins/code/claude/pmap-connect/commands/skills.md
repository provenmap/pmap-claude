---
category: build
description: "Build · Compile this project's ProvenMap skills into the repo. WRITE-CAPABLE: writes IDE-native skill files (never overwrites your local edits)."
argument-hint: [--status]
allowed-tools: Read, Bash, AskUserQuestion
---

Fetch this project's composed external skills and auxiliary agent-context files into the repo without overwriting local edits. Details: `${CLAUDE_PLUGIN_ROOT}/knowledge/provenmap-integration/SKILL.md`.

## Workflow

### Step -1: Preflight — binding, branch, local state

Board-state command; the preflight gate is script-enforced — act on its exit code.

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-preflight.js
```

Print the JSON's `display` field **verbatim** — do not reformat, reorder, or summarise it. 0 → continue (`display` already reports any `repairs.boardsRecovered` restore) · 1 (not connected / credentials rejected) → **connect-now offer** (below) · 2 (binding unverified) → print `error` verbatim and stop; see `/status` for the full picture · 11 (branch mismatch) → print `display` verbatim, then AskUserQuestion per the branch-mismatch prompt in `${CLAUDE_PLUGIN_ROOT}/knowledge/provenmap-integration/SKILL.md`.

### Step 0: Choose the mode

- Default (no arguments or `--sync`): fetch, verify (tree hash), and write the composed
  skills, rules, hooks and agents into their host folders.
- `--status`: read-only — repo-current / platform-changed / locally-edited report; writes nothing.

Read `boardSlug` from `.provenmap/config.json`.

### Step 1: Run the CLI

For a sync (default):

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-skills.js --sync --board-slug <boardSlug>
```

For status only:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-skills.js --status --board-slug <boardSlug>
```

Exit codes:

- **Exit code 1** → not configured — make the **connect-now offer** (below).
- **Exit code 3** → stop, report `error`. `errorType: "auth_invalid"` → credentials rejected — make the **connect-now offer** (below).
- If `featureAvailable` is `false` → stop and tell the user: "This ProvenMap server doesn't expose skills yet — ask your admin to upgrade".

### Step 2: Report the result

If `withheld.count > 0`: "`<count>` external skill(s) need a newer plugin — run `/update`". Print `note` verbatim. `--sync`: relay `written`/`updated`/`deleted`/`unchanged`, `orphansKept[]`, `foreign[]`, and `preservedOnFailure[]`; remind to **commit**. If `externalSkills > 0`: "N external skill(s) fetched from GitHub and verified". If `thirdPartyScripts`: list scripts and hooks as a warning. If `externalFailed`: list each `sourceSlug`+`reason`; say re-run retries, while a tree-hash mismatch requires curator re-pin. `--status`: relay `inSync`, `upstreamChanged`, `locallyModified[]`, `missing[]`, and `externalSkills`.

CLI owns writing; never edit a skill file yourself.

**Close:** `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-status.js --after skills --domain connect` — print verbatim.

## Connect-now offer

Trigger: not configured, or `errorType: "auth_invalid"`. AskUserQuestion "Connect to ProvenMap now?":

- **Connect now** → browser login: each `display` **in your reply**: `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-login.js --start`, then `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-login.js --poll --host claude --domain connect` (timeout ~250s). `complete` → resume the failed step; else stop (display explains).
- **Not now** → stop: "ProvenMap not configured — run `/login` (browser) or `/configure` (manual) first" (rejected: "Your ProvenMap credentials were rejected — run `/login` to reconnect").
