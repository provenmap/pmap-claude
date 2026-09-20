---
name: insight-writing
user-invokable: false
description: How to write the words of a ProvenMap insight or context board — the one contract for every flow that authors them. Use whenever you fill an InsightDraft's name, insight, impact, advice or trail notes, a push's info line, or a context board's name, description and node notes (/insights, /discover, an analysis recorded from the architect workbench). Covers who the reader is, the five writing rules with a bad/good pair, and the text-field guide with limits.
metadata:
  author: ProvenMap
  version: 1.0.0
---

# Writing an insight

Every flow that authors an insight or a context board writes its words by this contract. The
schemas (trail, stops, proposal, payload wiring) live with each flow; the words live here.

## The reader

An engineer or architect who knows this system and has never heard of this tool's internals.
They read the text in a side panel or on the canvas, **next to the picture**: the trail's stops,
their order and the drawn elements are already in front of them. The words must say what the
picture cannot — what the code or system is doing, and why it deserves a minute of their time.

## The rules

1. **Lead with the finding.** The first sentence is the one thing to take away, about THEIR
   system: "Publishing a blog post depends on the shared URL normaliser, three modules away."
   Never a recap of the route or of what is drawn.
2. **Say what it does, then what follows.** Use what you know of each part — element and edge
   descriptions, the code you read: which function, which data, which responsibility. Then the
   consequence — what changes together, what breaks, what is surprising.
3. **Never narrate the tool.** Banned in every user-facing field: node, edge, board, stop, hop,
   trail, port, layer, descent/descend, ascent/ascend/climb, drill-down, slice, pack, graph,
   fan-in, fan-out. Say "depends on", "calls", "imports", "is used by 12 modules", "inside X".
   A count belongs in the prose only when it is a fact about the system (12 dependents), never
   about the walk (7 stops). Script-provided evidence lines are facts for you, not sentences to
   copy.
4. **Plain text only.** Nothing renders markdown — backticks, asterisks and links show up
   literally. Name elements by display name; quote a file path or symbol bare, and only where
   it helps the reader find the code. (Slugs belong in the structural fields — `board`, `node`,
   `via.edge`, `slug` — never in the prose.)
5. **No filler.** Every sentence carries a fact or a consequence. If the honest finding is
   small, write one short sentence — never pad, never list every stop; the picture does that.

Bad: "From skills to schema-and-vocabulary takes 7 stops across 2 boards, with 2 descents and 1
climb back through a port."

Good: "Every skill script reaches the shared schema through one chain: blog-publish calls the
attention module, which needs correlation-keys to normalise URLs, which takes its DATE, MONTH
and SLUG rules from the schema. A change to those rules changes how every skill matches threads."

## The text fields

| Field | Limit | What goes in it |
|---|---|---|
| InsightDraft `name` | ≤100 | The finding as a claim, not a question and not a route: "Checkout has no fallback when Payments is down". |
| InsightDraft `insight` | 5–500 | The finding and the evidence for it, per the rules above. Facts only — opinions go in `advice.text`. |
| InsightDraft `impact` | ≤300, optional | One sentence: the consequence if a risk is left, or the gain if a strength or opportunity is used. |
| InsightDraft `advice.text` | 5–500 | `recommendation` (with `effort`): the concrete action. `context`: background worth knowing. One object, never both. |
| Trail stop `note` | ≤200 | What THIS part does in the story ("Validates the cart before Orders writes it") — never how the view got there. |
| Push `info` | ≤350 | What this run surfaced, specifically: "3 auth risks incl. a hardcoded JWT secret". |
| Context board `name` | ≤100 | The question's answer as a title: "Blast radius of Event Bus". |
| Context board `description` | ≤500 | What the board answers and why it matters, with the numbers that are facts about the system. |
| Context board `nodes[].note` | ≤300 | Why THIS element is part of the answer, in the reader's terms. |

`confidence` is a claim too: `verified` only when you read the code; otherwise `likely`,
`inferred` or `speculative`, honestly.
