---
category: connect
description: "Account · Configure ProvenMap credentials and settings"
allowed-tools: Read, Write, Bash, AskUserQuestion
---

Manual ProvenMap setup — for CI, or when `/login`'s browser flow isn't available.
Config schema, credential source, and the rebind flow:
`${CLAUDE_PLUGIN_ROOT}/knowledge/provenmap-integration/SKILL.md`.

> **Security rule:** Never ask the user to paste `bindingToken` or `apiSecret` into the
> chat — they edit the file directly, then confirm.

## Step 1: Ensure the config file exists

No `.provenmap/config.json`? Create `.provenmap/` and write the settings skeleton from
the skill above (empty `boardSlug`, no credential fields).

If it exists, read it and continue — never overwrite the user's file. Either way, ensure
`.provenmap/` is in `.gitignore` (add it if missing) so credentials aren't committed.

## Step 2: Detect current state

`.provenmap/credentials.json` has both fields (or `PMAP_BINDING_TOKEN`/`PMAP_API_SECRET`
are set) → show the settings, secret masked (`ck_cp_live_****`), skip to Step 4. Else
Step 3 — and if `config.json` still carries `bindingToken`/`apiSecret`, say they are
ignored (credentials live in `credentials.json`) and to remove them.

## Step 3: Fill in credentials (in the file, not the chat)

Precondition: a source bound to a workboard in the ProvenMap UI.

Have the user write `.provenmap/credentials.json` (`bindingToken` + `apiSecret`, per the
skill) and set `branch` in `config.json` (must match the binding, default `main`). Then
**AskUserQuestion** to confirm — e.g. "Saved `.provenmap/credentials.json`?", options
**"Yes — verify now"** / **"Not yet"**.

- **Not yet**: stop — they can re-run `/configure` when ready.
- **Yes**: re-read it. Missing, empty or malformed (`apiSecret` must start with
  `ck_cp_live_`)? Name the field that is wrong and re-prompt. Else Step 4.

## Step 4: Verify credentials

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-archetypes.js --no-cache
```

- **Exit 0** → connection works; report the archetype count as confirmation.
- **Exit 1** → file problem; report the JSON `error` field, name the file and field to
  fix, re-verify.
- **Other non-zero** → API/auth failure; report the JSON `error` field. `errorType`
  `auth_invalid` means the credentials were rejected — have the user re-check
  `bindingToken`/`apiSecret` (or run `/login`), then re-verify.

## Step 5: Discover root board

After a successful connection test:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-boards.js
```

Find the root board (`isChildBoard === false`): **one** → set `boardSlug` to its slug;
**several** → ask the user which to use; **none** → warn them to create a board in the
ProvenMap UI first (config can still be saved, but `/sync` won't work until a root board exists). Write `boardSlug` into `.provenmap/config.json`, preserving the user's other fields.

## Step 6: Confirmation

Report complete: both file locations, connection details (URL, branch, root board
slug) with the secret masked, the test result, and that `.provenmap/` is gitignored.

## Reconfiguration

Already configured? Ask the user: switch board in the browser (rebind flow in the skill
above, or `/login switch`), edit fields then re-verify from Step 4, re-verify as-is, or
cancel and keep existing.

## Next step

Verified? Close with the Outcome — one next move with its reason, not the whole report:

**Outcome:** `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-status.js --brief --domain connect --command configure` → Done · Left · Next, per `${CLAUDE_PLUGIN_ROOT}/knowledge/outcome/SKILL.md`.
