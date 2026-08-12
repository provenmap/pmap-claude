---
category: start
description: "Start here · Reads your real state and tells you what to run next — or routes any open-ended ask to the right workflow"
argument-hint: "[what you want to do — optional]"
allowed-tools: Read, AskUserQuestion, Bash(node:*), mcp__plugin_pmap-architect_provenmap__*
---

The one command to remember. No argument = "where am I, what next". With free text = route the
ask to the right workflow and run it inline. Read
[`${CLAUDE_PLUGIN_ROOT}/knowledge/architect-core/SKILL.md`](../knowledge/architect-core/SKILL.md) first — the board
taxonomy
and the workflow routing table live there.

## No argument — where am I, what next

Deterministic state first, judgment second:

1. **Connection + working state** —
   `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-architect.js --status` (connection, the working copy —
   live from `get_write_session`, the only session truth — and drafts in flight).
2. **Workspace shape** (only if connected) — `--classify-tree` (cached ~1h) +
   `--attention` (architect-core, batch state reads). If the scripts lack the grant, fall
   back to `get_board_tree('root')` + `get_hub_status(scope: 'tree')` and classify per the
   architect-core taxonomy.
3. **Render the answer, ranked, every line naming its command:**
   - Connection broken → the canonical error line and stop (`/login` / `/configure`).
   - **Empty root ⇒ lead with `/setup-workspace`** — the workspace is waiting for its estate:
     map what exists, or found something new (the command forks at the top of its interview).
   - Unfinished work next: an open working copy from the status report ("you have N
     uncommitted changes across M boards — inspect on a board, then commit or discard;
     the session includes any web-app edits"), and each draft in flight ("resume the
     `payments` intent draft? → `/author-intent payments`").
   - The attention headline from hub status (bounced intents, stale intents, findings awaiting
     review → `/hub` for the full queue).
   - Init states by name, straight from the script output: a `governing · never pushed` board
     in the classify table (the attention report lists them as "Waiting for first push") →
     "`payments-app` is empty — bootstrap it? → `/board payments-app`"; a **Strategic
     landscape only** headline → "graduate the first real system → `/new-app <name>`".
     (Empty plain layers have no batch signal — `/board` detects them on open.)
   - Otherwise the natural entries: `/board` (orient), `/ask-board` (ask), `/hub` (what needs
     me), `/archetypes` (catalogue gap round, if material is in hand), `/style-board` (beautify
     a board on demand).

## With free text — route the ask

Classify against architect-core's **workflow routing table**:

- **High confidence** → state the reading in one line ("that's an intent-authoring job") and run
  the workflow inline: read its doctrine from `${CLAUDE_PLUGIN_ROOT}/knowledge/<skill>/SKILL.md` (the
  routing table names the skill per workflow) and continue — the named command remains the
  standalone entry.
- **Ambiguous** → AskUserQuestion with the top 2–3 candidate workflows, one line each.
- **Compound** ("we're acquiring X — absorb their systems") → propose the sequenced plan
  (e.g. extend the landscape → `/new-app` per system → `/adopt-adr` for integration
  decisions), confirm once, then run the sequence inline.

## Failure branches

- `--status` reports not configured → `ProvenMap not configured — run /login (browser) or /configure (manual) first`
- 401 from any MCP call → `Your ProvenMap architect token was rejected — run /login to reconnect`
