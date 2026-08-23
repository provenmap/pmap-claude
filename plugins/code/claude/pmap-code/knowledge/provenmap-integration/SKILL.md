---
name: provenmap-integration
user-invokable: false
description: Integrates with the Claude Code Plugin API to push architecture data for visualization on ProvenMap workboards. Use when user asks to "sync to ProvenMap", "push architecture to portal", "configure API", "connect to portal", "upload nodes", or "sync edges". Provides API patterns, authentication, and sync protocols.
license: MIT
compatibility: Claude Code plugin. Requires Node.js 18+ for bundled scripts.
metadata:
  author: ProvenMap
  version: 0.2.0
---

# ProvenMap Integration

## Overview

This skill provides guidance for integrating with the Claude Code Plugin API to push architecture data to ProvenMap workboards.

---

## Authentication

Store credentials in `.provenmap/config.json`:

```json
{
  "bindingToken": "YWJjMTIzLXV1aWQ6ZGVmNDU2LXV1aWQ",
  "apiSecret": "ck_cp_live_your_api_secret_here",
  "baseUrl": "https://platform.provenmap.com/api",
  "branch": "main",
  "boardSlug": "my-project-overview",
  "excludePaths": [
    "node_modules",
    "dist"
  ],
  "includeTests": false,
  "includeSourceReferences": true
}
```

`/configure` scaffolds the file with empty credentials and working defaults — the empty
fields are intentional, the user fills them in:

```json
{
  "bindingToken": "", "apiSecret": "", "boardSlug": "",
  "baseUrl": "https://platform.provenmap.com/api", "branch": "main",
  "excludePaths": ["node_modules", "dist", ".git", "coverage"],
  "includeTests": false, "includeSourceReferences": true
}
```

### Request Headers

All API requests require header-based authentication:

```
X-CodePlugin-Token: {bindingToken}
X-CodePlugin-Secret: {apiSecret}
Content-Type: application/json
```

---

## API Endpoints

| Method | Endpoint                    | Description              |
| ------ | --------------------------- | ------------------------ |
| POST   | `/code-plugin/push`       | Push nodes and edges     |
| GET    | `/code-plugin/archetypes` | Get available archetypes |
| GET    | `/code-plugin/elements`   | Get existing nodes/edges |

### Push Modes

| Mode      | Behavior                                |
| --------- | --------------------------------------- |
| `merge`   | Create or update by slug, keep existing |
| `replace` | Delete all existing, create new         |

See `references/api-reference.md` for complete endpoint documentation with request/response examples.

### Data Transformation

When converting from internal format to ProvenMap:

| Internal Field         | ProvenMap Field   | Notes                                                   |
| ---------------------- | -------------------- | ------------------------------------------------------- |
| `node.id`              | `slug`               | Direct mapping                                          |
| `node.name`            | `name`               | Direct mapping                                          |
| `node.type`            | `archetypeName`      | service→Container, component→Component, external→System |
| `node.type` + children | `primitiveType`      | 'container' if has children, else 'node'                |
| `node.parent`          | `parentNodeSlug`     | Direct mapping                                          |
| `node.path`            | `sourceReferences[]` | Wrap in array                                           |
| `edge.sourceSlug`      | `sourceSlug`         | Direct mapping (pass-through)                           |
| `edge.targetSlug`      | `targetSlug`         | Direct mapping (pass-through)                           |
| `edge.type`            | `relation`           | Direct mapping                                          |
| -                      | `edge.archetypeName` | Always "Relationship"                                   |

---

## Sync Workflow

### Full Sync

1. **Load configuration** - Read ProvenMap credentials
2. **Load board manifest** - Read `.provenmap/boards/manifest.json`
3. **Load analysis data** - Read `.provenmap/boards/<board-slug>.json`
4. **Transform data** - Convert internal format to ProvenMap format
5. **Push data** - Single push via `/code-plugin/push` with `--board-slug`
6. **Update status** - Save sync results to board store

### Status Tracking

Sync state is stored per-board in `.provenmap/boards/stores/<board-slug>.store.json`. Changed files are detected on-demand via `git diff` against the `analyzedAtCommit` hash stored in board metadata.

---

## Error Handling

| Status | Meaning                         | Action                            |
| ------ | ------------------------------- | --------------------------------- |
| 400    | Invalid payload/branch mismatch | Check request format              |
| 401    | Invalid credentials             | Verify bindingToken and apiSecret |
| 403    | Access denied                   | Check binding permissions         |
| 404    | Binding not found               | Verify configuration              |
| 422    | Invalid data format             | Validate node/edge structure      |

---

## Configuration Reference

| Field          | Required | Default                   | Description                 |
| -------------- | -------- | ------------------------- | --------------------------- |
| `bindingToken` | Yes      | -                         | Combined auth token from UI — base64url-encoded `workspaceId::bindingId` |
| `apiSecret`    | Yes      | -                         | API secret — `ck_cp_live_` followed by an alphanumeric string |
| `baseUrl`      | No       | https://platform.provenmap.com/api | API endpoint                |
| `branch`       | Yes      | -                         | Git branch name — must match the branch configured on the binding |
| `boardSlug`    | Yes      | -                         | Target board — `/configure` can discover and write it for you |
| `excludePaths` | No       | []                        | Paths to exclude            |
| `includeTests` | No       | false                     | Include test files          |
| `includeSourceReferences` | No | true                  | Attach source references (file paths / document anchors) to synced nodes/edges; set `false` to omit them |

`analysis.subagentModel` (optional) pins the model used for every parallel analysis
subagent in `/analyze` drill-downs; unset = per-layer defaults.


---

## Credential Setup and Reconfiguration

### Where the values come from

A ProvenMap source must already be created and bound to a workboard (do this in the
ProvenMap UI first if it isn't yet). Once bound, open the board's hub → the binding's
row → **Copy credentials**. The secret is shown **once** — at binding creation or after
"Regenerate secret & copy" (regenerating disconnects any other binding on the same
source until it re-copies). The dialog's `.provenmap/config.json` snippet matches the
fields in Authentication above exactly.

Credentials live in ONE place — the config file, never the chat.

### Reconfiguring an already-configured project

`/configure` offers four routes when `.provenmap/config.json` already has credentials:

- **Switch to a different board (browser)** — re-bind this project to another board
  without hand-editing credentials. This re-resolves the full credential triple
  (`bindingToken` + `apiSecret` + `boardSlug`), since a different board is a different
  binding with its own secret. The `--rebind` flag is what unlocks the board picker —
  without it, a bound project's login is authentication-only:
  1. Run `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-login.js --start --rebind --host claude --domain code --plugin-version 0.10.14` and print the JSON `display` field verbatim in your reply — the Bash output panel is collapsed for the user (the browser opens best-effort).
  2. After they sign in, pick the new board, and confirm, run `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-login.js --poll --host claude --domain code` (give the Bash call ~250s; re-run on `status: "pending"`). Print `display` verbatim.
  3. On `status: "complete"`, the config now points at the newly selected board — the `display` panel already shows it.
- **Update specific fields** — have the user edit `.provenmap/config.json`, then confirm
  and re-verify.
- **Re-run verification** against the current file.
- **Cancel** and keep the existing configuration.

---

## Skills Compilation

`/skills` compiles the platform's composed skill bundle — ProvenMap defaults, then your
org's customizations, then this app's own overrides — into IDE-native skill files under
the host skills directory (Claude Code: `.claude/skills/`).

### Never-clobber

A committed lock manifest (`pmap-skills.lock.json`) records the hash of every file the
command wrote. On each run: a managed file you have NOT touched is refreshed; a file you
HAVE edited is left exactly as-is and reported back. The command only manages files it
wrote — anything else in the skills directory is untouched. Commit the compiled skills
and the lock file so the whole team and every agent session share them.

### Result fields (`pmap-skills.js --sync` / `--status`)

| Field | Meaning |
| ----- | ------- |
| `note` | Ready-to-print sentence covering local edits, a foreign `CLAUDE.md`, and unsupported-host files, when any apply |
| `withheld.count` | Skill file(s) withheld because they need a newer plugin build; these are script/asset files this plugin build can't accept yet — everything else synced normally |
| `written` / `updated` / `deleted` / `unchanged` | Sync counts by outcome |
| `orphansKept[]` | Files the platform dropped but you had edited, so they were kept |
| `foreign[]` | Files that already existed at a managed path but this command never wrote — left alone |
| `localEdits[]` | Files with local edits, left untouched; reconcile by adopting the edits on the platform (app-tier override) or discarding them and re-running `/skills` |
| `inSync` (status) | `true` when disk matches the lock and the server manifest |
| `upstreamChanged` (status) | `true` when the platform's skills changed since the last sync |
| `locallyModified[]` (status) | Files you have edited (protected on the next sync) |
| `missing[]` (status) | Managed files deleted from disk (a sync restores them) |

## Branch-Mismatch Prompt

When a command's preflight check (`pmap-preflight.js`) exits 11, print its `display`
field verbatim, then ask via **AskUserQuestion**:

- Header: `Branch`
- Question: `"This project is bound to a different branch. How do you want to proceed?"`
- Options: **Re-bind to this branch (`/login`)** — run the `/login` workflow inline, then
  re-run the preflight step; **Stop — I'll switch branches myself** — stop; the
  `git switch` line is already printed in `display`. Never run `git switch` yourself: the
  working tree may be dirty.

## Examples

### Example 1: Push architecture analysis to ProvenMap

User says: "Sync my analysis to ProvenMap"

Actions:
1. Load configuration from `.provenmap/config.json`
2. Load analysis data from `.provenmap/boards/<board-slug>.json`
3. Transform nodes and edges to ProvenMap format
4. Push via `POST /code-plugin/push` with smart sync (diff-based)

Result: Architecture data synced — nodes created/updated, edges linked on the workboard

### Example 2: Configure API connection

User says: "Connect to ProvenMap"

Actions:
1. Read credentials from `.provenmap/config.json`
2. Validate by fetching archetypes from API
3. Discover root board from server
4. Write `.provenmap/config.json` with credentials

Result: Configuration saved, connection verified, ready for `/analyze` and `/sync`

## Troubleshooting

### Error: 401 Invalid credentials
**Cause:** bindingToken or apiSecret is incorrect or expired
**Solution:** Re-run `/configure` with fresh credentials from the ProvenMap UI

### Error: 400 Branch mismatch
**Cause:** The binding pins one git branch and you are on another — the server rejects pushes from any other branch
**Solution:** `git switch <pinned-branch>` to work on the branch this board maps, or `/login` to re-bind this project to a binding pinned to the branch you're on

### Error: 422 Invalid data format
**Cause:** Nodes or edges have invalid structure (missing slug, bad archetypeName)
**Solution:** Run `/analyze --clean` to regenerate analysis, then retry `/sync`

## Additional Resources

### Reference Files

- **`references/api-reference.md`** - Complete API endpoint documentation
- **`references/error-codes.md`** - Error handling guide
