---
category: map
description: "Map · Analyze codebase architecture with layered board support"
argument-hint:
  [--clean | --drill <parent-board-slug>/<node-slug> | --all | --auto]
allowed-tools: Read, Glob, Grep, Write, Bash(node:*, git:*), AskUserQuestion, Task
---

Perform progressive architecture analysis with layered board support.

## Board Layer Strategy

Analysis produces layered boards for managing large codebases:

| Layer | Name      | Scope                       | Target Nodes |
| ----- | --------- | --------------------------- | ------------ |
| L0    | Overview  | Entire project              | 10-30        |
| L1    | Domain    | Domain/workspace drill-down | 10-40 each   |
| L2    | Component | Service/module drill-down   | 5-20 each    |
| L3    | Detail    | Deep internals (opt-in)     | 5-15 each    |

All board data lives in `.provenmap/boards/`:

- `manifest.json` — tracks all boards and their relationships
- `<board-slug>.json` — analysis data per board
- `stores/<board-slug>.store.json` — sync state per board

## Analysis Modes

### Default: Incremental Analysis

```
/analyze
```

**If board data already exists** (`.provenmap/boards/<board-slug>.json` with nodes/edges):

1. Read the existing board's `analyzedAtCommit` hash from metadata
2. Take the worklist from the Step -0.5 coverage ledger — stale nodes, pending files, orphaned references (Step 1.5 has the mechanics); git is used only to confirm deletions and as the ledger-failure fallback
3. If the worklist is empty, report "Board is up to date — nothing changed since last analysis" and skip
4. If changes found:
   a. Load existing board data (nodes + edges)
   b. Re-analyze ONLY the changed/added files (Steps 3-6 scoped to those files)
   c. Merge results: replace nodes whose `coveredFiles` contain a changed file, add new nodes
   d. Remove nodes all of whose `coveredFiles` (or whose `path`) match deleted files
   e. Remove edges where source or target node was removed
   f. Re-run relationship detection for changed nodes (Step 6)
   g. Write merged result to board JSON with updated `analyzedAt` and `analyzedAtCommit`
   h. Update manifest

**If no board data exists** (fresh project): run full analysis (Steps 0-9).

**If `analyzedAtCommit` is missing** (no commit anchor — incremental is impossible): fall back to full analysis.

### Clean: Full Re-Analysis

```
/analyze --clean
```

Ignores existing board data. Deletes the board's JSON and store file, then runs full analysis from scratch (Steps 0-9). Use when the codebase has changed significantly or the incremental result looks stale.

Combine with `--drill` to rebuild one child board from scratch: `/analyze --drill <parent-board-slug>/<node-slug> --clean` — this is the recovery path when the coverage dashboard marks a specific drill-down board `coverage: unknown`.

### Drill-Down: Create Child Board

```
/analyze --drill <parent-board-slug>/<node-slug>
```

Creates a child board by drilling into a specific node from a parent board. The node must exist in the parent's analysis data. Incremental mode applies to drill-down boards too — if the child board already exists, only changed files within its scope are re-analyzed.

### Full Progressive: All Layers

```
/analyze --all
```

Runs L0 first, then prompts for review before creating L1 boards for each drill-down node. Repeats for L2 if applicable. Each board uses incremental mode if it already exists.

When building several boards **in parallel** (subagents), give every intermediate/scratch file a board-slug prefix — parallel agents share one scratchpad directory and generic filenames silently clobber each other. When the user approves several drill-downs at once, build them via the Step 8.7 fan-out.

In `--all` mode the per-board review prompts above govern the middle of the run — run Step 8.6 (the next-area question) **once, after the final board**, not per board.

### Unattended: Full Automation

```
/analyze --all --auto
```

`--auto` removes every mid-run prompt and loops until all layers are analysed — on a fresh project (`--all --auto` bootstraps L0 first) or an existing board tree (`/analyze --auto` finishes whatever coverage remains). **Loop control is script-owned:** every round is planned, tracked, and terminated by the `--auto-plan` mode of the prepass CLI — never by your own judgment. It refreshes the coverage ledger, keeps the per-round history in `.provenmap/auto-run.json`, and renders the between-rounds stats.

The loop:

1. **Start** (after the Step -2/-1 gates, replacing Step -0.5): `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-prepass.js --auto-plan --reset`. Print its `display` **verbatim — do not reformat, reorder, or summarise** (bar, counts, trend, and this round's plan).
2. **Branch on the JSON** — the script owns the verdict:
   - `mode: "bootstrap"` — no boards yet (fresh analysis): run the full L0 analysis (Steps 0–9), then go to 3.
   - `mode: "round"` — execute the plan exactly: `parallel[]` as one Step 8.7 batch (one subagent per drill-down), then `sequential[]` one at a time (Step 8.6 step-4 mechanics). Act on nothing the plan doesn't list; never waive files. As each board finishes, print one status line — board slug, node/edge counts, gate pass/fail — so progress stays visible mid-round. Then go to 3.
   - `mode: "done"` or `"stalled"` — the run is over. Print `display` verbatim (it ends with the full coverage dashboard and the deferred judgment calls — broad claims and pending waiver decisions). On `stalled`, relay `stallReason`. Close the final report with `Run /sync to push the boards and this coverage snapshot.`
3. **Re-plan:** run `--auto-plan` again (no `--reset`) — it refreshes the ledger itself, so Step 8.5 is skipped entirely in auto mode. Print `display` verbatim and return to 2.

Prompts elsewhere become stops, never silent skips: the archetype precondition, branch mismatch, and not-connected gates each stop with their canonical sentence (Steps -2/-1 name the `--auto` behaviour). The script's stall guard and round cap are the only termination authority — do not stop early because the loop "feels" done, and never continue past a `done`/`stalled` verdict.

## Analysis Workflow

### Step -2: Preflight — binding, branch, local state

This command touches board state, so it runs behind the preflight gate. The gate is **enforced by a
script, not by prose** — run it and react to its exit code; never decide on your own that the
project is fine.

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-preflight.js
```

Print the JSON's `display` field **verbatim** — do not reformat, reorder, or summarise it.

| exit | meaning                                | action                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ---- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0    | Proceed                                | Continue to the next step. If `repairs.boardsRecovered` is non-empty, local state was just restored from the server — say so once (the `display` already carries the sentence) and continue.                                                                                                                                                                                                                                                                                                                                              |
| 1    | Not connected, or credentials rejected | Make the **connect-now offer**: AskUserQuestion "Connect to ProvenMap now?" → **Connect now** runs `pmap-login.js --start` then `--poll` inline (print each `display` verbatim) and resumes this command on `status: "complete"`; **Not now** stops with the `error` sentence verbatim. In `--auto` mode skip the offer and stop with the `error` sentence verbatim.                                                                                                                                                                      |
| 2    | Binding could not be verified          | Print `error` verbatim and stop. Name `/status` for the full local picture.                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 11   | Branch mismatch                        | Print `display` verbatim, then ask via AskUserQuestion (in `--auto` mode: stop after printing — the `display` already carries the `git switch` recovery). Header: `Branch`. Question: `"This project is bound to a different branch. How do you want to proceed?"` Options: **Re-bind to this branch (`/login`)** — run the `/login` workflow inline, then re-run this step; **Stop — I'll switch branches myself** — stop, having already printed the `git switch` line. Never run `git switch` yourself: the working tree may be dirty. |

### Step -1: Archetype precondition check

`/analyze` operates as Phase 2 of the two-phase workflow. Phase 1 (`/analyze-archetypes`) settles the archetype catalogue first so every node gets a fit archetype rather than a misfit. The precondition is **enforced by a script, not by prose** — you must run it and react to its exit code; do not decide on your own whether Phase 1 has been satisfied.

1. Run the precondition script:

   ```bash
   node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-precondition.js --kind code
   ```

2. Parse the JSON output. The `status` field + exit code drive behaviour:

   | status            | exit | requiresPrompt | action                                                                                                 |
   | ----------------- | ---- | -------------- | ------------------------------------------------------------------------------------------------------ |
   | `ok`              | 0    | false          | Proceed silently to Step 0.                                                                            |
   | `pending`         | 0    | false          | Print the `reason` from the JSON as a warning, then proceed.                                           |
   | `missing`         | 10   | true           | Lock file does not exist. Prompt the user (see step 3).                                                |
   | `stale_commit`    | 10   | true           | Codebase has moved since the last archetype scan. Prompt (see step 3).                                 |
   | `stale_catalogue` | 10   | true           | Server catalogue has changed since the last scan. Prompt (see step 3).                                 |
   | `skipped`         | 10   | true           | Last run was skipped — **skip is one-shot, this re-prompts on every `/analyze`**. Prompt (see step 3). |

   On exit code `1` (not connected — `status: not_connected`) or `2` (API error): print the script's `error` field verbatim and stop. Step -2 has already offered to connect, so a `1` here means the user declined or the credentials are still rejected.

3. When `requiresPrompt` is true, ask via AskUserQuestion. In `--auto` mode do not ask and do not skip: stop with the script's `reason` verbatim plus _"Archetype check needs a decision — run `/analyze-archetypes` first, or run `/analyze` without `--auto` to decide interactively."_ Header: `Archetype check`. Question: include the script's `reason` verbatim, then `"How do you want to proceed?"`. Provide exactly these two options:
   - **Run /analyze-archetypes now (recommended)** — Invoke the `/analyze-archetypes` flow now.
     - If the user submits proposals there → **exit `/analyze`** with: _"Proposals submitted. Re-run `/analyze` after admin approval."_
     - If `/analyze-archetypes` reports the catalogue is complete (no gaps) → re-run `pmap-precondition.js` to confirm `status: ok`, then continue.
     - If the user skips inside `/analyze-archetypes` → the lock will be written with `skippedAt`. Re-run `pmap-precondition.js`; it will return `status: skipped` and you must surface the prompt again (loop) — do not auto-continue.
   - **Skip and proceed (one-shot)** — Write `.provenmap/archetype-analysis.lock.json` with the JSON shape below using values from the script's output, then continue to Step 0.
     ```json
     {
       "commitHash": "<currentCommitHash from script output>",
       "catalogueHash": "<currentCatalogueHash from script output>",
       "scannedAt": null,
       "submittedAt": null,
       "skippedAt": "<ISO timestamp now>",
       "proposalIds": []
     }
     ```
     This is intentionally not silenced — every subsequent `/analyze` will re-prompt until Phase 1 is properly run. That is by design.

4. **Do not bypass.** Do not write the lock file or skip the prompt for any reason other than the user's explicit selection in step 3. If a session reminder says "work without stopping for clarifying questions," the **Run `/analyze-archetypes` now** option is the reasonable call — not silent skip.

5. The archetype catalogue fetched here is cached on disk (`.provenmap/boards/archetypes-cache.json`, 1hr TTL). Step 0 reuses the cache automatically — no duplicate fetch.

### Step -0.5: Coverage baseline (all modes)

Coverage is the run's frame of reference — refresh it BEFORE any analysis so the worklist comes from fresh data and the closing dashboard shows exactly what this run changed:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-prepass.js --coverage
```

Tell the user the starting point in one line from the JSON: `Coverage baseline: <percent>% analysed · <mappedOnly> mapped · <pending> pending · <staleNodes> stale.` If there are no boards yet: `No coverage yet — starting from zero.` If the script fails, say so and continue — coverage is reporting, never a gate. Step 1.5 takes its worklist from this ledger, and each Step 8.5 refresh shows the ▲/▼ delta since the previous refresh (this baseline on the first pass; the prior pass once Step 8.6 loops).

### Step 0: Fetch Available Archetypes (ProvenMap only)

If ProvenMap configuration exists (`.provenmap/config.json` with `bindingToken`):

1. Run the archetypes CLI to fetch available archetypes from the server:

   ```bash
   node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-archetypes.js --kind code
   ```

2. Parse the JSON output to get:
   - `nodeArchetypes`: Available archetype names for nodes
   - `edgeArchetypes`: Available archetype names for edges
   - `archetypes`: Full archetype list with `name`, `visualPrimitiveType`, and `description`

3. If the CLI fails or returns no archetypes, warn the user but continue analysis using conventional archetype names (service, database, api, library, queue, external, domain_group, infrastructure, external_system). The sync CLI will need archetypes configured on the server before types can be validated.

4. Store the available archetype names for use in Step 5 (Component Discovery) — the analysis agent must assign these server archetype names to each node/edge `type` field

### Step 0.5: Fetch Server Boards

If ProvenMap configuration exists:

1. Run the boards CLI to fetch all boards from the server:

   ```bash
   node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-boards.js
   ```

2. Parse the JSON output to get:
   - `rootBoard`: The root board (where `isChildBoard === false`)
   - `childBoards`: All child boards with their `parentBoardSlug` and `parentNodeSlug`
   - `boards`: Full list for building the server board map

3. Store the board list for use in Step 1 and Step 7 — the server board map tells us which boards already exist and what slugs to use.

4. If the CLI fails, warn but continue — analysis can proceed without server board info, but `/sync` may encounter issues.

### Step 1: Load or Initialize Manifest

1. Read `.provenmap/boards/manifest.json` if it exists
2. If creating a new L0 board:
   - Read `boardSlug` from config (`.provenmap/config.json` → `boardSlug` field)
   - If config has no `boardSlug`, make the **connect-now offer** — ask with **AskUserQuestion** "Connect to ProvenMap now?" (**Connect now** / **Not now**):
     - **Connect now** → run the browser login here, printing each JSON `display` verbatim **in your reply** (the Bash output panel is collapsed for the user): `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-login.js --start`, then `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-login.js --poll --analyze-cmd analyze` (generous Bash timeout, e.g. 250s). On `status: "complete"`, continue; anything else — stop, the display explains.
     - **Not now** → stop: "ProvenMap not configured — run `/login` (browser) or `/configure` (manual) first"
   - Use the config `boardSlug` as the L0 board slug (this is the root board on the server)
3. If drilling down, validate that:
   - The parent board exists in the manifest
   - The target node exists in the parent's analysis data
   - Check if a matching child board already exists on the server (from Step 0.5 board list)
   - If found on server → use the server's board slug
   - If not found → generate a child `boardSlug` locally (e.g., `<parent-slug>--<node-slug>`)
4. Check if board data already exists at `.provenmap/boards/<board-slug>.json` — if so, load it for incremental mode

### Step 1.5: Change Detection (Incremental Mode)

If board data exists AND `--clean` was NOT passed AND `analyzedAtCommit` is present in metadata:

1. Use the Step -0.5 ledger — it is fresh this run; do NOT re-run the coverage script. Read `.provenmap/coverage.json` and take this board's entry. The worklist is:
   - `boards[].staleNodes[]` — nodes whose covered files changed since analysis → re-analyze these nodes from their listed `changedFiles`
   - `pendingFiles[]` — files no node covers yet → new components to place
   - `boards[].orphanedFiles[]` — covered files that no longer exist → remove/shrink their nodes
2. Run `git diff --name-only --diff-filter=D <analyzedAtCommit> HEAD` to confirm deleted files
3. If the worklist is empty (no stale nodes, no pending files, nothing deleted): report "Board is up to date", print the Step -0.5 `display` markdown verbatim, and stop here
4. Otherwise: continue to Steps 2+ scoped to the worklist files only
5. **Fallback:** if the Step -0.5 script failed, scope from a raw `git diff --name-only --diff-filter=ACMR <analyzedAtCommit> HEAD` instead (exclude `node_modules/`, `dist/`, `.git/`, `coverage/`, test files). If the ledger marks this board `coverage: unknown` (its nodes carry no `coveredFiles`), incremental merge is impossible — stop and tell the user to run `/analyze --clean` for this board

If `--clean` was passed: delete existing board JSON and store file, proceed with full analysis.

### Step 2: Configuration Check

Read settings from `.provenmap/config.json` if it exists to get portal configuration and analysis preferences.

### Steps 3–4: Project + Tech Stack Detection (script-owned)

Both are computed deterministically by the Step 4.5 prepass and arrive in its
`digest.stacks`: `monorepo` (boolean), `workspaces[]` (each with `path`, `name`,
`kind`, and its own `techStacks[]`), `techStacks[]` (the union), and
`manifestLanguages[]`. Do **not** re-read `package.json`/`go.mod`/`pyproject.toml`
to rediscover them.

Your job here is judgment on top of those facts: decide which workspaces deserve
parent nodes, and name any stack the scan reports as unknown (it reports only
frameworks a manifest actually declares — a repo using an undeclared or in-house
framework will show none, and that is when you look at the code).

**Incremental:** runs every pass — the prepass is cached and always reflects HEAD.

### Step 4.5: Structural Prepass (deterministic skeleton)

Run the prepass CLI to get a deterministic structural skeleton — the candidate-node inventory and the resolved `imports` graph — so the analysis does not reconstruct them from raw file reads:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-prepass.js --out .provenmap/skeletons/repo.json --digest
```

For an L1+ drill-down board, scope the emitted nodes to the parent node's subtree (imports may still target files anywhere under the repo root), and write it under the board's own name so it never clobbers the repo-wide skeleton:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-prepass.js --scope-path <parent-node-path> --out .provenmap/skeletons/<board-slug>.json --digest
```

The full skeleton is written to the `--out` path (all skeletons live in `.provenmap/skeletons/`) — **that file is the scripts' input, not yours: never read it whole.** `--digest` prints the compact view you work from plus a `display` you print **verbatim — do not reformat, reorder, or summarise.** A full-repo run reuses the cached skeleton when HEAD, the dirty set, and the walk config are unchanged (`cached: true` in the JSON); `--no-cache` forces a fresh walk.

The `digest` field contains:

- `directories[]` — the file inventory rolled up per directory: `path`, `files`, `artifacts`, `languages` (counts), `topFiles` (most-imported basenames). This is the file inventory — the **grouping** worksheet is Step 4.6's, not this one.
- `edges[]` — the top directory→directory import flows with summed `weight`: cross-area structure at a glance. The per-file edges stay in the skeleton for the rollup script.
- `stacks` — workspaces, monorepo flag, and frameworks from the manifests: this **is** Steps 3–4's output.
- `infra` — infrastructure-as-code and schema files by kind (`container`, `ci`, `terraform`, `kubernetes`, `migration`, `serverless`). These are real architecture: claim them from a node (an "Infrastructure" or "Deployment" component is usually right) rather than leaving them unclaimed. They sit outside the analysed-percentage denominator, so they never inflate or deflate coverage.
- `stats`, `zeroInDegreeSamples`, `skippedExtensions` — honesty signals. A large `importsUnresolved` means some edges were missed and may need filling from file reads; `zeroInDegree` lists dead-file candidates (entry points legitimately appear there); `skippedExtensions` names stacks outside the denominator (`(none)` counts extensionless files).

**Pull detail only for the area you're actively deciding on** — never the whole skeleton:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-prepass.js --detail <dir-or-glob>
```

It returns the skeleton's full `nodes[]` for that area plus every edge touching them. Each node has a repo-relative `path`, a `tempId` (= `path`), a suggested `slug`/`name`, and `language`. Nodes with an **`artifact`** field are **agent-native markdown artifacts** — prompt-ware components (`artifact.kind`: `skill` | `command` | `agent`) detected deterministically from YAML frontmatter; `artifact.description` carries the frontmatter description as seed context. Edges are `{ fromTempId, toTempId, type, count }`: `type: "imports"` is the resolved graph for **JS/TS files only** (tsconfig path aliases and barrel re-exports already resolved, type-only imports dropped, duplicates collapsed, popular-helper hubs suppressed); `type: "references"` is deterministic artifact wiring — an artifact's body names another skeleton file by path (a command running a bundled script, a skill pointing at a doc).

Add `--skeleton .provenmap/skeletons/<board-slug>.json` to either mode to digest or slice a drill-down board's own skeleton instead of the repo-wide one.

**Use the skeleton in Steps 5–6:**

- Treat the digest's directory rollup (plus any `--detail` slices) as the ground-truth file inventory — do NOT re-glob or re-apply exclusion rules (already applied), and do NOT read the skeleton JSON whole.
- Treat the skeleton's edges as the authoritative `imports` edges for **every supported language** (JS/TS, Python, Go, Java, Ruby, Rust, C#) — do NOT re-parse imports by hand in any of them. The digest's `stats.importEdgesByLanguage` shows what each stack contributed; a language with files but no edges there is the only case worth a manual look.
- The skeleton is **file-granular** (the digest rolls it up for you). At **L2/L3** its nodes map ~1:1 to board nodes — slice with `--detail` to name them. At **L0/L1**, **aggregate** directories into coarse domain/component nodes (each node's `coveredFiles` claims its files); edge rollup is Step 6's script (`--rollup`) — do not map `imports` edges by hand.
- **Persist the mapping — coverage provenance.** The tempId→node-slug file aggregation you just made IS the coverage relation; record it on every node as `coveredFiles` (repo-relative paths, or directory globs like `src/billing/**` when a node owns a whole subtree — prefer globs for large subtrees). Every skeleton file must end up in exactly one node's `coveredFiles`, OR in the board metadata's `waivedFiles` (files you judge non-architectural — never silently drop them), OR deliberately unclaimed (it will surface as _pending_ in coverage reports). **Hard rules the coverage dashboard enforces/surfaces:** never claim the same file from two nodes (double claims are flagged as defects); a node claiming a **large share of the board's files** must either set `layerBoardSlug` (drill-down candidate — its files count as _mapped, not analysed_ until the child board analyses them) or be split into finer nodes; the dashboard flags oversized claims as broad claims and **excludes their files from the analysed percentage**; waive **exact paths only, never globs** — waiving shrinks the denominator and the dashboard lists what was waived.
- The prepass does NOT classify archetypes, group the database layer, write descriptions, or detect non-import edges — those remain your job in Steps 5–6.

Run this on every analysis (full and incremental); it is deterministic and fast, and always reflects current HEAD.

### Step 4.6: Grouping plan (what belongs inside what)

The directory tree is where files sit, not how they relate. Run the grouping plan to get
candidate groups computed from the **coupling graph**, with the evidence for each:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-prepass.js --group-plan
# drill-down board — scope it, and seed from the board that already exists:
node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-prepass.js --group-plan --scope-path <parent-node-path> \
  --skeleton .provenmap/skeletons/<board-slug>.json --against .provenmap/boards/<board-slug>.json
```

Print its `display` **verbatim — do not reformat, reorder, or summarise**, then work from these fields:

- `clusters[]` — candidate groups with `cohesion` (how much of their coupling stays inside),
  `density` (how interconnected their members are), `folderAgreement` (how much the group
  matches a directory), and a `verdict`:
  - **container** — group them under one `domain_group`.
  - **drill-down** — too interconnected to read flat: set `layerBoardSlug` and let a child board carry it. Proposing a plain container here would fail the density gate anyway.
  - **dissolve** — the members lean outward more than they cohere: place them individually rather than boxing them.
- `parents[]` — sibling groups that share an ancestor and belong inside one outer container: this is the **container-within-container** case. `verdict: "nest"` means nest them; `"drill-down"` means the outer one should be a child board instead.
- `roles[]` — per node. `member` proposes a group; `root-level` means it belongs directly on the board, with the reason:
  - `cross-cutting` — serves several groups; nesting it under any one misfiles it.
  - `boundary` — most of its coupling leaves this board's scope: an adapter, a peer of the containers.
  - `isolated` / `no-group` — no coupling evidence either way; your call.
- `stats.folderAgreement` — when it is low, the directory layout is **not** the architecture. Group by what the code calls and name the groups from the domain, not from a folder.

**These are proposals, not decisions.** You own naming every group, and you may override any
placement your reading of the code justifies — an "External Integrations" cohort with no
internal edges is a legitimate container even though the topology cannot see why. When you
keep a low-cohesion container, write the reason into its description starting with
`Grouping rationale:` — the board gate reads that line and stands down (§A-CONTAINER-COHESION).

### Step 5: Component Discovery

**CRITICAL — No root wrapper nodes.** The board itself is the implicit root container. Do NOT create a single `domain_group` or wrapper node that contains all other nodes. Top-level nodes (workspaces, services, data stores, external integrations) must have **no `parentSlug`** — they sit directly on the board. Use `metadata.description` for project-level context instead of a wrapper node.

**For L0 (Overview):** Identify high-level domains, services, and major components. Keep to 10-30 nodes. Mark nodes that are good candidates for drill-down by setting `layerBoardSlug` to a proposed slug.

**L0 targets significance, not exhaustiveness.** Coverage is satisfied when every file
is claimed by _some_ node — and a container may claim its whole subtree via
`coveredFiles` and defer the detail to a child board (`layerBoardSlug`). Do NOT generate an
L0 node per leftover directory just to claim its files; fold small leftovers into the
nearest significant container and let the drill-down carry the detail. More L0 nodes
means more rolled-up L0 edges — breadth here is what creates hairballs.

A container whose child board has taken over ALL of its claims may set `coveredFiles: []` explicitly — never invent a placeholder claim just to satisfy the field.

**For L1+ (Drill-down):** Scope analysis to the files/directories covered by the parent node. Go deeper into that domain's internal components.

**Container vs. drill-down (all layers):** Nodes with `layerBoardSlug` must NOT be `domain_group` containers with visible children. Their internals belong on the child board. Use `domain_group` containers only for grouping nodes that won't drill down.

**Grouping comes from Step 4.6's plan, not from node count or folder names.** Each
`domain_group` you create should trace to a cluster with `verdict: "container"`, each
nested container to a `parents[]` entry, and each top-level node either to a `root-level`
role or to a stated reason of your own. Node count is not a grouping criterion — a board of
20 uncoupled nodes needs no containers, and a board of 6 tightly-coupled ones may need two.

**Incremental:** Only read and analyze the changed/added files from Step 1.5. Keep existing nodes from unchanged files as-is. For deleted files, mark their nodes for removal.

Apply these rules (start from the skeleton's `nodes[]` — file discovery and exclusion are already done):

- **Exclude non-architectural files**: already applied in the skeleton (`*.d.ts`, types/dto, tests, barrels). Only re-check files you discover outside the skeleton (e.g. non-JS/TS).
- **Agent-native artifacts are components, not docs**: skeleton nodes with `artifact.kind` (skills/commands/agents) are first-class architecture — group them like any other component family (e.g. a commands group, a knowledge/skills group, per plugin or domain), seed their `description` from `artifact.description`, and classify them with a fitting server archetype. If the catalogue has no fit for prompt-ware kinds, that is an archetype **gap** — Phase 1 (`/analyze-archetypes`) should have proposed archetypes such as `agent_command`/`agent_skill`; fall back to the closest existing archetype meanwhile and never silently waive artifacts.
- **Group database files**: into a single `database-layer` container node at L0/L1 — the skeleton lists these as individual files, so you group them.
- **Apply the grouping plan**: Step 4.6's clusters, parents and root-level roles are the containment proposal — name the groups, override with a stated reason, do not re-derive boundaries from folder names
- **Classify by archetype**: using server archetype names — the skeleton does NOT classify, this is your job
- **Generate slugs**: use the skeleton's suggested `slug` as a starting point; refine from the primary class/export name

**Finish Step 5 by writing the board JSON now** — `.provenmap/boards/<board-slug>.json`
with the metadata, the nodes (each with `coveredFiles`), and `"edges": []`. Step 6's
rollup script reads this file; edges come next.

### Step 6: Relationship Detection

- **Rolled-up edges (script-owned):** run the deterministic rollup — it maps the
  skeleton's file-level `imports` and `references` edges onto your Step 5 nodes,
  drops self-loops and containment pairs, dedupes with an import-count weight, and
  suppresses platform hubs:

  ```bash
  node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-prepass.js --rollup <board-slug>
  ```

  For a drill-down (scoped) board, pass `--skeleton .provenmap/skeletons/<board-slug>.json`
  so the rollup uses the scoped skeleton Step 4.5 wrote for this board, not the
  repo-wide one; L0 uses the default repo skeleton (no flag needed).

  Print the returned `display` **verbatim — do not reformat, reorder, or summarise.**
  Merge the emitted `edges[]` from the written
  `.provenmap/skeletons/<board-slug>.edges.json` into the board's `edges`. For each
  `report.suppressedHubs` entry, stamp that node with
  `metadata.hubInDegree = distinctSources` — the fact survives without N identical
  edges. Do NOT hand-map skeleton edges yourself; the script owns those rules, and
  it resolves imports for every supported language — never re-parse them by hand.

- **Reclassify where you know better:** the rollup can only ever say `uses`. Where
  reading the involved files shows the real relation, change the edge's `type`
  (`db_read`, `api_call`, `publishes`, …) and **keep its `metadata.weight`** — the
  rollup output is a starting point, not the final edge set.
- **Semantic edges (read the relevant files):** the skeleton does not detect these — derive them by reading the files of the nodes involved:
  - `db_read`/`db_write`: Repository/ORM operations
  - `api_call`: HTTP client usage (external or cross-service)
  - `uses`: internal service-to-service calls
  - `publishes`/`subscribes`: Queue/event patterns
  - cross-language calls: API URLs / service names between services

  **Fan this out when the board has 3+ domain groups.** Dispatch one
  `relationship-detector` agent (Task tool) per domain group, **all in a single
  message** so they run concurrently — cap the batch at 4; with fewer than 3
  groups just do it inline. Give each agent its group's node slugs +
  `coveredFiles`, the full board node list (so it can name targets outside its
  group), and the edge archetype names. The agents are **read-only** — they
  return candidate edges as JSON in their reply and write nothing, so there is
  no file-boundary risk. You merge: drop duplicates of rollup edges (same
  source+target), keep `metadata.weight` where one exists, apply the
  board-scope rule, and record off-board relations in
  `metadata.deferredEdges[]` rather than dropping them.

- **Cross-board relations:** when a real dependency's other end lives on a
  different board, append it to the board metadata's `deferredEdges[]`
  (`{ sourceSlug, targetHint, type, targetBoardSlug?, description? }`) instead
  of discarding it. These stay local — `/sync` never pushes them — and the
  coverage dashboard counts them so inter-domain structure stays visible.

  The rollup only maps literal-path `references` (an artifact naming another
  skeleton file by path). Add further artifact relationships you find by reading
  bodies yourself — e.g. a command that says "load the X skill" without a path.

Scope all edges to this board's nodes only.

**Incremental (edge provenance):** edges carrying `metadata.weight` are
**rollup-owned** — delete them all and re-run the rollup (it is deterministic and
cheap); re-apply any reclassified `type`s you noted from the old edge set when
merging. Edges _without_ `metadata.weight` are **model-owned** (semantic) — keep
them unless an endpoint node was removed.

### Step 7: Identify Drill-Down Candidates

For nodes that represent significant subsystems (domains, services with many internal components), mark them as drill-down candidates:

- Set `layerBoardSlug` on the node — resolve using the server board map from Step 0.5:
  - Check if a child board already exists on the server for this parent board + node slug
  - If found → use the server's existing board slug for `layerBoardSlug`
  - If not found → generate a slug locally (e.g., `<parent-slug>--<node-slug>`). It will be created on the server during `/sync`.
- Add the node slug to the `drillDownNodes` array

This tells the user which nodes can be expanded into child boards.

**Validate mutual exclusion:** No drill-down candidate node should have other nodes referencing it via `parentSlug`. If a node was initially created as a container with children but is now marked for drill-down, promote its children to board root level or move them under a different container — the children belong on the drill-down board, not on this board.

### Step 8: Output Generation

Write analysis results to `.provenmap/boards/<board-slug>.json`.

**Incremental:** Merge new/changed nodes into existing board data. Replace nodes whose `coveredFiles` contain a changed file. Remove nodes whose covered files were all deleted. Remove edges referencing removed nodes (rollup-owned edges — those with `metadata.weight` — are already regenerated by Step 6's provenance rule).

Always record the current git commit hash via `git rev-parse HEAD` as `analyzedAtCommit`. Every node carries `coveredFiles` and the metadata carries `waivedFiles` (from Step 4.5):

```json
{
  "metadata": {
    "analyzedAt": "ISO-timestamp",
    "analyzedAtCommit": "abc123def456",
    "projectName": "from-package.json",
    "languages": ["typescript"],
    "techStacks": ["nextjs", "nestjs"],
    "boardSlug": "my-project-overview",
    "layer": 0,
    "waivedFiles": ["scripts/dev-seed.ts"]
  },
  "nodes": [
    {
      "slug": "api-service",
      "name": "API Service",
      "type": "service",
      "description": "Handles HTTP requests",
      "path": "src/api",
      "coveredFiles": ["src/api/**"],
      "parentSlug": null,
      "layerBoardSlug": null,
      "metadata": {}
    }
  ],
  "edges": [
    {
      "sourceSlug": "api-service",
      "targetSlug": "database",
      "type": "db_read",
      "description": "Reads user data via repository pattern.",
      "metadata": {}
    }
  ],
  "drillDownNodes": ["auth-domain", "payments-domain"]
}
```

For child boards, include parent references:

```json
{
  "metadata": {
    "boardSlug": "my-project-auth-domain",
    "layer": 1,
    "parentBoardSlug": "my-project-overview",
    "parentNodeSlug": "auth-domain",
    ...
  }
}
```

### Step 8.4: Author the styling plan

After writing the board JSON, style it (methodology: the **board-styling** skill — load it if
not already loaded):

1. `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-prepass.js --style-signals <board-slug>` — print
   `display` verbatim, note `signalsPath`.
2. Author the styling plan from the signals and write it to
   `.provenmap/styling/<board-slug>.plan.json`.
3. `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-prepass.js --validate-styles --file
.provenmap/styling/<board-slug>.plan.json --against <signalsPath>` — exit 3 → fix and
   re-validate, **max 2 rounds**; still failing → delete the plan file, continue unstyled, and
   note `Styling skipped — run /restyle <board-slug> later.`

The plan is applied automatically by `/sync` after this board's push — no apply step here.
This step runs in every mode, including `--auto`. Styling never blocks the analysis.

### Step 8.5: Refresh Coverage Ledger + show the dashboard

After writing the board JSON, refresh the deterministic coverage ledger so `/status`, the next incremental run, and `/sync` (which reports coverage to the platform) all see current numbers:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-prepass.js --coverage
```

Print the returned `display` markdown **verbatim — do not reformat, reorder, or summarise** (it carries the progress bar, the delta since the previous run, and the ranked "Where to go next" list). If the script fails, note it and continue — coverage is reporting, never a gate (and skip Step 8.6).

### Step 8.6: Offer the next area (interactive loop)

The Step 8.5 JSON also carries `recommendations` — the deterministic next-step list, ranked: stale boards → drill-downs → pending areas → broad claims → relationship gaps → regroupings → unknown-coverage boards. The script owns those facts; **you own the coordination** — spend judgment connecting them to this session. Which area to analyse next is a genuine user decision:

0. **`--auto` mode: no question, no 8.5/8.6 loop.** The Unattended loop replaces both steps — `pmap-prepass.js --auto-plan` plans each round (its `parallel[]` = the Step 8.7 batch, `sequential[]` = step 4 mechanics below) and owns termination via `done`/`stalled`. See "Unattended: Full Automation".
1. If `recommendations` is empty: skip to Step 9.
2. **Give your read first** (1–3 sentences of judgment, after the verbatim dashboard): connect the recommendations to what you know — which stale node maps to the files just edited, whether a pending area looks load-bearing or like glue, what the user has been working on. Never restate or recompute the script's numbers.
3. Ask with **AskUserQuestion** — header `Next area`; question: `Coverage is at <percent>%. Analyse another area now, or sync what you have?` Set `multiSelect: true` whenever the shown options include two or more `drill-down` recommendations — selected drill-downs are built **in parallel** by Step 8.7; otherwise single-select. Options, in order:
   - The first 3 `recommendations`: label from `label` (append "(Recommended)" to the first), description from `detail` — you may append a short session-informed rationale to a description, and you may reorder these three when session context clearly changes the priority (say why in the description).
   - **Triage swap:** if an area's pending files are plainly non-architectural (generated code, fixtures, one-off scripts), replace the third slot with **Waive non-architectural files** — on selection, propose the exact `coverage.ignore` globs via AskUserQuestion (user adjusts via Other), append the confirmed globs to `coverage.ignore` in `.provenmap/config.json`, re-run `pmap-prepass.js --coverage`, print the new `display` verbatim, and re-ask.
   - Always last: **Sync what I have** — description: "Stop analysing; push the boards + this coverage snapshot to the platform."
4. If the user picks a single recommendation, run another incremental pass scoped to it, then **return to Step 8.5** (refresh, dashboard, ask again — the loop ends when the user syncs or nothing is left). If the user selected **multiple** areas, go to Step 8.7 instead — it owns the batch and returns to Step 8.5 itself. Per-kind mechanics:
   - `stale-board` → re-analyze that board's `staleNodes[].changedFiles` (Steps 5–8 scoped to those files)
   - `drill-down` → build (or re-run) the child board: the `--drill <boardSlug>/<nodeSlug>` flow for the recommendation's node — this is what converts _mapped_ files into _analysed_ ones
   - `pending-area` → analyze the pending files under its `path` (take them from the ledger's `pendingFiles`; if `pendingTotal` exceeds the listed files, derive the remainder from `.provenmap/skeletons/repo.json` minus covered/waived) and place the resulting nodes on the board that owns that scope (L0, or the matching drill-down board)
   - `broad-claim` → re-analyze that node's subtree, splitting it into finer nodes with their own `coveredFiles` — or set `layerBoardSlug` on it to defer honestly to a drill-down
   - `edge-gap` → relationships the import graph justifies are missing from that board: re-run Step 6's rollup for it and **merge the emitted edges** (the usual cause is a run where the rollup output was never merged), then reclassify types as Step 6 describes
   - `regroup` → that board's containment has drifted from its edges: re-run Step 4.6's `--group-plan` for it with `--against .provenmap/boards/<slug>.json`, walk the proposed moves, and re-parent only what the plan justifies and you agree with. Re-parenting is a real change on the wire — never apply the moves wholesale, and leave anything whose grouping is deliberate (say so in its description with `Grouping rationale:`)
   - `unknown-board` → re-run that board with the `--clean` behaviour (delete its JSON + store, full re-analysis)
5. If the user picks **Sync what I have**: proceed to Step 9 and end the final report with: `Run /sync to push the boards and this coverage snapshot.` If it was selected alongside other areas, build those areas first, then end the loop with the same sentence.

### Step 8.7: Parallel layer fan-out (multiple selections)

Multiple selected areas are built by subagents running concurrently, each analysing its layer in its own context. The real constraint is that **no two concurrent agents may write the same board file** — not "only drill-downs may parallelise". Split the selections accordingly:

- **Always parallel:** `drill-down` selections — each targets a distinct child board slug and writes only that board's own files (`boards/<slug>.json`, `skeletons/<slug>.json` + `<slug>.edges.json`). Siblings sharing a parent are safe because you stamp every `layerBoardSlug` before dispatch (step 1 below).
- **Parallel when their board is free:** `stale-board`, `edge-gap`, `regroup`, and `unknown-board` selections whose target board is **not** one of this round's drill-down parents and is not targeted by another selection — dispatch each as an **incremental-refresh mode** agent (pass the ledger worklist: that board's `staleNodes[].changedFiles`, in-scope `pendingFiles[]`, `orphanedFiles[]`). `unknown-board` passes the `--clean` behaviour instead of a worklist.
- **Always sequential:** `pending-area` (where its nodes land is a placement decision, not a board rewrite), `broad-claim` (a judgment call), and anything whose board is already claimed above. Run these inline (step 4 mechanics), one at a time, **after** the parallel batch has joined.

In `--auto` mode you do not make this split yourself — `pmap-prepass.js --auto-plan` already applies exactly these rules and hands you `parallel[]` and `sequential[]`.

**Before fan-out — the orchestrator owns all shared state; subagents never touch it:**

1. For each selected drill-down, resolve the child board slug (Step 7 rules: server board map first, else `<parent-slug>--<node-slug>`) and, if the parent node doesn't carry it yet, stamp `layerBoardSlug` on the parent node in the parent board JSON **now** — every parent-board edit happens here, before any agent starts.
2. Launch one `architecture-analyzer` agent (Task tool) per selected board, **all in a single message** so they run concurrently. Each dispatch prompt must be self-contained (agents share nothing). For a drill-down, state that it is **layer-board mode** and pass the child board slug + display name, target layer, `parentBoardSlug`/`parentNodeSlug`, the parent node's scope path and `coveredFiles`, the Step 0 node/edge archetype name lists, and whether the child board already exists on the server (Step 0.5 map). For a board refresh, state that it is **incremental-refresh mode** and pass the board slug plus its ledger worklist (`staleNodes[].changedFiles`, in-scope `pendingFiles[]`, `orphanedFiles[]`) and the same archetype lists. Either way the agent runs its own prepass, rollup, and board report — do not pre-run them.
3. **Model per agent:** if `.provenmap/config.json` has `analysis.subagentModel`, pass it as the model for every dispatched agent; otherwise dispatch L1 boards with the session model (inherit) and, where the host supports a per-agent model override, L2/L3 boards with a faster model. If the host supports neither model overrides nor parallel agent launch, dispatch the same prompts sequentially with defaults — the flow is otherwise identical.

**Join — after ALL agents return:**

1. Each agent reports its board's gate status (from its own `--board-report`). For a board whose gate failed or whose agent died, tell the user which board and why, and offer to re-run just that board — the other boards' results stand.
2. Run the sequential selections now, if any.
3. Update the manifest (Step 9) with an entry for **every** board written this batch — the orchestrator is the only writer of `manifest.json`.
4. Run Step 8.5 **once** — a single coverage refresh whose ▲/▼ delta shows the combined effect of the whole batch — then continue the Step 8.6 loop.

Subagents must never write `manifest.json` or a board other than their own, and never run `pmap-prepass.js --coverage` — coverage is derived state the orchestrator recomputes once at the join.

### Step 9: Update Manifest

Update `.provenmap/boards/manifest.json` with the new/updated board entry. The manifest must conform to this exact structure:

```json
{
  "version": 2,
  "projectName": "my-project",
  "updatedAt": "ISO-timestamp",
  "boards": {
    "my-project-overview": {
      "boardSlug": "my-project-overview",
      "name": "My Project Overview",
      "layer": 0,
      "parentBoardSlug": null,
      "parentNodeSlug": null,
      "analysisFile": ".provenmap/boards/my-project-overview.json",
      "storeFile": ".provenmap/boards/stores/my-project-overview.store.json",
      "lastAnalyzedAt": "ISO-timestamp",
      "lastSyncedAt": null,
      "nodeCount": 15,
      "edgeCount": 12
    }
  }
}
```

When rewriting a board JSON, never carry forward `metadata.origin`, `metadata.mirroredAt`, `metadata.mirroredFromBinding`, or a node's `metadata.mirrored` — those mark un-analysed server mirrors, and the prepass/sync gates refuse them.

**CRITICAL:** The board display name field is `name` (NOT `boardName`). The `--ensure-boards` CLI reads `name` to create missing child boards on the server — using `boardName` will cause board creation to fail with an empty name.

## Target Path

If $ARGUMENTS is `--clean`, run full re-analysis from scratch (delete existing board data first).
If $ARGUMENTS starts with `--drill`, parse `<parent-board-slug>/<node-slug>` and drill into that node; a trailing `--clean` deletes that child board's JSON + store first.
If $ARGUMENTS is `--all`, run full progressive analysis (each board uses incremental if it already exists).
If $ARGUMENTS contains `--auto`, apply Unattended mode (combinable with `--all`; with no other flag it resumes the coverage loop on the existing board tree).
Otherwise, run L0 overview analysis with incremental mode (or full if no board data exists).

## Output Format

The report is **script-rendered — never hand-assemble counts into prose.** After Step 9, for each board written this run:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-prepass.js --board-report <board-slug>
```

Print its `display` **verbatim** (nodes-by-archetype bars, edges by type, per-board file accounting, isolated nodes, drill-down candidates, board file path).

**Gate errors block.** If the report's `gate.valid` is `false` (the script exits 3), the
board JSON failed a hard integrity gate — the `display` names each offending edge or node
and the fix. Apply the fix to `.provenmap/boards/<board-slug>.json` and re-run the report;
do **not** continue to Step 8.6 or offer `/sync` until it passes. `gate.warnings` do not
block — print them and continue.

Then add ONLY what the script cannot know:

- Analysis mode (incremental or full); if incremental, the changed/added/deleted files analysed
- Judgment calls worth flagging — max 5 bullets (rule deviations, split/merge decisions, why isolated nodes are genuinely isolated vs missed edges)
- The **final** Step 8.5 coverage dashboard, verbatim (if Step 8.6 looped, one dashboard — the last — not one per pass)
- Which next-area choices the user made, if any passes looped

Never restate numbers the board report or coverage dashboard already shows.
