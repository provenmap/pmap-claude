# ProvenMap Code

The `pmap-code` plugin — codebase architecture analysis for [ProvenMap Portal](https://provenmap.com). Discovers your project's components, classifies them against your org's archetype catalogue, maps relationships, and syncs the result as a layered architecture board you can review and share.

ProvenMap Code runs in **Claude Code**. Its sibling, **ProvenMap Connect** (`pmap-connect`), binds a document/knowledge repo to an architect-authored board instead of producing one.

## Install

Add the ProvenMap marketplace once, then install the plugin:

```bash
/plugin marketplace add provenmap/pmap-claude
/plugin install pmap-code@provenmap
```

Restart Claude Code so the commands load. Scope the install with `--scope user` (default), `--scope project`, or `--scope local`. Claude **Cowork** installs from the same marketplace.

> `pmap-code` is the install id — everywhere else it's **ProvenMap Code**.

## Configure

Two ways to connect this repo to a board — both write the same `.provenmap/config.json`:

**Browser login (fastest):** run `/login`. It signs you in through the ProvenMap portal, lets you pick a workspace and a board that already has a Code Plugin binding, and writes the config for you — no tokens to copy. Re-running `/login` while connected just confirms the connection; `/login switch` (or `/configure`'s "change board" option) binds the project to a different board, and `/logout` disconnects it (clears the local credentials).

**Manual:** get a **Binding Token** and **API Secret** from the ProvenMap Portal (**Sources → Add Source → Board Builder** — saving generates the secret), then create `.provenmap/config.json` at your repo root:

```json
{
  "bindingToken": "your-base64url-binding-token",
  "apiSecret": "ck_cp_live_your_api_secret",
  "boardSlug": "my-project-overview",
  "branch": "main",
  "baseUrl": "https://platform.provenmap.com/api"
}
```

| Field | Required | Notes |
|---|---|---|
| `bindingToken` | yes | Base64url `workspaceId::bindingId` from the portal. Sent as `X-CodePlugin-Token`. |
| `apiSecret` | yes | Must start with `ck_cp_live_`. Sent as `X-CodePlugin-Secret`. |
| `boardSlug` | yes | Target board. `/configure` can discover and write it for you. |
| `branch` | yes | Must match the binding, or `/sync` returns `400 Branch Mismatch`. |
| `baseUrl` | no | Override for self-hosted (default `https://platform.provenmap.com/api`). |
| `excludePaths` | no | Paths skipped during analysis (default `node_modules, dist, .git, coverage`). |
| `includeTests` | no | Include test files in analysis (default `false`). |
| `includeSourceReferences` | no | Attach file-path references to synced nodes/edges (default `true`). |
| `analysis.minorFiles` | no | How small helper files land on drill-down boards (default `all`): a file of at most `analysis.minorMaxLines` lines that other files import and that exports no class folds into the node that uses it instead of becoming its own node. `one-host` folds only files with a single importer; `off` disables the fold. |
| `analysis.minorMaxLines` | no | Line cap for that fold (default `100`). Files above it are always their own candidates. |

Run `/configure` to validate the config, test the connection, and add `.provenmap/` to your `.gitignore`. Credentials live only in this file — never logged, and sent only to `platform.provenmap.com`.

> **Testing against a non-production server:** set `PMAP_BASE_URL` (or pass `--base-url` to the CLI scripts) to point every command — including `/login`'s device handshake — at a staging or local API. The browser login and app URLs then follow from that server's configuration, so nothing is pinned to production. A successful `/login` writes the URL it ran against into `.provenmap/config.json`, so the repo stays on that server without the env var; when both are set, `PMAP_BASE_URL` wins.

## Quick start

1. `/start` — the guided front door: the surfaces card, the ranked next step for this repo's real state, and a menu to run it. Every command closes with the same next-steps footer.
2. `/login` (browser) or `/configure` (manual) — connect to the portal (one-time per repo)
3. `/analyze` — full architecture analysis (incremental — only changed files re-analyzed)
4. `/sync` — push the analysis to your board
5. `/insights` — run server-defined analyses (security, performance, etc.) against the board
6. `/status` — see what's analyzed and what's synced

`/analyze-archetypes` is **optional** — see [Archetypes](#archetypes-server-defined-settlement-optional).

## Supported languages

Automatically detects projects in 7+ languages via their manifest files:

| Language | Manifest | Common frameworks |
|---|---|---|
| **JS/TypeScript** | `package.json` | Next.js, NestJS, Express, React, Angular, Vue |
| **Python** | `requirements.txt`, `pyproject.toml`, `Pipfile` | Django, FastAPI, Flask, Celery |
| **Java** | `pom.xml`, `build.gradle` | Spring Boot, Quarkus, Micronaut |
| **Go** | `go.mod` | Gin, Echo, Fiber, gRPC |
| **C# / .NET** | `*.csproj`, `*.sln` | ASP.NET Core, Blazor, EF |
| **Ruby** | `Gemfile` | Rails, Sinatra, Sidekiq |
| **Rust** | `Cargo.toml` | Actix, Axum, Rocket |

Polyglot projects produce a unified board with cross-language relationships (HTTP, gRPC, message queues).

## Commands

| Command | Description |
|---|---|
| `/start` | Start here — the surfaces card, the ranked next step, and a menu to run it |
| `/login` | Browser sign-in: pick a workspace + bound board, writes config automatically |
| `/configure` | Set up portal credentials manually, or switch to a different board |
| `/analyze [path]` | Analyze codebase architecture (incremental; re-analyzes only changed files) |
| `/analyze --clean` | Full re-analysis from scratch, ignoring existing board data |
| `/analyze --drill <board>/<node>` | Drill into a node to produce a child layer board |
| `/analyze --all` | Re-analyze every layer board in the manifest |
| `/sync [--board <slug>]` | Push analysis to portal (smart diff: only changed elements) |
| `/sync --all` | Push every board in the manifest |
| `/insights` | List available insight skills and run one against the current board |
| `/insights <skill-slug>` | Run a specific insight skill directly |
| `/insights --all` | Run every available insight skill |
| `/skills [--status]` | Compile the platform's skill bundle (specs + guidelines) into the repo — never overwrites local edits |
| `/build [--plan]` | Build the app from the platform's spec — compiled skills, intents, board design, aspect contracts (write-capable; `--plan` = plan only) |
| `/intents` | Pull architect-authored intents (work items) for the board and pick one to implement |
| `/intents <intentId>` | Claim, implement, verify, and resolve a specific intent (write-capable — edits project files) |
| `/demo-insights [count] [--board <slug>]` | Seed a board with a few demonstrative, path-rich insights to showcase the insights feature |
| `/adopt [--aspect <kind> \| --db \| --api]` | Extract a code aspect (database schema, API surface, frontend pages, event catalog) onto the bound board |
| `/monitor` · `/monitor setup` | Correlate monitoring signals (errors, logs, cloud costs) with the board and push findings as a draft insight; `setup` configures sources + a recurring run |
| `/status` | Show the lifecycle dial, config state, analysis summary, and per-board sync status |
| `/help` | List commands grouped by lifecycle stage, with the plugin version |
| `/update` | Update this plugin to the latest published version for your host |
| `/analyze-archetypes` | _Advanced_ — customize the archetype vocabulary: scan for gaps, submit proposals for admin review |
| `/analyze-archetypes --dry-run` | Validate scan locally + ask server to dry-run, don't persist or POST |
| `/analyze-archetypes --skip-submit` | Write the proposals file for manual review; don't POST |
| `/analyze-archetypes --replace` | When submitting, send `mode='replace'` to overwrite pending payload |

## Layered boards

For non-trivial codebases, `/analyze` produces a hierarchy of boards so you can navigate from a 10–30 node overview down to component-level detail without overwhelming any single view:

| Layer | Name | Scope | Target node count |
|---|---|---|---|
| **L0** | System Context | This system's deployables + the outside systems they talk to | 10–30 |
| **L1** | Domain | Domain or workspace drill-down | 10–40 per board |
| **L2** | Component | Service or module drill-down | 5–20 per board |
| **L3** | Detail | Deep internals (opt-in) | 5–15 per board |

Board hierarchy and per-board sync state live in `.provenmap/boards/`:

- `manifest.json` — every board's slug, layer, parent, and analysis state
- `<board-slug>.json` — analysis output (nodes + edges) for that board
- `stores/<board-slug>.store.json` — sync state, content hashes, last push

## Archetypes (server-defined, settlement optional)

Components are classified using archetypes defined on your ProvenMap server, **not** a fixed list shipped with the plugin. `/analyze` fetches the current catalogue via `/code-plugin/archetypes` and the architecture-analyzer agent assigns each discovered node a valid archetype name.

Where your codebase has a pattern the catalogue has no good name for, `/analyze` types it with the closest available archetype, records the gap in the board's `metadata.archetypeGaps`, and names it once at the end of the run. Nothing blocks — the board is complete either way.

Acting on that is optional. `/analyze-archetypes` scans for the same gaps and submits proposals (new archetypes, or improvements to existing ones) for admin review; once approved, `/analyze --clean` retypes the affected components.

### Advanced: making settlement a precondition

Set this in `.provenmap/config.json` to restore the old two-phase workflow, where `/analyze` stops and prompts whenever the archetype lock is missing, stale, or was skipped:

```json
{ "analysis": { "archetypeGate": "strict" } }
```

Remove the key to go back to the optional default.

Open the ProvenMap UI to see the current archetype catalogue — the plugin fetches it automatically during `/analyze`.

## Output format

Analysis output at `.provenmap/boards/<board-slug>.json`:

```json
{
  "metadata": {
    "analyzedAt": "2026-05-13T10:30:00Z",
    "analyzedAtCommit": "abc1234",
    "projectName": "my-project",
    "languages": ["python", "typescript"],
    "techStacks": ["fastapi", "react"],
    "layer": 0
  },
  "nodes": [
    {
      "slug": "user-service",
      "name": "User Service",
      "type": "<server-archetype-name>",
      "description": "User management service",
      "path": "src/services/user_service.py",
      "parentSlug": "backend-domain",
      "metadata": { "language": "python", "framework": "fastapi" }
    }
  ],
  "edges": [
    {
      "sourceSlug": "user-service",
      "targetSlug": "user-repository",
      "type": "<server-edge-archetype-name>",
      "metadata": { "importPath": "from .repository import UserRepository" }
    }
  ]
}
```

The `type` field holds the server archetype name assigned by the analyzer. Edge `type` values come from the edge-archetype list returned by the same endpoint.

## Agents

| Agent | Role |
|---|---|
| **architecture-analyzer** | Multi-language structure analysis, archetype classification, domain grouping, hierarchy building |
| **relationship-detector** | Imports, DB operations, HTTP/gRPC calls, message queue patterns across languages |

`/analyze` orchestrates both agents. They can also be invoked directly from Claude Code's subagent picker to debug a specific analysis step.

## Requirements

- Node.js (for the bundled CLI scripts)
- A ProvenMap Portal account with a Board Builder source bound to your board
- Git repo (incremental analysis uses `git diff` for change detection)

## License

BUSL-1.1
