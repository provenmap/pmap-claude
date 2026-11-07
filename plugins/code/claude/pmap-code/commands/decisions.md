---
category: build
description: "Build · Compile the accepted architecture decisions (ADRs) that govern this app into skills your agent loads. WRITE-CAPABLE: writes ADR skill files; replaces local edits to them."
argument-hint: [--check]
allowed-tools: Read, Bash, AskUserQuestion
---

Pull the accepted ADRs that govern this app and compile each into a skill; remove the skills of ADRs since deprecated or superseded. A compiled ADR is the decision's words: a local edit is replaced, and a wrong rule is fixed by a superseding ADR, never here. Proposed decisions never reach the repo.

## Workflow

### Step -1: Preflight — binding, branch, local state

Preflight gate — act on its exit code.

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-preflight.js
```

Print the JSON's `display` field **verbatim** — do not reformat, reorder, or summarise it. 0 → continue (`display` already reports any `repairs.boardsRecovered` restore) · 1 (not connected / credentials rejected) → **connect-now offer** (below) · 2 (binding unverified) → print `error` verbatim and stop; see `/status` for the full picture · 11 (branch mismatch) → print `display` verbatim, then AskUserQuestion per the branch-mismatch prompt in `${CLAUDE_PLUGIN_ROOT}/knowledge/provenmap-integration/SKILL.md`.

### Step 1: Run the CLI

Read `boardSlug` from `.provenmap/config.json`. Compile (default):

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-decisions.js --compile --host claude --board-slug <boardSlug>
```

With `--check` (read-only — reports `fresh`, `toCompile[]`, `toRemove[]`; writes nothing):

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-decisions.js --check --host claude --board-slug <boardSlug>
```

Exit codes:

- **Exit code 1** → not configured — make the **connect-now offer** (below).
- **Exit code 3** → stop, report `error`. `errorType: "auth_invalid"` → credentials rejected — make the **connect-now offer** (below).
- If `featureAvailable` is `false` → stop and tell the user: "This ProvenMap server doesn't expose decisions yet — ask your admin to upgrade".

### Step 2: Report the result

Print each entry of `lines` **verbatim**, one per line. None → "The compiled decisions are current (`inForce` listed)". If `replacedEdits` is non-empty, say the decision's words are not edited in the repo: a change is a decision that supersedes it, written by the architect. Remind to **commit** the files under `configDir`. `--check`: relay `fresh`, `toCompile`, `toRemove`.

CLI owns writing; never edit an ADR skill yourself.

**Outcome:** `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-status.js --brief --command decisions` → Done · Left · Next, per `${CLAUDE_PLUGIN_ROOT}/knowledge/outcome/SKILL.md`.

## Connect-now offer

Trigger: not configured, or `errorType: "auth_invalid"`. AskUserQuestion "Connect to ProvenMap now?":

- **Connect now** → browser login: each `display` **in your reply**: `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-login.js --start`, then `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-login.js --poll --host claude --domain code` (timeout ~250s). `complete` → resume the failed step; else stop (display explains).
- **Not now** → stop: "ProvenMap not configured — run `/login` (browser) or `/configure` (manual) first" (rejected: "Your ProvenMap credentials were rejected — run `/login` to reconnect").
