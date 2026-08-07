---
category: map
description: "Map · Extract and adopt a code aspect (database schema, API surface, frontend pages, event catalog, or authz registry) onto the bound board"
argument-hint: "[--aspect <kind> | --db | --api] [--mode replace|merge] [--dry-run] [--no-verify]"
allowed-tools: Read, Glob, Grep, Write, Bash(node:*, git:*), AskUserQuestion
---

Extract one **aspect** of this repository and adopt it onto the board its spine is bound to. Aspects are the typed detail that hangs off the architecture graph: tables and columns, endpoints, routes and pages — and the links back to the nodes that own and use them.

The primary argument is `--aspect <kind>` (this is the flag `pmap-adopt.js` itself takes). `--db`/`--api` are back-compat shorthand for the two original kinds, kept for muscle memory — they resolve to the same `--aspect database.schema` / `--aspect api.surface` underneath.

## Built aspect kinds

| `--aspect <kind>` | Alias | Skill | Payload file |
| --- | --- | --- | --- |
| `database.schema` | `--db` | **db-aspect-extraction** | `.provenmap/aspects/tmp/db-payload.json` |
| `api.surface` | `--api` | **api-aspect-extraction** | `.provenmap/aspects/tmp/api-payload.json` |
| `ui.pages` | — | **pages-aspect-extraction** | `.provenmap/aspects/tmp/pages-payload.json` |
| `event.catalog` | — | **event-aspect-extraction** | `.provenmap/aspects/tmp/event-payload.json` |
| `authz.registry` | — | **authz-aspect-extraction** | `.provenmap/aspects/tmp/authz-payload.json` |

If no `--aspect`/`--db`/`--api` flag is given, use `AskUserQuestion` to ask which kind to adopt, offering the built kinds above.

When adopting `ui.pages` onto a layered board's sub-boards, write one payload per sub-board named `.provenmap/aspects/tmp/pages-payload-<sub-board>.json` (e.g. `pages-payload-portal-app.json`) — the inspector's route→page correlation merges every `pages-payload*.json` in that directory, so this suffix convention is what keeps drill-down pages correlatable.

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

## Precondition — the spine must be synced first

Aspects resolve their owner and usage links **by node slug**, so the board's spine (nodes + edges) must already be synced. Before extracting:

1. Confirm `.provenmap/config.json` exists (run `/configure` if not).
2. Confirm `.provenmap/boards/<board-slug>.json` exists and has nodes (run `/analyze` then `/sync` if not).

If the synced analysis is missing, **stop** and tell the user to run `/sync` first — do not fabricate slugs. `pmap-adopt.js` enforces this too and exits with a "no synced spine" error, but catch it early with a clear message.

`pmap-adopt.js` also refuses (exit 1) on a **branch mismatch** — the binding is pinned to one branch and the server rejects pushes from any other. Relay its `error` field verbatim; it names the pinned branch and the fix.

Read `.provenmap/boards/<board-slug>.json` and keep its node `slug`s handy — every node-ref field you emit (`ownerSlug`, `references[].nodeSlug`, or for `ui.pages` the page's own `slug` plus its other node-ref fields — see that skill's golden rule) **must** be one of them.

## Workflow

1. **Resolve the aspect kind** from the table above (`--aspect` value directly, or `--db`/`--api` mapped to their `--aspect` equivalent, or asked via `AskUserQuestion`).
2. **Load that kind's skill** and follow it to read the aspect from source — ORM schemas / migrations for `database.schema`, OpenAPI/controllers/routers for `api.surface`, route files for `ui.pages`, AsyncAPI specs / broker infra-as-code / client call sites for `event.catalog`, CASL/Cerbos/OPA/Polar/IAM policy definitions or a DB-backed RBAC table's schema for `authz.registry`. **Never run the app, connect to a live database, call a live endpoint, connect to a live broker, or evaluate a policy against real inputs** — read the definitions.
3. **Produce the payload JSON** at the table's path, matching that kind's wire schema (fields are documented in the loaded skill).
4. **Adopt it**:
   ```
   node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-adopt.js --aspect <kind> --payload <payload-file> --mode <mode>
   ```
   Add `--dry-run` to validate the payload and cross-check its slugs against the synced spine **without pushing** — useful to sanity-check `unknownSlugs` before adopting for real. Add `--no-verify` to skip the post-ingest server read-back verification (see the Report section below).

`--mode` defaults to `replace` (a full snapshot: rows whose slug left the payload are diff-deleted, but **your manual edits and human annotations survive** — the server never touches manual rows or human-owned columns). Use `--mode merge` to add without pruning.

## Report

`pmap-adopt.js` prints an `AspectUpsertResult` (or, with `--dry-run`, just the validated payload's slug cross-check). Summarise it for the user:

- `inserted` / `updated` / `deleted` — what changed on the board.
- `skippedManual` — manual rows the ingest left untouched (expected, not an error).
- **`unlinked`** — rows whose owning slug matched no node. **`unresolvedRefs`** — references whose `nodeSlug` matched no node.

If `unlinked` or `unresolvedRefs` is non-zero, tell the user which slugs were unknown (the CLI reports `unknownSlugs`) and that re-running `/analyze` + `/sync` to add those nodes will **auto-resolve** them on the next push (the server's re-resolution pass) — nothing was dropped, they are just waiting for their node.

- `verify`: the post-ingest server read-back. `verify.ok === false` (exit 3) means
  the server's aspect snapshot does not match what was pushed — report
  `familyMissing` / `snapshotMismatch` / each `missingKeys` entry /
  `countMismatch` verbatim, then say: "Post-ingest verification failed — re-run
  `/adopt` for this aspect; if the drift persists, ask your admin to check the
  server's aspect ingest." `verify: {skipped: true}` (from `--no-verify`) and
  `verify: {unavailable: true}` must each be reported in one line — never
  silently. When `unavailable` carries `notAvailable: true`, the server predates
  aspect pull — the ingest itself landed; no action needed.

State is written to `.provenmap/aspects/<board-slug>.<aspect>.json` so `/status` can show the last adopt and its resolution counts.
