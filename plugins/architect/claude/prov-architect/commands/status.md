---
category: connect
description: "Connect · Check the ProvenMap MCP connection: endpoint, token, live probe, scope"
allowed-tools: Bash(node:*)
---

Report whether this session can reach the ProvenMap MCP server: endpoint, token presence
(masked), a live `tools/list` probe, and the token's scope.

## Workflow

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/prov-architect.js --status
```

Print the script's stdout **verbatim in your reply** — never reformat, reorder, or summarise it;
the Bash output panel is collapsed for the user, so write it out in full. The report already ends
with the next command for every state (not configured → `/login` / `/configure`; rejected →
`/login`; connected → `/board`) — don't add your own next steps.

On a non-zero exit, print the output verbatim and stop.
