---
category: advanced
description: Customize the archetype vocabulary — scan for gaps in the catalogue and propose the missing archetypes
argument-hint: [--dry-run | --skip-submit | --force | --replace]
allowed-tools: Read, Glob, Grep, Write, Bash(node:*, git:*), AskUserQuestion
---

Customize the **vocabulary** your architecture is described in: scan the codebase for component categories, compare them with the server's archetype catalogue, and propose what is missing for human approval. **Optional** — `/analyze` never requires it; the `archetype-analysis` skill says when to run it and what makes a good proposal.

**Flags** — `--dry-run`: validate locally + server dry-run, never persist or POST (no lock) · `--skip-submit`: write `.provenmap/proposed-archetypes.json`, no POST (the lock records a scan, not a submission) · `--replace`: submit `mode='replace'` — duplicate-name pending rows overwritten, not rejected · `--force`: bypass the CLI's local hash guard when submitting.

**-1 Preflight** — run `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-preflight.js` and react to its exit code; never decide yourself that the project is fine. Print `display` **verbatim**. 0 → go · 1 (not connected / credentials rejected) → **connect-now offer** below · 2 (binding unverified) → print `error` verbatim, stop, name `/status` · 11 (branch mismatch) → AskUserQuestion per the branch-mismatch prompt in `${CLAUDE_PLUGIN_ROOT}/knowledge/provenmap-integration/SKILL.md`.

**0 Branch guard** — `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-precondition.js --branch-only`: the binding pins one branch and the server rejects any other. Exit 1 → print the JSON `error` verbatim (it names both branches and the fix) and stop · 0 → continue.

**Steps 1–5 — read `${CLAUDE_PLUGIN_ROOT}/knowledge/archetype-analysis/references/scan-workflow.md` NOW and follow it exactly; improvise nothing.** Their contract: every CLI call and flag, branch, printed line, and lock field.

- **1 Catalogue** — *script* `pmap-archetypes.js --no-cache --kind code --full`; take `catalogueHash` from its JSON verbatim, never recompute it.
- **2 Scan** — the *`architecture-analyzer` agent* in `--archetypes-only` mode, on the `archetype-analysis` heuristics; print each proposal's evidence before prompting.
- **3 Decide** — no gaps → lock, stop. `--dry-run` (never writes the lock) and `--skip-submit` follow the flag; else the **user** picks via AskUserQuestion: Submit for review · Edit first · Skip and proceed.
- **4 Submit** — *script* `pmap-propose-archetypes.js`, branching on `success`, `serverResult.rejected[]`, `notAvailable`, `errorCode: 3`.
- **5 Persist lock** — *you* write `.provenmap/archetype-analysis.lock.json`, read by `pmap-precondition.js` (via `/analyze` Step -1) and `/status`. Default `gate_off`: never read. Under the opt-in `analysis.archetypeGate: "strict"` its state decides whether `/analyze` re-prompts (exit 10), warns, or proceeds.

**Connect-now offer** (preflight exit 1: not configured, or `errorType: "auth_invalid"`) — **AskUserQuestion** "Connect to ProvenMap now?":

- **Connect now** → run the login here, printing each JSON `display` verbatim **in your reply**: `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-login.js --start`, then `--poll --analyze-cmd analyze` (Bash timeout ≥250s). Resume from the failing step on `status: "complete"`; else stop — the display explains.
- **Not now** → stop: "ProvenMap not configured — run `/login` (browser) or `/configure` (manual) first", or when credentials were rejected "Your ProvenMap credentials were rejected — run `/login` to reconnect".
