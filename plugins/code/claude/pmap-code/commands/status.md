---
category: connect
description: "Account · Show ProvenMap sync status and analysis summary"
allowed-tools: Bash(node:*)
next-steps: none
---

Show the full ProvenMap status for this project — configuration, archetype
precondition, boards (analysis + sync state + changed files), and adopted
aspects. The script renders the final report itself — your only job is to run
it and pass its output through.

## Workflow

1. Run the preflight gate in inspect-only mode first, so the report can say whether the binding was
   verified against the server. It writes nothing:

   ```bash
   node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-preflight.js --no-repair
   ```

   Print its `display` verbatim above the status report. A non-zero exit is still worth reporting —
   `/status` never refuses.

2. Run the status script:

   ```bash
   node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-status.js --domain code
   ```

3. Reproduce the script's stdout **verbatim in your reply** — write it out in
   full, including the "Next steps" section; the Bash output panel is collapsed
   for the user, so nothing shows unless you do. Print it fresh each call, and
   don't reformat, reorder, summarise, or re-derive state by reading
   `.provenmap/` files yourself.

4. If the status script exits non-zero, print its output verbatim and stop. Do not
   fabricate status.

The report is offline (local `.provenmap/` state + local git only) — it never
calls the API, so it cannot verify credentials. If the user asks whether the
connection actually works, point them to `/login` (browser) or `/configure`
(manual), which test the connection.
