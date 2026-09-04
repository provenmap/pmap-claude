# Insight Skill Execution Protocol

This document describes the step-by-step process for executing a server-defined InsightSkill.

## Overview

An InsightSkill is a server-defined analysis task. The server provides the instructions and references; the plugin executes them using Claude as the analysis engine. The existing architecture board provides the context.

The output is an `InsightDraft[]` — a flat array of findings. There is no wrapping container, no scope dictionary, no separate paths or suggestions arrays. Each finding carries its own `trail` (the traversal through the graph) and optionally a `proposal` (a structural change). Board and node slugs in trails are the canonical values from the pack — never invented mnemonics.

## Execution Steps

### 1. Fetch Skill List (Precis)

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-insights.js --list-insight-skills
```

Parse the JSON output:

- `featureAvailable === false` → report "Insights not available for this account" and stop
- `skills === []` → report "No insight skills configured" and stop
- Otherwise, use the `skills[]` precis data (slug, name, description, category, duration) for skill selection

The precis list is used in two ways, decided by the command argument:

- **Agent-inferred mode** (a natural-language prompt): semantically match the prompt to the `skills[]` precis — slug, name, description, and category — and select one or more skills. Explain the choice to the user, one sentence per skill (e.g. "Running **security-analysis** — matches your request to check for vulnerabilities"). Store the full prompt as `{{userPrompt}}`. If no skills clearly match, list the available skills and ask the user to clarify or pick.
- **User-selection mode** (`--select` or no arguments): display the skills table —

  | Slug | Name | Category | Duration | Description |
  | ---- | ---- | -------- | -------- | ----------- |
  | ...  | ...  | ...      | ...      | ...         |

  — then ask the user both questions together: _"Which skill(s) would you like to run? Also describe your analysis focus (e.g., 'check auth service for security issues') — a focus prompt is required."_ Do **not** proceed until the user provides both a skill selection and a focus prompt; store the focus prompt as `{{userPrompt}}`.

The remaining arguments select skills directly:

| Argument       | Behaviour                                                    |
| -------------- | ------------------------------------------------------------ |
| `--list`       | Print the skills table and stop — no execution               |
| `--all`        | Run all available skills; `{{userPrompt}}` is empty          |
| `<skill-slug>` | Run only the named skill directly; `{{userPrompt}}` is empty |

### 1b. Fetch Full Skill

Once a skill is selected, fetch its full content (instructions + references):

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-insights.js --get-insight-skill <slug>
```

Parse the JSON output:

- On success, the `skill` field contains the full skill with `instructions` and `references[]`
- Exit code 3 with 404 → skill not found, skip it
- If `skill.instructions` is null → skip and report "Insight skill '<slug>' has no instructions"

For `--all`, fetch each skill's full data one at a time before executing it.

### 2. Extract Board Context

The `boardSlug` in `.provenmap/config.json` is the **primary board**, but an insight may target any layer board — `.provenmap/boards/manifest.json` (when it exists) lists them, and the prepass below resolves the rest.

**Preferred:** run the context prepass once and read the pack:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-insights.js --build-context --board-slug <boardSlug> --out .provenmap/insights/<boardSlug>.context.json --summary --domain connect
```

The summary prints to stdout; read the **full pack** from `.provenmap/insights/<boardSlug>.context.json`. This canonical path is also what `--save-insight` loads as the oracle for its quality gates — so if you switch the primary board later, rebuild the pack for that board too. It resolves the board universe (the start board, its full child subtree, and its siblings) and emits the skill variables, the keyed element index, the edge adjacency, and a degree table — so you don't read every board JSON or generate scope keys and board aliases by hand, which is the main source of scope-validation failures on push.

- **Exit 0** → use the pack for the context variables (step 4), the scope (step 7), and the payload paths (step 9).
- **Exit 1/2 or any error** → fall back to the manual walk below and generate keys/aliases by hand.
- **Skip when trivial:** for a single board under ~30 nodes with no manifest/child boards, reading that one board JSON directly is simpler — skip the prepass.

Pack shape (version 2): `boards[]` (`{slug, alias, name, kind, layer, parentBoardSlug, context:{techStacks,languages,archetypes}, nodeCount, edgeCount}` — `kind` is `landscape` | `app` | `layer` | `standalone`), `scopeBoards[]` (legacy scope helper — unused in v2; use `boards[].slug` and `elements[].slug` directly for trail stops), `elements[]` (`{key, board, slug, type, name, description, parent, childBoard, family, detail, attributes?, kind?}` — `slug` is the canonical node slug to use in trail stops; `parent` is the container slug on the same board; `childBoard` the drill-down board the node opens; `family` the archetype's structural role from the server catalogue (`datastore`, `external`, `endpoint`, … or null); `detail` the clamped detailed description; `attributes` the stored archetype attribute values when any; `kind: "port"` marks a boundary port, a hand-off to the parent board's node that is **never a trail stop** — cross with `via: { kind: "layer", direction: "ascend" }` to the node named after `port--`, on the board's `parentBoardSlug`), `edges[]` (`{board, slug, sourceKey, targetKey, sourceSlug, targetSlug, type, description, weight, class}` — `slug` is what a trail's `via.edge` carries, verbatim; `weight` is the import count behind a rollup edge, or null for a model-authored one — rank dependency strength by it; `class` is `primary` for every edge of a current board — a `reserve:hub` / `reserve:budget` value only appears on a board an earlier round wrote, and is real coupling either way, walk it freely), `degree[]` (`{key, board, fanIn, fanOut}`, ranked by **combined** fan-in+fan-out, most-connected first; ports have no row), `primaryBoardDefault`, `stats` (`{boardCount, elementCount, edgeCount, droppedEdges, droppedEdgeBoards[], duplicateSlugs, unresolved[], crossBoardEdges}`). A non-zero `droppedEdges` means some board edges had unresolved endpoints and were omitted — don't assume two nodes are unconnected solely because no `pack.edges` row links them.

Fallback — read the board's analysis data from `.provenmap/boards/<boardSlug>.json` and extract skill variables — see [graph-context.md](graph-context.md) for details. Also read `.provenmap/boards/manifest.json` (if it exists) to discover child/layer boards. For nodes that have a `layerBoardSlug`, read that child board's data file too to enable cross-board analysis. Also read any sibling boards discovered from the manifest to enable cross-domain paths.

- `{{boardSlug}}` — the root board slug from config (used as default primary board)
- `{{primaryBoardSlug}}` — the board slug to use as the top-level primary for this insight (defaults to `{{boardSlug}}`, see Primary Board Selection below)
- `{{techStacks}}` — from `metadata.techStacks`
- `{{detectedLanguages}}` — from `metadata.languages`
- `{{nodeArchetypes}}` — unique archetype names (node `type` field) from nodes
- `{{focusNodes}}` — node slugs with their archetypes and descriptions

#### Primary Board Selection

Determine `{{primaryBoardSlug}}` — the board to use as the top-level primary for this insight:

1. **Default** — `pack.primaryBoardDefault` (the board the pack was built for); without a pack, the root board from config (`{{boardSlug}}`)
2. **User prompt match** — if `{{userPrompt}}` names a domain or component that matches a board in `pack.boards` (fallback: the manifest), use that board
3. **Skill scope** — if the skill's instructions explicitly target a specific layer or domain, use the matching board
4. **Finding concentration** — if during analysis the majority of findings relate to elements on a single child board, switch to it

Pick only from `pack.boards`: the board you choose must **not** appear in `pack.stats.unresolved` (a board the pack couldn't load). Store the result as `{{primaryBoardSlug}}` — this goes in the top-level `boardSlug` of the push command. Trail stops on sibling/child boards reference those boards by their canonical slug directly.

### 3. Read Skill Instructions

The skill's `instructions` field contains the primary analysis task. This is the "skill body" — Claude follows it verbatim.

If the skill has no `instructions` (null), skip it and report "Insight skill '<slug>' has no instructions".

### 4. Interpolate Skill Variables

Replace `{{variable}}` placeholders in the instructions with values from the board context (step 2) and the user's prompt.

**From the pack:** source `{{techStacks}}`, `{{detectedLanguages}}` and `{{nodeArchetypes}}` from the `.context` of the `pack.boards[]` entry whose `slug` equals `{{primaryBoardSlug}}`, and format `{{focusNodes}}` from that board's `pack.elements` rows (slug, type, description). The `metadata.*` sources in the table below are the fallback walk:

| Variable                | Source                                                    | Example Value                             |
| ----------------------- | --------------------------------------------------------- | ----------------------------------------- |
| `{{boardSlug}}`         | `metadata.boardSlug`                                      | `my-app-overview`                         |
| `{{techStacks}}`        | `metadata.techStacks` joined by `, `                      | `react, node, postgres`                   |
| `{{detectedLanguages}}` | `metadata.languages` joined by `, `                       | `typescript`                              |
| `{{nodeArchetypes}}`    | Unique `type` values from `nodes[]`                       | `Service, Database, Queue`                |
| `{{focusNodes}}`        | Formatted node list                                       | `- auth-service (Service): Handles login` |
| `{{userPrompt}}`        | User-provided focus prompt (empty string if not provided) | `check the auth service for OWASP risks`  |

After replacing all `{{variable}}` placeholders, if `{{userPrompt}}` is non-empty, append the following section at the end of the instructions:

```
## User Analysis Focus
{{userPrompt}}
```

Use this focus to prioritise findings, narrow scope, or highlight areas the user explicitly cares about. Omit this section if `{{userPrompt}}` is empty.

### 5. Execute Analysis

Follow the interpolated instructions. Typically this involves:

- Reading source files via Read/Glob/Grep tools
- Scanning for patterns described in the instructions
- Consulting references when the instructions say "see `<reference-name>`"

### 6. Consult References On Demand

When instructions reference a named document (e.g., "see `owasp-patterns`"), find the matching entry in the skill's `references[]` array by `name` and read its `content`.

References are named markdown documents that provide detailed detection patterns, classification rules, or domain knowledge the analysis needs.

### 7. Plan trail stops for each finding

Before writing InsightDraft objects, identify the board and node slugs for each finding's trail. Trails use canonical slugs directly — no scope dictionary, no element keys, no board aliases.

**From the pack:**

- Board slugs: `pack.boards[].slug` — use the exact string, e.g. `"my-project-overview"`.
- Node slugs: `pack.elements[].slug` — use the exact string, e.g. `"auth-service"`.
- Edge slugs: `pack.edges[].slug` — copy verbatim (server format `<source>--<relation>--<target>`); never derive one.

**Rules:**

- Every trail must have exactly one entry stop (no `from`).
- All subsequent stops set `from` to the `id` of the stop they follow.
- `via` is required when `from` is set; forbidden on the entry stop.
- Two stops with the same `from` create a branch — label them with `branchLabel`.
- A component found in source that has no `pack.elements` row becomes a `proposed: true` stop on the trail, plus a `proposal` field on the InsightDraft.
- Board-level finding (no specific node): one stop with `board` set and `node` omitted.

### 8. Produce InsightDraft objects

For each finding, create an `InsightDraft` with a trail grounded on pack slugs:

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

Field guide:

- **`name`** — short label (≤ 100 chars), imperative.
- **`insight`** — evidence-driven description (5–500 chars). State _what_ you found and _why_ it matters. Opinions live in `advice.text`.
- **`polarity`** — one of `risk`, `strength`, `opportunity`, `observation`.
- **`priority`** — one of `critical`, `high`, `medium`, `low`.
- **`confidence`** — one of `verified` (read the code), `likely` (strong evidence), `inferred` (derived from patterns), `speculative` (pattern-match guess). Be honest; the renderer surfaces this.
- **`impact`** — optional. Consequence if unaddressed (risk/opportunity) or gained by leveraging (strength). Max 300 chars.
- **`measurement`** — optional. Attach quantitative data to any polarity: `{ value, unit, baseline?, threshold?, trend? }`.
- **`tags`** — free-text classification keywords (max 10).
- **`advice`** — one object: `{ kind: "recommendation", text, effort }` when there is a concrete action; `{ kind: "context", text }` for background only. Never both. `effort` (`trivial`|`small`|`medium`|`large`|`epic`) is required for recommendations, omitted for context.
- **`trail`** — minimum 1 stop. See [report-output-format.md](report-output-format.md#trail) for the full Stop schema.
- **`proposal`** — optional. Set when the finding proposes a structural board change. See [report-output-format.md](report-output-format.md#proposal).

#### Multi-stop trail example

When a finding traces a flow (blast radius, dependency cascade, auth path), use multiple stops:

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
    { "id": "s2", "from": "s1", "via": { "kind": "edge", "edge": "api-gateway--calls--auth-service" }, "board": "my-project-overview", "node": "auth-service", "note": "850ms p99" },
    { "id": "s3", "from": "s2", "via": { "kind": "edge", "edge": "auth-service--calls--user-db" }, "board": "my-project-overview", "node": "user-db", "note": "Read per request" }
  ]
}
```

Ground every consecutive stop pair against `pack.edges`. Two stops with the same `from` express a branch (fan-out). A stop on a different board uses `via: { kind: "layer", direction: "descend" }` or `via: { kind: "jump" }` for unrelated hops.

### 9. Structural proposals

There is no separate `GraphSuggestion` step. When the analysis identifies a structural improvement (add a node, remove an edge, modify a container), set `proposal` on the InsightDraft whose trail names the affected elements. A `proposed: true` stop marks a node that doesn't exist yet.

```json
{
  "name": "Add Redis cache layer",
  "insight": "auth-service queries user-db on every request; no caching layer exists.",
  "polarity": "opportunity",
  "priority": "high",
  "confidence": "verified",
  "advice": { "kind": "recommendation", "text": "Introduce Redis; cache sessions with 15-min TTL.", "effort": "medium" },
  "trail": [
    { "id": "s1", "board": "my-project-overview", "node": "auth-service" },
    { "id": "s2", "from": "s1", "via": { "kind": "proposedEdge" }, "board": "my-project-overview", "node": "redis-cache", "proposed": true, "parent": "infra-container" }
  ],
  "proposal": { "action": "add", "targetType": "node", "changes": [{ "field": "name", "before": null, "after": "Redis Cache" }] }
}
```

See [report-output-format.md](report-output-format.md#proposal) for the full Proposal schema.

### 10. Assemble and Save

Build the `PushInsightsCommand` JSON. The `insights` field is a flat `InsightDraft[]` — no wrapper object, no scope, no paths, no suggestions:

```json
{
  "boardSlug": "<primaryBoardSlug>",
  "insightSkillSlug": "<skill.slug>",
  "insights": [
    {
      "name": "Hardcoded JWT Secret",
      "insight": "JWT secret is a string literal in src/auth/login.ts:42.",
      "polarity": "risk",
      "priority": "critical",
      "confidence": "verified",
      "advice": { "kind": "recommendation", "text": "Read JWT_SECRET from env; rotate via deployment.", "effort": "small" },
      "trail": [
        { "id": "s1", "board": "my-project-overview", "node": "auth-service" }
      ]
    }
  ],
  "tags": ["risk:security-review", "area:auth"],
  "info": "<one-line audit summary of what this analysis surfaced, ≤350 chars>"
}
```

Before assembling, pull the org's ContextTag vocabulary so you tag with names the org actually uses:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-context-tags.js
```

Notes:

- **`insights`** — `InsightDraft[]`. Every trail stop's `board` must be a slug from `pack.boards[].slug`; every `node` must be from `pack.elements[].slug`. The CLI validates this.
- **`tags`** — curated ContextTag names classifying the **whole** insight (risk area, domain, lifecycle). Copy names **verbatim** from `pmap-context-tags.js` output (`tagNames`); the server **drops** any name not in the vocabulary. Optional — omit or use `[]` when none fit. Distinct from the per-finding `tags` inside each InsightDraft, which are free-text keywords.
- `info` is a short (≤ 350 char) human-readable line describing **what this run surfaced** — e.g. `"3 auth risks incl. a hardcoded JWT secret; missing rate-limit on the payment path"`. Be specific; if omitted, the CLI falls back to a generic label.

Write the payload to a temp file (e.g. `/tmp/insight-<slug>.json`). **First ensure the pack exists for `{{primaryBoardSlug}}`** — if you switched the primary board, rebuild it now (`--build-context --board-slug <primaryBoardSlug> --out .provenmap/insights/<primaryBoardSlug>.context.json`). Then save with `--require-pack`:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-insights.js --save-insight /tmp/insight-<slug>.json --board-slug <primaryBoardSlug> --require-pack --push --host claude --domain code
```

The CLI runs validation gates before writing/pushing:

1. Zod schema (structural validity).
2. Trail validation: every stop's `board` resolves in the pack; every `node` resolves on that board; `via` is present iff `from` is set; exactly one entry stop; no duplicate `id`s within a trail; `proposed: true` stops name a `node`.
3. Grounding against the context pack (when present): every stop's `board` and `node` exist in the pack, and every `via.edge` is a real `pack.edges[].slug` that joins the two stops (HARD — the server rejects the push otherwise; only a board with `droppedEdges` downgrades a missing edge to a warning).

Two channels: **`validationErrors[]` + exit 3** is blocking — fix the listed fields and retry (errors carry a JSON path, the bad value, and the fix; copy any "did you mean" pack row verbatim). **`warnings[]` + exit 0** is non-blocking and already saved — review once and improve if cheap, but **do not loop** on warnings.

### 11. Report Result

- If pushed successfully: "Pushed to server (batchId: abc-123, N insights)". The result's `insights[]` lists the created rows in send order — keep it when proposing intents from these findings in the same session; nothing can recover that mapping later.
- If push not available: "Saved locally — server push not yet available"
- If push failed: "Saved locally — push failed: <error>"
