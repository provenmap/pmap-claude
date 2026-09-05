# /sync Workflow — Steps 2.5 to 6

The delegated body of the `/sync` command. The command itself owns the preflight, the config and
manifest reads, the mode choice, the exit-code map, and the connect-now offer; everything from the
binding-scope check to the closing report lives here. Follow it exactly — every CLI call, flag,
branch, prompt, and rule below is part of the contract.

Throughout: print every `display` field **verbatim — do not reformat, reorder, or summarise it**.

## Step 2.5: Binding-scope check (carry the previous binding's work forward, or start clean)

The manifest can carry boards from a **previous binding**: after `/login switch` (or `/configure`'s
change-board path) the boards analysed under the old binding are still on disk, outside the new
bound board's tree. Syncing one as-is would push at a board that belongs to another binding's tree,
and both the CLI and the server refuse it — but the analysis itself is work already paid for, and
the new board is usually empty. Check before picking boards:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-boards.js --check-scope
```

Parse the JSON output (`bindingScope`): `carriedOverBoards` (analysed boards — provenance on disk),
`residueBoards` (mirrors, nothing analysed), `carriedOverEvidence` (connect only; informational —
the next `--pull` carries them).

- **Both lists empty** → proceed silently to Step 3.
- **`carriedOverBoards` non-empty** → print the `display` field verbatim, then ask with
  **AskUserQuestion** — "N analysed board(s) from the previous binding — push them to `<bound>`?"
  with options:
  - **Migrate to `<bound>` and push (recommended)** → run
    `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-boards.js --migrate`. **Exit 0** → print its `display` verbatim
    (the root is renamed to the bound slug, child boards keep their slugs and are re-parented, sync
    state is reset so Step 4 pushes every board in full) and continue to Step 3 — the migrated
    boards are now in scope. **Exit 3** → relay `error` verbatim; when `migrate.status` is
    `target_not_empty` the bound board already holds nodes on the server and the push would REPLACE
    them — ask with **AskUserQuestion** "Replace the N node(s) already on `<bound>`?" (**Replace
    them** → re-run with `--migrate --force`, print `display`, continue; **Keep them** → stop and name
    `/analyze` for a fresh analysis of the bound board). Any other exit-3 reason
    (`target_has_analysis`, `ambiguous`) → stop; the error names the fix.
  - **Start from a clean slate** → run
    `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-boards.js --prune-foreign --delete`, print its `display`
    verbatim (the previous binding's local analysed state is deleted), then **stop** — there is
    nothing left to sync: name `/analyze` for a fresh analysis of `<bound>`.
  - **Skip for now** → continue, but only in-scope boards may be synced; the offer will reappear on
    every sync until decided.
- **Only `residueBoards` non-empty** → print the `display` field verbatim, then ask with
  **AskUserQuestion** — "Archive N stale board(s) from a previous binding?" with options:
  - **Archive now (recommended)** → run `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-boards.js --prune-foreign`,
    print its `display` verbatim (files move to `.provenmap/boards/_orphaned/`, reversible), then
    continue.
  - **Delete permanently** → same with `--prune-foreign --delete`.
  - **Skip for now** → continue, but only in-scope boards may be synced; the warning will reappear on
    every sync until cleaned.

Never run `--migrate`, `--prune-foreign`, or `--delete` without the user's answer — the analysis
belongs to them, and a clean slate is not reversible.

## Step 3: Determine boards to sync

Based on the mode:

- `--board <slug>`: sync only that board (validate it exists in the manifest and is **in scope** per
  Step 2.5)
- `--all`: sync all **in-scope** boards in the manifest (never the foreign ones)
- Default: if one in-scope board, sync it; if multiple, prompt the user

## Step 3.5: Fetch board URLs

Fetch the current board list so Step 6 can print each board's view link (child-board creation is
handled by the server automatically during push — see Step 4 — not here):

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-boards.js --host claude --domain code
```

Parse the JSON output:

- `boardUrls`: map of board slug → clickable "view this board" URL (built by the server). A value may
  be `null` when the server can't resolve it. **Keep this map** — you'll print these links in Step 6
  after each board syncs.
- `orphanedChildBoards` + `display` (present only when non-empty): child boards still on the server
  that the latest local analysis of their parent no longer drills into. A sync replaces board *data*,
  never boards — **keep the `display`** and print it verbatim at the end of Step 6.

## Step 3.6: Archetype attributes — evidence the fields each archetype declares

An archetype declares a **field contract** — the properties a node or edge of that type carries in
the app (`primaryLanguage`, `version`, `protocol`, `owner`, `sla`, …). This step fills in the part
of that contract this repository can actually prove, immediately before the push, so the values
land in the same transaction as the elements themselves.

**First, warm the field-contract cache.** It is name-scoped: the whole code catalogue is 264 KB of
field definitions against ~23 KB for the archetypes a real board assigns, so the CLI reads the
archetype names out of the local board files and asks only for those.

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-archetypes.js --kind code --fields
```

Read `fieldContracts` from the JSON: `archetypesResolved` / `namesRequested` (a shortfall means the
server's catalogue no longer has some archetype your boards use — worth naming in Step 6, not worth
stopping for) and `cacheStatus` (`hit`, `fetched`, or `no-boards`).

**Then resolve and apply, per board**, before the integrity gate below:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-prepass.js --attributes <board-slug> --apply
```

Print the `display` verbatim. It names how many nodes carry evidenced values, any node typed with an
archetype the cache does not know, and every value the archetype's field vocabulary could not hold.

Branches:

- **exit 0** — values written onto the board's nodes. Continue.
- **exit 1** — no cached contracts (the `--fields` call above failed or the project has no boards
  yet), or the board/skeleton is unreadable. Report it, **keep the board in the sync**, and continue:
  attributes are an enrichment, and a board without them is still worth pushing.
- **exit 3** — the board would fail its integrity gates with the attributes folded in. Nothing was
  written. Report it and continue to Step 3.8, which will surface the same failure properly.

### What gets written, and what deliberately does not

The script fills only what a repository can PROVE — the manifest and the file tree:
`primaryLanguage`, `technologies`, `version`, `packageName`, `registry`, `moduleType`,
`codeLocation`, `dependencies`, `parentModule`, `parentContainer`, `childModules`, `provider`.

It writes **nothing** for the operational and organisational fields most archetypes also declare —
`owner`, `owningTeam`, `sla`, `stage`, `status`, `cloudProvider`, `monitoring`, `logging`,
`deploymentEnvironment`, `backupPolicy`, `failoverStrategy`, `scalability`, `orchestration`,
`containerization`, `dataClassification`, `criticality`, `stakeholders`, `encryption`,
`testCoverage`. Those belong to the architect, and a codebase cannot know them. Twelve of the twenty
most frequently declared field names are of that kind, so this is most of the contract by volume.

**Do not fill them yourself, and do not ask the script to.** An absent field is how an architect
sees which properties still need a human; a plausible guess sitting in the same panel as a measured
fact is indistinguishable from one, and destroys the signal for every other value on the board.

The plugin only ever re-derives its own keys, so anything an architect typed in the app survives
every later sync untouched.

### When the vocabulary cannot hold a value

Many fields declare a closed option list, and it is often narrower than what a repository contains —
`technologies` accepts five values, `primaryLanguage` six of the twelve languages the analyser
recognises. A value outside the list is **dropped**, and the `display` names it grouped by field.

That report is a signal about the catalogue, not a defect in the analysis: a field rejecting the
same value across many nodes is a gap worth taking to `/analyze-archetypes`, which is how the
archetype vocabulary gets extended.

## Step 3.8: Integrity gate — validate every target board before the first push

Run the tree-wide integrity check so a board tree pushes wholly or not at all:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-prepass.js --validate            # syncing all boards
node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-prepass.js --validate <slug>     # syncing one board
```

- **Exit 0** → proceed to Step 4.
- **Exit 3** → print the returned `display` verbatim — do not reformat, reorder, or summarise — then
  **STOP. Push nothing.** Tell the user which board(s) failed and that the fix is to re-run
  `/analyze` on that board (or hand-fix `.provenmap/boards/<slug>.json`) and run `/sync`
  again. Never push the passing subset — a partially updated tree is harder to reason about than a
  rejected one.

## Step 4: Sync each board via the CLI

When syncing more than one board, iterate **ascending by manifest `layer`** (L0 first) — the push
endpoint materialises each child board from its parent's `layerBoardSlug` on push, so a parent must
sync before its children or the child push is rejected.

Boards **within one layer** have no such ordering constraint and each owns its own store file, so run
them concurrently: issue up to **3** of the Step 4 commands at once, wait for that layer to finish,
then move to the next layer. Keep the batch at 3 — this is one server's rate budget, not a local
limit. If any board in a batch fails with a rate-limit or 5xx error, finish the layer serially before
continuing.

For each board to sync, run the ProvenMap sync CLI with the board's analysis file and board slug:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-sync.js \
  --board-slug <board-slug> \
  --analysis .provenmap/boards/<board-slug>.json \
  --smart-sync \
  --host claude --domain code
```

**CLI options:**

- `--board-slug <slug>`: **required** — board slug to sync to
- `--analysis <path>`: **required** — analysis file path
- `--config <path>`: config file path (default: `.provenmap/config.json`, rarely needed)
- `--dry-run`: validate and transform only, don't push to the API
- `--smart-sync`: enable diff-based sync (pulls server state, computes the diff for the report and
  the post-push confirmation; the push itself always carries the full board)
- `--force-pull`: force refresh of server elements before computing the diff
- `--no-verify`: skip the post-push server read-back verification — **discouraged**, only for
  exceptional cases
- `--host claude --domain code`: plugin identity stamped on the push (hub display data)

## Step 5: Parse the CLI output

The CLI outputs one JSON object to stdout. Branch on `success`:

- **`success: true`** — summarise from `pushResult` (`nodesCreated` / `nodesUpdated` /
  `edgesCreated` / `edgesUpdated`, plus any `pushResult.errors[]`) and, in smart-sync mode, the
  `diff` counts (`newNodes` / `changedNodes` / `unchangedNodes`, same for edges).
- **`success: false`** — report the `error` field. If `errorType` is `auth_invalid`, the credentials
  were rejected (revoked binding or rotated secret) — make the **connect-now offer** from the command
  rather than reporting a generic API error.
- **`error` starting `Invalid archetypes:` (exit 3) — the catalogue gap.** The board assigns an
  archetype this server's catalogue does not serve; the CLI validates against the live catalogue
  before pushing, so nothing was sent. Say, verbatim: **"This ProvenMap server's archetype catalogue
  is missing `<names>` — ask your admin to load the archetype seed data on the server, then re-run
  `/sync`."** Then stop. Never add, edit, or insert archetypes on the server or in its database from
  this session, whatever else is on this machine — the catalogue is the server's; `/analyze-archetypes`
  is the only way to propose additions.
- The CLI output may carry a `stylingReport` field (absent means the domain has no styling) — hold it
  for Step 6.

Always report `serverPullStatus` when it is not "fresh" — "cached" is fine to omit; a failed pull
aborts with its own error.

Every push is a **replace** (see `sync-protocol.md` § Push Mode). Four honesty fields may appear on
success — **always surface them** when present:

- `conflicts` (`{nodes: [...], edges: [...]}`): both the local analysis and the server changed these
  elements since the last sync (an architect or another source edited them). They WERE pushed — the
  local version replaced the server's fact edits (architect-owned name/description/tags survive).
  List the slugs so the change is visible.
- `deletedOnServer` (`{nodes: [...], edges: [...]}`): these were deleted on the server since the last
  sync and WERE recreated because the latest analysis still contains them. List the slugs.
- `verify`: the post-push server read-back. `verify.ok === false` means the server board does not
  match what was pushed — report each `missingNodes` / `missingEdges` entry and every `gateErrors`
  line verbatim. If `verify.reverted` is present, say: **"Post-push verification failed — the local
  store has been reset for the missing elements; re-run `/sync` to re-push them. If the drift
  persists, re-run `/analyze` on this board."** If `verify.reverted` is absent (nothing was
  missing — gate errors only — or no store recorded the push), say: **"Post-push verification
  failed — re-run `/sync`; if the drift persists, re-run `/analyze` on this board."**
  `verify: {skipped: true}` (from `--no-verify`) and `verify: {unavailable: true}` (read-back failed)
  must each be reported in one line — never silently. For `{unavailable: true}`, add: the push itself
  landed — re-run `/sync` when the server is reachable to verify it.
- `replaceFullPayload`: the full inventory transmitted (`nodes` / `edges` counts); mention it in one
  line so a full-board transmission is never surprising.

## Step 6: Report results

For each synced board, report:

- Board slug and layer
- Nodes: X created, Y updated
- Edges: X created, Y updated
- Deleted (stale from an earlier analysis): X nodes, Y edges — only when `pushResult.nodesDeleted` or
  `pushResult.edgesDeleted` is present and non-zero; a deletion must never go unmentioned
- Any errors from the `pushResult.errors` array
- **View link**: if `boardUrls[<board-slug>]` (from Step 3.5) is a non-null URL, print it as a
  clickable link, e.g. `🔗 View board: <url>`. If it's `null` or absent, skip the link silently
  (don't surface an error — the server may be older or the link not yet resolvable).

**Plan progress** (the last CLI output may carry a `coverageReport` field — absent means the domain
doesn't track it; skip silently):

- `sent: true` → print the response's `display` field **verbatim — do not reformat, reorder, or
  summarise** (it carries the progress bar, the percent, and the stale / incomplete counts:
  `{ sent, percent, built, units, stale, incomplete, display }`). If `stale > 0` or
  `incomplete > 0`, add: `Close the gap with /analyze (incremental).`
- `reason: "no_plan"` → `No tree plan yet — run /analyze (it computes the plan) so the platform can track analysis progress.`
- `reason: "feature_unavailable"` → "This ProvenMap server doesn't expose analysis progress yet — ask your admin to upgrade"
- `reason: "branch_mismatch"` → note the snapshot was skipped because the plan was computed on the
  wrong branch; `/status` explains the recovery.
- Any other `reason` → one line: progress snapshot failed with that reason (the sync itself still
  succeeded).

**Styling** (from each board's `stylingReport` — absent or `reason: "no_pending_plan"` means nothing
pending; skip silently):

- `applied: true` → print `🎨 Styling applied — <nodesStyled> node(s), <edgesStyled> edge(s), <containersComposed> container(s)<, board composition if boardComposition>.`
  List `skipped[]` entries one line each.
- `reason: "feature_unavailable"` → "This ProvenMap server doesn't expose board styling yet — ask your admin to upgrade"
- `reason: "validation_failed"` → note the plan drifted from the board and name `/restyle <board-slug>`
  as the fix (the sync itself succeeded).
- `reason: "error"` → one line with `detail`; the plan is kept and retried on the next `/sync` (the
  sync itself succeeded).

If syncing multiple boards, show a summary at the end, including each board's view link where
available.

**Orphaned child boards**: if the Step 3.5 output carried a `display` (orphaned child boards), print
it **verbatim — do not reformat, reorder, or summarise** — as the last block. It names each board,
what it used to drill down from, and the two ways to resolve it (delete on the platform, or
re-declare the drill-down and re-run `/sync`). Never delete a board yourself.

## Repairing an inconsistent board tree

`errorType: "forbidden"` means the server refused the operation — commonly a child board pushed
before its parent's nodes exist, or an out-of-scope board. Surface the server's message verbatim; do
NOT offer re-login.

`--ensure-boards` is **repair-only** — the push endpoint already materialises each child board from
its parent on a normal sync (Step 4), and on a cold start it can't help anyway (no parent nodes exist
yet to attach to). Run it only when a previous partial failure left the server tree inconsistent — a
child board missing after its parent's elements were already pushed:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-boards.js \
  --ensure-boards .provenmap/boards/manifest.json \
  --host claude --domain code
```

Parse the JSON output — `created` / `existing`: board slugs created or already present; `errors`:
slugs that failed to create (warn but continue); `skippedForeign`: manifest boards outside this
binding's tree, already handled by Step 2.5. Then re-run `/sync`.
