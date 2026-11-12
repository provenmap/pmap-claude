# Vendor Recipes — MCP tools → normalized signals

Each recipe: how to connect, which tools to call, and how the output maps onto the signals schema
(see `../SKILL.md`). Auth differs by surface — **interactive** (a person at the session, browser
OAuth is fine) vs **unattended** (scheduled runs, token/IAM env credentials only). Never ask the
user to paste a secret into the chat; name the variable and where it goes.

Every recipe's **Map** line also sets `watch` on each signal to the `id` of the watch running it (the
cloud cost recipe's `baseline` is the prior period's spend, which the cost stat shows as the change).
A run from `--input` or with no `watches[]` omits `watch`, and no stat is built.

## Sentry

- **Connect (interactive):** `claude mcp add --transport http sentry https://mcp.sentry.dev/mcp`,
  then authenticate via `/mcp` (browser OAuth).
- **Connect (unattended):** the remote server is OAuth-only — use the stdio variant with a token:
  `claude mcp add sentry -- npx @sentry/mcp-stdio` with `SENTRY_AUTH_TOKEN` set in the run
  environment (scopes: `org:read`, `project:read`, `event:read`). Cloud routines can instead use a
  Sentry connector pre-authorized on the claude.ai account.
- **Pull:** search issues for the configured project(s) within the window, sorted by event count;
  for the top issues fetch the latest event for stack frames. Leave out info-level messages that
  carry no exception (a startup or heartbeat log line is not a failure).
- **Map:** `id` = `sentry:<issue shortId>` · `kind` = `error` · `severity` from issue level
  (fatal→critical, error→high, warning→medium, info→info) · `measurement` = `{ value: eventCount,
  unit: "events", trend }` (compare to prior window if available) · `locators` = in-app stack
  frames as `code-path` (strip build prefixes; keep repo-relative), plus the Sentry
  `culprit`/transaction as `route` or `service` · `evidence.url` = issue permalink,
  `evidence.sample` = exception type + message.

## AWS CloudWatch (logs, metrics, alarms)

- **Connect:** awslabs CloudWatch MCP server (stdio):
  `claude mcp add cloudwatch -- uvx awslabs.cloudwatch-mcp-server@latest` with IAM credentials in
  the environment (`AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` or a role/profile). IAM env auth
  works unattended as-is.
- **Pull:** alarms in `ALARM` state (+ state history for flapping), and Logs Insights error-pattern
  queries over the configured log groups within the window.
- **Map:** alarms → `id` = `cloudwatch:<alarm name>`, `kind` = `availability` (or `performance`
  for latency alarms), `severity` high (critical if the alarm is on an SLO), `measurement` from
  the alarm metric vs threshold (`baseline` = threshold), `locators` = the alarm's dimension
  values as `resource` (function/table/queue name) and the log group as `service`. Log patterns →
  `id` = `cloudwatch:<log-group>:<pattern-hash>` (use the vendor's pattern id when the query
  provides one), `kind` = `log-pattern`, `locators` from the log group (`service`) and any file
  paths in the log lines (`code-path`).

## AWS costs (Cost Explorer / Cost Anomaly Detection)

- **Connect:** the official AWS MCP server (covers Cost Explorer + Cost Anomaly Detection APIs):
  `claude mcp add aws -- npx @aws/mcp-server` with IAM env credentials (read-only cost policies).
- **Pull:** service-level cost deltas vs the prior period, and the cost anomalies within the
  window. A service is a signal when its rise meets **both** the watch's `thresholdPercent`
  (default 20) and its `minimumAmount` (default 10, in the bill's currency): a 100% rise on a
  two-dollar line is not worth an insight. An anomaly on a service that is already a signal is
  evidence for that signal, not a signal of its own; an anomaly on any other service is a
  signal only when its impact meets `minimumAmount`.
- **Map:** `id` = `aws:<anomaly id>` (or `aws:cost:<service>` for threshold deltas) · `kind` =
  `cost` · `severity` by spend delta (≥$500/day critical, ≥$100/day high, ≥$100 over the window
  medium, else low) ·
  `measurement` = `{ value: spendDelta, unit: "USD", baseline: priorSpend, trend }` · `locators`
  = the anomaly's root-cause service/resource names as `resource` (e.g. a Lambda name, an RDS
  instance id) — cost signals often anchor only via the teach-once map or land board-level;
  that is expected, not a failure.

**Without an MCP server**, the `aws` CLI reads the same data with the same IAM credentials
(`ce:GetCostAndUsage`, `ce:GetAnomalies`): `aws ce get-anomalies --date-interval
StartDate=<from>,EndDate=<to>` for the anomalies, and `aws ce get-cost-and-usage --time-period
Start=<from>,End=<to> --granularity DAILY --metrics UnblendedCost --group-by
Type=DIMENSION,Key=SERVICE` once for this window and once for the one before it. Group by
`Type=TAG,Key=<tag>` instead when the watch's `scope` names a cost allocation tag. Cost Explorer
bills each API request, so make these calls once per run, never per service.

## GitHub issues

- **Connect:** the `gh` CLI, signed in with `gh auth login` (interactive) or `GH_TOKEN` in the
  run environment (unattended; read access to issues is enough). A GitHub MCP server or
  connector works the same way where one is connected.
- **Pull:** `gh issue list --repo <owner>/<repo> --state open --json
  number,title,body,labels,url,createdAt,updatedAt,comments --limit 200`, kept to the issues
  updated inside the window. `<owner>/<repo>` is the watch's `scope`; without one, `gh` reads
  the checkout's own remote. Pull requests are not issues and are not read.
- **Map:** `id` = `github:<owner>/<repo>#<number>` · `kind` = `issue` · `severity` from the
  repo's own priority or severity labels when it has them; otherwise `medium` for an issue
  labelled as a bug and `low` for the rest · `measurement` = `{ value: daysOpen, unit: "days" }`
  · `locators` = repo-relative file paths quoted in the body or a pasted stack trace as
  `code-path`, then each area or component label as `service` (the label's value, without its
  `area:`-style prefix) · `evidence.url` = the issue URL, `evidence.sample` = the first lines of
  the body.

## Datadog / Grafana

- **Connect:** official remote MCP servers (OAuth; on claude.ai surfaces add them as connectors so
  scheduled cloud runs inherit the authorization).
- **Pull:** triggered monitors/alerts within the window; top error traces if APM is in use.
- **Map:** `id` = `<vendor>:<monitor id>` · `kind` from monitor type (error/performance/
  availability) · `locators` from monitor tags (`service`, `tag`) and any stack traces
  (`code-path`).

## Exported file (no MCP)

`/monitor --input <file>` accepts either an already-normalized signals file or a raw vendor export
(Sentry issues JSON, CloudWatch alarm list, Cost Explorer CSV converted to JSON). For raw exports,
normalize with the matching recipe above. This is the zero-setup path and the fallback whenever no
MCP is connected.
