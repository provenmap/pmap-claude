# Intent implementation workflow — Steps 2–8

`/intents` runs Steps -1 to 1 inline (preflight, pull the list, pick an intent) and hands off here.
Follow these steps in order, exactly as written — every CLI call, branch, gate, and prompt below is
part of the command's contract, not a suggestion. Do not improvise a step.

Every `pmap-intents.js` output carries a ready-to-print markdown `display` field: print it verbatim
**in your reply** — never reformat, reorder, or summarise it (the Bash output panel is collapsed for
the user) — and branch only on the exit code and the JSON fields named below.

**Write-capable.** These steps modify project files. Never edit before the user has picked an intent
and you have claimed it; always show the user what you changed; and never record any resolution
until the user has seen the outcome and said yes.

## Step 2 — Gate the pick

Before claiming, check the chosen intent's summary fields:

- **`stale: true`** → do NOT implement. Tell the user: "This intent is stale — the board changed since the architect authored it, so the proposed change may no longer apply. Re-check with the architect (they can re-lock it), then pull again." Stop unless the user explicitly insists after that warning.
- **`status: in_progress`** and `assignedTo` names someone who isn't this user → warn that another developer may already be implementing it, and confirm with the user before proceeding.

## Step 3 — Claim it (single-winner)

A browser pick (`--select-poll` returning `selectStatus: "complete"`) is already claimed under the
user's signed-in identity — skip this step and continue at Step 5. For the terminal path:
`implemented` resolutions are only accepted for claimed intents, so claim before touching any file.
Use the developer's name — ask the user, or default to `git config user.name`:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-intents.js --claim <intentId> --by "<name>" --host claude --domain code
```

Print `display` verbatim, then branch on `claim.reason`:

- `claimed` → proceed
- `already_in_progress` → ask the user whether to continue anyway (e.g. it's their own earlier session) or pick another intent
- `not_claimable` / `not_found` → re-run `--list` and re-present the queue (the command's Step 1)
- **Exit code 3 with `notAvailable: true`** → stop; do not implement unrecorded work

## Step 4 — Show the full intent and map it to source

Skip if `--select-poll` already showed it — its output carries the full payload. `--show` reads the
intents the command's list step persisted to `.provenmap/intents/` (one JSON file per intent).

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-intents.js --show <intentId>
```

Print `display` verbatim — it carries the description (the why), directive, proposed board changes,
anchor→file map with architect notes, and downloaded attachments. Then:

- **Read every attachment with a local path** (`.provenmap/intents/attachments/<intentId>/`) — including images/PDFs; they are part of the spec. A `downloadError` means continue with the directive alone and tell the user.
- If the display lists **Linked inspections**, read each linked `manifest.json` and the selection screenshots it references — locally captured visual context (what the user pointed at in the running app) that carries into the gap review and implementation.
- For `board_diff` payloads, the JSON `intent.payload.suggestions[]` rows are the machine-readable spec (add/remove/modify nodes, edges, or aspects to make true in the codebase); a suggestion's `rationale` may end with "— Architect: …", a per-change note that is part of the spec.
- **Aspect anchors** (`elementType: "aspect"`, e.g. a database table or an API endpoint) resolve to no local files yet — the anchor `slug` IS the aspect's identity (a table name or `METHOD /path`), so locate it in the codebase by that identity. A `remove` aspect suggestion means deleting that table/endpoint; the architect's board shows it as staged until your push confirms it.
- Unresolved anchors (`resolved: false`) → locate the codebase by the element's slug/name; if there's no local board data at all, suggest running `/analyze` first.

## Step 4.5 — Gap review (mandatory before any edit)

**Never start editing without this step.** Follow [../SKILL.md](../SKILL.md) to compare the
**architect's intent** (anchors, directive, `board_diff` suggestions, attachments) against **code
reality** (what the anchor files actually contain now). Produce the gap table the skill specifies and
classify the result:

- **`clean`** or **`minor`** (anchors resolve, the directive is locatable, suggestions apply — nits only) → say so briefly and continue to Step 5.
- **`blocking`** (the criteria in [gap-criteria.md](gap-criteria.md)) → do NOT edit. Show the user the gap table, then ask with **AskUserQuestion**:
  - **Send back to architect** (recommended) — the gaps are the architect's to resolve. Draft the skill's bounce-back note (one-line reason + expected→found bullets, ≤1800 chars), show it to the user for approval, then bounce it back:

    ```bash
    node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-intents.js --clarify <intentId> --note "<approved gap summary>" --by "<name>" --host claude --domain code
    ```

    Print `display` verbatim. On success the intent leaves your queue (local copy dropped); tell the user to re-run `/intents` later once the architect has revised and re-opened it. **Stop here** — do not implement.
  - **Continue anyway** — the user judges the gap surmountable; proceed to Step 5, noting the risk.
  - **Reject** — the change is wrong for the codebase; go to Step 8 (rejected).

**`--clarify` exit codes:** 1 = missing note/config (a note is required — it's the only thing the architect receives); 2 = intent not found on the server; 3 = API error or `notAvailable: true` (server can't record it — tell the user their **decision was NOT recorded**).

## Step 5 — Implement the change

Use your own tools (Read, Glob, Grep, Edit, Write, Bash) to make the change in the project, showing
the user what you change as you go:

1. Start from the anchor `files[]`; read the surrounding code to understand the current shape
2. Follow `intent.directive` as the spec. For `board_diff` payloads, realize each suggestion in code (e.g. an `add` node suggestion means introducing that component; a `remove` edge suggestion means severing that dependency)
3. Respect the project's conventions — match existing style, keep the change scoped to the intent
4. If while implementing you discover the change is inapplicable (already done, contradicts the actual code, or would break something) → stop and go to Step 8 (reject / resolve_other) instead of forcing it

## Step 6 — Verify and record the evidence

**Mandatory before any `implemented` resolution:** the CLI refuses `--resolve --kind implemented`
without fresh recorded evidence. The evidence is what *you* record — the server does not re-run your
checks — so run the checks for real and record their true exit codes. Recording a check you didn't
run, or a passing exit code for a failing check, defeats the whole loop.

1. Discover what the project uses: `package.json` scripts (`test`, `typecheck`, `lint`, `build`), `Makefile`, `pyproject.toml`, `Cargo.toml`, CI config — whatever this project verifies with
2. Run the relevant checks (at minimum the type/compile check and the tests nearest the changed code)
3. **Record each check you ran**, honest exit code included:

   ```bash
   node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-intents.js --record-verify <intentId> \
     --command "<the check command>" --exit-code <its exit code> --summary "<one line>"
   ```

   Print `display` verbatim. Re-recording the same command replaces its earlier entry, so record a failure, fix, re-run, and re-record.
4. **Show the user the verify results** — pass or fail, with the actual output summarized

If verification fails, fix and re-verify, or tell the user honestly that it doesn't pass. Evidence
expires after ~30 minutes — resolve while it's fresh.

## Step 7 — Resolve as implemented (only after the user confirms)

Show the user the diff summary and verify results, and ask whether to record the resolution. If they
committed the change, include the commit SHA (and PR URL if any):

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-intents.js --resolve <intentId> --kind implemented \
  --note "<one-line summary of what was changed>" \
  --commit-sha <sha> --pr-url <url> --by "<name>" --host claude --domain code
```

(`--commit-sha` / `--pr-url` are optional — omit them if there's no commit yet.)

Print `display` verbatim — it explains how the loop closes (confirmed on a later `/sync`; local state
cleaned up). **Exit code 1 with `verifyRequired: true`** → evidence is missing, stale, or failing —
go back to Step 6. The command's resolution exit-code table covers the other outcomes.

## Step 8 — Rejecting or resolving another way

If the user declines the intent, or it's inapplicable:

- **Rejected** (the user disagrees with the change, or it's wrong for the codebase):

  ```bash
  node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-intents.js --resolve <intentId> --kind rejected \
    --note "<why — the architect reads this>" --by "<name>" --host claude --domain code
  ```

- **Resolved other** (moot: already implemented, superseded, fixed elsewhere):

  ```bash
  node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-intents.js --resolve <intentId> --kind resolved_other \
    --note "<what actually resolved it>" --by "<name>" --host claude --domain code
  ```

A `--note` is effectively required for both — it's the only feedback the architect gets, so it has to
stand alone once the intent leaves the queue: for a rejection say why the change is wrong for this
codebase, for a resolved-other say what actually resolved it. Ask the user for the reason if
it isn't clear from the conversation. Print `display` verbatim.

## Hard rules

- **Never auto-resolve.** Every resolution — implemented, rejected, resolved_other — happens only after the user has seen the outcome (diff + verify results, or the rejection reason) and said yes.
- **Never implement a stale intent** without the explicit warning + user override in Step 2.
- **No gap review, no edits.** Always run Step 4.5 before touching a file; a `blocking` gap goes to the user, never silently forced through.
- **Never `--clarify` without a user-approved note.** The bounce-back note is the only thing the architect receives — draft it, show it, get a yes, then send.
- **Claim before implementing**; the server refuses `implemented` on unclaimed intents.
- **No verify, no `implemented`.** The CLI refuses `--resolve --kind implemented` without fresh passing `--record-verify` evidence. That evidence is self-recorded — run the checks for real and record honest exit codes; never record a check you didn't run. If no checks exist in the project, record the closest honest signal (e.g. a build) and tell the user.
