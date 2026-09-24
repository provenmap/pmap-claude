# Scheduling — `/monitor setup`

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
4. Scheduling — take the best surface this session actually has, per
   `${CLAUDE_PLUGIN_ROOT}/knowledge/provenmap-integration/references/recurring-runs.md`: if it can create
   schedules (a `/schedule`-style skill for cloud routines, or the desktop app's scheduled tasks),
   offer to create a recurring "run `/monitor`" at the chosen cadence now — **the user confirms**.
   Otherwise print that surface's copy-paste setup block. For cloud/unattended runs, note that
   credentials go in the run environment as `PMAP_BINDING_TOKEN` / `PMAP_API_SECRET`, and
   correlation uses `--from-server` (§2).
5. Finish by naming the next command: "Run `/monitor` now for a first pass."
