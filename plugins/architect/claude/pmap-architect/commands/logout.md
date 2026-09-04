---
category: connect
description: "Account · Disconnect from ProvenMap — remove the stored architect token from this machine"
allowed-tools: Bash(node:*)
---

Disconnect this machine from ProvenMap: remove the stored login grant
(`~/.provenmap/architect-mcp.json`) and, where scriptable, the host's user-scope MCP server
entry. This is a **local** disconnect — the display explains the server-side caveat.

## Workflow

1. Run the logout mode:

   ```bash
   node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-architect.js --logout --host claude
   ```

2. Print the JSON `display` field **verbatim in your reply** — never reformat, summarise, or
   rebuild it; the Bash output panel is collapsed for the user. It already covers what was
   removed, the manual `PMAP_MCP_TOKEN` reminder, the server-side revocation step (workspace
   command center → Architect access), and the next command (`/login`).

3. On a non-zero exit, print `display` verbatim and stop.

4. **Outcome:** `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-architect.js --brief --command logout` → one line, per `${CLAUDE_PLUGIN_ROOT}/knowledge/outcome/SKILL.md`.
