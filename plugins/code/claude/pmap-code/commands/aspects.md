---
category: map
description: "Map · Extract a code aspect (database schema, API surface, API clients, frontend pages, event catalog, or authz registry) onto the bound board"
argument-hint: "[--aspect <kind> | --db | --api] [--mode replace|merge] [--comparisons all|none] [--dry-run] [--no-verify] [--force]"
allowed-tools: Read, Glob, Grep, Write, Bash(node:*, git:*), AskUserQuestion, Task
---

Extract **aspects** (contracts, and the nodes that own and use them) onto the bound board. **Print every `display` verbatim**; branch only on exit codes and named JSON fields.

**Six kinds**; `<x>` names the skill `${CLAUDE_PLUGIN_ROOT}/knowledge/<x>-aspect-extraction/SKILL.md` and the payload `.provenmap/aspects/tmp/<x>-payload.json`: `database.schema`=db · `api.surface`=api · `ui.pages`=pages · `event.catalog`=event · `authz.registry`=authz · `api.clients`=clients. `--db`/`--api` = first two.

**0 Preflight** — run `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-preflight.js` and react to its exit code. 0 → go (`repairs.boardsRecovered` non-empty = state restored from the server, per its `display`) · 1 (not connected / credentials rejected) → **connect-now offer**: AskUserQuestion "Connect to ProvenMap now?" → **Connect now** runs `pmap-login.js --start` then `--poll --host claude` inline, resuming on `status: "complete"`; **Not now** stops with the `error` sentence verbatim · 2 (binding unverified) → print `error`, stop, name `/status` · 11 branch mismatch → AskUserQuestion per the branch-mismatch prompt in `${CLAUDE_PLUGIN_ROOT}/knowledge/provenmap-integration/SKILL.md`.

**1 Spine first** — links resolve **by node slug**, so the spine must be synced: `.provenmap/boards/<board-slug>.json` exists with nodes, else **stop** and tell the user to run `/analyze` then `/sync` — never fabricate slugs.

## Workflow

**Read `${CLAUDE_PLUGIN_ROOT}/knowledge/claude-code-plugin-sync/references/aspects-workflow.md` NOW and follow it exactly; improvise nothing** — flags, the comparison loop, the question's wording and result reporting live there.

1. **Kinds** — the `--aspect` value (or `--db`/`--api`); none → `AskUserQuestion`, `multiSelect: true`, which of the six.
2. **Comparisons** — preflight's `binding.comparisonBranches` non-empty and no `--comparisons` flag → `AskUserQuestion` per the reference; `--comparisons all|none` answers it unasked. Never push a tracked branch unasked.
3. **The board**, per kind: `pmap-aspects.js --charter` (non-null `charter` = find those first, same names, never invent) → that kind's skill extracts into its payload — definitions only: **never run the app, a live database, broker, endpoint or policy** → `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-aspects.js --aspect <kind> --payload <payload-file> --mode <mode>` (+ `--dry-run` · `--no-verify` · `--force` as asked).
4. **Each chosen branch**, after the board: `--worktree <branch>` prints the tree to read (the user's checkout never moves) → per kind `--charter --branch <branch>`, extract there, push with `--repo <dir> --branch <branch>` → `--worktree-remove <branch>`, also after a failure.
5. **Comparison boards** after the pushes (not `--dry-run`): per the reference, with Task agents.
6. **Report** per the reference: `landedIn` first when it names a comparison, then counts, `reused`, `unlinked`/`unresolvedRefs` with `unknownSlugs`, `verify` — never silently. Exits: 0 ok · 1 config error → **connect-now offer** (branch mismatch or untracked `--branch`: relay `error`) · 2 spine not synced / worktree failed · 3 payload invalid or verify drift · 4 API error: relay `error` · 5 shape coverage collapsed: relay `error`, **AskUserQuestion** — re-extract the shapes (default) or `--force`.

**Outcome:** `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-status.js --brief --command aspects --facts '{"aspect":"<kind>[,<kind>…]"}'` → Done · Left · Next, per `${CLAUDE_PLUGIN_ROOT}/knowledge/outcome/SKILL.md`.
