# The authoring interview — question bank

Dimensions and question templates for the spec grill. Pick 2–4 per round driven by what the
material *lacks* — never run the whole bank as a form. Use AskUserQuestion for closed choices;
free text for open ones. Stop at the done-bar (statement + ≥1 acceptance + named elements per
requirement, no unresolved conflicts).

## Actors & triggers

- Who initiates this — which user types or systems? (Ground in `actor` nodes if the landscape
  has them.)
- What event starts the flow: a user action, a schedule, an inbound message?
- Who consumes the result?

## Acceptance (per requirement)

- How would a reviewer *verify* this is done — what observable behavior changes?
- What's the failure behavior when the happy path can't complete?
- Any measurable threshold (latency, volume, accuracy) that makes this testable?

## Element grounding

- Which spine components does this touch? (Propose candidates from the board by slug — confirm,
  don't guess.)
- Which aspect rows — pages (`ui.page`), endpoints (`api.endpoint`), tables (`db.table`),
  channels (`event.channel`), authz entries (`authz.registry`)?
- Does any requirement belong to a *different* app board? (Split — specs are per-board.)

## Integration touchpoints

- Does this change what `<sibling-system>` sends or receives? (Name siblings from the root
  landscape.)
- Any contract change an external consumer would notice?

## Non-functionals

- Performance, volume, or latency expectations worth writing down?
- Security/permission boundaries: who must NOT be able to do this?
- Data retention/residency implications?

## Out of scope

- What adjacent work are we explicitly NOT doing here? (One line in the narrative prevents the
  scope from creeping in review.)

## Conflict resolution (from the surround pull)

- "`<spec-slug>` already covers `<topic>` — extend it, supersede it, or keep both?" (Genuine
  decision point: AskUserQuestion.)
- "Open intent `<intent-slug>` touches the same elements — does this spec change what it should
  deliver?"
