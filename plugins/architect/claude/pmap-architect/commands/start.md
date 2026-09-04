---
category: start
description: "Start here · Reads your real state and tells you what to run next — or routes any open-ended ask to the right workflow"
argument-hint: "[what you want to do — optional]"
allowed-tools: Read, AskUserQuestion, Bash(node:*), mcp__plugin_pmap-architect_provenmap__*
next-steps: none
---

The one command to remember. No argument = "where am I, what next". With free text = route the
ask to the right workflow and run it inline. Read
`${CLAUDE_PLUGIN_ROOT}/knowledge/architect-core/SKILL.md` first — the board taxonomy and the workflow
routing table live there.

## No argument — where am I, what next

Scripts own the reading and the ranking; you add judgment and offer the pick.

1. **Surfaces card** — `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-help.js --card`; print it verbatim.
2. **Ladder** — `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-architect.js --next` (live: connection,
   working copy, workspace shape, attention, drafts); print its `display` verbatim — never
   rebuild the ladder. Not configured or rejected → the display carries the canonical line;
   print it and stop.
3. **Judgment, briefly.** Only where this session knows something the script can't — what the
   architect just said they want, a failure you already saw — one or two sentences after the
   block, naming the command you'd run instead. Otherwise add nothing.
4. **Offer the pick** — AskUserQuestion "What next?": the lead action and the next two rungs
   (label = the command, description = its reason) plus **Not now**. Hand-off lines (`↪`) are
   never options. A pick → run that workflow inline per architect-core's routing table (load
   its skill, then close with that command's Outcome). **Not now** → stop.

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

- `--next` reports not configured → `ProvenMap not configured — run /login (browser) or /configure (manual) first`
- 401 from any MCP call → `Your ProvenMap architect token was rejected — run /login to reconnect`
