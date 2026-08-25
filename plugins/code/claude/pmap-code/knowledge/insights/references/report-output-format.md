# Report Output Format

This document describes the `InsightDraft` schema — the v2 shape for every insight pushed to ProvenMap — and the human-facing markdown report format.

The v2 model is flat: the `insights` field in a push command is `InsightDraft[]`. There is no wrapping container, no `scope` dictionary, no separate `paths[]` or `suggestions[]` arrays. Traversal lives in each insight's `trail`; structural proposals live in its `proposal` field.

## InsightDraft

Each finding is one `InsightDraft`:

```json
{
  "name": "Short title ≤100 chars",
  "insight": "What was found and why it matters. Evidence only. 5–500 chars.",
  "polarity": "risk | strength | opportunity | observation",
  "priority": "critical | high | medium | low",
  "confidence": "verified | likely | inferred | speculative",
  "impact": "optional consequence string ≤300 chars",
  "measurement": { "value": 850, "unit": "ms", "baseline": 200, "threshold": 500, "trend": "increasing" },
  "tags": ["free-text keyword"],
  "advice": { "kind": "recommendation", "text": "concrete action 5–500 chars", "effort": "small" },
  "trail": [ ...Stop ],
  "proposal": null
}
```

### Fields

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | string (≤100) | Yes | Short, imperative title. |
| `insight` | string (5–500) | Yes | Evidence-driven description — what was found and why it matters. No opinions here. |
| `polarity` | enum | Yes | `risk` \| `strength` \| `opportunity` \| `observation`. |
| `priority` | enum | Yes | `critical` \| `high` \| `medium` \| `low`. |
| `confidence` | enum | Yes | `verified` (read the code) \| `likely` (strong evidence) \| `inferred` (derived from patterns) \| `speculative` (pattern-match guess). |
| `impact` | string (≤300) | No | Consequence if a risk is unaddressed or an opportunity is leveraged. |
| `measurement` | `Measurement` | No | Quantitative supporting data. Attachable to any polarity. |
| `tags` | string[] (≤10) | No | Free-text classification keywords for grouping/filtering. |
| `advice` | `Advice` | No | Exactly one advice object — a recommendation or context. |
| `trail` | `Stop[]` | Yes | Minimum 1 stop. The traversal path that grounds this finding. |
| `proposal` | `Proposal` \| null | No | Structural change proposed by this finding. |

### Polarity

| Polarity | Nature | When to use |
| --- | --- | --- |
| `risk` | Negative finding | Issues requiring attention — hardcoded secrets, missing auth, SQL injection |
| `strength` | Positive attribute | Patterns worth noting — clean separation of concerns, defensive error handling |
| `opportunity` | Potential improvement | Beneficial change available — caching candidate, modernization target |
| `observation` | Neutral fact | Context without judgement — "All services use gRPC", "Auth flow has 4 hops" |

### Priority

| Priority | When to use |
| --- | --- |
| `critical` | Must address immediately — security vulnerabilities, data loss risks |
| `high` | Address soon — significant impact on quality or performance |
| `medium` | Worth addressing — moderate impact, plan for it |
| `low` | Nice to have — minor improvements, informational |

### Confidence

| Confidence | Meaning |
| --- | --- |
| `verified` | Read the code directly; the claim is what the code does |
| `likely` | Strong evidence (multiple sources agree, tests exist, etc.) |
| `inferred` | Derived from patterns or surrounding context |
| `speculative` | Pattern-match guess; warrants user verification |

## Advice

Exactly one advice object per finding — either a recommendation or context. Never both. Omit the field only when there is genuinely nothing to say.

```json
{ "kind": "recommendation", "text": "Read the secret from JWT_SECRET env variable; rotate via deployment.", "effort": "small" }
```

```json
{ "kind": "context", "text": "Bcrypt cost factor is 14, set in 2019; modern hardware supports cost 12 without weakening security." }
```

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `kind` | `"recommendation"` \| `"context"` | Yes | `recommendation` when there is a concrete action. `context` for observations/strengths or risks with no clear action. |
| `text` | string (5–500) | Yes | The action (recommendation) or background (context). |
| `effort` | enum | When `kind: "recommendation"` | `trivial` \| `small` \| `medium` \| `large` \| `epic`. Required for recommendations; omit for context. |

## Measurement

Quantitative data attached to a finding:

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `value` | number | Yes | The measured value. |
| `unit` | string (1–40) | Yes | Unit of measure (e.g., `ms`, `requests/s`, `%`, `MB`). |
| `baseline` | number | No | Reference value (target, SLA, prior measurement). |
| `threshold` | number | No | Value beyond which the measurement becomes noteworthy. |
| `trend` | enum | No | `increasing`, `decreasing`, or `stable` over time. |

## Trail

Every insight must have at least 1 stop. A single stop = a point finding. Multiple stops = a traversal. Branches are expressed as multiple stops sharing the same `from` value.

```json
"trail": [
  {
    "id": "s1",
    "board": "my-project-overview",
    "node": "api-gateway",
    "note": "Entry point — rate limited 10 req/s"
  },
  {
    "id": "s2",
    "from": "s1",
    "via": { "kind": "edge", "edge": "api-gateway--auth-service" },
    "board": "my-project-overview",
    "node": "auth-service",
    "note": "Validates credentials — hardcoded JWT secret here"
  },
  {
    "id": "s3",
    "from": "s2",
    "via": { "kind": "edge", "edge": "auth-service--user-db" },
    "board": "my-project-overview",
    "node": "user-db",
    "note": "Reads user record"
  }
]
```

### Stop

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | string | Yes | Unique within this trail (e.g., `s1`, `s2`). |
| `from` | string | No | `id` of the stop this one follows. Omit on the entry stop (exactly one stop with no `from`). |
| `via` | `Via` | Conditional | Required when `from` is set; forbidden when `from` is absent. |
| `board` | string | Yes | Canonical board slug — **not** a short alias. Read from `pack.boards[].slug`. |
| `node` | string | No | Canonical node slug. Omit for board-level stops. Read from `pack.elements[].slug`. |
| `proposed` | boolean | No | `true` when the node does not yet exist on the board. Must name a `node`. |
| `parent` | string | No | Slug of the container node. Required for proposed nodes. |
| `note` | string (≤200) | No | Inline annotation for this stop. |
| `branchLabel` | string | No | Labels this stop at a fork (e.g., `"cache hit"`, `"cache miss"`). |

**Trail rules:**

- Exactly one entry stop: no `from` on exactly one stop.
- All subsequent stops: set `from` to the `id` of the stop they follow.
- `via` is required when `from` is set, forbidden without it.
- Two stops with the same `from` = a branch.
- `board` is the canonical board slug — read it from `pack.boards[].slug`, never invent a mnemonic.
- `node` is the canonical node slug — read it from `pack.elements[].slug`.
- Point finding: exactly one stop (no `from`, no `via`). Board-level: one stop with no `node`.

### Via

| Shape | When to use |
| --- | --- |
| `{ "kind": "edge", "edge": "<slug>" }` | Two stops connected by an existing board edge. `edge` = slug of that edge in the pack. |
| `{ "kind": "proposedEdge" }` | No edge exists yet; this insight proposes adding one. |
| `{ "kind": "layer", "direction": "descend" \| "ascend" }` | Descending into a child board or ascending to a parent. |
| `{ "kind": "jump" }` | Unrelated hop — no structural connection claimed. |

Edge slugs come from the pack's `edges[]` array. If the pack doesn't carry an explicit slug, derive it from `sourceSlug--targetSlug`.

## Proposal

A structural change proposed by this finding. Set `proposal` on the finding whose trail names the target elements. A `proposed: true` stop on the trail marks a node that doesn't exist yet.

```json
{
  "action": "add",
  "targetType": "node",
  "changes": [{ "field": "name", "before": null, "after": "Redis Cache" }]
}
```

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `action` | `"add"` \| `"remove"` \| `"modify"` | Yes | The type of structural change. |
| `targetType` | `"node"` \| `"edge"` \| `"container"` \| `"aspect"` \| `"layer"` | Yes | What is being changed. |
| `aspectKind` | enum | When `targetType: "aspect"` | `db.table` \| `api.endpoint` \| `ui.page` \| `event.channel` \| `authz.registry` |
| `changes` | `{ field, before, after }[]` | No | Specific field changes for `modify` actions. |

## Examples

### Example: actionable risk (point finding)

```json
{
  "name": "Hardcoded JWT Secret",
  "insight": "JWT secret is a string literal in src/auth/login.ts:42; rotation requires code changes.",
  "polarity": "risk",
  "priority": "critical",
  "confidence": "verified",
  "impact": "Source-code access reveals the signing key, enabling token forgery.",
  "tags": ["security", "secrets"],
  "advice": {
    "kind": "recommendation",
    "text": "Read the secret from JWT_SECRET environment variable; rotate via deployment.",
    "effort": "small"
  },
  "trail": [
    { "id": "s1", "board": "my-project-overview", "node": "auth-service" }
  ]
}
```

### Example: observation with measurement (multi-stop trail)

```json
{
  "name": "Auth endpoint p99 latency",
  "insight": "Auth endpoint p99 latency is 850ms at peak, dominated by bcrypt comparison.",
  "polarity": "observation",
  "priority": "medium",
  "confidence": "likely",
  "measurement": { "value": 850, "unit": "ms", "baseline": 200, "threshold": 500, "trend": "increasing" },
  "advice": {
    "kind": "context",
    "text": "Bcrypt cost factor is 14, set in 2019; modern hardware supports 12 without weakening security."
  },
  "trail": [
    { "id": "s1", "board": "my-project-overview", "node": "api-gateway", "note": "Entry — rate limited" },
    { "id": "s2", "from": "s1", "via": { "kind": "edge", "edge": "api-gateway--auth-service" }, "board": "my-project-overview", "node": "auth-service", "note": "850ms p99" },
    { "id": "s3", "from": "s2", "via": { "kind": "edge", "edge": "auth-service--user-db" }, "board": "my-project-overview", "node": "user-db", "note": "Read per request" }
  ]
}
```

### Example: board-level observation (no node)

```json
{
  "name": "Strong layering boundaries",
  "insight": "Domain logic is consistently isolated from transport — services depend only on domain interfaces.",
  "polarity": "strength",
  "priority": "low",
  "confidence": "verified",
  "advice": {
    "kind": "context",
    "text": "23 of 25 services follow this pattern; 2 exceptions are integration shims."
  },
  "trail": [
    { "id": "s1", "board": "my-project-overview" }
  ]
}
```

### Example: branching trail (blast radius)

```json
{
  "name": "Payment service is a single point of failure",
  "insight": "payment-service has 4 synchronous dependents with no circuit breaker; an outage propagates immediately.",
  "polarity": "risk",
  "priority": "critical",
  "confidence": "verified",
  "advice": {
    "kind": "recommendation",
    "text": "Add circuit breaker on all callers; degrade order-service to async on payment timeout.",
    "effort": "large"
  },
  "trail": [
    { "id": "s1", "board": "my-project-overview", "node": "payment-service", "note": "SPOF — outage starts here" },
    { "id": "s2", "from": "s1", "via": { "kind": "edge", "edge": "order-service--payment-service" }, "board": "my-project-overview", "node": "order-service", "note": "Blocks on retries", "branchLabel": "order path" },
    { "id": "s3", "from": "s1", "via": { "kind": "edge", "edge": "notification-service--payment-service" }, "board": "my-project-overview", "node": "notification-service", "note": "Skips confirmation", "branchLabel": "notification path" },
    { "id": "s4", "from": "s1", "via": { "kind": "edge", "edge": "analytics--payment-service" }, "board": "my-project-overview", "node": "analytics", "note": "Misses events", "branchLabel": "analytics path" }
  ]
}
```

### Example: proposal (structural change with proposed node)

```json
{
  "name": "Add Redis cache layer in front of auth-service",
  "insight": "auth-service queries user-db on every request; no caching layer exists.",
  "polarity": "opportunity",
  "priority": "high",
  "confidence": "verified",
  "advice": {
    "kind": "recommendation",
    "text": "Introduce Redis between api-gateway and auth-service; cache user sessions with 15-min TTL.",
    "effort": "medium"
  },
  "trail": [
    { "id": "s1", "board": "my-project-overview", "node": "auth-service" },
    { "id": "s2", "from": "s1", "via": { "kind": "proposedEdge" }, "board": "my-project-overview", "node": "redis-cache", "proposed": true, "parent": "infra-container", "note": "New node proposed here" }
  ],
  "proposal": {
    "action": "add",
    "targetType": "node",
    "changes": [{ "field": "name", "before": null, "after": "Redis Cache" }]
  }
}
```

## Markdown Report (`content` field)

The `content` field is a detailed markdown report for humans. Keep it tight but informative — include file paths when the analysis identifies specific source locations.

```markdown
# <Skill Name> Report

## Summary

<total> findings: <critical> critical, <high> high, <medium> medium, <low> low
Polarities: <risk> risks, <strength> strengths, <opportunity> opportunities, <observation> observations

## Findings

### 1. <Finding Name> (<polarity> · <priority> · confidence: <confidence>)

**Board:** <board slug>
**Node:** <node slug or "board-wide">
**File:** <source file path if known>

<insight description>

<If measurement present:>
**Measurement:** <value> <unit> (baseline <baseline>, threshold <threshold>, trend <trend>)

**Trail:** <entry node> → <next node> → … (with branch labels if any)

<If advice.kind === "recommendation":>
**Recommendation:** <text> (effort: <effort>)

<If advice.kind === "context":>
**Context:** <text>

---

### 2. <Next Finding>

...
```

Don't restate the JSON — surface the *why* and *next step* for each finding.
