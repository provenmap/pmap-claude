---
name: codebase-analysis
user-invokable: false
description: Analyzes codebase architecture across multiple languages to extract components, relationships, and tech stacks for C4-style visualization. Use when user asks to "analyze codebase structure", "detect tech stack", "find components", "identify frameworks", "map architecture", or "analyze monorepo". Supports JavaScript/TypeScript, Python, Java, Go, C#/.NET, Ruby, and Rust.
license: MIT
compatibility: Claude Code plugin. Requires Node.js 18+ for bundled scripts.
metadata:
  author: ProvenMap
  version: 0.3.0
---

# Codebase Analysis for Architecture Visualization

## Overview

This skill provides guidance for analyzing codebases across multiple programming languages to extract architectural structure. The analysis produces nodes (components) and edges (relationships) suitable for C4-style architecture diagrams.

## Supported Languages

| Language                  | Manifest Files                                  | Frameworks                                    |
| ------------------------- | ----------------------------------------------- | --------------------------------------------- |
| **JavaScript/TypeScript** | `package.json`                                  | Next.js, NestJS, Express, React, Angular, Vue |
| **Python**                | `requirements.txt`, `pyproject.toml`, `Pipfile` | Django, FastAPI, Flask, Celery                |
| **Java**                  | `pom.xml`, `build.gradle`                       | Spring Boot, Quarkus, Micronaut               |
| **Go**                    | `go.mod`                                        | Gin, Echo, Fiber, gRPC                        |
| **C#/.NET**               | `*.csproj`, `*.sln`                             | ASP.NET Core, Blazor                          |
| **Ruby**                  | `Gemfile`                                       | Rails, Sinatra, Sidekiq                       |
| **Rust**                  | `Cargo.toml`                                    | Actix, Axum, Rocket                           |

## Language Detection

### Step 1: Identify Primary Language

Scan for manifest files to determine language:

```
package.json          → JavaScript/TypeScript
requirements.txt      → Python
pyproject.toml        → Python
pom.xml               → Java
build.gradle          → Java/Kotlin
go.mod                → Go
*.csproj              → C#/.NET
Gemfile               → Ruby
Cargo.toml            → Rust
```

### Step 2: Detect Frameworks

Each language has specific framework indicators. See `references/language-patterns.md` for complete detection rules.

### Step 3: Handle Polyglot Projects

For projects with multiple languages:

1. Group by **domain across languages** — one "Payments" group holding its Go service and its
   React app. Language is `metadata.language`, not a containment level: a per-language subtree
   buries the domain structure and renders every real flow as a wire between two trees.
2. Analyze each language section independently — the grouping is shared, the parsing is not
3. Map cross-language relationships (API calls, shared databases) — these are the edges that
   make a domain group visible as one thing

## Component Classification

### Universal Archetypes

These archetypes apply across all languages:

| Archetype   | Purpose          | Cross-Language Patterns              |
| ----------- | ---------------- | ------------------------------------ |
| `service`   | Business logic   | Service classes, use cases, handlers |
| `api`       | HTTP endpoints   | Controllers, routes, handlers, views |
| `database`  | Data access      | Repositories, models, entities, DAOs |
| `component` | UI elements      | Components, templates, views         |
| `queue`     | Message handlers | Workers, consumers, processors, jobs |
| `external`  | Third-party      | SDK clients, integrations            |

### Language-Specific Patterns

Each language has specific component file patterns and import syntax. See `references/language-patterns.md` for complete detection rules per language.

## Import/Dependency Analysis

### Relationship Detection

Structural `imports` edges are **script-owned**: the prepass skeleton
(`pmap-prepass.js`) resolves them deterministically and the rollup
(`--rollup <board-slug>`) maps them onto board nodes — never re-parse what the
skeleton already resolved. The model owns the **semantic** edge types, derived
by reading the involved files:

| Relationship | Detection Pattern               | Owner  |
| ------------ | ------------------------------- | ------ |
| `imports`    | Direct file/module imports      | script (skeleton + rollup) |
| `db_read`    | ORM/repository read operations  | model  |
| `db_write`   | ORM/repository write operations | model  |
| `api_call`   | HTTP client usage               | model  |
| `publishes`  | Message queue publish           | model  |
| `subscribes` | Message queue consume           | model  |
| `grpc_call`  | gRPC client calls               | model  |

Edges carrying `metadata.weight` are rollup-owned and regenerated every run;
edges without it are model-owned and persist. Keep `metadata.weight` when
reclassifying a rollup edge's `type`.

## Monorepo Support

### Detection by Language

| Language   | Monorepo Indicators                                                             |
| ---------- | ------------------------------------------------------------------------------- |
| **JS/TS**  | `workspaces` in package.json, `lerna.json`, `turbo.json`, `pnpm-workspace.yaml` |
| **Python** | Multiple `pyproject.toml`, `/packages/` structure                               |
| **Java**   | Multi-module Maven/Gradle, parent `pom.xml`                                     |
| **Go**     | Multiple `go.mod` files, `/cmd/` structure                                      |
| **C#**     | `.sln` with multiple `.csproj`                                                  |
| **Ruby**   | Multiple `Gemfile`, `/gems/` structure                                          |
| **Rust**   | Cargo workspaces in `Cargo.toml`                                                |

## Analysis Workflow

When invoked by `/analyze`, the deterministic prepass has already produced the
skeleton — the ground-truth file inventory and resolved imports graph. Do not
re-glob or re-apply exclusion rules; start from the skeleton's `nodes[]`.

### Step 1: Project Scanning

1. Scan for all manifest files to detect languages
2. Identify monorepo configuration per language
3. Build workspace/module boundaries

### Step 2: Tech Stack Identification

1. Parse manifest files for dependencies
2. Match against framework indicators
3. Create parent nodes per tech stack

### Step 3: Component Discovery

1. Take the file inventory from the skeleton's `nodes[]` (exclusions already applied); glob only for files outside the skeleton
2. Apply language-specific archetype rules
3. Build hierarchical node structure

### Step 4: Relationship Mapping

1. Merge the rollup's deterministic `imports` edges (script-owned)
2. Reclassify edge types where file reads show the real relation
3. Add semantic edges the rollup cannot see (db/api/queue)

### Step 5: Cross-Language Relationships

1. Identify shared databases (same connection strings)
2. Detect API calls between services
3. Map message queue producers/consumers

## Coverage Provenance

Coverage is the pipeline's honesty mechanism — every emitted node carries it:

- **`coveredFiles`** (per node): the skeleton files the node claims, as
  repo-relative paths or directory globs (`src/billing/**` for whole subtrees).
  Every skeleton file belongs in exactly one node's `coveredFiles`, or in the
  board metadata's **`waivedFiles`** (explicitly judged non-architectural —
  exact paths, never globs), or is deliberately left unclaimed to surface as
  *pending* in the coverage dashboard. Never drop a file silently.
- **The broad-claim limit is 30 files.** An analysed node may claim at most 29;
  at 30 or more the dashboard flags it as a broad claim. A node with
  `layerBoardSlug` is **exempt — a drill-down node has no file limit**, which
  makes drill-down (not splitting) the normal answer for a large area.
- **Mapped vs analysed**: a node with `layerBoardSlug` (or a broad claim)
  counts its files as *mapped, not analysed* until the child board analyses
  them — the dashboard excludes them from the analysed percentage.
- **Check the partition with a script, never by hand**:
  `pmap-prepass.js --claim-check <board.json>` reports unclaimed files, files
  claimed twice, and nodes over the limit — before the board is written, and
  against a draft anywhere on disk. Exit 3 means the one real defect: a file
  claimed by two nodes. Broad claims and unclaimed files report as debt.
  Add `--changed-since auto` for the incremental merge decision (which nodes to
  re-analyse, which to remove, which changed files nothing claims) and
  `--list-all` when the unclaimed list is your worklist rather than a display.
  **Never glob-match board claims against a file diff by hand** — that is this
  script's job, and doing it in-head is how a run ends up writing its own.
- The deterministic **coverage ledger** (`pmap-prepass.js --coverage` →
  `.provenmap/coverage.json`) computes all of this; never hand-compute coverage
  numbers.

The complete claiming rules live in `/analyze` Step 4.5 — follow them there
rather than duplicating them here.

## Output Format

### Node Format

```json
{
  "slug": "unique-node-slug",
  "name": "ComponentName",
  "type": "archetype",
  "description": "Brief one-line description of this component (max 500 chars)",
  "path": "/relative/path",
  "coveredFiles": ["src/api/**"],
  "parentSlug": "parent-node-slug",
  "detailedDescription": "## ComponentName\n\nBrief summary of what this component does.\n\n### Responsibilities\n- Key responsibility 1\n- Key responsibility 2\n\n### Technology\n- **Framework:** FastAPI\n- **Language:** Python\n- **Path:** `/src/api`",
  "metadata": {
    "language": "python",
    "framework": "fastapi"
  }
}
```

**Required fields:** `slug`, `name`, `type`, `description`, `detailedDescription` — plus `coveredFiles` on every non-container node (coverage provenance)
**Optional fields:** `path`, `parentSlug`, `layerBoardSlug`, `metadata`

### Edge Format

```json
{
  "sourceSlug": "source-node-slug",
  "targetSlug": "target-node-slug",
  "type": "relationship-type",
  "detailedDescription": "Describes how source depends on target — e.g. REST API calls over HTTP, direct database reads, event-driven via message queue.",
  "metadata": {
    "importPath": "module.path"
  }
}
```

### Description Fields

**`description`** (required, top-level): Brief one-line summary, max 500 characters. Displayed as subtitle in the UI.

**`detailedDescription`** (required, top-level): Rich **Markdown** content providing full context. This is the main documentation for the element. Every node and edge MUST have a `detailedDescription`.

**For node detailedDescription, include:**

- Purpose and responsibilities of the component
- Key patterns or design decisions
- Technology choices (framework, language, notable libraries)
- File path(s) covered

**For edge detailedDescription, include:**

- Nature of the dependency (import, API call, event, DB access)
- Data flow direction and protocol details
- Key interfaces or contracts involved

> **Note:** Do NOT put `description` inside `metadata`. Both `description` and `detailedDescription` are top-level node fields.

## Examples

### Example 1: Analyze a Next.js monorepo

User says: "Analyze this codebase architecture"

Actions:
1. Fetch available archetypes from ProvenMap
2. Detect project structure (monorepo with turborepo)
3. Identify tech stacks (Next.js, NestJS)
4. Discover components and classify by archetype
5. Map import relationships between components
6. Write analysis to `.provenmap/boards/<board-slug>.json`

Result: Architecture analysis with 15-25 nodes and relationship edges, saved to board JSON

### Example 2: Incremental re-analysis after changes

User says: "Re-analyze the codebase"

Actions:
1. Load existing board data and `analyzedAtCommit`
2. Take the worklist from the coverage ledger (`.provenmap/coverage.json`,
   refreshed at the start of the run): `staleNodes[]` (covered files changed —
   re-analyze from their `changedFiles`), `pendingFiles[]` (no node claims them
   yet — new components to place), `orphanedFiles[]` (covered files that no
   longer exist — remove/shrink their nodes). Git diff is only the
   ledger-failure fallback and the deletion confirmer
3. Re-analyze only the worklist files, merge into existing board data
4. Update `analyzedAtCommit` to current HEAD

Result: Updated analysis with minimal re-processing — only changed nodes updated

## Troubleshooting

### Error: No archetypes available
**Cause:** ProvenMap configuration missing or API unreachable
**Solution:** Run `/configure` to set up credentials, then retry

### Error: No board slug configured
**Cause:** Configuration exists but `boardSlug` field is missing
**Solution:** Run `/configure` — the root board will be auto-discovered from the server

### Error: Analysis produces no nodes
**Cause:** Source files may all be in excluded paths
**Solution:** Check `excludePaths` in `.provenmap/config.json` and adjust

## Additional Resources

### Reference Files

- **`references/language-patterns.md`** - Complete language detection and framework patterns
- **`references/framework-patterns.md`** - JS/TS framework patterns (legacy, detailed)
- **`references/archetype-rules.md`** - Archetype classification rules
