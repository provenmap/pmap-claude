# Change periods — who did what, when

`/changes` reads the binding's git history into **change periods**: one record per calendar
period (the workspace's grain — ISO weeks by default, or months — in UTC) for the repo on the
bound branch. Each record holds the commits in the period, who was involved and with which
coding agent, the services those commits touched (mapped to the nodes of every board of this
analysis), a yes or no for each files-triggered change rule with the paths and key names behind a
yes (schema, API contract and infrastructure all answer from files), the work item numbers the
commit messages cite (`#12`, `WI-12`; a squash merge's trailing `(#4480)` is the pull request and
is skipped), and the **threads**: the pieces of work the commits group into. A commit joins the
thread of its conventional-commit scope (`feat(hub): …` → `hub`), else of the node most of its
files belong to, else `other changes`; at most 8 threads, the largest first (a rule's yes that only
a smaller, cut thread hit is still told, as the rule's own entry). Each thread is one entry in the
ProvenMap diary. `pmap-changes.js` computes every fact
and leaves the words to you.
The server answers the element-kind rules (structure) itself from the pushes that landed in the
period, and keeps only the cited numbers that name a work item on this app's boards.

A period is **advisory**. Nothing in these steps may fail: the CLI always exits 0, and a period it
cannot compute or send is named, never a reason to stop.

## 1. Compute the draft

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-changes.js \
  --model <the model you are running as> \
  --host claude --domain code
```

Pass through the command's arguments: `--since <date>` reads further back than the workspace's
backfill horizon, once; `--recompute` rewrites closed periods the server already has from git;
`--facts-only` leaves every sentence null and lists no slots. `--model` is the model id you know
yourself to be; omit the flag when you do not know it.

The CLI reads the branch's history once for the whole window, buckets commits into periods by
the date each landed, and computes only the periods the server does not have: a closed period
already recorded from git is skipped, the open period (today falls in it) is rewritten on every
run, and a period the server converted from an older record is replaced by git truth. So a run
picks up where the last one left off, and a binding with nothing recorded yet gets the whole
backfill window. A branch whose newest commit landed before the window opened is quiet: the run
also reads its last stretch of work, as long as the backfill and ending with that commit, and
skips the empty periods between. The same holds whether `/changes` or `/analyze --scheduled` ran it, and so does
everything below: both runs write the same periods with the same prose. Branch on `changes` in
its JSON:

- **`changes: "none"`** — nothing to write. `reason` is `nothing_missing` (every period in the
  window is recorded), `older_server` (this ProvenMap server predates change periods),
  `not_a_git_repo`, or `failed` (`detail` says what). Say the `detail` in one line and close.
- **`changes: "written"`** — the draft is at `draftPath` (`.provenmap/changes/draft.json`) with
  `periods` records in it. Print `display` verbatim when present: it says the branch was quiet
  and which stretch was read, or that a shallow clone cut periods short and how to fetch the rest. `fill` lists every sentence left for you, **newest period first**;
  when it is empty, skip to step 3.

## 2. Write the prose

Read the draft. It has two parts: **`periods`**, which is what gets sent, and **`working`**,
which never leaves this machine. Each entry of `fill` is one slot: `n` is its number, `period`
the index of the period it belongs to (0 is the newest), `about` says what it is about, `read` is
where its material sits in the draft.

- **A thread's `title`** (`path` ends `threads[t].title`) — the piece of work as a headline, from
  the commit messages at `working[i].threads[t].commits` and the nodes it touched.
- **A thread's `what`** (`path` ends `threads[t].what`) — what the work did, in a sentence or two,
  from the same material.
- **A thread's impact** (`path` ends `threads[t].rules[h].impact`; the slot carries `accepts`) —
  one word, not a sentence: how this thread's change to that rule's files lands on others.
  `working[i].threads[t].rules[h]` holds the rule's question and the thread's own files behind it.
  - `breaking`: a caller, a plugin, a stored row or a running deployment stops working as it did
    (an endpoint renamed or removed, a column dropped, a response reshaped, a required variable
    added).
  - `additive`: new surface; nothing that exists changes (a new endpoint, table, column with a
    default, optional field).
  - `internal`: reshaped behind the same surface (a migration that keeps every row and name, a
    refactor, a rename nobody outside can see).
  When the commits do not say which, leave it out: an impact left null is shown as unknown.
- **A rule's `what` and `title`** (`path` ends `rules[k].what` / `.title`) — what the change is,
  for a rule answered yes, across the whole period. `working[i].rules[k]` carries the rule's
  `question`, its `describe` (what to say about a yes; follow it) and the changed `files`.

Write the sentences through the CLI, one `--prose` per `fill` entry, each under its number:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-changes.js --fill <draftPath> \
  --prose 0="<sentence for fill entry 0>" \
  --prose 1="<sentence for fill entry 1>"
```

Leave out the `--prose` of an entry you have nothing sound to say for: it stays `null`. Keep each
sentence free of double quotes, backticks and `$`, which the shell would read. The reply lists
what was `written`, what is `left`, and any `invalid` slot (an impact given a word other than the
three; write it again); `changes: "unfilled"` means nothing was written, and the draft still goes
to the send as it is.

**Never edit the draft file yourself.** Everything in `periods` but these words is a computed
fact — a name, a count, a path, a yes or a no, which commits form a thread — and the CLI is the
only writer of both.

### The prose budget

Every period gets its facts; prose is spent newest period first, and on every period the run
computed. A run after a short gap has only a period or two to write; the first run on a binding
writes the whole backfill.

- Write up to **24** `fill` entries inline yourself. Beyond 24, write the first
  24 inline, then dispatch the remaining periods to `change-period-author` agents (the Task tool)
  in waves of at most 4, **one agent per period**, in a single message per wave. Each dispatch
  prompt says exactly: the draft path, the period index, its slot numbers, "read the draft and
  the writing rules in this reference, write the sentences with `--fill`, reply with one line".
  Wait for a wave to finish before the next. When the host cannot launch agents, do the same
  work yourself, one period at a time, newest first — say so in one line first.
- **`--facts-only`:** no prose at all.

### Writing rules

These hold for every sentence in a period:

- **Name an area of work, not an amount.** Say which part of the system and what was done to it
  ("Reworked order validation and added the refund endpoints."). **No counts** — no numbers of
  commits, files, lines or elements, and no "most", "few", "several".
- **No judgement words.** Not "great", "minor", "major", "messy", "quick", "significant". Describe;
  do not grade.
- **Never name or rank people.** The thread already lists who worked on it, and with which agent;
  a sentence never says "led", "with Claude", "worked on".
- **Name what a reader would recognise, never the activity.** Not "Node added", "Files changed",
  "Updated the code": say what the system now does differently ("get_board_tree lists one level
  at a time", "Change periods replaced the sync digest").
- **Names, never addresses.** No email address anywhere in a period.
- **Null beats a guess.** When the messages or files say too little to write something sound,
  leave the field `null`. A missing sentence is shown as missing; a guessed one is shown as fact.
- **At most 400 characters** per field, one or two plain sentences.
- **A thread's `title` is a headline**: subject first, past tense, at most 80 characters, naming
  the thing a reader knows ("Playbooks were built end to end", "Intent routes were renamed to
  work-items", "get_board_tree lists one level at a time"). Never the scope or node name alone,
  never "Various fixes"; null beats a guess.
- **A rule's `title` is a headline**, not a sentence: the hub shows it after the app's name. At most
  60 characters, past-tense verb first, no subject, naming the thing (table, endpoint, resource)
  from the key names and files — never a count or the rule's category. "Dropped the change_ledger
  table", "Added change-period read endpoints", "Moved images to a private ECR registry"; not
  "Schema changed", not "3 tables changed". Null beats a guess, as for `what`.

## 3. Send it

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-changes.js --send <draftPath>
```

The CLI validates every period against the wire schema (a period that fails is dropped alone and
named), strips the working material, sends the rest in batches, and prints the server's outcome
per period — `recorded`, `skipped` (a closed period it already had) or `dropped` (with its
reason). Print `display` verbatim. On `changes: "sent"` the draft is deleted and
`.provenmap/changes/state.json` records the run (what `/status` shows). On `changes: "unsent"` a
batch did not land: relay `detail`; the draft is kept, and `--send` can be retried — the periods
already recorded are skipped on the retry.

## The closing hint

`/sync` and `/analyze` end with one line when closed periods are not recorded yet:
`node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-changes.js --check` makes one context call and answers
`{ missing, display }`; print `display` when it is non-empty, and nothing otherwise.

## Limits to say plainly when asked

A period is this plugin's account of git: it sees the bound branch, from the clone it ran in. A
rebase moves commits between periods; a squash merge hides the co-authors the squash dropped. A
shallow clone that does not reach a period's start marks it `truncated`. A quiet branch's
stretch is recorded, but ProvenMap's diary opens on the recent window: older periods are reached
by widening it. Services are mapped with
today's analysis; a path no node owns is counted as unmapped. Agent recognition is a fixed list of
commit identities. Prose exists for the periods the budget reached; older periods show facts
without sentences. A thread is a grouping by scope or node, not by intent: two pieces of work
under one scope are one thread. No per-person counts anywhere; contributors are listed
alphabetically.
