# Use Cases — what `/monitor` can watch

A **watch** is one question asked of one or more sources on every run, and it produces exactly
one stat (the *Stat* section below): which systems are failing, where
the cloud bill moved, which issues sit on which nodes. `/monitor setup` offers the watches below
and writes the chosen ones into `.provenmap/monitoring/config.json`; a watch the catalogue does
not hold is described by the user and saved as a **custom watch** (last section).

Every watch, catalogue or custom, answers the same six points. They are the whole contract
between a source and the correlator:

| Point | Rule |
| --- | --- |
| **Source** | An MCP server, the `gh` or `aws` CLI, or an exported file; a watch may read several. Connect lines and auth are in `vendor-recipes.md`. |
| **Pull** | What to ask the source for, inside the window, capped at the watch's `limit` (default 25 signals, highest severity first). |
| **Id** | The source's own fingerprint, `<vendor>:<fingerprint>` — the same problem has the same id on every run. |
| **Kind and severity** | One of the signal kinds, and a severity read from the source's own levels. |
| **Measurement** | The one number that says how much: a count, a spend delta, an age. |
| **Locators** | How the signal finds its node, most specific first. |

## One run, every watch

A push replaces the unreviewed insights of every earlier `/monitor` push on the board. So a run
pulls **every** configured watch into the one signals file and pushes once. Never push one watch
alone: the others' insights would be removed with nothing to replace them. A finding keeps its
row across runs (its `key` is the signal id) and a stats insight keeps its row (`watch:<id>`);
a keyed row the new push does not name is still deleted, so the every-watch rule holds. For the same reason
a watch whose source cannot be reached stops the run before the push (the stop names the watch
and its connect line); it is never skipped.

## The config

```json
{
  "version": 1,
  "insightSkillSlug": "operational-signals",
  "windowDays": 7,
  "watches": [
    {
      "id": "failing-systems", "useCase": "failing-systems", "source": "sentry", "scope": "project web-app",
      "stat": { "label": "Errors", "type": "value", "format": { "kind": "count", "unit": "events" }, "aggregate": "sum" }
    },
    {
      "id": "cloud-cost", "useCase": "cloud-cost", "source": "aws", "thresholdPercent": 20, "minimumAmount": 10,
      "stat": { "label": "Cloud cost", "type": "value", "format": { "kind": "money", "currency": "USD" }, "aggregate": "sum" }
    },
    {
      "id": "issues-on-nodes", "useCase": "issues-on-nodes", "source": "github", "scope": "acme/web-app", "limit": 40,
      "stat": { "label": "Open issues", "type": "list" }
    }
  ]
}
```

`id` is unique in the file. `scope` is the part of the source to read (a Sentry project, a
GitHub repo, an AWS account's cost tag), in the user's own words. A config written before
watches existed has `sources[]` and no `watches[]`: run each source by its vendor recipe, as
before. A watch with no `stat` produces findings and no stats insight.

## Stat

The `stat` block is the watch's one stat: what is measured and how its chip is drawn. Each
signal the watch pulls sets `"watch": "<the watch id>"`; the correlator groups them by node and
builds the stats insight (`key` `watch:<id>`) with no model step. A node may carry several stats,
one per watch that reaches it.

| Field | Rule |
| --- | --- |
| `label` | Required, at most 24 characters: what is measured, in a word or two ("Errors"). |
| `type` | Required: `value` (a number per node), `list` (a node's top signals) or `status` (a state per node). |
| `format` | `value`: required. `list`: optional, writes the items' values. `status`: not allowed. `{ "kind": "count", "unit"? }`, `{ "kind": "money", "currency": "USD" }` (ISO code in capitals, value in major units), `percent` (0 to 100), `duration` (milliseconds), `bytes`, or `{ "kind": "number", "unit": "req/s" }`. A unit is at most 12 characters. |
| `display` | `value` only: `number` (default), `bar` or `ring`. |
| `aggregate` | `value` only: `sum` (default), `count` or `max`, of the signals' `measurement.value` on a node. Under `sum` a signal without a measurement adds 0, and a watch where no signal has one counts signals instead. |
| `max` | `value` with `bar` or `ring`: the full scale. Required unless `format.kind` is `percent`; not allowed with `number`. |

Readings per node: a `value` carries the aggregate, a `baseline` (the sum of the signals'
`measurement.baseline`, only under `sum` and only when every signal on the node has one), a
`trend` when all its signals agree, and a tone from the worst severity. A `list` carries the top
5 signals by `measurement.value` and the count of all. A `status` is `down` for a `critical`
signal, `degraded` for `high` or `medium`, else `ok`. A stat holds 200 nodes; the largest are
kept and the run says how many were left out. A bad `stat` stops `--correlate` with the watch's
id and the fix; relay it, edit the config and rerun.

## Failing systems — Sentry

- **Question:** which nodes are throwing errors in production, and is it getting worse?
- **Recipe:** *Sentry* in `vendor-recipes.md`, unchanged. Stack frames are `code-path`
  locators, so most signals land on a node with no mapping to confirm.
- **Stat:** `{ "label": "Errors", "type": "value", "format": { "kind": "count", "unit": "events" }, "aggregate": "sum" }`.
- **Cadence:** daily.

## Cloud cost — AWS

- **Question:** which nodes cost more than they did, and by how much?
- **Recipe:** *AWS costs* in `vendor-recipes.md`. A service is a signal when its rise over the
  prior period meets both `thresholdPercent` (default 20) and `minimumAmount` (default 10).
- **Scope:** a bill covers the whole account, and a board covers one repo. Costs of resources
  another repo owns stay board-level here, tagged `unmatched`; map each to `null` once so later
  runs leave them out, or set `scope` to a cost allocation tag that names this repo's resources.
- **Binding:** cost lines name services and resources, not files, so expect the first run to
  end in proposals. Each confirmed one is written to the map and never asked again. A cost
  allocation tag that names the component (set `scope` to the tag key) makes the match exact.
- **Stat:** `{ "label": "Cloud cost", "type": "value", "format": { "kind": "money", "currency": "<the bill's currency>" }, "aggregate": "sum" }`.
  Each signal's `measurement.baseline` is the prior period's spend, so a node shows the change.
- **Cadence:** weekly; cost data settles a day late, so a daily run mostly repeats itself.

## Issues on nodes — GitHub

- **Question:** which nodes have open issues against them, and how long have they waited?
- **Recipe:** *GitHub issues* in `vendor-recipes.md`. One signal per open issue touched inside
  the window, kind `issue`.
- **Binding:** a file path quoted in the issue body is a `code-path` locator; an area or
  component label is a `service` locator. An issue with neither stays board-level, tagged
  `unmatched`, until a mapping is confirmed for its label.
- **Stat:** `{ "label": "Open issues", "type": "list" }`.
- **Cadence:** daily.

## A custom watch

For a source or a question the catalogue does not hold. The user describes it in a sentence
("Stripe disputes by product", "slow queries from the RDS log"); you turn that into the six
points and prove it before saving:

1. **Find the source.** A connected MCP tool, `gh`, `aws`, or a file the user exports. None of
   them reaches it → stop and say which connection would; never ask for a token in the chat.
2. **Draft the six points and a `stat`** from a first small pull (a handful of rows). The id must be the
   source's own fingerprint. If the source has none, the watch cannot be saved: rows would
   pile up as new insights on every run. Say so and stop.
3. **Dry run.** Write the sample as a signals file to
   `.provenmap/monitoring/dry-run.signals.json` and correlate it to
   `.provenmap/monitoring/dry-run.skeleton.json` with the Step 3 command of `run-workflow.md`.
   It pushes nothing. Show the user the sample signals, how many matched a node, the
   proposals, and the `stat` you propose.
4. **The user confirms** (AskUserQuestion: save the watch, change it, or drop it). The same
   confirmation picks the stat's type (value, list or status) and, for a value, its display
   (number, bar or ring); propose one and let them change it. On save,
   append it to `watches[]` with `"useCase": "custom"`, the confirmed `stat` and a `recipe`
   string holding the six points as you drafted them; later runs follow that string as they
   follow a vendor recipe. Every signal the recipe produces sets `watch` to the watch's `id`.
   Confirmed proposals go to the map as in Step 3.

A custom watch that outgrows one repo belongs in `vendor-recipes.md`: adding a recipe there
needs no code change.
