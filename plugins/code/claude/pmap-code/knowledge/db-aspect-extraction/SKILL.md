---
name: db-aspect-extraction
user-invokable: false
description: Extracts a repository's database schema (tables, columns, foreign keys, indexes) into a DatabaseSchemaPayload for /aspects --db. Use when extracting the database.schema aspect. Reads Drizzle, Prisma, TypeORM, SQLAlchemy, raw SQL migrations, or a committed pg_dump — never a live database.
license: MIT
compatibility: Claude Code plugin. Requires a synced spine (.provenmap/boards/<board>.json) so tables can link to node slugs.
metadata:
  author: ProvenMap
  version: 0.1.0
---

# Database Schema Extraction (database.schema aspect)

Extract the **declared** schema and shape it into a `DatabaseSchemaPayload`:
`{ tables: [ { …table fields, columns[], foreignKeys[], indexes[], ownerSlug, references[] } ] }`.

## Golden rules

1. **Read definitions, never execute.** No app boot, no DB connection, no running migrations. Parse the source of truth: ORM schema files, migration SQL, or a committed `pg_dump`.
2. **`slug` is the stable identity.** One kebab-case slug per table (e.g. `orders`, `user_sessions` → `user-sessions`), stable across re-extracts — the server reconciles by it. Never re-slug an existing table.
3. **Leave human-tier fields empty.** Do **not** fill `owners`, `deprecated`, `dataClassification`, `piiRationale`, `description`, `usageNotes`, `textual`, `migrationHistory`, `ownershipNotes`. Those are the human's to annotate; the server strips them from ingest anyway (D4), so guessing PII only creates noise. Emit `null`/`[]`/`false` defaults.
4. **Cite where you read it, and never guess a field.** Every table carries `declaredIn: { file, line }` — the file and line its definition starts at (the `pgTable(...)`, the `model` block, the `CREATE TABLE`). A column's `nullable` is `true` or `false` only when the source says so; when you cannot cite it, leave it `null`. The comparison reads an uncited field as unread, never as a change, and a guessed one as a false change.

## The charter — what a comparison expects first

`/aspects` runs `pmap-aspects.js --charter` before this skill. When `charter` is not null, an open
comparison expects this board's branch to serve the contracts it lists (`keys`, each with a `kind`
and a `label` such as `GET /orders/{id}` or `orders`). Find each listed contract of this kind in
the repo **first** and extract it under the same path, table or channel name, so the comparison
can match it; then extract everything else the repo serves. A listed contract you cannot find
stays absent — the comparison reads it as removed or missing, which is the truth. Never add a row to satisfy
the list.

## Sources, by ORM

| Source | Where the schema lives | Dialect / ORM |
| --- | --- | --- |
| **Drizzle** | `*.schema.ts` (`pgTable`, `mysqlTable`) | `postgres`/`mysql`, `drizzle` |
| **Prisma** | `schema.prisma` `model` blocks | per `datasource`, `prisma` |
| **TypeORM** | `@Entity` classes | per data-source, `typeorm` |
| **SQLAlchemy** | `Base`/`Table` models | per engine, `sqlalchemy` |
| **Raw migrations** | `CREATE TABLE` in `migrations/*.sql` | parse the DDL, `raw-sql` |
| **pg_dump** | committed `schema.sql` | `postgres`, `raw-sql` |

## Per-table fields

- `slug`, `name`, `schemaName` (default `public`), `dialect`, `orm`.
- `primaryKey`: ordered PK column names, or `null` if the table has none.
- `columns[]`: for each column — `ordinalPosition`, `name`, `type` (raw dialect spelling, verbatim), `logicalType` (the queryable semantic type: `string` | `integer` | `bigint` | `uuid` | `timestamp` | `boolean` | `json` | `enum` | `decimal` | …), `nullable`, `isPrimaryKey`, `isUnique`, `defaultValue`, `enumSlug` (for enum columns), `isComputed` + `generatedExpression` (for generated columns). Leave the human-tier column fields null.
- `foreignKeys[]`: `columns`, `referencesTableSlug` (the **slug** of the target table if it is in this schema), `referencesTableRaw` (the raw name if the target is outside the extract — this powers the "FK to a table we don't model" insight), `referencesColumns`, `onDelete`, `onUpdate`.
- `indexes[]`: `name`, `columns`, `unique`, `method` (`btree`/`gin`/…), `where` (partial-index predicate), `expression` (expression index body).

## Domain — which part of the business it belongs to

`domain` is a short label for the business domain this table belongs to (`billing`, `work-board`). ProvenMap groups the entity-relationship diagram by it, and a domain's tables, endpoints and channels line up under one name across the three aspects.

- **Leave it `null` unless the code names the domain outright** — a Prisma `@@schema("billing")` or `/// domain: billing` comment, a `pgSchema("billing")`, a table-name prefix a whole group shares (`billing_invoices`, `billing_plans`). `pmap-aspects.js` fills every `null` from the folder the table is declared in: the first folder under the shared root of all the payload's `declaredIn` files that is not a container like `features/` or `schemas/` (`apps/server/src/drizzle/schemas/billing/invoices.ts` → `billing`). A table at that root, or a payload declared in one file, stays without a domain; never guess one.
- **One spelling per domain across aspects.** When this repo's other aspects already name a domain (the folder rule gives `schemas/workboard` → `workboard` but `features/work-board` → `work-board`), set `domain` to the spelling they use, so the views group them together. Any casing or separators fold to kebab-case on the way in.

## Owner + references — linking to the spine (the important part)

Read `.provenmap/boards/<board-slug>.json` for the node `slug`s the spine already has. Every slug you emit must be one of them.

- **`ownerSlug`** — the node that *owns* the table: the repository / data-access module where the schema is defined (e.g. the `orders-repository` node for `orders`). If you can't confidently name one, omit it (`null`) — the server keeps `target_raw` and the D5 pass heals it later.
- **`references[]`** — every node that *uses* the table, one entry per usage: `{ nodeSlug, relation, evidence[] }`.
  - `relation`: `reads` | `writes` | `references`.
  - Find usages by grepping for the ORM's query calls (`db.select(...).from(orders)`, `prisma.orders.findMany`, `orderRepository.save`, raw `SELECT/INSERT ... orders`) and mapping the enclosing service/module to its node slug.
  - `evidence[]`: `{ file, line, snippet }` for each call site — this is what a human clicks through to verify the link.
  - A reference to a node the spine doesn't have yet is fine — emit the slug anyway; it lands unresolved (`node_raw`) and auto-resolves after the next `/sync`.

Prune `references` to real, evidenced usages. A table with no owner and no references still pushes fine (it just shows as unlinked until you enrich the spine).
