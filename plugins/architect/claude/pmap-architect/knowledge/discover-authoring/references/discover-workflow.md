# /discover — Steps 2–7

The command body carries the preflight, the feature check and Step 1 (the plan). This reference
is the contract for the rest: follow it clause by clause; improvise nothing. Every CLI `display`
prints verbatim. `<cli>` below is `${CLAUDE_PLUGIN_ROOT}/scripts/pmap-insights.js` for the Code and
Connect plugins and `${CLAUDE_PLUGIN_ROOT}/scripts/pmap-architect.js` for the Architect plugin. The
modes and their exit codes are identical; two spellings differ and are written out where they
occur: the Code and Connect CLI takes `--domain architect` (and `--host claude` on a push)
and records an insight with `--save-insight`, the Architect CLI takes neither and records an
insight with `--push-insight`.

## Step 2 — Frame

Skip this step entirely when the argument carries `--auto`, or when the session cannot show a
prompt (a headless, scheduled, Cowork or cloud run): take **Choose for me** with the lens
`balanced` — or the `--lens` the argument carried — and say so in one line.

Otherwise ask ONE `AskUserQuestion` with two questions:

1. **"How should I pick?"** (single-select) — **Choose for me (Recommended)**: run the ★ set the
   plan marked · **Show me the menu**: pick from the two tables.
2. **"Weight any lens?"** (multi-select) — **Balanced** · **Reliability** (cascades,
   chokepoints, blast radius) · **Onboarding** (journeys, entry points, neighbourhoods) ·
   **Ownership and exposure** (owners, externals, data, boundaries).

A focus prompt in the argument pre-answers question 2: map it to the lenses it matches, name the
mapping in one line, and ask only question 1. When the lens differs from what Step 1 ran with,
re-run Step 1 with `--lens <a,b>` and print the new `display` before going on.

## Step 3 — Pick

- **Choose for me** → the selection is `recommended`. Print the ★ rows once more as a plain
  list — id, question, one `why` line each — so the plan is in the transcript before anything is
  authored. You may swap ONE row for another candidate of the same kind from the plan when the
  session knows something the score cannot (say why in one sentence); never add a row the plan
  does not hold.
- **Show me the menu** → ONE `AskUserQuestion` with two multi-select questions, **Insights**
  and **Context boards**: the top four rows of each table, ★ rows first; each option's label is
  the question, its description the level, shape and first evidence line, and the option must
  name the row's `Id`. When a table has more than four rows, make the fourth option **More…**;
  on **More…**, re-ask that question with the next four. Zero picks in both → stop: "Nothing
  selected — run `/discover` again when you want to." The selection is the batch: the chosen
  ids, comma-separated.

## Step 4 — Briefs

```bash
# Code / Connect
node <cli> --briefs <ids|recommended> --rules ${CLAUDE_PLUGIN_ROOT}/knowledge/discover-authoring/references/authoring.md [--board-slug <slug>] [--plan <path>] --domain architect
# Architect
node <cli> --briefs <ids|recommended> --rules ${CLAUDE_PLUGIN_ROOT}/knowledge/discover-authoring/references/authoring.md [--board <slug>] [--plan <path>]
```

Exit 1 → print `error`, stop (it names what to run). Exit 3 → print `error` (an unknown id), fix
the selection, retry once. On success print `display` — the wave table — and note the cleanup
line when present: the previous run's context boards go before this run's first push.

## Step 5 — Author

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

After each wave, run Step 6 for that wave's outputs before launching the next, so a long run
lands results as it goes.

## Step 6 — Push, in order

For each output of the wave, in plan order:

- an **insight** brief's output — Code / Connect:
  `node <cli> --save-insight <output> --board-slug <entry board> --require-pack --push --host claude --domain architect` (the entry board is the payload's `boardSlug`); Architect:
  `node <cli> --push-insight <output> --require-pack --push [--board <slug>]`.
- a **context-board** brief's output — Code / Connect:
  `node <cli> --push-context-board <output> --require-pack --push --host claude --domain architect`; Architect:
  `node <cli> --push-context-board <output> --require-pack --push [--board <slug>]`.
- `--board <slug>` on the Architect CLI names the subtree the plan was built for when it was not
  the whole tree; the pack it validates against is the one `--discover` cached for that root.

Exit 0 → print the one-line outcome (pushed, or `notAvailable` with its message). Exit 3 with
`validationErrors[]` → fix the listed fields in the output file yourself (copy any "did you mean"
value verbatim) and retry ONCE; still failing → leave it, say which item and why, continue with
the next. Exit 3 with `errorType: "auth_invalid"`, or exit 1 → the **connect-now offer** (Code
and Connect) or the command's failure branch (Architect); on `complete` resume this push. Any `warnings[]` print once; never loop on a warning. A missing
output file (the agent replied `not written`) is skipped with its reason.

Push from THIS session, never from an agent: one paced writer.

## Step 7 — Report

```bash
node <cli> --report            # Architect
node <cli> --report --domain architect   # Code / Connect
```

Print `display` verbatim. Then one closing sentence: how many landed, where to look (the
Insights Bar for the highlights batch, the hub's Context boards card for the boards), and that a
re-run replaces this run.
