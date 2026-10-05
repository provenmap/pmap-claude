# The sync digest — what a push says changed

A sync that follows a re-analysis carries a **sync digest**: one small record of what changed since
the last sync. A `/sync` sends **one** digest however many boards it pushes, on its first push; an
`/adopt` sends one with its ingest. `pmap-digest.js` computes every fact in it — the commits, who was involved and
with which coding agent, the services touched, a yes or no for each of the organization's change
rules — and leaves the sentences to you. `/sync` and `/adopt` both run the three steps below; their
own references say where.

The digest is **advisory**. Nothing in these steps may stop, delay or fail a push: when a step has
nothing to give, the push goes without a digest, exactly as it did before digests existed.

## 1. Compute the draft

For a structural sync, **once per sync**, before its first push, naming every board the sync
pushes, in push order, shallowest first:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-digest.js \
  --boards <board-slug>,<board-slug>,... \
  --model <the model you are running as> \
  --host claude --domain code
```

It diffs each board against the server and merges what it finds: an element drawn on several boards
counts once, and one that left a board for another counts as modified.

For an adopt, once per aspect family, after the payload is written and before `pmap-adopt.js`:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-digest.js \
  --board-slug <board-slug> \
  --aspect <kind> --payload <payload-file> --mode <mode> \
  --model <the model you are running as> \
  --host claude --domain code
```

`--model` is the model id you know yourself to be; omit the flag when you do not know it. The CLI
**always exits 0**. Branch on `digest` in its JSON:

- **`digest: "none"`** — there is no digest for this push. Run the push **without** `--digest` and
  say nothing about it to the user; none of the reasons is an error. `reason` is one of
  `no_reanalysis` (none of the boards was analysed, nor the payload extracted, since the last sync
  from this checkout),
  `older_server` (this ProvenMap server predates sync digests) or `failed` (`detail` says what; the
  push is unaffected).
- **`digest: "written"`** — the draft is at `draftPath`. `basis` is `first-map` (a first mapping:
  everything in it was already in the code, so there is no change to describe) or `change`.
  `fill` lists every sentence left for you; when it is empty, skip to step 3.

## 2. Write the prose

Read the draft. It has two parts: **`digest`**, which is what gets sent, and **`working`**, which
never leaves this machine. Each entry of `fill` is one sentence for you to write: `n` is its number,
`about` says who or what it is about, `read` is where its material sits in the draft.

- **A contributor's summary** (`path` ends `.summary`) — what this person, and the agent beside them
  when there is one, worked on since the last sync, from the commit messages at
  `working.contributors[i].commits`.
- **A rule's `what`** (`path` ends `.what`) — what the change is, for a rule answered yes.
  `working.rules[i]` carries the rule's `question`, its `describe` (what to say about a yes; follow
  it) and the names behind the answer: `added` / `modified` / `removed` elements, or the changed
  `files`.

Write the sentences through the CLI, one `--prose` per `fill` entry, each under its number:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-digest.js --fill <draftPath> \
  --prose 0="<sentence for fill entry 0>" \
  --prose 1="<sentence for fill entry 1>"
```

Leave out the `--prose` of an entry you have nothing sound to say for: it stays `null`. Keep each
sentence free of double quotes, backticks and `$`, which the shell would read. The reply lists what was `written`
and what is `left`; `digest: "unfilled"` means nothing was written, and the draft still goes to the
push as it is.

**Never edit the draft file yourself.** Everything in `digest` but these sentences is a computed
fact — a name, a count, a yes or a no — and the CLI is the only writer of both.

### Writing rules

These hold for every sentence in a digest:

- **Name an area of work, not an amount.** Say which part of the system and what was done to it
  ("Reworked order validation and added the refund endpoints."). **No counts** — no numbers of
  commits, files, lines or elements, and no "most", "few", "several".
- **No judgement words.** Not "great", "minor", "major", "messy", "quick", "significant". Describe;
  do not grade.
- **Never rank or compare people.** No "led", "main contributor", "also helped", "more than". Each
  contributor's sentence stands alone and would read the same if it were the only row.
- **Names, never addresses.** No email address anywhere in a digest.
- **Null beats a guess.** When the messages or names say too little to write something sound,
  leave the field `null`. A missing sentence is shown as missing; a guessed one is shown as fact.
- **At most 400 characters** per field, one or two plain sentences.

### The push sentence

The same working material is the source for the push's `--summary`: one plain sentence, at most 200
characters, on what this push changes for this board — what it gained, lost or rewired, naming the
elements, with no counts ("Gained a refund flow: refund endpoints on Orders and a call to Payment
Processor.").
Write it from that board's entry in `working.boards` (what its push adds, changes and removes; a board
with no entry changes nothing) and the commit messages in `working.contributors`. For an adopt, use
the names in `working.rules`. On a
`first-map`, say what was mapped. With no draft (`digest: "none"`), write a summary only from what
this session itself changed; when you do not know what changed, omit the flag — never guess.

## 3. Send it

Pass the draft with **`--digest <draftPath>`** (`pmap-sync.js` or `pmap-adopt.js`), next to
`--summary`, on **one push**: a sync's first push, or the adopt. The CLI validates the draft, strips
`working`, and sends the digest with that push. The other pushes of the sync go without the flag.

Its JSON then carries `digestReport`:

- `sent: true` — the digest rode the push; the draft file is deleted, so no other push can carry it.
  Nothing to report.
- `sent: false` with `reason: "dry_run"` — a dry run sends no digest. Nothing to report.
- `sent: false` with `reason: "invalid"`, `"wrong_board"` or `"unreadable"` — the draft was dropped
  and **the push went ahead without it**. Say so in one line with the `detail`, and do not retry the
  push for the digest's sake.
- `sent: false` with `reason: "not_pushed"` — the push itself did not land; its own `error` is what
  to report. The draft is kept: pass it to the sync's next push, or to the adopt's retry.
