---
category: connect
description: "Account · Manual MCP token setup — mint a token in ProvenMap and wire it into this host"
allowed-tools: Bash(node:*), AskUserQuestion
---

One-time manual connection setup. The plugin ships an MCP server declaration (`.mcp.json`) that
reads the token from the `PMAP_MCP_TOKEN` environment variable — configuration is: mint a token,
put it in the environment, verify. This manual path stays first-class (it is the only path on
hosts we can't script, and when you lack the admin permission the `/login` approve requires).

> **Faster option:** `/login` signs you in through the browser, mints the token there, and
> stores + wires it for you — no copy-paste.

> **Security rule:** the token never transits the chat. The user sets it themselves; status
> shows it masked.

## Workflow

### Step 1 — mint a token

In the ProvenMap platform (as a workspace member): **Settings → MCP access tokens → mint**.
Choose the workspace, scope (`read` or `read_write` — authoring intents needs
`read_write`), and an optional board-subtree restriction. The raw token is shown **exactly
once** at mint.

### Step 2 — set the environment variable

The user adds it to the environment the host runs in (shell profile, or the host's env
configuration):

```bash
export PMAP_MCP_TOKEN="ck_mcp_live_…"        # the minted token
# optional, self-hosted/dev platforms only:
export PMAP_MCP_URL="https://<your-platform>/api/mcp"
```

Then restart the host session so the plugin's `.mcp.json` picks it up.

### Step 3 — verify

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-arch.js --status
```

Print the output **verbatim in your reply**. Connected → point at `/board`. Rejected → the
token is wrong/revoked: back to Step 1. Unreachable → check `PMAP_MCP_URL` and network, re-run
`/status`.

## Notes

- Rotating or revoking: revoke in the same settings screen; mint a fresh token; update the env
  var. `/logout` covers removal.
- The token carries the whole authorization (workspace + scope + restriction) — switching
  workspaces means minting a different token, not changing any config file.
- **The token acts as its minting user**: writes made here join that person's one workspace
  working copy — the same session the web app shows — so commit/discard from either surface
  decides both. Mint your own token; a shared token would merge working copies.
