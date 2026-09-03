---
name: archetype-attributes
user-invokable: false
description: The archetype field contract — which node/edge properties a codebase may fill, which belong to the architect, and how a value reaches the board. Use when authoring board nodes with `attributes`, when a sync reports dropped attribute values, or when deciding whether a property can be evidenced from code at all. Key capabilities: the three ownership tiers, the evidence bar for a model-filled field, the closed-vocabulary rule.
license: MIT
compatibility: Claude Code plugin. Requires Node.js 18+ for bundled scripts.
metadata:
  author: ProvenMap
  version: 0.1.0
---

# Archetype attributes

Every archetype declares a **field contract** — the properties a node or edge of that type
carries in the ProvenMap app. `service` declares 25 of them; `module` declares 13; even
`sync_call` declares 4. Filling them is what turns a board from a picture into something an
architect can query.

Most of that contract is **not fillable from a codebase**, and the single most damaging thing
you can do here is fill it anyway.

## The three tiers

**Tier A — the script fills it.** `pmap-prepass.js --attributes <board> --apply` resolves these
from the manifest and the file tree, during `/sync`. Do not author them by hand; the script is
the authority and will overwrite a hand-written value with the manifest's:

`primaryLanguage` · `technologies` · `version` · `packageName` · `registry` · `moduleType` ·
`codeLocation` · `dependencies` · `parentModule` · `parentContainer` · `childModules` · `provider`

**Tier B — you fill it, from evidence you actually read.** These describe what the code *means*,
which no deterministic pass can decide. Write them onto the node's `attributes` map as you author
the board, in the same pass where you already have the area open:

`domain` · `protocol` · `apiFormat` · `authType` · `authentication` · `authorization` · `method` ·
`path` · `schemas` · `collections` · `routes` · `exposedInterfaces` · `consumedInterfaces` ·
`responsibilities` · `integrationPattern` · `interactionStyle` · `dataFormat` · `businessCapability`

**Tier C — leave it absent.** Operational and organisational facts. A repository does not contain
them, and the architect owns them in the app:

`owner` · `owningTeam` · `sla` · `stage` · `status` · `cloudProvider` · `monitoring` · `logging` ·
`deploymentEnvironment` · `backupPolicy` · `failoverStrategy` · `scalability` · `orchestration` ·
`containerization` · `dataClassification` · `criticality` · `stakeholders` · `encryption` ·
`testCoverage`

Twelve of the twenty most frequently declared field names are Tier C, so this is most of the
contract by volume. Leaving them empty is not a gap in your work — it *is* the work.

## Why absence is the point

An architect opening the properties panel needs to know which cells are measured and which still
need a human. A guess sitting in the same panel as a measurement is indistinguishable from one,
and it does not degrade the board gracefully: it destroys the reader's ability to trust *any*
value on it, including the ones that were correct.

So: `status: "active"` because the repo has recent commits is a fabrication. `cloudProvider: "AWS"`
because a Terraform file mentions a bucket is a fabrication. If you did not read the fact, the
field stays absent.

## The evidence bar for a Tier-B field

Write the value only when you can point at the thing that says so, in the area you already read:

- `protocol: "HTTP/REST"` — because you read the controller decorators, not because it's a service.
- `domain: "billing"` — because the module's own naming and its callers say so, not because the
  directory is called `billing` and you are guessing at intent.
- `schemas` / `collections` — because you read the model definitions or the migration.
- `authType` — because you read the guard, the middleware, or the client's auth header.

One node with three evidenced fields is worth more than twenty nodes with a full panel of
plausible ones.

## The vocabulary is closed

Many fields declare an option list, and the server rejects anything outside it. The lists are
often narrower than reality: `technologies` accepts five values; `primaryLanguage` names six of
the twelve languages the analyser recognises.

Use the **exact declared spelling** — `HTTP/REST`, not `http` or `REST`. When the vocabulary has
no entry for what you found, leave the field absent rather than picking the nearest thing; the
sync report groups every dropped value by field, and a field rejecting the same value repeatedly
is a real gap to take to `/analyze-archetypes`, which is how the catalogue gets extended.

## Shape

`attributes` is flat: a field name maps to a scalar, or to an array of scalars for a field the
contract marks as multi-valued. Nested objects are dropped on ingest and the board integrity gate
(`A-ATTR-SHAPE`) rejects them at authorship.

```json
{
  "slug": "billing-api",
  "type": "service",
  "attributes": {
    "domain": "billing",
    "protocol": "HTTP/REST",
    "authType": "JWT"
  }
}
```

The script folds its Tier-A values into this map at sync time without touching your keys, and
anything an architect typed in the app survives every later sync — the plugin only ever
re-derives its own fields.
