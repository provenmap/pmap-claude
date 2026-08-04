---
category: map
description: "Map · Ground the architect-authored board in this repo's documents — mirror, link evidence, report drift"
argument-hint: [--board <slug>]
allowed-tools: Read, Glob, Grep, Write, Bash(node:*), AskUserQuestion
---

Ground the architect-authored board in this repo's documents: mirror the board and inventory the corpus, propose which documents substantiate which nodes, push the evidence set, then report drift. Works from a cold start — the first run needs nothing beyond `/login` or `/configure`; there is no prior producer state to depend on.

## Workflow

### Step 0: Preflight — binding, branch, local state

This command touches board state, so it runs behind the preflight gate. The gate is **enforced by a
script, not by prose** — run it and react to its exit code; never decide on your own that the
project is fine.

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-preflight.js
```

Print the JSON's `display` field **verbatim** — do not reformat, reorder, or summarise it.

| exit | meaning | action |
| ---- | ------- | ------ |
| 0 | Proceed | Continue to the next step. If `repairs.boardsRecovered` is non-empty, local state was just restored from the server — say so once (the `display` already carries the sentence) and continue. |
| 1 | Not connected, or credentials rejected | Make the **connect-now offer**: AskUserQuestion "Connect to ProvenMap now?" → **Connect now** runs `pmap-login.js --start` then `--poll` inline (print each `display` verbatim) and resumes this command on `status: "complete"`; **Not now** stops with the `error` sentence verbatim. |
| 2 | Binding could not be verified | Print `error` verbatim and stop. Name `/status` for the full local picture. |
| 11 | Branch mismatch | Print `display` verbatim, then ask via AskUserQuestion. Header: `Branch`. Question: `"This project is bound to a different branch. How do you want to proceed?"` Options: **Re-bind to this branch (`/login`)** — run the `/login` workflow inline, then re-run this step; **Stop — I'll switch branches myself** — stop, having already printed the `git switch` line. Never run `git switch` yourself: the working tree may be dirty. |

### Step 1 — Pull & inventory

Pass `--board-slug <slug>` when `$ARGUMENTS` is `--board <slug>`; otherwise omit it and the CLI uses the configured `boardSlug`.

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-sync.js --pull --host claude --domain connect [--board-slug <slug>]
```

- **Exit 0** — the board is mirrored to `.provenmap/boards/<boardSlug>.json` (manifest updated) and the document corpus inventoried. Tell the user briefly what happened (e.g. "Mirrored 42 nodes / 61 edges from the board; inventoried 128 documents (1 skipped)."), then continue to Step 2 using the JSON's `evidence` (`linkCount`, `drifted[]`, `missing[]`, `unlinkedNodes[]`) and `context` (`nodes[]`, `files[]`, `links[]`, `capped`) fields. If `context.capped` is `true`, `context.files` only lists the first 500 of `corpus.files` — the count still reflects the true total.
- **Exit 1** — read the `error` field to tell which:
  - Not configured → make the **connect-now offer** (see Error Handling).
  - Anything else (branch mismatch, missing board slug) → relay the `error` field verbatim and stop; it names its own fix (switch branch / re-bind via `/login`, or pass `--board <slug>` / set `boardSlug` in config).
- **Exit 4** — failed to fetch the board. `errorType: "auth_invalid"` → make the **connect-now offer**; otherwise relay the `error` field, stop, and name `/sync` as the retry.

### Step 2 — Propose evidence links (judgment)

Load the **grounding** skill (`knowledge/grounding/SKILL.md`) for the substantiation bar, anchor/excerpt discipline, and drift-handling rules — this step is judgment, not mechanics.

Using Step 1's `context`/`evidence`, build the updated link set:

1. **Keep fresh links as-is** — every link in `context.links` that is not also in `evidence.drifted` or `evidence.missing` is unchanged; carry its `nodeSlug`/`path`/`anchor`/`excerpt`/`docUrl` forward as-is, no need to re-read the document.
2. **Re-link drifted links** — for each entry in `evidence.drifted`, read the document at its `path` (its content changed since the citation was recorded). Still substantiates the node? Refresh `anchor`/`excerpt` to the current text. The claim moved or is gone? Drop the link.
3. **Propose links for `unlinkedNodes`** — for each node slug with zero evidence, search `context.nodes`/`context.files` for a document that genuinely substantiates its claim — read it, never link on filename alone. No candidate substantiates it? Leave it unlinked; report that in Step 4 as a finding, not a failure.
4. **Drop missing links** — omit anything in `evidence.missing` entirely; its document no longer exists in the corpus.

You supply `nodeSlug`/`path`/`anchor`/`excerpt`/`docUrl` only — the CLI fills in `contentHash` itself from a fresh read of the document at push time, so never compute or guess one.

Write `.provenmap/evidence-links.json`:

```json
{ "links": [ { "nodeSlug": "billing-api", "path": "docs/billing.md", "anchor": "rate-limits", "excerpt": "…", "docUrl": null } ] }
```

### Step 3 — Push

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-sync.js --push --links .provenmap/evidence-links.json --host claude --domain connect [--board-slug <slug>]
```

- **Exit 0** — continue to Step 4.
- **Exit 1** — same causes as Step 1 (config / branch / board slug), plus two push-specific ones: the `--links` flag or file is missing/unreadable. Handle the config/branch/board-slug causes identically to Step 1; for a missing/unreadable links file, relay the `error` field verbatim and stop — it names the path that failed.
- **Exit 3** — the links file failed schema validation, or an evidence path didn't resolve in the document corpus; `validationErrors[]` names the exact field/path. Fix `.provenmap/evidence-links.json` accordingly and retry once. Still failing? Stop and report the errors verbatim.
- **Exit 4** — the server rejected the push. `errorType: "auth_invalid"` → make the **connect-now offer**; otherwise relay the `error` field, stop, and name `/sync` as the retry.

### Step 4 — Report

Print the CLI's `display` field verbatim — do not reformat, reorder, or summarise. It already states stored/removed/drifted counts, any unresolved node slugs or re-drifted documents, and the next command (`/insights` when clean, or `/sync` + `/insights` when something needs another look). If Step 2 left any nodes unlinked, name them and say why — the push report doesn't carry that, since it never sees which nodes you chose not to link.

## Error Handling

CLI exit codes:

- `0`: Success
- `1`: Configuration error, branch mismatch, or missing board slug — see Step 1/3
- `3`: (`--push` only) Links file validation error or an evidence path unresolved in the corpus — see Step 3
- `4`: API error — see Step 1/3

### Connect-now offer

Used whenever ProvenMap is not configured or the credentials were rejected (`errorType: "auth_invalid"`). Ask with **AskUserQuestion** — "Connect to ProvenMap now?" (**Connect now** / **Not now**):

- **Connect now** → run the browser login here, printing each JSON `display` verbatim **in your reply** (the Bash output panel is collapsed for the user): `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-login.js --start`, then `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-login.js --poll --host claude --domain connect` (generous Bash timeout, e.g. 250s). On `status: "complete"`, resume this command from the step that failed; anything else — stop, the display explains.
- **Not now** → stop with the canonical message: "ProvenMap not configured — run `/login` (browser) or `/configure` (manual) first" (or, when credentials were rejected: "Your ProvenMap credentials were rejected — run `/login` to reconnect").
