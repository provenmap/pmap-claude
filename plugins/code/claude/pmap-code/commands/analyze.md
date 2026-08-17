---
category: map
description: "Map · Analyze codebase architecture with layered board support"
argument-hint:
  [--clean | --drill <parent-board-slug>/<node-slug> | --all | --auto]
allowed-tools: Read, Glob, Grep, Write, Bash(node:*, git:*), AskUserQuestion, Task
---

Perform progressive architecture analysis with layered board support.

## Board Layer Strategy

Analysis produces layered boards for managing large codebases. **The ladder is C4-aligned** —
each layer answers the question C4 gives it, and that is what decides what belongs on it:

| Layer | Name (C4)      | Scope                                                            | Target Nodes |
| ----- | -------------- | ---------------------------------------------------------------- | ------------ |
| L0    | System Context | This system's deployables + the outside systems they talk to      | 10-30        |
| L1    | Containers     | Inside one deployable: its apps, services, stores, workers        | 10-40 each   |
| L2    | Components     | Inside one container: modules, handlers, classes                  | 5-20 each    |
| L3    | Detail         | Deep internals of one component (opt-in)                          | 5-15 each    |

The ladder is the **vocabulary**, and the node targets are **budgets** — which shape a given
board actually takes (container-grade or terminal) is decided by that board's own grouping
plan, never by its depth number. Step 5 states the rule; Step 4.6 produces the evidence.

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
   b. **Get the merge decision from the script — do not glob-match it by hand:**
      ```bash
      node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-prepass.js --claim-check .provenmap/boards/<board-slug>.json --changed-since auto
      ```
      The `impact` field answers all three questions: `replace[]` (nodes claiming a changed
      file, with the files that hit them), `remove[]` (nodes whose every claimed file is gone),
      and `unclaimedChanged[]` (changed files no node claims — new architecture needing new
      nodes). `auto` diffs against the board's own `analyzedAtCommit`; pass an explicit commit
      instead if you need a different base.
   c. Re-analyze ONLY the files behind `impact.replace` plus `impact.unclaimedChanged`
      (Steps 3-6 scoped to those files), then replace those nodes and add nodes for the
      unclaimed changed files
   d. Remove the nodes in `impact.remove`
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
   - `mode: "round"` — execute the plan exactly: `parallel[]` as one Step 8.7 batch (one subagent per drill-down), then `sequential[]` one at a time (Step 8.6 step-4 mechanics). Act on nothing the plan doesn't list; never waive files. As each board finishes, print one status line — board slug, node/edge counts, gate pass/fail, advisories resolved or overridden — so progress stays visible mid-round. Then go to 3.
   - `mode: "done"` or `"stalled"` — the run is over. Print `display` verbatim (it ends with the full coverage dashboard and the deferred judgment calls — broad claims and pending waiver decisions). On `stalled`, relay `stallReason`. Close the final report with `Run /sync to push the boards and this coverage snapshot.`
3. **Re-plan:** run `--auto-plan` again (no `--reset`) — it refreshes the ledger itself, so Step 8.5 is skipped entirely in auto mode. Print `display` verbatim and return to 2.

Prompts elsewhere become stops, never silent skips: the archetype precondition, branch mismatch, and not-connected gates each stop with their canonical sentence (Steps -2/-1 name the `--auto` behaviour). The script's stall guard and round cap are the only termination authority — do not stop early because the loop "feels" done, and never continue past a `done`/`stalled` verdict.

## Progress display (every phase change)

At the **first step of each phase** — Steps -2, 0, 4.5, 8, and 9 — run:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-prepass.js --spine analyze --step <this step's number> --with-coverage
```

Print the returned `display` **verbatim — do not reformat, reorder, or summarise.**
It carries the phase chain, the current phase's steps, and the coverage bar. Do not
run it at every step — once per phase is the intent; more is noise.

Exit codes: `1` bad usage (fix the call), `3` the step is not registered (the pipeline
registry has drifted from these headings — report it and continue; the spine is
display, never a gate).

## Analysis Workflow

### Step -2: Preflight — binding, branch, local state

This command touches board state, so it runs behind the preflight gate. The gate is **enforced by a
script, not by prose** — run it and react to its exit code; never decide on your own that the
project is fine.

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-preflight.js
```

**With a whole-tree `--clean`, add `--no-repair`.** Repair mirrors the server's board into local
state; `--clean` then deletes exactly what it just fetched — a wasted round-trip that also makes
the run report "deleting existing board data" for data that never existed locally. Keep repair on
for `--drill … --clean` (only one child board is being rebuilt; the siblings still want rehydrating).

Print the JSON's `display` field **verbatim** — do not reformat, reorder, or summarise it.

| exit | meaning                                | action                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ---- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0    | Proceed                                | Continue to the next step. If `repairs.boardsRecovered` is non-empty, local state was just restored from the server — say so once (the `display` already carries the sentence) and continue.                                                                                                                                                                                                                                                                                                                                              |
| 1    | Not connected, or credentials rejected | Make the **connect-now offer**: AskUserQuestion "Connect to ProvenMap now?" → **Connect now** runs `pmap-login.js --start` then `--poll` inline (print each `display` verbatim) and resumes this command on `status: "complete"`; **Not now** stops with the `error` sentence verbatim. In `--auto` mode skip the offer and stop with the `error` sentence verbatim.                                                                                                                                                                      |
| 2    | Binding could not be verified          | Print `error` verbatim and stop. Name `/status` for the full local picture.                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 11   | Branch mismatch                        | Print `display` verbatim, then ask via AskUserQuestion (in `--auto` mode: stop after printing — the `display` already carries the `git switch` recovery). Header: `Branch`. Question: `"This project is bound to a different branch. How do you want to proceed?"` Options: **Re-bind to this branch (`/login`)** — run the `/login` workflow inline, then re-run this step; **Stop — I'll switch branches myself** — stop, having already printed the `git switch` line. Never run `git switch` yourself: the working tree may be dirty. |

### Step -1: Branch guard + optional archetype gate

Archetype settlement is **optional**. By default `/analyze` runs straight through — it reports the archetype gaps it actually hits at Step 9, once the board exists and the gaps are real rather than inferred from a hash comparison. A user who wants to curate the vocabulary *before* any board is produced opts in with `"analysis": { "archetypeGate": "strict" }` in `.provenmap/config.json`.

Which mode is active is **decided by the script, not by prose** — run it and react to its exit code; never decide on your own that the gate does or doesn't apply.

1. Run the precondition script:

   ```bash
   node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-precondition.js --kind code
   ```

2. Parse the JSON output. The `status` field + exit code drive behaviour:

   | status            | exit | requiresPrompt | action                                                                                                 |
   | ----------------- | ---- | -------------- | ------------------------------------------------------------------------------------------------------ |
   | `gate_off`        | 0    | false          | The default. Proceed **silently** to Step 0 — say nothing about archetypes here.                        |
   | `ok`              | 0    | false          | Proceed silently to Step 0.                                                                            |
   | `pending`         | 0    | false          | Print the `reason` from the JSON as a warning, then proceed.                                           |
   | `missing`         | 10   | true           | Lock file does not exist. Prompt the user (see step 3).                                                |
   | `stale_commit`    | 10   | true           | Codebase has moved since the last archetype scan. Prompt (see step 3).                                 |
   | `stale_catalogue` | 10   | true           | Server catalogue has changed since the last scan. Prompt (see step 3).                                 |
   | `skipped`         | 10   | true           | Last run was skipped — **skip is one-shot, this re-prompts on every `/analyze`**. Prompt (see step 3). |

   Exit 10 is reachable **only under `archetypeGate: "strict"`** — the user asked for the gate, so honour it.

   On exit code `1` (not connected — `status: not_connected`) or `2` (API error): print the script's `error` field verbatim and stop. Step -2 has already offered to connect, so a `1` here means the user declined or the credentials are still rejected.

3. When `requiresPrompt` is true, ask via AskUserQuestion. In `--auto` mode do not ask and do not skip: stop with the script's `reason` verbatim plus _"Archetype check needs a decision — run `/analyze-archetypes` first, run `/analyze` without `--auto` to decide interactively, or remove `analysis.archetypeGate` from `.provenmap/config.json` to make settlement optional again."_ Header: `Archetype check`. Question: include the script's `reason` verbatim, then `"How do you want to proceed?"`. Provide exactly these two options:
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

4. **Do not bypass.** In strict mode, do not write the lock file or skip the prompt for any reason other than the user's explicit selection in step 3. If a session reminder says "work without stopping for clarifying questions," the **Run `/analyze-archetypes` now** option is the reasonable call — not silent skip. Equally, never *invent* the gate: on `gate_off` say nothing and move on, and never suggest the user turn the gate on.

5. In strict mode the archetype catalogue fetched here is cached on disk (`.provenmap/boards/archetypes-cache.json`, 1hr TTL) and Step 0 reuses the cache automatically — no duplicate fetch. On `gate_off` no catalogue is fetched here at all; Step 0 does the only fetch.

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
   - `display`: the catalogue itself — every archetype grouped by primitive, one line each. **This is what you classify from; read it, don't re-request it.** The raw `archetypes[]` array is deliberately not emitted (a few hundred archetypes of JSON is the single largest read in this command); pass `--full` only if you truly need every field.
   - `nodeArchetypes`: Available archetype names for nodes
   - `edgeArchetypes`: Available archetype names for edges
   - `cacheFile`: where the full catalogue sits on disk — read it **only** for a specific archetype you are genuinely torn about, never wholesale

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
   - `childBoards`: Child boards below the bound board, with their `parentBoardSlug` and `parentNodeSlug` (the bound board itself is never listed here, even when the server marks it a child of an architect landscape)
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
   - Use the config `boardSlug` as the L0 board slug. **Local layering is binding-relative:** the
     bound board is ALWAYS this repo's L0 (`metadata.layer: 0`), even when the server board tree
     reports it as a child of an architect landscape board (`isChildBoard: true` with a
     `parentBoardSlug`/`parentNodeSlug` pointing above the binding). Preserve those two server
     placement fields verbatim in the metadata if a mirror carried them, but never let them change
     the layer, and never treat the bound board as a drill-down of a board outside this binding.
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
`kind`, its own `techStacks[]` and its own `dependencies[]`), `techStacks[]` (the
union), `dependencies[]` (the union of declared runtime dependencies), and
`manifestLanguages[]`. Do **not** re-read `package.json`/`go.mod`/`pyproject.toml`
to rediscover them.

**`dependencies[]` is your external-system evidence.** A vendor SDK there (payments,
auth, email, observability, search, feature flags) is a third party this codebase
talks to, and that is what an `external_system` node is for. Read the list and decide;
do **not** guess vendor names and grep the tree for each one — anything you failed to
guess stays invisible, and the list already names them all. Grep only to find *where*
a dependency you selected is used, once you have chosen it. Caveat: the list is
parsed from `package.json` `dependencies` only — for a non-JS workspace, or for a
service reached over plain HTTP with no SDK, you still read code to find it.

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
- `stats`, `zeroInDegreeSamples`, `skippedExtensions` — honesty signals. `importsUnresolved` counts imports that point **inside** this repo but did not resolve (edges genuinely missed — worth filling from file reads); `externalImports` counts imports that leave it (third-party packages — not a gap, and the evidence behind external-system nodes). The two are kept apart deliberately: an unresolved internal import is never laundered into "external". `zeroInDegree` lists dead-file candidates (entry points legitimately appear there); `skippedExtensions` names stacks outside the denominator (`(none)` counts extensionless files).
- `stats.parsePartialFiles` / `parseFailedFiles` / `unreadableFiles` — **parse health** (name lists, capped at 20 each). A partial file's facts come from the healthy regions only; a failed or unreadable file contributed none. **Read those files with suspicion** — if one of them lands in an area you are classifying, open it yourself rather than trusting its (missing) imports, and treat a node built on them as unconfirmed until you have. `/status` renders the full funnel over these; the board report names the ones **this board claims**.

**Pull detail only for the area you're actively deciding on** — never the whole skeleton:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-prepass.js --detail <dir-or-glob>
```

It returns the skeleton's full `nodes[]` for that area plus every edge touching them. Each node has a repo-relative `path`, a `tempId` (= `path`), a suggested `slug`/`name`, `language`, and — only when the parse was shaky — `parseHealth` (`partial` | `failed`; omitted on a clean parse). Nodes with an **`artifact`** field are **agent-native markdown artifacts** — prompt-ware components (`artifact.kind`: `skill` | `command` | `agent`) detected deterministically from YAML frontmatter; `artifact.description` carries the frontmatter description as seed context. Edges are `{ fromTempId, toTempId, type, count, kinds?, hubTarget? }`:

- `type: "imports"` — the resolved import graph for **every supported language** (JS/TS, Python, Go, Java, Ruby, Rust, C#): tsconfig path aliases, workspace package names and barrel re-exports resolved for JS/TS, each other language resolved by its own module→path convention. Duplicates are collapsed into `count`, and `kinds` breaks that count down by import kind (`static`, `type`, `reexport`, `export-star`, `dynamic`, `side-effect`). **Type-only imports are kept, tagged `type`** — they are real coupling; weigh them lower if your reading says so, never assume they are absent.
- `hubTarget: true` marks an edge into a popular-helper hub. Those edges are **kept, not deleted** — display and rollup budgets curate them out, but the fact is there, so a hub is never "a node with no imports".
- `type: "references"` — deterministic artifact wiring: an artifact's body names another skeleton file by path (a command running a bundled script, a skill pointing at a doc).

A slice is capped (500 nodes; hub-tagged edges capped per slice) and says so via `truncated` / `truncatedHubEdges` — narrow the pattern rather than assuming you saw everything.

**Plan first, then slice.** Request a `--detail` slice ONLY for a cluster you are **inlining
on this board**. A cluster Step 4.6's plan marks `drill-down` — or that you decide to drill
down — stays **opaque**: no detail slice, no per-file reading at this layer. Seed that node's
name and description from the plan's cluster evidence and member list; the child board reads
those files once, at the layer where they are the subject.

Add `--skeleton .provenmap/skeletons/<board-slug>.json` to either mode to digest or slice a drill-down board's own skeleton instead of the repo-wide one.

**Use the skeleton in Steps 5–6:**

- Treat the digest's directory rollup (plus any `--detail` slices) as the ground-truth file inventory — do NOT re-glob or re-apply exclusion rules (already applied), and do NOT read the skeleton JSON whole.
- Treat the skeleton's edges as the authoritative `imports` edges for **every supported language** (JS/TS, Python, Go, Java, Ruby, Rust, C#) — do NOT re-parse imports by hand in any of them. The digest's `stats.importEdgesByLanguage` shows what each stack contributed; a language with files but no edges there is the only case worth a manual look.
- The skeleton is **file-granular** (the digest rolls it up for you). At **L2/L3** its nodes map ~1:1 to board nodes — slice with `--detail` to name them. At **L0/L1**, **aggregate** directories into coarse domain/component nodes (each node's `coveredFiles` claims its files); edge rollup is Step 6's script (`--rollup … --apply`) — do not map `imports` edges by hand.
- **Persist the mapping — coverage provenance.** The tempId→node-slug file aggregation you just made IS the coverage relation; record it on every node as `coveredFiles`.

  **Claim by directory, not by file — that is what makes the partition automatic.** The digest's
  directories are disjoint by construction, so a board whose nodes each claim whole directory
  globs (`src/billing/**`) is exactly-once *by construction*: there is no per-file bookkeeping to
  get right, and no reason to enumerate 600 paths. Drop to individual file paths **only** where a
  single directory genuinely splits across two nodes, and then claim the minority files explicitly
  and leave the rest to the directory glob. If you find yourself listing files one by one, or
  wanting to generate the list programmatically, that is the signal to move the claim up to
  directory granularity instead. Every skeleton file must end up in exactly one node's `coveredFiles`, OR in the board metadata's `waivedFiles` (files you judge non-architectural — never silently drop them), OR deliberately unclaimed (it will surface as _pending_ in coverage reports). **Hard rules the coverage dashboard enforces/surfaces:** never claim the same file from two nodes (double claims are flagged as defects); **an analysed node may claim at most 29 files — 30 or more is a broad claim** (the dashboard reports it and **excludes its files from the analysed percentage**), and the fix is one of two moves: set `layerBoardSlug` (a drill-down node has **no** file limit — its files count as _mapped, not analysed_ until the child board analyses them) or split it into nodes under the limit; waive **exact paths only, never globs** — waiving shrinks the denominator and the dashboard lists what was waived. **Don't hand-verify the partition — Step 5.5's `--claim-check` does it.**
- The prepass does NOT classify archetypes, group the database layer, write descriptions, or detect non-import edges — those remain your job in Steps 5–6.

Run this on every analysis (full and incremental); it is deterministic and fast, and always reflects current HEAD.

### Step 4.6: Grouping plan (what belongs inside what)

The directory tree is where files sit, not how they relate. Run the grouping plan to get
candidate groups computed from the **coupling graph**, with the evidence for each:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-prepass.js --group-plan
# drill-down board — scope it, budget it for its own layer, and seed from the board that already exists:
node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-prepass.js --group-plan --scope-path <parent-node-path> --layer <this board's layer> \
  --skeleton .provenmap/skeletons/<board-slug>.json --against .provenmap/boards/<board-slug>.json
```

For the **L0 board**, run `--group-plan --layer 0`: it rolls the file-granular clusters
up to workspace / top-level-directory granularity, which is the granularity the L0 board
actually uses (Step 5 targets 10–30 nodes). A monorepo rolls up to its declared
workspaces; a single-package repo rolls up to its **top-level directories** instead (the
plan names the grain it used). Without it the plan proposes dozens of
candidate groups you would only re-aggregate by hand. It rolls up candidate *groups*
only — root-level elements stay file-granular, so their count is not reduced by
`--layer 0` (the display's row cap keeps them readable regardless).

**Always pass `--layer <this board's layer>`** — it is what makes the plan plan against a
budget instead of merely clustering. From `--layer 1` up, the plan carries
`predictedNodeCount` (clustered candidates **plus** board-root candidates), `layerBand` (that
layer's node band) and `budgetVerdict` (`fits` | `over-band` | `under-band`), and the display
leads with
`Budget: <clustered> clustered + <root> board-root = <total> node(s) predicted vs band <lo>–<hi> — <verdict>`.
**Read the verdict BEFORE you author a node:** `over-band` means drill-downs are planned now,
not discovered after the board is written, and it is where this board's grain is decided
(Step 5). `predictedNodeCount` is a candidate count, not a promise — you may still fold or
omit root-level files while authoring. `--layer 0` is the re-grain described above and
deliberately reports **no** band (`layerBand: null`, `budgetVerdict: null`): the L0 budget is
Step 5's 10-30 target, judged by you.

Print its `display` **verbatim — do not reformat, reorder, or summarise**. The `display` is
capped (default 25 rows per section) and names how many rows it dropped; the complete plan
is written to `.provenmap/group-plan.json`. Read that file only if a capped section is the
one you need — never print it.

**Branch on `evidence` before you use anything else in the plan** — it is the JSON's
`evidence` field and the display's first content line, and it says what produced these
groups:

- **`"coupling"`** (the normal case) — the clusters came from the import graph. Work them
  as proposals: refine, rename, override with a stated reason. The fields below apply.
- **`"directory-fallback"`** — resolved-edge density was below the sparse-evidence floor,
  so **edge evidence was sparse and this partition is structural, not coupling-derived**.
  Say so to the user in one line, then: verify each proposed group against an actual
  reading of the code, and **do not invent coupling** — never write a `Grouping rationale:`
  or an edge that claims a relationship the topology never showed you. `cohesion`/`density`
  come back `null` here (`—` in the display) because nothing measured them, and every group
  comes back `verdict: "container"` regardless of size — this path has no size demotion — so
  **judge drill-down yourself for an oversized bucket**: a directory holding dozens of files
  is a child board, not one flat container.

**Stamp what you used.** When you write the board (Step 5), copy this plan's `evidence`
value verbatim into the board's `metadata.groupingEvidence` (`"coupling"` or
`"directory-fallback"` — those two values only). It is local-only, never pushed, and the
board report reads it so the user can see what the containment rests on.

**An evidence FLIP on a board that already synced is a decision, not a detail.** If this
board's previous `metadata.groupingEvidence` differs from the plan's (coupling ↔
directory-fallback), regrouping will churn slugs and containment — real changes on the
wire, not a re-render. Say which way it flipped and ask via **AskUserQuestion** before
applying the new plan (header: `Regroup`; options: **Apply the new grouping** /
**Keep the current grouping**). Never auto-apply a flip. In `--auto` mode, keep the
current grouping and note the flip in the round's status line.

Then work from these fields:

- `clusters[]` — candidate groups with `cohesion` (how much of their coupling stays inside),
  `density` (how interconnected their members are), `folderAgreement` (how much the group
  matches a directory), and a `verdict`:
  - **container** — group them under one `domain_group`.
  - **drill-down** — too interconnected to read flat: set `layerBoardSlug` and let a child board carry it. Proposing a plain container here would fail the density gate anyway.
  - **dissolve** — the members lean outward more than they cohere: place them individually rather than boxing them.

  A cluster may also carry **`subClusters`** — the sub-groups a recursive pass found inside an
  oversized or band-escalated cluster, ready-made groups for its child board — and its
  `evidence` names the moment the band forced the call:
  `escalated: plan would hold <N> nodes vs band high <H>`. **An escalated cluster with no
  `subClusters` is your judgment call, not a defect:** the recursion re-seeds from directories
  and cannot see the internal boundaries of a folder-hostile blob. Split it into nameable
  drill-downs from its member list and the digest (paths, names, types — no file reads, per
  Step 4.5's plan-first rule), or keep it as ONE opaque drill-down. Never inline its members
  flat.
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

**First, state this board's grain — from its own plan, not from its depth number.** The
C4 ladder above is the vocabulary; Step 4.6's plan is the decision. **This rule covers
banded layer plans only (`budgetVerdict` non-null, layer ≥ 1).** A `budgetVerdict: null`
plan — the `--layer 0` re-grain, or a plan run without `--layer` — is **not** terminal and
is outside this rule: L0's grain is fixed by the C4 System Context rule below, and on any
other board you re-run the plan with `--layer <this board's layer>` before deciding.

- **Container-grade** — the plan proposes drill-downs (any `drill-down` verdict or an
  `escalated:` evidence line) or `budgetVerdict` is `over-band`. Author containers,
  deployable-internal modules and **opaque drill-down nodes**. Component-grade archetypes
  (`service_component`, `controller_component`, `repository_component`, `ui_component`,
  `page_component`, `layout_component`, …) are the smell here: if they would be **more than
  half** this board's nodes, you are authoring the layer below the one you were asked for —
  go back to the plan's `subClusters`/escalations and plan drill-downs instead.
- **Terminal** — the plan proposes no drill-downs and `budgetVerdict` is `fits` (or
  `under-band`). Component-grade nodes are correct here **at any depth**: a small subtree's
  L1 legitimately reads like a component diagram, and forcing container grain onto it invents
  empty pass-through layers.

Append the choice to the board's `metadata.description` in one sentence — container-grade
with N drill-downs, or terminal. This field ships to the platform as the board's
user-visible description — append to it, don't replace the project context already
there. Methodology:
[`${CLAUDE_PLUGIN_ROOT}/knowledge/codebase-analysis/references/layer-strategy.md`](../knowledge/codebase-analysis/references/layer-strategy.md)
→ "Board Grain".

**For L0 — build a C4 System Context, not an inventory.** The board answers one question:
_what is this system, and what does it talk to?_ Keep to 10-30 nodes, in two rings:

- **Center — this system's own deployables.** The apps, services and workers this repo
  ships, at the grain Step 4.6's `--layer 0` plan used (declared workspaces, or top-level
  directories in a single-package repo). One node per thing that ships and can fail on its
  own — not one per folder.
- **Around them — externally-evidenced systems.** Databases, third-party APIs/SaaS, queues,
  auth/payment/email/observability providers. The evidence is deterministic and already in
  front of you: the digest's `stacks.dependencies[]` (a vendor SDK there is a third party
  this codebase talks to — Steps 3–4), the `infra` classification (a `migration`,
  `terraform`, `kubernetes` or `serverless` file names the datastore or platform it
  provisions), and the skeleton's `externalImports` accounting. Add a system only where
  there is evidence for it; never populate this ring from guesswork about a typical stack.
- **Lean and flat.** Every internal node with internals worth seeing is an **opaque
  drill-down** (`layerBoardSlug`) into its L1 container board — not a container with
  children here. A flat L0 of drill-down systems plus their external neighbours is the
  intended shape, and drill-down nodes are exempt from the grouping floor below.

**Drill-down is the default at L0, not a garnish.** The two rules combine into one arithmetic
fact: an analysed node may claim at most 29 files, and L0 is capped at 10-30 nodes — so a repo
of any size cannot be covered by analysed L0 nodes alone. Any node that would claim **30 or more
files gets `layerBoardSlug`** (a proposed child-board slug); a drill-down node has no file limit
and defers its detail to that board. Splitting a 200-file domain into seven 29-file L0 nodes is
the wrong repair — it blows the node budget and creates the edge hairball Step 4.6 warns about.
Reach for splitting only when a node is modestly over and genuinely holds two concerns.

**L0 targets significance, not exhaustiveness.** Coverage is satisfied when every file
is claimed by _some_ node — and a container may claim its whole subtree via
`coveredFiles` and defer the detail to a child board (`layerBoardSlug`). Do NOT generate an
L0 node per leftover directory just to claim its files; fold small leftovers into the
nearest significant container and let the drill-down carry the detail. More L0 nodes
means more rolled-up L0 edges — breadth here is what creates hairballs.

A container whose child board has taken over ALL of its claims may set `coveredFiles: []` explicitly — never invent a placeholder claim just to satisfy the field.

**For L1+ (Drill-down):** Scope analysis to the files/directories covered by the parent node. L1 shows that deployable's **containers** (its apps, services, stores, workers); L2 the **components** inside one container; L3 the internals of one component.

**Container vs. drill-down (all layers):** Nodes with `layerBoardSlug` must NOT be `domain_group` containers with visible children. Their internals belong on the child board. Use `domain_group` containers only for grouping nodes that won't drill down.

**Grouping comes from Step 4.6's plan, not from node count or folder names.** Each
`domain_group` you create should trace to a cluster with `verdict: "container"`, each
nested container to a `parents[]` entry, and each top-level node either to a `root-level`
role or to a stated reason of your own. Node count does not tell you *how* to group — a board of 20 uncoupled nodes may need
only two containers, and a board of 6 tightly-coupled ones may need two as well; the
clusters come from coupling, not from a count. But node count is a hard **floor and
ceiling** pair, and drill-down nodes (`layerBoardSlug` set) are exempt from both counts —
their detail lives on a child board:

- **Floor:** a board with more than 8 non-drill-down nodes must have at least one
  `domain_group` with at least one node nested under it. A flat L0 landscape of pure
  drill-down systems is a legal shape.
- **Ceiling (A-CONTAINER-CEILING, L0/L1 only, advisory):** a container with more than 8
  inline (non-drill-down) children is one layer's detail drawn on this board. Default to
  making it an opaque drill-down node (set `layerBoardSlug`, move the children to the child
  board) or splitting it; keeping it inline is allowed with a `Drill-down rationale: …`
  line in its description — the board report lists every recorded override so the user
  sees the judgment call before `/sync`. This **warns, it does not fail the board**: at L0
  the ceiling, the >8-node grouping floor and the 30-file broad-claim limit all press at
  once, and drill-down is the single move that satisfies all three — so reach for it first
  rather than carving nodes to fit.

`--board-report`, `--validate` and `/sync` all enforce both (exit 3). Group by coupling;
never leave a board over 8 non-drill-down nodes flat, and never let one container hold a
whole layer inline without saying why.

**Root hygiene (L1+).** A loose leaf sitting at board root joins a container, becomes a
drill-down, or the board's description gains an appended note (never a replacement — this
field is user-visible on the platform) saying why it is a genuine singleton —
bootstrap/app-module wiring is the legitimate class, so name it as that. Board-root
candidates count toward the plan's `predictedNodeCount`, so a board that hoards them reads
over-band for a reason.

**`canContain` is advisory, not enforced.** Every archetype carries a `canContain` list,
and the server accepts a push whose nesting contradicts it — verified against a board
where vendor archetypes sat under a `domain_group` that excludes them and all 18 nodes
pushed with `verify.ok: true`. Treat it as a rendering hint: a nesting it disallows may
look odd on the canvas, but it will not be rejected. So do **not** retype a node to
satisfy it, and do not place a node at board root to avoid violating it — pick the
archetype that describes the component and the parent that describes the boundary. This
is unrelated to the node-count floor above: that rule is enforced (grouping structure),
`canContain` is not (archetype nesting) — the floor still applies regardless of any
archetype's `canContain` list.

**Incremental:** Only read and analyze the changed/added files from Step 1.5. Keep existing nodes from unchanged files as-is. For deleted files, mark their nodes for removal.

Apply these rules (start from the skeleton's `nodes[]` — file discovery and exclusion are already done):

- **Exclude non-architectural files**: already applied in the skeleton (`*.d.ts`, types/dto, tests, mocks) — and the barrel and `config`/`constants`/`enums` calls are made **by content, not by filename**, so trust them rather than second-guessing a name: an `index.*` barrel is excluded only when it genuinely re-exports and declares nothing of its own (a barrel that also declares real code IS a node), and `config.ts`/`constants.ts`/`enums.ts` are excluded only when they declare no functions or classes (a provider-registering `config.ts` IS a node). Only re-check files you discover outside the skeleton.
- **Agent-native artifacts are components, not docs**: skeleton nodes with `artifact.kind` (skills/commands/agents) are first-class architecture — group them like any other component family (e.g. a commands group, a knowledge/skills group, per plugin or domain), seed their `description` from `artifact.description`, and classify them with a fitting server archetype. If the catalogue has no fit for prompt-ware kinds, that is an archetype **gap** (e.g. a missing `agent_command`/`agent_skill`): use the closest existing archetype, record the gap in `metadata.archetypeGaps` so the closing report can name it, and never silently waive artifacts.
- **Group database files**: into a single `database-layer` container node at L0/L1 — the skeleton lists these as individual files, so you group them.
- **Apply the grouping plan**: Step 4.6's clusters, parents and root-level roles are the containment proposal — name the groups, override with a stated reason, do not re-derive boundaries from folder names
- **Classify by archetype**: using server archetype names — the skeleton does NOT classify, this is your job
- **Generate slugs**: use the skeleton's suggested `slug` as a starting point; refine from the primary class/export name

**Finish Step 5 by writing the board JSON now** — `.provenmap/boards/<board-slug>.json`
with the metadata (including `metadata.groupingEvidence`, copied from Step 4.6's plan),
the nodes (each with `coveredFiles`), and `"edges": []`. Step 6's rollup script reads and
rewrites this file; edges come next.

### Step 5.5: Claim check (script-owned)

Verify the `coveredFiles` partition before going further. **Never hand-audit it, and never
write a throwaway script to do it** — this is that script:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-prepass.js --claim-check .provenmap/boards/<board-slug>.json
```

Add `--skeleton .provenmap/skeletons/<board-slug>.json` for an L1+ board (the default is the
repo skeleton). It takes any path, so a draft written elsewhere can be checked before it lands.

Print the `display` field **verbatim**. Then:

| exit | meaning                                                | action                                                                                                                                                                     |
| ---- | ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0    | No file is claimed twice                               | Continue to Step 6. The display may still list broad claims (30+ files) and unclaimed files — both are **debt, not failure**. Fix them when your judgment says so: a broad claim wants `layerBoardSlug` (no file limit) or a split; an unclaimed file wants a claim, a waiver, or a deliberate decision to leave it pending. |
| 3    | A file is claimed by two nodes                         | Fix it and re-run this step. Decide which node owns the file and narrow the other's globs. This is the one hard defect: `coveredFiles` is a partition, and nothing downstream can repair an overlap. |
| 1    | Board JSON or skeleton missing                         | Print `error` verbatim; re-run Step 4.5 for the skeleton, or Step 5 for the board.                                                                                          |

`emptyClaimNodes` in the output names nodes whose `coveredFiles` matched nothing — a typo or an
out-of-scope path. Fix those even at exit 0: the node looks analysed while its files sit pending.

### Step 6: Relationship Detection

- **Rolled-up edges (script-owned, script-merged):** run the deterministic rollup
  with `--apply` — it maps the skeleton's file-level `imports` and `references`
  edges onto your Step 5 nodes, drops self-loops and containment pairs, dedupes
  with an import-count weight, leaves platform-hub edges out of the board, **and
  writes the result into the board JSON itself**:

  ```bash
  node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-prepass.js --rollup <board-slug> --apply
  ```

  For a drill-down (scoped) board, pass `--skeleton .provenmap/skeletons/<board-slug>.json`
  so the rollup uses the scoped skeleton Step 4.5 wrote for this board, not the
  repo-wide one; L0 uses the default repo skeleton (no flag needed).

  **You never hand-merge edges.** The script replaces the board's rollup-owned edges
  wholesale, preserves your model-owned ones untouched, and re-runs the board
  integrity gates before writing — so it is safe to re-run at any time and running
  it twice is a no-op. Print the returned `display` **verbatim — do not reformat,
  reorder, or summarise** (it ends with the merge summary: edges replaced, model-owned
  edges preserved, fresh edges deduped, hub targets left suppressed). Branch on the exit:

  | exit | meaning | action |
  | ---- | ------- | ------ |
  | 0 | Merged and written | Continue. `.provenmap/skeletons/<board-slug>.edges.json` is a diagnostic copy — do not merge it by hand. |
  | 3 | The merged board would fail an integrity gate — **nothing was written** | Print `error` verbatim, fix the board named by `boardPath` (the `gate.errors[]` say what), and re-run this step. |
  | 1 | Board JSON or skeleton missing | Print `error` verbatim; re-run Step 5 for the board, or Step 4.5 for the skeleton. |

  **The script rewrote the board file** — re-read `.provenmap/boards/<board-slug>.json`
  before any further edit, and never write back a copy you were holding from before the
  apply (that silently drops every edge it just merged).

  For each `report.suppressedHubs` entry, stamp that node with
  `metadata.hubInDegree = distinctSources` — the fact survives without N identical
  edges (nodes are yours; `--apply` only ever touches `edges`). Do NOT hand-map skeleton
  edges yourself; the script owns those rules, and it resolves imports for every supported
  language — never re-parse them by hand.

- **Reclassify where you know better — and take ownership when you do:** the rollup can
  only ever say `uses`. Where reading the involved files shows the real relation, change
  the edge's `type` (`db_read`, `api_call`, `publishes`, …) **and delete its
  `metadata.weight`**. That is not optional bookkeeping: a weighted edge is rollup-owned,
  so the next `--apply` would replace it and silently revert your type. Dropping the weight
  makes the edge model-owned, and model-owned edges are preserved forever.

  **Expect the structural twin, and leave it alone.** Because the import fact is still
  true, the next `--apply` re-derives that pair as a fresh weighted `uses` edge alongside
  your `db_read`. Two edges between the same pair, different types, is legitimate and
  intended: the weighted `uses` is the structural fact ("A imports B", regenerated every
  run), your typed edge is the semantic claim about what the code does with it. Do not
  delete the structural edge (it comes back), do not re-type it again (that just forks
  another semantic edge), and never keep two edges of the **same** type between one pair —
  that is a duplicate the gates reject.
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
  no file-boundary risk. You merge: add each candidate as a **model-owned** edge
  (no `metadata.weight` — never copy a weight onto one), drop a candidate only when
  an edge of the **same** source+target+type already exists, leave the rollup's
  weighted `uses` edge for that pair in place, apply the board-scope rule, and
  record off-board relations in `metadata.deferredEdges[]` rather than dropping them.

- **Cross-board relations:** when a real dependency's other end lives on a
  different board, append it to the board metadata's `deferredEdges[]`
  (`{ sourceSlug, targetHint, type, targetBoardSlug?, description? }`) instead
  of discarding it. These stay local — `/sync` never pushes them — and the
  coverage dashboard counts them so inter-domain structure stays visible.

  The rollup only maps literal-path `references` (an artifact naming another
  skeleton file by path). Add further artifact relationships you find by reading
  bodies yourself — e.g. a command that says "load the X skill" without a path.

Scope all edges to this board's nodes only.

**Incremental (edge provenance — the frozen rule both you and the script obey):**
edges carrying `metadata.weight` are **rollup-owned**; edges without one are
**model-owned**. On an incremental pass just re-run `--rollup <board-slug> --apply`:
it discards every rollup-owned edge and regenerates them from the current skeleton,
and preserves the model-owned ones byte-for-byte. Nothing to delete by hand, and
nothing to re-apply — your reclassified types survive precisely because you dropped
their weights when you made them. Drop a model-owned edge yourself only when an
endpoint node was removed.

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

**Incremental:** Merge new/changed nodes into existing board data. Replace nodes whose `coveredFiles` contain a changed file. Remove nodes whose covered files were all deleted. Remove edges referencing removed nodes (rollup-owned edges — those with `metadata.weight` — were already regenerated by Step 6's `--rollup --apply`).

Always record the current git commit hash via `git rev-parse HEAD` as `analyzedAtCommit`, and carry the `groupingEvidence` you stamped in Step 5. Stamp `analyzedBy` truthfully: `{ "mode": "orchestrator-inline" }` when you write the board yourself in this conversation; dispatched agents stamp `{ "mode": "agent", "model": "…" }` per their prompt (Step 8.7). Never carry a previous run's `analyzedBy` forward. Every node carries `coveredFiles` and the metadata carries `waivedFiles` (from Step 4.5):

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
    "analyzedBy": { "mode": "orchestrator-inline" },
    "groupingEvidence": "coupling",
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

### Step 8.3: Board report + gate (immediately after the JSON is written)

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-prepass.js --board-report <board-slug>
```

Run this the moment Step 8 writes the board JSON — **before** styling, coverage or
any user-facing offer. Branch on the result:

- `gate.valid: true` → continue to Step 8.4. This display is not what gets printed —
  the ledger is still stale here (Step 8.5 hasn't run yet); the Output Format re-runs
  this same command after coverage refreshes and prints that display instead.
- `gate.valid: false` (exit 3) → **stop the pipeline for this board.** Print the
  `errors[]` verbatim, fix the board JSON, and re-run this step until it passes.
  Never style, coverage-refresh, write the manifest, or offer next steps for a board
  that has not passed its gate — that work is discarded when the gate finally runs.

**Then react to the advisories in the same JSON.** `advisories[]` (each
`{ gate, target, message, remedy }`) and `unresolvedAdvisories` structure the SOFT warnings
that have a react-or-override mechanic. They never fail the gate — which is exactly why
they get ignored — so: **a board with `unresolvedAdvisories > 0` is not done.** Print each
advisory's `message` **verbatim**, then settle every one of them, either:

- **Restructure** — convert the cluster or container the advisory names (`target`) into a
  `layerBoardSlug` drill-down, or split it, and re-run this step; or
- **Override** — record the reason on the board and re-run this step: append
  `{ "gate": "<gate>", "rationale": "<why this board is right as it stands>" }` to
  `metadata.gateOverrides` for the board-wide advisory (`A-BUDGET`), or add a
  `Drill-down rationale: …` line to the named container's description for the
  inline-children one (`A-CONTAINER-CEILING`). The report then lists the recorded
  override and the count drops. `A-CONTAINER-DENSITY` (a container whose children form
  a dense internal subgraph) has **no** override — the marker does nothing for it; a
  `layerBoardSlug` drill-down is the only fix. `gateOverrides` is local-only — it is
  never pushed.

For a fanned-out drill-down this step is the agent's own (Step 8.7 already requires
each agent to report its board's gate status and unresolved-advisory count); the
orchestrator runs it here for the board it writes directly.

### Step 8.4: Author the styling plan

After writing the board JSON, style it (methodology:
[`${CLAUDE_PLUGIN_ROOT}/knowledge/board-styling/SKILL.md`](../knowledge/board-styling/SKILL.md) — read it if not
already read):

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
   - `pending-area` → analyze the pending files under its `path` (take them from the ledger's `pendingFiles`; if `pendingTotal` exceeds the listed files, get the complete list from `pmap-prepass.js --claim-check <board.json> --list-all` — **never** hand-derive it from `.provenmap/skeletons/repo.json`, which you must not read whole) and place the resulting nodes on the board that owns that scope (L0, or the matching drill-down board)
   - `broad-claim` → the node claims 30+ files with no drill-down. Prefer setting `layerBoardSlug` on it (no file limit, defers the detail honestly); split it into nodes under 30 files only when it genuinely holds two concerns
   - `edge-gap` → relationships the import graph justifies are missing from that board: re-run Step 6's `--rollup <slug> --apply` for it (the script does the merge; the usual cause is an older run whose rollup output was never merged), then reclassify types as Step 6 describes
   - `regroup` → that board's containment has drifted from its edges: re-run Step 4.6's `--group-plan` for it with `--against .provenmap/boards/<slug>.json`, walk the proposed moves, and re-parent only what the plan justifies and you agree with. Re-parenting is a real change on the wire — never apply the moves wholesale, and leave anything whose grouping is deliberate (say so in its description with `Grouping rationale:`). If the plan's `evidence` differs from the board's `metadata.groupingEvidence`, this is Step 4.6's flip case — ask first, and re-stamp the field if the user applies it
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
2. Launch one `architecture-analyzer` agent (Task tool) per selected board, **all in a single message** so they run concurrently. Each dispatch prompt must be self-contained (agents share nothing). For a drill-down, state that it is **layer-board mode** and pass the child board slug + display name, target layer, `parentBoardSlug`/`parentNodeSlug`, the parent node's scope path and `coveredFiles`, the Step 0 node/edge archetype name lists, and whether the child board already exists on the server (Step 0.5 map). For a board refresh, state that it is **incremental-refresh mode** and pass the board slug plus its ledger worklist (`staleNodes[].changedFiles`, in-scope `pendingFiles[]`, `orphanedFiles[]`) and the same archetype lists. Either way the agent runs its own prepass, group plan (`--group-plan --layer <target layer>`), rollup, and board report — do not pre-run them. Every dispatch prompt states both react moments: read `budgetVerdict` **before** authoring and state the board's grain (Step 5), and drive `unresolvedAdvisories` to zero **after** authoring by restructuring or recording a rationale (Step 8.3).
3. **Model per agent:** if `.provenmap/config.json` has `analysis.subagentModel`, pass it as the model for every dispatched agent; otherwise dispatch L1 boards with the session model (inherit) and, where the host supports a per-agent model override, L2/L3 boards with a faster model. If the host supports neither model overrides nor parallel agent launch, dispatch the same prompts sequentially with defaults — the flow is otherwise identical.
4. **Builder stamp:** every dispatch prompt must tell the agent to stamp `metadata.analyzedBy: { "mode": "agent", "model": "<the model you passed, or 'session-inherit'>" }` in the board JSON it writes. This is how `/status` and the board report answer "was a subagent used, with what model" — the deterministic dispatch log (a PostToolUse hook) records the dispatch itself, and the stamp attributes it per board.

**Join — after ALL agents return:**

1. Each agent reports its board's grain (container-grade with N drill-downs, or terminal), gate status, and unresolved-advisory count (all from its own `--board-report`). For a board whose gate failed, whose advisories are still unresolved, or whose agent died, tell the user which board and why, and offer to re-run just that board — the other boards' results stand.
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

When rewriting a board JSON, never carry forward `metadata.origin`, `metadata.mirroredAt`, `metadata.mirroredFromBinding`, or a node's `metadata.mirrored` — those mark un-analysed server mirrors, and the prepass/sync gates refuse them. A mirror's `layer` is never carried forward either: the bound board is re-stamped `layer: 0` (layering is binding-relative — Step 1), and only genuine drill-down child boards of this binding carry `layer` ≥ 1.

**CRITICAL:** The board display name field is `name` (NOT `boardName`). The `--ensure-boards` CLI reads `name` to create missing child boards on the server — using `boardName` will cause board creation to fail with an empty name.

## Target Path

If $ARGUMENTS is `--clean`, run full re-analysis from scratch (delete existing board data first).
If $ARGUMENTS starts with `--drill`, parse `<parent-board-slug>/<node-slug>` and drill into that node; a trailing `--clean` deletes that child board's JSON + store first.
If $ARGUMENTS is `--all`, run full progressive analysis (each board uses incremental if it already exists).
If $ARGUMENTS contains `--auto`, apply Unattended mode (combinable with `--all`; with no other flag it resumes the coverage loop on the existing board tree).
Otherwise, run L0 overview analysis with incremental mode (or full if no board data exists).

## Output Format

The report is **script-rendered — never hand-assemble counts into prose.** After Step 9, for each board written this run:

Re-run the board report now, after Step 8.5 has refreshed the coverage ledger:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-prepass.js --board-report <board-slug>
```

Print the returned `display` **verbatim** (nodes-by-archetype bars, edges by type,
per-board file accounting with the analysed percentage, the parse-health line naming this
board's claimed files that parsed partially or not at all, the grouping-evidence line when
the containment came from the directory fallback, hub nodes, isolated nodes, drill-down
candidates, board file path). This
re-run is a **pure re-render for display** — its only purpose is to pick up the ledger
Step 8.5 just refreshed, so the per-board file-accounting line shows real numbers
instead of the "ledger not refreshed" line the Step 8.3 display would still be carrying.
The gate itself was already evaluated and passed at Step 8.3 and is **not** re-evaluated
here: a non-zero exit at this point is a reporting problem (fix and retry), never treat
it as a gate failure.

**Gate errors block — already handled at Step 8.3.** Step 8.3 stopped the pipeline for
any board whose `gate.valid` was `false`; a board only reaches this section after its gate
passed. `gate.warnings` do not block — print them and continue.

Then add ONLY what the script cannot know:

- **Structure health, first among your own additions — before you say anything about a
  percentage.** (The script-rendered blocks above are still printed verbatim, unmodified and
  unreordered — this governs your own narration around them, never the blocks themselves.)
  One line per board written this run: its grain (container-grade with N drill-downs
  planned, or terminal), whether the group
  plan's `budgetVerdict` was met, and that every advisory is resolved or overridden — naming
  the rationale where you recorded one. Files mapped behind a **planned** drill-down are
  planned depth, not debt: a board that plans its drill-downs reads lower on analysed-% than
  one that inlines everything flat, and it is the better board. The analysed percentage
  belongs in the dashboard below, never as this run's headline achievement.
- Analysis mode (incremental or full); if incremental, the changed/added/deleted files analysed
- Judgment calls worth flagging — max 5 bullets (rule deviations, split/merge decisions, why isolated nodes are genuinely isolated vs missed edges). The board report already **names** the shaky-parse files and the directory-fallback grouping — don't restate them; say only what you did about them (which one you read yourself, which node's typing is unconfirmed, which grouping you verified against the code)
- The **archetype gap note**, if and only if any board written this run has a non-empty `metadata.archetypeGaps` (Step 5 records it). One block, at most three named gaps, then stop:

  ```
  ⚑ <N> component(s) had no fit archetype — typed with the closest available:
    <name> → used `<usedInstead>` (<count> node(s): <slug>, <slug>)
    Run /analyze-archetypes to propose the missing archetypes. Optional — the board is complete as it stands.
  ```

  Print **nothing at all** when the array is empty or absent, which is the common case. Never turn this into a prompt, never offer to run `/analyze-archetypes` for the user here, and never present the board as incomplete because of it — the whole point of the note is that it costs the user nothing to ignore.

- The **final** Step 8.5 coverage dashboard, verbatim (if Step 8.6 looped, one dashboard — the last — not one per pass)
- Which next-area choices the user made, if any passes looped

Never restate numbers **in your own prose** that the board report or coverage dashboard
already shows. This scopes your commentary only — it never licenses replacing or
referencing a block the list above requires verbatim. The board report and the final
coverage dashboard (bar included) are printed in full, every run.
