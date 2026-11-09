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
4. Scheduling — do not describe a surface here. The config file you just wrote puts
   `/monitor --scheduled` into the task `/start` prints for this repo when nothing runs on a
   schedule (one task per repo, every command it needs, the sentence to paste); a repo that
   already has a task adds `Then run /pmap-code:monitor --scheduled.` to its instructions.
   For a cloud routine, `${CLAUDE_PLUGIN_ROOT}/knowledge/provenmap-integration/references/recurring-runs.md`
   §2 has the prompt and the environment it needs.
5. Finish by naming the next command: "Run `/monitor` now for a first pass."
