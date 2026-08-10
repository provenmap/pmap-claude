# Styling vocabulary

Keep in lockstep with platform (`semantic-tokens.types.ts`, `size-presets.ts`,
`arrangement-specs.ts`, `composition-presets.ts`, `elk/diagram-types.ts`) — pinned by the
`style-*` contract snapshots in the plugin repo.

## The styling plan file

One JSON file drives all three apply_* calls:

```json
{
  "workBoardSlug": "<board>",
  "composition": {
    "board": { "arrangement": "flow|hierarchy|network", "orientation": "horizontal|vertical", "density": "tight|normal|airy" },
    "containers": [{ "nodeSlug": "<container>", "arrangement": "...", "orientation": "...", "density": "..." }]
  },
  "semantics": { "elementRequests": [
    { "primitiveType": "node|container", "nodeSlug": "<slug>", "semanticToken": "<node token>", "size": "xs|sm|md|lg|xl" },
    { "primitiveType": "edge", "edgeSlug": "<slug>", "semanticToken": "<edge token>" }
  ]},
  "icons": { "nodeApplications": [
    { "nodeSlug": "<slug>", "shapeType": "rectangle", "lucideIconName": "Server", "displayStrategy": "icon_only|shape_only|shape_with_icon" }
  ]}
}
```

`composition` maps to `apply_composition` (drop the wrapper key), `semantics` to
`apply_semantic_styles`, `icons` to `apply_icon_shape_styles` — each tool also takes
`workBoardSlug`. Send only the sections you use: a section that is present must carry at least
one entry (`elementRequests` / `nodeApplications`) — an empty one is rejected, so omit it.

## Node/container tokens (apply_semantic_styles)

| Category | Tokens | Asserts |
| --- | --- | --- |
| State | active, inactive, experimental, planned, legacy, healthy, degraded, failing | lifecycle / operational state |
| Emphasis | neutral, subtle, emphasis | attention (emphasis is capped at 10% of leaves) |
| Severity | info, success, warning, error | findings / risk |
| Role | presentation, application, domain, infrastructure, integration, gateway, cache, queue, store, security_boundary, domain_boundary, public_api, private_api | architectural responsibility |

Optional `size` on node/container requests: `xs` (60×60, label below — externals/peripherals),
`sm` (120×80), `md` (180×120, the default — omit unless a node should stand out), `lg`
(240×160), `xl` (300×200 — the system under discussion). lg/xl show descriptions; xs shows none.

## Edge tokens

State, Emphasis, Severity as above, plus Flow: `synchronous` (solid, blocking), `asynchronous`
(dashed), `stream` (thick, animated), `bidirectional` (double arrow). Edges take NO size and NO
Role token.

## Composition (apply_composition)

| Arrangement | Engine | Orientable | Use for |
| --- | --- | --- | --- |
| flow | ELK layered | yes | grouped systems, pipelines, request paths (the default) |
| hierarchy | ELK mrtree | yes | ownership, org structure, decomposition |
| network | ELK force | **no** | peers with no dominant direction |

Orientation: `horizontal` (reads left→right) or `vertical` (top→down) — these are the only two
directions the platform renders. Density: `tight` (0.7×), `normal`, `airy` (1.4×). Set board
composition once; per-container overrides only where a container genuinely reads differently.
Orientation without arrangement merges onto the stored arrangement.

## Icons (apply_icon_shape_styles)

`shapeType` is **required** on every icon application and is a closed enum — anything else is
rejected at apply time. The values: `circle`, `square`, `rectangle`, `rounded-rectangle`,
`diamond`, `triangle`, `parallelogram`, `hexagon`, `file-shape`, `cloud`, `cylinder`, `database`,
`left-arrow-rectangle`, `right-arrow-rectangle`, `ellipse`, `person`, `queue`, `component`,
`note`, `browser`, `mobile-device`, `package`.

`displayStrategy`: `icon_only` (people, well-known services), `shape_only`, `shape_with_icon`
(the default choice for systems). `lucideIconName` takes any lucide name (Server, Database,
User, ShoppingCart, Waypoints, Radio…). For cloud-provider icons (architect plugin only — these
MCP tools exist in the architect flow, not in the code plugin) search the catalog first:
`search_icon_categories` → `search_icon_subcategories` → `search_icons`, then pass `iconUrl`.
