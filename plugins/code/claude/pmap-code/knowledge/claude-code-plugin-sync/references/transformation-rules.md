# Code Archetype Transformation Rules

Transforms analysis nodes/edges to ProvenMap format for visualization.

## Node Transformation

The `node.type` field already contains the server archetype name (assigned during analysis using archetypes fetched from the server). The transformer passes it through directly:

- `archetypeName` = `node.type` (pass-through)
- `primitiveType` = `'container'` if the node has children, otherwise `'node'`

No hard-coded archetype mapping is used. The analysis agent is responsible for assigning valid server archetype names to each node's `type` field.

## Edge Transformation

The `edge.type` field already contains the server archetype name. The transformer passes it through directly:

- `archetypeName` = `edge.type` (pass-through)
- `relation` = `edge.type`

## Slug Generation

- Node slugs are derived from the node `slug` field
- Must be 1-200 characters, kebab-case
- Parent-child relationships preserved via `parentNodeSlug`

## Tags

A node's and an edge's `tags` travel as written, after one local check: names that differ
only in case or punctuation fold into one (the org's existing spelling when the cached tag
list has it, else the first written), and a name with no ASCII letter or digit, or over 50
characters, is dropped with a warning (`tagWarnings`). The server creates any other new name once and reports what it
withheld in `withheldTags`. Nothing is synthesised: the archetype travels as `archetypeName`,
and framework and language go in the detailed description.

## Source References

When `sourceSlug` and `sourceId` are provided, file paths are attached as source references for code traceability.
