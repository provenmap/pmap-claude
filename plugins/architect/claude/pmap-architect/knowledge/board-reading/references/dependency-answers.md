# Presenting a dependency answer

`trace_impact`, `trace_dependencies` and `find_path` are deterministic: algorithms over the stored
graph, no model, so the same question always returns the same answer. That is what separates
them from insights, which are a model's judgment. They answer three different questions, and
each has its own shape. Present each one the way ProvenMap's web app does, translated to a terminal:
**the gist first, then a picture, then a table**, then what limits the answer and what to do
next. The picture and table are drawn from the tool's result; never re-derive them from
`get_edges`.

| Type           | Tool                 | Picture (a code block)                      | Table (markdown)                        |
| -------------- | -------------------- | ------------------------------------------- | --------------------------------------- |
| **Impact**     | `trace_impact`       | systems down the side, hops across the top  | by system: what is hit, how, hop, flags |
| **Depends on** | `trace_dependencies` | a tree, each element under what needs it    | by kind: what is needed, use, reached   |
| **Route**      | `find_path`          | one line, start to end, boards as headings  | one row per hop, with its proof         |

Call `trace_impact` with `include: ['workItems', 'insights', 'rules']` so its table can carry
flags; the other two need nothing extra.

## The parts, in order

1. **Headline** (bold, one line) — the count and the element, slug-first:
   `**12 elements depend on `payments-api`**` · `**`checkout-web` depends on 11 elements**` ·
   `**How `mobile-app` comes to depend on `payments`**`.
2. **Spread** (plain, one line) — Impact/Depends on: `across 4 systems, within 3 hops`, adding
   `· 2 only through code, not drawn` when `summary.derivedOnly > 0`. Route: `4 hops across 3
boards`, adding `· 1 not drawn`.
3. **Gist** (two or three sentences, facts only) — where it lands: which systems take most of
   it, what is reached only through code, a work item already changing something in it. Never
   a list of names; the picture and table carry those. The answer is computed, not judged, so
   the gist never delivers a verdict ("a single point of failure", "too coupled"). That is what
   an insight is for: when a pattern looks like a risk, say what the numbers show and offer to
   record an insight or run `/assess`.
4. **Picture** — below. Always.
5. **Table** — below. At most 12 rows; past that, end with `… N more. Ask for the full table.`
6. **What limits it** (only what applies, one line each): `truncated.limit` → "the nearest
   _N_ of _total_ are listed"; `truncated.depth` → "more lies beyond hop _d_; I can go deeper";
   unresolved `resolution` links → "_m_ of _n_ reference links didn't resolve, so counts are a
   floor".
7. **Next** — at most three moves, from: go one hop deeper (when `truncated.depth`); draw it on
   a context board (the answer-mode escalation in the board-reading skill); save a route as an
   insight (`create_insight` with the result's `trail` and the trace as `traceAsk`); and the
   hand-off `↪ In ProvenMap, select the node and open Dependencies in its inspector to follow
the answer on the canvas.`

`summary.total == 0`: the headline says so in a sentence ("Nothing in this tree depends on
`x`.", "No dependencies are recorded for `x`."), with no picture or table. `find_path` with
`found: false`: say there is no route in the stored rows. That is an answer, not a gap in the
search.

## Reading a hit

- **Name**: `label`, with its kind when it is not a node: `orders (table)`, `GET /items
(endpoint)`, `order.created (channel)`, `OrderClient (client)`, `Checkout (page)`.
- **Not drawn**: `via.provenance == 'derived'`. Mark it `*` in a picture and write `not drawn`
  in a table. Under the picture, add the legend `* proven by code, not drawn on any board`
  whenever a `*` appears.
- **System**: `system`, the node on the span board that holds it; `null` means the span board
  itself, so write that board's name.
- **Verb** (`via.kind`, with `via.access` for `uses`): `uses` + read → reads, + write → writes,
  else uses · `calls` → calls · `fetches` → fetches · `publishes` → publishes to · `subscribes` →
  subscribes to · `relays` → relays to · `exposes` → is served by · `holds` → holds · `fk` →
  references · `edge` → connects to · `layer`/`contains` → contains · `navigates` → links to.
- **Parent**: the hit one hop nearer whose `slug` equals `via.through`; the origin for hop 1.
  When none is listed (the limit cut it off), treat the hit as hanging from the origin.
- **Ways**: `paths > 1` means several shortest routes reach it; write `(2 ways)`.

## Impact: who gets hit

**Picture** — one row per system (most hits first), one column per hop. Each cell lists that
system's elements at that hop, one per line. When a cell would hold more than 4, list 3 and
write `+N more`. Pad the columns so they line up.

```
             hop 1             hop 2               hop 3
Storefront   checkout-web      storefront-web
             mobile-bff        mobile-app
Ordering     order-service     order.created       fulfilment-worker
                               returns-service
Payments     payment.settled
             refunds-worker
Finance                        ledger-sync *       reconciliation-job *

* proven by code, not drawn on any board
```

**Table** — grouped by system in the picture's order, nearest first inside each. "How it is
hit" is the verb and the parent: `calls payments-api`. Flags come from `overlay`: a work item
whose `anchors` include the hit's `slug` (`#42 Retry on timeout`); for a node, an insight whose
`nodes` include `<boardSlug>::<slug>` (its `name`), and a rule on the hit's board with a crossing
`from` or `to` the node (`breaks <rule name>`).

| System     | Element             | How it is hit       | Hop | Flags                   |
| ---------- | ------------------- | ------------------- | --- | ----------------------- |
| Storefront | `checkout-web`      | calls payments-api  | 1   | #42 Retry on timeout    |
| Storefront | `storefront-web`    | calls checkout-web  | 2   |                         |
| Ordering   | `order-service`     | calls payments-api  | 1   | Single point of failure |
| Finance    | `ledger-sync`       | subscribes to payment.settled · not drawn | 2 | breaks Finance reads only through the ledger API |

## Depends on: what it needs

**Picture** — the `tree(1)` shape, the origin at the top, each element under its parent,
children in result order. Each line: connector, verb, name, then the system when it differs
from the parent's.

```
checkout-web
├─ calls payments-api                      Payments
│  ├─ writes payments (table)
│  ├─ calls fraud-check
│  │  └─ reads risk-rules (table)
│  └─ publishes to payment.settled (channel)
├─ calls order-service                     Ordering
│  └─ writes orders (table)
├─ calls auth-service (2 ways)             Identity
│  └─ reads users (table)
└─ fetches GET /catalog/items (endpoint)   Catalog
   └─ is served by catalog-api *

* proven by code, not drawn on any board
```

**Table** — grouped by kind, services (nodes) first, then the largest group. "Reached" is
`direct` for hop 1, else `via <parent>`.

| Kind      | Element              | Use        | Reached              | System   |
| --------- | -------------------- | ---------- | -------------------- | -------- |
| Service   | `payments-api`       | calls      | direct               | Payments |
| Service   | `auth-service`       | calls      | direct (2 ways)      | Identity |
| Table     | `payments`           | writes     | via payments-api     | Payments |
| Channel   | `payment.settled`    | publishes to | via payments-api   | Payments |

## Route: how one reaches the other

**Picture** — the stops top to bottom. Each board the route runs on is a heading, and each hop
is a `│` line naming the verb. Mark a hop `*` when it is not drawn.

```
Storefront
  mobile-app
  │ calls
  mobile-bff
  │ calls *
Ordering
  order-service
  │ calls
Payments
  payments-api
  │ writes
  payments (table)

* proven by code, not drawn on any board
```

**Table** — one row per hop. "Proof" is `via.evidence` when present, else "drawn on the board"
for a drawn hop and "proven by code" for one that is not.

| #   | Hop                                  | Board                 | Proof                  |
| --- | ------------------------------------ | --------------------- | ---------------------- |
| 1   | `mobile-app` calls `mobile-bff`      | Storefront            | drawn on the board     |
| 2   | `mobile-bff` calls `order-service`   | Storefront → Ordering | OrderClient · not drawn |
| 3   | `order-service` calls `payments-api` | Ordering → Payments   | drawn on the board     |
| 4   | `payments-api` writes `payments`     | Payments              | database aspect        |
