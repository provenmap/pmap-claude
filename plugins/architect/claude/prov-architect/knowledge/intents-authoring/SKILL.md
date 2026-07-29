---
name: intents-authoring
description: How to author, anchor, and manage ProvenMap intents — the reviewable work items that connect architecture decisions to delivery. Use when creating intents, managing the intent queue (transition, assign, delete), or turning specs, findings, and board changes into work. Key capabilities: the intent lifecycle, DRAFT-only stance, the impact→attach→describe authoring loop, anchor recording with the platform's verbs, single-board rule and session-linked federation, collision checks, structured directives, staleness and verification semantics.
---

# Intents Authoring

<!-- Distilled from platform services/prompts/base/facet-prompt-fragments.ts
     (buildIntentsFragment) — the platform vocabulary below is carried verbatim
     where quoted — plus the create_intent input contract
     (workboard-intents/nodes/intent-tool.types.ts). -->

## What an intent is

Intents are proposed work items anchored to what they concern; **only code changes make them
true**. A spec is what the org WANTS; intents are how it gets delivered; code is what makes it
true.

## Lifecycle

`draft → open (architect locks it; developers can now pull it) → assigned → in_progress →
implemented | rejected | resolved_other`

- `needs_clarification` is a detour, not an end: a developer bounces an intent back when code
  reality no longer matches it. The architect revises and re-opens it (`needs_clarification →
  open`) or rejects it.
- **You author DRAFTS only** — a human locks a draft open. Every write stages and lands for
  review (passive review); narrate the staged intent, never pre-confirm.
- `stale` means the code facts under an intent's anchors drifted since it was written — it needs
  the architect's re-review, so say so rather than treating it as current.
- `implemented` is the developer's CLAIM; `verifiedAt` is the server's PROOF that a later push
  actually matches. Do not present a claim as proven.
- Rejecting an intent automatically reverts any board changes it staged. Deleting an intent
  withdraws everything it staged (only `draft`/`open`/`needs_clarification` can be deleted —
  terminal intents are the delivery ledger).

## The tools

| Tool | Use |
|---|---|
| `list_intents` | summaries; `scope: 'tree'` spans layer boards |
| `get_intent` | full detail: directive, anchors + notes, origin, resolution history, staleness |
| `create_intent` | author a draft |
| `update_intent` | revise a draft/needs_clarification intent — fields + context anchors (changed anchors preserved) |
| `transition_intent` | lifecycle moves (draft→open locks for developer pulls; →rejected reverts staged changes) |
| `assign_intent` | assign to users; empty list clears; assigning an open intent moves it to assigned |
| `promote_insight_findings` | reviewed findings/suggestions → one draft intent each (see insights-review) |
| `delete_intent` | delete + withdraw everything staged |

Address intents by slug (`list_intents` → `get_intent`).

## Authoring a good intent

`create_intent` takes `{ workBoardSlug, name, directive (10–4000 chars), description?,
anchors[]{elementType, aspectKind?, slug, note?}, priority?, effort? }`.

**Anchors.** Anchor a new intent to what it is about: board elements (node/edge), an aspect row
(a table, an endpoint — pass `aspectKind`), a child layer board, or the spec it serves. Add a
note per anchor saying why it is there; **the implementer reads it**. Anchors you author carry
the `context` role ('changed' anchors come only from captures that physically edited elements).
An intent may CITE a spec as context; it may never change one — a spec is interpretation, and
intents never change interpretation.

**Structured directives.** Write the directive so a concrete diff could be derived from it:

- Name every element **by slug**, exactly.
- One change per intent — split unrelated changes.
- State the operation explicitly: **add / modify / remove**, with the target and the desired end
  state.
- For a graph-shaped change, prefer making the actual board edit (diagram write tools — it
  stages its own intent with the concrete diff) over describing the change in prose.

## The authoring loop — impact → attach → describe

Attaching elements and describing *why each is attached* is the platform's most important
authoring feature — do it natively, never as an afterthought. The loop (route first per
architect-core's taxonomy — intents are legal only on code-bound boards):

1. **Seed.** The elements named by the architect, a spec's requirements, or a staged board
   edit.
2. **Sweep candidates** — facts from reads, ranking from judgment: spine radius
   (`get_edges` with `nodeSlugs` on the seeds; one more hop only for hubs; classify
   inbound/outbound); aspect fan-out (`get_node_aspects` on seeds + implicated neighbours —
   the pages, endpoints, tables, channels, authz entries the change actually touches);
   affected child layers (`layerBoardSlug` ⇒ layer anchors); the serving spec (context
   anchor). **Candidates on other boards become separate per-board intents** — group by home
   board; an intent is single-board (cross-board anchors are inert).
3. **Collision check.** `list_intents` on each target board — existing open intents sharing
   anchor slugs are flagged (conflicting intents are withheld from developer pulls); the
   architect decides merge / supersede / proceed.
4. **Propose.** Ranked table per board (≤15 rows, "+N more"): slug, type (+aspectKind),
   one-line *why affected*. AskUserQuestion multiSelect — the architect prunes and adds.
5. **Describe — the recording session, spoken.** Per attached anchor, ask the platform's own
   question with the platform's verbs (*change / add / fix / remove / investigate*) and compose
   the note exactly as the web Intent Editor does — `"Change: collect the new consent field
   before submit"`. Templates and composition rules:
   [references/anchor-recording.md](references/anchor-recording.md). Batch a few per round;
   skipping is fine (the anchor attaches noteless).
6. **Land.** Assemble the directive per the structured rules below, grouped by verb the way
   the editor's `composeDirective` does. Pre-flight with
   `node ${CLAUDE_PLUGIN_ROOT}/scripts/prov-architect.js --validate intent --file <payload.json>`.
   Multi-board ⇒ one write session across the `create_intent` calls (record it in the session
   ledger) so discard undoes the set; narrate each staged draft + the session linkage.

**Enrichment and revision — `update_intent`.** An already-minted `draft` or
`needs_clarification` intent is revised in place: name, directive, description, priority,
effort, and its **context anchors** (replace-all — capture-owned `changed` anchors and the
staged board diff are preserved; withdrawing staging stays an explicit act via `delete_intent`
or transition→rejected). Null/omitted fields stay unchanged; origin is immutable; changing
anchors re-baselines the intent and clears staleness. **The bounced-intent loop is now real:**
`needs_clarification` → read the developer's question (`get_intent`), revise via
`update_intent`, then re-open with `transition_intent`. Locked (open/assigned/in_progress/
terminal) intents refuse edits — relay that.

## Concrete board changes vs directive intents

Two channels, both reviewed:

1. **Directive intent** (`create_intent`) — work for a developer to implement in code.
2. **Direct board edit** (diagram write tools) — the architect's own change to the diagram;
   on a governed board it stages and mints a `board_diff` intent automatically.

Pick by where the truth changes: code change wanted → directive intent; diagram change wanted →
board edit.
