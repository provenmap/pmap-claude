---
category: connect
description: "Account · Check the ProvenMap MCP connection: endpoint, token, live probe, scope, and your working copy"
allowed-tools: Bash(node:*)
next-steps: none
---

Report whether this session can reach the ProvenMap MCP server: endpoint, token presence
(masked), a live `tools/list` probe, the token's scope — and the working copy (this token's
uncommitted changes, live from the server; web-app edits live in a separate session).

## Workflow

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-architect.js --status
```

Print the script's stdout **verbatim in your reply** — never reformat, reorder, or summarise it;
the Bash output panel is collapsed for the user, so write it out in full. The report already ends
with the next command for every state (not configured → `/login` / `/configure`; rejected →
`/login`; connected → `/board`) — don't add your own next steps.

On a non-zero exit, print the output verbatim and stop.
