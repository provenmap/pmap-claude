---
name: insights-review
description: How to review ProvenMap insight batches and turn insights into work, how to run a structured assessment (/assess), and how to record a session analysis as a draft batch. Use when listing or reading insights, deciding what to promote to intents, running a periodic review, or capturing an architecture review performed in-session. Key capabilities: the batch→insight drill-down, insight ids, promotion to draft intents, the assess arc (frame→sweep→review→record), template honesty, create_insight draft batches.
---

# Insights Review

<!-- Distilled from platform services/prompts/base/facet-prompt-fragments.ts
     (buildInsightsFragment) + the Tool Catalogue's insight tool rows
     (workspace/insights/board-insights/nodes/insight-tool.nodes.ts). -->

## What an insight is

An **insight** is one element-anchored observation with its own trail across the graph, and it is
the unit of everything here: it is what you read, what you cite, and what promotes into work. A
**batch** is just the set one analysis emitted in one go — a container with a date and a template,
never something you review as a whole. Where the fix is a diagram change, the insight carries a
`proposal`; there is no separate suggestion object.

The continuum:

`list_insights (batches) → list_insights {batchId} (the insights, with their ids) → get_insight →
review → promote_insights (turn reviewed insights into draft intents)`

Cite insight **names** when discussing them; promotion generates one **draft** intent per reviewed
insight (passive review — narrate the generated drafts by slug).

Heavy insight _generation_ (scheduled analyses, deep research) runs in-platform. What you can do
here is **review** stored insights, **promote** what deserves delivery, and **record** your own
session analysis as a draft batch.

## The tools

| Tool                  | Use                                                                                                                                 |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `list_insights`       | batches as summaries; pass a `batchId` to list that batch's insights with their ids. Filter by `templateSlug`, `scope: 'tree'` spans the subtree |
| `get_insight`         | one insight in full by its id: evidence, signals, tags, trail, any proposal, and the batch it arrived in                             |
| `list_insight_skills` | insight templates in the org (slug, name, description, category)                                                                    |
| `get_insight_skill`   | one template's full methodology: instructions + references — the faithful-run input                                                  |
| `create_insight`      | record an analysis as a **draft batch**: `insights: InsightDraft[]`, each with its own `trail` (no narrative field — the insights are the record) |
| `promote_insights`    | reviewed insight ids → one draft intent each                                                                                        |

## Review workflow

1. `list_insights` — what batches exist; recent first.
2. `list_insights {batchId}` on the batch under review — the insights it holds, each with the id
   the next two tools take.
3. `get_insight` on the ones worth reading in full — anchored elements (slug-first), severity,
   trail, any proposal. Triage with the architect: which are real, which deserve delivery.
4. `promote_insights` with the chosen ids — each becomes a draft intent; report the
   generated intents by slug.
5. Point at `/intents` for queue management (open, assign).

## The assess arc (/assess) — structured review, recorded

1. **Frame.** `list_insight_skills` → offer the org's templates by name/category, or an ad-hoc
   dimension (resilience, coupling, boundary integrity — board-reading's assessment criteria).
   For a template run, pull its full methodology with `get_insight_skill {skillSlug}` —
   `instructions` + `references` — and **follow it faithfully**; only when the tool is absent
   (older server) fall back to description-guided + house criteria, and say so. Scope: one
   board or `tree`.
2. **Sweep.** Read per the frame (spine, aspects, layers as relevant); apply the criteria;
   build the insights as `InsightDraft[]` — element-anchored by slug (trail with real board+node slugs), severity + polarity, a recommendation each. When the fix is a diagram change (add/remove/modify a node or edge), set `proposal` on the insight rather than creating a separate object.
3. **Review with the architect — the grill in reverse.** Walk the insights; they challenge, you
   defend or drop. Keep only what survives.
4. **Record.** `create_insight` with the surviving `InsightDraft[]` — a draft batch, visible in
   the platform. Re-running the same template on the same board REPLACES whatever it last left
   unreviewed there: a re-analysis is a new verdict, not an addition.
5. **Hand off.** AskUserQuestion "Promote any of this to intents?" → `promote_insights`
   on the kept ids → optionally enrich via the intents-authoring loop. Not now → `/insights`
   names the batch.

## Recording a session analysis

When you performed a real analysis in-session (e.g. an assessment via board-reading), offer to
record it: `create_insight` with the structured insights — each carries a
`trail` of stops; each stop references a board and node by their canonical slug directly (no
scope dictionary, no short keys); the ids the call returns then feed `promote_insights`. Unknown tags are dropped, not rejected. The
batch lands as a draft.
