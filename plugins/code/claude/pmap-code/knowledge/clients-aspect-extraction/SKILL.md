---
name: clients-aspect-extraction
user-invokable: false
description: Extracts a repository's outbound service calls (typed HTTP clients, gRPC clients, service-discovery addresses) into an ApiClientsPayload for /adopt --aspect api.clients. Use when adopting the api.clients aspect. Reads .NET AddHttpClient/AddGrpcClient registrations, Aspire WithReference, Refit, fetch/axios base URLs, Feign, gRPC stubs — never calls the services.
license: MIT
compatibility: Claude Code plugin. Requires a synced spine (.provenmap/boards/<board>.json) so each client can link to the node that makes the calls.
metadata:
  author: ProvenMap
  version: 0.1.0
---

# API Client Extraction (api.clients aspect)

Extract every **other service this code calls** and shape it into an `ApiClientsPayload`:
`{ clients: [ { slug, name, targetService, protocol, baseAddress, clientName, calls[], textual, ownerSlug } ] }`.

One client = one outbound dependency: this repo's code calling one other service. The platform folds
every app's clients onto the workspace root, so "who calls whom" reads across systems and boundary
rules on the root are proven against real calls, not only drawn edges.

## Golden rules

1. **Read declarations, never call.** No requests, no app boot, no DNS lookups. Read the client
   registrations, configuration and call sites.
2. **`targetService` is the name the code addresses the service by** — the service-discovery name
   (`http://catalog-api` → `catalog-api`, `https+http://basket-api` → `basket-api`), or the host of a
   fixed base address. Never invent a nicer name: the root joins this string to the node of that name,
   and the Aspire resource names are what the root's nodes are called.
3. **Only services, not stores or brokers.** A database, cache or message broker is not a client here —
   `database.schema` and `event.catalog` cover those. A third-party SaaS API (Stripe, an identity
   provider) is a client; its `targetService` is its host.
4. **`slug` is the stable identity** — one kebab-case slug per client that survives re-extracts, e.g.
   `catalog-client`, `basket-grpc-client`.
5. **Leave `textual` empty** (`null`) — it is the architect's.

## Sources

| Source                       | Where the client lives                                                                                                                           |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| **.NET typed HTTP clients**  | `AddHttpClient<CatalogService>(o => o.BaseAddress = new("http://catalog-api"))` — `clientName` = the type, `targetService` from the base address |
| **.NET gRPC clients**        | `AddGrpcClient<Basket.BasketClient>(o => o.Address = new("http://basket-api"))` — protocol `grpc`                                                |
| **Aspire**                   | `builder.AddProject<…>("webapp").WithReference(catalogApi)` names the target; the client registration in the project names the protocol          |
| **Refit / Feign**            | the interface's base URL attribute or configuration                                                                                              |
| **fetch / axios / ky**       | a base URL constant or env var naming a service; the calls made through that instance                                                            |
| **Go / Python / Java stubs** | generated gRPC stubs dialled to a service address                                                                                                |

## Per-client fields

- `name` — readable: the client type or `"<Target> client"`.
- `protocol` — `http` or `grpc`.
- `baseAddress` — the address as configured (`http://catalog-api`), or `null` when the code resolves it at runtime from a name alone.
- `clientName` — the type or registration name in code, or `null`.
- `calls[]` — the calls the code names, when it names them:
  - HTTP: `{ protocol: 'http', method: 'GET', path: '/api/catalog/items/{id}' }` — the path as the client writes it; keep template segments.
  - gRPC: `{ protocol: 'grpc', service: 'Basket', rpc: 'GetBasket' }` — the proto service and method.
  - Leave `[]` when calls are built dynamically; the whole service is still the dependency.
- `ownerSlug` — the spine node whose code makes the calls (e.g. `webapp`). `null` if unsure; it heals after the next `/sync`.

## Worked example (eShop WebApp)

```json
{
  "clients": [
    {
      "slug": "catalog-client",
      "name": "CatalogService",
      "targetService": "catalog-api",
      "protocol": "http",
      "baseAddress": "http://catalog-api",
      "clientName": "CatalogService",
      "calls": [
        {
          "protocol": "http",
          "method": "GET",
          "path": "/api/catalog/items/{id}"
        }
      ],
      "textual": null,
      "ownerSlug": "webapp"
    },
    {
      "slug": "basket-client",
      "name": "BasketService",
      "targetService": "basket-api",
      "protocol": "grpc",
      "baseAddress": "http://basket-api",
      "clientName": "Basket.BasketClient",
      "calls": [
        { "protocol": "grpc", "service": "Basket", "rpc": "GetBasket" }
      ],
      "textual": null,
      "ownerSlug": "webapp"
    }
  ]
}
```
