---
name: specs-authoring
description: How to draft ProvenMap specs and promote their requirements into delivery — the requirement layer upstream of intents. Use when capturing what the org wants, drafting a spec from conversation or a bound document, running the /author-spec interview, checking delivery coverage, or promoting approved requirements. Key capabilities: the spec funnel, routing and mode detection, the surround pull and the grill, binding-gate narration, provenance from source documents, requirement grouping, live delivery coverage.
---

# Specs Authoring

<!-- Distilled from platform services/prompts/base/facet-prompt-fragments.ts
     (buildSpecsFragment) — platform vocabulary carried verbatim where quoted. -->

## What a spec is

**A spec is what the org WANTS — the requirement, upstream of any intent. Intents are how it
gets delivered; code is what makes it true.**

## The funnel

1. A spec is **drafted** — `create_spec`, from the conversation or from a bound document read
   with `get_source_content` (pass its source id as `draftedFromSourceId` for provenance).
2. A human reviews and **APPROVES** it in the platform.
3. Its requirements are **promoted** into draft intents — `promote_spec_requirements`.
4. Those intents are locked open, pulled, and implemented.

**Only an approved spec can be promoted.** Each group of requirement slugs you pass becomes ONE
intent, so group requirements that a single change would deliver together.

**You draft; humans approve and promote the decision.** Every write lands as a draft for
in-platform review (passive review) — narrate what was staged, never pre-confirm.

## Delivery coverage — read it, don't guess

`get_spec` returns live delivery coverage per requirement — `unpromoted / in_delivery /
delivered / attention` — with the intents linked to each. That linkage is derived from the
intents' origin, never stored on the spec: to ask "is this requirement done?", **read the
coverage, don't guess from the spec text**.

An intent may CITE a spec as context (a spec anchor); it may never change one. A spec is
interpretation, and intents never change interpretation.

## The tools

| Tool | Use |
|---|---|
| `list_specs` | summaries: slug, name, status, requirement count |
| `get_spec` | narrative, requirements + acceptance criteria, live delivery coverage |
| `get_source_content` | full content of a bound non-code source document (PRD, RFC, runbook); may truncate |
| `bind_reference_source` | attach the PRD/RFC being drafted from (web_url or inline_text) as a reference binding — makes it readable via `get_source_content` and citable as provenance |
| `create_spec` | draft a spec; `draftedFromSourceId` carries provenance; each requirement takes `anchors[]` (element grounding by slug) |
| `update_spec` | revise a draft/in-review spec — replace-all requirements; KEEP each requirement's `slug` from `get_spec` to preserve identity and coverage |
| `promote_spec_requirements` | APPROVED spec's requirement groups → draft intents, origin-linked for coverage |

## Drafting from documents

The architect's raw material is often a document — either **bound to the board** (read it with
`get_source_content` — only the readable seven source types, see architect-core; pass its id as
`draftedFromSourceId`) or **dropped into this session** (read it directly with file access).
Either way: extract requirements as discrete, testable statements with acceptance criteria;
name the board elements each requirement concerns by slug; keep the org's own vocabulary.

## The authoring interview (the /author-spec arc)

**1 — Route first (architect-core taxonomy).** Specs are legal only on a code-bound board.
Plain layer → walk up to the app board and say so. Root or no board → this is `/new-app`
territory or a federation (one spec per affected app board, session-linked) — never attempt
`create_spec` where it will 400. Material spanning several apps → propose the per-app split
before drafting.

**2 — Detect the mode.** App board with a populated spine ⇒ **ecosystem** (full surround pull +
grill). Authorable but thin (fresh binding, near-empty canvas) ⇒ **greenfield-lite**: skip the
surround pull, one interview round (actors, acceptance, out-of-scope).

**3 — Surround pull (ecosystem mode).** Batch the reads, then synthesize into a **context brief
of at most one screen** — never dump: this board's spine summary; `list_aspects` (what the spec
will touch); `list_specs` + `get_spec` on overlap candidates (extend vs new vs supersede);
`list_intents` (in-flight collisions); the root landscape for named sibling systems.

**4 — The grill.** Bounded rounds (2–4 targeted questions each, default ~3 rounds; running
draft always visible — keep it in the drafts file so it survives context loss). Ask what the
material *lacks*: actors and triggers; a testable acceptance criterion per requirement; element
grounding (spine nodes / aspect rows by slug); integration touchpoints with named siblings;
non-functionals; explicit out-of-scope; every surround-pull conflict resolved ("`checkout-v2`
already covers refunds — extend or supersede?"). Question bank:
[references/authoring-interview.md](references/authoring-interview.md).

**Done-bar:** every requirement has a statement + ≥1 acceptance criterion + named elements
where applicable, and no unresolved conflicts. Pre-flight the payload before staging:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/prov-architect.js --validate spec --file <draft.json>
```

**5 — Land and hand off.** `create_spec` — with `draftedFromSourceId` provenance and each
requirement's element grounding as `anchors[]` (slugs from the surround pull). Narrate: *staged
as a draft — approve on the Specs screen; promotion is gated on approval.* Later refinement
rounds go through `update_spec` (requirement slugs from `get_spec` preserved — that's what
keeps delivery coverage pointing at the same requirements). Then the intents offer
(AskUserQuestion "Create intents for this now?"): clean path = approve in platform → promote
(keeps derived coverage); urgent slice = directive intents with a spec **context** anchor via
the intents-authoring loop — say plainly coverage won't link them; not now = stop, naming
`/specs` and `/intents`.

**The binding gate — now closable in-session.** On an unbound board, run the interview anyway
(draft in the drafts file), then close the gate instead of narrating a portal trip:
- Material is a document/URL → `bind_reference_source` on the board (a reference binding is
  enough to author) and continue straight to `create_spec`.
- The board's landscape node should be a real repo-backed app → offer `convert_node_to_app`
  (landscape-modeling has the rules), then stage.
- Neither fits or the tools are absent → the classic narration: *"Specs and intents need a
  code-bound board — connect the repository in ProvenMap, then rerun `/author-spec` here."*
Read-only token: same interview, emit the finished spec as markdown, name the `read_write`
requirement.
