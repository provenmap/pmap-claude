# Styling worked examples

Six exemplar boards, end to end: what the signals reported, the plan that followed, and why.
Each dataset is a test fixture in the plugin's source repo — the plan validates with zero errors
and zero warnings, and every signal and plan below is pinned by tests there, so this prose cannot
drift from the code.

Read them for the **omissions** as much as the entries. Three of the six plans carry no
semantic token at all, none tokens more than a handful of elements, and no plan tokens an edge
that follows the board's dominant flow — composition, size and icons do the styling. The archetype names and digests
shown are each fixture's own catalogue, not a real one — always read the live catalogue.

## c4-context — C4 context diagram of an e-commerce platform: one system under discussion, two people, four external services.

**Board:** 7 nodes (0 containers), 6 edges.
**Signals said:** prominence `acme-platform` (6 weighted connections); external cohort
`payment-gateway`, `email-provider`, `shipping-api`, `analytics` (archetype "external-system");
arrangement suggestion **flow** (5/6 labelled edges read as request/data flow).
**Catalogue said:** every archetype on this board asserts kind — `person` (icon User),
`software-system` (icon Box), `external-system` (icon Cloud).

**Plan (validates clean):**

```json
{
  "workBoardSlug": "acme-context",
  "composition": { "board": { "arrangement": "flow", "orientation": "horizontal", "density": "normal" } },
  "semantics": {
    "elementRequests": [
      { "primitiveType": "node", "nodeSlug": "acme-platform", "semanticToken": "emphasis", "size": "xl" },
      { "primitiveType": "node", "nodeSlug": "payment-gateway", "size": "xs" },
      { "primitiveType": "node", "nodeSlug": "email-provider", "size": "xs" },
      { "primitiveType": "node", "nodeSlug": "shipping-api", "size": "xs" },
      { "primitiveType": "node", "nodeSlug": "analytics", "size": "xs" },
      { "primitiveType": "edge", "edgeSlug": "acme-platform--email-provider", "semanticToken": "asynchronous" },
      { "primitiveType": "edge", "edgeSlug": "acme-platform--analytics", "semanticToken": "stream" }
    ]
  },
  "icons": {
    "nodeApplications": [
      { "nodeSlug": "acme-platform", "shapeType": "rectangle", "lucideIconName": "ShoppingCart", "displayStrategy": "shape_with_icon" }
    ]
  }
}
```

**Why:** One node and two edges carry a token — three tokens across thirteen elements.
`acme-platform` gets emphasis+xl because "this is the system under discussion" is a fact about
*this board*, which no archetype can hold — every `software-system` in the org shares that
archetype and only one of them is the subject here. The four externals get **size only**: their
archetype already says external, so a `subtle` token would only restate it — small at the
edges does the same work without spending a token. `customer` and `admin` appear
nowhere in the plan: the `person` archetype says what they are and nothing about them differs.
The board's dominant flow is a plain request, so those four edges stay **untokened**; only the
two that differ are marked — email is fire-and-forget (`asynchronous`), analytics is an event
`stream`. Only one icon is applied, and only because it is specific — the generic Box the
`software-system` archetype carries cannot say "e-commerce", whereas the person and external
archetypes already carry icons that need no help.

## data-pipeline — Data pipeline from event ingestion through transformation to analytics dashboards.

**Board:** 6 nodes (0 containers), 5 edges.
**Signals said:** prominence `transform` (6 weighted connections); external cohort `segment`
(archetype "external-system"); arrangement suggestion **flow** (4/5 labelled edges read as
request/data flow).
**Catalogue said:** `external-system`, `integration-service`, `database` and `frontend` all
assert kind; `app-service` is **style-less** (`styling: null`).

**Plan (validates clean):**

```json
{
  "workBoardSlug": "metrics-pipeline",
  "composition": { "board": { "arrangement": "flow", "orientation": "horizontal", "density": "airy" } },
  "semantics": {
    "elementRequests": [
      { "primitiveType": "node", "nodeSlug": "segment", "size": "xs" },
      { "primitiveType": "node", "nodeSlug": "transform", "semanticToken": "application", "size": "lg" },
      { "primitiveType": "edge", "edgeSlug": "segment--ingest", "semanticToken": "stream" }
    ]
  }
}
```

**Why:** This is the near-miss board. `store` on `raw-store` and `warehouse` is the tempting
wrong move: both are archetyped `database`, which already paints a cylinder with a Database
icon — the Role token would replace that with the generic store palette and the reader would
learn nothing new. Same for `integration` on `ingest` (archetype `integration-service`) and
`presentation` on `dashboards` (archetype `frontend`). The one Role token that survives is
`application` on `transform`: its `app-service` archetype is style-less **and it is the only
such node on the board** — one of six, so the token tells it apart instead of blanketing a
group. `transform` is also the prominence pick, so it takes `lg`. `segment` takes size alone.
Four of the five edges are ordinary reads and writes — the dominant flow, left untokened — and
the one that differs, the ingest `stream`, is the only edge in the plan. The whole icons section
is gone — every icon it used to apply was one the archetype already carried, and a
present-but-empty section is rejected, so it is omitted.

## event-driven — Event-driven architecture with central message broker publishing to consuming services.

**Board:** 5 nodes (0 containers), 4 edges.
**Signals said:** prominence `event-bus` (12 weighted connections); external cohort none
detected; arrangement suggestion **flow** (4/4 labelled edges read as request/data flow).
**Catalogue said:** `message-broker` asserts kind (queue shape, Radio icon); `app-service` is
style-less.

**Plan (validates clean):**

```json
{
  "workBoardSlug": "orders-events",
  "composition": { "board": { "arrangement": "flow", "orientation": "horizontal", "density": "normal" } },
  "semantics": {
    "elementRequests": [
      { "primitiveType": "node", "nodeSlug": "event-bus", "size": "lg" }
    ]
  }
}
```

**Why:** The plan is composition and one size — **no tokens at all**, and that is the right
answer, not an unfinished pass. `queue` on `event-bus` fails the archetype test outright — the
`message-broker` archetype is already drawing a queue shape with a Radio icon. What `event-bus`
needs is not a label but **weight**: it is the sole prominence candidate (12 weighted
connections, the fan-out hub for four consumers), so it takes `lg` and nothing else. The four
consumers are archetyped `app-service`, which is style-less — the tempting move is `application`
on all four. But four of five nodes wearing one token tells nothing apart; it repaints the
archetype by hand. That is a catalogue gap (give `app-service` its own styling via
/archetypes), not a styling decision, so the plan leaves them alone and the presentation says
so. Every edge here is asynchronous — which makes asynchronous the board's **dominant flow**,
and the dominant flow is never tokened: the board description states "all communication is
asynchronous via the event bus" once, instead of four dashed edges saying it four times.

## frontend-app — Frontend application with layered structure: shell, pages, and reusable UI components.

**Board:** 8 nodes (3 containers), 4 edges.
**Signals said:** prominence `button-kit` (3 weighted connections); external cohort none
detected; arrangement suggestion **hierarchy** (4/4 labelled edges are ownership-like).
**Catalogue said:** `page` asserts kind; `layer-group` and `ui-component` are both style-less.

**Plan (validates clean):**

```json
{
  "workBoardSlug": "webapp-structure",
  "composition": { "board": { "arrangement": "hierarchy", "orientation": "vertical", "density": "normal" } },
  "semantics": {
    "elementRequests": [
      { "primitiveType": "node", "nodeSlug": "button-kit", "size": "lg" }
    ]
  }
}
```

**Why:** Again no tokens — the board is carried by `hierarchy` composition and one size. The
three `layer-group` containers are style-less, and `domain_boundary` on each is the tempting move;
but all three would take the *same* token, so it cannot tell one layer from another, and a
container already reads as a container. Identical tokens on every member of a group are paint.
The three pages get nothing: `page` asserts kind. The two components get nothing either — they
sit inside `shared-ui`, which already places them. `button-kit` takes `lg` alone: three separate
pages compose it, which is a fact about this graph that no archetype and no token can carry.
All four edges are the same "composes" relation — a uniform flow, so none is tokened. Vertical
hierarchy reads composition top-down, matching the ownership-like edges the signals found.

## legacy-modern-mix — Migration from legacy to modern billing system with a bridge service managing the transition.

**Board:** 5 nodes (0 containers), 5 edges.
**Signals said:** prominence `billing-v2` (12 weighted connections); external cohort `sap`
(archetype "external-system"); arrangement suggestion **flow** (directed edges with an uneven
hub structure).
**Catalogue said:** `database` and `external-system` assert kind; `app-service` is style-less.

**Plan (validates clean):**

```json
{
  "workBoardSlug": "billing-migration",
  "composition": { "board": { "arrangement": "flow", "orientation": "horizontal", "density": "normal" } },
  "semantics": {
    "elementRequests": [
      { "primitiveType": "node", "nodeSlug": "billing-v1", "semanticToken": "legacy" },
      { "primitiveType": "node", "nodeSlug": "billing-v2", "size": "lg" },
      { "primitiveType": "node", "nodeSlug": "migration-bridge", "semanticToken": "experimental" },
      { "primitiveType": "node", "nodeSlug": "sap", "size": "xs" },
      { "primitiveType": "edge", "edgeSlug": "migration-bridge--billing-v2", "semanticToken": "asynchronous" },
      { "primitiveType": "edge", "edgeSlug": "migration-bridge--billing-v1", "semanticToken": "asynchronous" }
    ]
  }
}
```

**Why:** The State category doing exactly what it is for — on the two nodes that deviate. All
three billing systems share the `app-service` archetype, so nothing distinguishes them
structurally; `legacy` and `experimental` are instance facts about *these systems at this
moment*, and an archetype could never carry them. `billing-v2` takes **no** State token:
`active` is the default, and a token for "nothing unusual here" spends attention to say
nothing — its `lg` (the prominence pick) already marks it as the destination. `invoice-db` is
dropped entirely — `store` would repaint the `database` archetype's cylinder to say "database"
again — and `sap` takes size alone. Live traffic is the dominant flow and stays untokened; the
bridge's two backfill/drain edges are the deviation, so they alone are `asynchronous`, marking
background reconciliation apart from the request path.

## microservices-landscape — Microservices landscape with API gateway routing to services, databases, and external systems.

**Board:** 12 nodes (3 containers), 8 edges.
**Signals said:** prominence `api-gateway` (57 weighted connections); external cohort `stripe`,
`auth0` (archetype "external-system"); arrangement suggestion **flow** (7/8 labelled edges read
as request/data flow).
**Catalogue said:** `domain-group`, `gateway-service`, `database` and `external-system` assert
kind; `app-service` is style-less.

**Plan (validates clean):**

```json
{
  "workBoardSlug": "shop-landscape",
  "composition": {
    "board": { "arrangement": "flow", "orientation": "horizontal", "density": "tight" },
    "containers": [
      { "nodeSlug": "services", "arrangement": "flow", "orientation": "vertical" }
    ]
  },
  "semantics": {
    "elementRequests": [
      { "primitiveType": "node", "nodeSlug": "api-gateway", "size": "lg" },
      { "primitiveType": "node", "nodeSlug": "stripe", "size": "xs" },
      { "primitiveType": "node", "nodeSlug": "auth0", "size": "xs" }
    ]
  },
  "icons": {
    "nodeApplications": [
      { "nodeSlug": "stripe", "shapeType": "square", "displayStrategy": "icon_only", "iconUrl": "other/2026-q1/simple-other/stripe/Stripe wordmark - Blurple.svg" },
      { "nodeSlug": "auth0", "shapeType": "square", "displayStrategy": "icon_only", "lucideIconName": "Lock" }
    ]
  }
}
```

**Why:** The largest board, and it carries **no tokens at all** — three sizes, one container
override and two icons do the work. The three `domain-group` containers get nothing: that
archetype's whole identity is a hued icon over a thin dashed shell with no fill, and
`domain_boundary` would paint a fill straight over it. `api-gateway` drops `gateway` (the
`gateway-service` archetype draws a hexagon with Waypoints) but keeps `lg`, because being the
57-weighted-connection hub is a fact about this graph, not about gateways. The databases drop
`store`. The four `app-service` nodes are style-less, and `application` on all four is the tempting
move — but four of twelve is a third of the board wearing one token, past the quarter where a
Role token stops distinguishing and starts repainting the archetype (the validator warns). The
gap belongs to the catalogue (/archetypes), and the presentation names it. All eight edges are
synchronous request/response — a uniform flow, stated once in the board description, tokened
nowhere. `stripe` and `auth0` take size only, but they are the two nodes that still earn icon
applications: their archetype's generic Cloud icon cannot say *which* SaaS this is. Both were
resolved in one batched `match_icons` call — stripe hit the catalog under its wordmark logo and
takes that `iconUrl` verbatim; auth0 came back in `unmatched` and falls back to Lucide, exactly
the split the tool exists to produce.
