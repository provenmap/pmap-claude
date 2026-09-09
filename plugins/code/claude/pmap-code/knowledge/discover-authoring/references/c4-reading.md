# How a context board reads as a C4 diagram

A context board is a C4 diagram drawn to answer one question. The script decides how it reads;
this page says what each instrument asserts, so the notes an agent writes fit the picture.

## The level

`view.level` names the diagram, from where the subject sits in the tree:

| Tree level | C4 diagram | What the boxes are |
|---|---|---|
| `landscape` (the workspace root) | **System Context** | software systems, the people who use them, the external systems they talk to |
| `app` (a bound board) | **Container** | the deployable units inside one system — services, apps, stores, queues |
| `layer` (a drill-down) | **Component** | the parts inside one container — modules, handlers, repositories |

The reading strip shows it beside the question ("C4 container").

## What asserts what

One rule decides every instrument: **a token asserts only what the archetype cannot.**

| C4 concern | Asserted by | Instrument |
|---|---|---|
| What kind of thing — person, external, datastore, queue, component | the archetype (`type`), seeded on the server | nothing; there is no Role token on this wire |
| The element under discussion | size | the subject is `xl`; its note shows on the canvas |
| What matters in this answer | size, then attention | the first ring is `lg` (two lines of note on the canvas); `emphasis` on the subject and at most 10% of leaves |
| Peripheral context | size | people and externals `xs` (icon-backed short name) or `sm`; orientation-only nodes the same, marked `subtle` |
| Instance facts no archetype knows | State / Severity | `warning` on a hub with no fallback or an unowned element, `error` on cycle members; a token on more than half the board is dropped |
| How a call flows | Flow token on the edge | `synchronous` by default; `asynchronous` when a channel is involved; `stream` for publish/subscribe/event relations on a channel; `bidirectional` for sync/replicate relations and the edge closing a cycle |
| Which edges carry the story | edge weight | `heavy` on the answer's path, `normal` where a read node is involved, `light` between context nodes |
| Grouping | `parentSlug` containers | container archetypes draw their own thin dashed shell; never sized |
| Reading direction | composition | `flow` horizontal for paths, `network` for a neighbourhood, `hierarchy` vertical for ownership; `airy` under nine leaves |

Two guards on size come from the archetype's styling digest in the pack: a size the archetype
pins is never overridden, and `xs` goes only to an icon-backed node whose name is fourteen
characters or fewer (the `xs` label is one truncating line below the shape).

## The note, per level

The subject's and the first ring's notes are visible on the canvas, so write them the way a C4
label reads — what it is, the technology when the description or the board's stacks say it, and
its responsibility in this answer. Keep the rest of the note for the inspector.

| Level | Note shape | Example |
|---|---|---|
| Context | the system's job for the person or system beside it | "Takes every order from the storefront; the only path to fulfilment." |
| Container | the unit's responsibility and how it is reached | "Node.js / Fastify. Every checkout and refund passes here; 4 dependents, no fallback." |
| Component | the part's role inside its container | "Validates the cart before `orders` writes it; called on every checkout." |

Name elements by slug in backticks, cite the numbers the brief gives, and never describe a
colour, a size or a line weight — the canvas shows those.
