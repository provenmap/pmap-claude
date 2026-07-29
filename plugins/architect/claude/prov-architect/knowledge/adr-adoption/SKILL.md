---
name: adr-adoption
description: How to adopt an architecture decision (ADR) into ProvenMap and measure the estate against it — the /adopt-adr arc. Use when the org has made a decision, standard, or policy that boards should be governed by and checked against. Key capabilities: ADR normalization, blast-radius sweep per aspect family, the decision grill, federated per-app specs, compliance insight runs, the remediation handoff.
---

# ADR Adoption

An adopted decision becomes two artifacts: **spec(s)** (the *ought* — enforceable requirements
per affected app) and a **compliance insight run** (the *is* — where the estate violates it
today), whose findings promote straight into remediation intents. Specs are per-board and
cross-board anchors are inert, so a cross-cutting ADR **federates**: one spec per affected app
board, linked by a shared write session.

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
applicability scope (which apps, which element classes — this becomes the requirement wording);
exceptions & grandfathering (violations the architect explicitly accepts); migration stance
(fix-now vs comply-on-next-touch); supersedes check (`list_specs` per affected app — does an
existing `ADR:` spec cover this ground?). Keep the running normalized record in the drafts file
so the interview is resumable.

## 4 — Land, federated

One write session (recorded in the ledger). Per affected **code-bound** app board:
`create_spec` named `ADR: <title>`, narrative = the normalized record (identical across apps),
requirements = that app's **enforceable consequences** — testable, element-grounded by slug.
A single-app ADR degenerates to one spec. Affected but **unbound** boards: name them, skip
them, narrate the binding gate (specs need a code-bound board). Pre-flight each payload with
`--validate spec`.

## 5 — Record the assessment

Where the sweep found violations: `create_insight` per swept app — findings anchored to the
violating elements, severity from the grill (exceptions the architect accepted are recorded as
observations, not violations), suggestions where the fix is graph-shaped. Draft runs.

## 6 — Hand off

AskUserQuestion **"Create remediation intents now?"** → `promote_insight_findings` on the
reviewed violation findings (one draft intent each, origin-linked) → optionally enrich via the
intents-authoring loop. The spec requirements still promote after approval (that path keeps
derived coverage). Not now → `/insights` (review runs), `/specs` (watch approvals).

The arc: *decision in → governed per-app specs + measured compliance + remediation queue out* —
all reviewable drafts.

**The decision's durable home.** Alongside the per-app specs, mint the record its own board:
`create_decision_board {name: "ADR: <title>"}` (durable `adr` type, standalone) and draw/write
the normalized record there — the workspace-level decision log. The per-app `ADR:` specs stay
the *enforceable* form; the decision board is where the record lives and is found. There is no
delete tool for it — durable records retire in the platform. Requirements land
element-grounded: pass each one's `anchors[]` on `create_spec`, and iterate with `update_spec`
(keep requirement slugs from `get_spec` to preserve delivery coverage).
