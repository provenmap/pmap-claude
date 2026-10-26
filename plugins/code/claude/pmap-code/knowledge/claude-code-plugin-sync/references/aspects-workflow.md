# Aspects — `pmap-aspects.js` modes, flags, and result reporting

The delegated body of the `/aspects` command. The command itself owns the preflight gate, the spine
precondition, the kind choice, the extraction step, and the invocation; everything about what the
modes and flags do and how to report what came back lives here. Follow it exactly — every flag,
branch, and rule below is part of the contract.

## Invocation

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-aspects.js --aspect <kind> --payload <payload-file> --mode <mode>
```

`<kind>` is one of `database.schema`, `api.surface`, `ui.pages`, `event.catalog`,
`authz.registry`, `api.clients`; `<payload-file>` is the payload the extraction step wrote —
`.provenmap/aspects/tmp/<x>-payload.json`, where `<x>` is `db` | `api` | `pages` | `event` |
`authz` | `clients` (`ui.pages` on a layered board writes one payload per sub-board; see its skill).

The same command takes `--summary "<one sentence>"`.

## Modes

`--mode` defaults to **`replace`** — a full snapshot: rows whose slug left the payload are
diff-deleted, but **the user's manual edits and human annotations survive** (the server never
touches manual rows or human-owned columns). Use **`--mode merge`** to add without pruning.

## Flags

- `--dry-run` — validate the payload and cross-check its slugs against the synced spine
  **without pushing**. Useful to sanity-check `unknownSlugs` before pushing for real.
- `--no-verify` — skip the post-ingest server read-back verification (see `verify` below).
- `--summary "<sentence>"` — optional: one plain sentence, at most 200 characters, on what this
  run changes, naming the tables, endpoints or channels, with no counts. Written from what this
  extraction found against the family's last push (the payload you just wrote); omit it rather
  than guess.
- `--force` — land a push the server would otherwise refuse for **collapsed shape coverage**:
  it read the shape (responses, columns, payloads) of fewer than half the rows the board's last
  push did. Only when the user has said the loss is real; the default answer is to extract the
  shapes and push again.
- `--no-copy-through` — push every row as freshly read. By default a row whose `declaredIn.file`
  is unchanged since **this aspect's** last push (`lastPushCommitByAspect[aspect]`) keeps that
  push's reading (`reused` lists them), so a re-extraction cannot drift a contract nobody
  touched. An aspect with no commit of its own reuses nothing.
- `--charter` — no push: print `charter` (what an open comparison expects this board to serve),
  `lastPushCommit` and `lastPushCommitByAspect`, then exit. The command runs it before extracting.
  With `--branch <branch>` it reads the comparison that tracks that branch instead of the board.
- `--comparisons` — no push: print `comparisons`, the branches open comparisons track for this
  board (`branch`, `comparisonSlug`, `comparisonName`), then exit. Preflight's
  `binding.comparisonBranches` is the same list.
- `--worktree <branch>` / `--worktree-remove <branch>` / `--repo <dir> --branch <branch>` — the
  comparison loop below. A branch no open comparison tracks is refused (exit 1) by every one of
  them: the branch pin is the safety line, and the script can only land rows in a set the server
  already keeps.

## Comparisons — tracked branches, read without switching

The binding identity names the branches open comparisons track for this board (preflight prints
them on the pinned branch; `--comparisons` lists them). Every command runs on the pinned branch —
a checkout of a tracked branch is refused by preflight (exit 11, its `display` names the
comparison and this way out). `/aspects` feeds those branches itself: each one is checked out
**detached into a scratch worktree at `.provenmap/worktrees/<branch>`** — inside the repo, so
every read stays within the working directory and nothing prompts, in a terminal or a scheduled
run — the extraction reads that tree, the push names the branch, and the worktree is removed.
The user's checkout, index and HEAD never move; the folder is gitignored, so no analysis walk
sees it.

**The question** (step 2), only when the list is non-empty and `--comparisons` was not given.
Header `Comparisons`; question: "N open comparison(s) track branches of this board: `develop`
(Release check), `feat/x` (Orders rewrite). Also push their contracts? Each branch costs one more
extraction per kind." Options: **Board + every comparison (Recommended)** · **Board only** ·
**Pick** (a second `AskUserQuestion`, `multiSelect: true`, one option per branch). `--comparisons
all` = the first, `--comparisons none` = the second, without asking — the flag a scheduled or
headless run passes. The board is pushed **first**: an after set's charter is read from the
before side, and when that side is this board, its push makes the charter current.

**Per chosen branch**, after the board, in turn:

1. `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-aspects.js --worktree <branch>` — sweeps any leftover
   worktree first, fetches the branch from origin (falls back to the local branch when there is
   no origin), checks it out detached at `.provenmap/worktrees/<branch>`, prints
   `worktree: { dir, ref, commit }`.
   Exit 2 with `error` when the branch exists nowhere: relay it (it names the `git fetch`) and
   move to the next branch.
2. Per kind: `pmap-aspects.js --charter --branch <branch>` (what this comparison expects the
   branch to serve), then that kind's skill, **reading only under `worktree.dir`** — `declaredIn.file`
   paths are relative to that directory, which is the repo root of that branch — into the usual
   payload path, then `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-aspects.js --aspect <kind> --payload
   <payload-file> --mode <mode> --repo <worktree.dir> --branch <branch>` (+ the flags the user
   asked for). The push context names the tracked branch and the worktree's HEAD; copy-through
   diffs the worktree against that comparison set's own last push of the kind; `landedIn` says
   `{ kind: "comparison", comparisonName, branch }`; state lands in
   `.provenmap/aspects/<board-slug>.<aspect>@<branch>.json`, beside the board's.
3. `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-aspects.js --worktree-remove <branch>` — always, also
   after a failed push, before the next branch.

The spine check and slug cross-check read the **board's** synced spine from the checkout, as on
the board: a file the branch moved reads as `unlinked` there, and the comparison's parity shows
the contract as moved or changed — that is the point, not a defect.

## Exit codes

0 success · 1 config error (a **branch mismatch** lands here — relay the `error` verbatim, it
names the pinned branch and the fix — and so does a `--branch` no comparison tracks) · 2
spine-not-synced / analysis error, or a worktree that could not be prepared · 3 payload validation
error (schema or intra-payload) or post-ingest verify drift · 4 API error · 5 refused for collapsed
shape coverage (`coverage` carries `pushed` and `previous` as `{ rows, withShape }`).

## Reporting the result

`pmap-aspects.js` prints an `AspectUpsertResult` (or, with `--dry-run`, just the validated payload's
slug cross-check). Summarise it for the user:

- `landedIn` — say it first when `kind` is `comparison`: "Landed in the comparison “<name>” from
  `<branch>`; the board is unchanged." On the board, say nothing. A `--repo --branch` push whose
  `landedIn.kind` is `board` is a server that no longer tracks the branch: say so.
- `inserted` / `updated` / `deleted` — what changed on the board (or in the set).
- `reused` — rows kept because their file did not change since `copyThroughBase.commit`, this
  aspect's own last push; one line with the count and the commit when non-empty: "7 rows kept
  from the push at `1c8d853`: their files are unchanged".
- `skippedManual` — manual rows the ingest left untouched (expected, not an error).
- **`unlinked`** — rows whose owning slug matched no node. **`unresolvedRefs`** — references whose
  `nodeSlug` matched no node.

If `unlinked` or `unresolvedRefs` is non-zero, tell the user which slugs were unknown (the CLI
reports `unknownSlugs`) and that re-running `/analyze` + `/sync` to add those nodes will
**auto-resolve** them on the next push (the server's re-resolution pass) — nothing was dropped,
they are just waiting for their node.

### `verify` — the post-ingest server read-back

`verify.ok === false` (exit 3) means the server's aspect snapshot does not match what was pushed.
Report `familyMissing` / `snapshotMismatch` / each `missingKeys` entry / `countMismatch`
verbatim, then say:

> Post-ingest verification failed — re-run `/aspects` for this aspect; if the drift persists, ask
> your admin to check the server's aspect ingest.

`verify: {skipped: true}` (from `--no-verify`) and `verify: {unavailable: true}` must each be
reported in one line — never silently. When `unavailable` carries `notAvailable: true`, the
server predates aspect pull — the ingest itself landed; no action needed.

## State

State is written to `.provenmap/aspects/<board-slug>.<aspect>.json` so `/status` can show the last
adopt and its resolution counts; a tracked branch's push writes
`<board-slug>.<aspect>@<branch>.json` beside it, and `/status` names the branch.
