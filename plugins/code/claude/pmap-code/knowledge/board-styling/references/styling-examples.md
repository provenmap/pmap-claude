# Styling worked examples

Six exemplar boards, end to end: what the signals reported, the plan that followed, and why.
Each dataset is a test fixture (`packages/shared/src/__tests__/fixtures/board-styling/`) — the
plan validates with zero errors and zero warnings, and the signals below are pinned by
`board-styling-fixtures.test.ts`, so this prose cannot drift from the code.

## c4-context — C4 context diagram of an e-commerce platform: one system under discussion, two people, four external services.

**Board:** 7 nodes (0 containers), 6 edges.
**Signals said:** prominence `acme-platform` (6 weighted connections); external cohort
`payment-gateway`, `email-provider`, `shipping-api`, `analytics` (archetype "external-system");
arrangement suggestion **flow** (5/6 labelled edges read as request/data flow).

**Plan (validates clean):**

```json
{
  "workBoardSlug": "acme-context",
  "composition": { "board": { "arrangement": "flow", "orientation": "horizontal", "density": "normal" } },
  "semantics": {
    "elementRequests": [
      { "primitiveType": "node", "nodeSlug": "acme-platform", "semanticToken": "emphasis", "size": "xl" },
      { "primitiveType": "node", "nodeSlug": "customer", "semanticToken": "neutral" },
      { "primitiveType": "node", "nodeSlug": "admin", "semanticToken": "neutral" },
      { "primitiveType": "node", "nodeSlug": "payment-gateway", "semanticToken": "subtle", "size": "xs" },
      { "primitiveType": "node", "nodeSlug": "email-provider", "semanticToken": "subtle", "size": "xs" },
      { "primitiveType": "node", "nodeSlug": "shipping-api", "semanticToken": "subtle", "size": "xs" },
      { "primitiveType": "node", "nodeSlug": "analytics", "semanticToken": "subtle", "size": "xs" },
      { "primitiveType": "edge", "edgeSlug": "acme-platform--payment-gateway", "semanticToken": "synchronous" },
      { "primitiveType": "edge", "edgeSlug": "acme-platform--shipping-api", "semanticToken": "synchronous" },
      { "primitiveType": "edge", "edgeSlug": "acme-platform--email-provider", "semanticToken": "asynchronous" },
      { "primitiveType": "edge", "edgeSlug": "acme-platform--analytics", "semanticToken": "stream" }
    ]
  },
  "icons": {
    "nodeApplications": [
      { "nodeSlug": "customer", "shapeType": "rectangle", "lucideIconName": "User", "displayStrategy": "icon_only" },
      { "nodeSlug": "admin", "shapeType": "rectangle", "lucideIconName": "UserCog", "displayStrategy": "icon_only" },
      { "nodeSlug": "acme-platform", "shapeType": "rectangle", "lucideIconName": "ShoppingCart", "displayStrategy": "shape_with_icon" }
    ]
  }
}
```

**Why:** The platform is the one xl+emphasis node — the C4 system under discussion — per "Root
boards are C4-shaped." All four external services share the same archetype (external-system),
so they get one uniform subtle+xs treatment, keeping the enlargement cap to a single node
("Size is hierarchy, and a minority"). Flow tokens distinguish the synchronous payment/shipping
calls from the asynchronous email notification and the streaming analytics feed, per "Edges
carry Flow/State/Severity tokens only." Customer and admin are recognizable people, not systems,
so they get icon_only while the platform itself is shape_with_icon.

## data-pipeline — Data pipeline from event ingestion through transformation to analytics dashboards.

**Board:** 6 nodes (0 containers), 5 edges.
**Signals said:** prominence `transform` (6 weighted connections); external cohort `segment`
(archetype "external-system"); arrangement suggestion **flow** (4/5 labelled edges read as
request/data flow).

**Plan (validates clean):**

```json
{
  "workBoardSlug": "metrics-pipeline",
  "composition": { "board": { "arrangement": "flow", "orientation": "horizontal", "density": "airy" } },
  "semantics": {
    "elementRequests": [
      { "primitiveType": "node", "nodeSlug": "segment", "semanticToken": "subtle", "size": "xs" },
      { "primitiveType": "node", "nodeSlug": "ingest", "semanticToken": "integration" },
      { "primitiveType": "node", "nodeSlug": "raw-store", "semanticToken": "store" },
      { "primitiveType": "node", "nodeSlug": "transform", "semanticToken": "application", "size": "lg" },
      { "primitiveType": "node", "nodeSlug": "warehouse", "semanticToken": "store" },
      { "primitiveType": "node", "nodeSlug": "dashboards", "semanticToken": "presentation" },
      { "primitiveType": "edge", "edgeSlug": "segment--ingest", "semanticToken": "stream" },
      { "primitiveType": "edge", "edgeSlug": "ingest--raw-store", "semanticToken": "synchronous" },
      { "primitiveType": "edge", "edgeSlug": "raw-store--transform", "semanticToken": "synchronous" },
      { "primitiveType": "edge", "edgeSlug": "transform--warehouse", "semanticToken": "synchronous" },
      { "primitiveType": "edge", "edgeSlug": "warehouse--dashboards", "semanticToken": "synchronous" }
    ]
  },
  "icons": {
    "nodeApplications": [
      { "nodeSlug": "warehouse", "shapeType": "rectangle", "lucideIconName": "Database", "displayStrategy": "shape_with_icon" }
    ]
  }
}
```

**Why:** ingest carries the integration Role token because its archetype is
integration-service — one Role token per archetype, per "One Role token per archetype per
board." transform is the sole prominence pick (6 weighted connections, the busiest node in the
chain) and gets lg, the single deliberate standout per "Size is hierarchy, and a minority";
segment, the SaaS event source, is the external cohort at subtle+xs. The board reads
flow+horizontal+airy — a directed pipeline given room to breathe as a centrepiece diagram — and
every downstream edge is synchronous except the initial segment→ingest stream, matching "the
token IS the edge style."

## event-driven — Event-driven architecture with central message broker publishing to consuming services.

**Board:** 5 nodes (0 containers), 4 edges.
**Signals said:** prominence `event-bus` (12 weighted connections); external cohort none
detected; arrangement suggestion **flow** (4/4 labelled edges read as request/data flow).

**Plan (validates clean):**

```json
{
  "workBoardSlug": "orders-events",
  "composition": { "board": { "arrangement": "flow", "orientation": "horizontal", "density": "normal" } },
  "semantics": {
    "elementRequests": [
      { "primitiveType": "node", "nodeSlug": "event-bus", "semanticToken": "queue", "size": "lg" },
      { "primitiveType": "node", "nodeSlug": "orders-svc", "semanticToken": "application" },
      { "primitiveType": "node", "nodeSlug": "billing-svc", "semanticToken": "application" },
      { "primitiveType": "node", "nodeSlug": "shipping-svc", "semanticToken": "application" },
      { "primitiveType": "node", "nodeSlug": "notifications-svc", "semanticToken": "application" },
      { "primitiveType": "edge", "edgeSlug": "orders-svc--event-bus", "semanticToken": "asynchronous" },
      { "primitiveType": "edge", "edgeSlug": "event-bus--billing-svc", "semanticToken": "asynchronous" },
      { "primitiveType": "edge", "edgeSlug": "event-bus--shipping-svc", "semanticToken": "asynchronous" },
      { "primitiveType": "edge", "edgeSlug": "event-bus--notifications-svc", "semanticToken": "asynchronous" }
    ]
  },
  "icons": {
    "nodeApplications": [
      { "nodeSlug": "event-bus", "shapeType": "rectangle", "lucideIconName": "Radio", "displayStrategy": "shape_with_icon" }
    ]
  }
}
```

**Why:** event-bus is the only prominence candidate (12 weighted connections, the fan-out hub
for four consumers) so it alone is sized lg — "Size is hierarchy, and a minority" keeps every
other service at the default. Every edge, publish and consume alike, is asynchronous: a message
broker's entire purpose is decoupling, and "Edges carry Flow/State/Severity tokens only" makes
that the edge's whole visual statement. No node here reads as external, so there is no xs
cohort. All four consuming services share the application Role token because they are peers of
the same architectural responsibility, honoring the one-Role-per-archetype rule.

## frontend-app — Frontend application with layered structure: shell, pages, and reusable UI components.

**Board:** 8 nodes (3 containers), 4 edges.
**Signals said:** prominence `button-kit` (3 weighted connections); external cohort none
detected; arrangement suggestion **hierarchy** (4/4 labelled edges are ownership-like).

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
      { "primitiveType": "node", "nodeSlug": "home-page", "semanticToken": "presentation" },
      { "primitiveType": "node", "nodeSlug": "catalog-page", "semanticToken": "presentation" },
      { "primitiveType": "node", "nodeSlug": "checkout-page", "semanticToken": "presentation" },
      { "primitiveType": "node", "nodeSlug": "button-kit", "semanticToken": "presentation", "size": "lg" },
      { "primitiveType": "node", "nodeSlug": "form-kit", "semanticToken": "presentation" },
      { "primitiveType": "edge", "edgeSlug": "home-page--button-kit", "semanticToken": "synchronous" },
      { "primitiveType": "edge", "edgeSlug": "catalog-page--button-kit", "semanticToken": "synchronous" },
      { "primitiveType": "edge", "edgeSlug": "checkout-page--form-kit", "semanticToken": "synchronous" },
      { "primitiveType": "edge", "edgeSlug": "checkout-page--button-kit", "semanticToken": "synchronous" }
    ]
  }
}
```

**Why:** With every edge labelled "composes" — an ownership-like relation — the signals call for
hierarchy, matching the "Containment-heavy structure: hierarchy" composition rule; the three
layer-group containers (app-shell/pages/shared-ui) get domain_boundary tokens to mark their
structural role rather than a Role token. button-kit is the prominence pick (3 weighted
connections — three separate pages compose it) and is sized lg to signal it is shared, the one
deliberate standout per the size-is-a-minority rule. Vertical orientation reads the composition
top-down, which suits ownership better than a left-to-right flow.

## legacy-modern-mix — Migration from legacy to modern billing system with a bridge service managing the transition.

**Board:** 5 nodes (0 containers), 5 edges.
**Signals said:** prominence `billing-v2` (12 weighted connections); external cohort `sap`
(archetype "external-system"); arrangement suggestion **flow** (directed edges with an uneven
hub structure).

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
      { "primitiveType": "node", "nodeSlug": "invoice-db", "semanticToken": "store" },
      { "primitiveType": "node", "nodeSlug": "sap", "semanticToken": "subtle", "size": "xs" },
      { "primitiveType": "edge", "edgeSlug": "billing-v2--invoice-db", "semanticToken": "synchronous" },
      { "primitiveType": "edge", "edgeSlug": "billing-v1--invoice-db", "semanticToken": "synchronous" },
      { "primitiveType": "edge", "edgeSlug": "migration-bridge--billing-v2", "semanticToken": "asynchronous" },
      { "primitiveType": "edge", "edgeSlug": "migration-bridge--billing-v1", "semanticToken": "asynchronous" },
      { "primitiveType": "edge", "edgeSlug": "billing-v1--sap", "semanticToken": "synchronous" }
    ]
  },
  "icons": {
    "nodeApplications": [
      { "nodeSlug": "invoice-db", "shapeType": "rectangle", "lucideIconName": "Database", "displayStrategy": "shape_with_icon" }
    ]
  }
}
```

**Why:** billing-v1 carries the legacy State token and billing-v2 gets active+lg — it is also
the prominence pick at 12 weighted connections — so the two competing systems are told apart by
State, not by inventing a new Role, per "Semantics first, decoration never." migration-bridge
gets experimental since it is a temporary shim, not a permanent piece of the architecture. sap is
the lone external system, so it is subtle+xs. The live read/write traffic to invoice-db is
synchronous, while migration-bridge's backfill/drain edges are asynchronous — marking them as
background reconciliation rather than the request path, an accurate use of Flow tokens.

## microservices-landscape — Microservices landscape with API gateway routing to services, databases, and external systems.

**Board:** 12 nodes (3 containers), 8 edges.
**Signals said:** prominence `api-gateway` (57 weighted connections); external cohort `stripe`,
`auth0` (archetype "external-system"); arrangement suggestion **flow** (7/8 labelled edges read
as request/data flow).

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
      { "primitiveType": "node", "nodeSlug": "api-gateway", "semanticToken": "gateway", "size": "lg" },
      { "primitiveType": "node", "nodeSlug": "web-bff", "semanticToken": "application" },
      { "primitiveType": "node", "nodeSlug": "orders-svc", "semanticToken": "application" },
      { "primitiveType": "node", "nodeSlug": "catalog-svc", "semanticToken": "application" },
      { "primitiveType": "node", "nodeSlug": "users-svc", "semanticToken": "application" },
      { "primitiveType": "node", "nodeSlug": "orders-db", "semanticToken": "store" },
      { "primitiveType": "node", "nodeSlug": "catalog-db", "semanticToken": "store" },
      { "primitiveType": "node", "nodeSlug": "stripe", "semanticToken": "subtle", "size": "xs" },
      { "primitiveType": "node", "nodeSlug": "auth0", "semanticToken": "subtle", "size": "xs" },
      { "primitiveType": "container", "nodeSlug": "edge-layer", "semanticToken": "domain_boundary" },
      { "primitiveType": "container", "nodeSlug": "services", "semanticToken": "domain_boundary" },
      { "primitiveType": "container", "nodeSlug": "data-layer", "semanticToken": "domain_boundary" },
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
      { "nodeSlug": "api-gateway", "shapeType": "rectangle", "lucideIconName": "Waypoints", "displayStrategy": "shape_with_icon" },
      { "nodeSlug": "orders-db", "shapeType": "rectangle", "lucideIconName": "Database", "displayStrategy": "shape_with_icon" },
      { "nodeSlug": "catalog-db", "shapeType": "rectangle", "lucideIconName": "Database", "displayStrategy": "shape_with_icon" }
    ]
  }
}
```

**Why:** api-gateway is both the prominence pick (57 weighted connections — every request enters
through it) and the gateway Role token holder, sized lg per "Size is hierarchy, and a minority."
The board composition is flow+horizontal+tight, matching "tight for dense infrastructure"; the
services container is overridden to vertical because it genuinely reads differently — a stack of
peer services, not a left-to-right chain — following "override only containers that genuinely
read differently." stripe and auth0 are the external cohort, both subtle+xs, and the three
domain-group containers (edge-layer/services/data-layer) get domain_boundary tokens so
structural grouping never competes with the gateway/application Role tokens beneath them.
