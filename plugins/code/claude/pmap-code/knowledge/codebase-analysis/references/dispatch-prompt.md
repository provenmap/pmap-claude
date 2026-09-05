# Build board `{{childBoardSlug}}`

You are running in **layer-board mode** (see your own agent instructions for the full
methodology — this prompt carries only the facts and the steps for THIS unit). This
invocation is **non-interactive**: never ask a question, never wait for approval, decide and
proceed.

## Your unit

- Unit id: `{{unitId}}`
- Board to build: `{{childBoardSlug}}` — "{{displayName}}"
- Layer: L{{layer}} (parent is L{{parentLayer}})
- Parent board: `{{parentBoardSlug}}`, carried by node `{{parentNodeSlug}}`
- Scope: {{scopeDirs}} ({{memberCount}} file(s), {{weight}} significant)
- Working directory: `{{workingDir}}`
- Model to stamp in `metadata.analyzedBy`: `{{model}}`
- Node archetypes available: {{nodeArchetypes}}
- Edge archetypes available: {{edgeArchetypes}}

Child units this board must carry as opaque nodes (copy `coveredFiles` verbatim — never
re-derive them):

```json
{{childrenJson}}
```

Files this board must claim through its own nodes (`ownFiles`, {{ownFilesCount}} total —
truncated list; re-run `--scope-unit {{childBoardSlug}}` for the full one if you need it):

```
{{ownFilesList}}
```

## Steps

Run every command from `{{pluginRoot}}/scripts/pmap-prepass.js` against `{{workingDir}}`:

1. `--scope-unit {{childBoardSlug}}` — writes `.provenmap/skeletons/{{childBoardSlug}}.json`
   (this unit's scoped skeleton) and prints the unit read again (unit/children/ownFiles) —
   confirm it matches the facts above before you continue.
2. `--group-plan --layer {{layer}} --skeleton .provenmap/skeletons/{{childBoardSlug}}.json` —
   read `budgetVerdict` before authoring anything and state this board's grain (container-grade
   or terminal) in one sentence appended to `metadata.description`. This plan decides
   containers and dissolves only: a `"drill-down"` verdict here is evidence for depth beyond
   this unit, never a mark — see step 7.
3. `--detail <area> --skeleton .provenmap/skeletons/{{childBoardSlug}}.json` for any cluster
   you are inlining on this board (never for a child unit above — those stay opaque).
4. **Author the board JSON** at `.provenmap/boards/{{childBoardSlug}}.json`: one opaque node
   per child unit (`slug` = the unit's `nodeSlug`, `layerBoardSlug` = the unit's `slug`,
   `coveredFiles` copied verbatim), your own nodes claiming every file in `ownFiles`
   (directory globs preferred), `metadata.planUnitId: "{{unitId}}"`,
   `metadata.parentBoardSlug: "{{parentBoardSlug}}"`,
   `metadata.parentNodeSlug: "{{parentNodeSlug}}"`, `metadata.layer: {{layer}}`,
   `analyzedAtCommit` from `git rev-parse HEAD`, and
   `metadata.analyzedBy: { "mode": "agent", "model": "{{model}}" }`.
5. `--claim-check .provenmap/boards/{{childBoardSlug}}.json --skeleton
   .provenmap/skeletons/{{childBoardSlug}}.json` — exit 3 (a file claimed twice) is the one
   hard defect; fix and re-run. An unclaimed file is debt: claim it, waive it with an exact
   path, or leave it and say so in your summary.
6. `--rollup {{childBoardSlug}} --apply --skeleton
   .provenmap/skeletons/{{childBoardSlug}}.json` — the script merges the deterministic
   `imports` edges; re-read the board JSON afterward (the script rewrote it). Add the semantic
   edges the rollup cannot see (`db_read`, `api_call`, `publishes`, cross-service calls) by
   reading the files involved, and reclassify a rollup edge's `type` where your reading shows
   the real relation.
7. **No new marks — propose instead.** Never set `layerBoardSlug` on a node that is not one of
   the child units listed above. A cluster you would drill down further belongs in
   `metadata.proposedDrillDowns: [{ "nodeSlug": "...", "reason": "..." }]` — the tree plan,
   not this agent, decides whether it becomes a board.
8. `--board-report {{childBoardSlug}}` — fix per `errors[]` until `gate.valid: true`, then
   settle every advisory until `unresolvedAdvisories` is 0: `A-CONTAINER-CEILING` → split the
   container by coupling, keep it inline with a `Drill-down rationale: …` line, or record the
   depth in `metadata.proposedDrillDowns`; `A-BUDGET` → a `metadata.gateOverrides` rationale,
   or split/merge containers; `A-CONTAINER-DENSITY` → restructure the container's children or
   propose the depth. This board is not done at any nonzero `unresolvedAdvisories`.
9. Author this board's styling: `--style-signals {{childBoardSlug}}` → write
   `.provenmap/styling/{{childBoardSlug}}.plan.json` from the signals → `--validate-styles
   --file .provenmap/styling/{{childBoardSlug}}.plan.json --against <signalsPath>` (max 2
   rounds; on repeated failure delete the plan and continue unstyled).

## Hard boundaries

Write ONLY `.provenmap/boards/{{childBoardSlug}}.json`,
`.provenmap/skeletons/{{childBoardSlug}}*.json`, and
`.provenmap/styling/{{childBoardSlug}}.plan.json`/`.signals.json`. Never write
`manifest.json`, `tree-plan.json`, `plan-run.json`, `{{parentBoardSlug}}.json`, or any other
board's files. Never run `pmap-prepass.js --coverage` or `--auto-plan`. Never run `/sync` or
any push. Never create a server-side board stub, and never stamp anything on the parent
board — its carrying node already exists.

## Reply

Return one short summary: board slug, grain (container-grade with N drill-downs, or
terminal), node/edge counts, gate status (pass, or fail + why), unresolved advisories (0, or
what you overrode/proposed and why). Nothing else.
