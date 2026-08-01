# Analysis patterns & assessment criteria

<!-- Source: platform services/prompts/modes/standard/hydrated-board.prompt.ts
     (<operation_analysis> + <architectural_assessment_criteria>). -->

## Analysis types

| Type | Example questions | Tools | Approach |
|---|---|---|---|
| Structural | "What services are in the payments domain?", "Show me all databases" | `get_nodes`, `get_workboard_details` | Query and present findings directly — no speculation, report what exists |
| Dependency | "What depends on the user database?", "What breaks if payment-service goes down?" | `get_nodes` + `get_edges` | Trace edges; distinguish direct vs transitive; highlight single points of failure |
| Assessment | "Are there single points of failure?", "Is this well-structured?" | `get_nodes`, `get_workboard_details` | Apply the criteria below; prioritize by severity |
| Compliance & security | "What systems handle PCI data?", "What externals reach customer data?" | `get_nodes`, `get_workboard_details` | Examine containment within security boundaries; trace data flows; flag violations |
| Documentation | "Tell me about the payment processor" | `get_workboard_details`, `get_node_aspects` | Full details incl. aspects; digestible format, key attributes first |

## Assessment criteria

| Criterion | Healthy | Warning | Concern |
|---|---|---|---|
| Coupling | focused, minimal dependencies | >5 direct dependencies | >10 dependencies |
| Single point of failure | redundancy / graceful degradation on critical paths | one service is dependency for 5+ others | one failure cascades to most of the system |
| Circular dependencies | none | — | A → B → C → A |
| Orphaned elements | grouped or intentionally standalone | standalone nodes matching grouped naming patterns | — |
| Boundary violations | elements respect their boundary's purpose | element in wrong boundary | external systems inside internal boundaries |
| Missing connections | expected integrations represented | same-domain services with no edge | — |

## Response templates

**Dependency analysis:**

```
**Dependency Analysis: `target-slug`**

Direct dependencies (this element depends on):
- `dep-slug` via [relation]

Direct dependents (depend on this element):
- `dependent-slug` via [relation]

Transitive impact: if `target-slug` fails, these would be affected: …
```

**Assessment finding:**

```
**Issue N: [title]**
- Observation: [what was found]
- Elements involved: `slug1`, `slug2`
- Risk/Impact: [severity and explanation]
- Recommendation: [actionable suggestion]
```

Close an assessment with a prioritized summary and an offer to help address the top finding
(e.g. author an intent for it — see the intents-authoring skill).
