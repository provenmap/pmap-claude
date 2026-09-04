---
name: outcome
user-invokable: false
description: How every ProvenMap command closes — the Outcome you write from the script's brief. Use at the last step of any command or routed workflow, when the step says "Done · Left · Next" or names --brief. Covers the fixed shape, the eight writing rules with examples, how to read a brief (state, gates, candidates, hand-offs), the one-line form, and what never appears.
metadata:
  author: ProvenMap
  version: 1.0.0
---

# The Outcome

A command ends with an Outcome **you write**, from a brief **the script returns**. The script
knows the state — names, numbers, gates, the moves the state calls for. You know what this run
did, what the user asked, and what they are trying to get done. The Outcome is where those meet.

The shape is fixed so a reader finds it in the same place on every plugin and every host. The
words are yours, and they are never the same twice.

## The shape

```
**Outcome**
Done: <what changed, with this run's numbers and names>
Left: <what this run did not do, or found wanting>
Next: <one move and why> <up to two alternatives, each with its why>
↪ <a hand-off, when the next move belongs to someone else>
```

Three to eight lines. `Left` is omitted only when there is genuinely nothing. Hand-offs sit on
their own `↪` line, never numbered, never inside Next. For `/update` and `/logout` the whole
Outcome is one line.

## Reading the brief

`node <plugin>/scripts/pmap-status.js --brief --domain <d> --command <name>` (code, connect) or
`pmap-architect.js --brief --command <name>` returns JSON. Some results already carry it as
`brief` — `/sync`'s push, `/intents`' resolution, the completed
`/login` — use that and skip the call.

- **`gates`** — blocking conditions with their `fix`. A gate is the whole of Next, alone: "Next:
  `git switch main` — the binding is pinned to main and every push refuses until you are on it."
- **`candidates`** — the moves, ranked. `because` is the fact to cite. `source: "after"` follows
  the command that just ran; `source: "ladder"` is what the state calls for anyway. `rank:
  "last"` is optional work — mention it after the lead, never as the lead.
- **`state`** — names and numbers: board slugs, files behind HEAD, pending elements, gap names,
  batch ids, draft file names, unprepped new apps. A move that is not a candidate is allowed only
  when a fact here justifies it, and the Outcome says which.
- **`handoffs`** — work in another session (developers in a repo, the architect in ProvenMap, an
  admin). Always the `↪` line.

## The eight rules

1. **Done cites this run.** Numbers and names from the results above — nodes pushed, boards
   skipped, gaps recorded, intents resolved, files written.
   - Bad: `Done: sync completed successfully.`
   - Good: `Done: pushed payments-overview — 12 nodes, 8 edges, verified against the read-back.`
2. **Left is honest.** Skipped steps, waived files, undrawn nodes, a failed verification, a
   question the run could not answer.
   - Bad: (omitted, while the run skipped a board)
   - Good: `Left: checkout was skipped — 14 files behind HEAD; a push would send stale coverage.`
3. **Next leads with one move and its because.** The because is a fact from the brief or from
   this run — never a description of the command (`/help` has those). Blocking gates come first
   and alone. At most two alternatives.
   - Bad: `Next: /insights — run intelligence over the board.`
   - Good: `Next: /intents — the architect promoted 2 findings from batch b-12 into intents for this board.`
4. **Candidates or justified.** A move is one of the brief's candidates, or a named `state` fact
   justifies it. No invented flags, no invented commands, no command the state makes impossible.
   Another plugin's command is never a move — that is a hand-off.
   - Bad: `Next: /intents --force` (no such flag) · `Next: /pmap-architect:insights` (another session)
   - Good: `↪ The architect can review payments-overview in ProvenMap now.`
5. **Tie back to the user.** If they asked a question or named a goal this session, the Outcome
   answers it or says where it stands.
   - Good: `You asked whether the review can go ahead tomorrow — yes: both boards are pushed.`
6. **Never the same paragraph twice.** When the candidates are the quiet-state entries, say the
   workspace is quiet and name one thing worth doing.
   - Bad: `Next: /board — orient. /ask-board — ask. /hub — attention queue.` (every time)
   - Good: `Next: nothing needs you. /ask-board is a good way to spend the quiet — try the
     question the review raised.`
7. **No Outcome on a plain answer.** A turn that answered a question without running a workflow
   ends like a colleague's reply. The Outcome belongs to commands and routed workflows.
8. **Verbatim stays verbatim for tables.** A `display` field (status report, help card, intents
   list) still prints unchanged. The Outcome is the paragraph after it, never a rewrite of it.

## Three Outcomes



After `/sync` that re-grounded the board:

```
**Outcome**
Done: mirrored payments-overview and pushed 41 evidence links; the 3 that had drifted since the
  last run are re-linked to the current documents.
Left: 2 nodes (`refund-policy`, `dispute-flow`) have no citation yet — nothing in docs/ mentions
  them.
Next: /insights — the board is grounded for the first time, so the first analysis runs on real
  evidence. /intents if you would rather work the architect's queue before that.
↪ The architect can review payments-overview in ProvenMap now.
```


After `/update` when nothing changed and the user was mid-sync (one line):

```
**Outcome** pmap-code is already at 0.17.0 — nothing changed. You were mid-way through syncing
payments; /sync picks that up.
```

After `/new-app` for a net-new app:

```
**Outcome**
Done: checkout is placed on the landscape as a new_app with 4 target components; its founding
  intent is drafted, not released.
Left: no skills chosen, no sequenced intents — placed, not build-ready.
Next: /prepare-app checkout grills the spec into sequenced intents and picks its skills; that is
  what makes it buildable. /author-intent checkout if you would rather add requirements first.
```

## What never appears

An invented flag or command. Another plugin's command as a move. A command a gate blocks. The
quiet-state trio verbatim. A restated `display` table. "Completed successfully" with no number.
A Next with no because.
