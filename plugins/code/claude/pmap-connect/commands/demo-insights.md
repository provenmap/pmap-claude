---
category: map
description: "Map · Generate a few demonstrative, path-rich insights that showcase the insights feature"
argument-hint: "[count] [--board <slug>] [focus prompt]"
allowed-tools: Read, Glob, Grep, Write, Bash(node:*), AskUserQuestion
---

**Demonstrative** insights: multi-node, edge-grounded paths. Read `${CLAUDE_PLUGIN_ROOT}/knowledge/demonstrative-insights/SKILL.md` first.

### Step 0: Prerequisites

Read `boardSlug` from `.provenmap/config.json`, and any layer boards from `.provenmap/boards/manifest.json`:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-insights.js --list-insight-skills --board-slug <boardSlug> --domain connect
```

Exit codes:

- **1** → not configured: **connect-now offer** (below)
- **2** → "No board data found — run `/sync` first"; stop
- **3** → stop, report `error`; `errorType: "auth_invalid"` → **connect-now offer**
- `featureAvailable: false` → "No insight skills available for this account"; stop
- empty `skills` → "No insight skills configured — contact your workspace admin"; stop

### Step 1: Arguments

From any arguments with this request: leading integer = insight count (default **3**, clamp **2–4**); `--board <slug>` = target board (default Step 0's `boardSlug`); rest = optional focus theme.

### Step 2: Select skills

Pick `count` path-friendly skills, each a different path shape and polarity, per *Selecting the skills*. One sentence why each, then:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-insights.js --get-insight-skill <skill-slug>
```

### Step 3: Context pack

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-insights.js --build-context --board-slug <board> --demo --out .provenmap/insights/<board>.context.json --summary --domain connect
```

Read the pack back — the path ground truth: every step must traverse a real `pack.edges` edge. On a non-zero exit, use the fallback in *The context pack*.

### Step 4: Author insights

One push payload per skill, per *Assembling the payload*.

### Step 5: Validate and push

Write each payload to a temp file:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-insights.js --save-insight /tmp/insight-<slug>.json --board-slug <board> --demo --require-pack --push --host claude --domain connect
```

`--demo` makes the demo gates hard failures. On **exit 3** read `validationErrors[]`, fix the temp file, retry; `warnings[]` (exit 0) don't block.

### Step 6: Summary

Print a row per skill (polarity, findings, trail stops, status), say the board is ready to share, and name the `replace` vs `append` skills.

## Error Handling

Skill with no instructions → skip and report. Failed push or dead endpoint → save locally: "Saved locally — push failed: <error>".

### Connect-now offer

Used whenever ProvenMap is not configured or the credentials were rejected (`errorType: "auth_invalid"`). Ask with **AskUserQuestion** — "Connect to ProvenMap now?" (**Connect now** / **Not now**):

- **Connect now** → run the browser login here, printing each JSON `display` verbatim **in your reply** (the Bash output panel is collapsed for the user): `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-login.js --start`, then `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-login.js --poll --host claude --domain connect` (generous Bash timeout, e.g. 250s). On `status: "complete"`, resume this command from the step that failed; anything else — stop, the display explains.
- **Not now** → stop with the canonical message: "ProvenMap not configured — run `/login` (browser) or `/configure` (manual) first" (or, when credentials were rejected: "Your ProvenMap credentials were rejected — run `/login` to reconnect").
