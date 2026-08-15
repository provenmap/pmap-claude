---
category: advanced
description: Customize the archetype vocabulary — scan for gaps in the catalogue and propose the missing archetypes
argument-hint: [--dry-run | --skip-submit | --force | --replace]
allowed-tools: Read, Glob, Grep, Write, Bash(node:*, git:*), AskUserQuestion
---

Customize the **vocabulary** your architecture is described in. Scans the codebase for component categories, compares them against the server's archetype catalogue, and either confirms the catalogue is complete or proposes the missing archetypes for human approval.

**This is optional.** `/analyze` never requires it — it types every component with the closest available archetype and names any gaps it hit once the board is built. Run this when you want the catalogue to carry a category it currently lacks, so those components get a precise archetype instead of a loose fit.

## When to run

- After `/analyze` reported archetype gaps — it names the categories your codebase has that the catalogue doesn't.
- When you want to curate the vocabulary up front on a fresh project, before any board exists.
- After a codebase change that introduces a genuinely new component category (e.g. adding CDK stacks to a previously codebase-only repo).
- After admin approves proposals you previously submitted — re-running confirms the catalogue is now complete and updates the lock file. Then `/analyze --clean` retypes the affected components.

## Making it a hard precondition (advanced)

To require settlement before every `/analyze` — the old two-phase workflow — set this in `.provenmap/config.json`:

```json
{ "analysis": { "archetypeGate": "strict" } }
```

`/analyze` then stops and prompts whenever the lock is missing, stale, or was skipped. Remove the key to go back to the default, where settlement is optional and gaps are reported after the fact.

## Flags

| Flag | Effect |
| ---- | ------ |
| `--dry-run` | Run the scan, validate proposals locally + ask the server to dry-run, but do **not** persist or POST. No lock file written. |
| `--skip-submit` | Write `.provenmap/proposed-archetypes.json` for manual review; do not POST. Lock file records the scan but not a submission. |
| `--replace` | When submitting, send `mode='replace'` so duplicate-name pending rows are overwritten instead of rejected. |
| `--force` | Bypass the CLI's local hash guard when submitting. |

## Workflow

### Step -1: Preflight — binding, branch, local state

This command touches board state, so it runs behind the preflight gate. The gate is **enforced by a
script, not by prose** — run it and react to its exit code; never decide on your own that the
project is fine.

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-preflight.js
```

Print the JSON's `display` field **verbatim** — do not reformat, reorder, or summarise it.

| exit | meaning | action |
| ---- | ------- | ------ |
| 0 | Proceed | Continue to the next step. If `repairs.boardsRecovered` is non-empty, local state was just restored from the server — say so once (the `display` already carries the sentence) and continue. |
| 1 | Not connected, or credentials rejected | Make the **connect-now offer**: AskUserQuestion "Connect to ProvenMap now?" → **Connect now** runs `pmap-login.js --start` then `--poll` inline (print each `display` verbatim) and resumes this command on `status: "complete"`; **Not now** stops with the `error` sentence verbatim. |
| 2 | Binding could not be verified | Print `error` verbatim and stop. Name `/status` for the full local picture. |
| 11 | Branch mismatch | Print `display` verbatim, then ask via AskUserQuestion. Header: `Branch`. Question: `"This project is bound to a different branch. How do you want to proceed?"` Options: **Re-bind to this branch (`/login`)** — run the `/login` workflow inline, then re-run this step; **Stop — I'll switch branches myself** — stop, having already printed the `git switch` line. Never run `git switch` yourself: the working tree may be dirty. |

### Step 0: Configuration and branch check

Verify `.provenmap/config.json` exists. If not, make the **connect-now offer** — ask with **AskUserQuestion** "Connect to ProvenMap now?" (**Connect now** / **Not now**):

- **Connect now** → run the browser login here, printing each JSON `display` verbatim **in your reply** (the Bash output panel is collapsed for the user): `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-login.js --start`, then `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-login.js --poll --analyze-cmd analyze` (generous Bash timeout, e.g. 250s). On `status: "complete"`, continue; anything else — stop, the display explains.
- **Not now** → stop: "ProvenMap not configured — run `/login` (browser) or `/configure` (manual) first"

Then run the branch guard — the binding is pinned to one branch and the server rejects pushes from any other, so scanning the wrong checkout is wasted work:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-precondition.js --branch-only
```

On exit 1, print the JSON `error` field verbatim and stop (it names the pinned branch, the current branch, and the fix). On exit 0, continue.

### Step 1: Pull fresh archetype catalogue

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-archetypes.js --no-cache --kind code
```

Parse the `archetypes[]`, `nodeArchetypes[]`, and `edgeArchetypes[]` from the JSON output.
Read `catalogueHash` straight from the script's JSON — **do not compute it yourself.**
It is the lock's drift detector and has exactly one correct value; a second
implementation that disagrees reports `stale_catalogue` on a catalogue that never
changed, which is indistinguishable from real drift. Record the returned value in
the lock file verbatim.

### Step 2: Archetype-only scan

Invoke the `architecture-analyzer` agent with `--archetypes-only` mode. The agent runs `/analyze` Steps 0, 3, 4, 5 (project detection → tech stack detection → component discovery + archetype classification) but stops there. It does **not** produce board JSON, edges, hierarchies, or manifest updates.

**Model:** if `.provenmap/config.json` has `analysis.subagentModel`, pass it as the model
for the dispatched agent; otherwise inherit the session model. Same rule as
`/analyze` Step 8.7 — the setting pins every analysis subagent, and Phase 1's
scan is one.

The agent's output is a payload conforming to `ArchetypeProposalPayloadSchema`:

```json
{
  "proposed": [ /* new-archetype candidates per archetype-analysis SKILL */ ],
  "improvements": [ /* improvement candidates: rename | split | redescribe | merge */ ]
}
```

The agent applies the heuristics in [`${CLAUDE_PLUGIN_ROOT}/knowledge/archetype-analysis/SKILL.md`](../knowledge/archetype-analysis/SKILL.md) for both what to propose and what to skip.

**Surface the evidence before asking.** The scan runs for minutes in the background; a
spawn line followed by a summary gives the user nothing to judge. Before the submit
prompt, print for each proposal:

- the archetype name and the kind of gap (new archetype vs improvement)
- the files and components that evidence it — the concrete instances found
- which existing catalogue entries were considered and rejected, and why

That is precisely the material needed to sanity-check a proposal before it consumes
admin review time. If the agent's payload does not carry it, say so explicitly rather
than presenting an unevidenced proposal as ready.

### Step 3: Decision branches

#### Step 3a — no gaps

If `proposed[]` and `improvements[]` are both empty:

1. Write `.provenmap/archetype-analysis.lock.json`:
   ```json
   {
     "commitHash": "<git rev-parse HEAD>",
     "catalogueHash": "<from Step 1>",
     "scannedAt": "<ISO timestamp>",
     "submittedAt": null,
     "skippedAt": null,
     "proposalIds": []
   }
   ```
2. Print: *"Catalogue is complete for this codebase. You can now run `/analyze`."*
3. Exit 0.

#### Step 3b — gaps found

1. Print a summary table:

   ```
   PROPOSED (N)
     - lambda_function     (node) — covers 3 detected components
     - sns_topic           (edge) — covers 2 detected relations

   IMPROVEMENTS (M)
     - service [split] → http_service / worker_service — 12 components affected
   ```

2. If `--dry-run`: skip the prompt. Validate the payload via [scripts/pmap-propose-archetypes.js](../scripts/pmap-propose-archetypes.js) with `--dry-run` (which POSTs `?dryRun=true` to the server). Print result, do **not** write the lock. Exit 0.

3. If `--skip-submit`: write `.provenmap/proposed-archetypes.json`. Write the lock with `skippedAt: <ts>` (scan completed but submission was opted out — the catalogue is *not* settled). Print: *"Proposals written for manual review. Edit the file and re-run /analyze-archetypes when ready. /analyze runs either way — the affected components carry the closest available archetype until these land."* Exit 0.

4. Otherwise (interactive default): use AskUserQuestion with three options:
   - **Submit for review** (recommended) — proceed to Step 4.
   - **Edit first** — write `.provenmap/proposed-archetypes.json`. Write the lock with `skippedAt: <ts>` (same rationale as `--skip-submit` — the scan is mid-flight). Print: *"Edit the file then re-run /analyze-archetypes to submit."* Exit 0.
   - **Skip and proceed** — write the lock with `skippedAt: <ts>`. Print: *"Skipped. /analyze will run and type the affected components with the closest available archetype. Re-run /analyze-archetypes then /analyze --clean if you later want the missing archetypes in the catalogue."* Exit 0.

> **Lock-shape note:** in all three branches the lock must include `commitHash` and `catalogueHash` (from Step 1) so [pmap-precondition.js](../scripts/pmap-precondition.js) can detect when subsequent /analyze runs are still aligned with this scan. `skippedAt` is always non-null in these branches — under the opt-in `archetypeGate: "strict"` that field is what makes the precondition re-prompt; by default nothing reads it.

### Step 4: Submit

Write `.provenmap/proposed-archetypes.json` with the payload from Step 2. Then invoke the submission CLI:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-propose-archetypes.js \
  --proposals .provenmap/proposed-archetypes.json \
  --source-host claude --source-domain code \
  ${replace:+--replace} \
  ${force:+--force}
```

Parse the JSON output:

- `success: true` + `serverResult.acceptedProposed/acceptedImprovements`: print accepted count; record `proposalIds[]` from the response into the lock; set `submittedAt: <ts>`.
- `serverResult.rejected[]` non-empty: each entry has `existingProposalId` — surface to the user with the hint *"Already pending as proposalId=<id>; re-run with --replace to update it."*
- `success: false` + `serverResult.notAvailable: true`: server endpoint not deployed yet — leave the proposals file on disk; tell the user to retry after deployment. Do not write the lock.
- `errorCode: 3` (validation): surface `validated.errors[]`; let the user edit `.provenmap/proposed-archetypes.json` and re-run.

On success, print: *"N proposals submitted for admin review. The catalogue will be updated once an admin approves them in the ProvenMap UI. Re-run `/analyze-archetypes` after approval, then `/analyze --clean` to retype the affected components."*

### Step 5: Persist lock

`.provenmap/archetype-analysis.lock.json` is the single source of truth used by [pmap-precondition.js](../scripts/pmap-precondition.js) (invoked by `/analyze` Step -1) and `/status` (display). Fields:

- `commitHash` — git HEAD at scan time
- `catalogueHash` — hash of archetype-name list at scan time
- `scannedAt` — ISO timestamp of the scan
- `submittedAt` — ISO timestamp if proposals were POSTed, else `null`
- `skippedAt` — ISO timestamp if the user opted to proceed, edit-first, or `--skip-submit`, else `null`. Under `archetypeGate: "strict"` a non-null `skippedAt` always re-prompts on the next `/analyze` — it is intentionally not silenced.
- `proposalIds[]` — server-returned IDs for any submitted proposals (listed by `/status`; queried by the `/analyze` precondition to resolve pending → approved)

Mapping from lock state to precondition status. **The whole table applies only under `archetypeGate: "strict"`** — by default the precondition returns `gate_off` without reading the lock or the catalogue at all, and `/analyze` proceeds silently:

| Lock state | Precondition status | /analyze behaviour (strict mode only) |
| ---------- | ------------------- | ------------------ |
| missing or hashes mismatch | `missing` / `stale_commit` / `stale_catalogue` | re-prompts |
| `skippedAt` set | `skipped` | re-prompts (one-shot semantics) |
| `submittedAt` + non-empty `proposalIds[]` | `pending` | warns and continues |
| `skippedAt: null`, `submittedAt: null`, empty `proposalIds[]`, hashes match | `ok` | proceeds silently |

Only Step 3a (no gaps) and Step 4 (after admin approval — re-running this command finds no new gaps) produce the `ok` state.

## Notes

- Approved proposals appear in `/code-plugin/archetypes` after admin review in the ProvenMap UI. Until then, the live catalogue is unchanged — `/analyze` will warn if you have pending proposals submitted.
- This command does **not** write board JSONs. It is a pre-analysis vocabulary check only.
- See [knowledge/archetype-analysis/SKILL.md](../knowledge/archetype-analysis/SKILL.md) for what makes a good proposal and what should be skipped.
