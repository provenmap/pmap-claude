---
category: operate
description: "Operate · Correlate monitoring signals (errors, logs, cloud costs) with your architecture board and push findings as insights"
argument-hint: "[setup | --input <signals-file> | <focus prompt>]"
allowed-tools: Read, Glob, Grep, Edit, Write, Bash(node:*), AskUserQuestion
---

Correlate recent operational signals (Sentry, CloudWatch, cost APIs, …) with your architecture board and push the findings as a draft insight — an architect promotes the actionable ones to **intents**.

Print every `display` verbatim; branch only on exit codes and named fields. An `--input <file>` argument or a focus prompt ("checkout errors only") feeds step 2.

**With the argument `setup`, do only this and stop:** follow `${CLAUDE_PLUGIN_ROOT}/knowledge/monitoring-correlation/references/scheduling.md` exactly — the **user** picks sources and cadence and confirms any recurring run; you write `.provenmap/monitoring/config.json`, print each source's connect one-liner, then close (below) adding `--facts '{"mode":"setup"}'`.

**0 Preflight** — **script-enforced**; never decide yourself that the project is fine: run `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-preflight.js`, branch on its exit code. 0 → go (non-empty `repairs.boardsRecovered` = state just restored from the server) · 1 (not connected / credentials rejected) → **connect-now offer** · 2 (binding unverified) → print `error`, stop, name `/status` · 11 branch mismatch → AskUserQuestion per the branch-mismatch prompt in `${CLAUDE_PLUGIN_ROOT}/knowledge/provenmap-integration/SKILL.md`.

**1 Prerequisites** — `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-insights.js --list-insight-skills`. Exit 1, or 3 with `errorType: "auth_invalid"` → **connect-now offer** · 3 otherwise → relay `error` verbatim and stop. Read `.provenmap/monitoring/config.json` (from `/monitor setup`) for sources, window and `insightSkillSlug`; defaults: auto-detected sources, 7-day window, `operational-signals`. If that slug is **not** in the returned `skills[]` → stop: `This ProvenMap server doesn't expose operational-signals monitoring yet — ask your admin to upgrade`.

**Steps 2–6 — read `${CLAUDE_PLUGIN_ROOT}/knowledge/monitoring-correlation/references/run-workflow.md` NOW and follow it exactly; improvise nothing.** It holds every call, flag, branch and prompt; the schema is in the skill beside it. The map: **2 acquire** (you; `--input` or a vendor MCP — neither → stop) · **3 correlate** (`--correlate` matches; one `--from-server` retry, else `/analyze` + `/sync`; the **user** confirms `proposals[]` into `map.json`) · **4 shape** (your judgment, per the insight-shaping rules — output is `InsightDraft[]` with trail stops grounded on pack slugs) · **5 push** (`--save-insight`; `validationErrors[]` gates, `--propose-intents` only when unattended) · **6 report** (summary table + the promote line).

**Outcome:** `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-status.js --brief --domain code --command monitor` → Done · Left · Next, per `${CLAUDE_PLUGIN_ROOT}/knowledge/outcome/SKILL.md`.

## Connect-now offer

Trigger: not configured, or `errorType: "auth_invalid"`. AskUserQuestion "Connect to ProvenMap now?":

- **Connect now** → browser login: each `display` **in your reply**: `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-login.js --start`, then `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-login.js --poll --host claude --analyze-cmd analyze` (timeout ~250s). `complete` → resume the failed step; else stop (display explains).
- **Not now** → stop: "ProvenMap not configured — run `/login` (browser) or `/configure` (manual) first" (rejected: "Your ProvenMap credentials were rejected — run `/login` to reconnect").
