---
name: intents-authoring
description: How to author, anchor, and manage ProvenMap intents — the living specs that connect architecture decisions to delivery. Use when creating intents, authoring requirements against a board, managing the intent queue (transition, assign, delete), or turning insights and board changes into work. Key capabilities: the intent lifecycle, DRAFT-only stance, the impact→attach→describe authoring loop, the authoring interview, anchor recording with the platform's verbs, single-board rule and session-linked federation, the materialization gates (duplicate, already-implemented, sequencing), structured directives, staleness and verification semantics.
---

# Intents Authoring

<!-- Distilled from platform services/prompts/base/facet-prompt-fragments.ts
     (buildIntentsFragment) — the platform vocabulary below is carried verbatim
     where quoted — plus the create_intent input contract
     (workboard-intents/nodes/intent-tool.types.ts). -->

## What an intent is

An intent is a **living spec**: what the org wants and why, anchored to the elements it
concerns, and **only code changes make it true**. There is no separate spec entity upstream of
it — the intent carries the demand AND the delivery record, so the why never freezes in a
document nobody re-reads while the code moves on.

Two halves, both required for it to be worth reading in six months:

- **The why** — the `narrative` (the problem, the goal, what is explicitly out of scope; markdown,
  up to 8000 chars), backed by the per-anchor notes. This is what a reviewer needs when they ask
  "can we defend this decision?" It is **optional** — see the judgement call below.
- **The what** — the `directive`, naming each element by slug with the end state it must reach.
  This is what a developer implements and what a later push is checked against.

**Three prose fields, three readers — do not collapse them.** `description` (≤500) is the one-line
subtitle the queue shows; `narrative` (≤8000) is the durable why; `directive` (≤4000) is the
instruction. Putting the rationale in the directive buries the instruction and blows its cap;
putting it in the description truncates it.

**When to write a narrative.** Write one when the material carries reasoning that would otherwise
be lost: a PRD or RFC's problem statement, a rejected alternative, an explicit out-of-scope
boundary, a constraint that explains an odd-looking choice. Do NOT manufacture one — an intent
whose why is genuinely "the insight says so, and the insight is linked" should omit the field
rather than restate its own directive in longer words. Padding it is worse than leaving it empty:
it trains the architect to skip the section on every future intent.

## Lifecycle

`draft → open (architect locks it; developers can now pull it) → assigned → in_progress →
implemented | rejected | resolved_other`

- `needs_clarification` is a detour, not an end: a developer bounces an intent back when code
  reality no longer matches it. The architect revises and re-opens it (`needs_clarification →
open`) or rejects it.
- **You author DRAFTS only** — a human locks a draft open. Every write joins the working copy
  and awaits review (passive review); narrate the created draft by slug, never pre-confirm.
- `stale` means the code facts under an intent's anchors drifted since it was written — it needs
  the architect's re-review, so say so rather than treating it as current.
- `implemented` is the developer's CLAIM; `verifiedAt` is the server's PROOF that a later push
  actually matches. Do not present a claim as proven.
- Rejecting an intent automatically reverts any board changes it staged. Deleting an intent
  withdraws everything it staged (only `draft`/`open`/`needs_clarification` can be deleted —
  terminal intents are the delivery ledger).

## The tools

| Tool                       | Use                                                                                              |
| -------------------------- | ------------------------------------------------------------------------------------------------ |
| `list_intents`             | summaries; `scope: 'tree'` spans layer boards                                                    |
| `get_intent`               | full detail: directive, anchors + notes, origin, resolution history, staleness                   |
| `create_intent`            | author a draft (incl. the `narrative` and, for a bound document, `draftedFromSourceSlug`)        |
| `update_intent`            | revise a draft/needs_clarification intent — fields + context anchors (changed anchors preserved) |
| `transition_intent`        | lifecycle moves (draft→open locks for developer pulls; →rejected reverts staged changes)         |
| `assign_intent`            | assign to users; empty list clears; assigning an open intent moves it to assigned                |
| `promote_insights`         | reviewed insight ids → one draft intent each (see insights-review)                               |
| `delete_intent`            | delete + withdraw everything staged                                                              |

Address intents by slug (`list_intents` → `get_intent`).

## Authoring a good intent

`create_intent` takes `{ workBoardSlug, name, directive (10–4000 chars), description?,
narrative?, draftedFromSourceSlug?, afterIntentSlug?, anchors[]{elementType, aspectKind?, slug,
note?}, priority?, effort? }`.

**Sequencing — `afterIntentSlug`.** When the ordering matters, pass the slug of the same-board
intent this one should land after. The server resolves it (unknown slug ⇒ the create fails,
never a silent drop; same board only) and `get_intent` returns it resolved. Clear or
re-sequence a draft via `update_intent` (`""` clears). Procedure: gate 3 in
[references/materialization-gates.md](references/materialization-gates.md).

**Provenance — `draftedFromSourceSlug`.** When the material was a **bound document** (a PRD, an
RFC, an ADR), pass the catalog source's slug. The intent then carries a _Drafted from_ line
pointing at that document, so the org's version and the board's version are visibly the same
thing. Get slugs from `list_source_bindings` (the `sourceSlug` column). An unknown slug is
**rejected** — the create fails rather than silently dropping the link, so read the bindings
first rather than guessing a slug from the document's title. Omit it entirely when the material
came from the conversation, a pasted file, or the architect's own description: this records where
a draft _came from_, not what it is about.

**Anchors.** Anchor a new intent to what it is about: board elements (node/edge), an aspect row
(a table, an endpoint — pass `aspectKind`), or a child layer board. Add a note per anchor saying
why it is there; **the implementer reads it**. Anchors you author carry the `context` role
('changed' anchors come only from captures that physically edited elements).

**Structured directives.** Write the directive so a concrete diff could be derived from it:

- Name every element **by slug**, exactly.
- One change per intent — split unrelated changes.
- State the operation explicitly: **add / modify / remove**, with the target and the desired end
  state.
- For a graph-shaped change, prefer making the actual board edit (diagram write tools — the
  concrete diff generates its own `board_diff` intent when the session commits) over describing
  the change in prose.

**Pre-land self-review — run before anything lands, fix silently.** First the defect scan —
any hit sends the draft back a step, never into `create_intent`:

- A verb with no end state — "improve", "clean up", "handle properly", "as appropriate".
- An element referenced in prose but not by exact slug.
- "etc." / "and so on" — enumerate or cut.
- Two unrelated changes in one intent — split.
- An anchor the directive never mentions — cover it, or its note must say why it is
  context-only.
- A narrative that restates the directive — drop it (see "When to write a narrative").

Then the five-point check: placeholder scan · anchor↔directive coverage · narrative↔directive
consistency · the two-readings test (could a developer implement this two different ways? pick
one and make it explicit) · no materialization gate left unresolved. Calibration: act only on
what would make the developer build the wrong thing — wording preferences are not defects.
Surface to the architect only the fixes that change meaning; everything else just gets fixed.

## The authoring loop — impact → attach → describe

Attaching elements and describing _why each is attached_ is the platform's most important
authoring feature — do it natively, never as an afterthought. The loop (route first per
architect-core's taxonomy — intents are legal only on code-bound boards):

1. **Seed.** The elements named by the architect, the material they brought (prose, a shared
   file, a bound document), or a board edit sitting in the working copy.
2. **Shape the solution — only when the approach is unsettled.** The material names a problem
   but no settled approach → run the solution-shaping round
   ([references/authoring-interview.md](references/authoring-interview.md)): 2–3
   board-grounded approaches, trade-offs, recommendation first; the chosen approach seeds the
   sweep and the directive skeleton, the rejected ones become narrative material. Skip when
   the approach is already decided — a settled change, a prescriptive bound document, a
   promoted insight.
3. **Sweep candidates — holistically.** Estate pass first: place the ask on the whole estate
   (the `--classify-tree` cache or `get_board_tree`) — which sibling app boards it touches,
   which root-landscape systems are implicated. Then the close-in sweep — facts from reads,
   ranking from judgment: spine radius (`get_edges` with `nodeSlugs` on the seeds; one more
   hop only for hubs; classify inbound/outbound); aspect fan-out (`get_node_aspects` on seeds
   - implicated neighbours — the pages, endpoints, tables, channels, authz entries the change
     actually touches); affected child layers (`layerBoardSlug` ⇒ layer anchors). **Candidates
     on other boards become separate per-board intents** — group by home board; an intent is
     single-board (cross-board anchors are inert).
4. **The materialization gates.** Three checks against the existing intent estate — every one
   must pass before anything lands
   ([references/materialization-gates.md](references/materialization-gates.md)):
   **duplicate** (`list_intents` `scope: 'tree'` — anchor overlap, same-verb-on-same-element,
   or name similarity against any non-terminal intent → merge / supersede / proceed);
   **already implemented** (terminal intents with overlapping anchors, or an aspect row that
   already carries the capability → modification, the directive verb becoming _change_ — or
   duplicate: stop, name the existing intent); **sequencing** (must this land after a related
   open intent? → `afterIntentSlug` on the payload; a draft re-sequences or clears via
   `update_intent`).
5. **Propose.** Ranked table per board (≤15 rows, "+N more"): slug, type (+aspectKind),
   one-line _why affected_. AskUserQuestion multiSelect — the architect prunes and adds.
6. **Describe — the recording session, spoken.** Per attached anchor, ask the platform's own
   question with the platform's verbs (_change / add / fix / remove / investigate_) and compose
   the note exactly as the web Intent Editor does — `"Change: collect the new consent field
before submit"`. Templates and composition rules:
   [references/anchor-recording.md](references/anchor-recording.md). Batch a few per round;
   skipping is fine (the anchor attaches noteless).
7. **Grill the gaps.** When the material is thin — no why, no done-bar, no named elements —
   run a round or two from [references/authoring-interview.md](references/authoring-interview.md):
   2–4 questions chosen by what the material _lacks_, never the whole bank as a form. This is
   what `/author-intent` runs long-form.
8. **Self-review.** Run the pre-land self-review (above): the defect scan, then the
   five-point check. Fix silently; surface only what changes meaning.
9. **Read-back — the one landing gate.** Render the assembled intent once: name, description,
   directive (grouped per `composeDirective`), narrative — or the line "— omitted, reasoning
   lives on the linked insight" — anchor table (slug · type · note), the _Drafted from_
   line when `draftedFromSourceSlug` is set, and the _After_ line when `afterIntentSlug`
   is set. One AskUserQuestion: **Land as draft** /
   **Revise**. Multi-board split → render every per-board intent, one question for the batch.
   Revise loops back to the step that owns the field, then re-renders once — the second
   read-back is final unless the architect asks again. After landing, narrate slug-first as
   usual; the read-back already served as the summary, so no duplicate narration.
10. **Land.** Assemble the directive per the structured rules above, grouped by verb the way
    the editor's `composeDirective` does. Pre-flight with
    `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-architect.js --validate intent --file <payload.json>`.
    Multi-board ⇒ the `create_intent` calls share the one working copy automatically; report
    each created draft by slug.

**Enrichment and revision — `update_intent`.** An already-generated `draft` or
`needs_clarification` intent is revised in place: name, directive, description, narrative,
priority, effort, sequencing (`afterIntentSlug` — `""` clears), and its **context anchors**
(replace-all — capture-owned `changed` anchors and the
staged board diff are preserved; withdrawing staging stays an explicit act via `delete_intent`
or transition→rejected). Null/omitted fields stay unchanged; origin is immutable; changing
anchors re-baselines the intent and clears staleness. A revision lands like a creation: the materialization gates, the pre-land self-review, and
the read-back gate (loop steps 4, 8–9) run before `update_intent`; shaping is skipped — the
approach was settled when the intent was generated. **The bounced-intent loop is now real:**
`needs_clarification` → read the developer's question (`get_intent`), revise via
`update_intent` — answering the question in the directive, not in chat — then re-open with
`transition_intent`. Locked (open/assigned/in_progress/
terminal) intents refuse edits — relay that.

## Concrete board changes vs directive intents

Two channels, both reviewed:

1. **Directive intent** (`create_intent`) — work for a developer to implement in code.
2. **Direct board edit** (diagram write tools) — the architect's own change to the diagram;
   on a governed board it stages and generates a `board_diff` intent automatically.

Pick by where the truth changes: code change wanted → directive intent; diagram change wanted →
board edit.
