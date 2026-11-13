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

**Tier A — the script fills it.** `pmap-prepass.js --finalize` resolves these from the manifest
and the file tree when `/analyze` closes the board (`--attributes <board> --apply` is `/sync`'s
fallback for a board closed without cached contracts). Do not author them by hand; the script is
the authority: it replaces a hand-written value with the manifest's, and removes it where the repo
evidences nothing (an external system owns no files, so it gets none of these but `provider`):

`primaryLanguage` · `technologies` · `version` · `packageName` · `registry` · `moduleType` ·
`codeLocation` · `provider`

The package's own facts (`technologies`, `version`, `packageName`, `registry`) go only on the node
that IS the package, never on each component inside it.

Containment and dependencies are not attributes: the board already draws them as parents and
edges, so there is no field to restate them in.

**Tier B — you fill it, from evidence you actually read.** These describe what the code *means*,
which no deterministic pass can decide. Write them onto the node's `attributes` map as you author
the board, in the same pass where you already have the area open:

`protocol` · `apiFormat` · `authType` · `authentication` · `authorization` · `method` · `path` ·
`schemas` · `collections` · `routes` · `exposedInterfaces` · `consumedInterfaces` ·
`integrationPattern` · `interactionStyle` · `dataFormat` · `businessCapability`

A business area is a `domain:<name>` tag, never an attribute.

**Edges carry them too.** An edge's archetype declares its own fields (`sync_call` declares
`protocol`, for one). No script can fill these, since an edge owns no files, so what you write is
all an edge will ever carry. Write them on the edge's `attributes` map when you add or reclassify
the edge, under the same evidence bar.

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
- `schemas` / `collections` — because you read the model definitions or the migration.
- `authType` — because you read the guard, the middleware, or the client's auth header.

One node with three evidenced fields is worth more than twenty nodes with a full panel of
plausible ones.

## The vocabulary is closed

Many fields declare an option list, and the server rejects anything outside it. The lists are
often narrower than reality: `technologies` accepts a handful of values, while a repository can
name dozens of frameworks.

Use the **exact declared spelling** — `HTTP/REST`, not `http` or `REST`. When the vocabulary has
no entry for what you found, leave the field absent rather than picking the nearest thing. Every
value you write is checked against the contract when the board is closed: one the contract cannot
hold is taken off the board and listed by field, and a field rejecting the same value repeatedly
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
    "protocol": "HTTP/REST",
    "authType": "JWT"
  }
}
```

The script folds its Tier-A values into this map when the board is closed, without touching your
keys. Each sync sends the whole map: a value you stop writing is removed from the board, and a
value an architect typed over one of yours in the app is theirs and survives every later sync.
