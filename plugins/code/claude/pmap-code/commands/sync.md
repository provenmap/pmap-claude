---
category: map
description: "Map · Sync architecture analysis to ProvenMap"
argument-hint: [--board <slug> | --all]
allowed-tools: Read, Bash(node:*), AskUserQuestion
---

Synchronize local architecture analysis to ProvenMap, board by board.

## Prerequisites

Before syncing, ensure:

1. At least one analysis has been run (`.provenmap/boards/manifest.json` exists with board entries)
2. Configuration is set up (`.provenmap/config.json` exists with credentials)

## Sync Modes

### Sync a specific board

```
/sync --board <board-slug>
```

Syncs a single board to ProvenMap.

### Sync all boards

```
/sync --all
```

Reads the manifest and syncs all boards that have analysis data.

### Default (no args)

```
/sync
```

If only one board exists, syncs it. If multiple exist, lists them and asks which to sync.

## Sync Workflow

### Step 0: Preflight — binding, branch, local state

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

### Step 1: Read Configuration

Read `.provenmap/config.json` and extract ProvenMap credentials:

- `bindingToken`: Combined authentication token
- `apiSecret`: API secret (starts with `ck_cp_live_`)
- `baseUrl`: API endpoint (default: `https://platform.provenmap.com/api`)
- `branch`: Git branch name for sync
- `boardSlug`: Root board slug

If configuration is missing or `boardSlug` is not set, make the **connect-now offer** (see Error Handling).

### Step 2: Load Board Manifest

Read `.provenmap/boards/manifest.json` to discover which boards exist and their metadata. If the manifest doesn't exist, instruct the user to run `/analyze` first.

### Step 2.5: Binding-Scope Check (offer cleanup for stale boards)

The manifest can carry boards from a **previous binding** (rebind residue) — syncing one would push at a board that belongs to another binding's tree, and both the CLI and the server refuse it. Check before picking boards:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-boards.js --check-scope
```

Parse the JSON output (`bindingScope.foreignBoards`):

- **Empty** → proceed silently to Step 3.
- **Non-empty** → print the `display` field verbatim, then ask with **AskUserQuestion** — "Archive N stale board(s) from a previous binding?" with options:
  - **Archive now (recommended)** → run `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-boards.js --prune-foreign`, print its `display` verbatim (files move to `.provenmap/boards/_orphaned/`, reversible), then continue.
  - **Delete permanently** → same with `--prune-foreign --delete`.
  - **Skip for now** → continue, but only in-scope boards may be synced; the warning will reappear on every sync until cleaned.

### Step 3: Determine Boards to Sync

Based on the mode:
- `--board <slug>`: Sync only that board (validate it exists in manifest and is **in scope** per Step 2.5)
- `--all`: Sync all **in-scope** boards in the manifest (never the foreign ones)
- Default: If one in-scope board, sync it; if multiple, prompt user

### Step 3.5: Fetch Board URLs

Fetch the current board list so Step 6 can print each board's view link (child-board creation is
handled by the server automatically during push — see Step 4 — not here):

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-boards.js --host claude --domain code
```

Parse the JSON output:
- `boardUrls`: Map of board slug → clickable "view this board" URL (built by the server). A value may be `null` when the server can't resolve it. **Keep this map** — you'll print these links in Step 6 after each board syncs.
- `orphanedChildBoards` + `display` (present only when non-empty): child boards still on the server that the latest local analysis of their parent no longer drills into. A sync replaces board *data*, never boards — **keep the `display`** and print it verbatim at the end of Step 6.

### Step 3.8: Integrity gate — validate every target board before the first push

Run the tree-wide integrity check so a board tree pushes wholly or not at all:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-prepass.js --validate            # syncing all boards
node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-prepass.js --validate <slug>     # syncing one board
```

- **Exit 0** → proceed to Step 4.
- **Exit 3** → print the returned `display` verbatim — do not reformat, reorder, or
  summarise — then **STOP. Push nothing.** Tell the user which board(s) failed and that
  the fix is to re-run `/analyze` on that board (or hand-fix
  `.provenmap/boards/<slug>.json`) and run `/sync` again. Never push the passing subset —
  a partially updated tree is harder to reason about than a rejected one.

### Step 4: Sync Each Board via CLI

When syncing more than one board, iterate **ascending by manifest `layer`** (L0 first) — the push
endpoint materialises each child board from its parent's `layerBoardSlug` on push, so a parent must
sync before its children or the child push is rejected.

Boards **within one layer** have no such ordering constraint and each owns its own store file, so
run them concurrently: issue up to **3** of the Step 4 commands at once, wait for that layer to
finish, then move to the next layer. Keep the batch at 3 — this is one server's rate budget, not a
local limit. If any board in a batch fails with a rate-limit or 5xx error, finish the layer serially
before continuing.

For each board to sync, run the ProvenMap sync CLI with the board's analysis file and board slug:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-sync.js \
  --board-slug <board-slug> \
  --analysis .provenmap/boards/<board-slug>.json \
  --smart-sync \
  --host claude --domain code
```

**CLI Options:**

- `--board-slug <slug>`: **Required** — board slug to sync to
- `--analysis <path>`: **Required** — analysis file path
- `--config <path>`: Config file path (default: `.provenmap/config.json`, rarely needed)
- `--dry-run`: Validate and transform only, don't push to API
- `--smart-sync`: Enable diff-based sync (pulls server state, computes the diff for the report and the post-push confirmation; the push itself always carries the full board)
- `--force-pull`: Force refresh of server elements before computing diff
- `--no-verify`: Skip the post-push server read-back verification — **discouraged**, only for exceptional cases
- `--host claude --domain code`: Plugin identity stamped on the push (hub display data)

### Step 5: Parse CLI Output

The CLI outputs one JSON object to stdout. Branch on `success`:

- **`success: true`** — summarise from `pushResult` (`nodesCreated`/`nodesUpdated`/`edgesCreated`/`edgesUpdated`, plus any `pushResult.errors[]`) and, in smart-sync mode, the `diff` counts (`newNodes`/`changedNodes`/`unchangedNodes`, same for edges).
- **`success: false`** — report the `error` field. If `errorType` is `auth_invalid`, the credentials were rejected (revoked binding or rotated secret) — make the **connect-now offer** (see Error Handling) rather than reporting a generic API error.
- The CLI output may carry a `stylingReport` field (absent means the domain has no styling) — hold it for Step 6.

Always report `serverPullStatus` when it is not "fresh" — "cached" is fine to omit; a failed pull aborts with its own error.

The push is always a **replace**: the latest analysis *is* the board. The full inventory is
transmitted and the server deletes the elements this plugin authored that the analysis no longer
contains (architect-created elements are never touched). Four honesty fields may appear on success —
**always surface them** when present:

- `conflicts` (`{nodes: [...], edges: [...]}`): both the local analysis and the server changed these elements since the last sync (an architect or another source edited them). They WERE pushed — the local version replaced the server's fact edits (architect-owned name/description/tags survive). List the slugs so the change is visible.
- `deletedOnServer` (`{nodes: [...], edges: [...]}`): these were deleted on the server since the last sync and WERE recreated because the latest analysis still contains them. List the slugs.
- `verify`: the post-push server read-back (§ push honesty). `verify.ok === false` means the server board does not match what was pushed — report each `missingNodes` / `missingEdges` entry and every `gateErrors` line verbatim. If `verify.reverted` is present, say: **"Post-push verification failed — the local store has been reset for the missing elements; re-run `/sync` to re-push them. If the drift persists, re-run `/analyze` on this board."** If `verify.reverted` is absent (nothing was missing — gate errors only — or no store recorded the push), say: **"Post-push verification failed — re-run `/sync`; if the drift persists, re-run `/analyze` on this board."** `verify: {skipped: true}` (from `--no-verify`) and `verify: {unavailable: true}` (read-back failed) must each be reported in one line — never silently. For `{unavailable: true}`, add: the push itself landed — re-run `/sync` when the server is reachable to verify it.
- `replaceFullPayload`: the full inventory transmitted (`nodes`/`edges` counts); mention it in one line so a full-board transmission is never surprising.

### Step 6: Report Results

For each synced board, report:
- Board slug and layer
- Nodes: X created, Y updated
- Edges: X created, Y updated
- Deleted (stale from an earlier analysis): X nodes, Y edges — only when `pushResult.nodesDeleted`
  or `pushResult.edgesDeleted` is present and non-zero; a deletion must never go unmentioned
- Any errors from the `pushResult.errors` array
- **View link**: if `boardUrls[<board-slug>]` (from Step 3.5) is a non-null URL, print it as a clickable link, e.g. `🔗 View board: <url>`. If it's `null` or absent, skip the link silently (don't surface an error — the server may be older or the link not yet resolvable).

**Coverage** (the last CLI output may carry a `coverageReport` field — absent means the domain doesn't track coverage; skip silently):

- `sent: true` → print the response's `display` field **verbatim — do not reformat,
  reorder, or summarise** (it carries the coverage bar, the percent, and the pending /
  stale counts). If `pending > 0` or `staleNodes > 0`, add:
  `Close the gap with /analyze (incremental).` `mappedOnly > 0` is **planned depth,
  not a gap, where a drill-down owns those files** — when it is the only non-zero count, say
  `Planned depth remains — build the drill-down with /analyze.` instead. A broad
  claim (a node claiming 30+ files with no drill-down) sits in that same count and is real
  debt, never planned depth — `/status`'s broad-claim line names them.
- `reason: "no_ledger"` → `No coverage ledger yet — run /analyze (it computes coverage) so the platform can track analysis coverage.`
- `reason: "feature_unavailable"` → "This ProvenMap server doesn't expose analysis coverage yet — ask your admin to upgrade"
- `reason: "branch_mismatch"` → note the snapshot was skipped because the ledger was computed on the wrong branch; `/status` explains the recovery.
- Any other `reason` → one line: coverage snapshot failed with that reason (the sync itself still succeeded).

**Styling** (from each board's `stylingReport` — absent or `reason: "no_pending_plan"` means nothing pending; skip silently):

- `applied: true` → print `🎨 Styling applied — <nodesStyled> node(s), <edgesStyled> edge(s), <containersComposed> container(s)<, board composition if boardComposition>.` List `skipped[]` entries one line each.
- `reason: "feature_unavailable"` → "This ProvenMap server doesn't expose board styling yet — ask your admin to upgrade"
- `reason: "validation_failed"` → note the plan drifted from the board and name `/restyle <board-slug>` as the fix (the sync itself succeeded).
- `reason: "error"` → one line with `detail`; the plan is kept and retried on the next /sync (the sync itself succeeded).

If syncing multiple boards, show a summary at the end, including each board's view link where available.

**Orphaned child boards**: if the Step 3.5 output carried a `display` (orphaned child boards), print it
**verbatim — do not reformat, reorder, or summarise** — as the last block. It names each board, what it
used to drill down from, and the two ways to resolve it (delete on the platform, or re-declare the
drill-down and re-run `/sync`). Never delete a board yourself.

---

## Error Handling

CLI exit codes:

- `0`: Success
- `1`: Configuration error (missing file, invalid format, missing --board-slug) — make the **connect-now offer** (below). Also used for a **branch mismatch** (current git branch differs from the binding's pinned branch) and for an **out-of-scope board** (the target board belongs to a previous binding's tree) — in both cases relay the `error` field verbatim; it names the fix (no connect-now offer: the config is fine). For out-of-scope, offer the Step 2.5 cleanup instead
- `2`: Analysis file error (missing or invalid JSON, missing boardSlug in metadata) — suggest running `/analyze` first
- `3`: Validation error (invalid node/edge structure or archetype mismatch) — report the JSON `error` detail
- `4`: API error — report the JSON `error`; the CLI already retries transient failures and maps HTTP errors to messages, so relay its text rather than re-deriving HTTP semantics
- `errorType: "forbidden"` — the server refused this operation (commonly: a child board pushed before its parent's nodes exist, or an out-of-scope board). Surface the server's message verbatim; do NOT offer re-login — see *Repairing an inconsistent board tree* below.

### Repairing an inconsistent board tree

`--ensure-boards` is **repair-only** — the push endpoint already materialises each child board from
its parent on a normal sync (Step 4), and on a cold start it can't help anyway (no parent nodes
exist yet to attach to). Run it only when a previous partial failure left the server tree
inconsistent — a child board missing after its parent's elements were already pushed:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-boards.js \
  --ensure-boards .provenmap/boards/manifest.json \
  --host claude --domain code
```

Parse the JSON output — `created`/`existing`: board slugs created or already present; `errors`:
slugs that failed to create (warn but continue); `skippedForeign`: manifest boards outside this
binding's tree, already handled by Step 2.5. Then re-run `/sync`.

### Connect-now offer

Used whenever ProvenMap is not configured or the credentials were rejected (`errorType: "auth_invalid"`). Ask with **AskUserQuestion** — "Connect to ProvenMap now?" (**Connect now** / **Not now**):

- **Connect now** → run the browser login here, printing each JSON `display` verbatim **in your reply** (the Bash output panel is collapsed for the user): `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-login.js --start`, then `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-login.js --poll --host claude --domain code` (generous Bash timeout, e.g. 250s). On `status: "complete"`, resume this command from the step that failed; anything else — stop, the display explains.
- **Not now** → stop with the canonical message: "ProvenMap not configured — run `/login` (browser) or `/configure` (manual) first" (or, when credentials were rejected: "Your ProvenMap credentials were rejected — run `/login` to reconnect").
