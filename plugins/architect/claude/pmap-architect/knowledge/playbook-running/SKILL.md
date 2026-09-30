---
name: playbook-running
description: How to RUN a ProvenMap playbook from the terminal — pull the playbook's compiled skill file, work its steps in order through the platform's MCP tools, and let the server prove each one. Use when the architect wants a playbook done rather than authored ("run the migration playbook", "walk me through the ADR process", "do the inherited-system one on this board"), or asks what a live run needs next. Key capabilities: the run loop (list → start → pull the skill → step → re-read), which steps an agent may do and which belong to a person, the proof discipline, and the failure branches.
---

# Running a Playbook

<!-- The file this reads is compiled by the platform from the playbook's steps; its
     shape — frontmatter, "How to run this", stage headings, per-step Tools and
     "Done when" — is fixed there. Do not restate its content here; this is how to obey it. -->

## What running a playbook means

A playbook is an org-level guided track for one job. Authoring composes it
(`playbook-authoring`); running it is doing the work it names, on a board, until the server
marks its end proof done.

The division is absolute and it is the whole safety story:

- **You do the work**, through the product's own doors — the same MCP tools any session has.
- **The server decides what is done.** It watches real workspace state. No tool proves a step;
  `report_playbook_step` records only what the workspace cannot show (a choice, a skip, a
  person's mark), and a mark shows as marked, never proven.
- **A run is one person's walk.** `list_playbooks` shows teammates' runs too, with `mine` on
  each; work the run you started, and start your own rather than acting on someone else's.

So a step is finished when a re-read of the run says it is finished, and at no other moment.
If you did the work and the step has not ticked, something about the work did not land: say
what is missing rather than moving on.

## The tools

| Tool                   | Use                                                                                                                                                                                                                                            |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `list_playbooks`       | the catalogue this org can start, plus this workspace's live runs and each one's next step                                                                                                                                                     |
| `start_playbook`       | open a run on a board; returns the existing run when one is already live                                                                                                                                                                       |
| `get_playbook_skill`   | the playbook compiled to one file: stages, steps, the tools each step names, the proof for each                                                                                                                                                |
| `get_playbook_run`     | one run with every step evaluated — done, available, the evidence that proved it (on an open step, `evidence` without an `instance` says why it is still open: relay it)                                                                       |
| `report_playbook_step` | record on your run what the server cannot see: `choice` (the branch key), `selectTarget` (`boardSlug` or `epicSlug`), `selectLayer` (`layerSlug`), `skip`/`restore`, `markDone`/`unmark`, `acknowledge` (a sign-off the named person gave you) |
| `get_hub_status`       | pass `playbook` when a step asks you to look at the hub: the read is that run's hub visit                                                                                                                                                      |

`get_playbook_skill` is the instruction set. Read it before the first step, not after.

## The run loop

1. **Find the run.** `list_playbooks` with the board. A live run of yours (`mine`) for what the
   architect asked for → use it. None → pick from the catalogue by matching the ask against each
   playbook's `job` line, confirm the playbook by name, then `start_playbook`. Any playbook
   starts anywhere; one on an app or an epic that has none yet opens on its Select target step.
2. **Pull the skill.** `get_playbook_skill` for that playbook. Follow its stage order. Its
   per-step **Tools** list is what you may call for that step; a step that names none is not a
   step you do (see below).
3. **Take the next available step.** `get_playbook_run` names it. Work only steps the run
   reports available — `dependsOn` is the author's sequencing and jumping it produces work the
   server will not credit. The step's `id` there is the one you pass below; a step inside a
   nested playbook reads `parent/child`.
4. **Do the work** with that step's tools, and with the step's own words as the brief. On every
   write those tools make, pass `playbook: { runId, stepId }` — the run id from
   `start_playbook`/`list_playbooks`, the step id exactly as `get_playbook_run` reports it. That
   field is how the server learns what this step produced; a write without it is real work the
   run cannot see, and the step will not tick.
5. **Re-read.** `get_playbook_run` again. Ticked → report it with the evidence the run gives and
   go to 3. Not ticked → stop on this step and say what is missing (the first thing to check:
   did the write carry `playbook`).
6. **Stop at the end proof**, or at the first step you cannot do.

Report as you go: one line per step, naming the step and the evidence. A run of six steps is
six short lines, not a narrative.

## Steps a person answers, and steps that are not yours

Every playbook but the setup guide can be finished from here: each step has tools, a command,
or a person you ask. Some steps need the person, and the compiled file says how on each:

- **A chat question expecting an answer** — yours to answer, from the board, with the read
  tools the step lists. Give the person the answer and where it comes from. Once they are
  satisfied, tick it with `report_playbook_step` `markDone`; it reads as marked, since the answer
  lives in this session rather than in a chat thread.
- **`acknowledge`** — a named person confirms it. Ask them; once they have confirmed, record it
  with `report_playbook_step` `acknowledge`. Never confirm one on someone's behalf: that is the
  one place a human signature is the point. A step that opens later ("a month on") is refused
  until its day.
- **`publish`** — a person's step: there is no publish tool. Ask the person to publish the board
  from **Publish** in ProvenMap; publishing makes it readable outside the workspace, so they choose
  who can see it. The step ticks when they publish.
- **A work item step that stops at Drafted** — draft the plan's work items and leave them as
  drafts for the person to read; handing off is a later step's.
- **A work item step that ends at Confirmed** — you author and hand off; the tick comes later,
  from a sync in the repository. Report the hand-off and move on; never wait for it.
- **`control` with tools** — yours: its tools are the terminal's way to the same proof (the
  attention queue is `get_hub_status` with `playbook`; owner tags are `update_nodes`).

Only these stop the loop; name the step, say where it happens, and stop rather than invent a
way around it:

- **`control` with no tools** — an on-screen control with no terminal equivalent. Outside the
  setup guide the composer refuses one, so it means a playbook saved before that rule.
- **`code`** — a guided sub-flow the web app walks itself (the setup guide's own screens).
- **`select-target`** — done when the run is on its app or epic. While it is open, the run's
  `targetChoices` says how to answer (`answerWith`). An app run lists the apps by name and slug:
  offer them (AskUserQuestion). An epic run lists none (`choices: null`), because epics can run to
  hundreds: ask which epic, looking it up with `list_epics`, or make one with `create_epic`. Then
  record the pick with `report_playbook_step` (`selectTarget`, with `boardSlug` or `epicSlug`). No
  apps yet → `convert_node_to_app` on a landscape system with the architect. Never pick for them.
  Work items you make at an epic run's steps are filed in its epic by the server; do not file them
  yourself.
- **`select-layer`** — done when the run is on the board where the project's systems are drawn.
  While it is open, the run lists every board under `layerChoices` (slug, name, its path from the
  root, whether it is an app) and `current`, the board it reads now. Suggest one: the root when
  the new systems stand beside the others, the layer inside a system when they extend it. Read
  what is drawn on the likely candidates with `get_nodes` and weigh it against the epic's brief,
  then ask (AskUserQuestion), your suggestion first with its reason. Record the answer with
  `report_playbook_step` (`selectLayer`, with `layerSlug`). Every later step that reads the run's
  board reads this one. Never pick for them.
- **`choice`** — ask the architect which branch (AskUserQuestion), then record it with
  `report_playbook_step` (`kind: "choice"`, the branch key). The branch's steps open only once
  it is recorded; doing the work first proves nothing. Do not pick for them. A choice with
  `settledBy` that the run already shows done is moot (the workspace has what every branch
  was for): do not ask, move on.
- **Work done outside its door** — a step you can see is done but the run cannot (the work
  item was written by hand without the run, say). Name the step and say it can be marked done
  in the guide, or with `report_playbook_step` `markDone` if the person asks you to. The tick
  shows as marked, never proven; milestones cannot be marked.

A `command` step naming a `code` plugin command (`/analyze`, `/sync`, `/adopt`) belongs to the
repository session, not here: name the command and the repo, and hand off.

## Scope

Most playbooks write. `start_playbook` and the write tools a step names need a `read_write`
token — a read-only token can list, read a run and pull the skill, and nothing else. Check the
tools available before starting rather than failing three steps in.

## Failure branches

- Tools missing / connection errors → `ProvenMap not configured — run /login (browser) or /configure (manual) first`
- 401 → `Your ProvenMap architect token was rejected — run /login to reconnect`
- 402 on a step's tool → the org's plan does not include it. Relay the message; if the step is
  optional, `report_playbook_step` `skip` so its dependants open, and carry on. A required step
  stops the run there.
- `get_playbook_skill` refuses a slug → it is not in this org's catalogue, or it is disabled.
  `list_playbooks` says what can be started.
- The run pins the version it started on. A newer version of the playbook exists → say so; the
  run keeps its pinned steps, and restarting is the architect's call from the run's menu on the
  hub card or in the guide (Restart, Remove).
- `report_playbook_step` refuses with "belongs to …" → the run is a teammate's. Start your own.
