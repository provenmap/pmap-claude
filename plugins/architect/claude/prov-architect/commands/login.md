---
category: connect
description: "Connect · Sign in to ProvenMap in the browser and mint an architect MCP token (no copy-paste)"
argument-hint: "[server-url]"
allowed-tools: Bash(node:*)
---

Connect to the ProvenMap MCP server by signing in through the browser: pick a workspace, scope,
and optional board restriction there, and the minted **MCP bearer token** is stored for you
(user-scope, `~/.provenmap/architect-mcp.json`) and written into the host's MCP config when
scriptable. The token never transits this chat. **The token acts as you**: writes made here
join your one workspace working copy — the same session the web app shows — and committing or
discarding from either surface decides both.

> Prefer manual setup, or minting from the settings UI? Use **`/configure`** — it stays fully
> supported (and is the only path when you lack workspace-admin permission to approve).

## Login Workflow

**Arguments — `$ARGUMENTS`:** when `$ARGUMENTS` starts with `http://` or
`https://` it is the API base URL of the ProvenMap server to sign in against —
any deployment (e.g. `/login https://<your-server>/api`); the compiled-in
default is production. Append `--base-url $ARGUMENTS` to the `--login-start`
call in Step 1 — Step 2's poll resumes against the same server automatically.
The CLI **stores** that server immediately, so every later `/login`, `/status`,
and retry targets it with no argument and no environment variable. Empty
`$ARGUMENTS` = use the stored server, else production.

The script's JSON output always includes a `display` field of ready-made markdown. **Print
`display` verbatim in your reply — never reformat, summarise, or rebuild it; the Bash output
panel is collapsed for the user.** Branch only on `status` and the exit code.

### Step 0: Check the current connection

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/prov-architect.js --status
```

Print the output verbatim. If it reports **Connected**, stop — the user is already signed in
(the report names `/logout` for disconnecting). Otherwise continue.

### Step 1: Start the browser login

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/prov-architect.js --login-start --host claude
# add --base-url $ARGUMENTS when $ARGUMENTS is an http(s) URL
```

Print the JSON `display` field verbatim, then wait for the user to finish in the browser before
continuing. On a non-zero exit, print `display` verbatim and stop.

### Step 2: Wait for approval

Run the poll phase. It blocks until the user approves in the browser (allow it to run for a few
minutes — give the Bash call a generous timeout, e.g. 250s):

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/prov-architect.js --login-poll --host claude
```

Print the JSON `display` field verbatim. Then, by `status`:

- **`complete`**: done — the display covers where the token went and the next steps (restart the
  session so the MCP server loads, then `/status`, `/board`). Nothing more to add.
- **`pending`**: the user hasn't finished in the browser yet. Run the same `--login-poll` command
  again to keep waiting (the code is still valid), or re-run `/login` if they closed the tab.
- Non-zero exit (denied / expired): `display` explains it — offer to re-run `/login` from Step 1.

## Notes

- **Approval needs workspace admin** (access-manage) — the same gate as minting a token in the
  settings UI. Without it, an admin mints the token there and the user wires it via `/configure`.
- **Non-default server (self-hosted, on-prem, staging):** pass the server as
  the command's argument — `/login https://<your-server>/api` — no environment
  variable needed, and it works in every host. `PROV_BASE_URL` remains
  supported as an environment-level override. The stored endpoint and later
  re-logins then follow the approving server automatically.
