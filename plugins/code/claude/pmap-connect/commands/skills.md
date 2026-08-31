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

Print the JSON's `display` field **verbatim** — do not reformat, reorder, or summarise it.

| exit | meaning | action |
| ---- | ------- | ------ |
| 0 | Proceed | Continue; `display` already reports any `repairs.boardsRecovered` restore. |
| 1 | Not connected, or credentials rejected | Make the **connect-now offer** (below). |
| 2 | Binding could not be verified | Print `error` verbatim and stop; see `/status` for the full picture. |
| 11 | Branch mismatch | Print `display` verbatim, then AskUserQuestion per the branch-mismatch prompt in `${CLAUDE_PLUGIN_ROOT}/knowledge/provenmap-integration/SKILL.md`. |

### Step 0: Choose the mode

- Default (no arguments or `--sync`): fetch composition metadata and auxiliary files,
  download each immutable external source, apply resolved parameters, verify its tree hash,
  route skills/rules/hooks/agents to their host folders, and write the result.
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

## Connect-now offer

On config-missing or `errorType: "auth_invalid"`, AskUserQuestion "Connect to ProvenMap now?" (**Connect now** / **Not now**):

- **Connect now** → `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-login.js --start`, then `--poll --host claude --domain connect` (250s timeout). Print each `display` verbatim. On `status: "complete"` resume; else stop.
- **Not now** → "ProvenMap not configured — run `/login` or `/configure` first" (rejected: "run `/login` to reconnect").
