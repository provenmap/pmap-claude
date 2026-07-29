---
category: author
description: "Author · WRITE-CAPABLE: Adopt an architecture decision — normalize it, measure the estate against it, stage per-app specs and a compliance review"
argument-hint: "[decision material or file]"
allowed-tools: AskUserQuestion, Bash(node:*), mcp__plugin_prov-architect_provenmap__*
---

Turn a decision into governance: normalized record → per-app `ADR:` specs (the *ought*) →
compliance insight runs (the *is*) → the remediation-intents offer. The whole arc lives in
**adr-adoption** — load it plus **architect-core**; sweeps use **board-reading**, landing uses
**specs-authoring** conventions.

## Workflow

1. **Session hygiene** — `--session list`; reconcile dangling candidates (architect-core).
2. **Intake** — normalize the material to Context / Decision / Consequences / Alternatives
   (adr-adoption §1); running record in the drafts file.
3. **Blast radius** — affected apps from the landscape; per app, sweep the governed element
   classes (the aspect-family table in adr-adoption §2; default depth: apps + one layer down).
   Classify compliant / violating / unclear.
4. **Grill** — crispness, drivers, applicability, exceptions, migration stance, supersedes
   check (adr-adoption §3).
5. **Land, federated** — one write session (recorded): `create_spec` per affected code-bound
   app board (`--validate spec` first); unbound affected boards named + skipped with the
   binding gate narrated. Then `create_insight` per swept app where violations were found.
   Commit; close the ledger entry.
6. **Hand off** — "Create remediation intents now?" → `promote_insight_findings` on reviewed
   violations; not now → `/insights`, `/specs`. Every stop names the next command.

## Failure branches

- Tools missing / connection errors → `ProvenMap not configured — run /login (browser) or /configure (manual) first`
- 401 → `Your ProvenMap architect token was rejected — run /login to reconnect`
- No affected board is code-bound → emit the normalized record + assessment as markdown, name
  the binding prerequisite; nothing is staged.
- Write tools absent → read-only token: normalize + assess + report; `read_write` named.
