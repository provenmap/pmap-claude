---
category: map
description: "Map · Visually inspect the running app — pick components in a real browser, capture screenshots and metadata that feed intents"
argument-hint: "[--url <url> | --env <name>] [--capture <url>] [--list | --show <id>]"
allowed-tools: Read, Glob, Grep, Bash(node:*), AskUserQuestion
---

Open the running app in a real browser, let the user click-select components (with notes) and draw **annotation boxes**, and record an **inspection session** under `.provenmap/inspections/<sessionId>/`.

Print every `display` verbatim; branch only on exit codes and named fields. Capture (steps 1–4) needs no credentials — never require `/configure` or `/login` first; only steps 5–7 talk to the server.

**1 Start** — `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-inspect.js --start [--url <url> | --env <name>]`, passing through any `--url`/`--env` argument. 0 → go to 2 · 1 unresolvable URL → **AskUserQuestion** for the app URL (offering the environments it lists), re-run with `--url <answer>` plus `--save-env <name>` if they want it remembered · 1 "already active" → `--poll` that session, or `--stop` if the user abandons it · 1 "no browser found" → cloud/headless: `--capture <url>` per the reference, else stop.

**2 Poll** — the user is picking; wait: `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-inspect.js --poll --max-wait 240`. `selectStatus: "pending"` → poll again (while the user is still picking) · `"complete"`/`"browser_closed"` with selections → go to 3 · `"cancelled"`, or `browser_closed` with nothing picked → stop · exit 3 → browser connection lost; relay `error`, offer `--start` again.

**Steps 3–7 — read `${CLAUDE_PLUGIN_ROOT}/knowledge/ui-inspection/references/session-workflow.md` NOW and follow it exactly; improvise nothing.** It holds every call, flag, branch, confirm and the other modes (`--capture`/`--list`/`--show`/`--stop`). The map: **3** interpret per the ui-inspection skill · **4** the **user** chooses what it becomes — new intent / attach to a claimed intent / keep locally (stop, name `/intents`) · **4.5** the preflight gate below · **5** propose or attach via `pmap-intents.js` · **6** the **user** confirms the intent push, told first what leaves the machine · **7** the **user** confirms the page-capture push.

**4.5 Preflight** — a script, not prose: run `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-preflight.js`, branch on its exit code. 0 → go (`repairs.boardsRecovered` non-empty = state just restored from the server, per its `display`) · 1 (not connected / credentials rejected) → **connect-now offer** · 2 (binding unverified) → print `error`, stop, name `/status` · 11 branch mismatch → AskUserQuestion per the branch-mismatch prompt in `${CLAUDE_PLUGIN_ROOT}/knowledge/provenmap-integration/SKILL.md`.

**Close:** `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-status.js --after inspect --domain code` — print verbatim.

## Connect-now offer

Used when preflight (exit 1) or a server call reports config missing or `errorType: "auth_invalid"`. Ask with **AskUserQuestion** — "Connect to ProvenMap now?" (**Connect now** / **Not now**):

- **Connect now** → run the browser login here, each JSON `display` printed verbatim: `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-login.js --start`, then `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-login.js --poll --analyze-cmd analyze` (Bash timeout ≥250s). On `status: "complete"`, re-run the step that failed.
- **Not now** → stop with: `ProvenMap not configured — run /login (browser) or /configure (manual) first` (or, for rejected credentials: `Your ProvenMap credentials were rejected — run /login to reconnect`). The session stays local; nothing is lost.
