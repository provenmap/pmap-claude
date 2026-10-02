# Work item implementation workflow — Steps 2–8

`/work-items` runs Steps -1 to 1 inline (preflight, pull the list, pick a work item) and hands off here.
Follow these steps in order, exactly as written — every CLI call, branch, gate, and prompt below is
part of the command's contract, not a suggestion. Do not improvise a step.

Every `pmap-work-items.js` output carries a ready-to-print markdown `display` field: print it verbatim
**in your reply** — never reformat, reorder, or summarise it (the Bash output panel is collapsed for
the user) — and branch only on the exit code and the JSON fields named below.

**Write-capable.** These steps modify project files. Never edit before the user has picked a work item,
you have claimed it, and the user has approved the Step 4.7 plan; always show the user what you
changed; and never record any resolution until the user has seen the outcome and said yes.

## Step 2 — Gate the pick

Before claiming, check the chosen work item's summary fields:

- **`stale: true`** → do NOT implement. Tell the user: "This work item is stale — the board changed since the architect authored it, so the proposed change may no longer apply. Re-check with the architect (they can re-lock it), then pull again." Stop unless the user explicitly insists after that warning.
- **`status: in_progress`** and `assignedTo` names someone who isn't this user → warn that another developer may already be implementing it, and confirm with the user before proceeding.

## Step 3 — Claim it (single-winner)

A browser pick (`--select-poll` returning `selectStatus: "complete"`) is already claimed under the
user's signed-in identity — skip this step and continue at Step 4.5 (its show is already done). For the terminal path:
`implemented` resolutions are only accepted for claimed work items, so claim before touching any file.
Use the developer's name — ask the user, or default to `git config user.name`:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-work-items.js --claim <workItemId> --by "<name>" --host claude --domain code
```

Print `display` verbatim, then branch on `claim.reason`:

- `claimed` → proceed
- `already_in_progress` → ask the user whether to continue anyway (e.g. it's their own earlier session) or pick another work item
- `not_claimable` / `not_found` → re-run `--list` and re-present the queue (the command's Step 1)
- **Exit code 3 with `notAvailable: true`** → stop; do not implement unrecorded work

## Step 4 — Show the full work item and map it to source

Skip if `--select-poll` already showed it — its output carries the full payload. `--show` reads the
work items the command's list step persisted to `.provenmap/work-items/` (one JSON file per work item).

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-work-items.js --show <workItemId>
```

Print `display` verbatim — it carries the description (the why), directive, proposed board changes,
anchor→file map with architect notes, and downloaded attachments. Then:

- **Read every attachment with a local path** (`.provenmap/work-items/attachments/<workItemId>/`) — including images/PDFs; they are part of the spec. A `downloadError` means continue with the directive alone and tell the user.
- If the display lists **Linked inspections**, read each linked `manifest.json` and the selection screenshots it references — locally captured visual context (what the user pointed at in the running app) that carries into the gap review and implementation.
- For `board_diff` payloads, the JSON `workItem.payload.suggestions[]` rows are the machine-readable spec (add/remove/modify nodes, edges, or aspects to make true in the codebase); a suggestion's `rationale` may end with "— Architect: …", a per-change note that is part of the spec.
- **Aspect anchors** (`elementType: "aspect"`, e.g. a database table or an API endpoint) resolve to no local files yet — the anchor `slug` IS the aspect's identity (a table name or `METHOD /path`), so locate it in the codebase by that identity. A `remove` aspect suggestion means deleting that table/endpoint; the architect's board shows it as staged until your push confirms it.
- Unresolved anchors (`resolved: false`) → locate the code by the element's slug/name; if there's no local board data at all, suggest running `/analyze` (or `/ground` for a document repo) first.

## Step 4.5 — Gap review (mandatory before any edit)

**Never start editing without this step.** Follow [../SKILL.md](../SKILL.md) to compare the
**architect's intent** (anchors, directive, `board_diff` suggestions, attachments) against **code
reality** (what the anchor files actually contain now). Read the work item's `type` first — it sets
the bar the directive has to clear, and a directive that misses its own type's bar is a gap:

- **`fix`** — it must say what is observed and what is expected, and where. Reproduce before editing.
- **`feature`** — it must name the elements that gain the capability; nothing else changes.
- **`refactor`** — behaviour stays. It must name what moves and what must keep working; the checks you record in Step 6 are the proof.
- **`task`** — bounded work with no behaviour claim. It must say what done looks like.
- **`decision`** — a choice to make and record; usually not yours to implement — ask before writing code.

Produce the gap table the skill specifies and classify the result:

- **`clean`** or **`minor`** (anchors resolve, the directive is locatable, suggestions apply — nits only) → say so briefly and continue to Step 4.7.
- **`blocking`** (the criteria in [gap-criteria.md](gap-criteria.md)) → do NOT edit. Show the user the gap table, then ask with **AskUserQuestion**:
  - **Send back to architect** (recommended) — the gaps are the architect's to resolve. Draft the skill's bounce-back note (one-line reason + expected→found bullets, ≤1800 chars), show it to the user for approval, then bounce it back:

    ```bash
    node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-work-items.js --clarify <workItemId> --note "<approved gap summary>" --by "<name>" --host claude --domain code
    ```

    Print `display` verbatim. On success the work item leaves your queue (local copy dropped); tell the user to re-run `/work-items` later once the architect has revised and re-opened it. **Stop here** — do not implement.
  - **Continue anyway** — the user judges the gap surmountable; proceed to Step 4.7, noting the risk.
  - **Reject** — the change is wrong for the codebase; go to Step 8 (rejected).

**`--clarify` exit codes:** 1 = missing note/config (a note is required — it's the only thing the architect receives); 2 = work item not found on the server; 3 = API error or `notAvailable: true` (server can't record it — tell the user their **decision was NOT recorded**).

## Step 4.7 — Ground truth, then the plan (mandatory before any edit)

The gap review asked whether the work item still matches the code. This step learns how the code
actually works before you change it, so the change fits the codebase instead of the directive
alone. **No edit before the user approves the plan.**

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-work-items.js --context <workItemId>
```

Print `display` verbatim. It lists files, never conclusions: what the work item changes, what is
only context, what depends on the changed code and what it depends on (from the analysed board),
the tests near it, the project's checks and CI workflows, its rules files and the app's compiled
skills. Exit 2 → the work item is not stored locally: re-run `--list`, then this.

Then establish the ground truth yourself — read, don't skim:

1. **The project's rules.** Read every listed rules file (`CLAUDE.md`, `AGENTS.md`, `CONTRIBUTING.md`,
   `.cursor/rules/*`; a nested one beside the changed code binds that code) and every compiled skill
   or rule whose name or description touches the area you are changing. They are this team's best
   practices; where they and your habits differ, they win. Never edit a compiled skill file — `/skills`
   manages them.
2. **The code you will change**, whole files, not the anchored lines alone: its current shape, its
   error handling, its logging, how it is configured and wired in.
3. **What depends on it.** Every "Depends on this" entry is a caller or importer that must keep
   working: read the place where it uses the changed code. Note each one your change could break.
4. **The house pattern.** Find the closest existing code that already does the same kind of thing
   (another endpoint, handler, migration, component, retry) and follow it — naming, layout, error
   style, test style. Name it, with its file and line, in the plan.
5. **The tests.** Read the listed tests; find what covers the behaviour you are changing, and what
   does not.
6. **The baseline.** Run the project's checks **before** editing — at least the type/compile check
   and the tests nearest the change — and note what already fails. A failure you inherit is not yours,
   and Step 6 can only tell the two apart if you know the starting state. Do not record these with
   `--record-verify`; that evidence is for after the change.
7. **The type's own proof:**
   - **`fix`** — reproduce it. Write the test that fails for the reported reason, or show the failing
     run; no plan for a fix you have not seen fail.
   - **`refactor`** — confirm tests pin the behaviour that must stay. Where none do, the plan adds a
     characterization test first.
   - **`feature`** — find where comparable capabilities are registered and wired (routes, DI,
     config, feature flags, exports), so the new one is reachable the same way.
   - **`task`** — state the check that shows it is done.
   - **`decision`** — no code until the user says what was decided.

**The plan.** Show the user, in a few lines each:

- **Change** — each file and what changes in it, mapped to the directive (and to each `board_diff`
  suggestion).
- **Pattern** — the existing code you are following, `file:line`.
- **Tests** — what you add or update, and the test that will prove the change (for a fix, the one
  that fails now).
- **Checks** — the commands you will run in Step 6, and the baseline failures already present.
- **Risks** — the dependents that could break, contracts or schemas touched, migrations, anything
  the directive leaves open.

Ask with **AskUserQuestion**: **Approve the plan** (recommended) · **Adjust it** (revise and ask
again) · **Send back to architect** (the ground truth showed the work item cannot be implemented as
written — draft the note per Step 4.5) · **Reject** (Step 8). Only an approved plan goes to Step 5.

## Step 5 — Implement the approved plan

Use your own tools (Read, Glob, Grep, Edit, Write, Bash) and show the user each change as you make
it:

1. **Follow the plan.** When the code forces a deviation — a file the plan missed, a pattern that
   doesn't fit — stop, say what changed and why, and get a yes before continuing.
2. **The smallest change that satisfies the directive.** No unrelated refactors, renames, reformatting
   or dependency upgrades; what you notice on the way goes in the summary, not the diff.
3. **The house pattern and the house rules** from Step 4.7, over your own preferences.
4. **Tests with the change**: a fix lands with the test that failed before it; a feature with tests
   for its behaviour; a refactor leaves the existing tests unchanged and passing.
5. **Contracts stay** — public APIs, exported signatures, schemas, event and message shapes — unless
   the directive changes them; when it does, update every dependent Step 4.7 listed.
6. **Never make a check pass by weakening it**: no skipped or deleted tests, loosened assertions,
   disabled lint rules or type escapes. No secrets in code.
7. **For `board_diff` payloads**, realize each suggestion in code (an `add` node suggestion means
   introducing that component; a `remove` edge suggestion means severing that dependency).
8. If the change turns out inapplicable (already done, contradicts the code, would break something) →
   stop and go to Step 8 (reject / resolve_other) instead of forcing it.

## Step 6 — Verify and record the evidence

**Mandatory before any `implemented` resolution:** the CLI refuses `--resolve --kind implemented`
without fresh recorded evidence. The evidence is what *you* record — the server does not re-run your
checks — so run the checks for real and record their true exit codes. Recording a check you didn't
run, or a passing exit code for a failing check, defeats the whole loop.

1. Discover what the project uses: `package.json` scripts (`test`, `typecheck`, `lint`, `build`), `Makefile`, `pyproject.toml`, `Cargo.toml`, CI config — whatever this project verifies with
2. Run the relevant checks (at minimum the type/compile check and the tests nearest the changed code) and compare them with the Step 4.7 baseline: a check that newly fails is the change's to fix; one that failed before and still fails is inherited — say so, and record the narrower check that covers the change (its test file, the typecheck) instead of claiming the whole suite passes
3. **Record each check you ran**, honest exit code included:

   ```bash
   node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-work-items.js --record-verify <workItemId> \
     --command "<the check command>" --exit-code <its exit code> --summary "<one line>"
   ```

   Print `display` verbatim. Re-recording the same command replaces its earlier entry, so record a failure, fix, re-run, and re-record.
4. **Show the user the verify results** — pass or fail, with the actual output summarized

If verification fails, fix and re-verify, or tell the user honestly that it doesn't pass. Evidence
expires after ~30 minutes — resolve while it's fresh.

## Step 7 — Resolve as implemented (only after the user confirms)

**Structural (`board_diff`) work items — this step is optional.** Once a `/sync` push shows every
proposed change in the code, the platform completes the claimed work item itself with ✓ Confirmed,
and that `/sync` says so. The exception is a work item with a `remove` suggestion: a sync cannot
tell a removal from a rename, so it always needs this step. Offer the choice: resolve now, which
puts the user's note, commit and PR on it, or leave it for `/analyze` then `/sync`. A resolve
refused with "is already implemented" means a sync completed it first; nothing was lost. Directive
work items always need this step.

Show the user the diff summary and verify results, and ask whether to record the resolution. If they
committed the change, include the commit SHA (and PR URL if any):

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-work-items.js --resolve <workItemId> --kind implemented \
  --note "<one-line summary of what was changed>" \
  --commit-sha <sha> --pr-url <url> --by "<name>" --host claude --domain code
```

(`--commit-sha` / `--pr-url` are optional — omit them if there's no commit yet.)

Print `display` verbatim — it explains how the loop closes (confirmed on a later `/sync`; local state
cleaned up). **Exit code 1 with `verifyRequired: true`** → evidence is missing, stale, or failing —
go back to Step 6. The command's resolution exit-code table covers the other outcomes.

## Step 8 — Rejecting or resolving another way

If the user declines the work item, or it's inapplicable:

- **Rejected** (the user disagrees with the change, or it's wrong for the codebase):

  ```bash
  node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-work-items.js --resolve <workItemId> --kind rejected \
    --note "<why — the architect reads this>" --by "<name>" --host claude --domain code
  ```

- **Resolved other** (moot: already implemented, superseded, fixed elsewhere):

  ```bash
  node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-work-items.js --resolve <workItemId> --kind resolved_other \
    --note "<what actually resolved it>" --by "<name>" --host claude --domain code
  ```

A `--note` is effectively required for both — it's the only feedback the architect gets, so it has to
stand alone once the work item leaves the queue: for a rejection say why the change is wrong for this
codebase, for a resolved-other say what actually resolved it. Ask the user for the reason if
it isn't clear from the conversation. Print `display` verbatim.

## Hard rules

- **Never auto-resolve.** Every resolution — implemented, rejected, resolved_other — happens only after the user has seen the outcome (diff + verify results, or the rejection reason) and said yes.
- **Never implement a stale work item** without the explicit warning + user override in Step 2.
- **No gap review, no edits.** Always run Step 4.5 before touching a file; a `blocking` gap goes to the user, never silently forced through.
- **No ground truth, no plan; no approved plan, no edit.** Step 4.7 runs `--context`, reads what it lists, runs the baseline checks, and ends with a plan the user approves.
- **Never `--clarify` without a user-approved note.** The bounce-back note is the only thing the architect receives — draft it, show it, get a yes, then send.
- **Claim before implementing**; the server refuses `implemented` on unclaimed work items.
- **No verify, no `implemented`.** The CLI refuses `--resolve --kind implemented` without fresh passing `--record-verify` evidence. That evidence is self-recorded — run the checks for real and record honest exit codes; never record a check you didn't run. If no checks exist in the project, record the closest honest signal (e.g. a build) and tell the user.
