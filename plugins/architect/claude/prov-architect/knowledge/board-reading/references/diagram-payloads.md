# Diagram write payloads

<!-- Source: platform services/prompts/base/diagram-tool-contract.ts — keep in
     lockstep with it; the wording there is the single copy every platform mode injects. -->

When creating or updating nodes, structure the call EXACTLY as:

```json
{
  "nodes": [
    {
      "slug": "string (NEW kebab-case slug for a new element; to update an existing one, reuse its EXACT slug from get_nodes)",
      "name": "string",
      "description": "string",
      "detailedDescription": "string | null",
      "archeType": "string | null (archetype name from get_archetypes; this sets the visual shape)",
      "primitiveType": "node | container | region | axis | callout | leader_annotation | text (semantic kind, NOT the shape — 'container' for grouping boxes that hold children, 'node' for regular elements; the shape comes from archeType)",
      "parentNodeSlug": "string | null (slug of the container node this belongs to)",
      "tags": ["string"]
    }
  ],
  "workBoardSlug": "string (the board to apply to)"
}
```

When creating or updating edges, structure the call EXACTLY as:

```json
{
  "edges": [
    {
      "slug": "string",
      "sourceSlug": "string (EXACT slug of an existing or just-created node)",
      "targetSlug": "string (EXACT slug of an existing or just-created node)",
      "name": "string",
      "description": "string",
      "detailedDescription": "string | null",
      "archeType": "string | null",
      "relation": "string",
      "tags": ["string"]
    }
  ],
  "workBoardSlug": "string (the board to apply to)"
}
```

The array IS the operation — always build the complete array and send it in ONE call.

To remove elements, call `delete_nodes` / `delete_edges` with the board slug and the EXACT slugs
to remove (from `get_nodes` / `get_edges`). Deleting a node removes its connected edges
automatically. On a governed board a removal is staged for review, not applied — the result
message tells you which happened.

## Creation order (empty or growing a board)

1. Analyze: domains, components, relationships.
2. Fetch archetypes via `get_archetypes`.
3. Plan order: containers first → nodes within containers (via `parentNodeSlug`) → standalone
   nodes → edges.
4. Execute: single `create_nodes` call with ALL nodes, then single `create_edges` call with ALL
   edges.
5. Summarize what was created (and what was staged as an intent).
