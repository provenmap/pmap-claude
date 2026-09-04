---
category: author
description: "Author · WRITE-CAPABLE: Take a new app from placed to build-ready — grill the spec into sequenced intents, choose its skills"
argument-hint: "[board]"
allowed-tools: Read, AskUserQuestion, Bash(node:*), mcp__plugin_pmap-architect_provenmap__*
---

Build prep for an app the architect marked `new_app` — resumable any time; everything
recomputes from live state. Read
[`${CLAUDE_PLUGIN_ROOT}/knowledge/app-readiness/SKILL.md`](../knowledge/app-readiness/SKILL.md) (the
readiness bar and both work items) and
[`${CLAUDE_PLUGIN_ROOT}/knowledge/architect-core/SKILL.md`](../knowledge/architect-core/SKILL.md).

## Workflow

### Step 1 — resolve the target

Argument given → that board. No argument →

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-architect.js --app-readiness
```

prints the `new_app` candidates from the workspace map (print verbatim; it says when the map
needs `--classify-tree` first). Several candidates → AskUserQuestion. A board that is an app
but **not** marked `new_app` → confirm first ("marked as an existing app — prep it anyway?").
Not an app at all → the report says so; route to `/new-app` (plan it) or `/board` (orient) and
stop.

### Step 2 — render the bar

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-architect.js --app-readiness --board <slug>
```

Print the `display` **verbatim** — do not reformat, reorder, or summarise. `ready: true` →
narrate the developer handoff (it is in the display) and stop.

### Step 3 — work the open items

Follow the app-readiness skill: the spec grill (full intents-authoring machinery) for open
items 1–2, board-init's Skills prep for item 3. Each item is optional per session; what is
skipped stays honestly open for next time.

### Step 4 — close

The architect-core closing move for the working copy (`preview_write_session_commit` →
title/summary via AskUserQuestion → `commit_write_session`), then re-run the Step 2 script and
print the fresh bar verbatim — that is the session's receipt.

**Outcome:** `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-architect.js --brief --command prepare-app --facts '{"board":"<slug>","ready":"<true|false>"}'` → Done · Left · Next, per `${CLAUDE_PLUGIN_ROOT}/knowledge/outcome/SKILL.md` (ready carries the developers' hand-off).

## Failure branches

- Script exit 1 / tools missing / connection errors → `ProvenMap not configured — run /login (browser) or /configure (manual) first`
- 401 / token rejected → `Your ProvenMap architect token was rejected — run /login to reconnect`
- Write tools absent (read-only token) → run Steps 1–2, present the spec-set and skills
  proposals as markdown, and name the `read_write` requirement for landing them.
