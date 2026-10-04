---
category: map
description: "Map · Ground the board in this repo's documents — mirror the authored board (or read the analysed one), link evidence, report drift"
argument-hint: [--board <slug> | --scheduled]
allowed-tools: Read, Glob, Grep, Write, Bash(node:*), AskUserQuestion
---

Works from a cold start. Print every `display` verbatim; branch only on exit codes and named fields. `--board <slug>` adds `--board-slug <slug>` to both `pmap-ground.js` calls; else the CLI uses the configured `boardSlug`.

**`--scheduled`** (unattended, no prompts): first `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-status.js --scheduled-run begin --command ground`; any stop goes to the Outcome (*Scheduled* in `${CLAUDE_PLUGIN_ROOT}/knowledge/grounding/SKILL.md`).

**0 Preflight** — `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-preflight.js`; the gate is the script's, not yours. 0 → go (`repairs.boardsRecovered` non-empty = state just restored from the server, per its `display`); 1 (not connected / credentials rejected) → **connect-now offer**; 2 (binding unverified) → print `error`, stop, name `/status`; 11 branch mismatch → AskUserQuestion per the branch-mismatch prompt in `${CLAUDE_PLUGIN_ROOT}/knowledge/provenmap-integration/SKILL.md`.

**1 Pull & inventory** — `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-ground.js --pull --host claude`. Exit 0 → print `display` (board mirrored or read, corpus inventoried, links carried over after a re-bind). **Quiet run:** `evidence.drifted`, `evidence.missing` and `evidence.unlinkedNodes` all empty → say so in one line, skip Steps 2–4, go to the Outcome. Else carry the JSON's `evidence` and `context` into Step 2.

**2 Propose evidence links** — **read `${CLAUDE_PLUGIN_ROOT}/knowledge/grounding/SKILL.md` NOW and follow it exactly; improvise nothing.** It owns the substantiation bar, anchor/excerpt discipline, drift handling, and how `evidence`/`context` become the link set you write to `.provenmap/evidence-links.json`.

**3 Push** — `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-ground.js --push --links .provenmap/evidence-links.json --host claude`.

**4 Report** — on exit 0 print the push `display` verbatim, then add Step 2's unlinked-node findings.

**`pmap-ground.js` exits** — 0 success. 1 config error → **connect-now offer**; a **branch mismatch**, a **missing board slug**, an **unpushed analysis** (`/sync` first) and (on `--push`) a **missing/unreadable `--links` file** also exit 1 — there relay `error` verbatim and stop; it names its own fix. 3 (`--push` only) links-file validation error → repair per the grounding skill, retry once, then stop and report `validationErrors[]` verbatim. 4 API error (board fetch or push rejected) — `errorType: "auth_invalid"` → **connect-now offer**; otherwise relay `error` verbatim, stop, name `/ground` as the retry.

**Outcome:** `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-status.js --brief --command ground` (`--scheduled`: `--facts '{"mode":"scheduled","outcome":"<outcome>","reasonText":"<error>"}'`) → Done · Left · Next, per `${CLAUDE_PLUGIN_ROOT}/knowledge/outcome/SKILL.md`.

## Connect-now offer

Trigger: not configured, or `errorType: "auth_invalid"`. AskUserQuestion "Connect to ProvenMap now?":

- **Connect now** → browser login: each `display` **in your reply**: `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-login.js --start`, then `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-login.js --poll --host claude --domain code` (timeout ~250s). `complete` → resume the failed step; else stop (display explains).
- **Not now** → stop: "ProvenMap not configured — run `/login` (browser) or `/configure` (manual) first" (rejected: "Your ProvenMap credentials were rejected — run `/login` to reconnect").
