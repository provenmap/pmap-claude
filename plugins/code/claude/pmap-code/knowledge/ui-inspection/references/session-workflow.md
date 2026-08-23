# Running an inspection session — steps 3–7

The `/inspect` command holds the entry steps (`--start`, `--poll`) and the preflight gate. This
reference holds everything after the picks are in: interpreting the session, deciding what it
becomes, executing that decision, and the two optional pushes — how a session becomes local
evidence for revising and implementing intents. Follow it exactly: every call, flag, branch, and
confirm below is part of the command's contract.

Print every `display` field **verbatim** — never reformat, reorder, or summarise. Branch only on
exit codes and named JSON fields.

## Step 3 — Interpret the session

Read `${CLAUDE_PLUGIN_ROOT}/knowledge/ui-inspection/SKILL.md` and follow it.

The `display` summary lists every selection and annotation with screenshot paths (relative to
`sessionDir`). Read the selection clips (and the annotated composite when annotations exist), then
give the user a concise readout: which components were picked, on which routes, what the notes ask
for, and what code each pick maps to — the skill defines the mapping order (`sourceFile` →
component name → correlated `ui.page` files → selector/text grep).

If identity came back mostly floor-level and the user wants exact file:line, offer the
`code-inspector-plugin` setup from the skill's `references/component-identity.md`.

## Step 4 — Decide what the session becomes

Ask with **AskUserQuestion**: "What should this session become?"

- **Propose new intent (Recommended)** — when the notes describe changes to make. The default is
  ONE intent for the whole session; offer a split-by-page option in this same question ONLY when
  captures span multiple routes AND the notes describe unrelated concerns.
- **Attach to the intent I'm working on** — when the session is evidence for an already claimed
  intent.
- **Keep locally** — stop after the readout; name `/intents` as the next command.

Capture (steps 1–4) is local and deliberately works without credentials. The command's preflight
gate (Step 4.5) applies only from here on, where `/inspect` first talks to the server.

## Step 5 — Execute the decision

**Propose.** Draft the payload per the ui-inspection skill: name = the ask in imperative form;
directive references the component identity + the evidence; anchors from the correlated
`pageAspectSlug` as `{elementType:"aspect", aspectKind:"ui.page", slug}` or `boardNodeSlug` as
node anchors; include `inspectionSessionId`. Write it to `<sessionDir>/propose.json`, then:

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-intents.js --propose --payload <sessionDir>/propose.json
```

Print `display` verbatim. Exit 1 with a config error triggers the command's **connect-now offer**;
exit 3 / `notAvailable` → print `display` verbatim and stop.

**Attach.** If exactly one local intent is `in_progress`, use it; otherwise run
`node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-intents.js --list`, print `display` verbatim, and ask the user
which intent. Then:

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-intents.js --attach-inspection <intentId> --session <sessionId>
```

Print `display` verbatim.

## Step 6 — Offer the server push

After a successful propose or attach, and only when ProvenMap is configured. Tell the user exactly
what would leave the machine — the environment name and the captured URLs from the session summary
— and ask (a single confirm: part of a prior AskUserQuestion or its own): push the capture
screenshots + selection/annotation metadata to the intent so the architect sees them?

On yes:

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-intents.js --push-inspection <intentId> --session <sessionId>
```

Print `display` verbatim. `notAvailable: true` is a soft stop — the display already explains that
the session stays linked locally. On no: nothing uploads; the local link is enough for the
developer-side flow.

## Step 7 — Offer the page-capture push

Independent of step 6, when the session summary shows captures correlated to a `ui.page` and
ProvenMap is configured: keeping the board's page visuals fresh means pushing each correlated
page's clean screenshot + element map as its server-side visual reference. Name the environment +
URLs, confirm once for all pages, then:

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-inspect.js --push <sessionId>
```

Print `display` verbatim (`notAvailable` is a soft stop). Fold this confirm into the step-6
question when both apply — one question, two checkboxes, never two rounds.

## Other modes

- **Agent-driven capture** (no human, headless — also the fallback in cloud/headless sessions
  where no local browser can open): `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-inspect.js --capture <url>`
  screenshots a page and records an element map. Print its `display`, then Read the screenshot if
  the task needs it.
- **Session inventory**: `--list` and `--show <sessionId>` — print `display` verbatim.
- **Abandon**: `--stop` kills the session's browser and cancels it.

## How the picking browser behaves

The `--start` display already tells the user this; use it when they ask mid-session.

- The browser starts in **Browse** mode — the page is fully interactive (log in, navigate) and
  nothing is captured. In the toolbar, **Pick** arms click-to-pick and **Annotate** arms
  drag-a-box (each box takes a required note); clicking the armed mode again, or pressing **Esc**,
  returns to Browse. The toolbar can be dragged out of the way (grab it anywhere except a button);
  its position, picks, and annotations survive same-origin page navigations within the session.
- The inspection browser uses a dedicated profile (no daily-browsing state). Sessions are local
  files by default — nothing leaves the machine unless the user explicitly pushes (steps 6–7), and
  each push names exactly what it would send before it sends it.
