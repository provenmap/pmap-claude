---
name: insights-review
description: How to review ProvenMap insight runs and turn findings into work, how to run a structured assessment (/assess), and how to record a session analysis as a draft insight run. Use when listing or reading insights, deciding what to promote to intents, running a periodic review, or capturing an architecture review performed in-session. Key capabilities: the insight continuum, finding/suggestion ids, promotion to draft intents, the assess arc (frame→sweep→review→record), template honesty, create_insight draft runs.
---

# Insights Review

<!-- Distilled from platform services/prompts/base/facet-prompt-fragments.ts
     (buildInsightsFragment) + the Tool Catalogue's insight tool rows
     (workspace/insights/board-insights/nodes/insight-tool.nodes.ts). -->

## What an insight run is

Insight runs are stored analyses with **findings** (element-anchored observations) and
**suggestions** (proposed changes). The continuum:

`list_insights → get_insight (finding/suggestion ids) → review → promote_insight_findings
(turn reviewed items into draft intents)`

Cite finding **names** when discussing them; promotion mints one **draft** intent per reviewed
item (passive review — narrate the minted drafts by slug).

Heavy insight *generation* (scheduled analyses, deep research) runs in-platform. What you can do
here is **review** stored runs, **promote** what deserves delivery, and **record** your own
session analysis as a draft run.

## The tools

| Tool | Use |
|---|---|
| `list_insights` | runs as summaries; filter by `templateSlug`, `scope: 'tree'` spans the subtree |
| `get_insight` | findings + suggestions with the ids that feed `promote_insight_findings`; raw report content is never returned |
| `list_insight_skills` | insight templates in the org (slug, name, description, category) |
| `get_insight_skill` | one template's full methodology: instructions + references — the faithful-run input |
| `create_insight` | record an analysis as a **draft run**: markdown narrative + structured payload (scope, findings, paths, suggestions) |
| `promote_insight_findings` | reviewed findings/suggestions → one draft intent each |

## Review workflow

1. `list_insights` — what runs exist; recent first.
2. `get_insight` on the run under review — walk findings with their anchored elements
   (slug-first), severity, and suggestions.
3. Triage with the architect: which findings are real, which suggestions deserve delivery.
4. `promote_insight_findings` with the chosen ids — each becomes a draft intent; report the
   minted intents by slug.
5. Point at `/intents` for queue management (open, assign).

## The assess arc (/assess) — structured review, recorded

1. **Frame.** `list_insight_skills` → offer the org's templates by name/category, or an ad-hoc
   dimension (resilience, coupling, boundary integrity — board-reading's assessment criteria).
   For a template run, pull its full methodology with `get_insight_skill {skillSlug}` —
   `instructions` + `references` — and **follow it faithfully**; only when the tool is absent
   (older server) fall back to description-guided + house criteria, and say so. Scope: one
   board or `tree`.
2. **Sweep.** Read per the frame (spine, aspects, layers as relevant); apply the criteria;
   build findings — element-anchored by slug, severity + polarity, a recommendation each — and
   graph-shaped suggestions where the fix is a diagram change.
3. **Review with the architect — the grill in reverse.** Walk the findings; they challenge, you
   defend or drop. Keep only what survives.
4. **Record.** `create_insight` (narrative + structured payload) — a draft run, visible in the
   platform.
5. **Hand off.** AskUserQuestion "Promote any of this to intents?" → `promote_insight_findings`
   on the kept ids → optionally enrich via the intents-authoring loop. Not now → `/insights`
   names the run.

## Recording a session analysis

When you performed a real analysis in-session (e.g. an assessment via board-reading), offer to
record it: `create_insight` with the narrative and structured findings — `scope.boards` and
`scope.elements` address boards and nodes by **slug**; findings reference them by short key;
finding ids then feed `promote_insight_findings`. Unknown tags are dropped, not rejected. The
run lands as a draft.
