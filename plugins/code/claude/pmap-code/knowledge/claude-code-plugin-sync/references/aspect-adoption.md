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
`authz.registry`; `<payload-file>` is the payload the extraction step wrote —
`.provenmap/aspects/tmp/<x>-payload.json`, where `<x>` is `db` | `api` | `pages` | `event` |
`authz` (`ui.pages` on a layered board writes one payload per sub-board; see its skill).

## Modes

`--mode` defaults to **`replace`** — a full snapshot: rows whose slug left the payload are
diff-deleted, but **the user's manual edits and human annotations survive** (the server never
touches manual rows or human-owned columns). Use **`--mode merge`** to add without pruning.

## Flags

- `--dry-run` — validate the payload and cross-check its slugs against the synced spine
  **without pushing**. Useful to sanity-check `unknownSlugs` before adopting for real.
- `--no-verify` — skip the post-ingest server read-back verification (see `verify` below).

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
