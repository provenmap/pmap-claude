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
- **The server decides what is done.** It watches real workspace state. There is no tool that
  marks a step complete and you must never behave as if there were.

So a step is finished when a re-read of the run says it is finished, and at no other moment.
If you did the work and the step has not ticked, something about the work did not land: say
what is missing rather than moving on.

## The tools

| Tool                  | Use                                                                                             |
| --------------------- | ----------------------------------------------------------------------------------------------- |
| `list_playbooks`      | the catalogue this org can start, plus this workspace's live runs and each one's next step      |
| `start_playbook`      | open a run on a board; returns the existing run when one is already live                        |
| `get_playbook_skill`  | the playbook compiled to one file: stages, steps, the tools each step names, the proof for each |
| `get_playbook_run`    | one run with every step evaluated — done, available, the evidence that proved it                |

`get_playbook_skill` is the instruction set. Read it before the first step, not after.

## The run loop

1. **Find the run.** `list_playbooks` with the board. A live run for what the architect asked
   for → use it. None → pick from the catalogue by matching the ask against each playbook's
   `job` line, confirm the playbook by name, then `start_playbook`.
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

## Steps you do not do

Some steps exist for a person, and the compiled file says so in its own words. Name the step,
say where it happens, and stop the loop there rather than inventing a way around it:

- **`control`** — an on-screen control in the web app. There is no terminal equivalent.
- **`code`** — a guided sub-flow the web app walks itself.
- **A chat question expecting an answer** — its proof is a conversation thread on the board, and
  an MCP session has none. The compiled file says so on the step; hand it to a person.
- **A work item step that ends at Confirmed** — you author and hand off; the tick comes later,
  from a sync in the repository. Report the hand-off and move on; never wait for it.
- **`acknowledge`** — a named person ticks it. Never tick one on someone's behalf; that is the
  one place a human signature is the point.
- **`choice`** — ask the architect which branch, then record it by doing the branch's work.
  Do not pick for them.

A `command` step naming a `code` plugin command (`/analyze`, `/sync`, `/adopt`) belongs to the
repository session, not here: name the command and the repo, and hand off.

## Scope

Most playbooks write. `start_playbook` and the write tools a step names need a `read_write`
token — a read-only token can list, read a run and pull the skill, and nothing else. Check the
tools available before starting rather than failing three steps in.

## Failure branches

- Tools missing / connection errors → `ProvenMap not configured — run /login (browser) or /configure (manual) first`
- 401 → `Your ProvenMap architect token was rejected — run /login to reconnect`
- 402 on a step's tool → the org's plan does not include it. Relay the message, skip that step,
  and carry on with the rest of the run.
- `get_playbook_skill` refuses a slug → it is not in this org's catalogue, or it is disabled.
  `list_playbooks` says what can be started.
- The run pins the version it started on. A newer version of the playbook exists → say so; the
  run keeps its pinned steps and restarting is the architect's call, in the composer.
