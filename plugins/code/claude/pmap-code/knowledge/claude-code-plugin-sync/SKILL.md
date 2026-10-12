---
name: pmap-sync
description: Bundled Node.js CLI scripts for syncing codebase analysis to the ProvenMap Claude Code Plugin API. Provides pmap-sync.js for smart diff-based sync, pmap-changes.js for reading git history into change periods, pmap-archetypes.js for server archetype caching, pmap-boards.js for board management, and pmap-aspects.js for pushing aspects. Self-contained — no npm install required.
user-invokable: false
metadata:
  author: ProvenMap
  version: 0.2.0
---

# ProvenMap Sync Scripts (Code)

This skill provides bundled Node.js scripts for syncing codebase architecture analysis data to the ProvenMap Claude Code Plugin API. These scripts are self-contained — no npm install required.

## Available Scripts

### pmap-sync.js — Sync Analysis Data

Transforms codebase analysis (`.provenmap/boards/<board-slug>.json`) into ProvenMap format and pushes to the API.

**Invocation:**
```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-sync.js [options]
```

**Options:**
| Flag | Default | Description |
|---|---|---|
| `--config <path>` | `.provenmap/config.json` | Config file path |
| `--analysis <path>` | `.provenmap/boards/<board-slug>.json` | Analysis file path |
| `--board-slug <slug>` | (required) | Board slug for this sync |
| `--dry-run` | - | Validate and transform only, don't push |
| `--smart-sync` | - | Enable diff-based sync (recommended) |
| `--force-pull` | - | Force refresh of server elements before diff |
| `--store-file <name>` | `.provenmap/boards/stores/<board-slug>.store.json` | Store file name |
| `--cache-file <name>` | `.provenmap/boards/archetypes-cache.json` | Archetype cache file name |
| `--host <h>` | - | Plugin host (claude\|codex\|cursor) stamped on the push identity |
| `--domain <d>` | - | Plugin domain (code\|connect) stamped on the push identity |
| `--summary <text>` | - | One sentence (at most 200 characters) on what this push changed; shown on the hub's activity feed |

**Output:** JSON to stdout with fields: `success`, `nodeCount`, `edgeCount`, `pushResult`, `diff`, `timing`

**Exit codes:** 0=success, 1=config error, 2=analysis file error, 3=validation error, 4=API error

### pmap-changes.js — Read Git History into Change Periods

Computes one record per calendar period (the workspace's grain, UTC) for the bound branch — the
commits in it, who was involved and with which coding agent, the services touched across every
board, a yes or no per files-triggered change rule — for every period the server does not have
yet, and writes them as one draft; `--fill` writes the agent's sentences into it; `--send`
validates and records it in batches. Run by `/changes`, and chained by `/analyze --scheduled`.

**Invocation:**
```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-changes.js [--board-slug <slug>] [--since <date>] [--recompute] [--facts-only] [options]
node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-changes.js --fill <draft> --prose <n>="<sentence>" [--prose ...]
node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-changes.js --send <draft>
node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-changes.js --check
```

**Options:**
| Flag | Default | Description |
|---|---|---|
| `--board-slug <slug>` | `config.boardSlug` | The bound board |
| `--since <date>` | the workspace's backfill horizon | Read further back, once |
| `--recompute` | - | Rewrite closed periods the server already has from git |
| `--facts-only` | - | Leave every sentence null; list no fill slots |
| `--model <name>` | - | The model the agent is running as (self-reported) |
| `--host <h>` | - | Plugin host (claude\|codex\|cursor) |
| `--domain <d>` | - | Plugin domain (code\|connect) |
| `--fill <draft>` | - | Write sentences into this draft instead of computing one |
| `--prose <n>=<text>` | - | With `--fill`: the sentence for fill entry `<n>`; repeat per entry |
| `--send <draft>` | - | Validate every period and record them, in batches |
| `--check` | - | One context call: how many closed periods are not recorded yet (`missing`, `display`) |

**Output:** JSON with `changes`. `written`: `draftPath` (`.provenmap/changes/draft.json`),
`periods`, and `fill` — the numbered sentences left for the agent, newest period first. `none`:
`reason` (`nothing_missing`, `older_server`, `not_a_git_repo`, `failed`) and `detail`. With `--fill`:
`filled` (`written`, `unknown`, `left`) or `unfilled` (`detail`). With `--send`: `sent` (per-period
`outcomes`, `display`, and `.provenmap/changes/state.json` written) or `unsent` (the draft is kept).

**Exit codes:** always 0 — a change period never stops a run

### pmap-archetypes.js — Fetch Archetypes

Fetches available archetypes from the Claude Code Plugin API with TTL-based caching.

**Invocation:**
```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-archetypes.js [options]
```

**Options:**
| Flag | Default | Description |
|---|---|---|
| `--config <path>` | `.provenmap/config.json` | Config file path |
| `--cache-file <name>` | `.provenmap/boards/archetypes-cache.json` | Cache file name |
| `--no-cache` | - | Bypass cache, always fetch from server |
| `--kind <kind>` | `code` | Catalogue kind to fetch (`code`\|`knowledge`) |
| `--full` | - | Also emit the raw `archetypes[]` array (large — only `/analyze-archetypes` needs it) |

**Output:** JSON with `catalogue` (the compact catalogue you classify from — emitted instead of
the raw array, and never printed), `display` (the bounded summary you do print),
`nodeArchetypes`, `edgeArchetypes`, `cacheFile`, `catalogueHash`. `--full` adds `archetypes[]`.

### pmap-boards.js — Manage Boards

Fetches boards from the server and optionally ensures child boards exist before syncing.

**Invocation:**
```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-boards.js [options]
```

**Options:**
| Flag | Default | Description |
|---|---|---|
| `--config <path>` | `.provenmap/config.json` | Config file path |
| `--ensure-boards <path>` | - | Manifest path — create missing child boards |
| `--host <h>` | - | Plugin host (claude\|codex\|cursor) stamped on the push identity |
| `--domain <d>` | - | Plugin domain (code\|connect) stamped on the push identity |

**Mode 1 — Fetch boards** (no `--ensure-boards`):
Calls `GET /code-plugin/boards` and outputs the full board list as JSON with `boards`, `rootBoard`, `childBoards`, and `boardCount`.

**Mode 2 — Ensure boards** (`--ensure-boards <manifest>`):
Reads the local manifest, fetches server boards, computes missing child boards, and calls `POST /code-plugin/boards` to create them. Outputs JSON with `created`, `existing`, and `errors`.

**Exit codes:** 0=success, 1=config error, 2=API error

### pmap-aspects.js — Push an Aspect

Pushes one extracted aspect (database schema, API surface, frontend pages, event catalog, authz
registry) onto the bound board, resolving its owner/usage links against the synced spine.

**Invocation:**
```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-aspects.js --aspect <kind> --payload <payload-file> --mode <mode>
```

**Options:** `--aspect <kind>` and `--payload <path>` (both required), `--mode replace|merge`
(default `replace`), `--board-slug <slug>` (default `config.boardSlug`), `--analysis <path>`,
`--extractor-version <v>`, `--config <path>`, `--dry-run`, `--no-verify`, `--summary <text>`,
`--host <h>`, `--domain <d>`.

**Output:** JSON `AspectUpsertResult` with `inserted`, `updated`, `deleted`, `skippedManual`,
`unlinked`, `unresolvedRefs`, `unknownSlugs`, `verify`.

**Exit codes:** 0=success, 1=config error (a **branch mismatch** lands here), 2=spine-not-synced
or analysis error, 3=payload validation error or post-ingest verify drift, 4=API error

See [aspects-workflow.md](references/aspects-workflow.md) for the modes, the flags, and how to
report each result field.

## Configuration Source

Scripts read configuration from `.provenmap/config.json`.

## Store Files

Sync state is stored per-board in `.provenmap/boards/stores/<board-slug>.store.json`. Each board has its own isolated store tracking element hashes and sync status.

## References

- [transformation-rules.md](references/transformation-rules.md) — Code archetype mapping table
- [sync-protocol.md](references/sync-protocol.md) — What `pmap-sync.js` does internally: smart sync, diff fields, push mode
- [sync-workflow.md](references/sync-workflow.md) — The `/sync` command's Steps 2.5–6: binding scope, integrity gate, push loop, reporting, tree repair
- [change-periods.md](references/change-periods.md) — The `/changes` command's Steps 1–3: computing the period draft, the prose budget and writing rules, sending it; the closing hint `/sync` and `/analyze` print
- [aspects-workflow.md](references/aspects-workflow.md) — The `/aspects` command's delegated tier: `pmap-aspects.js` modes, flags, exit codes, and how to report every result field
