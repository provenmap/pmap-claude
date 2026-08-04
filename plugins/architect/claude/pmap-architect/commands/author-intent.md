---
category: author
description: "Author · WRITE-CAPABLE: Guided intent authoring — pull the surrounding context, grill the gaps, land a well-grounded draft intent"
argument-hint: "[board-slug]"
allowed-tools: AskUserQuestion, Bash(node:*), mcp__plugin_pmap-architect_provenmap__*
---

Capture what the org wants as an intent — from prose, a file shared in this session, or a bound
document. An intent IS the spec: the why (its `narrative`), the elements it touches, and the end
state each must reach, kept live against the model instead of frozen at hand-off. A bound document
stays where it lives; the intent points back at it. The whole interview arc
(routing, surround pull, the grill, done-bar, binding-gate narration) lives in
**intents-authoring** — load it plus **architect-core**. This command is the long-form entry to
that workflow; `/intents` is the queue view.

## Workflow

1. **Working-copy check** — `get_write_session`: pre-existing uncommitted changes are surfaced
   (boards + counts) and the architect decides — one combined commit later, or pause first
   (architect-core).
2. **Route** — argument/session board → classify per the architect-core taxonomy. Plain layer →
   walk up and say so; root/no board → `/new-app` inline or a per-app split; multi-app material
   → propose the split first. Never let `create_intent` hit an unbound board.
3. **Run the authoring interview** — intents-authoring "The authoring loop": surround pull →
   one-screen context brief, solution shaping when the approach is unsettled, the holistic
   sweep, the materialization gates (duplicate · already-implemented · sequencing), then the
   grill to the done-bar (`references/authoring-interview.md`). The draft is kept in the
   drafts file so the interview survives context loss.
4. **Land** — the pre-land self-review, then the read-back gate (the assembled intent rendered
   once — Land as draft / Revise), then `--validate intent` on the payload and `create_intent`.
   The intent is born a
   **draft** — a human locks it open for developer pulls — and the write joins the working copy.
   Carry the interview's reasoning into the `narrative` — the problem, the goal, what is out of
   scope — when there is reasoning worth keeping, and omit it when there isn't (intents-authoring
   "When to write a narrative"). When a **bound** document was the material, pass its slug as
   `draftedFromSourceSlug` (from `list_source_bindings`) rather than citing it in prose.
5. **Close + hand off** — the closing move (architect-core): `preview_write_session_commit` →
   present the plan → title/summary (AskUserQuestion) → `commit_write_session`. Every stop names
   the next command (`/intents` to release it, `/hub` for the queue).

## Failure branches

- Tools missing / connection errors → `ProvenMap not configured — run /login (browser) or /configure (manual) first`
- 401 → `Your ProvenMap architect token was rejected — run /login to reconnect`
- Board not code-bound → the binding-gate narration (intents-authoring) — draft held, never a raw 400.
- Write tools absent → read-only token: full interview, intent emitted as markdown, `read_write`
  requirement named.
