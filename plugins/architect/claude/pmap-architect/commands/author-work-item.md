---
category: author
description: "Author · WRITE-CAPABLE: Guided work item authoring — pull the surrounding context, grill the gaps, land a well-grounded draft work item"
argument-hint: "[board-slug]"
allowed-tools: Read, AskUserQuestion, Bash(node:*), mcp__plugin_pmap-architect_provenmap__*
---

Capture what the org wants as a work item — from prose, a file shared in this session, or a bound
document. A work item IS the spec: the why (its `narrative`), the elements it touches, and the end
state each must reach, kept live against the model instead of frozen at hand-off. A bound document
stays where it lives; the work item points back at it. The whole interview arc
(routing, surround pull, the grill, done-bar, binding-gate narration) lives in
[`${CLAUDE_PLUGIN_ROOT}/knowledge/work-items-authoring/SKILL.md`](../knowledge/work-items-authoring/SKILL.md) — read it
plus [`${CLAUDE_PLUGIN_ROOT}/knowledge/architect-core/SKILL.md`](../knowledge/architect-core/SKILL.md). This command
is the long-form entry to that workflow; `/work-items` is the queue view.

## Workflow

1. **Working-copy check** — `get_write_session`: pre-existing uncommitted changes are surfaced
   (boards + counts) and the architect decides — one combined commit later, or pause first
   (architect-core).
2. **Route** — argument/session board → classify per the architect-core taxonomy. Plain layer →
   walk up and say so; root/no board → `/new-app` inline or a per-app split; multi-app material
   → propose the split first. Never let `create_work_item` hit an unbound board.
3. **Run the authoring interview** — work-items-authoring "The authoring loop": surround pull →
   one-screen context brief, solution shaping when the approach is unsettled, the holistic
   sweep, the materialization gates (duplicate · already-implemented · sequencing), then the
   grill to the done-bar (`references/authoring-interview.md`). The draft is kept in the
   drafts file so the interview survives context loss.
4. **Land** — the pre-land self-review, then the read-back gate (the assembled work item rendered
   once — Land as draft / Revise), then `--validate work-item` on the payload and `create_work_item`.
   The work item is born a
   **draft** — a human locks it open for developer pulls — and the write joins the working copy.
   Carry the interview's reasoning into the `narrative` — the problem, the goal, what is out of
   scope — when there is reasoning worth keeping, and omit it when there isn't (work-items-authoring
   "When to write a narrative"). When a **bound** document was the material, pass its slug as
   `draftedFromSourceSlug` (from `list_source_bindings`) rather than citing it in prose.
5. **Close + hand off** — the closing move (architect-core): `preview_write_session_commit` →
   present the plan → title/summary (AskUserQuestion) → `commit_write_session`.

**Outcome:** `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-architect.js --brief --command author-work-item --facts '{"board":"<slug>"}'` → Done · Left · Next, per `${CLAUDE_PLUGIN_ROOT}/knowledge/outcome/SKILL.md`.

## Failure branches

- Tools missing / connection errors → `ProvenMap not configured — run /login (browser) or /configure (manual) first`
- 401 → `Your ProvenMap architect token was rejected — run /login to reconnect`
- Board not code-bound → the binding-gate narration (work-items-authoring) — draft held, never a raw 400.
- Write tools absent → read-only token: full interview, work item emitted as markdown, `read_write`
  requirement named.
