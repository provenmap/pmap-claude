---
name: adr-adoption
description: How to adopt an architecture decision (ADR) into ProvenMap and measure the estate against it — the /adopt-adr arc. Use when the org has made a decision, standard, or policy that boards should be governed by and checked against. Key capabilities: ADR normalization, blast-radius sweep per aspect family, the decision grill, the Decision work item (the ADR), compliance insight batches, federated per-app remediation work items.
---

# ADR Adoption

An adopted decision becomes three things: a **Decision work item** (the ADR itself — the rule,
its context and where it applies, with its own lifecycle and `ADR-n`), a **compliance insight batch** per affected app (the _is_ — where the
estate violates it today), and **remediation work items** (the _ought_, as work that can actually
be delivered and confirmed). Work items are per-board and cross-board anchors are inert, so a
cross-cutting ADR **federates**: per-app work items landed together in the working copy and
committed as one decision.

The split matters: the ADR holds the _standing_ rule, which never "completes" (it is accepted,
and later deprecated or superseded, never pulled as a task); the remediation work items hold the
_bounded_ work each app owes to comply, which does. Do not try to express a
standing rule as a work item that can never reach Implemented.

## 1 — Intake: normalize the decision

Normalize the material (prose, a pasted ADR, a session file) into Context / Decision /
Consequences / Alternatives-considered. Ask for what's missing — never invent. The decision
itself must compress to **one active-voice sentence**; if it can't, it's more than one ADR —
split.

## 2 — Scope the blast radius

From the decision, determine the affected apps (root landscape + `get_board_tree`). Per app,
sweep the elements the decision governs — spine nodes/edges plus the relevant aspect families:

| Decision shape                | Sweep                               |
| ----------------------------- | ----------------------------------- |
| Gateway / API standard        | `api.endpoint` rows + edge topology |
| Data residency / retention    | `db.table` rows                     |
| UI consent / accessibility    | `ui.page` rows                      |
| Eventing / messaging standard | `event.channel` rows + async edges  |
| Access control                | `authz.registry` rows               |

Default depth: each affected app board **plus one layer down**; full tree only on explicit
request (deeper detail rarely changes an ADR verdict, and the list caps bite). Classify every
swept element: compliant / violating / unclear.

## 3 — The grill

Bounded rounds (2–4 questions each): decision crispness (the one sentence); drivers (why now);
applicability scope (which apps, which element classes — this becomes the work item wording);
exceptions & grandfathering (violations the architect explicitly accepts); migration stance
(fix-now vs comply-on-next-touch); supersedes check (`list_work_items {statuses: ["decision"]}` on
the root and the affected apps for an existing ADR on this ground, `get_decision` on it for its
ADR-n and status, and `list_work_items` per affected app — does open work already cover this
ground?).

## 4 — Write the ADR

`create_work_item {type: "decision", …}` writes the ADR, born as a draft with its `ADR-n` (the
reply names it):

- `workBoardSlug` — where the decision lives: the root for a landscape decision, the app board
  for one app's. An ADR may live on any board; it needs no repository binding.
- `name` — the decision in one active-voice sentence (§1), without an `ADR:` prefix: the number
  travels beside it.
- `description` — what it is, in a line; `narrative` — Context, the alternatives weighed,
  Consequences; `directive` — what code must honour, as the implementer will read it.
- `anchors` — the elements it governs, each with a note on why: the compile matches a
  repository's work to the decision by them, so an unanchored ADR reaches no code.
- `supersedes` — `"ADR-n"` of the decision it replaces, when there is one.

When the record is written, `propose_decision {decision: "ADR-n"}` puts it forward. No tool
accepts, rejects or deprecates: the owner settles it in the platform, and once accepted its words
are frozen (a change is a superseding ADR). Accepting a decision that names what it supersedes
retires the old one. Each repository then pulls the accepted ADRs that govern it with the code
plugin's `/decisions`. Every remediation work item below carries `decision: "ADR-n"` so the
work points back at the rule it serves.

## 5 — Record the assessment

Where the sweep found violations: `create_insight` per swept app — insights anchored to the
violating elements, severity from the grill (exceptions the architect accepted are recorded as
observations, not violations), a `proposal` on the insight where the fix is graph-shaped. Draft
batches.

## 6 — Land the remediation, federated

`create_epic {name: "ADR: <title>", description: <the normalized record>}` first: the epic is
what holds a cross-cutting decision's per-app work together as one plan, and every remediation
work item below is filed under it (`epicSlug` on `create_work_item`; `set_work_item_epic` after
`promote_insights`). A single-app ADR still gets its epic when more than one work item lands.

The writes join the working copy automatically. Two paths, both producing draft work items:

- **From the assessment** — `promote_insights` on the reviewed violation insights (one
  draft work item each, origin-linked, so insight coverage stays derived). This is the default
  where the sweep found concrete violations.
- **Authored directly** — `create_work_item` per affected **code-bound** app board, named
  `ADR: <title>`, `type` from the work's shape (usually `refactor`, `fix` where the sweep found
  wrong behaviour), description = the normalized record (identical across apps) plus that app's
  applicability, directive = that app's **enforceable consequences**, element-grounded by slug.
  Use this where compliance requires work the sweep cannot see as an insight. Pre-flight each
  payload with `--validate work-item`. Set `decision` to the `ADR-n` from §4
  (and `update_work_item` the promoted ones the same way).

A single-app ADR degenerates to one work item. Affected but **unbound** boards: name them, skip
them, narrate the binding gate (work items need a code-bound board).

## 7 — Hand off

Enrich each generated draft via the work-items-authoring loop (anchor notes are what the implementer
reads), then the closing move: preview → commit. Not now → `/insights` (review batches),
`/work-items` (release the drafts). Every stop names the next command.

The arc: _decision in → durable record + measured compliance + per-app remediation queue out_ —
all reviewable drafts.
