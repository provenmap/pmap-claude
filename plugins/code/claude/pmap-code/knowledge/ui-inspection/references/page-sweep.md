# The page sweep — `/inspect --pages`

Captures every page `/aspects` extracted (`ui.pages`) from the running app, with no picking. One
headless browser opens each page at desktop and at mobile size; the script matches every capture
to its page and reports each page it could not capture, with the reason. The push then stores
each screenshot as that page's visual reference on the board. Follow this exactly: every call,
flag, branch and confirm below is part of the command's contract.

Print every `display` field **verbatim** — never reformat, reorder, or summarise. Branch only on
exit codes and named JSON fields. Never read the screenshots: the script already matched them,
and a sweep can hold hundreds.

What the script decides, so nothing here is re-derived:

- **Which URL a page opens at.** A static route opens at its own path. A dynamic route
  (`/orders/[id]`) opens at its sample from `inspect.samples` in `.provenmap/config.json`, else at
  the first link on a captured page that leads to it. A route with neither is listed as not
  captured — never guess an id for it.
- **Whether a landing is the page.** A page that answers with an HTTP error, or that sends the
  browser to another page, is listed with what happened and is not captured.
- **What is unchanged.** A screenshot identical to the one this checkout last pushed for that
  page, target and size is not uploaded again.

## Step 1 — Sweep

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-inspect.js --pages [--url <url> | --env <name>]
```

Pass through any `--url`/`--env` argument. Bash timeout ≥ 300 s: each call works for up to 240 s
and the sweep is resumable. Capture needs no credentials — never require `/login` first.

- 0, `sweepStatus: "pending"` → run the same command again with the same flags, until it is not
  pending.
- 0, `sweepStatus: "signin_required"` → Step 2.
- 0, `sweepStatus: "complete"` → Step 3.
- 1, unresolvable URL → **AskUserQuestion** for the app URL (offering the environments the
  `error` lists), then re-run with `--url <answer>` plus `--save-env <name>` if they want it
  remembered.
- 1, "No pages to capture" → stop; the next command is `/aspects --aspect ui.pages`.
- 1, the app did not answer → stop; the user starts the app and runs `/inspect --pages` again,
  which carries on where the sweep stopped.
- 1, "already active" → a picking browser is open: finish it with `--poll`, or `--stop` it if the
  user abandons it, then run Step 1 again.
- 1, "no browser found" → stop: the sweep needs Chrome, Edge, Brave or Chromium on this machine.
- 1, every page opened the sign-in page (only with `--no-signin`) → Step 2.
- 3 → run Step 1 once more (it resumes); a second exit 3 → relay `error` and stop.

## Step 2 — Sign in (the user decides)

A page opened the app's sign-in page (`signInUrl`). Ask with **AskUserQuestion**: "Some pages
need sign-in. Sign in now?"

- **Sign in (Recommended)** —
  `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-inspect.js --start --signin --url <signInUrl>` opens a
  visible browser; print its `display`. Then wait:
  `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-inspect.js --poll --max-wait 240`, again while
  `selectStatus` is `"pending"`. The user signs in in that window and presses **Done**; the
  script keeps the sign-in in the inspection browser's own profile. `"browser_closed"` means the
  window was closed without Done and the sign-in may not have been kept — say so. Then Step 1
  again, flags unchanged.
- **Capture public pages only** — Step 1 again with `--no-signin` on this and every later call;
  pages behind sign-in are listed as not captured.

Never ask for, type, or read a password or a token: the user signs in in the browser, and
nothing about the sign-in passes through the chat.

## Step 3 — Push (the user confirms)

The `complete` display is the report: how many pages were captured, and every page that was not,
with the reason. When `pages.captured` is 0 there is nothing to push — go to the Outcome with
`outcome: "stopped"`.

Otherwise run the preflight gate — `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-preflight.js`, branching on
its exit code: 0 → go (`repairs.boardsRecovered` non-empty = state restored from the server, per
its `display`) · 1 (not connected / credentials rejected) → the command's **connect-now offer** ·
2 (binding unverified) → print `error`, stop, name `/status` · 11 branch mismatch →
AskUserQuestion per the branch-mismatch prompt in
`${CLAUDE_PLUGIN_ROOT}/knowledge/provenmap-integration/SKILL.md`. Then tell the user exactly
what would leave the machine — the screenshots of `pages.captured` pages taken from `url`
(environment `environment`), showing whatever data those pages showed to the signed-in user, and
that a published board shows each page's newest screenshot — and ask once, with
**AskUserQuestion**: push them to ProvenMap as each page's visual reference?

On yes:

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-inspect.js --push <sessionId>
```

Print `display` verbatim. A display saying the server does not expose page captures yet is a soft
stop: the session stays local. Exit 1 with a config error, or rejected credentials, triggers the
command's **connect-now offer**. On no: nothing uploads; the same `--push <sessionId>` works
later.

## Outcome

`node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-status.js --brief --command inspect --facts '{"mode":"pages","outcome":"<outcome>"}'`

`outcome` is `refreshed` when the push's `pushedCount` is above zero, `up_to_date` when the push
ran and `pushedCount` is zero (every screenshot matched the last one pushed), and `stopped` when
nothing was pushed — no page captured, the user declined, or a stop above. **Left** names what
the report listed as not captured, by reason and count, and the fix for each: a sample URL under
`inspect.samples` for a dynamic route nothing links to, sign-in for gated pages.

## Scheduled (`--pages --env <name> --scheduled`)

The unattended run a host schedule fires
(`${CLAUDE_PLUGIN_ROOT}/knowledge/provenmap-integration/references/recurring-runs.md`). Nobody answers
a prompt, and every run is recorded on the platform and shown on the board's binding.

An unattended sweep uploads screenshots nobody has looked at, signed in as the inspection browser
last was. So the script holds it to two rules, and neither is worked around: the command names
its environment (`--env <name>`, from `inspect.urls` — never the default, never `--url`), and a
sweep of that environment was already pushed from this checkout by hand, with the user's
confirmation. `/start` puts the command in the scheduled task, with that environment named, only
when both hold. When the scheduled command arrives without `--env`, do not pick one: run it as
given and let the script stop.

1. **Preflight first:** `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-preflight.js --scheduled inspect`. It
   opens the run. The sweep reads no code, so no scratch checkout is made. Any exit other than 0
   stops the run: go to step 4 with its `error`.
2. **Sweep:** `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-inspect.js --pages --env <name> --scheduled`, the
   same call repeated while `sweepStatus` is `"pending"`. A prompt becomes a stop: any exit other
   than 0 ends the run — step 4, with the CLI's `error` verbatim. That covers an environment not
   named or never pushed by hand, an app that does not answer, and a sign-in that has expired on
   every page. Pages behind sign-in are otherwise listed as not captured.
3. **Push without asking** — the schedule is the user's standing confirmation for that
   environment: `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-inspect.js --push <sessionId>`. An exit other
   than 0 → step 4, with its `error`.
4. **Outcome:** `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-status.js --brief --command inspect --facts '{"mode":"scheduled","outcome":"<outcome>","reasonText":"<error>"}'`.
   `outcome` is `refreshed` when `pushedCount` is above zero, `up_to_date` when it is zero, and
   `stopped` on any exit that ended the run early. `reasonText` is the stopping CLI's `error`
   line verbatim, and only for `stopped` (omit the key otherwise). Status checks both against the
   run's allowed values and records the run; the brief's `scheduledRun` says what was recorded.
   Name a stopped run's reason in the Outcome, with the fix: an expired sign-in, or an
   environment never pushed by hand, is cleared by one `/inspect --pages --env <name>` run in a
   session.
