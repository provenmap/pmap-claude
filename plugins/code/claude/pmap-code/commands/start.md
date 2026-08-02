---
category: start
description: "Start here · Start here — reads this project's real state and tells you exactly what to run next"
allowed-tools: Bash(node:*)
---

The one command to remember. Reads local state and git, then names the single most useful next
step. Deterministic state first, judgment second — the script owns the reading and the ranking.

## Workflow

1. **Run the router** (offline; never calls the API, never prints credentials):

   ```bash
   node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-status.js --next --domain code
   ```

2. **Print its output verbatim** — do not reformat, reorder, or summarise it, and never rebuild
   the ladder yourself. It already ranks blocking gates first and names a command on every line.

3. **Add judgment on top, briefly.** Where this session gives you something the script can't
   know — the user just said what they're trying to do, you already saw the failure they're
   about to hit, the lead action is one they explicitly declined earlier — say so in a sentence
   or two after the verbatim block, and name the command you'd run instead. Otherwise add
   nothing: the ladder stands on its own.

4. **Offer to run the lead action.** If the user says yes, run that command's workflow inline —
   commands can't invoke each other, so load what it needs and continue in this session.

## Notes

- Exit code 1 means the router itself failed (not an unconfigured project — that's a valid
  state and exits 0). Relay the message and name `/status` for the full report.
- The ladder's two hard gates return alone on purpose: with no credentials nothing runs, and on
  a branch mismatch every push-capable command refuses, so nothing else is worth listing yet.
