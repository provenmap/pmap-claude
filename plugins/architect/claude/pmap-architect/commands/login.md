---
category: connect
description: "Account · Sign in to ProvenMap in the browser and generate an architect MCP token (no copy-paste)"
argument-hint: "[server-url]"
allowed-tools: Bash(node:*)
---

Connect to the ProvenMap MCP server by signing in through the browser: pick a workspace and
scope there — the token covers that whole workspace — and the generated **MCP bearer token** is
stored for you (user-scope, `~/.provenmap/architect-mcp.json`) and written into the host's MCP config when
scriptable. The token never transits this chat. **The token acts as you** for authorization,
but writes made here journal into the token's **own** working copy — separate from your web-app
session, listed in the app under plugin sessions where you can also accept or discard it.

> Prefer manual setup, or generating from the settings UI? Use **`/configure`** — it stays fully
> supported (and is the only path when you lack workspace-admin permission to approve).

## Login Workflow

The command accepts an optional server URL argument. When the user supplied one starting with
`http://` or `https://`, append `--base-url <that URL>` to the `--login-start` invocation;
otherwise use the stored server, else production.

The script's JSON output always includes a `display` field of ready-made markdown. **Print
`display` verbatim in your reply — never reformat, summarise, or rebuild it; the Bash output
panel is collapsed for the user.** Branch only on `status` and the exit code.

### Step 0: Check the current connection

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-architect.js --status
```

Print the output verbatim. If it reports **Connected**, stop — the user is already signed in
(the report names `/logout` for disconnecting). Otherwise continue.

### Step 1: Start the browser login

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-architect.js --login-start --host claude
# add --base-url <url> when the user's argument is an http(s) URL
```

Print the JSON `display` field verbatim, then wait for the user to finish in the browser before
continuing. On a non-zero exit, print `display` verbatim and stop.

### Step 2: Wait for approval

Run the poll phase. It blocks until the user approves in the browser (allow it to run for a few
minutes — give the Bash call a generous timeout, e.g. 250s):

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-architect.js --login-poll --host claude
```

Print the JSON `display` field verbatim. Then, by `status`:

- **`complete`**: done — the display covers where the token went and the next steps (restart the
  session so the MCP server loads, then `/status`, `/board`). Nothing more to add.
- **`pending`**: the user hasn't finished in the browser yet. Run the same `--login-poll` command
  again to keep waiting (the code is still valid), or re-run `/login` if they closed the tab.
- Non-zero exit (denied / expired): `display` explains it — offer to re-run `/login` from Step 1.

**Close:** `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-architect.js --after login` — print verbatim.

## Notes

- **Approval needs workspace admin** (access-manage) — the same gate as generating a token in the
  settings UI. Without it, an admin generates the token there and the user wires it via `/configure`.
- **Non-default server (self-hosted, on-prem, staging):** pass it as the command argument —
  `/login https://<your-server>/api` — or set `PMAP_BASE_URL`; the server used is then stored
  for later `/login` and `/status` calls.
