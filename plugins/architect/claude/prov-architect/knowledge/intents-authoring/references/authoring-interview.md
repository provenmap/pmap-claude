# The authoring interview — question bank

Dimensions and question templates for the intent grill — the round that turns "we should do X"
into an intent a developer can implement without coming back to ask. Pick 2–4 per round driven
by what the material *lacks* — never run the whole bank as a form. Use AskUserQuestion for
closed choices; free text for open ones. Stop at the done-bar (a why worth reading later + a
directive naming its elements by slug + a note per anchor, no unresolved conflicts).

## Actors & triggers

- Who initiates this — which user types or systems? (Ground in `actor` nodes if the landscape
  has them.)
- What event starts the flow: a user action, a schedule, an inbound message?
- Who consumes the result?

## Done-bar

- How would a reviewer *verify* this is done — what observable behavior changes?
- What's the failure behavior when the happy path can't complete?
- Any measurable threshold (latency, volume, accuracy) that makes this testable?

Fold the answers into the directive as the end state each named element must reach. A
remove/modify answer that NAMES its element by slug is machine-checkable — a later push can
prove it, which is what turns Implemented into Proven. Prose-only answers close on resolution
instead, so spend the extra question where a slug is available.

## Element grounding

- Which spine components does this touch? (Propose candidates from the board by slug — confirm,
  don't guess.)
- Which aspect rows — pages (`ui.page`), endpoints (`api.endpoint`), tables (`db.table`),
  channels (`event.channel`), authz entries (`authz.registry`)?
- Does any part of this belong to a *different* app board? (Split — an intent is single-board.)

## Integration touchpoints

- Does this change what `<sibling-system>` sends or receives? (Name siblings from the root
  landscape.)
- Any contract change an external consumer would notice?

## Non-functionals

- Performance, volume, or latency expectations worth writing down?
- Security/permission boundaries: who must NOT be able to do this?
- Data retention/residency implications?

## Out of scope

- What adjacent work are we explicitly NOT doing here? (One line in the description prevents
  the scope from creeping in review.)

## Conflict resolution (from the surround pull)

- "Open intent `<intent-slug>` already touches `<elements>` — extend it, supersede it, or keep
  both?" (Genuine decision point: AskUserQuestion.)
- "`<intent-slug>` is sitting in `needs_clarification` on the same elements — does this
  supersede it, or should we revise that one instead?"
