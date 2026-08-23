---
name: pmap-sync
description: Bundled Node.js CLI scripts for syncing codebase analysis to the ProvenMap Claude Code Plugin API. Provides pmap-sync.js for smart diff-based sync, pmap-archetypes.js for server archetype caching, pmap-boards.js for board management, and pmap-adopt.js for aspect adoption. Self-contained — no npm install required.
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

**Output:** JSON to stdout with fields: `success`, `nodeCount`, `edgeCount`, `pushResult`, `diff`, `timing`

**Exit codes:** 0=success, 1=config error, 2=analysis file error, 3=validation error, 4=API error

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

### pmap-adopt.js — Adopt an Aspect

Pushes one extracted aspect (database schema, API surface, frontend pages, event catalog, authz
registry) onto the bound board, resolving its owner/usage links against the synced spine.

**Invocation:**
```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-adopt.js --aspect <kind> --payload <payload-file> --mode <mode>
```

**Options:** `--aspect <kind>` and `--payload <path>` (both required), `--mode replace|merge`
(default `replace`), `--board-slug <slug>` (default `config.boardSlug`), `--analysis <path>`,
`--extractor-version <v>`, `--config <path>`, `--dry-run`, `--no-verify`, `--host <h>`,
`--domain <d>`.

**Output:** JSON `AspectUpsertResult` with `inserted`, `updated`, `deleted`, `skippedManual`,
`unlinked`, `unresolvedRefs`, `unknownSlugs`, `verify`.

**Exit codes:** 0=success, 1=config error (a **branch mismatch** lands here), 2=spine-not-synced
or analysis error, 3=payload validation error or post-ingest verify drift, 4=API error

See [aspect-adoption.md](references/aspect-adoption.md) for the modes, the flags, and how to
report each result field.

## Configuration Source

Scripts read configuration from `.provenmap/config.json`.

## Store Files

Sync state is stored per-board in `.provenmap/boards/stores/<board-slug>.store.json`. Each board has its own isolated store tracking element hashes and sync status.

## References

- [transformation-rules.md](references/transformation-rules.md) — Code archetype mapping table
- [sync-protocol.md](references/sync-protocol.md) — What `pmap-sync.js` does internally: smart sync, diff fields, push mode
- [sync-workflow.md](references/sync-workflow.md) — The `/sync` command's Steps 2.5–6: binding scope, integrity gate, push loop, reporting, tree repair
- [aspect-adoption.md](references/aspect-adoption.md) — The `/adopt` command's delegated tier: `pmap-adopt.js` modes, flags, exit codes, and how to report every result field
