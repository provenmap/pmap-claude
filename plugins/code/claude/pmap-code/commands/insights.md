---
category: understand
description: "Understand · Run server-defined insight analysis on your architecture board"
argument-hint: [<prompt> | --select | --list | --all | <skill-slug>]
allowed-tools: Read, Glob, Grep, Write, Bash(node:*), AskUserQuestion
---

**Print every `display` verbatim; branch only on exit codes and named JSON fields.** Any `pmap-insights.js` exit 1, or exit 3 with `errorType: "auth_invalid"` → **connect-now offer**; other exit 3 → report the JSON `error` verbatim and stop.

**-1 Preflight** — `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-preflight.js`: 0 → go; 1 → **connect-now offer**; 2 (binding unverified) → print `error`, stop, name `/status`; 11 (branch mismatch) → AskUserQuestion per the branch-mismatch prompt in `${CLAUDE_PLUGIN_ROOT}/knowledge/provenmap-integration/SKILL.md`.

**0 Prerequisites** — `boardSlug` from `.provenmap/config.json` is the **primary board**. Then `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-insights.js --list-insight-skills --board-slug <boardSlug> --kind code --domain code`. Exit 2 → stop: "No board data found — run `/analyze` first"; `featureAvailable: false` → stop: "No insight skills available for this account"; empty `skills` → stop: "No insight skills configured — contact your workspace admin". A failed check stops the run. On success `skills[]` is a precis: slug, name, category, description, duration.

**Steps 1–2 — read `${CLAUDE_PLUGIN_ROOT}/knowledge/insights/references/execution-protocol.md` NOW and follow it exactly; improvise nothing.** It is their contract: every remaining CLI call and flag, the pack shape, every branch and hard rule.

- **1 Resolve the skills** from the command argument: a prompt → you match it to the `skills[]` precis, select one or more, and keep the prompt as the **focus prompt**; `--select` or no argument → print the skills table, then the **user** supplies the skill(s) **and** a required focus prompt via AskUserQuestion; `--list` → table, then stop; `--all` / `<skill-slug>` → run every skill / only that one, empty focus prompt.
- **1.5 Fetch** each selected skill in turn (`--get-insight-skill`) — exit 3 skips only that skill.
- **1.6 Build the context pack** (`--build-context`), or its documented fallback when the prepass fails.
- **2 Execute** per skill: pack → primary board → interpolate the skill variables and the user focus → analyse with Read/Glob/Grep → `InsightDraft[]` (each with a trail grounded on pack slugs) → markdown report → validate and save/push (`--require-pack`), fixing any `validationErrors` and retrying.

**3 Summary** — after the last skill, print one row per skill: Skill | Findings | Trail Stops | Critical | High | Status (`pushed`/`saved`).

## Connect-now offer

Used whenever ProvenMap is not configured or the credentials were rejected (`errorType: "auth_invalid"`). Ask with **AskUserQuestion** — "Connect to ProvenMap now?" (**Connect now** / **Not now**):

- **Connect now** → run the browser login here, printing each JSON `display` verbatim **in your reply** (the Bash output panel is collapsed for the user): `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-login.js --start`, then `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-login.js --poll --host claude --domain code` (generous Bash timeout, e.g. 250s). On `status: "complete"`, resume this command from the step that failed; anything else — stop, the display explains.
- **Not now** → stop with the canonical message: "ProvenMap not configured — run `/login` (browser) or `/configure` (manual) first" (or, when credentials were rejected: "Your ProvenMap credentials were rejected — run `/login` to reconnect").
