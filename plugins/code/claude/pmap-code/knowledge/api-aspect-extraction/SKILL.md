---
name: api-aspect-extraction
user-invokable: false
description: Extracts a repository's API surface (endpoints, protocols, auth, params) into an ApiSurfacePayload for /aspects --api. Use when extracting the api.surface aspect. Reads OpenAPI specs, NestJS/Express controllers, tRPC routers, or GraphQL SDL — never calls the endpoints.
license: MIT
compatibility: Claude Code plugin. Requires a synced spine (.provenmap/boards/<board>.json) so endpoints can link to node slugs.
metadata:
  author: ProvenMap
  version: 0.1.0
---

# API Surface Extraction (api.surface aspect)

Extract the **declared** endpoints and shape them into an `ApiSurfacePayload`:
`{ endpoints: [ { …endpoint fields, ownerSlug, references[] } ] }`.

## Golden rules

1. **Read definitions, never call.** No requests, no server boot. Parse the OpenAPI doc, the route decorators, the router definitions.
2. **`slug` is the stable identity.** One kebab-case slug per endpoint that survives re-extracts, e.g. `POST /orders` → `create-order`, `GET /users/:id` → `get-user-by-id`. The server reconciles by it; never re-slug.
3. **Leave human-tier fields empty.** Do **not** fill `owners`, `deprecated`, or `textual` — the human owns those and the server strips them on ingest (D4). Emit defaults.
4. **Cite where you read it, and never guess a field.** Every endpoint carries `declaredIn: { file, line }` — the route decorator, the `paths` entry, the router line. A parameter's `required` is `true` or `false` only when the source says so (a path parameter is always required); when you cannot cite it, leave it `null`. The comparison reads an uncited field as unread, never as a change, and a guessed one as a false change. Responses you did not read stay `[]`: an empty list says "not read", a made-up `200` says "the contract has no body".

## The charter — what a comparison expects first

`/aspects` runs `pmap-aspects.js --charter` before this skill. When `charter` is not null, an open
comparison expects this board's branch to serve the contracts it lists (`keys`, each with a `kind`
and a `label` such as `GET /orders/{id}` or `orders`). Find each listed contract of this kind in
the repo **first** and extract it under the same path, table or channel name, so the comparison
can match it; then extract everything else the repo serves. A listed contract you cannot find
stays absent — the comparison reads it as removed or missing, which is the truth. Never add a row to satisfy
the list.

## Sources

| Source | Where the surface lives |
| --- | --- |
| **OpenAPI / Swagger** | `openapi.{json,yaml}` — the richest source; map paths × methods directly |
| **NestJS** | `@Controller` + `@Get/@Post/...` methods, `@UseGuards` for auth |
| **Express** | `router.get/post(...)`, middleware chains |
| **tRPC** | router `procedure` definitions (`query`/`mutation`) |
| **GraphQL** | SDL `type Query`/`Mutation`/`Subscription` fields |

## Per-endpoint fields

- `slug`, `path` (route pattern verbatim — keep `:id` vs `{id}` vs `[id]`).
- `protocolDetails` (discriminated by `protocol`):
  - `http` → `{ protocol: 'http', httpMethod: 'GET'|'POST'|... }`
  - `graphql` → `{ protocol: 'graphql', operationType, operationName }`
  - `grpc` / `trpc` / `websocket` → their variants.
- `authScheme` (discriminated by `type`): `none` (explicitly public — distinct from unknown), `basic`, `bearer` (+ `bearerFormat`), `apiKey` (+ `in`, `paramName`), `oauth2` (+ `flows`, `scopes`), `mtls`. Read guards/middleware/security schemes to decide; `none` is a real, audited answer — use it when the route is genuinely public.
- `pagination` (discriminated by `style`): `none` | `offset` | `cursor` | `page`. **Never omit** — `none` is a real answer.
- `params[]`: `{ name, in: 'path'|'query'|'header', type, required }`.
- `requestBody` / `responses[]`: content types + status codes where declared (opaque schemas are fine).
- `idempotent`: `true` only when the code enforces it for this route, by reading an idempotency key or request-id (`Idempotency-Key`, `x-requestid`) that the handler dedupes on, or by a framework attribute that says so; `false` otherwise. Never infer it from the HTTP method or from what the handler happens to do: two extractions of unchanged code must read it the same, or a comparison reports a change nobody made.
- `apiVersion`, `versioningScheme` (`uri`|`header`|`query`|`media-type`|`none`).

## Domain — which part of the business it belongs to

A endpoint's domain is a context tag named `domain:<name>` in its `tags` (`domain:billing`). ProvenMap groups the route grid by it, and a domain's tables, endpoints and channels line up under one tag across the three aspects.

- **Leave `tags` empty unless the code names the domain outright** — an OpenAPI `tags` entry the spec uses for domains, a router mounted under a domain prefix the code names (`app.use("/billing", billingRouter)`). Then send exactly one: `"tags": ["domain:billing"]`. ProvenMap gives every other endpoint the domain tag of the node owning most of the files its `references` cite (`usedBy`, which `pmap-aspects.js` records from the local boards; nothing to author), or of the node above it: its container, then the node that drills into its board. `/analyze` tags nodes with their domain and an admin can retag one in ProvenMap; the endpoint follows on the next `/aspects`, so accurate `references` are what make that reading right. A endpoint nothing above names stays without a domain; never guess one, and never derive one from a folder.
- **Use the board's spelling.** When the code names a domain the board already tags (`domain:billing` on a node, `@@schema("billing")` in Prisma), send the board's tag so the views group them together. The org's domain tags are the `domain:` names `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-context-tags.js` prints.

## Owner + references — linking to the spine

Read `.provenmap/boards/<board-slug>.json` for the node `slug`s. Every slug you emit must be one of them.

- **`ownerSlug`** — the node that *owns* the endpoint: the controller / router / resolver module (e.g. `orders-controller` for `POST /orders`). Omit (`null`) if unsure — the D5 pass heals it after the next `/sync`.
- **`references[]`** — every node the endpoint *touches*, `{ nodeSlug, relation, evidence[] }`:
  - `relation`: `calls` | `reads` | `writes` | `implements` | `references`.
  - Trace the handler body: which service it calls, which repository/table it reads or writes. Map each to its node slug, with `evidence[] = { file, line, snippet }`.
  - Unknown slugs are kept unresolved and auto-heal on the next sync — emit them, don't drop them.

Cross-aspect tip: an endpoint that reads a table can reference the **table's** owning node (from the db aspect) so "which endpoints hit this table" works both ways.
