# The materialization gates — duplicate, already-implemented, sequencing

Three checks against the existing intent estate, run after the holistic sweep and before
anything is proposed for landing. Facts come from reads; the architect decides every outcome
via AskUserQuestion — never silently drop, merge, or reorder. A gate left unresolved fails
the pre-land self-review: nothing materialises past an open gate.

## One read pass, three gates

- `list_intents` with `scope: 'tree'` on each target board — every state, terminal included.
- `get_intent` on the handful whose anchors or names overlap the candidate set.
- The sweep's aspect fan-out (`get_node_aspects` results) — reuse it, don't re-read.

## Gate 1 — duplicate

Compare the draft against non-terminal intents (draft, open, assigned, in_progress,
needs_clarification). Any one signal flags a suspect:

- **Anchor overlap** — shares ≥1 anchor slug with the draft.
- **Same verb, same element** — both change/add/fix/remove the same slug.
- **Name similarity** — the two names describe the same outcome in different words.

Flagged → compact table (slug, state, shared elements, one-line what-it-does), then ask —
question phrasing per the interview bank's "Conflict resolution" section:

- **Merge** — enrich the existing intent via `update_intent` instead of creating.
- **Supersede** — create the new one; its narrative names the superseded slug, and the old
  intent is flagged for the architect to reject (rejecting reverts its staged changes).
- **Proceed as distinct** — the narrative says why they are not the same thing.

Name the consequence when asking: conflicting open intents are withheld from developer pulls.

## Gate 2 — already implemented

The ask may already be built. Two probes:

- **Delivery ledger** — terminal `implemented` intents whose anchors overlap the draft's.
  `implemented` without `verifiedAt` is the developer's claim, not the server's proof — say
  which one you are looking at.
- **Aspect reality** — the aspect rows the sweep surfaced: does the endpoint / page / table /
  channel the ask wants to _add_ already exist? An `add` on an existing row is the strongest
  already-built signal.

Hit → ask: **modification** (the behavior exists and should change — the directive's verb
becomes _change_, and the narrative references the existing behavior and why it changes) or
**duplicate** (the ask is already satisfied — stop; name the existing intent and its state;
nothing lands)?

## Gate 3 — sequencing

From the same `list_intents` read: open intents on overlapping or adjacent elements that this
draft plausibly depends on or unblocks. Ask only when candidates exist — skip freely
otherwise: must this land **after** one of these?

Record the answer as `dependsOnSlugs` on the `create_intent` payload — every predecessor,
`"<intentSlug>"` on this board or `"<boardSlug>/<intentSlug>"` on another board under the same
root. The server resolves each ref (an unknown ref fails the create rather than silently
dropping the ordering) and `get_intent` returns the set resolved — ref, name, status. On an
existing intent, `update_intent` replaces the set with new refs or clears it with
`dependsOnSlugs: []`. When the _reason_ for the ordering is worth keeping, one line in the
narrative says why.

A "this must land BEFORE `intent-y`" answer is the same fact authored from the other side:
add this intent to `dependsOnSlugs` on `intent-y` via `update_intent`. Sequencing is plan
metadata, so that edit is allowed at any status — a locked or delivered intent can still be
re-threaded into the plan.
