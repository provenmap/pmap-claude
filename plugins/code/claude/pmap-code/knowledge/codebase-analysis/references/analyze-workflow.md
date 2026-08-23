# /analyze Workflow — the clause-level contract

This file is the delegated tier of the `/analyze` command. The command body carries the entry
gates (preflight, archetype gate), the connect-now offer, the mode dispatch and the ordered
step map; this file carries **every CLI call with its flags, every exit branch, every prompt,
every actor and every hard rule** for the steps the map names. Follow it exactly; improvise
nothing.

**Display contract (applies throughout):** print every `display` field **verbatim — do not
reformat, reorder, or summarise** — in your reply (the Bash output panel is collapsed for the
user); branch only on exit codes and named JSON fields.

**One reply runs the whole map (applies throughout):** end your reply only at the closing
Report or at a stop a step names — never after relaying a panel or fixing a gate error; a
relayed panel is progress, not completion. If a detour (a gate fix, a re-run) interrupts a
step, finish the detour and resume the map where you left it.

The layer ladder, node budgets, board grain rules, grouping verdicts, slug resolution and the
board-file layout live in `references/layer-strategy.md`. Coverage/claiming rules and the
edge-ownership model live in the codebase-analysis `SKILL.md`. This file points there rather
than restating them.

## Analysis Modes

### Default: Incremental Analysis

**If board data already exists** (`.provenmap/boards/<board-slug>.json` with nodes/edges) AND
`--clean` was NOT passed AND `analyzedAtCommit` is present in metadata:

1. Unless Step -0.5 reported `ledgerError` (then go straight to item 6's fallback), use the
   Step -0.5 ledger — it is fresh this run; do NOT re-run the coverage script. Read
   `.provenmap/coverage.json` and take this board's entry. The worklist is:
   - `boards[].staleNodes[]` — nodes whose covered files changed since analysis → re-analyze
     these nodes from their listed `changedFiles`
   - `pendingFiles[]` — files no node covers yet → new components to place
   - `boards[].orphanedFiles[]` — covered files that no longer exist → remove/shrink their
     nodes
2. Run `git diff --name-only --diff-filter=D <analyzedAtCommit> HEAD` to confirm deleted files
3. If the worklist is empty (no stale nodes, no pending files, nothing deleted): report
   "Board is up to date — nothing changed since last analysis" and print the Step -0.5
   `display` markdown verbatim. If that dashboard still lists "Where to go next"
   recommendations (an unbuilt drill-down, a pending area), the map has open work even
   though nothing changed — continue at Step 8.6 and ask; printing the list without the
   question is a defect. Stop here only when there are no recommendations either
4. Otherwise, load the existing board data (nodes + edges) and **get the merge decision from
   the script — do not glob-match it by hand:**

   ```bash
   node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-prepass.js --claim-check .provenmap/boards/<board-slug>.json --changed-since auto
   ```

   The `impact` field answers all three questions: `replace[]` (nodes claiming a changed
   file, with the files that hit them), `remove[]` (nodes whose every claimed file is gone),
   and `unclaimedChanged[]` (changed files no node claims — new architecture needing new
   nodes). `auto` diffs against the board's own `analyzedAtCommit`; pass an explicit commit
   instead if you need a different base.
5. Then merge:
   a. Re-analyze ONLY the files behind `impact.replace` plus `impact.unclaimedChanged`
      (Steps 3–6 scoped to those files), then replace those nodes and add nodes for the
      unclaimed changed files
   b. Remove the nodes in `impact.remove`
   c. Remove edges where source or target node was removed
   d. Re-run relationship detection for changed nodes (Step 6)
   e. Write merged result to board JSON with updated `analyzedAt` and `analyzedAtCommit`
   f. Update manifest
6. **Fallback:** if the Step -0.5 script failed, scope from a raw
   `git diff --name-only --diff-filter=ACMR <analyzedAtCommit> HEAD` instead (exclude
   `node_modules/`, `dist/`, `.git/`, `coverage/`, test files). If the ledger marks this
   board `coverage: unknown` (its nodes carry no `coveredFiles`), incremental merge is
   impossible — stop and tell the user to run `/analyze --clean` for this board

**If no board data exists** (fresh project): run full analysis (Steps 0–9).

**If `analyzedAtCommit` is missing** (no commit anchor — incremental is impossible): fall back
to full analysis.

Incremental mode applies at every step below that carries an **Incremental:** note — those
notes are this mode's per-step mechanics.

### Clean: Full Re-Analysis (`--clean`)

Ignores existing board data. Deletes the board's JSON and store file, then runs full analysis
from scratch (Steps 0–9). Use when the codebase has changed significantly or the incremental
result looks stale.

Combine with `--drill` to rebuild one child board from scratch:
`/analyze --drill <parent-board-slug>/<node-slug> --clean` — this is the recovery path when
the coverage dashboard marks a specific drill-down board `coverage: unknown`. (Only that
child board's JSON + store are deleted first.)

### Drill-Down: Create Child Board (`--drill <parent-board-slug>/<node-slug>`)

Creates a child board by drilling into a specific node from a parent board. The node must
exist in the parent's analysis data. Incremental mode applies to drill-down boards too — if
the child board already exists, only changed files within its scope are re-analyzed.

### Full Progressive: All Layers (`--all`)

Runs L0 first, then prompts for review before creating L1 boards for each drill-down node.
Repeats for L2 if applicable. Each board uses incremental mode if it already exists.

When building several boards **in parallel** (subagents), give every intermediate/scratch
file a board-slug prefix — parallel agents share one scratchpad directory and generic
filenames silently clobber each other. When the user approves several drill-downs at once,
build them via the Step 8.7 fan-out.

In `--all` mode the per-board review prompts above govern the middle of the run — run
Step 8.6 (the next-area question) **once, after the final board**, not per board.

### Unattended: Full Automation (`--auto`)

`--auto` removes every mid-run prompt and loops until all layers are analysed — on a fresh
project (`--all --auto` bootstraps L0 first) or an existing board tree (`/analyze --auto`
finishes whatever coverage remains). **Loop control is script-owned:** every round is
planned, tracked, and terminated by the `--auto-plan` mode of the prepass CLI — never by
your own judgment. It refreshes the coverage ledger, keeps the per-round history in
`.provenmap/auto-run.json`, and renders the between-rounds stats.

The loop:

1. **Start** (after the Step -2/-1 gates, replacing Step -0.5):
   `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-prepass.js --auto-plan --reset`. Print its `display`
   verbatim (bar, counts, trend, and this round's plan).
2. **Branch on the JSON** — the script owns the verdict:
   - `mode: "bootstrap"` — no boards yet (fresh analysis): run the full L0 analysis
     (Steps 0–9), then go to 3.
   - `mode: "round"` — execute the plan exactly: `parallel[]` as one Step 8.7 batch (one
     subagent per drill-down), then `sequential[]` one at a time (Step 8.6 step-4
     mechanics). Act on nothing the plan doesn't list; never waive files. As each board
     finishes, print one status line — board slug, node/edge counts, gate pass/fail,
     advisories resolved or overridden — so progress stays visible mid-round. Then go to 3.
   - `mode: "done"` or `"stalled"` — the run is over. Print `display` verbatim (it ends with
     the full coverage dashboard and the deferred judgment calls — broad claims and pending
     waiver decisions). On `stalled`, relay `stallReason`. Close the final report with
     `Run /sync to push the boards and this coverage snapshot.`
3. **Re-plan:** run `--auto-plan` again (no `--reset`) — it refreshes the ledger itself, so
   Step 8.5 is skipped entirely in auto mode. Print `display` verbatim and return to 2.

Prompts elsewhere become stops, never silent skips: the archetype precondition, branch
mismatch, and not-connected gates each stop with their canonical sentence (the command's
Steps -2/-1 name the `--auto` behaviour). The script's stall guard and round cap are the only
termination authority — do not stop early because the loop "feels" done, and never continue
past a `done`/`stalled` verdict.

## Progress display (every phase change)

At the **first step of each phase** — Steps -2, 0, 4.5, 8, and 9 — run:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-prepass.js --spine analyze --step <this step's number> --with-coverage
```

Print the returned `display` verbatim. It carries the phase chain, the current phase's steps,
and the coverage bar. Do not run it at every step — once per phase is the intent; more is
noise.

Exit codes: `1` bad usage (fix the call), `3` the step is not registered (the pipeline
registry has drifted from the step headings — report it and continue; the spine is display,
never a gate).

## Step -2: Preflight — binding, branch, local state (delegated detail)

The command body carries the gate's invocation and exit branches. Delegated detail:
on exit 0, if `repairs.boardsRecovered` is non-empty, local state
was just restored from the server — say so once (the `display` already carries the sentence)
and continue. The `--no-repair` flag accompanies a whole-tree `--clean` because repair
mirrors the server's board into local state and `--clean` would then delete exactly what it
just fetched — a wasted round-trip that also makes the run report "deleting existing board
data" for data that never existed locally. Keep repair on for `--drill … --clean` (only one
child board is being rebuilt; the siblings still want rehydrating). The exit-11
branch-mismatch prompt is in `${CLAUDE_PLUGIN_ROOT}/knowledge/provenmap-integration/SKILL.md`
("Branch-Mismatch Prompt").

## Step -1: Branch guard + optional archetype gate (delegated detail)

A user who wants to curate the archetype vocabulary *before*
any board is produced opts in with `"analysis": { "archetypeGate": "strict" }` in
`.provenmap/config.json`; otherwise `/analyze` runs straight through and reports the
archetype gaps it actually hits at Step 9. Which mode is active is **decided by the script,
not by prose** — react to `pmap-precondition.js --kind code`'s output; never decide on
your own that the gate does or doesn't apply.

The `status` field + exit code drive behaviour:

| status            | exit | requiresPrompt | action                                                                                                 |
| ----------------- | ---- | -------------- | ------------------------------------------------------------------------------------------------------ |
| `gate_off`        | 0    | false          | The default. Proceed **silently** to Step 0 — say nothing about archetypes here.                        |
| `ok`              | 0    | false          | Proceed silently to Step 0.                                                                            |
| `pending`         | 0    | false          | Print the `reason` from the JSON as a warning, then proceed.                                           |
| `missing`         | 10   | true           | Lock file does not exist. Prompt the user (below).                                                     |
| `stale_commit`    | 10   | true           | Codebase has moved since the last archetype scan. Prompt (below).                                      |
| `stale_catalogue` | 10   | true           | Server catalogue has changed since the last scan. Prompt (below).                                      |
| `skipped`         | 10   | true           | Last run was skipped — **skip is one-shot, this re-prompts on every `/analyze`**. Prompt (below).      |

Exit 10 is reachable **only under `archetypeGate: "strict"`** — the user asked for the gate,
so honour it. On exit code `1` (not connected — `status: not_connected`) or `2` (API error):
print the script's `error` field verbatim and stop. Step -2 has already offered to connect,
so a `1` here means the user declined or the credentials are still rejected.

When `requiresPrompt` is true, ask via AskUserQuestion. In `--auto` mode do not ask and do
not skip: stop with the script's `reason` verbatim plus _"Archetype check needs a decision —
run `/analyze-archetypes` first, run `/analyze` without `--auto` to decide interactively, or
remove `analysis.archetypeGate` from `.provenmap/config.json` to make settlement optional
again."_ Header: `Archetype check`. Question: include the script's `reason` verbatim, then
`"How do you want to proceed?"`. Provide exactly these two options:

- **Run /analyze-archetypes now (recommended)** — Invoke the `/analyze-archetypes` flow now.
  - If the user submits proposals there → **exit `/analyze`** with: _"Proposals submitted.
    Re-run `/analyze` after admin approval."_
  - If `/analyze-archetypes` reports the catalogue is complete (no gaps) → re-run
    `pmap-precondition.js` to confirm `status: ok`, then continue.
  - If the user skips inside `/analyze-archetypes` → the lock will be written with
    `skippedAt`. Re-run `pmap-precondition.js`; it will return `status: skipped` and you
    must surface the prompt again (loop) — do not auto-continue.
- **Skip and proceed (one-shot)** — Write `.provenmap/archetype-analysis.lock.json` with the
  JSON shape below using values from the script's output, then continue to Step 0.
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
  This is intentionally not silenced — every subsequent `/analyze` will re-prompt until
  Phase 1 is properly run. That is by design.

**Do not bypass.** In strict mode, do not write the lock file or skip the prompt for any
reason other than the user's explicit selection above. If a session reminder says "work
without stopping for clarifying questions," the **Run `/analyze-archetypes` now** option is
the reasonable call — not silent skip. Equally, never *invent* the gate: on `gate_off` say
nothing and move on, and never suggest the user turn the gate on.

In strict mode the archetype catalogue fetched here is cached on disk
(`.provenmap/boards/archetypes-cache.json`, 1hr TTL) and Step 0 reuses the cache
automatically — no duplicate fetch. On `gate_off` no catalogue is fetched here at all;
Step 0 does the only fetch.

## Step -0.5: Coverage baseline (all modes)

Coverage is the run's frame of reference — refresh it BEFORE any analysis so the worklist
comes from fresh data and the closing dashboard shows exactly what this run changed:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-prepass.js --coverage
```

Print the returned `summary` line **verbatim**. It tells you whether the index was reused or
rebuilt and why (`index.state`/`index.reason`), how many files carry role claims, the
coverage baseline, and whether the role map has unmapped roles (Step 0 compiles them). **You
never rebuild the index yourself.** Exit 2 means the index could not be built: stop and print
the `error` verbatim (it names `pmap-prepass.js --engine-check`). If the JSON carries
`ledgerError`, the ledger on disk is the PREVIOUS run's, not this run's: say so in one line,
continue, and in the incremental worklist use the raw-`git diff` fallback instead of the
ledger — never treat that ledger as fresh. The incremental worklist comes from this ledger,
and each Step 8.5 refresh shows the ▲/▼ delta since the previous refresh.

## Step 0: Fetch Available Archetypes (ProvenMap only)

If ProvenMap configuration exists (`.provenmap/config.json` with `bindingToken`):

1. Run the archetypes CLI to fetch available archetypes from the server:

   ```bash
   node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-archetypes.js --kind code
   ```

2. Parse the JSON output to get:
   - `display`: the catalogue itself — every archetype grouped by primitive, one line each.
     **This is what you classify from; read it, don't re-request it.** The raw
     `archetypes[]` array is deliberately not emitted (a few hundred archetypes of JSON is
     the single largest read in this command); pass `--full` only if you truly need every
     field.
   - `nodeArchetypes`: Available archetype names for nodes
   - `edgeArchetypes`: Available archetype names for edges
   - `cacheFile`: where the full catalogue sits on disk — read it **only** for a specific
     archetype you are genuinely torn about, never wholesale
   - `catalogueHash`: the hash of the catalogue — item 5 compares it with the role map's

3. If the CLI fails or returns no archetypes, warn the user but continue analysis using
   conventional archetype names (service, database, api, library, queue, external,
   domain_group, infrastructure, external_system). The sync CLI will need archetypes
   configured on the server before types can be validated.

4. Store the available archetype names for use in Step 5 (Component Discovery) — every
   node/edge `type` you assign must be one of these server archetype names.

5. **Compile the role map (once per catalogue).** Step -0.5's `roleMap` block says whether
   `.provenmap/role-archetype-map.json` is `present`, its `catalogueHash`, and
   `unmappedRoles[]` — the index's headline roles (`controller`, `service`, `repository`,
   `model`, `middleware`, `client`, `worker`, `module`, `migration`, `component`,
   `utility`) that have no archetype yet. If it is present, its `catalogueHash` equals this
   step's `catalogueHash`, and `unmappedRoles` is empty, there is nothing to do. Otherwise,
   from the catalogue `display` you just read, choose **one** archetype name per unmapped
   role (a role with no honest fit stays unmapped — the projection then shows the bare role
   and you type those files by hand), write `.provenmap/role-archetype-map.draft.json` as
   `{ "entries": [{ "role": "<role>", "archetypeName": "<catalogue name>", "rationale": "<one line>" }], "unmappedRoles": ["<role with no fit>"] }`,
   and run:

   ```bash
   node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-prepass.js --role-map .provenmap/role-archetype-map.draft.json
   ```

   Print its `display` verbatim (`Role map: 11 roles mapped · 0 unmapped · 0 pinned`).
   Exit 3 names an archetype the catalogue does not have — fix the draft and re-run; exit 1
   means the catalogue is not cached (re-run item 1) or the draft is malformed. From here on
   `--detail` rows carry `archetype`, and every lookup is the script's. When the catalogue
   hash has drifted, pinned entries survive and you recompile only what changed; to pin a
   choice of your own, put `"pinned": true` on that entry (see the archetype-analysis
   skill).

## Step 0.5: Fetch Server Boards

If ProvenMap configuration exists:

1. Run the boards CLI to fetch all boards from the server:

   ```bash
   node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-boards.js
   ```

2. Parse the JSON output to get:
   - `rootBoard`: The root board (where `isChildBoard === false`)
   - `childBoards`: Child boards below the bound board, with their `parentBoardSlug` and
     `parentNodeSlug` (the bound board itself is never listed here, even when the server
     marks it a child of an architect landscape)
   - `boards`: Full list for building the server board map

3. Store the board list for use in Step 1 and Step 7 — the server board map tells us which
   boards already exist and what slugs to use.

4. If the CLI fails, warn but continue — analysis can proceed without server board info, but
   `/sync` may encounter issues.

## Step 1: Load or Initialize Manifest

1. Read `.provenmap/boards/manifest.json` if it exists
2. If creating a new L0 board:
   - Read `boardSlug` from config (`.provenmap/config.json` → `boardSlug` field)
   - If config has no `boardSlug`, make the **connect-now offer** (the command body carries
     it verbatim)
   - Use the config `boardSlug` as the L0 board slug. **Local layering is binding-relative:**
     the bound board is ALWAYS this repo's L0 (`metadata.layer: 0`), even when the server
     board tree reports it as a child of an architect landscape board (`isChildBoard: true`
     with a `parentBoardSlug`/`parentNodeSlug` pointing above the binding). Preserve those
     two server placement fields verbatim in the metadata if a mirror carried them, but
     never let them change the layer, and never treat the bound board as a drill-down of a
     board outside this binding.
3. If drilling down, validate that:
   - The parent board exists in the manifest
   - The target node exists in the parent's analysis data
   - Check if a matching child board already exists on the server (from Step 0.5 board list)
   - If found on server → use the server's board slug
   - If not found → generate a child `boardSlug` locally (e.g., `<parent-slug>--<node-slug>`)
4. Check if board data already exists at `.provenmap/boards/<board-slug>.json` — if so, load
   it for incremental mode

## Step 1.5: Change Detection (Incremental Mode)

The worklist, merge decision, empty-worklist stop and fallbacks are the "Default:
Incremental Analysis" mode section above — execute them here, at this point in the
pipeline. If `--clean` was passed: delete the existing board JSON and store file, proceed
with full analysis.

## Step 2: Configuration Check

Read settings from `.provenmap/config.json` if it exists to get portal configuration and
analysis preferences.

## Steps 3–4: Project + Tech Stack Detection (script-owned)

Both are computed deterministically by the Step 4.5 prepass and arrive in its
`digest.stacks`: `monorepo` (boolean), `workspaces[]` (each with `path`, `name`, `kind`, its
own `techStacks[]` and its own `dependencies[]`), `techStacks[]` (the union),
`dependencies[]` (the union of declared runtime dependencies), and `manifestLanguages[]`.
Do **not** re-read `package.json`/`go.mod`/`pyproject.toml` to rediscover them.

`dependencies[]` is your external-system evidence — how to read it (and its caveats) is in
`references/layer-strategy.md` → "Building the L0 System Context".

Your job here is judgment on top of those facts: decide which workspaces deserve parent
nodes, and name any stack the scan reports as unknown (it reports only frameworks a manifest
actually declares — a repo using an undeclared or in-house framework will show none, and
that is when you look at the code).

**Incremental:** runs every pass — the prepass is cached and always reflects HEAD.

## Step 4.5: Structural Prepass (deterministic skeleton)

Run the prepass CLI to get a deterministic structural skeleton — the candidate-node
inventory and the resolved `imports` graph — so the analysis does not reconstruct them from
raw file reads:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-prepass.js --out .provenmap/skeletons/repo.json --digest
```

For an L1+ drill-down board, scope the emitted nodes to the parent node's subtree (imports
may still target files anywhere under the repo root), and write it under the board's own
name so it never clobbers the repo-wide skeleton:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-prepass.js --scope-path <parent-node-path> --out .provenmap/skeletons/<board-slug>.json --digest
```

The full skeleton is written to the `--out` path (all skeletons live in
`.provenmap/skeletons/`) — **that file is the scripts' input, not yours: never read it
whole.** `--digest` prints the compact view you work from plus a `display` you print
verbatim. The repo index was ensured at Step -0.5; a `--scope-path` run **slices** it into
the board's view (`cached: true` is the normal case) — it is never a second walk. Reading
modes (`--digest`, `--detail`) read the existing index and never walk — only Step -0.5's
`--coverage` (and `--auto-plan`) rebuild it.

The `digest` field contains:

- `directories[]` — the file inventory rolled up per directory: `path`, `files`,
  `artifacts`, `languages` (counts), `topFiles` (most-imported basenames). This is the file
  inventory — the **grouping** worksheet is Step 4.6's, not this one.
- `directories[].roles` — the headline-role histogram per directory
  (`controller 3, service 4 …`) and `directories[].unclaimed` — files the index could not
  type. Plan by what an area **is**, not by its folder name.
- `edges[]` — the top directory→directory import flows with summed `weight`: cross-area
  structure at a glance. The per-file edges stay in the skeleton for the rollup script.
- `stacks` — workspaces, monorepo flag, and frameworks from the manifests: this **is**
  Steps 3–4's output.
- `infra` — infrastructure-as-code and schema files by kind (`container`, `ci`,
  `terraform`, `kubernetes`, `migration`, `serverless`). These are real architecture: claim
  them from a node (an "Infrastructure" or "Deployment" component is usually right) rather
  than leaving them unclaimed. They sit outside the analysed-percentage denominator, so
  they never inflate or deflate coverage.
- `stats`, `zeroInDegreeSamples`, `skippedExtensions` — honesty signals.
  `importsUnresolved` counts imports that point **inside** this repo but did not resolve
  (edges genuinely missed — worth filling from file reads); `externalImports` counts
  imports that leave it (third-party packages — not a gap, and the evidence behind
  external-system nodes). The two are kept apart deliberately: an unresolved internal
  import is never laundered into "external". `zeroInDegree` lists dead-file candidates
  (entry points legitimately appear there); `skippedExtensions` names stacks outside the
  denominator (`(none)` counts extensionless files).
- `stats.parsePartialFiles` / `parseFailedFiles` / `unreadableFiles` — **parse health**
  (name lists, capped at 20 each). A partial file's facts come from the healthy regions
  only; a failed or unreadable file contributed none. **Read those files with suspicion** —
  if one of them lands in an area you are classifying, open it yourself rather than
  trusting its (missing) imports, and treat a node built on them as unconfirmed until you
  have. `/status` renders the full funnel over these; the board report names the ones
  **this board claims**.

**Pull detail only for the area you're actively deciding on** — never the whole skeleton:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-prepass.js --detail <dir-or-glob>
```

It returns the area's **index rows** — `nodes[]`, each with `path`, `slug`, `name`,
`language`, `claims` (best-evidenced first), `headlineRole`, `archetype` (when the role map
resolves it — Step 0) and `verify` (`single-basis` | `conflict` | `unclaimed`; absent when
the evidence is strong) — plus `edgeSummary[]` per node (`in`, `out`, `topTargets`,
`hubTargets`). **There is no raw edge list**: `--rollup` reads the index itself and you
never hand-map edges. The `display` groups rows by directory with the `verify` rows first —
those are the files that need a read.

**Claims are hints, not facts** (0.76–0.85 precise by basis on the labelled corpus), and the
script says which to verify: no `verify` → adopt the headline role / archetype as the
default typing and read the file only for what you'd read it for anyway (description,
semantic edges); `single-basis` → at component/detail grain (node ≈ file) read the file head
before typing, at system/context grain the container's type is yours and no per-file read is
owed; `conflict` → read and decide, and say which claim lost in the node's rationale;
`unclaimed` → read — this is where your judgment is the job.

A slice is capped at 500 files and says so via `truncated` — narrow the pattern rather than
assuming you saw everything.

**Plan first, then slice.** Request a `--detail` slice ONLY for a cluster you are **inlining
on this board**. A cluster Step 4.6's plan marks `drill-down` — or that you decide to drill
down — stays **opaque**: no detail slice, no per-file reading at this layer. Seed that
node's name and description from the plan's cluster evidence and member list; the child
board reads those files once, at the layer where they are the subject.

Add `--skeleton .provenmap/skeletons/<board-slug>.json` to either mode to digest or slice a
drill-down board's own skeleton instead of the repo-wide one.

**Use the skeleton in Steps 5–6:**

- Treat the digest's directory rollup (plus any `--detail` slices) as the ground-truth file
  inventory — do NOT re-glob or re-apply exclusion rules (already applied), and do NOT read
  the skeleton JSON whole.
- Treat the skeleton's edges as the authoritative `imports` edges for **every supported
  language** (JS/TS, Python, Go, Java, Ruby, Rust, C#) — do NOT re-parse imports by hand in
  any of them. The digest's `stats.importEdgesByLanguage` shows what each stack
  contributed; a language with files but no edges there is the only case worth a manual
  look.
- The skeleton is **file-granular** (the digest rolls it up for you). At **L2/L3** one node per **significant** file — slice with `--detail` to name them.
  A row marked `minor` is **never its own node and never waived**: a one-host minor is
  claimed in the `coveredFiles` of the node that covers its `fold into` host (the script
  names it); a shared minor — or one whose host is outside this board or a cycle — goes
  to the node that owns its directory; a directory of nothing but minors is one leaf node
  named for it (`auth-utilities`), not a container of tiny children. `--claim-check`
  prints the exact `coveredFiles` edit per unclaimed minor; keep a minor as a node only
  with a stated reason (the board report warns). At **L0/L1**, **aggregate** directories
  into coarse domain/component nodes (each node's `coveredFiles` claims its files); edge
  rollup is Step 6's script (`--rollup … --apply`) — do not map `imports` edges by hand.
- **Persist the mapping — coverage provenance.** The file aggregation you just made IS the
  coverage relation; record it on every node as `coveredFiles`. The claiming rules — claim
  by directory, the partition (claimed / waived / deliberately pending), the 30-file
  broad-claim limit and the drill-down exemption — are the codebase-analysis `SKILL.md`
  §Coverage Provenance; follow them there. **Don't hand-verify the partition — Step 5.5's
  `--claim-check` does it.**
- The prepass does NOT group the database layer, write descriptions, or detect non-import
  edges — those remain your job in Steps 5–6. It DOES type files: the index's
  `headlineRole` and its mapped `archetype` are your default typing — weigh them, and
  override with a stated reason when your reading says otherwise.

Run this on every analysis (full and incremental); it is deterministic and fast, and always
reflects current HEAD.

## Step 4.6: Grouping plan (what belongs inside what)

The directory tree is where files sit, not how they relate. Run the grouping plan to get
candidate groups computed from the **coupling graph**, with the evidence for each:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-prepass.js --group-plan
# drill-down board — scope it, budget it for its own layer, and seed from the board that already exists:
node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-prepass.js --group-plan --scope-path <parent-node-path> --layer <this board's layer> \
  --skeleton .provenmap/skeletons/<board-slug>.json --against .provenmap/boards/<board-slug>.json
```

For the **L0 board**, run `--group-plan --layer 0`: it rolls the file-granular clusters up
to workspace / top-level-directory granularity, which is the granularity the L0 board
actually uses (Step 5 targets 10–30 nodes). A monorepo rolls up to its declared workspaces;
a single-package repo rolls up to its **top-level directories** instead (the plan names the
grain it used). Without it the plan proposes dozens of candidate groups you would only
re-aggregate by hand. It rolls up candidate *groups* only — root-level elements stay
file-granular, so their count is not reduced by `--layer 0` (the display's row cap keeps
them readable regardless).

**Always pass `--layer <this board's layer>`** — it is what makes the plan plan against a
budget instead of merely clustering. From `--layer 1` up, the plan carries
`predictedNodeCount` (**significant** clustered candidates **plus** board-root candidates —
`minor` rows are not counted; the Budget line says how many were left out), `layerBand`
(that layer's node band) and `budgetVerdict` (`fits` | `over-band` | `under-band`), and the
display leads with
`Budget: <clustered> clustered + <root> board-root = <total> node(s) predicted vs band <lo>–<hi> — <verdict>`.
When the scope has minors the line ends `· N minor file(s) not counted (M folded into hosts, K shared)`.
**Read the verdict BEFORE you author a node:** `over-band` means drill-downs are planned
now, not discovered after the board is written, and it is where this board's grain is
decided (Step 5). `--layer 0` is the re-grain described above and deliberately reports
**no** band (`layerBand: null`, `budgetVerdict: null`): the L0 budget is Step 5's 10-30
target, judged by you.

Print its `display` verbatim. The `display` is capped (default 25 rows per section) and
names how many rows it dropped; the complete plan is written to `.provenmap/group-plan.json`.
Read that file only if a capped section is the one you need — never print it.

**Branch on `evidence` before you use anything else in the plan** — it is the JSON's
`evidence` field and the display's first content line, and it says what produced these
groups:

- **`"coupling"`** (the normal case) — the clusters came from the import graph. Work them
  as proposals: refine, rename, override with a stated reason. The cluster fields, verdicts
  (`container` / `drill-down` / `dissolve`), `subClusters`/escalations, `parents[]` and
  `roles[]` are documented in `references/layer-strategy.md` → "What decides the grouping"
  — work from them there.
- **`"directory-fallback"`** — resolved-edge density was below the sparse-evidence floor,
  so **edge evidence was sparse and this partition is structural, not coupling-derived**.
  Say so to the user in one line, then: verify each proposed group against an actual
  reading of the code, and **do not invent coupling** — never write a `Grouping rationale:`
  or an edge that claims a relationship the topology never showed you. `cohesion`/`density`
  come back `null` here (`—` in the display) because nothing measured them, and every group
  comes back `verdict: "container"` regardless of size — this path has no size demotion —
  so **judge drill-down yourself for an oversized bucket**: a directory holding dozens of
  files is a child board, not one flat container.

**Stamp what you used.** When you write the board (Step 5), copy this plan's `evidence`
value verbatim into the board's `metadata.groupingEvidence` (`"coupling"` or
`"directory-fallback"` — those two values only). It is local-only, never pushed, and the
board report reads it so the user can see what the containment rests on.

**An evidence FLIP on a board that already synced is a decision, not a detail.** If this
board's previous `metadata.groupingEvidence` differs from the plan's (coupling ↔
directory-fallback), regrouping will churn slugs and containment — real changes on the
wire, not a re-render. Say which way it flipped and ask via **AskUserQuestion** before
applying the new plan (header: `Regroup`; options: **Apply the new grouping** /
**Keep the current grouping**). Never auto-apply a flip. In `--auto` mode, keep the current
grouping and note the flip in the round's status line.

## Step 5: Component Discovery

**State this board's grain first — from its own plan, not from its depth number.** The
grain rules (container-grade vs terminal, the banded-plan scope, escalated clusters,
`predictedNodeCount` semantics) are `references/layer-strategy.md` → "Board Grain" — apply
them, then append the choice to the board's `metadata.description` in one sentence —
container-grade with N drill-downs, or terminal. This field ships to the platform as the
board's user-visible description — append to it, don't replace the project context already
there. Project-level context belongs in `metadata.description`, never in a wrapper node —
the board itself is the implicit root container (board-root rules:
`references/layer-strategy.md` → "Board Root and Domain Grouping").

**For L0** — build a C4 System Context, not an inventory: the two-ring construction
(deployables at the center, externally-evidenced systems around them), the external-evidence
sources, the lean-and-flat shape and the drill-down-by-default arithmetic are
`references/layer-strategy.md` → "Building the L0 System Context". A container whose child
board has taken over ALL of its claims may set `coveredFiles: []` explicitly — never invent
a placeholder claim just to satisfy the field.

**For L1+ (Drill-down):** Scope analysis to the files/directories covered by the parent
node. L1 shows that deployable's **containers** (its apps, services, stores, workers); L2
the **components** inside one container; L3 the internals of one component.

**Container vs. drill-down (all layers):** Nodes with `layerBoardSlug` must NOT be
`domain_group` containers with visible children. Their internals belong on the child board.
Use `domain_group` containers only for grouping nodes that won't drill down.

**Grouping comes from Step 4.6's plan, not from node count or folder names.** Each
`domain_group` you create should trace to a cluster with `verdict: "container"`, each
nested container to a `parents[]` entry, and each top-level node either to a `root-level`
role or to a stated reason of your own. The grouping floor and ceiling (both
drill-down-exempt), and root hygiene for loose leaves, are
`references/layer-strategy.md` → "Grouping floor and ceiling" — `--board-report`,
`--validate` and `/sync` all enforce the floor (exit 3); the ceiling warns via Step 8.3's
advisories. The `canContain` note in `references/archetype-rules.md` says why archetype
nesting hints never override these choices.

**Incremental:** Only read and analyze the changed/added files from Step 1.5. Keep existing
nodes from unchanged files as-is. For deleted files, mark their nodes for removal.

Apply these rules (start from the skeleton's `nodes[]` — file discovery and exclusion are
already done):

- **Exclude non-architectural files**: already applied in the skeleton (`*.d.ts`,
  types/dto, tests, mocks) — and the barrel and `config`/`constants`/`enums` calls are made
  **by content, not by filename**, so trust them rather than second-guessing a name: an
  `index.*` barrel is excluded only when it genuinely re-exports and declares nothing of
  its own (a barrel that also declares real code IS a node), and
  `config.ts`/`constants.ts`/`enums.ts` are excluded only when they declare no functions or
  classes (a provider-registering `config.ts` IS a node). Only re-check files you discover
  outside the skeleton.
- **Agent-native artifacts are components, not docs**: skeleton nodes with `artifact.kind`
  (skills/commands/agents) are first-class architecture — group them like any other
  component family (e.g. a commands group, a knowledge/skills group, per plugin or domain),
  seed their `description` from `artifact.description`, and classify them with a fitting
  server archetype. If the catalogue has no fit for prompt-ware kinds, that is an archetype
  **gap** (e.g. a missing `agent_command`/`agent_skill`): use the closest existing
  archetype, record the gap in `metadata.archetypeGaps` so the closing report can name it,
  and never silently waive artifacts. Fields per gap entry — `name` (the missing
  archetype), `usedInstead` (the closest fit you applied), `exampleNodeSlugs` (array of
  node slugs; `[]` allowed). Exactly those keys: Step 8.3's gate rejects any other shape.
- **Group database files**: into a single `database-layer` container node at L0/L1 — the
  skeleton lists these as individual files, so you group them.
- **Apply the grouping plan**: Step 4.6's clusters, parents and root-level roles are the
  containment proposal — name the groups, override with a stated reason, do not re-derive
  boundaries from folder names
- **Type by archetype**: the index's `headlineRole` → `archetype` (from `--detail`) is the
  default, in server archetype names; read first wherever `verify` is set; override with a
  stated reason when your reading says otherwise.
- **Generate slugs**: use the skeleton's suggested `slug` as a starting point; refine from
  the primary class/export name

**Finish Step 5 by writing the board JSON now** — `.provenmap/boards/<board-slug>.json`
with the metadata (including `metadata.groupingEvidence`, copied from Step 4.6's plan), the
nodes (each with `coveredFiles`), and `"edges": []`. Step 6's rollup script reads and
rewrites this file; edges come next.

## Step 5.5: Claim check (script-owned)

Verify the `coveredFiles` partition before going further. **Never hand-audit it, and never
write a throwaway script to do it** — this is that script:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-prepass.js --claim-check .provenmap/boards/<board-slug>.json
```

Add `--skeleton .provenmap/skeletons/<board-slug>.json` for an L1+ board (the default is
the repo skeleton). It takes any path, so a draft written elsewhere can be checked before
it lands.

Print the `display` field **verbatim**. Then:

| exit | meaning                        | action                                                                                                                                                                                                                                                                                                    |
| ---- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0    | No file is claimed twice       | Continue to Step 6. The display may still list broad claims (30+ files) and unclaimed files — both are **debt, not failure**. Fix them when your judgment says so: a broad claim wants `layerBoardSlug` (no file limit) or a split; an unclaimed file wants a claim, a waiver, or a deliberate decision to leave it pending. |
| 3    | A file is claimed by two nodes | Fix it and re-run this step. Decide which node owns the file and narrow the other's globs. This is the one hard defect: `coveredFiles` is a partition, and nothing downstream can repair an overlap.                                                                                                        |
| 1    | Board JSON or skeleton missing | Print `error` verbatim; re-run Step 4.5 for the skeleton, or Step 5 for the board.                                                                                                                                                                                                                          |

`emptyClaimNodes` in the output names nodes whose `coveredFiles` matched nothing — a typo or
an out-of-scope path. Fix those even at exit 0: the node looks analysed while its files sit
pending.

## Step 6: Relationship Detection

- **Rolled-up edges (script-owned, script-merged):** run the deterministic rollup with
  `--apply` — it maps the skeleton's file-level `imports` and `references` edges onto your
  Step 5 nodes, drops self-loops and containment pairs, dedupes with an import-count
  weight, leaves platform-hub edges out of the board, **and writes the result into the
  board JSON itself**:

  ```bash
  node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-prepass.js --rollup <board-slug> --apply
  ```

  For a drill-down (scoped) board, pass `--skeleton .provenmap/skeletons/<board-slug>.json`
  so the rollup uses the scoped skeleton Step 4.5 wrote for this board, not the repo-wide
  one; L0 uses the default repo skeleton (no flag needed).

  **You never hand-merge edges.** The script replaces the board's rollup-owned edges
  wholesale, preserves your model-owned ones untouched, and re-runs the board integrity
  gates before writing — so it is safe to re-run at any time and running it twice is a
  no-op. Print the returned `display` verbatim (it ends with the merge summary: edges
  replaced, model-owned edges preserved, fresh edges deduped, hub targets left suppressed).
  Branch on the exit:

  | exit | meaning                                                                 | action                                                                                                                  |
  | ---- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
  | 0    | Merged and written                                                      | Continue. `.provenmap/skeletons/<board-slug>.edges.json` is a diagnostic copy — do not merge it by hand.                 |
  | 3    | The merged board would fail an integrity gate — **nothing was written** | Print `error` verbatim, fix the board named by `boardPath` (the `gate.errors[]` say what), and re-run this step.         |
  | 1    | Board JSON or skeleton missing                                          | Print `error` verbatim; re-run Step 5 for the board, or Step 4.5 for the skeleton.                                       |

  **The script rewrote the board file** — re-read `.provenmap/boards/<board-slug>.json`
  before any further edit, and never write back a copy you were holding from before the
  apply (that silently drops every edge it just merged).

  For each `report.suppressedHubs` entry, stamp that node with
  `metadata.hubInDegree = distinctSources` — the fact survives without N identical edges
  (nodes are yours; `--apply` only ever touches `edges`). Do NOT hand-map skeleton edges
  yourself; the script owns those rules, and it resolves imports for every supported
  language — never re-parse them by hand.

- **Reclassify where you know better — and take ownership when you do.** The rollup can
  only ever say `uses`. Where reading the involved files shows the real relation, change
  the edge's `type` **and delete its `metadata.weight`** — a weighted edge is rollup-owned
  and the next `--apply` would replace it, silently reverting your type. The next `--apply`
  then also regenerates a weighted `uses` twin for that pair: that is expected and
  legitimate — leave it alone, never re-type it again, and never keep two edges of the
  **same** type between one pair. The full edge-ownership model and the semantic edge
  types (`db_read`/`db_write`, `api_call`, `uses`, `publishes`/`subscribes`, cross-language
  calls) are the codebase-analysis `SKILL.md` → "Import/Dependency Analysis".

- **Semantic edges (read the relevant files):** the skeleton does not detect these — derive
  them by reading the files of the nodes involved. **Fan this out when the board has 3+
  domain groups.** Dispatch one `relationship-detector` agent (Task tool) per domain group,
  **all in a single message** so they run concurrently — cap the batch at 4; with fewer
  than 3 groups just do it inline. Give each agent its group's node slugs +
  `coveredFiles`, the full board node list (so it can name targets outside its group), and
  the edge archetype names. The agents are **read-only** — they return candidate edges as
  JSON in their reply and write nothing, so there is no file-boundary risk. You merge: add
  each candidate as a **model-owned** edge (no `metadata.weight` — never copy a weight
  onto one), drop a candidate only when an edge of the **same** source+target+type already
  exists, leave the rollup's weighted `uses` edge for that pair in place, apply the
  board-scope rule, and record off-board relations in `metadata.deferredEdges[]` rather
  than dropping them.

- **Cross-board relations:** when a real dependency's other end lives on a different board,
  append it to the board metadata's `deferredEdges[]`
  (`{ sourceSlug, targetHint, type, targetBoardSlug?, description? }`) instead of
  discarding it. These stay local — `/sync` never pushes them — and the coverage dashboard
  counts them so inter-domain structure stays visible.

  The rollup only maps literal-path `references` (an artifact naming another skeleton file
  by path). Add further artifact relationships you find by reading bodies yourself — e.g. a
  command that says "load the X skill" without a path.

Scope all edges to this board's nodes only.

**Incremental (edge provenance — the frozen rule both you and the script obey):** edges
carrying `metadata.weight` are **rollup-owned**; edges without one are **model-owned**. On
an incremental pass just re-run `--rollup <board-slug> --apply`: it discards every
rollup-owned edge and regenerates them from the current skeleton, and preserves the
model-owned ones byte-for-byte. Nothing to delete by hand, and nothing to re-apply — your
reclassified types survive precisely because you dropped their weights when you made them.
Drop a model-owned edge yourself only when an endpoint node was removed.

## Step 7: Identify Drill-Down Candidates

For nodes that represent significant subsystems (domains, services with many internal
components), mark them as drill-down candidates:

- Set `layerBoardSlug` on the node — resolve using the server board map from Step 0.5:
  server board slug if a child board already exists for this parent board + node slug, else
  generate locally (`<parent-slug>--<node-slug>`; created on the server during `/sync`).
  Slug format details: `references/layer-strategy.md` → "Board Slug Resolution".
- Add the node slug to the `drillDownNodes` array

This tells the user which nodes can be expanded into child boards.

**Validate mutual exclusion:** No drill-down candidate node should have other nodes
referencing it via `parentSlug`. If a node was initially created as a container with
children but is now marked for drill-down, promote its children to board root level or move
them under a different container — the children belong on the drill-down board, not on this
board.

## Step 8: Output Generation

Write analysis results to `.provenmap/boards/<board-slug>.json`.

**Incremental:** Merge new/changed nodes into existing board data. Replace nodes whose
`coveredFiles` contain a changed file. Remove nodes whose covered files were all deleted.
Remove edges referencing removed nodes (rollup-owned edges — those with `metadata.weight` —
were already regenerated by Step 6's `--rollup --apply`).

Always record the current git commit hash via `git rev-parse HEAD` as `analyzedAtCommit`,
and carry the `groupingEvidence` you stamped in Step 5. Stamp `analyzedBy` truthfully:
`{ "mode": "orchestrator-inline" }` when you write the board yourself in this conversation;
dispatched agents stamp `{ "mode": "agent", "model": "…" }` per their prompt (Step 8.7).
Never carry a previous run's `analyzedBy` forward. Every node carries `coveredFiles` and
the metadata carries `waivedFiles` (from Step 4.5):

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

Full node/edge field requirements (`detailedDescription` et al.) are the codebase-analysis
`SKILL.md` → "Output Format".

## Step 8.3: Board report + gate (immediately after the JSON is written)

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-prepass.js --board-report <board-slug>
```

Run this the moment Step 8 writes the board JSON — **before** styling, coverage or any
user-facing offer. Branch on the result:

- `gate.valid: true` → continue to Step 8.4. This display is not what gets printed — the
  ledger is still stale here (Step 8.5 hasn't run yet); the closing report re-runs this
  same command after coverage refreshes and prints that display instead.
- `gate.valid: false` (exit 3) → **stop the pipeline for this board.** Print the
  `errors[]` verbatim, fix the board JSON, and re-run this step until it passes. Never
  style, coverage-refresh, write the manifest, or offer next steps for a board that has not
  passed its gate — that work is discarded when the gate finally runs.

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
  inline-children one (`A-CONTAINER-CEILING`). The report then lists the recorded override
  and the count drops. `A-CONTAINER-DENSITY` (a container whose children form a dense
  internal subgraph) has **no** override — the marker does nothing for it; a
  `layerBoardSlug` drill-down is the only fix. `gateOverrides` is local-only — it is never
  pushed.

The JSON's `typing` block (and the `🎯 Typing:` line) lists comparable nodes whose type
differs from their files' mapped archetype. It is a signal, not an advisory — it never
blocks: for each named node either adopt the mapped archetype or keep your type and say why
in the node description's rationale. A role you keep overriding is a map entry to re-pin
(Step 0).

For a fanned-out drill-down this step is the agent's own (Step 8.7 already requires each
agent to report its board's gate status and unresolved-advisory count); the orchestrator
runs it here for the board it writes directly.

## Step 8.4: Author the styling plan

After writing the board JSON, style it (methodology:
`${CLAUDE_PLUGIN_ROOT}/knowledge/board-styling/SKILL.md` — read it if not already read):

1. `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-prepass.js --style-signals <board-slug>` — print
   `display` verbatim, note `signalsPath`.
2. Author the styling plan from the signals and write it to
   `.provenmap/styling/<board-slug>.plan.json`.
3. `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-prepass.js --validate-styles --file
.provenmap/styling/<board-slug>.plan.json --against <signalsPath>` — exit 3 → fix and
   re-validate, **max 2 rounds**; still failing → delete the plan file, continue unstyled,
   and note `Styling skipped — run /restyle <board-slug> later.`

The plan is applied automatically by `/sync` after this board's push — no apply step here.
This step runs in every mode, including `--auto`. Styling never blocks the analysis.

## Step 8.5: Refresh Coverage Ledger + show the dashboard

After writing the board JSON, refresh the deterministic coverage ledger so `/status`, the
next incremental run, and `/sync` (which reports coverage to the platform) all see current
numbers:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-prepass.js --coverage
```

Print the returned `display` markdown verbatim (it carries the progress bar, the delta
since the previous run, and the ranked "Where to go next" list). If the script fails, note
it and continue — coverage is reporting, never a gate (and skip Step 8.6).

## Step 8.6: Offer the next area (interactive loop)

The Step 8.5 JSON also carries `recommendations` — the deterministic next-step list,
ranked: stale boards → drill-downs → pending areas → broad claims → relationship gaps →
regroupings → unknown-coverage boards. The script owns those facts; **you own the
coordination** — spend judgment connecting them to this session. Which area to analyse next
is a genuine user decision:

0. **`--auto` mode: no question, no 8.5/8.6 loop.** The Unattended loop replaces both
   steps — `pmap-prepass.js --auto-plan` plans each round (its `parallel[]` = the Step 8.7
   batch, `sequential[]` = step 4 mechanics below) and owns termination via
   `done`/`stalled`. See "Unattended: Full Automation".
1. If `recommendations` is empty: skip to Step 9.
2. **Give your read first** (1–3 sentences of judgment, after the verbatim dashboard):
   connect the recommendations to what you know — which stale node maps to the files just
   edited, whether a pending area looks load-bearing or like glue, what the user has been
   working on. Never restate or recompute the script's numbers.
3. Ask with **AskUserQuestion** — header `Next area`; question:
   `Coverage is at <percent>%. Analyse another area now, or sync what you have?` Set
   `multiSelect: true` whenever the shown options include two or more `drill-down`
   recommendations — selected drill-downs are built **in parallel** by Step 8.7; otherwise
   single-select. Options, in order:
   - The first 3 `recommendations`: label from `label` (append "(Recommended)" to the
     first), description from `detail` — you may append a short session-informed rationale
     to a description, and you may reorder these three when session context clearly changes
     the priority (say why in the description).
   - **Triage swap:** if an area's pending files are plainly non-architectural (generated
     code, fixtures, one-off scripts), replace the third slot with **Waive
     non-architectural files** — on selection, propose the exact `coverage.ignore` globs
     via AskUserQuestion (user adjusts via Other), append the confirmed globs to
     `coverage.ignore` in `.provenmap/config.json`, re-run `pmap-prepass.js --coverage`,
     print the new `display` verbatim, and re-ask.
   - Always last: **Sync what I have** — description: "Stop analysing; push the boards +
     this coverage snapshot to the platform."
4. If the user picks a single recommendation, run another incremental pass scoped to it,
   then **return to Step 8.5** (refresh, dashboard, ask again — the loop ends when the user
   syncs or nothing is left). A choice is consumed the moment its area completes: an area
   the user asked for earlier — typed or selected — never substitutes for asking again on
   the next pass, and "the user already chose" is not a reason to skip the question. If the
   user selected **multiple** areas, go to Step 8.7
   instead — it owns the batch and returns to Step 8.5 itself. Per-kind mechanics:
   - `stale-board` → re-analyze that board's `staleNodes[].changedFiles` (Steps 5–8 scoped
     to those files)
   - `drill-down` → build (or re-run) the child board: the `--drill <boardSlug>/<nodeSlug>`
     flow for the recommendation's node — this is what converts _mapped_ files into
     _analysed_ ones
   - `pending-area` → analyze the pending files under its `path` (take them from the
     ledger's `pendingFiles`; if `pendingTotal` exceeds the listed files, get the complete
     list from `pmap-prepass.js --claim-check <board.json> --list-all` — **never**
     hand-derive it from `.provenmap/skeletons/repo.json`, which you must not read whole)
     and place the resulting nodes on the board that owns that scope (L0, or the matching
     drill-down board)
   - `broad-claim` → the node claims 30+ files with no drill-down. Prefer setting
     `layerBoardSlug` on it (no file limit, defers the detail honestly); split it into
     nodes under 30 files only when it genuinely holds two concerns
   - `edge-gap` → relationships the import graph justifies are missing from that board:
     re-run Step 6's `--rollup <slug> --apply` for it (the script does the merge; the usual
     cause is an older run whose rollup output was never merged), then reclassify types as
     Step 6 describes
   - `regroup` → that board's containment has drifted from its edges: re-run Step 4.6's
     `--group-plan` for it with `--against .provenmap/boards/<slug>.json`, walk the
     proposed moves, and re-parent only what the plan justifies and you agree with.
     Re-parenting is a real change on the wire — never apply the moves wholesale, and leave
     anything whose grouping is deliberate (say so in its description with
     `Grouping rationale:`). If the plan's `evidence` differs from the board's
     `metadata.groupingEvidence`, this is Step 4.6's flip case — ask first, and re-stamp
     the field if the user applies it
   - `unknown-board` → re-run that board with the `--clean` behaviour (delete its JSON +
     store, full re-analysis)
5. If the user picks **Sync what I have**: proceed to Step 9 and end the final report with:
   `Run /sync to push the boards and this coverage snapshot.` If it was selected alongside
   other areas, build those areas first, then end the loop with the same sentence.

## Step 8.7: Parallel layer fan-out (multiple selections)

Multiple selected areas are built by subagents running concurrently, each analysing its
layer in its own context. The real constraint is that **no two concurrent agents may write
the same board file** — not "only drill-downs may parallelise". Split the selections
accordingly:

- **Always parallel:** `drill-down` selections — each targets a distinct child board slug
  and writes only that board's own files (`boards/<slug>.json`, `skeletons/<slug>.json` +
  `<slug>.edges.json`). Siblings sharing a parent are safe because you stamp every
  `layerBoardSlug` before dispatch (step 1 below).
- **Parallel when their board is free:** `stale-board`, `edge-gap`, `regroup`, and
  `unknown-board` selections whose target board is **not** one of this round's drill-down
  parents and is not targeted by another selection — dispatch each as an
  **incremental-refresh mode** agent (pass the ledger worklist: that board's
  `staleNodes[].changedFiles`, in-scope `pendingFiles[]`, `orphanedFiles[]`).
  `unknown-board` passes the `--clean` behaviour instead of a worklist.
- **Always sequential:** `pending-area` (where its nodes land is a placement decision, not
  a board rewrite), `broad-claim` (a judgment call), and anything whose board is already
  claimed above. Run these inline (step 4 mechanics), one at a time, **after** the parallel
  batch has joined.

In `--auto` mode you do not make this split yourself — `pmap-prepass.js --auto-plan`
already applies exactly these rules and hands you `parallel[]` and `sequential[]`.

**Before fan-out — the orchestrator owns all shared state; subagents never touch it:**

1. For each selected drill-down, resolve the child board slug (Step 7 rules: server board
   map first, else `<parent-slug>--<node-slug>`) and, if the parent node doesn't carry it
   yet, stamp `layerBoardSlug` on the parent node in the parent board JSON **now** — every
   parent-board edit happens here, before any agent starts.
2. Launch one `architecture-analyzer` agent (Task tool) per selected board, **all in a
   single message** so they run concurrently. Each dispatch prompt must be self-contained
   (agents share nothing). For a drill-down, state that it is **layer-board mode** and pass
   the child board slug + display name, target layer, `parentBoardSlug`/`parentNodeSlug`,
   the parent node's scope path and `coveredFiles`, the Step 0 node/edge archetype name
   lists, and whether the child board already exists on the server (Step 0.5 map). For a
   board refresh, state that it is **incremental-refresh mode** and pass the board slug
   plus its ledger worklist (`staleNodes[].changedFiles`, in-scope `pendingFiles[]`,
   `orphanedFiles[]`) and the same archetype lists. Either way the agent runs its own
   prepass, group plan (`--group-plan --layer <target layer>`), rollup, and board report —
   do not pre-run them. Every dispatch prompt states both react moments: read
   `budgetVerdict` **before** authoring and state the board's grain (Step 5), and drive
   `unresolvedAdvisories` to zero **after** authoring by restructuring or recording a
   rationale (Step 8.3).
3. **Model per agent:** if `.provenmap/config.json` has `analysis.subagentModel`, pass it
   as the model for every dispatched agent; otherwise dispatch L1 boards with the session
   model (inherit) and, where the host supports a per-agent model override, L2/L3 boards
   with a faster model. If the host supports neither model overrides nor parallel agent
   launch, dispatch the same prompts sequentially with defaults — the flow is otherwise
   identical.
4. **Builder stamp:** every dispatch prompt must tell the agent to stamp
   `metadata.analyzedBy: { "mode": "agent", "model": "<the model you passed, or 'session-inherit'>" }`
   in the board JSON it writes. This is how `/status` and the board report answer "was a
   subagent used, with what model" — the deterministic dispatch log (a PostToolUse hook)
   records the dispatch itself, and the stamp attributes it per board.

**Join — after ALL agents return:**

1. Each agent reports its board's grain (container-grade with N drill-downs, or terminal),
   gate status, and unresolved-advisory count (all from its own `--board-report`). For a
   board whose gate failed, whose advisories are still unresolved, or whose agent died,
   tell the user which board and why, and offer to re-run just that board — the other
   boards' results stand.
2. Run the sequential selections now, if any.
3. Update the manifest (Step 9) with an entry for **every** board written this batch — the
   orchestrator is the only writer of `manifest.json`.
4. Run Step 8.5 **once** — a single coverage refresh whose ▲/▼ delta shows the combined
   effect of the whole batch — then continue the Step 8.6 loop.

Subagents must never write `manifest.json` or a board other than their own, and never run
`pmap-prepass.js --coverage` — coverage is derived state the orchestrator recomputes once
at the join — and never rebuild the repo index: a subagent's `--scope-path … --digest` is a
slice of it. Reading modes (`--digest`, `--detail`) read the existing index and never
walk — only `--coverage` (and `--auto-plan`) rebuild it.

## Step 9: Update Manifest

Update `.provenmap/boards/manifest.json` with the new/updated board entry. The manifest
must conform to this exact structure:

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

When rewriting a board JSON, never carry forward `metadata.origin`, `metadata.mirroredAt`,
`metadata.mirroredFromBinding`, or a node's `metadata.mirrored` — those mark un-analysed
server mirrors, and the prepass/sync gates refuse them. A mirror's `layer` is never carried
forward either: the bound board is re-stamped `layer: 0` (layering is binding-relative —
Step 1), and only genuine drill-down child boards of this binding carry `layer` ≥ 1.

**CRITICAL:** The board display name field is `name` (NOT `boardName`). The
`--ensure-boards` CLI reads `name` to create missing child boards on the server — using
`boardName` will cause board creation to fail with an empty name.

## Closing report (Output Format)

The report is **script-rendered — never hand-assemble counts into prose.** After Step 9,
for each board written this run: Re-run the board report now, after Step 8.5 has refreshed
the coverage ledger:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-prepass.js --board-report <board-slug>
```

Print the returned `display` **verbatim** (nodes-by-archetype bars, edges by type,
per-board file accounting with the analysed percentage, the parse-health line naming this
board's claimed files that parsed partially or not at all, the grouping-evidence line when
the containment came from the directory fallback, hub nodes, isolated nodes, drill-down
candidates, board file path). This re-run is a **pure re-render for display** — its only
purpose is to pick up the ledger Step 8.5 just refreshed, so the per-board file-accounting
line shows real numbers instead of the "ledger not refreshed" line the Step 8.3 display
would still be carrying. The gate itself was already evaluated and passed at Step 8.3 and
is **not** re-evaluated here: a non-zero exit at this point is a
reporting problem (fix and retry), never treat it as a gate failure.

**Gate errors block — already handled at Step 8.3.** Step 8.3 stopped the pipeline for any
board whose `gate.valid` was `false`; a board only reaches this section after its gate
passed. `gate.warnings` do not block — print them and continue.

Then add ONLY what the script cannot know:

- **Structure health, first among your own additions — before you say anything about a
  percentage.** (The script-rendered blocks above are still printed verbatim, unmodified
  and unreordered — this governs your own narration around them, never the blocks
  themselves.) One line per board written this run: its grain (container-grade with N
  drill-downs planned, or terminal), whether the group plan's `budgetVerdict` was met, and
  that every advisory is resolved or overridden — naming the rationale where you recorded
  one. Files mapped behind a **planned** drill-down are planned depth, not debt: a board
  that plans its drill-downs reads lower on analysed-% than one that inlines everything
  flat, and it is the better board. The analysed percentage belongs in the dashboard below,
  never as this run's headline achievement.
- Analysis mode (incremental or full); if incremental, the changed/added/deleted files
  analysed
- Judgment calls worth flagging — max 5 bullets (rule deviations, split/merge decisions,
  why isolated nodes are genuinely isolated vs missed edges). The board report already
  **names** the shaky-parse files and the directory-fallback grouping — don't restate
  them; say only what you did about them (which one you read yourself, which node's typing
  is unconfirmed, which grouping you verified against the code)
- The **archetype gap note**, if and only if any board written this run has a non-empty
  `metadata.archetypeGaps` (Step 5 records it). One block, at most three named gaps, then
  stop:

  ```
  ⚑ <N> component(s) had no fit archetype — typed with the closest available:
    <name> → used `<usedInstead>` (<count> node(s): <slug>, <slug>)
    Run /analyze-archetypes to propose the missing archetypes. Optional — the board is complete as it stands.
  ```

  Print **nothing at all** when the array is empty or absent, which is the common case.
  Never turn this into a prompt, never offer to run `/analyze-archetypes` for the user
  here, and never present the board as incomplete because of it — the whole point of the
  note is that it costs the user nothing to ignore.

- The **final** Step 8.5 coverage dashboard, verbatim (if Step 8.6 looped, one dashboard —
  the last — not one per pass)
- Which next-area choices the user made, if any passes looped

Never restate numbers **in your own prose** that the board report or coverage dashboard
already shows — this scopes your commentary only; the board report and the final coverage
dashboard (bar included) are printed in full, verbatim, every run.
