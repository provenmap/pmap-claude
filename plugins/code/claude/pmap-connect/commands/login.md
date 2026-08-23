---
category: connect
description: "Account · Sign in to ProvenMap in the browser and pick a board (no copy-paste)"
argument-hint: "[switch] [server-url]"
allowed-tools: Bash
---

Sign in to ProvenMap for this document repo through the browser —
credentials land straight in `.provenmap/config.json`, no copy-paste.
`/login` is **idempotent** (Step 0); `/login switch` rebinds to a different
workspace/board (`/configure` too), and `/logout` disconnects.

> Prefer manual setup or CI? Use **`/configure`** — it takes
> `bindingToken`/`apiSecret` directly.

## Login Workflow

Up to two optional arguments, either order: `switch` (rebind flow) and a
server URL. If the URL starts `http://`/`https://`, append `--base-url <that
URL>` to **every** `pmap-login.js` call below; otherwise use the stored
server, else production — stored in config after login, passed only once.

The script's JSON output always includes a `display` field of ready-made
markdown. **Print `display` verbatim — never reformat, summarise, or rebuild
it; the Bash output panel is collapsed for the user.** Branch only on
`status` and the exit code.

### Step 0: Check the current connection

Skip when the user asked to switch boards (`switch` argument, or an explicit
ask) — go straight to Step 1 with `--rebind`. Otherwise run:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-login.js --check
# add --base-url <url> when the user's argument is an http(s) URL
```

Branch on `status`: **`authenticated`** → print `display` verbatim and
**stop** (already connected). **`invalid`** → print `display` verbatim
(credentials rejected), continue to Step 1. **`unauthenticated`**/
**`unreachable`** → continue to Step 1 silently.

### Step 1: Start the browser login

Requests a one-time code, opens the browser (best-effort). A bound project
re-authenticates to its board; `--rebind` (`switch`) unlocks the full picker:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-login.js --start --host claude --domain connect --plugin-version 0.11.0   # add --rebind only for /login switch
# add --base-url <url> when the user's argument is an http(s) URL
```

Print the JSON `display` field verbatim, then wait for the user to finish in
the browser. On a non-zero exit, print `display` verbatim and stop.

### Step 2: Wait for approval

Blocks until the user finishes in the browser — give the Bash call a
generous timeout (e.g. 250s):

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-login.js --poll --host claude --domain connect
```

Print the JSON `display` field verbatim. Then, by `status`:

- **`complete`**: done — `display` already confirms the connection and next
  steps.
- **`pending`**: not finished yet — re-run the same `--poll` command (the
  code is still valid), or restart `/login` if the tab closed.
- Non-zero exit (denied / expired / board mismatch): `display` explains what
  happened — offer to re-run `/login` from Step 1.

## Notes

- **Sign-in / account state:** the browser redirects to the ProvenMap portal
  login (same as your org's web app, if already used). An unonboarded,
  blocked, or lapsed account sees an onboarding/access page instead —
  resolve, then re-run `/login`.
- **Non-default server:** also settable via `PMAP_BASE_URL`, or a hand-set
  `baseUrl` in `.provenmap/config.json`.

## After connecting

On `status: "complete"`, run the status report and relay **only its
`Lifecycle:` line** — the next command (e.g. `/sync` to ground this board):

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-status.js --domain connect
```

Print only that line.
