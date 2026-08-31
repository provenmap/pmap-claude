# Insight Shaping — making insights intent-ready

When an architect promotes an insight, the platform maps it **mechanically** onto an intent — so
insight quality IS intent quality. Each one is an `InsightDraft`. The exact mapping:

| Insight field | Becomes on the intent | Authoring rule |
|---|---|---|
| `name` | intent **name** | Imperative work item: "Fix TypeError in CheckoutSession.finalize" — never "Error observed in checkout" |
| `insight` | description + directive ¶1 | Evidence only: what fails, where, how often, since when. No opinions. |
| `advice.text` (kind: `"recommendation"`) | directive ¶2 | **The concrete corrective action a developer executes.** Use `recommendation` for all actionable insights. |
| `advice.text` (kind: `"context"`) | directive ¶3 | Blast radius, related deploys, trend notes. Use `context` for `unmatched`/pure-observation insights — never both kinds. |
| `trail` stops | intent **anchors** | The trail's entry stop (and nearby stops) are the primary anchors. Anchors are what `/intents --show` resolves back to source files — keep the trail tight. |
| `priority`, `advice.effort` | carried verbatim | **Set both on every actionable insight.** `effort` lives inside `advice` (kind: `"recommendation"`). |
| `id` | — | Local to the skeleton: it groups a signal across runs on this machine and never reaches the wire. The platform mints the ids promotion uses. |

## Per-insight checklist (skeleton → intent-ready)

1. **Verify before claiming.** Read the matched node's source (from its `sourceReferences` /
   the signal's stack frames). Only upgrade `confidence` to `verified` after reading the code;
   if the match looks wrong, say so in `advice.text` (kind: `"context"`) and leave confidence at `likely`/`inferred` —
   or fix the mapping via the teach-once loop instead of shipping a mis-anchored insight.
2. **Name = the work.** ≤100 chars, imperative, specific.
3. **Insight = the evidence.** Counts, window, sample error, users affected. The measurement
   carries the primary number; the prose carries the story.
4. **advice (recommendation) = the directive.** One concrete action ("Guard `session.customer` against
   null before `finalize()`; add the regression test"), not a category ("improve error handling").
5. **advice.effort** from scope of the fix: `trivial` (guard/config), `small` (one component),
   `medium` (component + tests + migration), `large`/`epic` (cross-component).
6. **Priority**: keep the skeleton's severity-derived value unless evidence changes it. Escalate
   one level when the trend is `increasing` across runs, when `usersAffected` is material, or for
   cost signals whose delta exceeds the configured threshold multiple times over.
7. **Carry the skeleton through.** `tags` and `measurement` were derived by the correlator from
   the signal — leave them exactly as found (as with `id` above). Rewriting them breaks the
   cross-run grouping and the one primary number that goes on the wire.

## Trails and proposals — only when they earn their place

- **Multi-stop trail** (blast radius): for `critical` insights on high-fan-in nodes, extend the
  trail 2–4 stops using the context pack's `edges`/`degree` (ground every consecutive stop pair
  against `pack.edges`; `via: { kind: "edge", edge: "<slug>" }` for each hop). This is what
  makes the portal overlay explain impact. Branches share the same `from` value; label each with `branchLabel`.
- **Proposal**: only when signals reveal a **structural** truth the board is missing — a
  recurring timeout on a dependency that has no edge, a resource generating cost with no node.
  Set `proposal: { action: "add", targetType: "node"|"edge", ... }` on the insight and mark the
  new node as `proposed: true` in the trail. Never propose structure to "fix" a mapping problem —
  that is what `map.json` is for.

## Unmatched insights

Keep them (they are real production facts), leave `advice` empty or set `kind: "context"` with
what would anchor them next run — usually one `map.json` entry or a tag on the node. If the same
signal stays unmatched across runs, propose the mapping to the user again with the accumulated
evidence.
