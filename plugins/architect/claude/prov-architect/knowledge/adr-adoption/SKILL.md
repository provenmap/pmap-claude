---
name: adr-adoption
description: How to adopt an architecture decision (ADR) into ProvenMap and measure the estate against it — the /adopt-adr arc. Use when the org has made a decision, standard, or policy that boards should be governed by and checked against. Key capabilities: ADR normalization, blast-radius sweep per aspect family, the decision grill, the durable decision board, compliance insight runs, federated per-app remediation intents.
---

# ADR Adoption

An adopted decision becomes three things: a **decision board** (the durable record — where the
ADR lives and is found), a **compliance insight run** per affected app (the *is* — where the
estate violates it today), and **remediation intents** (the *ought*, as work that can actually
be delivered and proven). Intents are per-board and cross-board anchors are inert, so a
cross-cutting ADR **federates**: per-app intents landed together in the working copy and
committed as one decision.

The split matters: the decision board holds the *standing* rule, which never "completes"; the
intents hold the *bounded* work each app owes to comply, which does. Do not try to express a
standing rule as an intent that can never reach Implemented.

## 1 — Intake: normalize the decision

Normalize the material (prose, a pasted ADR, a session file) into Context / Decision /
Consequences / Alternatives-considered. Ask for what's missing — never invent. The decision
itself must compress to **one active-voice sentence**; if it can't, it's more than one ADR —
split.

## 2 — Scope the blast radius

From the decision, determine the affected apps (root landscape + `get_board_tree`). Per app,
sweep the elements the decision governs — spine nodes/edges plus the relevant aspect families:

| Decision shape | Sweep |
|---|---|
| Gateway / API standard | `api.endpoint` rows + edge topology |
| Data residency / retention | `db.table` rows |
| UI consent / accessibility | `ui.page` rows |
| Eventing / messaging standard | `event.channel` rows + async edges |
| Access control | `authz.registry` rows |

Default depth: each affected app board **plus one layer down**; full tree only on explicit
request (deeper detail rarely changes an ADR verdict, and the list caps bite). Classify every
swept element: compliant / violating / unclear.

## 3 — The grill

Bounded rounds (2–4 questions each): decision crispness (the one sentence); drivers (why now);
applicability scope (which apps, which element classes — this becomes the intent wording);
exceptions & grandfathering (violations the architect explicitly accepts); migration stance
(fix-now vs comply-on-next-touch); supersedes check (`list_boards` for an existing `ADR:`
decision board, and `list_intents` per affected app — does open work already cover this
ground?). Keep the running normalized record in the drafts file so the interview is resumable.

## 4 — Mint the decision's durable home

`create_decision_board {name: "ADR: <title>"}` (durable `adr` type, standalone) and draw/write
the normalized record there — the workspace-level decision log. This is the record's home: it
is where "what did we decide, and why" is answered six months on. There is no delete tool for
it — durable records retire in the platform.

## 5 — Record the assessment

Where the sweep found violations: `create_insight` per swept app — findings anchored to the
violating elements, severity from the grill (exceptions the architect accepted are recorded as
observations, not violations), suggestions where the fix is graph-shaped. Draft runs.

## 6 — Land the remediation, federated

The writes join the working copy automatically. Two paths, both producing draft intents:

- **From the assessment** — `promote_insight_findings` on the reviewed violation findings (one
  draft intent each, origin-linked, so insight coverage stays derived). This is the default
  where the sweep found concrete violations.
- **Authored directly** — `create_intent` per affected **code-bound** app board, named
  `ADR: <title>`, description = the normalized record (identical across apps) plus that app's
  applicability, directive = that app's **enforceable consequences**, element-grounded by slug.
  Use this where compliance requires work the sweep cannot see as a finding. Pre-flight each
  payload with `--validate intent`.

A single-app ADR degenerates to one intent. Affected but **unbound** boards: name them, skip
them, narrate the binding gate (intents need a code-bound board).

## 7 — Hand off

Enrich each minted draft via the intents-authoring loop (anchor notes are what the implementer
reads), then the closing move: preview → commit. Not now → `/insights` (review runs),
`/intents` (release the drafts). Every stop names the next command.

The arc: *decision in → durable record + measured compliance + per-app remediation queue out* —
all reviewable drafts.
