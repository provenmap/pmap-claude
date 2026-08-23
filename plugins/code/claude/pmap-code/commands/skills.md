---
category: build
description: "Build · Compile this project's ProvenMap skills into the repo. WRITE-CAPABLE: writes IDE-native skill files (never overwrites your local edits)."
argument-hint: [--status]
allowed-tools: Read, Bash, AskUserQuestion
---

Compile this project's ProvenMap **skills** into the repo without overwriting local edits. Details: `${CLAUDE_PLUGIN_ROOT}/knowledge/provenmap-integration/SKILL.md`.

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

- Default (no arguments or `--sync`): fetch the compiled bundle and write it into the repo.
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

If `withheld.count > 0`, tell the user: "`<withheld.count>` skill file(s) need a newer plugin — run `/update`". Print `note` verbatim if present. `--sync`: relay `written`/`updated`/`deleted`/`unchanged`, `orphansKept[]`, `foreign[]`; remind the user to **commit** the skills + lock file. `--status`: relay `inSync`, `upstreamChanged`, `locallyModified[]`, `missing[]` (meanings above).

CLI owns writing; never edit a skill file yourself.

## Connect-now offer

Used whenever ProvenMap is not configured or the credentials were rejected (`errorType: "auth_invalid"`). Ask with **AskUserQuestion** — "Connect to ProvenMap now?" (**Connect now** / **Not now**):

- **Connect now** → run the browser login here, printing each JSON `display` verbatim **in your reply** (the Bash output panel is collapsed for the user): `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-login.js --start`, then `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-login.js --poll --host claude --domain code` (generous Bash timeout, e.g. 250s). On `status: "complete"`, resume this command from the step that failed; anything else — stop, the display explains.
- **Not now** → stop with the canonical message: "ProvenMap not configured — run `/login` (browser) or `/configure` (manual) first" (or, when credentials were rejected: "Your ProvenMap credentials were rejected — run `/login` to reconnect").
