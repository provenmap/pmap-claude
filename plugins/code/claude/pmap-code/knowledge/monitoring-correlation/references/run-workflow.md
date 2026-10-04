# Run Workflow — `/monitor` steps 2–6

The delegated half of `/monitor`. The command itself owns step 0 (preflight), step 1
(prerequisites + `.provenmap/monitoring/config.json`) and the connect-now offer; everything below
runs after those two gates have passed. Follow it exactly — every call, flag, exit branch and
prompt here is the contract.

Print every CLI JSON `display` field **verbatim** — do not reformat, reorder or summarise it.
A corrupt `map.json`, `config.json` or `signals.json` surfaces as the CLI's `error` field: relay it
verbatim, it names the file and the fix.

## Step 2: Acquire and normalize signals

- If the command was given `--input <file>`: read that file. If it already matches the normalized
  signals schema (`version: 1` + `signals[]`), use it as-is; otherwise normalize it per the vendor
  recipes.
- Otherwise, look for connected observability MCP tools in the session (Sentry, CloudWatch, AWS,
  Datadog, Grafana). If none are available → stop and print the connect one-liner for the user's
  tool from `vendor-recipes.md`, then:
  "Connect a monitoring MCP and rerun `/monitor`, or rerun with `--input <exported-file>`".
- Pull signals for the window per the vendor recipe and normalize them into
  `.provenmap/monitoring/signals.json` (schema in `../SKILL.md`). Signal `id`s are **stable vendor
  fingerprints** — they are the cross-run lifecycle keys; never invent or re-generate them. If the
  command was given a focus prompt (e.g. "checkout errors only"), use it to filter which signals
  to include.

## Step 3: Correlate (deterministic)

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-insights.js --correlate .provenmap/monitoring/signals.json --out .provenmap/monitoring/skeleton.json
```

- **Exit code 2** (no local board data) → retry once with `--from-server` appended (uses the synced
  server state; works in fresh clones). If that also fails: exit 1 → the config message from
  Step 1; exit 2 → stop: "No board data — run `/analyze` and `/sync` first"; exit 3 → relay
  `validationErrors[]` (fix `signals.json` and retry) or the API error.
- Print the JSON `warnings[]` verbatim.
- If `proposals[]` is non-empty: these are uncertain locator→element matches. Present them to the
  **user** with AskUserQuestion (one question, the candidates as options, "none of these"
  allowed), write the confirmed entries into `.provenmap/monitoring/map.json` as
  `{"version": 1, "mappings": {"<locator>": "<slug>" | null}}` (`null` = always ignore that
  locator), then re-run the correlate command once so the mappings take effect. In a
  non-interactive session, skip the prompt and leave the proposals in the report.

The command also writes the context pack to `.provenmap/discover/packs/<boardSlug>.context.json` — the
oracle for Step 5's quality gates.

## Step 4: Shape the insights (your judgment)

Read `.provenmap/monitoring/skeleton.json` — one prefilled insight per signal (id, element
anchors, priority, measurement, tags already set). For **each** one, apply the work-item-ready
authoring rules in `insight-shaping.md`: verify against the matched element's source before
upgrading `confidence` to `verified`; `name` as an imperative work item and `insight` as evidence;
**always set `recommendation` and `effort`**, never `recommendation` and `context` together; carry
`id`, `tags` and `measurement` through unchanged.

Edit the skeleton file in place. Extend the trail 2–4 stops (using `pack.edges` for grounding) for `critical` insights on high-fan-in nodes to show blast radius. Set `proposal: { action: "add", targetType: "node"|"edge", ... }` when signals reveal a dependency or resource that has no corresponding board element. Insights tagged `unmatched` are board-level facts — keep them, and note in `context` what would help anchor them (they carry no `recommendation`).

## Step 5: Save and push

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-insights.js --save-insight .provenmap/monitoring/skeleton.json --board-slug <boardSlug> --require-pack --push
```

- **Exit code 3** → fix the fields listed in `validationErrors[]` and retry
- Push failed → report "Saved locally — push failed: <error>"
- `notAvailable: true` → report "Saved locally — server push not yet available"

**Optional — propose work items (unattended/scheduled runs):** append `--propose-work-items` to also turn
the highest-signal insights (a concrete `recommendation` + `high`/`critical` priority) into **draft
work items**. The drafts carry the insight's name, directive and anchors, but no back-link to the
insight row: a push answers with the batch id it minted, never with row ids. They are NOT pullable
until an architect reviews and locks them — the queue fills itself, under human review. Default off; interactive runs usually leave
promotion to the architect.

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-insights.js --save-insight .provenmap/monitoring/skeleton.json --board-slug <boardSlug> --require-pack --push --propose-work-items
```

The result's `proposedWorkItemIds[]` lists what was proposed.

## Step 6: Report

Print a summary table (signals pulled, matched/unmatched, insights by priority, pushed/saved),
then:

> The insights landed as a **draft batch** on the portal's insights tab. An architect can promote
> individual insights to work items there; developers pick promoted work items up with `/work-items`.

If `--propose-work-items` proposed any (`proposedWorkItemIds[]`), add: "N work items proposed as drafts —
they appear for review on the board's work items tab and become pullable once an architect locks
them."

## Scheduled (`--scheduled`)

The unattended run a host schedule fires (`${CLAUDE_PLUGIN_ROOT}/knowledge/provenmap-integration/references/recurring-runs.md`).
Nobody answers a prompt, and every run is recorded on the platform and shown on the board's
binding.

1. **Open the run first**, before the command's step 0:
   `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-status.js --scheduled-run begin --command monitor`. Its JSON
   carries the run's `runId`, which every push the run makes then carries. A failure here never
   stops the run.
2. **A prompt becomes a stop.** The connect-now offer, the branch-mismatch prompt, the
   `--propose-work-items` choice (unattended runs pass it) and the mapping prompt of Step 3 are not
   asked: each unmet gate stops the run — relay the CLI's `error` verbatim — and goes to step 3.
3. **Outcome:** `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-status.js --brief --command monitor --facts '{"mode":"scheduled","outcome":"<outcome>","reasonText":"<error>"}'`.
   `outcome` is `up_to_date` when the correlation found no new signal and nothing was pushed,
   `refreshed` when Step 5 pushed an insight batch, and `stopped` on any exit that ends the run
   early. `reasonText` is the stopping CLI's `error` line verbatim, and only for `stopped` (omit
   the key otherwise). Status checks both against the run's allowed values and records the run; the
   brief's `scheduledRun` says what was recorded. Name a stopped run's reason in the Outcome, with the
   one-line fix.

