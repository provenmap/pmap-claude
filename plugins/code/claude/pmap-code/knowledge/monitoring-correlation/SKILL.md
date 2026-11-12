---
name: monitoring-correlation
description: How /monitor turns raw monitoring output (Sentry issues, CloudWatch alarms, cost anomalies) into normalized signals, correlates them with board elements, and shapes work-item-ready insights. Use when running /monitor, normalizing vendor monitoring data, or deciding how an operational signal maps onto architecture nodes/edges. Defines the signals schema, stable-id rules, and the teach-once mapping loop.
user-invokable: false
metadata:
  author: ProvenMap
  version: 0.5.8
---

# Monitoring Correlation — Signals → Board Elements → Intent-Ready Insights

`/monitor` closes the loop between production reality and the architecture board: signals from
monitoring tools become insights anchored to the same nodes and edges `/analyze` + `/sync` put on
the portal, where architects promote them to work items. The division of labour is strict:

- **You (the model)**: pull vendor data via MCP tools, normalize it into the signals schema below,
  and — after the deterministic correlation — turn each prefilled insight stub into an
  work-item-ready insight (see `references/insight-shaping.md`).
- **The CLI (`pmap-insights.js --correlate`)**: everything mechanical — locator→element matching,
  mapping overrides, scope/key assignment from the context pack, skeleton generation. Never
  hand-match signals to elements or generate scope keys; that is the correlator's job.

## The normalized signals file

`.provenmap/monitoring/signals.json`:

```jsonc
{
  "version": 1,
  "window": { "from": "<ISO>", "to": "<ISO>" },
  "signals": [
    {
      "id": "sentry:CHECKOUT-4Q2", // REQUIRED: "<vendor>:<vendor-fingerprint>" — stable across runs
      "vendor": "sentry", // sentry | cloudwatch | aws | datadog | grafana | …
      "watch": "failing-systems", // the config watch `id` that pulled it (optional; its stat groups by this)
      "kind": "error", // error | log-pattern | performance | availability | cost | security | issue | custom
      "title": "TypeError in CheckoutSession.finalize",
      "severity": "high", // critical | high | medium | low | info
      "measurement": {
        // optional, wire-aligned: one primary number per signal
        "value": 412,
        "unit": "events", // unit e.g. "events" | "ms" | "%" | "USD"
        "baseline": 12, // optional reference (prior period, SLA, budget)
        "trend": "increasing", // increasing | decreasing | stable
      },
      "locators": [
        // how to find the element(s); order = priority
        {
          "type": "code-path",
          "path": "src/services/checkout.service.ts",
          "line": 88,
        },
        { "type": "resource", "name": "orders-queue", "arn": "arn:aws:sqs:…" },
        { "type": "service", "name": "payment-api" },
        { "type": "route", "method": "POST", "path": "/api/checkout" },
        { "type": "tag", "key": "team", "value": "payments" },
      ],
      "evidence": { "url": "https://sentry.io/…", "sample": "TypeError: …" },
    },
  ],
}
```

Rules that make the loop work:

- **Stable ids.** `id` must be the vendor's own fingerprint (Sentry issue shortId, CloudWatch alarm
  ARN tail, cost-anomaly id). It becomes the insight's `key`, which is what keeps a row (and a work
  item promoted from it) the same row across runs. Same underlying problem ⇒ same id, every run.
- **Every signal names its watch.** Set `watch` to the `id` of the config watch that pulled it. A
  watch is one question and may read more than one source; it produces exactly one stat (below).
- **One primary measurement.** Pick the number that best quantifies the signal (event count, p95
  latency, spend delta). Everything else goes in the insight's prose, not the wire.
- **Locators in priority order.** The first locator to match becomes the insight's primary
  element; later matches become `relatedElements`. Lead with the most specific locator you have
  (a stack frame beats a service name).
- **Windowing is stateless.** Use the configured window (default 7 days, or `windowDays` from
  `.provenmap/monitoring/config.json`). Overlapping windows are safe: each push asks the server
  for this skill's earlier batches under the board and names them in `replacesBatchIds`, so a
  re-reported signal replaces its unreviewed predecessor instead of piling up (one an architect moved
  past draft stays; a work item promoted from a replaced draft stays too, without its insight). Do not depend on local state files — scheduled cloud runs start from a
  fresh clone.

## How matching works (so you can predict it)

Deterministic, in priority order per locator — see the correlate output's `confidence` field:

1. **Mapping override** (`.provenmap/monitoring/map.json`) — a user-confirmed locator→slug pin
   (or `null` = always ignore). Beats everything; reported as `mapped`.
2. **code-path** — a file a node claims (`exact`); else the deepest folder exactly one node
   holds, or ≥2 trailing-segment overlap (`strong`). A folder several nodes share matches none
   of them: it becomes a **proposal** keyed on the folder, so one confirmed mapping answers for
   every file in it. Filename-only overlap never matches (too noisy).
3. **resource / service** — separator-insensitive name equality against slug/name/tags
   (`orders-queue` ≡ `orders_queue`), including the ARN tail. Partial token overlap only produces
   a **proposal**.
4. **route** — a route segment that exactly equals an element's slug/name token.
5. **tag** — element tag equals `value` or `key:value`.

A boundary port is never matched: a signal lands on a node, not on a hand-off.

Unmatched signals are never dropped: they become board-level insights tagged `unmatched`.
Proposals are the **teach-once loop**: confirm once with the user, write the mapping, and every
future run resolves that locator deterministically.

## Keys and the stats insight

- **`key`.** Every finding in the skeleton carries `key` = its signal `id` (whitespace made `-`).
  A push updates a keyed insight in place instead of deleting and re-filing it, so a finding keeps
  its row across runs, and a draft promoted to a work item keeps its insight. A keyed finding absent
  from the new push is still deleted: the problem is gone.
- **The stats insight.** A watch whose config carries a `stat` definition gets one extra insight,
  `key` `watch:<id>`, tagged `stats`: one reading per node its signals matched (unmatched signals sit
  on the bound board). The correlator builds all of it, prose included. Never reshape it, and carry
  `key` and `stats` through every insight unchanged.

## Files

| File                                       | Owner            | Purpose                               |
| ------------------------------------------ | ---------------- | ------------------------------------- |
| `.provenmap/monitoring/config.json`        | `/monitor setup` | watches, window, skill slug           |
| `.provenmap/monitoring/signals.json`       | you, each run    | normalized signals                    |
| `.provenmap/monitoring/map.json`           | user-confirmed   | teach-once locator→slug pins          |
| `.provenmap/monitoring/skeleton.json`      | correlator → you | prefilled payload you finish and push |
| `.provenmap/discover/packs/<board>.context.json` | correlator       | context pack (quality-gate oracle)    |

## References

- `references/run-workflow.md` — `/monitor`'s steps 2–6 (acquire → correlate → shape → push → report): every call, flag, exit branch and prompt. The command delegates to it; follow it exactly.
- `references/use-cases.md` — the watches `/monitor setup` offers (failing systems, cloud cost, issues on nodes), the config shape and each watch's `stat`, why a run pulls every watch, and how a custom watch is drafted, dry-run and saved.
- `references/vendor-recipes.md` — per-vendor MCP tools (or the `gh` / `aws` CLI) → signals mapping, connect one-liners, auth per surface. **Adding a vendor = adding a recipe here; no code changes.**
- `references/insight-shaping.md` — work-item-ready authoring rules, priority/effort heuristics, when to add paths or graph suggestions.
- `references/scheduling.md` — the `/monitor setup` sequence; the recurring-run surfaces (local desktop routine or scheduled task, cloud routine, session loop) and the unattended-credentials pattern live in `${CLAUDE_PLUGIN_ROOT}/knowledge/provenmap-integration/references/recurring-runs.md`.
