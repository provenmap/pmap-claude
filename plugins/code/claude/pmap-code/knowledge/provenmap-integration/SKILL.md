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

Two files under `.provenmap/`. The credential pair lives in `credentials.json`
(owner-read-only, mode 0600, written by `/login`); settings live in `config.json`.
Environment variables (`PMAP_BINDING_TOKEN`, `PMAP_API_SECRET`, `PMAP_BOARD_SLUG`,
`PMAP_BRANCH`, `PMAP_BASE_URL`) override both files — headless hosts and CI need nothing else.

`.provenmap/credentials.json`:

```json
{
  "bindingToken": "YWJjMTIzLXV1aWQ6ZGVmNDU2LXV1aWQ",
  "apiSecret": "ck_cp_live_your_api_secret_here"
}
```

`.provenmap/config.json`:

```json
{
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

A `bindingToken`/`apiSecret` left in `config.json` is ignored — the install reads as not
connected and `/status` says why. `/configure` scaffolds `config.json` with working
defaults and an empty `boardSlug` (intentional, `/configure` fills it in):

```json
{
  "boardSlug": "",
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

| Field          | File               | Required | Default                   | Description                 |
| -------------- | ------------------ | -------- | ------------------------- | --------------------------- |
| `bindingToken` | `credentials.json` | Yes      | -                         | Combined auth token from UI — base64url-encoded `workspaceId::bindingId` |
| `apiSecret`    | `credentials.json` | Yes      | -                         | API secret — `ck_cp_live_` followed by an alphanumeric string |
| `baseUrl`      | `config.json`      | No       | https://platform.provenmap.com/api | API endpoint                |
| `branch`       | `config.json`      | Yes      | -                         | Git branch name — must match the branch configured on the binding |
| `boardSlug`    | `config.json`      | Yes      | -                         | Target board — `/configure` can discover and write it for you |
| `excludePaths` | `config.json`      | No       | `node_modules`, `dist`, `.git`, `coverage` (written by `/login`) | Repo-relative directories the walk never enters (a path and everything under it) |
| `includeTests` | `config.json`      | No       | false                     | Off: test-named files and test trees (`test/`, `tests/`, `spec/`, `__tests__/`, `e2e/`, `*-tests/`, `*.Tests/`) are not indexed |
| `includeSourceReferences` | `config.json` | No | true                  | Attach source references (file paths / document anchors) to synced nodes/edges; set `false` to omit them |

`/login` writes the project settings above plus `analysis.subagentModel`, adding only
the keys the file lacks — a value already set is never rewritten. It also writes
`"$schema": "./config.schema.json"`; that file (kept current by the board commands) lists every
setting with its default, so the user's editor completes each key. The settings below
stay out of `config.json` until the user wants a different value: add the key to
override it, delete it to return to the default. Never write one at its default — a
written value is a pin, and the project would stop following a retuned default.

- `analysis.subagentModel` pins the model used for every parallel analysis subagent in
  `/analyze` drill-downs — seeded with this host's fast analysis model (none on
  Cursor); set it to `""` for per-layer defaults.
- `analysis.plan` holds the tree plan's knobs: `maxDepth` (4 — the deepest layer planned,
  L0 being the bound board; `null` plans as deep as the code demands), `unitFloor` (12 significant files to be a board),
  `maxParallel` (4) and `maxBoardsPerRun` (25) for `--auto`. `maxDepth` and `unitFloor`
  shape the plan only when it is first computed: changed later, planned boards stay
  planned (a lower cap removes none; a higher one adds boards only as proposals to
  accept) — to apply them to an existing plan, re-plan with `/analyze --clean`.
- `analysis.edgeBudgetPerNode` (2 drawn edges per node; 1 lean, 0 everything),
  `analysis.hubDrawnPerHub` (3 consumers a hub draws), `analysis.minorFiles` (`all`,
  `one-host` or `off`), `analysis.minorMaxLines` (100), `analysis.archetypeGate` (`off`;
  `strict` gates `/analyze` on a settled vocabulary) and `analysis.roots` (extra
  repo-relative source roots the manifests cannot express).
- `coverage.ignore` (globs left out of the board tree), `coverage.extensions` (extra
  source extensions) and `coverage.infra` (`true`: infrastructure-as-code nodes).
- `validation.skipBoardStructureCheck` (`false`) and `inspect.urls` /
  `inspect.defaultEnv` (named `/inspect` targets).


---

## Credential Setup and Reconfiguration

### Where the values come from

A ProvenMap source must already be created and bound to a workboard (do this in the
ProvenMap UI first if it isn't yet). The secret is shown **once**, in the dialog that
closes the bind — its `.provenmap/credentials.json` snippet matches the fields in
Authentication above exactly. If that moment is gone: for the board's governing
binding run `/login`, which issues a fresh credential and writes it for you; for a
reference binding, open the board's hub → the binding's row → **Copy credentials**.
Either way, credentials already on other machines keep working until revoked.

Credentials live in ONE place — `.provenmap/credentials.json`, never the chat.

### Reconfiguring an already-configured project

`/configure` offers four routes when `.provenmap/credentials.json` already holds the pair:

- **Switch to a different board (browser)** — re-bind this project to another board
  without hand-editing credentials. This re-resolves the full credential triple
  (`bindingToken` + `apiSecret` + `boardSlug`), since a different board is a different
  binding with its own secret. The `--rebind` flag is what unlocks the board picker —
  without it, a bound project's login is authentication-only:
  1. Run `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-login.js --start --rebind --host claude --domain code --plugin-version 0.23.0` and print the JSON `display` field verbatim in your reply — the Bash output panel is collapsed for the user (the browser opens best-effort).
  2. After they sign in, pick the new board, and confirm, run `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-login.js --poll --host claude --domain code` (give the Bash call ~250s; re-run on `status: "pending"`). Print `display` verbatim.
  3. On `status: "complete"`, the config now points at the newly selected board — the `display` panel already shows it.
  4. **Nothing analysed here is thrown away silently.** The boards analysed under the previous
     binding stay on disk (the `display` names them as kept), and the next `/sync` asks whether to
     **migrate** them to the new board — the root is renamed to the new bound slug, child boards
     are re-parented, sync state is reset, and the push carries the whole tree — or to **start
     from a clean slate**: delete that local analysed state and run a fresh analysis of the new
     board. Only server mirrors (nothing analysed) are archived on their own. On the connect plugin the evidence links recorded against the previous board are
     carried into the new board's store on the next `--pull`, for review before pushing.
- **Update specific fields** — have the user edit `.provenmap/config.json` (settings) or
  `.provenmap/credentials.json` (the pair), then confirm and re-verify.
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
1. Load settings from `.provenmap/config.json` and the credential pair from `.provenmap/credentials.json`
2. Load analysis data from `.provenmap/boards/<board-slug>.json`
3. Transform nodes and edges to ProvenMap format
4. Push via `POST /code-plugin/push` with smart sync (diff-based)

Result: Architecture data synced — nodes created/updated, edges linked on the workboard

### Example 2: Configure API connection

User says: "Connect to ProvenMap"

Actions:
1. Read the credential pair from `.provenmap/credentials.json`
2. Validate by fetching archetypes from API
3. Discover root board from server
4. Write `boardSlug` into `.provenmap/config.json`

Result: Configuration saved, connection verified, ready for `/analyze` and `/sync`

## Troubleshooting

### Error: 401 Invalid credentials
**Cause:** bindingToken or apiSecret is incorrect or expired
**Solution:** Run `/login` for a fresh credential, or put a new one from the ProvenMap UI in `.provenmap/credentials.json` and re-run `/configure`

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
