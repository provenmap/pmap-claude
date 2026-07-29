---
category: author
description: "Author · WRITE-CAPABLE: Guided spec authoring — pull the surrounding context, grill the gaps, stage a well-grounded draft spec"
argument-hint: "[board-slug]"
allowed-tools: AskUserQuestion, Bash(node:*), mcp__plugin_prov-architect_provenmap__*
---

Capture what the org wants as a requirement spec — from prose, a file shared in this session, or
a bound document. The whole interview arc (routing, mode detection, surround pull, the grill,
done-bar, binding-gate narration) lives in **specs-authoring** — load it plus
**architect-core**. This command is the standalone entry to that workflow.

## Workflow

1. **Session hygiene** — `--session list`; reconcile any dangling candidates (architect-core).
2. **Route** — argument/session board → classify per the architect-core taxonomy. Plain layer →
   walk up and say so; root/no board → `/new-app` inline or a per-app federation; multi-app
   material → propose the split first. Never let `create_spec` hit an unbound board.
3. **Run the authoring interview** — specs-authoring "The authoring interview": mode detection
   (ecosystem vs greenfield-lite), surround pull → one-screen context brief, the grill to the
   done-bar, draft kept in the drafts file.
4. **Land** — `--validate spec` on the payload, `create_spec` (+ `draftedFromSourceId` when a
   bound document was the material). Narrate: staged as a **draft** — approval happens on the
   platform's Specs screen.
5. **Hand off** — the "Create intents for this now?" offer (specs-authoring step 5). Every stop
   names the next command (`/specs` coverage, `/intents`).

## Failure branches

- Tools missing / connection errors → `ProvenMap not configured — run /login (browser) or /configure (manual) first`
- 401 → `Your ProvenMap architect token was rejected — run /login to reconnect`
- Board not code-bound → the binding-gate narration (specs-authoring) — draft held, never a raw 400.
- Write tools absent → read-only token: full interview, spec emitted as markdown, `read_write`
  requirement named.
