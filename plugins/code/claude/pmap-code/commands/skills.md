---
category: build
description: "Build · Compile this project's ProvenMap skills into the repo. WRITE-CAPABLE: writes IDE-native skill files (never overwrites your local edits)."
argument-hint: [--status]
allowed-tools: Read, Bash, AskUserQuestion
---

Write this project's ProvenMap **skills** into the repo. A skill is composed on the platform from three tiers — ProvenMap defaults, your org's customizations, and this app's own overrides — and this command compiles that into IDE-native skill files under the host skills directory (for Claude Code: `.claude/skills/`).

**Never-clobber is the whole point.** A committed lock manifest (`pmap-skills.lock.json`) records the hash of every file this command wrote. On each run it compares each file on disk against that lock: a managed file you have NOT touched is refreshed; a file you HAVE edited is left exactly as-is and reported. This command never overwrites your local edits, and it only manages files it wrote — anything else in the skills directory is untouched.

## Workflow

### Step -1: Preflight — binding, branch, local state

This command touches board state, so it runs behind the preflight gate. The gate is **enforced by a
script, not by prose** — run it and react to its exit code; never decide on your own that the
project is fine.

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-preflight.js
```

Print the JSON's `display` field **verbatim** — do not reformat, reorder, or summarise it.

| exit | meaning | action |
| ---- | ------- | ------ |
| 0 | Proceed | Continue to the next step. If `repairs.boardsRecovered` is non-empty, local state was just restored from the server — say so once (the `display` already carries the sentence) and continue. |
| 1 | Not connected, or credentials rejected | Make the **connect-now offer**: AskUserQuestion "Connect to ProvenMap now?" → **Connect now** runs `pmap-login.js --start` then `--poll` inline (print each `display` verbatim) and resumes this command on `status: "complete"`; **Not now** stops with the `error` sentence verbatim. |
| 2 | Binding could not be verified | Print `error` verbatim and stop. Name `/status` for the full local picture. |
| 11 | Branch mismatch | Print `display` verbatim, then ask via AskUserQuestion. Header: `Branch`. Question: `"This project is bound to a different branch. How do you want to proceed?"` Options: **Re-bind to this branch (`/login`)** — run the `/login` workflow inline, then re-run this step; **Stop — I'll switch branches myself** — stop, having already printed the `git switch` line. Never run `git switch` yourself: the working tree may be dirty. |

### Step 0: Choose the mode

- Default (no arguments or `--sync`): fetch the compiled bundle and write it into the repo.
- `--status`: read-only — report whether the repo is up to date, whether the platform's skills changed, and which files you have edited locally. Writes nothing.

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

Check the exit code and JSON output:

- **Exit code 1** → not configured — make the **connect-now offer** (see the end of this file).
- **Exit code 3** → stop and report the API error from the JSON `error` field. If `errorType` is `auth_invalid`, the credentials were rejected — make the **connect-now offer** (see the end of this file).
- If `featureAvailable` is `false` → stop and tell the user: "This ProvenMap server doesn't expose skills yet — ask your admin to upgrade".

### Step 2: Report the result

**On `--sync`**, summarize from the JSON:

- If `withheld.count > 0` → tell the user: "`<withheld.count>` skill file(s) need a newer plugin — run `/update`". These are script/asset files this plugin build can't accept yet; everything else synced normally.
- `written` / `updated` / `deleted` / `unchanged` — files created, refreshed, removed, or already current under `skillsDir`.
- **`localEdits[]`** — files you have edited that were **left untouched**. If non-empty, show the `note` and tell the user: "These skill files have local edits and were not overwritten. To reconcile: either adopt your edits on the platform (so they become an app-tier override) or discard your local changes and re-run `/skills`."
- `foreign[]` — files that already existed at a managed path but this command never wrote, so they were left alone. Mention them if present.
- `orphansKept[]` — files the platform dropped but you had edited, so they were kept.

Remind the user that the compiled skills (and `pmap-skills.lock.json`) are meant to be **committed** so the whole team and every agent session share them.

**On `--status`**, report:

- If `withheld.count > 0` → "`<withheld.count>` skill file(s) need a newer plugin — run `/update`".
- `inSync: true` → "Skills are up to date."
- `upstreamChanged: true` → "The platform's skills changed — run `/skills` to pull them."
- `locallyModified[]` → list the files the user has edited (these will be protected on the next sync).
- `missing[]` → managed files that were deleted from disk (a sync will restore them).

Do not edit any skill file yourself — the CLI owns writing. Your job is to run it and explain the result.

## Connect-now offer

Used whenever ProvenMap is not configured or the credentials were rejected (`errorType: "auth_invalid"`). Ask with **AskUserQuestion** — "Connect to ProvenMap now?" (**Connect now** / **Not now**):

- **Connect now** → run the browser login here, printing each JSON `display` verbatim **in your reply** (the Bash output panel is collapsed for the user): `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-login.js --start`, then `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-login.js --poll --host claude --domain code` (generous Bash timeout, e.g. 250s). On `status: "complete"`, resume this command from the step that failed; anything else — stop, the display explains.
- **Not now** → stop with the canonical message: "ProvenMap not configured — run `/login` (browser) or `/configure` (manual) first" (or, when credentials were rejected: "Your ProvenMap credentials were rejected — run `/login` to reconnect").
