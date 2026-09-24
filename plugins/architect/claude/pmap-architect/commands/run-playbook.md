---
category: operate
description: "Operate · WRITE-CAPABLE: Run a playbook — pull its compiled skill, work its steps, let the server prove each one"
argument-hint: "[playbook slug or the job you want done] [--board <slug>] [--epic <slug>]"
allowed-tools: Read, AskUserQuestion, Bash(node:*), mcp__plugin_pmap-architect_provenmap__*
---

Do a playbook, rather than author one. The run loop, which steps belong to a person, and the
proof discipline live in `${CLAUDE_PLUGIN_ROOT}/knowledge/playbook-running/SKILL.md` — read it plus
`${CLAUDE_PLUGIN_ROOT}/knowledge/architect-core/SKILL.md` before the first tool call.

**The server decides what is done.** No tool marks a step complete; a step is finished when
`get_playbook_run` says so, and never because you believe you did the work.

## Workflow

1. **Scope** — `start_playbook` missing from the tools → read-only token: say so, name `/login`
   for a `read_write` token, stop. Resolve the board from `--board`, else the argument, else ask.
   A playbook whose target is an epic also needs `epicSlug` on `start_playbook` (`list_epics`).
2. **The run** — `list_playbooks` on the board. A live run matching the ask → use it. None →
   match the argument against each playbook's `job`, confirm the playbook by name (AskUserQuestion
   when two fit), then `start_playbook`.
3. **The instructions** — `get_playbook_skill` for that playbook. It is the brief; follow its
   stage order and its per-step tool list. Read it before step 4, never after.
4. **The loop** — `get_playbook_run` for the next available step → do it with that step's tools,
   passing `playbook: { runId, stepId }` on every write → `get_playbook_run` again. Ticked: one
   line naming the step and its evidence, then the next. Not ticked: stop there and say what is
   missing.
5. **Stop** — at the end proof, or at the first step that belongs to a person (a control, a
   code sub-flow, an acknowledgement, a `code`-plugin command in the repo). Name where it
   happens; do not work around it.

**Outcome:** `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-architect.js --brief --command run-playbook --facts '{"playbook":"<slug>","board":"<boardSlug>"}'` → Done · Left · Next, per `${CLAUDE_PLUGIN_ROOT}/knowledge/outcome/SKILL.md`.

## Failure branches

- Tools missing / connection errors → `ProvenMap not configured — run /login (browser) or /configure (manual) first`
- 401 → `Your ProvenMap architect token was rejected — run /login to reconnect`
- 402 on a step's tool → relay it, skip that step, carry on with the rest of the run.
- Slug not in the catalogue, or disabled → `list_playbooks` says what can be started.
