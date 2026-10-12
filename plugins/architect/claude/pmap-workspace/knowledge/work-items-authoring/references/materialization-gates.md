# The materialization gates — duplicate, already-implemented, sequencing

Three checks against the existing work item estate, run after the holistic sweep and before
anything is proposed for landing. Facts come from reads; the architect decides every outcome
via AskUserQuestion — never silently drop, merge, or reorder. A gate left unresolved fails
the pre-land self-review: nothing materialises past an open gate.

## One read pass, three gates

- `list_work_items` with `scope: 'tree'` on each target board — every state, terminal included.
- `get_work_item` on the handful whose anchors or names overlap the candidate set.
- The sweep's aspect fan-out (`get_node_aspects` results) — reuse it, don't re-read.

## Gate 1 — duplicate

Compare the draft against non-terminal work items (draft, open, assigned, in_progress,
needs_clarification). Any one signal flags a suspect:

- **Anchor overlap** — shares ≥1 anchor slug with the draft.
- **Same verb, same element** — both change/add/fix/remove the same slug.
- **Name similarity** — the two names describe the same outcome in different words.

Flagged → compact table (slug, state, shared elements, one-line what-it-does), then ask —
question phrasing per the interview bank's "Conflict resolution" section:

- **Merge** — enrich the existing work item via `update_work_item` instead of creating.
- **Supersede** — create the new one; its narrative names the superseded slug, and the old
  work item is flagged for the architect to reject (rejecting reverts its staged changes).
- **Proceed as distinct** — the narrative says why they are not the same thing.

Name the consequence when asking: conflicting open work items are withheld from developer pulls.

## Gate 2 — already implemented

The ask may already be built. Two probes:

- **Delivery ledger** — terminal `implemented` work items whose anchors overlap the draft's.
  `implemented` without `verifiedAt` is the developer's claim, not the server's proof — say
  which one you are looking at.
- **Aspect reality** — the aspect rows the sweep surfaced: does the endpoint / page / table /
  channel the ask wants to _add_ already exist? An `add` on an existing row is the strongest
  already-built signal.

Hit → ask: **modification** (the behavior exists and should change — the directive's verb
becomes _change_, and the narrative references the existing behavior and why it changes) or
**duplicate** (the ask is already satisfied — stop; name the existing work item and its state;
nothing lands)?

## Gate 3 — sequencing

From the same `list_work_items` read: open work items on overlapping or adjacent elements that this
draft plausibly depends on or unblocks. Ask only when candidates exist — skip freely
otherwise: must this land **after** one of these?

Record the answer as `dependsOnSlugs` on the `create_work_item` payload — every predecessor,
`"<workItemSlug>"` on this board or `"<boardSlug>/<workItemSlug>"` on another board under the same
root. The server resolves each ref (an unknown ref fails the create rather than silently
dropping the ordering) and `get_work_item` returns the set resolved — ref, name, status. On an
existing work item, `update_work_item` replaces the set with new refs or clears it with
`dependsOnSlugs: []`. When the _reason_ for the ordering is worth keeping, one line in the
narrative says why.

A "this must land BEFORE `work-item-y`" answer is the same fact authored from the other side:
add this work item to `dependsOnSlugs` on `work-item-y` via `update_work_item`. Sequencing is plan
metadata, so that edit is allowed at any status — a locked or delivered work item can still be
re-threaded into the plan.
