---
category: author
description: "Author · WRITE-CAPABLE: Author a playbook — interview the job, compose steps the platform can watch, draft it for the org"
argument-hint: "[job or playbook to start from]"
allowed-tools: Read, Write, AskUserQuestion, Bash(node:*), mcp__plugin_pmap-architect_provenmap__*
---

Turn a job the org repeats into a playbook: named stages of steps, each pointing at a door the
product already has, each proven done by state the server watches. The interview, composition
rules and step catalogue live in
`${CLAUDE_PLUGIN_ROOT}/knowledge/playbook-authoring/SKILL.md` — read it plus
`${CLAUDE_PLUGIN_ROOT}/knowledge/architect-core/SKILL.md` before the first question.

## Workflow

1. **Scope** — `draft_playbook` missing from the tools → read-only token: say so, name
   `/login` for a `read_write` token, stop before interviewing. A drafts file
   `~/.provenmap/architect/drafts/playbook-*.json` → offer to resume it.
2. **The job** — the command argument or one question: what someone has finished at the end.
   Derive name, summary, job line, slug, door, target kind; the architect confirms once.
3. **Overlap and template** — `list_playbooks`; a playbook already doing this job → start it,
   start from it (`get_playbook` as template, new slug), or write new: the architect decides.
4. **Shape** — propose stages and steps as one table from the step catalogue; reuse the
   building blocks; refine with the architect.
5. **Decisions** — only what a person must pick (insight skill from `list_insight_skills`,
   acknowledge role, work item type, which board publishes, choice branches), batched.
6. **Read-back** — the assembled playbook rendered once; Draft it / Revise.
7. **Land** — `draft_playbook`; issues come back unsaved → fix and resend; saved → print the
   `composerUrl` and say it is saved **disabled** until previewed and enabled in the composer.
   No working copy, no commit. Delete the drafts file.

**Outcome:** `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-architect.js --brief --command author-playbook --facts '{"playbook":"<slug>"}'` → Done · Left · Next, per `${CLAUDE_PLUGIN_ROOT}/knowledge/outcome/SKILL.md`.

## Failure branches

- Tools missing / connection errors → `ProvenMap not configured — run /login (browser) or /configure (manual) first`
- 401 → `Your ProvenMap architect token was rejected — run /login to reconnect`
- 402 `playbook.author` → the org's plan does not include playbook authoring; relay it, keep
  the drafts file.
- Slug already exists → pick another slug; editing an existing playbook is the composer's job.
