# Scheduling — `/monitor setup` and recurring runs per host surface

## Setup (`/monitor setup`)

1. Ask (AskUserQuestion, one question set): which signal source(s) — Sentry / AWS CloudWatch /
   AWS costs / Datadog or Grafana / exported file — and the cadence (daily is the default).
2. Write `.provenmap/monitoring/config.json`:
   ```json
   {
     "version": 1,
     "insightSkillSlug": "operational-signals",
     "windowDays": 7,
     "sources": [{ "vendor": "sentry" }]
   }
   ```
3. For each chosen source, print the MCP connect one-liner and auth note from
   `vendor-recipes.md`. Never ask the user to paste a token into the chat — name the env var and
   where to set it.
4. Scheduling — take the best surface below that this session actually has: if it can create
   schedules (a `/schedule`-style skill for cloud routines, or the desktop app's scheduled tasks),
   offer to create a recurring "run `/monitor`" at the chosen cadence now — **the user confirms**.
   Otherwise print that surface's copy-paste setup block. For cloud/unattended runs, note that
   credentials go in the run environment as `PMAP_BINDING_TOKEN` / `PMAP_API_SECRET`, and
   correlation uses `--from-server` (§2).
5. Finish by naming the next command: "Run `/monitor` now for a first pass."

## Recurring-run surfaces

Pick the surface by what the user has, most capable first. Creating the schedule is the user's
call — offer, don't assume; and never place secret **values** in the chat or in any schedule
definition you author (name the env vars instead).

## 1. Desktop scheduled task (Claude Code / Cowork desktop app) — preferred

Full plugin fidelity: bundled scripts, local MCP servers, minute-level cadence, per-task
permission mode. Requires the machine on with the app open.

- If the session can create desktop tasks, offer: create a task that runs `/monitor` at the
  chosen cadence (e.g. daily 9am) with permission mode "Allow" for `Bash(node:*)` and the
  monitoring MCP tools. The user confirms in-app.
- Unattended vendor auth: use the stdio/token MCP variants (`SENTRY_AUTH_TOKEN`, IAM env vars)
  from `vendor-recipes.md` — browser OAuth prompts would stall a background run.

## 2. Cloud routine (unattended, no machine needed)

Runs on managed infrastructure from a fresh clone of the repo's default branch — which is why
`/monitor`'s correlation falls back to `--from-server` and nothing depends on local
`.provenmap` state. Cadence is cron with a 1-hour minimum; routines can also be fired by API
(`POST /fire`), so a monitoring alert webhook can trigger an immediate run with the alert JSON
passed as run context.

- If a `/schedule`-style skill is available in the session, offer to create the routine now with
  this prompt (fill the cadence in):

  > Run /monitor for this repository. Credentials come from the environment
  > (PMAP_BINDING_TOKEN, PMAP_API_SECRET). Use --from-server board context. Pull
  > signals from the connected monitoring connectors, correlate, shape the insights per the
  > monitoring-correlation skill, and push with --require-pack. Non-interactive: skip mapping
  > prompts and leave proposals in the report.

- The user must set, in the routine's environment settings (not the chat):
  `PMAP_BINDING_TOKEN`, `PMAP_API_SECRET`, plus any vendor token the recipe names.
- Monitoring MCP access in routines comes from **claude.ai account connectors** (pre-authorized)
  or a committed `.mcp.json` in the repo — locally-added MCP servers do not follow the routine.
- **Caveat:** plugin availability inside cloud routine runs is not guaranteed on every host
  version. After creating the routine, run it once and check it completed a push; if the plugin's
  scripts weren't available, fall back to the desktop task path and report that to the user.

## 3. Session loop (interactive polling)

`/loop 1h /monitor` style — only while the session stays open. Fine for a war-room afternoon;
not a scheduling solution. Suggest it only when the user explicitly wants in-session repetition.

## Event-driven variant

Where routines support API triggers: point the vendor's alert webhook (e.g. a Sentry alert rule)
at the routine's fire endpoint with the alert payload as the run's context text. The run then
correlates just that alert — no polling, sub-cadence latency. Include the vendor-side webhook URL
instructions when the user picks this.
