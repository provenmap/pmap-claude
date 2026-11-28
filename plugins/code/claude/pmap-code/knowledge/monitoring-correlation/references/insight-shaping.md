# Insight Shaping — making insights work-item-ready

When an architect promotes an insight, the platform maps it **mechanically** onto a work item — so
insight quality IS work item quality. Each one is an `InsightDraft`. The exact mapping:

| Insight field | Becomes on the work item | Authoring rule |
|---|---|---|
| `name` | work item **name** | Imperative work item: "Fix TypeError in CheckoutSession.finalize" — never "Error observed in checkout" |
| `insight` | description + directive ¶1 | Evidence only: what fails, where, how often, since when. No opinions. |
| `advice.text` (kind: `"recommendation"`) | directive ¶2 | **The concrete corrective action a developer executes.** Every signal insight is a `risk`, so every one takes a `recommendation`: the push refuses `context` on a risk. |
| `advice.text` (kind: `"context"`) | directive ¶3 | Only on the script-built `stats` insight, which you never edit. Blast radius, related deploys and trend notes go in `insight` or `impact`. |
| `trail` stops | work item **anchors** | Every stop becomes an anchor and its `note` the anchor's note. Anchors are what `/work-items --show` resolves back to source files. The script builds the trail from the chain you read in the code (`run-workflow.md` 4a–4b); you never edit its stops. |
| `priority`, `advice.effort` | carried verbatim | **Set both on every actionable insight.** `effort` lives inside `advice` (kind: `"recommendation"`). |
| `key` | — | The signal's fingerprint: the row keeps its identity across runs. Carry it unchanged. |
| `stats` | — | Only on the script-built insight tagged `stats`. Carry it unchanged; never edit that insight. |

## Per-insight checklist (skeleton → work-item-ready)

1. **Verify before claiming.** You read the failing code and its callers for the trace
   (`run-workflow.md` 4a). Set `confidence` to `verified` only where that code shows the failure;
   if the match looks wrong, fix the mapping via the teach-once loop instead of shipping a
   mis-anchored insight — or, when it stays uncertain, leave confidence at `likely`/`inferred` and
   say so in `insight`.
2. **Name = the work.** ≤100 chars, imperative, specific.
   `insight` and `advice.text` are each at most 500 characters: the push refuses a longer one.
3. **Insight = the evidence.** Counts, window, sample error, users affected. The measurement
   carries the primary number; the prose carries the story.
4. **advice (recommendation) = the directive.** The skeleton's advice is a placeholder that says
   "Not written yet" — replace it on every insight; the push refuses it. One concrete action ("Guard `session.customer` against
   null before `finalize()`; add the regression test"), not a category ("improve error handling").
5. **advice.effort** from scope of the fix: `trivial` (guard/config), `small` (one component),
   `medium` (component + tests + migration), `large`/`epic` (cross-component).
6. **Priority**: keep the skeleton's severity-derived value unless evidence changes it. Escalate
   one level when the trend is `increasing` across runs, when `usersAffected` is material, or for
   cost signals whose delta exceeds the configured threshold multiple times over.
7. **Carry the skeleton through.** `tags` and `measurement` were derived by the correlator from
   the signal — leave them exactly as found (as with `key` above). Rewriting them breaks the
   cross-run grouping and the one primary number that goes on the wire.

## Trails and proposals — only when they earn their place

- **The trail is the path the failure travels**, and the script draws it: your part is the chain
  of files in `traces.json`, read from the code. The script joins the nodes those files belong to
  along `pack.edges` and the drill-downs between boards, so every hop shown is one the board
  draws. Two nodes the code joins and the board does not are a jump, listed in `traceGaps[]`.
  Trace every finding the code lets you trace, whatever its priority: a path does not wait for
  `critical`. Do not add dependents the chain never touched to show "blast radius" — a stop is a
  file you read.
- **Proposal**: only when signals reveal a **structural** truth the board is missing — a call in
  `traceGaps[]` to a real dependency that has no edge, a resource generating cost with no node.
  Set `proposal: { action: "add", targetType: "node"|"edge", ... }` on the insight and mark the
  new node as `proposed: true` in the trail. Never propose structure to "fix" a mapping problem —
  that is what `map.json` is for.

## Unmatched insights

Keep them (they are real production facts). They are still risks, so they still recommend: the
action is what anchors them next run — usually one `map.json` entry or a tag on the node, named
exactly — plus where to look meanwhile, with `effort: "trivial"`. If the same
signal stays unmatched across runs, propose the mapping to the user again with the accumulated
evidence.
