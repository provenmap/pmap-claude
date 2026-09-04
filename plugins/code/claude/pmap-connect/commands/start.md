---
category: start
description: "Start here · Start here — reads this project's real state and tells you exactly what to run next"
allowed-tools: Read, AskUserQuestion, Bash(node:*)
next-steps: none
---

The one command to remember. Scripts own the reading and the ranking; you add judgment and
offer the pick.

## Workflow

1. **Surfaces card** — `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-help.js --card`; print it verbatim.
2. **Ladder** — `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-status.js --next --domain connect` (offline;
   never prints credentials); print it verbatim — never rebuild the ladder. It ranks blocking
   gates first and names a command on every line.
3. **Judgment, briefly.** Where this session gives you something the script can't know — the
   user just said what they're trying to do, you already saw the failure they're about to hit,
   the lead action is one they explicitly declined earlier — say so in a sentence or two after
   the verbatim block, and name the command you'd run instead. Otherwise add nothing.
4. **Offer the pick** — AskUserQuestion "What next?": the lead action and the next two rungs
   (label = the command, description = its reason) plus **Not now**. Hand-off lines are never
   options. A pick → run it as this plugin's own slash command where the host lets you invoke
   one; otherwise read `${CLAUDE_PLUGIN_ROOT}/commands/<name>.md` (Cursor: `skills/<name>/SKILL.md`)
   and follow it, Outcome step included. **Not now** → stop. Hosts without the tool: ask in one
   line.

## Notes

- Exit 1 means the router itself failed (not an unconfigured project — that's a valid state
  and exits 0). Relay the message and name `/status` for the full report.
- The ladder's two hard gates return alone on purpose: with no credentials nothing runs, and on
  a branch mismatch every push-capable command refuses, so nothing else is worth listing yet.
