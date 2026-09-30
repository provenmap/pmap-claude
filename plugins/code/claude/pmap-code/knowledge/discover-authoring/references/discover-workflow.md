# /discover — Steps 2–8

The command body carries the preflight, the feature check and Step 1 (the plan). This reference
is the contract for the rest: follow it clause by clause; improvise nothing. Every CLI `display`
prints verbatim. `<cli>` below is `${CLAUDE_PLUGIN_ROOT}/scripts/pmap-insights.js` for the Code plugin
and `${CLAUDE_PLUGIN_ROOT}/scripts/pmap-architect.js` for the Architect plugin. The
modes and their exit codes are identical; two spellings differ and are written out where they
occur: the Code CLI takes `--domain code` (and `--host claude` on a push)
and records an insight with `--save-insight`, the Architect CLI takes neither and records an
insight with `--push-insight`.

## Step 2 — Read (before suggesting anything)

The script ranked the graph by shape: how many depend on a part, how far a path runs, what it
crosses. It cannot see what the code does. Step 2 is where the run earns its keep: the user
should read the set and think "I didn't know that about my own code". A menu of counts is what
they get without it. Run this step on every run, `--auto` and headless included. Say one line
first ("Reading the code behind the N strongest candidates"), then work quietly until the curate
display.

**The shortlist** is Step 1's JSON `shortlist`: rows (insights first) with `id`, `family`, the
script's `question` and `why` lines, `star` (in the script's set), and the `anchor` the row is
about — its name, description, detail and `files`. `shows` lists the other elements the row
draws.

**Read.** Code plugin: open each row's anchor `files` (for a glob or a folder, the one or two
files that hold its main types or entry points), in parallel, one message per batch; open a
caller from `shows` when the anchor alone does not explain the dependency. About two files per
row, never more than 20 in all. No whole-repo search, no builds, nothing runs. Architect plugin
(rows carry no files): the row's description and detail are the evidence; read an element
further with the architect's read tools only when a row is too thin to judge. What to look for:
what the part actually holds and decides (state, a cache, a lock, a retry, a global, a schema,
a default), how its callers depend on it, and what happens when it fails or changes.

**Judge every row** — keep it, or set it aside:

- **Keep** a row when the code shows something a senior engineer on this team would not have
  said without looking: a consequence (every page shares one basket instance), a name that hides
  a role (a "utils" module every write path funnels through), a hidden coupling (two services
  meet in one table), an asymmetry (one entry path skips the validation the others run), a
  keystone (two callers, half the system behind them).
- **Set aside** test or example code the script missed, generated code, trivial wiring (a host
  that registers a footer), a path that says nothing beyond its length, and any row whose code
  contradicts its graph story (the "hub" is a type-only import). Give the reason in a few words.

**Write the curation** to Step 1's `curationFile` — one JSON object:

- `headline` (≤300) — one or two sentences: what this system is, then the most surprising true
  thing the read found. Specific nouns; no praise, no adjectives doing the work.
- `items[]` (≤12) — a row you kept: `id` (copied from the shortlist), `question` (≤200, ends
  with `?`) — the question the owner of this code would ask once they knew what you know; it
  names the thing ("Why does every Razor page share one `BasketState`?", not "Why does
  everything run through `basket-state`?"), `angle` (≤320) — the finding in one or two
  sentences: what the code does, then what follows, `evidence` — up to 3 `path:line` you read
  (Code: required on a pick, and every path must exist; Architect: may be empty), `pick: true`
  for the rows in the set.
- `setAside[]` — `{ id, reason }` (reason ≤160).

Picks: at most the set size per kind (Step 1's **Set** line); fewer is fine, the script tops the
set up from its own ranking, skipping every row set aside. Prefer a finding to a count, and
variety to repetition: different parts of the system, different shapes (a risk, a path worth
walking, a strength). The words follow `${CLAUDE_PLUGIN_ROOT}/knowledge/insight-writing/SKILL.md`: lead
with the finding, no tool vocabulary (node, edge, board, trail, fan-in…), no filler. An angle
states only what you read; the trail or drawn board of every row stays the script's.

Then run the curate mode:

```bash
# Code
node <cli> --curate <curationFile> [--board-slug <slug>] --domain code
# Architect
node <cli> --curate <curationFile> [--board <slug>]
```

Exit 0 → print `display` (what stands out, the set with its angles, what was set aside, then the
ranked tables). Exit 3 with `validationErrors[]` → fix the named fields in the file and retry
ONCE; still failing → run `--curate` with no file (the script's set) and say in one line that
the read could not land. Exit 1 → print `error`, stop (it names what to run).

## Step 3 — Frame

Skip this step entirely when the argument carries `--auto`, or when the session cannot show a
prompt (a headless, scheduled, Cowork or cloud run): take the set as curated and say so in one
line.

Otherwise ask ONE `AskUserQuestion`, single-select, **"What should I author?"**:

- **These N (Recommended)** — the description names the set's questions, shortest form, in order.
- **Pick from the menu** — the ranked tables above.
- **Refocus** — offered only when Step 1's `lenses` is non-empty and the argument carried no
  focus prompt or `--lens`; the description names the lenses in `lenses` with their families:
  reliability (cascades, chokepoints, blast radius), onboarding (journeys, entry points,
  neighbourhoods), ownership (owners, externals, data, boundaries).

On **Refocus**: one multi-select `AskUserQuestion` over the lenses in `lenses`, then re-run Step
1 with `--lens <a,b>` and Step 2 against the new shortlist (reuse what you already read; open
only new anchors), then ask this step again without **Refocus**.

## Step 4 — Pick

- **These N** (or skipped) → the selection is `recommended` — the curated set. The curate display
  already listed it; print nothing more.
- **Pick from the menu** → ONE `AskUserQuestion` with two multi-select questions, **Insights**
  and **Context boards**: the top four rows of each table, ★ rows first; each option's label is
  the row's question as the table shows it, its description the level, shape and evidence cell,
  and the option must name the row's `Id`. When a table has more than four rows, make the fourth
  option **More…**; on **More…**, re-ask that question with the next four. Zero picks in both →
  stop: "Nothing selected — run `/discover` again when you want to." The selection is the batch:
  the chosen ids, comma-separated.

## Step 5 — Briefs

```bash
# Code
node <cli> --briefs <ids|recommended> --rules ${CLAUDE_PLUGIN_ROOT}/knowledge/discover-authoring/references/authoring.md [--board-slug <slug>] [--plan <path>] --domain code
# Architect
node <cli> --briefs <ids|recommended> --rules ${CLAUDE_PLUGIN_ROOT}/knowledge/discover-authoring/references/authoring.md [--board <slug>] [--plan <path>]
```

Exit 1 → print `error`, stop (it names what to run). Exit 3 → print `error` (an unknown id), fix
the selection, retry once. On success print `display` — the wave table — and note the cleanup
line when present: the previous run's context boards go once this run's first push lands.

## Step 6 — Author

For each wave in the `waves` order, launch one `insight-author` agent per id **in a single
message** (the Task tool), then wait for the wave to finish before the next. Each dispatch prompt
is self-contained and says exactly this: the brief file path from the wave table; "read the brief,
then the `rules` file it names, then author"; "write exactly one file, at the brief's `output`
path"; "reply with one line". Agents share nothing and touch no network. The code plugin honours
`analysis.subagentModel` from `.provenmap/config.json` when the host allows a per-agent model;
otherwise the session model.

When the host cannot launch agents (no Task tool), do the same work yourself, one brief at a
time in wave order, reading the brief and its rules and writing the same output path — say so in
one line first. The result is identical, only slower.

After each wave, run Step 7 for that wave's outputs before launching the next, so a long run
lands results as it goes.

## Step 7 — Push, in order

For each output of the wave, in plan order:

- an **insight** brief's output — Code:
  `node <cli> --save-insight <output> --require-pack --push --host claude --domain code`; Architect:
  `node <cli> --push-insight <output> --require-pack --push [--board <slug>]`.
- a **context-board** brief's output — Code:
  `node <cli> --push-context-board <output> --require-pack --push --host claude --domain code`; Architect:
  `node <cli> --push-context-board <output> --require-pack --push [--board <slug>]`.
- `--board <slug>` on the Architect CLI names the subtree the plan was built for when it was not
  the whole tree; the pack it validates against is the one `--discover` cached for that root.
  The Code CLI reads that root from the run's ledger — never pass `--board-slug` on
  a push, and never build a pack for an insight's own board: a trail crosses boards, and only
  the run's pack holds all of them.

Exit 0 → print the one-line outcome (pushed, or `notAvailable` with its message). Exit 3 with
`validationErrors[]` → fix the listed fields in the output file yourself (copy any "did you mean"
value verbatim) and retry ONCE; still failing → leave it, say which item and why, continue with
the next. Exit 3 with `errorType: "auth_invalid"`, or exit 1 → the **connect-now offer** (Code) or the command's failure branch (Architect); on `complete` resume this push. Any `warnings[]` print once; never loop on a warning. A missing
output file (the agent replied `not written`) is skipped with its reason.

Push from THIS session, never from an agent: one paced writer.

## Step 8 — Report

```bash
node <cli> --report            # Architect
node <cli> --report --domain code   # Code
```

Print `display` verbatim. Then one closing sentence: how many landed, where to look (the
Insights Bar for the highlights batch, the hub's Context boards card for the boards), and that a
re-run replaces this run.
