---
category: map
description: "Map · Ground the architect-authored board in this repo's documents — mirror, link evidence, report drift"
argument-hint: [--board <slug>]
allowed-tools: Read, Glob, Grep, Write, Bash(node:*), AskUserQuestion
---

Works from a cold start — no prior producer state, just `/login` or `/configure`. **Print every `display` verbatim** in your reply — never reformat, reorder, or summarise; branch only on exit codes and named fields. A `--board <slug>` argument adds `--board-slug <slug>` to both `pmap-sync.js` calls; else the CLI uses the configured `boardSlug`.

**0 Preflight** — `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-preflight.js`; the gate is the script's, not yours. 0 → go (`repairs.boardsRecovered` non-empty = state just restored from the server, per its `display`); 1 (not connected / credentials rejected) → **connect-now offer**; 2 (binding unverified) → print `error`, stop, name `/status`; 11 branch mismatch → AskUserQuestion per the branch-mismatch prompt in `${CLAUDE_PLUGIN_ROOT}/knowledge/provenmap-integration/SKILL.md`.

**1 Pull & inventory** — `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-sync.js --pull --host claude --domain connect`. Exit 0 → board mirrored to `.provenmap/boards/<boardSlug>.json` (manifest updated), document corpus inventoried; say so in one line, then carry the JSON's `evidence` and `context` into Step 2.

**2 Propose evidence links** — **read `${CLAUDE_PLUGIN_ROOT}/knowledge/grounding/SKILL.md` NOW and follow it exactly; improvise nothing.** It owns the substantiation bar, anchor/excerpt discipline, drift handling, and how `evidence`/`context` become the link set you write to `.provenmap/evidence-links.json`.

**3 Push** — `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-sync.js --push --links .provenmap/evidence-links.json --host claude --domain connect`.

**4 Report** — on exit 0 print the push `display` verbatim: it already states stored/removed/drifted counts, unresolved slugs, re-drifted documents, and the next command. Then add Step 2's unlinked-node findings.

**`pmap-sync.js` exits** — 0 success. 1 config error → **connect-now offer**; **branch mismatch**, **missing board slug**, and (on `--push`) a **missing/unreadable `--links` file** also exit 1 — there relay `error` verbatim and stop; it names its own fix (switch branch, re-bind via `/login`, or the failing links path). 3 (`--push` only) links-file validation error → repair per the grounding skill, retry once, then stop and report `validationErrors[]` verbatim. 4 API error (board fetch or push rejected) — `errorType: "auth_invalid"` → **connect-now offer**; otherwise relay `error` verbatim, stop, name `/sync` as the retry.

## Connect-now offer

Used whenever ProvenMap is not configured or the credentials were rejected (`errorType: "auth_invalid"`). Ask with **AskUserQuestion** — "Connect to ProvenMap now?" (**Connect now** / **Not now**):

- **Connect now** → run the browser login here, printing each JSON `display` verbatim **in your reply** (the Bash output panel is collapsed for the user): `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-login.js --start`, then `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-login.js --poll --host claude --domain connect` (generous Bash timeout, e.g. 250s). On `status: "complete"`, resume this command from the step that failed; anything else — stop, the display explains.
- **Not now** → stop with the canonical message: "ProvenMap not configured — run `/login` (browser) or `/configure` (manual) first" (or, when credentials were rejected: "Your ProvenMap credentials were rejected — run `/login` to reconnect").
