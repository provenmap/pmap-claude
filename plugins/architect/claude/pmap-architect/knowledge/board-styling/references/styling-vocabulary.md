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

`semanticToken` and `size` are independent — send either, or both. A request naming neither is
rejected. Most requests on a good plan are **size only**, and most elements appear in no request
at all: tokens are a minority of the nodes, and one Role token never reaches past about a quarter
of them (the validator warns on both).

### What the archetype already asserts

Every archetype ships its own styles, and a token paints over them **only in its category's
channel** — one token per category, and categories layer:

| Category | Paints | Leaves alone |
| --- | --- | --- |
| Role | fill tint + stroke colour (boundaries add a dash) | pattern, effects, text |
| State — lifecycle (`inactive`, `experimental`, `planned`, `legacy`) | dash, fill pattern, fade | every colour |
| State — health (`active`, `healthy`, `degraded`, `failing`) | stroke colour (+ dash on `degraded`) | fill |
| Severity | stroke colour; `error` alone also tints the fill and lifts | everything else |
| Emphasis | ink rim + lift (`emphasis`), fade (`subtle`); `neutral` paints nothing | hue |
| Flow (edges) | dash, width; `bidirectional` repeats the edge's own arrowhead at the start | the edge's colour and arrowhead |

No token touches text colour, corners, shape or icon. Where two categories name the same field
the later one wins, in this order: Role → Flow → Emphasis → State → Severity — so a `store` that
is `legacy` and carries a `warning` shows all three, with the warning owning the rim's colour.
Red is status only (`failing`, `error`); no Role token uses it.

So the archetype question is a **Role** question: a Role token takes exactly the channel an
archetype uses to assert kind. *Is what it says worth overwriting what was there?*

The archetype catalogue answers that, and the **signals already carry it** — both domains put
every archetype in use, and what it asserts, on `signals.archetypeProfiles` (the printed summary
counts them; the profiles themselves are on the JSON payload and in the signals file). Never
fetch a catalogue during styling; the signals step did it once. Each profile carries a digest:

| Field | Meaning |
| --- | --- |
| `assertsKind` | it paints fill/stroke/text — it is already saying what kind of thing this is |
| `shape` | the shape it pins (`cylinder`, `hexagon`, …) |
| `icon` | the icon it already carries — a lucide name or a catalog path |
| `sizePreset` | set only when the archetype pins a size; normally null |

`styling: null` means a **style-less** archetype: nothing to collide with, so a Role token is
*allowed* — while the elements taking it stay a small minority of the board. A style-less
archetype that covers much of the board is a catalogue gap (/archetypes), not a reason to token
every element of it. A **missing** archetype (no entry at all)
means the catalogue is unknown here; judge on the description alone.

The digest is deliberately absent from the catalogue that analysis and board authoring read:
when you are *classifying* an element — deciding which archetype it IS — what that archetype
paints is irrelevant, and the catalogue is long.

Read it before every token and every icon application. An `icon` in the digest means an icon
application only earns its place when it says something the archetype's generic one cannot — a
specific brand, a specific product.

Never rely on remembered archetype names: admins add, edit and approve archetypes, so the
catalogue is the only current truth.

Optional `size` on node/container requests: `xs` (80×80), `sm` (120×80), `md` (180×120, the
default — omit unless a node should stand out), `lg` (240×160), `xl` (360×240 — the system under
discussion). lg/xl show descriptions; xs shows none.

`xs` draws its label **below** the shape on one truncating line, so it fits a node recognised by
its icon with a short name; an icon-less or long-named node takes `sm` instead. That is a
legibility fact, not a rule about which nodes are peripheral — the token that says "peripheral"
is `subtle`, at any size.

## Edge tokens

State, Emphasis, Severity as above, plus Flow: `synchronous` (solid, blocking), `asynchronous`
(dashed), `stream` (thick), `bidirectional` (double arrow). Edges take NO size and NO
Role token.

Token only the edges that **differ from the board's dominant flow**. The dominant flow stays
untokened; when every edge flows the same way, no edge takes a Flow token and the board
description states it once. The validator warns when more than half the edges carry a token (an
`emphasis` path is attention, not flow, and is not counted).

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
(the default choice for systems).

### Real brand icons first — Lucide is the fallback, not the default

For every node whose archetype is a brand, cloud provider or SaaS integration (architect plugin
only — these MCP tools exist in the architect flow, not in the code plugin), resolve names against
the catalog with ONE batched `match_icons` call, before the plan's tokens and sizes are final:

    match_icons({ names: ["Stripe", "Cognito", "Resend", "Widgetron"] })
      → { results: [
            { name: "Stripe", matched: true,
              icons: [{ displayName: "Stripe wordmark   Blurple",
                        svgPath: "other/2026-q1/simple-other/stripe/Stripe wordmark - Blurple.svg", … }] },
            { name: "Widgetron", matched: false, icons: [] } ],
          unmatched: ["Widgetron"] }

Query the distinctive product token (`Cognito`, `Stripe`), not a vendor-prefixed phrase (`AWS
Cognito`) — catalog keywords are single words split from the display name, so a multi-word query
only matches as a literal substring.

It searches every provider at once, including `other` — where SaaS and dev-tool brand logos live.
The `unmatched` list is the ONLY set that gets a `lucideIconName`; everything else takes its
catalog hit. `lucideIconName` accepts any lucide name (Server, Database, User, ShoppingCart,
Waypoints, Radio…).

### The `iconUrl` contract — pass `svgPath` verbatim

Take the matched icon's `svgPath` exactly as the catalog returned it and put that string in
`iconUrl`. Do **not** build a URL from it, prefix a bucket or CDN host, or read infra config for a
base URL — the server accepts the catalog-relative path and the web client resolves it at render
time.

`iconUrl` is **not** `customSVGPath`. That field carries raw SVG path *data* (an `M12 2L2 7…`
string), not a file reference; putting a path there renders nothing, silently.

    { "nodeSlug": "stripe", "shapeType": "square", "displayStrategy": "icon_only",
      "iconUrl": "other/2026-q1/simple-other/stripe/Stripe wordmark - Blurple.svg" }
