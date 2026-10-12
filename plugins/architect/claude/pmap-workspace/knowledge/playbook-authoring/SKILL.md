---
name: playbook-authoring
description: How to author a ProvenMap playbook — an org-level guided track for one job, composed from steps the platform already watches. Use when the architect wants to turn a job ("replace the stale doc", "run our ADR process", "onboard a new team to the map") into a playbook others in the org can start, or wants one like an existing playbook with changes. Key capabilities: the authoring interview (job → overlap/template → shape → human-only parameters → read-back → draft), composition rules (building blocks, stages, dependencies, the end proof), the step-kind and fact catalogue, the draft_playbook landing and its issue loop.
---

# Playbook Authoring

<!-- Distilled from the platform's playbook schemas (playbook.zod.ts,
     playbook-step.schema.ts, playbook-fact.schema.ts, playbook-validate.ts) and its
     playbook seeds. Keep field names and limits aligned with those when updating. -->

## What a playbook is

A playbook names **one job** and the steps that finish it, grouped into named **stages**. Each
step points at a door the product already has (a plugin command, a chat prompt, an on-screen
control, a work item, a publish), and the server marks the step done by **watching real workspace
state**. The server itself executes nothing: it observes. A person follows the playbook in the
guide, or an agent host runs it from the terminal (`/run-playbook`, playbook-running) — either
way the proof is the same state, watched the same way.

Authors **pick** what proves a step done from a closed fact vocabulary; they never write a
predicate. Playbooks live at the **org** level beside archetypes and insight skills. Anyone who
can edit a board can start a listed, enabled playbook on it. Authoring needs the org's plan to
include `playbook.author`.

## The tools

| Tool                  | Use                                                                                                                  |
| --------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `list_playbooks`      | the listed, enabled catalogue (slug, name, summary, `job`, door, target kind) + this workspace's runs                |
| `get_playbook`        | one full definition (stages, steps, end proof), building blocks and disabled rows included — the template source     |
| `list_insight_skills` | the org's insight skills (slug, name) — the only valid `skill` values for an `insight-run` step                      |
| `draft_playbook`      | save a NEW playbook, **disabled**; returns issues unsaved, or `{ saved: true, slug }` plus a top-level `composerUrl` |
| `start_playbook`      | start an existing playbook on a board (when the overlap check finds the job is already covered)                      |
| `get_playbook_skill`  | a playbook compiled to one runnable file — what `/run-playbook` follows; read it to see how a step reads to an agent |

`draft_playbook` writes the org's catalogue directly. It is **not** part of the working copy:
there is nothing to preview or commit, and `get_write_session` never shows it. It refuses a slug
that already exists; changing an existing playbook stays in the composer.

## The authoring interview

Keep the draft in `~/.provenmap/architect/drafts/playbook-<slug>.json` (the definition as it
stands, plus `"phase"`) and update it after every answer, so the interview survives context
loss. Delete it once the draft is saved or abandoned.

### 1. The job

One question, unless the command argument already answers it: **"What should someone have
finished when they reach the end?"** From the answer, derive and show in one block:

- `name` (≤100) — the job as a title: "Run a security review before release".
- `summary` (≤200) — one line for the chooser: what the person ends up with.
- `job` (≤300) — one sentence in the user's own words, first person or imperative. Chat and
  `/start` match open-ended asks against it, so write it the way someone would ask.
- `slug` — kebab-case, from the name.
- `door` — `understand` (make sense of a system) · `author` (decide or specify change) ·
  `operate` (keep the map and the work moving) · `share` (show it to others). `setup` is the
  setup guide's own; do not use it.
- `targetKind` — what a run is about: `appBoard` (one app, the usual case) · `workspace`
  (the whole landscape) · `epic` (a body of work items). It decides what "Start" asks for and
  which board the facts read by default.
- `icon` — `{ "kind": "lucide", "name": "<kebab-case lucide icon>" }`; default `route`.

Correct and confirm once; do not grill fields the user did not care about.

### 2. Overlap and template

`list_playbooks`. If a playbook's `job` already covers the ask, AskUserQuestion: **Start
`<slug>`** (→ `start_playbook` on a board they name, then stop) · **Start from `<slug>`** (use
it as a template) · **Write a new one**. When the user names an existing playbook to start from
("like the migration one, plus a security review"), go straight to the template path.

Template path: `get_playbook` → take its `definition`, give it the new `slug`, `name`,
`summary` and `job`, then run step 3 as an edit of that shape rather than from scratch. Say
which seed or fork it came from in the read-back.

### 3. Shape — propose, don't interrogate

Propose the whole playbook as one table, then refine it with the user. Columns: stage · step
id · summary · kind · what proves it done. Compose from
`${CLAUDE_PLUGIN_ROOT}/knowledge/playbook-authoring/references/step-catalogue.md` (read it now):

- **Stages** — 2–5 named phases in reading order (≤12). The guide groups by them and the
  composer draws them as columns. Name them for the reader ("Set up", "Understand", "Decide",
  "Share"), key them kebab-case.
- **One step, one action at one door.** `summary` ≤120, phrased as the action. Split a step
  that asks for two things.
- **Reuse the building blocks** as `playbook` steps rather than restating them:
  `connect-and-sync` when the job needs the app's code on the board (bind the repo, first
  push), `publish-and-share` when the job ends in a shared link. `map-with-architect`,
  `map-with-chat` and `first-app` belong to the setup guide; don't nest them.
- **Observed over ticked.** Prefer a step the server can see (a sync, a context board, an
  work item, a publish). An `acknowledge` step is a person's tick; use it only for what happens
  outside the product (a review meeting, a sign-off). At most 3.
- **Dependencies.** A step lists in `dependsOn` the steps whose output it needs. Steps in a
  later stage usually depend on the previous stage's steps; steps in one stage run side by side
  unless one needs another. No cycles.
- **Every step can be done from the plugin.** A playbook runs from `/run-playbook` as well as the
  browser, so every step needs a way an agent gets it done: its tools, a repository command, or
  a person the agent asks (a choice, a sign-off, Select target or layer, a question it answers
  itself). A `control` step implies no tools, so it names the ones that do the same thing
  (`get_hub_status` for the attention queue, `update_nodes` for tags); the composer refuses a
  step with none.
- **Tools, and a line on each.** Every other step kind implies its tools (a context-board step
  implies `create_context_board` and the drawing tools; a work item step implies
  `create_work_item` and `transition_work_item`, or only `create_work_item` when it stops at
  Drafted; a publish step implies none, since the person publishes), and the compiled skill prints the implied
  list. Name `tools` when a step needs something specific, with an `instruction` saying what
  this step wants of the tool (`[{ "name": "create_board", "instruction": "…" }]`, wire names as MCP
  advertises them, at most 8). An authored list on a step the run proves through what it
  produces must still include the tool that creates that thing (`create_context_board`,
  `create_work_item`, `create_epic`, `create_insight`), or the composer refuses it: an agent could
  do the work and the step would never tick. Never guess a tool name: the server refuses a
  save naming a tool the workspace does not expose.
- **The end proof.** `endProof` names the step whose completion ends the run, and it must be
  a proof: a `publish` step, an `acknowledge` step, a `playbook` step, a `work-item` step with
  `until: "confirmed"`, or a `command`/`control` step whose fact is `board.published` or
  `workItem.confirmed`. A confirmed work item is proven only
  when a later push verifies it, so a run ending there can wait a long time; prefer a publish
  or an acknowledge unless delivery is the point of the playbook.

### 4. What only a person can decide

Ask (AskUserQuestion, a few options each, your recommendation first) only for parameters that
change what the playbook means, and batch them into as few questions as possible:

- `insight-run` → which skill: offer slugs from `list_insight_skills`, never invent one.
- `acknowledge` → who confirms (`role`, e.g. "engineering lead") and what they confirm (`text`); `opensAfterDays` for
  a confirmation that only means something later ("a month on, still current").
- `work-item` → the work item `type` and where the step ends: `drafted` (the plan written down
  as drafts, by hand or from chat), `handedOff`, or `confirmed`.
  On a playbook that runs on an epic, `epic` is `existing` (the run's epic); `new` is refused.
- `publish` → which board: the run's target, the root, or the board a `context-board` or
  chat-starter step drew (`{ "kind": "step", "stepId": … }`).
- `choice` → the question and 2–4 branches, each running a playbook slug or nothing. When
  every branch leads to the same state of the workspace, set `settledBy` to that milestone:
  a workspace that already has it is never asked.
- `select-target` → no parameters. A listed playbook on an app or an epic opens with exactly one,
  first and depending on nothing: it pins the run to the app or epic the person picks, and every
  other step waits on it. A workspace playbook and a building block have none.
- `select-layer` → no parameters. For a listed playbook on an epic or the workspace whose work is
  drawn somewhere (a new project, a new subsystem): at most one, depending on nothing. It follows
  Select target on its own, every other step waits on it, and the board it chooses (the root or
  any layer) is the one every later step reads. An app playbook and a building block have none.

Write chat-starter prompts, context-board questions and guidance text yourself; they show in
the read-back, where the user can change them. Set a chat-starter's `expected` deliberately:
`answer` is for questions only: in the browser its proof is the chat thread, and an agent
answers it in its own session and marks it once the person is satisfied (list the read tools it
answers from). Anything with a manual path is not a chat step: a plan becomes a `work-item` step
that stops at `drafted`, a drawing a `context-board` step. `contextBoard`, `decisionBoard` and
`workItemDraft` remain for steps that are chat's by nature. `scope` is the conversation scope
the browser opens with.

### 5. Read-back gate

Render the assembled playbook once: the job block, then one table per stage (step · what the
person does · what proves it done · depends on), then the end proof. AskUserQuestion:
**Draft it** · **Revise**. Revise loops back to the part named; never draft without this gate.

### 6. Land

`draft_playbook` with the full definition (`slug`, `name`, `summary`, `icon`, `description`,
`job`, `targetKind`, `door`, `stages`, `steps`, `endProof`; `listed` defaults to true).

- `saved: false` with `issues` → fix each issue named (the messages cite step ids) and call
  again. Never resend an unchanged definition. Two failed rounds → show the issues and ask.
- A schema error (a missing or mistyped field) → fix the field the error names and resend.
- A plan denial (402, `playbook.author`) → stop: the org's plan does not include playbook
  authoring. Relay the denial's message, keep the drafts file, and name the fix: a plan that
  includes it, changed by an org admin.
- Saved → print `↗ Open in the composer: <composerUrl>` (skip the line when it is null) and
  say plainly: the playbook is saved **disabled**. Nobody can start it until someone previews
  it in the composer and enables it.

## Read-only token

`draft_playbook` absent from the tool list means a `read` token. Say so before the interview,
name the fix (a `read_write` token from `/login`), and do not run the interview: the composer
has no import, so a draft that cannot land is lost work.
