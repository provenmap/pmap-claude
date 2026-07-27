---
name: specs-authoring
description: How to draft ProvenMap specs and promote their requirements into delivery — the requirement layer upstream of intents. Use when capturing what the org wants, drafting a spec from conversation or a bound document, checking delivery coverage, or promoting approved requirements. Key capabilities: the spec funnel, provenance from source documents, requirement grouping, live delivery coverage.
---

# Specs Authoring

<!-- Distilled from prov-platform services/prompts/base/facet-prompt-fragments.ts
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
| `create_spec` | draft a spec; `draftedFromSourceId` carries provenance |
| `promote_spec_requirements` | APPROVED spec's requirement groups → draft intents, origin-linked for coverage |

## Drafting from documents

The architect's raw material is often a document — either **bound to the board** (read it with
`get_source_content`) or **dropped into this session** (read it directly with file access).
Either way: extract requirements as discrete, testable statements with acceptance criteria;
name the board elements each requirement concerns by slug; keep the org's own vocabulary.
