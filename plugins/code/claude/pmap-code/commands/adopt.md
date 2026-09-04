---
category: map
description: "Map · Extract and adopt a code aspect (database schema, API surface, frontend pages, event catalog, or authz registry) onto the bound board"
argument-hint: "[--aspect <kind> | --db | --api] [--mode replace|merge] [--dry-run] [--no-verify]"
allowed-tools: Read, Glob, Grep, Write, Bash(node:*, git:*), AskUserQuestion
---

Extract one **aspect** of this repo (tables, endpoints, routes and pages, events, policies — plus its links to the nodes that own and use it) onto the board its spine is bound to. **Print every `display` verbatim**; branch only on exit codes and named JSON fields.

**Five kinds**, where `<x>` names both the kind's skill `${CLAUDE_PLUGIN_ROOT}/knowledge/<x>-aspect-extraction/SKILL.md` and its payload `.provenmap/aspects/tmp/<x>-payload.json`: `database.schema`=db · `api.surface`=api · `ui.pages`=pages · `event.catalog`=event · `authz.registry`=authz. `--db`/`--api` = the first two.

**0 Preflight** — run `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-preflight.js` and react to its exit code. 0 → go (`repairs.boardsRecovered` non-empty = local state just restored from the server, per its `display`) · 1 (not connected / credentials rejected) → **connect-now offer**: AskUserQuestion "Connect to ProvenMap now?" → **Connect now** runs `pmap-login.js --start` then `--poll` inline and resumes here on `status: "complete"`; **Not now** stops with the `error` sentence verbatim · 2 (binding unverified) → print `error`, stop, name `/status` · 11 branch mismatch → AskUserQuestion per the branch-mismatch prompt in `${CLAUDE_PLUGIN_ROOT}/knowledge/provenmap-integration/SKILL.md`.

**1 Spine first** — aspects resolve owner and usage links **by node slug**, so the board's spine (nodes + edges) must already be synced. Confirm `.provenmap/boards/<board-slug>.json` exists and has nodes; if not, **stop** and tell the user to run `/analyze` then `/sync` — never fabricate slugs. `pmap-adopt.js` enforces this too ("no synced spine") and exits 1 on a **branch mismatch** (the binding is branch-pinned) — relay its `error`, which names the pinned branch and the fix.

## Workflow

1. **Resolve the kind** — the `--aspect` value, `--db`/`--api` mapped to theirs, or, with no kind flag, `AskUserQuestion` which of the five to adopt.
2. **Read that kind's skill and follow it** — extract from the declared source and write the payload at that kind's path above, in the skill's wire schema. Definitions only: **never run the app, connect to a live database or broker, call a live endpoint, or evaluate a policy against real inputs.**
3. **Adopt it** — `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-adopt.js --aspect <kind> --payload <payload-file> --mode <mode>`, adding `--dry-run` (validate + slug cross-check, no push) or `--no-verify` (skip the read-back) as asked. **Before running it, read `${CLAUDE_PLUGIN_ROOT}/knowledge/claude-code-plugin-sync/references/aspect-adoption.md` NOW and follow it exactly; improvise nothing** — it holds each mode and flag (`replace` is the default) and how to report every result field.
4. **Report** what came back per that reference: `inserted` / `updated` / `deleted` / `skippedManual`, then `unlinked` / `unresolvedRefs` with the `unknownSlugs` they name, then `verify` — never silently. Exits: 0 ok · 1 config error → **connect-now offer**, but a **branch mismatch** also exits 1 — there just relay `error`, config is fine · 2 spine not synced · 3 payload invalid or verify drift · 4 API error — relay the JSON `error` verbatim.

**Outcome:** `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-status.js --brief --domain code --command adopt --facts '{"aspect":"<kind>"}'` → Done · Left · Next, per `${CLAUDE_PLUGIN_ROOT}/knowledge/outcome/SKILL.md`.
