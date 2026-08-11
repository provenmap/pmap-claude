---
category: author
description: "Author · WRITE-CAPABLE: Adopt an architecture decision — normalize it, measure the estate against it, land the decision record plus per-app remediation intents"
argument-hint: "[decision material or file]"
allowed-tools: AskUserQuestion, Bash(node:*), mcp__plugin_pmap-architect_provenmap__*
---

Turn a decision into governance: normalized record → a durable `ADR:` decision board (where the
rule lives) → compliance insight runs (the _is_) → per-app remediation intents (the work owed).
The whole arc lives in **adr-adoption** — load it plus **architect-core**; sweeps use
**board-reading**, landing uses **intents-authoring** conventions.

## Workflow

1. **Working-copy check** — `get_write_session`: pre-existing uncommitted changes are surfaced
   (boards + counts) and the architect decides — one combined commit later, or pause first
   (architect-core).
2. **Intake** — normalize the material to Context / Decision / Consequences / Alternatives
   (adr-adoption §1); running record in the drafts file.
3. **Blast radius** — affected apps from the landscape; per app, sweep the governed element
   classes (the aspect-family table in adr-adoption §2; default depth: apps + one layer down).
   Classify compliant / violating / unclear.
4. **Grill** — crispness, drivers, applicability, exceptions, migration stance, supersedes
   check (adr-adoption §3).
5. **Record** — `create_decision_board {name: "ADR: <title>"}` and write the normalized record
   there (adr-adoption §4). This is the standing rule's home; it never "completes".
6. **Land, federated** — `create_insight` per swept app where violations were found, then
   remediation drafts: `promote_insight_findings` on reviewed violations, plus `create_intent`
   per affected code-bound app board where compliance needs work no finding covers
   (`--validate intent` first). Unbound affected boards named + skipped with the binding gate
   narrated. Close with the standard move: `preview_write_session_commit` → present the plan →
   title/summary (AskUserQuestion) → `commit_write_session` → narrate what was generated.
7. **Hand off** — enrich the drafts via the intents-authoring loop, or stop; not now →
   `/insights`, `/intents`. Every stop names the next command.

## Failure branches

- Tools missing / connection errors → `ProvenMap not configured — run /login (browser) or /configure (manual) first`
- 401 → `Your ProvenMap architect token was rejected — run /login to reconnect`
- No affected board is code-bound → emit the normalized record + assessment as markdown, name
  the binding prerequisite; nothing is staged.
- Write tools absent → read-only token: normalize + assess + report; `read_write` named.
