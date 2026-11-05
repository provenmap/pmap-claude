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
- `relation` = `edge.type` — the edge's identity (the server slug is `<source>--<relation>--<target>`), so it never changes for display
- `name` = the label the line carries on the board, first of: the edge's own `label` (the analyzer's verb phrase, e.g. "compiles against"); for a generic import relation (`uses`, `dependency`, `depends_on`) crossed by ONE import kind, that kind's verb ("imports", "uses types from", "lazy-loads"); the archetype's verb (`sync_call` → "calls", `reads_from` → "reads from"; an unmapped archetype reads as its own name in words). The server replaces only a label the code wrote (none yet, still its relation, or the label this source pushed last); a label an architect typed in the app survives every push

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

Every node located in the repository is pushed with one source reference carrying its
repo-relative `path` and nothing else. `--finalize` stamps that path from the node's
`coveredFiles` (one file: the file; more: the deepest directory they share; a container: its
children's), so only a node that claims no place — an external, an actor, a port — has none. The platform fills in the rest: the source it belongs to from the board's binding,
and the link to open it from the repository URL and branch recorded on that binding (`/login`
records the repository; a push from a binding that has none records it once). The plugin never
builds a link. `"includeSourceReferences": false` in `config.json` omits the references.
