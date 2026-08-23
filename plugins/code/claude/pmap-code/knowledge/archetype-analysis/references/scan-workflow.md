# `/analyze-archetypes` — Steps 1–5

The contract for the delegated half of the command. The command itself owns Step -1 (preflight)
and Step 0 (branch guard) and hands over here. Follow this exactly; improvise nothing.

Heuristics for what to propose and what to skip stay in this skill's `SKILL.md`; the
`--archetypes-only` scan mode, the subagent-model rule, the payload shape, and the evidence you
must surface before prompting are in its **Running the scan** section.

## Step 1: Pull fresh archetype catalogue

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-archetypes.js --no-cache --kind code --full
```

Parse the `archetypes[]`, `nodeArchetypes[]`, and `edgeArchetypes[]` from the JSON output.
(`--full` emits the raw `archetypes[]` array. This command is the one place that earns it —
judging whether the catalogue has a *gap* needs each archetype's full description. Every other
command reads the compact `display` instead.)

Read `catalogueHash` straight from the script's JSON — **do not compute it yourself.** It is the
lock's drift detector and has exactly one correct value; a second implementation that disagrees
reports `stale_catalogue` on a catalogue that never changed, which is indistinguishable from real
drift. Record the returned value in the lock file verbatim.

## Step 2: Archetype-only scan

Invoke the `architecture-analyzer` agent with `--archetypes-only` mode, per the **Running the
scan** section of `SKILL.md` — that section carries what the mode runs and must not produce, the
`analysis.subagentModel` rule for the dispatched agent, the `ArchetypeProposalPayloadSchema` shape
(`proposed[]` + `improvements[]`), and the per-proposal evidence you print before the submit
prompt. The agent applies this skill's heuristics for both what to propose and what to skip.

## Step 3: Decision branches

### Step 3a — no gaps

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

### Step 3b — gaps found

1. Print a summary table:

   ```
   PROPOSED (N)
     - lambda_function     (node) — covers 3 detected components
     - sns_topic           (edge) — covers 2 detected relations

   IMPROVEMENTS (M)
     - service [split] → http_service / worker_service — 12 components affected
   ```

2. If `--dry-run`: skip the prompt. Validate the payload via `pmap-propose-archetypes.js` with
   `--dry-run` (which POSTs `?dryRun=true` to the server). Print result, do **not** write the
   lock. Exit 0.

3. If `--skip-submit`: write `.provenmap/proposed-archetypes.json`. Write the lock with
   `skippedAt: <ts>` (scan completed but submission was opted out — the catalogue is *not*
   settled). Print: *"Proposals written for manual review. Edit the file and re-run
   /analyze-archetypes when ready. /analyze runs either way — the affected components carry the
   closest available archetype until these land."* Exit 0.

4. Otherwise (interactive default): use **AskUserQuestion** — the **user** picks one of three
   options:
   - **Submit for review** (recommended) — proceed to Step 4.
   - **Edit first** — write `.provenmap/proposed-archetypes.json`. Write the lock with
     `skippedAt: <ts>` (same rationale as `--skip-submit` — the scan is mid-flight). Print:
     *"Edit the file then re-run /analyze-archetypes to submit."* Exit 0.
   - **Skip and proceed** — write the lock with `skippedAt: <ts>`. Print: *"Skipped. /analyze will
     run and type the affected components with the closest available archetype. Re-run
     /analyze-archetypes then /analyze --clean if you later want the missing archetypes in the
     catalogue."* Exit 0.

> **Lock-shape note:** in all three branches the lock must include `commitHash` and
> `catalogueHash` (from Step 1) so `pmap-precondition.js` can detect when subsequent `/analyze`
> runs are still aligned with this scan. `skippedAt` is always non-null in these branches — under
> the opt-in `archetypeGate: "strict"` that field is what makes the precondition re-prompt; by
> default nothing reads it.

## Step 4: Submit

Write `.provenmap/proposed-archetypes.json` with the payload from Step 2. Then invoke the
submission CLI:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-propose-archetypes.js \
  --proposals .provenmap/proposed-archetypes.json \
  --source-host claude --source-domain code \
  ${replace:+--replace} \
  ${force:+--force}
```

Parse the JSON output:

- `success: true` + `serverResult.acceptedProposed/acceptedImprovements`: print accepted count;
  record `proposalIds[]` from the response into the lock; set `submittedAt: <ts>`.
- `serverResult.rejected[]` non-empty: each entry has `existingProposalId` — surface to the user
  with the hint *"Already pending as proposalId=<id>; re-run with --replace to update it."*
- `success: false` + `serverResult.notAvailable: true`: server endpoint not deployed yet — leave
  the proposals file on disk; tell the user to retry after deployment. Do not write the lock.
- `errorCode: 3` (validation): surface `validated.errors[]`; let the user edit
  `.provenmap/proposed-archetypes.json` and re-run.

On success, print: *"N proposals submitted for admin review. The catalogue will be updated once an
admin approves them in the ProvenMap UI. Re-run `/analyze-archetypes` after approval, then
`/analyze --clean` to retype the affected components."*

## Step 5: Persist lock

`.provenmap/archetype-analysis.lock.json` is the single source of truth used by
`pmap-precondition.js` (invoked by `/analyze` Step -1) and `/status` (display). Fields:

- `commitHash` — git HEAD at scan time
- `catalogueHash` — hash of archetype-name list at scan time
- `scannedAt` — ISO timestamp of the scan
- `submittedAt` — ISO timestamp if proposals were POSTed, else `null`
- `skippedAt` — ISO timestamp if the user opted to proceed, edit-first, or `--skip-submit`, else
  `null`. Under `archetypeGate: "strict"` a non-null `skippedAt` always re-prompts on the next
  `/analyze` — it is intentionally not silenced.
- `proposalIds[]` — server-returned IDs for any submitted proposals (listed by `/status`; queried
  by the `/analyze` precondition to resolve pending → approved)

### Making settlement a hard precondition (advanced)

Settlement is optional by default. To require it before every `/analyze` — the old two-phase
workflow — set this in `.provenmap/config.json`:

```json
{ "analysis": { "archetypeGate": "strict" } }
```

`/analyze` then stops and prompts whenever the lock is missing, stale, or was skipped. Remove the
key to go back to the default, where settlement is optional and gaps are reported after the fact.

Mapping from lock state to precondition status. **The whole table applies only under
`archetypeGate: "strict"`** — by default the precondition returns `gate_off` without reading the
lock or the catalogue at all, and `/analyze` proceeds silently:

| Lock state | Precondition status | /analyze behaviour (strict mode only) |
| ---------- | ------------------- | ------------------ |
| missing or hashes mismatch | `missing` / `stale_commit` / `stale_catalogue` | exit 10 — re-prompts |
| `skippedAt` set | `skipped` | exit 10 — re-prompts (one-shot semantics) |
| `submittedAt` + non-empty `proposalIds[]` | `pending` | exit 0 — warns and continues |
| `skippedAt: null`, `submittedAt: null`, empty `proposalIds[]`, hashes match | `ok` | exit 0 — proceeds silently |

Only Step 3a (no gaps) and Step 4 (after admin approval — re-running this command finds no new
gaps) produce the `ok` state.
