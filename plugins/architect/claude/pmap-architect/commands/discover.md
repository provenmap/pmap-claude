---
category: explore
description: "Explore · WRITE-CAPABLE: Discover the insights and context boards worth showing across the workspace — ranked by the graph, read closely, picked by you or chosen for you, authored in parallel, recorded and drawn on the platform"
argument-hint: "[count] [--auto] [--lens reliability,onboarding,ownership] [--board <slug>] [focus]"
allowed-tools: Read, Glob, Grep, Write, Bash(node:*), AskUserQuestion, Task, mcp__plugin_pmap-architect_provenmap__*
---

The whole workspace, read once over MCP and scored by a script; the strongest rows read closely
before any is suggested; a curated ★ set to run as is, or the ranked menus (insights, context
boards); agents that author in waves, one paced writer that records the insights and draws the
boards. Read
[`${CLAUDE_PLUGIN_ROOT}/knowledge/discover-authoring/SKILL.md`](../knowledge/discover-authoring/SKILL.md) and
[`${CLAUDE_PLUGIN_ROOT}/knowledge/architect-core/SKILL.md`](../knowledge/architect-core/SKILL.md) first.
**Print every `display` verbatim; branch only on exit codes and named JSON fields.**

## Workflow

1. **Plan** — from the argument: a leading integer → `--count <n>`; `--board <slug>` → the
   subtree to discover in (default the whole tree from `root`); `--lens` passes through; a focus
   prompt → the lenses it matches (say which). Then
   `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-architect.js --discover [--board <slug>] [--lens <a,b>] [--count <n>]`
   (~1 s per board the first time; cached an hour, `--refresh` re-reads). Exit 1 → print
   `error`, stop (it names the command). Exit 2 → the failure branches below. Print `display`.
2. **Steps 2–8 — read
   `${CLAUDE_PLUGIN_ROOT}/knowledge/discover-authoring/references/discover-workflow.md` NOW and follow
   it exactly; improvise nothing.** Step map: **2 Read** — before suggesting anything, read the
   elements behind Step 1's `shortlist`, write the curation to `curationFile`, `--curate <file>`;
   every run, `--auto` included · **3 Frame** — one AskUserQuestion (these N / the menu /
   refocus), skipped by `--auto` and wherever no prompt can be answered · **4 Pick** — the
   curated ★ set, or two multi-select questions over the Id column · **5 Briefs** — `--briefs
   <ids> --rules …` · **6 Author** — waves of ≤4 `insight-author` agents (Task), one brief each;
   inline and sequential when Task is unavailable · **7 Push in order** — `--push-insight` /
   `--push-context-board`, both `--require-pack --push`; exit 3 → fix once, else mark failed and
   continue · **8 Report** — `--report`, verbatim. The pushes
   are journal-free: `create_insight` lands a draft batch and `create_context_board` draws
   outside the tree, so nothing here waits on a commit.

**Outcome:** `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-architect.js --brief --command discover` → Done · Left · Next, per `${CLAUDE_PLUGIN_ROOT}/knowledge/outcome/SKILL.md`.

## Failure branches

- Script exit 1 with no grant / tools missing → `ProvenMap not configured — run /login (browser) or /configure (manual) first`
- Script exit 2 on a rejected token / MCP 401 → `Your ProvenMap architect token was rejected — run /login to reconnect`
- `create_insight` / `create_context_board` absent → read-only token: the plan and the menu
  still work; recording needs a `read_write` token.
- `notAvailable` on a context-board push → `This ProvenMap server doesn't expose context boards yet — ask your admin to upgrade`; the insights still land.
- Empty root → nothing to discover; offer `/setup-workspace`.
