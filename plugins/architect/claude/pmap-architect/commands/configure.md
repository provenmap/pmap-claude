---
category: connect
description: "Account · Manual MCP token setup — generate a token in ProvenMap and wire it into this host"
allowed-tools: Bash(node:*), AskUserQuestion
---

One-time manual connection setup. The plugin ships an MCP server declaration (`.mcp.json`) that
reads the token from the `PMAP_MCP_TOKEN` environment variable — configuration is: generate a token,
put it in the environment, verify. This manual path stays first-class (it is the only path on
hosts we can't script, and when you lack the admin permission the `/login` approve requires).

> **Faster option:** `/login` signs you in through the browser, generates the token there, and
> stores + wires it for you — no copy-paste.

> **Security rule:** the token never transits the chat. The user sets it themselves; status
> shows it masked.

## Workflow

### Step 1 — generate a token

In the ProvenMap platform (needs the access-manage permission): open the **workspace command
center (hub) → Architect access → Mint a key**. Choose scope (`read` or `read_write` —
authoring intents needs `read_write`) and an optional board-subtree restriction. The raw
token — and its ready-made setup snippets — are shown **exactly once** at generate.

### Step 2 — wire it in (pick the row that matches where this session runs)

| Where you run | What to do |
|---|---|
| **claude.ai / Cowork** | Paste the **connector URL snippet** (`…/api/mcp/k/<token>`) as a claude.ai custom connector: Settings → Connectors → Add custom connector → "Remote MCP server URL", OAuth fields empty. No env vars, no egress config — done, skip Step 3. |
| **Claude Code / Codex (this host)** | Set the env var, then persist + verify: the user runs `export PMAP_MCP_TOKEN="ck_mcp_live_…"` (plus `export PMAP_MCP_URL=…` for self-hosted platforms) in the environment the host runs in, then restarts the session. |
| **Cloud IDE / CI** | Set `PMAP_MCP_TOKEN` (and `PMAP_MCP_URL` if self-hosted) in the environment/secrets configuration. The sandbox must allowlist the ProvenMap host in its network egress settings. On **Codex**, `PMAP_MCP_URL` does not redirect the MCP server — its shipped URL is literal, so a self-hosted endpoint reaches the tools only once Step 3 pins it. |

### Step 3 — verify and persist (Claude Code / Codex only)

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-architect.js --connect --host claude
```

This reads `PMAP_MCP_TOKEN`, proves it with one probe, stores the grant (owner-only), and writes
the host's user-scope MCP server entry pinned to your endpoint. Print its `display` **verbatim**.
Connected → point at `/board`. Rejected → generate a fresh token (Step 1). Unreachable → check
`PMAP_MCP_URL` / network / egress allowlist, then re-run.

## Notes

- Rotating or revoking: revoke on the command center → Architect access; generate a fresh token;
  update the env var. `/logout` covers removal.
- The token carries the whole authorization (workspace + scope + restriction) — switching
  workspaces means generating a different token, not changing any config file.
- **The token acts as its generating user**: writes made here join that person's one workspace
  working copy — the same session the web app shows — so commit/discard from either surface
  decides both. Mint your own token; a shared token would merge working copies.
