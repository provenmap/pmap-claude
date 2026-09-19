---
category: connect
description: "Account · Disconnect from ProvenMap — remove the stored architect token from this machine"
allowed-tools: Bash(node:*)
---

Disconnect this machine from ProvenMap: revoke the stored token on the server, remove the
stored login grant (`~/.provenmap/architect-mcp.json`) and, where scriptable, the host's
user-scope MCP server entry. The revoke is best-effort — when the server cannot be reached, or
predates it, the disconnect is **local** only and the display says so.

## Workflow

1. Run the logout mode:

   ```bash
   node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-architect.js --logout --host claude
   ```

2. Print the JSON `display` field **verbatim in your reply** — never reformat, summarise, or
   rebuild it; the Bash output panel is collapsed for the user. It already covers what was
   removed, the manual `PMAP_MCP_TOKEN` reminder, whether the token was revoked on the server
   (and the manual step on the workspace command center → Architect access when it was not),
   and the next command (`/login`).

3. On a non-zero exit, print `display` verbatim and stop.

4. **Outcome:** `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-architect.js --brief --command logout` → one line, per `${CLAUDE_PLUGIN_ROOT}/knowledge/outcome/SKILL.md`.
