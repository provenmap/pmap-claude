---
category: author
description: "Author · WRITE-CAPABLE: Write an architecture decision (ADR) — grill the context, options and consequences, anchor it where it applies, land it as a Decision work item and propose it"
argument-hint: "[board-slug | decision material]"
allowed-tools: Read, AskUserQuestion, Bash(node:*), mcp__provenmap__*
---

Write a decision the team is making now as an ADR: a work item of type `decision`, born a draft
with its `ADR-n`. Its name is the rule in one sentence, its narrative the context, the options
weighed and the consequences, its directive what code must honour, its anchors where it applies.
The owner accepts it in the platform, which freezes its words; each governed repository then
compiles it with the code plugin's `/decisions`. A decision already written elsewhere goes
through `/adopt-adr` instead. Read
[`${CLAUDE_PLUGIN_ROOT}/knowledge/adr-adoption/SKILL.md`](../knowledge/adr-adoption/SKILL.md) (§1 intake, §3
the grill, §4 the ADR) and
[`${CLAUDE_PLUGIN_ROOT}/knowledge/work-items-authoring/SKILL.md`](../knowledge/work-items-authoring/SKILL.md)
(the surround pull, anchors and notes).

## Workflow

1. **Working-copy check** — `get_write_session`: pre-existing uncommitted changes are surfaced
   (boards + counts) and the architect decides — one combined commit later, or pause first
   (architect-core).
2. **Place it** — argument/session board, else ask: the root for a decision across the
   landscape, an app board for one app's. An ADR needs no repository binding.
3. **Context** — the surround pull on the elements the decision touches (work-items-authoring),
   then `list_work_items {statuses: ["decision"]}` on the root and the board for an ADR on this
   ground already: `get_decision` it — a change to an accepted one is a decision that supersedes it.
4. **Grill** — bounded rounds (adr-adoption §3): the one-sentence rule, the drivers, the options
   weighed and why each lost, the consequences, where it applies (each anchor with a note), and
   exceptions. Never invent what the architect has not said.
5. **Land** — read the assembled ADR back once (Land as draft / Revise), then
   `--validate work-item` on the payload (`type: "decision"`, `supersedes?`) and `create_work_item`;
   the reply names its `ADR-n`.
6. **Propose** — AskUserQuestion: **Propose now** → `propose_decision {decision: "ADR-n"}`;
   **Keep as draft** → it stays the architect's to finish. No tool accepts it: the owner does, in
   the platform.

**Outcome:** `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-architect.js --brief --command adr` → Done · Left · Next, per `${CLAUDE_PLUGIN_ROOT}/knowledge/outcome/SKILL.md`.

## Failure branches

- Tools missing / connection errors → `ProvenMap not configured — run /login (browser) or /configure (manual) first`
- 401 → `Your ProvenMap MCP access token was rejected — run /login to reconnect`
- Write tools absent → read-only token: full grill, the ADR emitted as markdown, `read_write`
  requirement named.
