# Recurring runs — per host surface

Any command can be run on a schedule; the surface decides what state the run has. Pick the
surface by what the user has, most capable first. Creating the schedule is the **user's** call —
offer, don't assume — and never place secret **values** in the chat or in any schedule definition
you author (name the env vars instead).

Three commands are worth scheduling today, each with `--scheduled` so the run is recorded: `/analyze --scheduled` (keep the boards following
the code — refresh the boards whose claimed files changed, then sync them; a run where nothing
changed reads no code and pushes nothing), `/monitor --scheduled` (correlate the latest signals with the
board) and `/ground --scheduled` (re-check the evidence links against the documents — a run whose pull reports
nothing drifted, missing or unlinked closes on the Outcome without proposing anything, so a daily
cadence is cheap).

## 1. Local schedule in a desktop app — preferred

Claude Code's desktop app calls it a local routine (**Code → Routines → New routine → Local**);
Codex's is a scheduled task in the ChatGPT desktop app (**Scheduled** in the sidebar). Typing
`--scheduled` in a session makes one run now — it creates no schedule.

Full plugin fidelity: bundled scripts, local MCP servers, minute-level cadence, per-task
permission mode, and the repo's real `.provenmap/` state. Requires the machine on with the app open.

- If the session can create desktop tasks, offer: create a task that runs the command at the
  chosen cadence (e.g. daily 9am) with permission mode "Allow" for `Bash(node:*)` (and, for
  `/monitor`, the monitoring MCP tools). The user confirms in-app.
- `/analyze --scheduled` runs in the repo where `/analyze` ran — its `.provenmap/`
  holds the plan and each board's commit anchor, and there is one `.provenmap/` per board. The
  schedule's worktree option stays off: a worktree is a separate checkout without the gitignored
  `.provenmap/`, so the run stops there. Before it reads any code it checks, in order: ProvenMap is connected; the
  checkout is on the bound branch; no tracked file has uncommitted changes; the fast-forward
  (`git pull --ff-only`, never prompting) succeeds, so the branch needs an upstream it can reach
  without a credential prompt and no local unpushed commits; and a local analysis exists. The first
  check that fails stops the run by name. The task prompt: "Run
  /pmap-code:analyze --scheduled." The run does its own pull, so the prompt needs no
  git step. Every scheduled run of `/analyze`, `/monitor` and `/ground` — one that refreshed,
  one that found nothing, one that stopped — is recorded on the platform and shown on the board's
  binding; `/status` lists the recent runs and names why the last one stopped. The `/monitor` and
  `/ground` task prompts pass `--scheduled` the same way ("Run /pmap-code:monitor --scheduled.").
  Permission mode "Allow" for `Skill(pmap-code:analyze)`, `Bash(node:*)` and
  `Bash(git:*)`; where the host instead asks during the first run, approve each one as
  **always** — an approval kept for one run only stalls every later run on the same prompt.
  Each run refreshes at most `analysis.plan.maxScheduledRefreshes` boards (15); the next run
  continues with the rest, longest-waiting first. Daily or after-hours is the usual cadence.
- Unattended vendor auth (`/monitor`): use the stdio/token MCP variants (`SENTRY_AUTH_TOKEN`, IAM
  env vars) from the monitoring skill's `vendor-recipes.md` — browser OAuth prompts would stall a
  background run.

## 2. Cloud routine (unattended, no machine needed)

Runs on managed infrastructure from a fresh clone of the repo's default branch — so nothing may
depend on local `.provenmap/` state: `/monitor`'s correlation falls back to `--from-server`, and
`/ground` mirrors the board from the server on every run. Cadence is cron with a 1-hour minimum;
routines can also be fired by API (`POST /fire`), so a webhook can trigger an immediate run with
its payload passed as run context.

- If a `/schedule`-style skill is available in the session, offer to create the routine now. The
  `/monitor` prompt (fill the cadence in):

  > Run /monitor --scheduled for this repository. Credentials come from the environment
  > (PMAP_BINDING_TOKEN, PMAP_API_SECRET). Use --from-server board context. Pull
  > signals from the connected monitoring connectors, correlate, shape the insights per the
  > monitoring-correlation skill, and push with --require-pack. Non-interactive: skip mapping
  > prompts and leave proposals in the report.

  The `/ground` prompt: "Run /ground --scheduled for this repository. Credentials come from the environment
  (PMAP_BINDING_TOKEN, PMAP_API_SECRET). Non-interactive: re-link drifted citations, leave
  unlinked nodes in the report."
- **Not `/analyze --scheduled` yet.** A fresh clone holds no local analysis — boards
  restored from the server carry no file provenance — so the run stops at once ("No analysed board
  in this checkout"). Offer the desktop task instead.
- The user must set, in the routine's environment settings (not the chat):
  `PMAP_BINDING_TOKEN`, `PMAP_API_SECRET` (plus `PMAP_BOARD_SLUG` / `PMAP_BRANCH` when the clone
  carries no `.provenmap/config.json`), and any vendor token a recipe names. Environment values
  take precedence over the files.
- MCP access in routines comes from **claude.ai account connectors** (pre-authorized) or a
  committed `.mcp.json` in the repo — locally-added MCP servers do not follow the routine.
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
