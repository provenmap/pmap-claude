# Step catalogue

Every step carries `id` (kebab-case, unique), `kind`, `summary` (≤120), `stage` (a declared
stage key), `dependsOn` (step ids, default `[]`), `guidance` (segments, default `[]`),
`skippable` (default false), and optionally `docsSlug` and `videoUrl`. A playbook holds 1–60
steps and 1–12 stages.

## Kinds

| Kind            | Fields                                                                                                                                                      | Done when                                                                | Use for                                                |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------ |
| `command`       | `plugin` (`code` \| `architect`), `command` ("/sync"), `args?`, `fact`                                                                                      | the `fact` you pick is true                                              | work done from a terminal with a ProvenMap plugin      |
| `control`       | `affordanceId` (see below), `fact`                                                                                                                          | the `fact` you pick is true                                              | something done in the web app through one control      |
| `chat-starter`  | `prompt` (≤2000), `scope` (`board` \| `tree` \| `workspace`, default `board`), `expected`                                                                   | this run's chat produced what `expected` names                           | a question asked of the board in chat                  |
| `insight-run`   | `skill` (an insight-skill slug), `mode` (`replace` \| `append`)                                                                                             | this run produced a batch of that skill                                  | a structured review over the board                     |
| `context-board` | `question` (≤500), `audience?` (≤100)                                                                                                                       | this run drew a context board                                            | a focused view drawn for one question or reader        |
| `work-item`        | `type` (`feature` \| `fix` \| `refactor` \| `task` \| `decision`), `epic` (`new` \| `existing`), `anchorHint?`, `until` (`handedOff` \| `confirmed`), `all` | the work item this run created was handed off, or confirmed by a later push | turning the job into governed work                     |
| `publish`       | `board`: `{kind:"target"}` \| `{kind:"root"}` \| `{kind:"step", stepId}`                                                                                    | that board is published                                                  | ending on a shared link                                |
| `acknowledge`   | `role` (≤60), `text` (≤500)                                                                                                                                 | the named person ticks it                                                | what happens outside the product (≤3 per playbook)     |
| `playbook`      | `slug`                                                                                                                                                      | the nested playbook's end proof is done                                  | reusing a building block or another playbook (≤4 deep) |
| `choice`        | `question` (≤200), `branches` (2–4: `key`, `label`, `description?`, `playbookSlug` or null)                                                                 | a branch is chosen (and its playbook, if any, completes)                 | a fork where teams differ ("canvas or code first?")    |

`expected` on a chat-starter: `answer` (a conversation happened) · `contextBoard` (chat drew a
context board) · `workItemDraft` (chat drafted a work item) · `decisionBoard` (chat created a
decision board). A `publish` step with `{kind:"step"}` must name a `context-board` step or a
chat-starter expecting `contextBoard`; any other step draws no board to publish.

Do not author `code` steps: they are registered in the web app for the setup guide only.

## Facts for `command` and `control` steps

A **milestone** is a state of the workspace, true whoever caused it; it shows "already in
place" when a playbook is previewed on a board that has it. An **outcome** is true only for
what this run produced. `scope` is `"target"` (default), `"root"`, or `{ "board": "<slug>" }`.

| Fact                                        | Kind      | Pairs with (from the shipped playbooks)                        |
| ------------------------------------------- | --------- | -------------------------------------------------------------- |
| `{kind:"workspace.mapped"}`                 | milestone | architect `/setup-workspace`                                   |
| `{kind:"app.exists"}`                       | milestone | code `/login` in the repo (binds it to the app)                |
| `{kind:"app.synced", withinDays?}`          | milestone | code `/sync`; `withinDays: 7` for "kept current"               |
| `{kind:"aspect.adopted", aspectKind?}`      | milestone | code `/adopt`                                                  |
| `{kind:"insight.ran", any:true, skill?}`    | milestone | code `/discover`; control `insights-rail`                      |
| `{kind:"decisionBoard.exists", any:true}`   | milestone | architect `/adopt-adr`                                         |
| `{kind:"skills.compiled"}`                  | milestone | control `skills-library`                                       |
| `{kind:"board.published"}`                  | milestone | control `publish`                                              |
| `{kind:"tag.coverage", tag, minPercent}`    | milestone | control `context-tags` (e.g. `owner:team`, 60)                 |
| `{kind:"chat.asked", any:true}`             | milestone | control `chat-toggle`                                          |
| `{kind:"hub.visited"}`                      | milestone | control `attention-queue`                                      |
| `{kind:"workItem.claimed", stepRef?, all?}`   | outcome   | code `/work-items` (a developer claims the run's work item)          |
| `{kind:"workItem.confirmed", stepRef?, all?}` | outcome   | code `/sync` after delivery (a push verifies the run's work item) |

Terminal commands run outside any chat, so a `command` step uses the milestone form
(`any: true` where the fact has it). `workItem.claimed` and `workItem.confirmed` read the work items
earlier steps of this run produced, so they need a `work-item` or `workItemDraft` chat-starter step
before them.

## Guidance segments

`guidance` is what the row says when opened, as segments:

- `{ "kind": "text", "text": "…" }` (≤500)
- `{ "kind": "command", "command": "/sync" }` — a click-to-copy command
- `{ "kind": "affordance", "id": "<affordance id>", "elsewhere"?: true }` — a chip drawn with
  the real control's icon and label; `elsewhere` when the control is on another board

Write one to three segments: what to do and why it matters here. Example:
`Run ` · command `/adopt-adr` · ` on the old doc's decision records so each gets a durable home linked to the board.`

## Affordance ids

Valid for `control.affordanceId` and `affordance` segments. Any other id is refused.

| Id                    | Control                |
| --------------------- | ---------------------- |
| `apps-palette`        | Apps                   |
| `canvas-context-menu` | right-click the canvas |
| `board-menu`          | Board menu             |
| `make-this-an-app`    | Make this an app…      |
| `create-layer`        | Create Subsystem Layer |
| `agent-access`        | Agent access           |
| `architect-access`    | Architect access       |
| `chat-toggle`         | Chat                   |
| `attention-queue`     | Attention queue        |
| `insights-rail`       | Insights               |
| `create-work-item`       | Create work item          |
| `skills-library`      | Library                |
| `publish`             | Publish                |
| `context-tags`        | Context tags           |
