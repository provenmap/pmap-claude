# Aspect adoption — `pmap-adopt.js` modes, flags, and result reporting

The delegated body of the `/adopt` command. The command itself owns the preflight gate, the spine
precondition, the kind choice, the extraction step, and the invocation; everything about what the
modes and flags do and how to report what came back lives here. Follow it exactly — every flag,
branch, and rule below is part of the contract.

## Invocation

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-adopt.js --aspect <kind> --payload <payload-file> --mode <mode>
```

`<kind>` is one of `database.schema`, `api.surface`, `ui.pages`, `event.catalog`,
`authz.registry`, `api.clients`; `<payload-file>` is the payload the extraction step wrote —
`.provenmap/aspects/tmp/<x>-payload.json`, where `<x>` is `db` | `api` | `pages` | `event` |
`authz` | `clients` (`ui.pages` on a layered board writes one payload per sub-board; see its skill).

After the digest step below wrote a draft, the same command takes `--digest <draftPath>` and
`--summary "<one sentence>"`.

## Sync digest — before the adopt

An adopt after a fresh extraction carries a **sync digest**: what this family's rows changed since
its last adopt (a table added, an endpoint removed, a channel reshaped) and who was involved. Before
`pmap-adopt.js`, read `${CLAUDE_PLUGIN_ROOT}/knowledge/claude-code-plugin-sync/references/sync-digest.md`
and follow its steps 1 and 2 for this kind:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-digest.js \
  --board-slug <board-slug> \
  --aspect <kind> --payload <payload-file> --mode <mode> \
  --model <the model you are running as> \
  --host claude --domain code
```

- **`digest: "written"`** → write the sentences its `fill` lists by that reference's writing rules
  (`pmap-digest.js --fill <draftPath> --prose <n>="<sentence>"`, one `--prose` per entry), then
  adopt with `--digest <draftPath>` and `--summary "<one sentence>"`.
- **`digest: "none"`** → adopt without `--digest`. Not an error; say nothing about it.

The digest never blocks: whatever this step returns, the adopt runs. Skip the step for `--dry-run`.

## Modes

`--mode` defaults to **`replace`** — a full snapshot: rows whose slug left the payload are
diff-deleted, but **the user's manual edits and human annotations survive** (the server never
touches manual rows or human-owned columns). Use **`--mode merge`** to add without pruning.

## Flags

- `--dry-run` — validate the payload and cross-check its slugs against the synced spine
  **without pushing**. Useful to sanity-check `unknownSlugs` before adopting for real.
- `--no-verify` — skip the post-ingest server read-back verification (see `verify` below).
- `--summary "<sentence>"` — optional: one plain sentence, at most 200 characters, on what this
  adopt changes, naming the tables, endpoints or channels, with no counts. Written from the digest
  draft's working material (the sync-digest reference, *The push sentence*); omit it rather than
  guess.
- `--digest <draftPath>` — optional: the digest draft from the step above, with your sentences
  written in. The CLI validates it, strips the working material and sends it with the adopt. A
  draft it cannot use is dropped with a warning (`digestReport`) and the adopt still runs.

## Exit codes

0 success · 1 config error (a **branch mismatch** lands here — relay the `error` verbatim, it
names the pinned branch and the fix) · 2 spine-not-synced / analysis error · 3 payload validation
error (schema or intra-payload) or post-ingest verify drift · 4 API error.

## Reporting the result

`pmap-adopt.js` prints an `AspectUpsertResult` (or, with `--dry-run`, just the validated payload's
slug cross-check). Summarise it for the user:

- `inserted` / `updated` / `deleted` — what changed on the board.
- `skippedManual` — manual rows the ingest left untouched (expected, not an error).
- **`unlinked`** — rows whose owning slug matched no node. **`unresolvedRefs`** — references whose
  `nodeSlug` matched no node.

If `unlinked` or `unresolvedRefs` is non-zero, tell the user which slugs were unknown (the CLI
reports `unknownSlugs`) and that re-running `/analyze` + `/sync` to add those nodes will
**auto-resolve** them on the next push (the server's re-resolution pass) — nothing was dropped,
they are just waiting for their node.

### `digestReport` — what became of the digest

Present only when `--digest` was passed. `sent: true` and `reason: "dry_run"` need no mention. Any
other `sent: false` means the draft was dropped and the adopt went ahead without it: say so in one
line with its `detail`, and do not re-run the adopt for the digest's sake.

### `verify` — the post-ingest server read-back

`verify.ok === false` (exit 3) means the server's aspect snapshot does not match what was pushed.
Report `familyMissing` / `snapshotMismatch` / each `missingKeys` entry / `countMismatch`
verbatim, then say:

> Post-ingest verification failed — re-run `/adopt` for this aspect; if the drift persists, ask
> your admin to check the server's aspect ingest.

`verify: {skipped: true}` (from `--no-verify`) and `verify: {unavailable: true}` must each be
reported in one line — never silently. When `unavailable` carries `notAvailable: true`, the
server predates aspect pull — the ingest itself landed; no action needed.

## State

State is written to `.provenmap/aspects/<board-slug>.<aspect>.json` so `/status` can show the last
adopt and its resolution counts.
