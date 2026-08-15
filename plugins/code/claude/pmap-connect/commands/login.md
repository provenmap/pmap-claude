---
category: connect
description: "Account · Sign in to ProvenMap in the browser and pick a board (no copy-paste)"
argument-hint: "[switch] [server-url]"
allowed-tools: Bash
---

Connect this document repo to ProvenMap by signing in through the browser. The
credentials are written straight into `.provenmap/config.json` for you — no
copying tokens by hand.

`/login` is **idempotent**: already connected → it says so and stops; stored
credentials rejected → it flows straight into a fresh sign-in. To bind this
project to a **different workspace/board**, run `/login switch` (the browser is
already signed in, so switching is just picking the new board). `/configure`
can also switch boards; `/logout` disconnects this project.

> Prefer manual setup or running in CI? Use **`/configure`** instead — it stays
> fully supported and takes `bindingToken`/`apiSecret` directly.

## Login Workflow

**Arguments — `$ARGUMENTS`:** may contain `switch` (triggers the rebind flow
below), an `http://` / `https://` URL, or both in either order.

A URL is the API base of the ProvenMap server to sign in against — any
deployment (e.g. `/login https://<your-server>/api`); the compiled-in default
is production. Append `--base-url <that url>` to **every** `pmap-login.js`
call in this workflow. A successful login writes it into
`.provenmap/config.json`, so it is passed once — later commands and re-logins
stay on that server with no argument and no environment variable.

The script's JSON output always includes a `display` field of ready-made
markdown. **Print `display` verbatim in your reply — never reformat, summarise, or rebuild it; the Bash output panel is collapsed for the user.**
Branch only on `status` and the exit code.

### Step 0: Check the current connection

Skip this step entirely when the user asked to switch boards (`switch`
argument, or an explicit ask) — go straight to Step 1 with `--rebind`.
Otherwise run:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-login.js --check
# add --base-url <url> when $ARGUMENTS contains an http(s) URL
```

Branch on `status`:

- **`authenticated`** → print `display` verbatim and **stop** — the user is
  already connected; the panel names `/logout` and `/login switch`.
- **`invalid`** → print `display` verbatim (stored credentials were rejected —
  a fresh sign-in follows), then continue to Step 1.
- **`unauthenticated`** or **`unreachable`** → continue to Step 1 without
  printing anything (Step 1 reports its own success or failure).

### Step 1: Start the browser login

Run the start phase. It requests a one-time code and (best-effort) opens the
user's default browser. A project already bound to a board re-authenticates to
that same board; `--rebind` (the `switch` path) unlocks the full picker:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-login.js --start --host claude --domain connect --plugin-version 0.10.5   # add --rebind only for /login switch
# add --base-url <url> when $ARGUMENTS contains an http(s) URL
```

Print the JSON `display` field verbatim, then wait for the user to finish in
the browser before continuing.

On a non-zero exit, print `display` verbatim and stop.

### Step 2: Wait for approval

Run the poll phase. It blocks until the user finishes in the browser (allow it
to run for a few minutes — give the Bash call a generous timeout, e.g. 250s):

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-login.js --poll --host claude --domain connect
```

Print the JSON `display` field verbatim. Then, by `status`:

- **`complete`**: done — the `display` panel already confirms the connection
  and next steps. Nothing more to add.
- **`pending`**: the user hasn't finished in the browser yet. Run the same
  `--poll` command again to keep waiting (the code is still valid), or re-run
  `/login` if they closed the tab.
- On a non-zero exit (denied / expired / board mismatch): `display` explains
  what happened — offer to re-run `/login` from Step 1 if appropriate.

## Notes

- **Where you sign in:** the browser opens the ProvenMap app, which sends you to
  the ProvenMap portal login. If your org uses the web app already, this is the
  same login.
- **Account state:** if your account isn't onboarded, is blocked, or its
  subscription has lapsed, the browser will show the onboarding / access page and
  you won't be able to bind a board — resolve that first, then re-run `/login`.
- **Non-default server (self-hosted, on-prem, staging):** pass the server as
  the command's argument — `/login https://<your-server>/api` — no environment
  variable needed, and it works in every host. `PMAP_BASE_URL` and a hand-set
  `baseUrl` in `.provenmap/config.json` remain supported. A successful login
  pins the URL into `.provenmap/config.json`, so later commands stay on the
  same server.

## After connecting — state the next step

Once login completes (`status: "complete"`), run the offline status report and relay **only its `Lifecycle:` line** so the user knows the single next command (e.g. `/sync` to ground this board in this document repo):

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-status.js --domain connect
```

Do not print the whole report here — one line, one next step.
