# Comparison boards — drawing a comparison's two boards

A comparison's table lists **which contracts** moved, changed or went missing. Its two boards
**show** it: each side's apps with the contracts that differ drawn inside them, the same boxes in
the same places on both boards, and every system that depends on them wired to the exact contract
it calls. The eye reads what the release drops, what it changes and which caller it breaks before
reading a row. The server places them above the comparison's table.

You draw both boards in one pass from the **brief** (`--boards-brief` wrote it). The server
decides what each element's verdict is, from the rows it cites, and paints it; you decide what is
drawn, what it is called, how it is grouped and what carries the story.

## The brief

- `comparison` — slug, name, description.
- `sets[]` — `id`, `side` (`before` | `after`), `mode`, `name` (the app, or the document's
  label), `branch`, `replaces` (on an after set: the before set ids it is meant to carry).
- `rows[]` — one per contract: `key` (cite it verbatim), `kind`, `label`, `verdict` (`kept`,
  `moved`, `changed`, `removed`, `missing`, `new`), `flagged`, `accepted`, `before[]` / `after[]`
  (the set ids it sits in), `consumers[]` (systems outside the comparison that depend on it),
  `change` (what differs, in the table's own words: "lost header x-requestid", "added
  TrackingNumber"; null when nothing is named).
- `digest` — send it back unchanged as the payload's `digest`.
- `previousAnchors[]` — what the last draw anchored (`side`, `key`, `name`, `type`).
- `archetypes[]` — the only values a node's `type` may take.

## Two views: contracts, or capabilities

- **The contract view** (the default): each set is a container holding a node per contract that
  differs, plus the kept contracts folded by kind. Use it whenever every board stays within
  **25 nodes**: the sets, their contract nodes, the kept folds and the neighbours. A release check,
  a rewrite and most migrations fit.
- **The capability view**: when the differing contracts would push a board past 25 nodes (a
  monolith split with dozens gone), sort every row into the part of the business it serves and
  draw one node per capability instead of one per contract. The reader sees which service took
  each part over and which parts no service carries yet; `description` says the table lists the
  contracts.

### Finding the capabilities

Read each row's capability from its label: an endpoint's resource after any `api` or version
prefix (`/api/catalog/items` → Catalog, `/Account/Login` → Identity), a table's name or prefix
(`AspNetUsers` → Identity, `CatalogBrand` → Catalog), a gRPC method's noun (`GetBasket` →
Basket), an event channel by what flows on it. Name each by the business, in a word or two, never
by the code. Aim for 4 to 9. A second front door onto the same resources (`/catalog-api/...` beside
`/api/catalog/...`, a backend-for-frontend) is its own capability, named for whom it serves
("Mobile BFF"). The few rows that fit none (a health check, an error page) share one capability
named for what they are ("Site plumbing"). Every row sits in exactly one capability.

## The payload

Write `{ "digest": "<brief digest>", "before": <board>, "after": <board> }` to the payload path
`--boards-brief` printed. Each board: `name`, `question`, `description`, `subject`, `nodes[]`,
`edges[]`, `styles`, and `"view": { "model": "c4", "level": "container" }`.

A node: `slug`, `name`, `type` (from `archetypes`), `parentSlug` (optional), `description`,
`note` (why it is on the board), `anchor`. An edge: `sourceSlug`, `targetSlug`, `type` (the label
the line carries), `description`, `cites`.
There is no `tokens`: what an element's verdict is belongs to the rows it cites.

`styles`, exactly this shape (the push refuses any other):

```json
"styles": {
  "emphasis": ["<the contract a caller still calls that the after side drops>"],
  "subtle": [],
  "sizes": [{ "slug": "<contract node slug>", "size": "lg" }, { "slug": "<kept fold slug>", "size": "md" }],
  "edges": [{ "sourceSlug": "<neighbour slug>", "targetSlug": "<contract node slug>", "flow": "synchronous", "weight": "heavy" }],
  "composition": { "arrangement": "flow", "orientation": "horizontal", "density": "airy" }
}
```

- `sizes` is a list of `{ slug, size }`, never a map; `size` is `xs` · `sm` · `md` · `lg` · `xl` · `xxl`, and never on a container.
- An `edges` entry names a drawn edge by its two slugs. `flow` is how the call travels: `synchronous` · `asynchronous` · `stream` · `bidirectional`. `weight` is `light` · `normal` · `heavy`.
- `composition.arrangement` is `flow` · `hierarchy` · `network`; `orientation` (`horizontal` · `vertical`) only with `flow` or `hierarchy`; `density` is `tight` · `normal` · `airy` (`airy` gives the callers' lines room for their labels).

## Anchors and citations

- **A set node** — every set on a side is exactly **one** node on that side's board, with
  `"anchor": { "kind": "set", "setId": "<set id>", "cites": [<every row key whose before/after
  for this side holds that set id>] }`. In the contract view it is a container: its contract nodes
  and kept folds name it as `parentSlug`. The server leaves a container unpainted and reads it
  through its children. Its twins on the other board are the sets it replaces or is replaced by;
  you never pair them by hand.
- **A contract node** (contract view) — one per row whose `verdict` is not `kept`, on **both**
  boards, inside the set that serves it on that side (on the side that does not serve it, inside
  the set that replaces it or carries the same `name`, else the first set of the side). Its anchor
  is `{ "kind": "shared", "key": "c-<kebab of the label>", "cites": ["<the row key>"] }`, the same
  key, `name` and `type` on both boards. The side that does not serve it shows a placeholder: the
  server draws a new contract dashed on the before board and a dropped one, a caller still reaching
  for it, as the hole on the after board.
- **A capability** (capability view) — one node per capability, on **both** boards, anchor
  `{ "kind": "shared", "key": "cap-<kebab of its name>", "cites": [<every row in it, kept ones
  too>] }`, the same key, `name` and `type` on both. On the side with one set (the monolith, the
  old app), inside that set. On the other side, inside the set that serves most of its rows there;
  when no set on that side serves any of them, it is a part nobody carries yet, which the server
  draws as the hole: those sit together in one plain container on that board, slug `not-carried`,
  `name` "Not carried yet", `type` `domain_group`, `"anchor": null`, `description` "Parts of
  <the one set> no service serves yet". A set that carries no capability stays an empty container.
- **A kept fold** (contract view) — the `kept` rows of a set, one node per `kind`, named with the
  count ("9 endpoints kept", "7 tables kept"), anchor `{ "kind": "shared", "key":
  "kept-<kebab of the kind's plural>", "cites": [<those rows>] }`, on both boards. A `kept` row
  with a `change` (a note below the rule's line) stays in its fold.
- **A neighbour** — each consumer system the rows name is one node, on **both** boards, outside
  every set, with the **same** `"anchor": { "kind": "shared", "key": "<kebab-case of the system
  name>", "cites": [] }`, the same `name`, the same `type`, and in the same position in `nodes[]`.
- **An edge** neighbour → the contract node (or kept fold) it depends on, citing those rows; on
  **both** boards. The server paints a line only on the after board, red where the after side no
  longer serves what the caller uses. In the capability view the edge goes to the capability
  holding the rows it cites.
- Cite keys **verbatim** from `rows[].key`. Never invent one; never cite a row twice on one
  element. At most 4,000 citations per board.
- Keep the `key` and `name` of every `previousAnchors` entry that still stands: a redraw must not
  rename a neighbour the reader already knows.

## Drawing rules

- **The same boxes in the same order on both boards.** Neighbours first, then each set, then its
  contract nodes (dropped first, then changed, moved, new, each by label ignoring case), then its
  kept folds. In the capability view: neighbours, then each set with its capabilities (most rows
  first), then on the other side the `not-carried` container and the capabilities in it.
  Same sizes, same edges, same `styles.composition` on both: the layout places the twins in the
  same spot, and the reader compares by looking left and right.
- **Sizes.** Contract nodes and capabilities `lg`, so their description shows; kept folds `md`;
  neighbours `md`; never a container.
- **Emphasis** at most one node, which the push caps at a tenth of the leaves, rounded up: the
  contract a caller still calls that the after side drops, on both boards; in the capability view,
  the largest capability nobody carries (one a caller depends on first). None when there is none.
- **The subject** is the slug of the side's first set node.
- **Weight** `heavy` on an edge citing a row that is not `kept`; `light` otherwise.
- **Too many consumers**: keep the ones with the most cited rows, fold the rest into one node
  `"<n> other systems"` with key `other-systems` on both boards.
- **No consumers anywhere** (the workspace graph was not read): draw the sets and their contracts
  alone and say so in `description`.

## Words

- `name`: the comparison's name and the side ("Ordering release check — before").
- `question`: what the board answers. Before: "What does Ordering.API serve today, and who calls
  it?" After: "What does release/next change, and who does it break?"
- A set node's `name`: the app, and its branch when it has one ("Ordering.API · release/next").
- A contract node's `name`: the row's `label`, verbatim. Its `description`, one short line, on the
  side it is about:
  - a `changed` row: on the after board, the `change`, capitalised ("Lost header
    x-requestid · responses lost: 400"); on the before board, "Changes on <the after side>".
  - a `removed` or `missing` row: before, "Gone on <the after side>"; after, "Gone", and when a
    consumer depends on it ": <consumers> still call(s) it".
  - a `new` row: before, "Not served today"; after, "New".
  - a `moved` row: "Now served by <the after set>".
  The after side is the after set's branch when it has one, else its name.
- A kept fold's `description`: the first three labels by label ignoring case, and "and <n> more".
- A capability's `name`: the capability ("Identity"). Its `description`, counted from its rows:
  on the side with one set, what it holds ("6 tables · 16 endpoints"); on the other side, inside a
  set, its verdicts in the order kept, changed, moved, missing, leaving out a zero ("12 kept · 9
  changed"), and the other set when a second one carries some of it ("also in Ordering.API"); left
  outside every set, "No service carries it: <n> missing".
- An edge's `type` is the line's label, from the caller's side: what it does through the
  contracts the edge cites ("places orders", "lists orders", "reads stock"), two or three words,
  read from their labels.
- `note` on a node: one sentence on why it is here, with no counts. Plain words, no internal jargon.

## Never

- Style a verdict, a colour or a severity; the server paints from `cites`. A contract node's
  name is its label, and a description says what differs, in the brief's words; only a kept fold's
  name counts what it holds ("9 endpoints kept"), and only a capability's description counts its
  verdicts.
- Treat an `accepted` row differently: it is drawn like any other, and the server reads it as kept,
  so its box stays unpainted while its description still says what changed.
- Draw a contract on one board only, or a kept contract as its own node.
- Leave a set undrawn, draw one twice, or put one side's set on the other side's board.
- Use a `type` outside `archetypes`, or change `digest`.

## Types

A contract node's `type` by `kind`, when the brief's `archetypes` has it: `api.endpoint` →
`api_endpoint`, `db.table` → `data_store`, `event.channel` → `event_message`, `ui.page` →
`page_component`, `api.client` → `external_integration`, `authz.registry` → `policy`; otherwise
`component`. A capability is a `domain_group` when `archetypes` has it, else `component`. A kept
fold takes its kind's type; a set takes the app's (`microservice` for a service); a neighbour takes
what it is (`frontend_app` for a web app, `microservice` for a service).
