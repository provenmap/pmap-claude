# Styling worked examples

Six exemplar boards, end to end: what the signals reported, the plan that followed, and why.
Each dataset is a test fixture (`packages/shared/src/__tests__/fixtures/board-styling/`) — the
plan validates with zero errors and zero warnings, and the signals below are pinned by
`board-styling-fixtures.test.ts`, so this prose cannot drift from the code.

Read them for the **omissions** as much as the entries. Every board here leaves most elements
untouched, because their archetypes already say what they are. The archetype names and digests
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
      { "primitiveType": "edge", "edgeSlug": "acme-platform--payment-gateway", "semanticToken": "synchronous" },
      { "primitiveType": "edge", "edgeSlug": "acme-platform--shipping-api", "semanticToken": "synchronous" },
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

**Why:** One node carries a token. `acme-platform` gets emphasis+xl because "this is the system
under discussion" is a fact about *this board*, which no archetype can hold — every
`software-system` in the org shares that archetype and only one of them is the subject here.
The four externals get **size only**: their archetype already says external, so a `subtle` token
would repaint its palette to restate it — small at the edges does the same work without the
overwrite. `customer` and `admin` appear nowhere in the plan: the `person` archetype says what
they are and nothing about them differs. Only one icon is applied, and only because it is
specific — the generic Box the `software-system` archetype carries cannot say "e-commerce",
whereas the person and external archetypes already carry icons that need no help.

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
      { "primitiveType": "edge", "edgeSlug": "segment--ingest", "semanticToken": "stream" },
      { "primitiveType": "edge", "edgeSlug": "ingest--raw-store", "semanticToken": "synchronous" },
      { "primitiveType": "edge", "edgeSlug": "raw-store--transform", "semanticToken": "synchronous" },
      { "primitiveType": "edge", "edgeSlug": "transform--warehouse", "semanticToken": "synchronous" },
      { "primitiveType": "edge", "edgeSlug": "warehouse--dashboards", "semanticToken": "synchronous" }
    ]
  }
}
```

**Why:** This is the near-miss board. `store` on `raw-store` and `warehouse` is the tempting
wrong move: both are archetyped `database`, which already paints a cylinder with a Database
icon — the Role token would replace that with the generic store palette and the reader would
learn nothing new. Same for `integration` on `ingest` (archetype `integration-service`) and
`presentation` on `dashboards` (archetype `frontend`). The one Role token that survives is
`application` on `transform`, whose `app-service` archetype is style-less: here the token is the
only thing stating a role. `transform` is also the prominence pick, so it takes `lg`. `segment`
takes size alone. The whole icons section is gone — every icon it used to apply was one the
archetype already carried, and a present-but-empty section is rejected, so it is omitted.

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
      { "primitiveType": "node", "nodeSlug": "event-bus", "size": "lg" },
      { "primitiveType": "node", "nodeSlug": "orders-svc", "semanticToken": "application" },
      { "primitiveType": "node", "nodeSlug": "billing-svc", "semanticToken": "application" },
      { "primitiveType": "node", "nodeSlug": "shipping-svc", "semanticToken": "application" },
      { "primitiveType": "node", "nodeSlug": "notifications-svc", "semanticToken": "application" },
      { "primitiveType": "edge", "edgeSlug": "orders-svc--event-bus", "semanticToken": "asynchronous" },
      { "primitiveType": "edge", "edgeSlug": "event-bus--billing-svc", "semanticToken": "asynchronous" },
      { "primitiveType": "edge", "edgeSlug": "event-bus--shipping-svc", "semanticToken": "asynchronous" },
      { "primitiveType": "edge", "edgeSlug": "event-bus--notifications-svc", "semanticToken": "asynchronous" }
    ]
  }
}
```

**Why:** `queue` on `event-bus` fails the test outright — the `message-broker` archetype is
already drawing a queue shape with a Radio icon, so the token would repaint that to say the
same word. What `event-bus` needs is not a label but **weight**: it is the sole prominence
candidate (12 weighted connections, the fan-out hub for four consumers), so it takes `lg` and
nothing else. The four consumers all take `application`, which is legitimate precisely because
`app-service` is style-less: without the token, nothing on the board states their role. Every edge
is asynchronous, publish and consume alike — a broker's whole purpose is decoupling, and the
token IS the edge style. The Radio icon application is gone for the same reason as the token.

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
      { "primitiveType": "container", "nodeSlug": "app-shell", "semanticToken": "domain_boundary" },
      { "primitiveType": "container", "nodeSlug": "pages", "semanticToken": "domain_boundary" },
      { "primitiveType": "container", "nodeSlug": "shared-ui", "semanticToken": "domain_boundary" },
      { "primitiveType": "node", "nodeSlug": "button-kit", "size": "lg" },
      { "primitiveType": "edge", "edgeSlug": "home-page--button-kit", "semanticToken": "synchronous" },
      { "primitiveType": "edge", "edgeSlug": "catalog-page--button-kit", "semanticToken": "synchronous" },
      { "primitiveType": "edge", "edgeSlug": "checkout-page--form-kit", "semanticToken": "synchronous" },
      { "primitiveType": "edge", "edgeSlug": "checkout-page--button-kit", "semanticToken": "synchronous" }
    ]
  }
}
```

**Why:** This is the board where Role tokens are the right answer, and it is no coincidence —
`layer-group` is style-less, so without `domain_boundary` the three containers would render as
undifferentiated boxes and the layering would be invisible. That is the same rule as
data-pipeline, pointing the other way. The three pages get nothing: `page` asserts kind, and
`presentation` on top would only restate it. The two components get no token either — they sit
inside `shared-ui`, whose boundary token already places them, so a per-component role would be
the third time the board says "UI". `button-kit` takes `lg` alone: three separate pages compose
it, which is a fact about this graph that no archetype and no token can carry. Vertical
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
      { "primitiveType": "node", "nodeSlug": "billing-v2", "semanticToken": "active", "size": "lg" },
      { "primitiveType": "node", "nodeSlug": "migration-bridge", "semanticToken": "experimental" },
      { "primitiveType": "node", "nodeSlug": "sap", "size": "xs" },
      { "primitiveType": "edge", "edgeSlug": "billing-v2--invoice-db", "semanticToken": "synchronous" },
      { "primitiveType": "edge", "edgeSlug": "billing-v1--invoice-db", "semanticToken": "synchronous" },
      { "primitiveType": "edge", "edgeSlug": "migration-bridge--billing-v2", "semanticToken": "asynchronous" },
      { "primitiveType": "edge", "edgeSlug": "migration-bridge--billing-v1", "semanticToken": "asynchronous" },
      { "primitiveType": "edge", "edgeSlug": "billing-v1--sap", "semanticToken": "synchronous" }
    ]
  }
}
```

**Why:** The State category doing exactly what it is for. All three billing systems share the
`app-service` archetype, so nothing distinguishes them structurally — `legacy`, `active` and
`experimental` are instance facts about *these three systems at this moment*, and an archetype
could never carry them. Note that three State tokens across five nodes draws no saturation
warning: the check counts how far ONE token reaches, and several different states is the
vocabulary working, whereas `active` on all five would assert nothing. `invoice-db` is dropped
entirely — `store` would repaint the `database` archetype's cylinder to say "database" again —
and `sap` takes size alone. `billing-v2` adds `lg` on top of its State token as the prominence
pick. The bridge's backfill/drain edges are asynchronous while live traffic is synchronous,
marking background reconciliation apart from the request path.

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
      { "primitiveType": "node", "nodeSlug": "web-bff", "semanticToken": "application" },
      { "primitiveType": "node", "nodeSlug": "orders-svc", "semanticToken": "application" },
      { "primitiveType": "node", "nodeSlug": "catalog-svc", "semanticToken": "application" },
      { "primitiveType": "node", "nodeSlug": "users-svc", "semanticToken": "application" },
      { "primitiveType": "node", "nodeSlug": "stripe", "size": "xs" },
      { "primitiveType": "node", "nodeSlug": "auth0", "size": "xs" },
      { "primitiveType": "edge", "edgeSlug": "api-gateway--orders-svc", "semanticToken": "synchronous" },
      { "primitiveType": "edge", "edgeSlug": "api-gateway--catalog-svc", "semanticToken": "synchronous" },
      { "primitiveType": "edge", "edgeSlug": "api-gateway--users-svc", "semanticToken": "synchronous" },
      { "primitiveType": "edge", "edgeSlug": "web-bff--api-gateway", "semanticToken": "synchronous" },
      { "primitiveType": "edge", "edgeSlug": "orders-svc--orders-db", "semanticToken": "synchronous" },
      { "primitiveType": "edge", "edgeSlug": "catalog-svc--catalog-db", "semanticToken": "synchronous" },
      { "primitiveType": "edge", "edgeSlug": "orders-svc--stripe", "semanticToken": "synchronous" },
      { "primitiveType": "edge", "edgeSlug": "users-svc--auth0", "semanticToken": "synchronous" }
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

**Why:** The largest board, and it carries the fewest node tokens of any here. The three
`domain-group` containers get **nothing**: that archetype's whole identity is a hued icon over a
thin dashed shell with no fill, and `domain_boundary` would paint a fill straight over it —
grouping that was already legible, made generic. `api-gateway` drops `gateway` (the
`gateway-service` archetype draws a hexagon with Waypoints) but keeps `lg`, because being the
57-weighted-connection hub is a fact about this graph, not about gateways. The databases drop
`store`. The four `app-service` nodes keep `application` — style-less archetype, so the token is
load-bearing — and one Role token per archetype keeps the legend coherent. `stripe` and `auth0`
take size only, but they are the two nodes that still earn icon applications: their archetype's
generic Cloud icon cannot say *which* SaaS this is. Both were resolved in one batched
`match_icons` call — stripe hit the catalog under its wordmark logo and takes that `iconUrl`
verbatim; auth0 came back in `unmatched` and falls back to Lucide, exactly the split the tool
exists to produce.
