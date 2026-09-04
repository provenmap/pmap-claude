# Authoring one discover brief

You have ONE brief (a JSON file) and must write ONE output file at `brief.output`. This is the
whole contract. Read the brief first; everything you need is inside it.

## The brief

| Field | What it is |
|---|---|
| `candidate` | What to author. `kind: "insight"` carries a ready trail; `kind: "context-board"` carries a ready `draft` board. Also: `question`, `title`, `family`, `level`, `polarity`/`priority` (insights), `why[]` (evidence lines), `measurement`, `proposal`. |
| `packSlice` | The boards, elements and edges around the candidate: element `description`, `detail`, `family`, `attributes`; edge `description`, `weight`, `class`. Cite these. |
| `catalogue.archetypes` | Archetype name → structural family, for the prose. |
| `contextTags` | The org's tag names; use only these in the push's `tags`, or none. |
| `verify` | `source`: you may open files named in element descriptions to confirm a number you cite. `pack`: read nothing outside the brief. |
| `skillSlug` | Always `architecture-highlights`. |
| `framing` | The lens the user chose and the primary board — tone, not content. |
| `output` | The one path to write. |

## Authoring an insight (`candidate.kind === "insight"`)

Write a `PushInsightsCommand`:

```json
{
  "boardSlug": "<candidate.trail[0].board>",
  "insightSkillSlug": "architecture-highlights",
  "insights": [ <InsightDraft>, <optional point finding>, <optional point finding> ],
  "tags": [ <names from brief.contextTags, or empty> ],
  "info": "<≤350 chars: what this run surfaced, specific>"
}
```

The first `InsightDraft`:

- `name` — the candidate's `title`, or a sharper one (≤100 chars, a claim, not a question).
- `insight` — 5–500 chars of EVIDENCE: what the graph shows, with the numbers from `why[]`
  and `measurement`, naming elements by slug. No opinions here.
- `polarity`, `priority` — copy from the candidate.
- `confidence` — `verified` only if `verify: "source"` and you read the file; else `inferred`.
- `impact` — one sentence on the consequence (optional, ≤300 chars).
- `measurement` — copy from the candidate when present.
- `advice` — `{ kind: "recommendation", text, effort }` for risk/opportunity; `{ kind:
  "context", text }` for observation. One object, never both.
- `trail` — **copy `candidate.trail` verbatim.** You may edit a stop's `note` (≤200 chars) to
  make it read better; never add, remove, reorder or re-point a stop, and never change a
  `via.edge`, `board` or `node` value.
- `proposal` — copy when present.

Up to two more `InsightDraft`s are allowed, each a single-stop point finding on the same
anchor (`trail: [{ id: "s1", board, node }]`) that the slice supports — a consumer a hub lists
instead of drawing, an unowned hub, a missing description. Skip them unless they add something.

## Authoring a context board (`candidate.kind === "context-board"`)

Write a `ContextBoardPayload`: start from `candidate.draft` and change ONLY these:

- `name` — ≤100 chars; the question's answer as a title ("Blast radius of Event Bus").
- `question` — keep the candidate's question, or sharpen it.
- `description` — ≤500 chars: what the board shows and why it matters, with numbers.
- `nodes[].note` — ≤300 chars per node: why THIS node is on the board, in the reader's terms.

Never change `nodes[].slug`, `type`, `parentSlug`, `source`, any `edges[]` entry, `subject` or
`styles`. Do not add or remove nodes or edges. Copy `candidate.draft.ledger` if present.

## Prose that fits the family

- **chokepoint** — "N things run through `x`; K of them have no alternative." Risk unless the
  family is one that is supposed to be busy (gateway, datastore, channel, endpoint).
- **cascade** — outage narrative, ring by ring: the hub, the direct dependents, the downstream.
- **journey** — plain steps in order: where work enters, who does the work, where it ends.
- **cycle** — name the loop; the consequence is that no member can change alone.
- **boundary** — what leaves the container, and into which containers.
- **shared-store** — which containers reach the store; the coupling a schema change travels.
- **unowned-hub** — the fan-in, then the gap: nobody recorded as owner.
- **seam** — what strains, and what the proposed split would take with it.
- **blast-radius-map / neighbourhood / entry-surface / external-surface / data-gravity /
  ownership-map / cross-app-flow** — the description says what is drawn, the notes say why each
  element is there.

## Finishing

1. Write the file at `brief.output` (JSON, the full command or payload).
2. Reply with ONE line: `<id> · <kind> · <N stops|N nodes> · written` — or `<id> · not written:
   <reason>` if the brief could not be authored (say why; never write a partial file).
3. Do not push, do not run any script, do not touch any other file.
