---
category: connect
description: "Account · Disconnect this project from ProvenMap (clears local credentials)"
argument-hint: "[--purge]"
allowed-tools: Bash
next-steps: none
---

Disconnect this document repo from ProvenMap: the credential is revoked on
the server (best-effort — an old or unreachable server never blocks the local
clear) and removed from `.provenmap/config.json`. By default the board, branch,
and server settings are kept so a later `/login` reconnects in one confirm;
`--purge` resets the whole config to its defaults.

## Workflow

1. Run the logout phase (add `--purge` only if the user asked for a full reset):

   ```bash
   node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-login.js --logout
   ```

2. Print the JSON `display` field **verbatim in your reply** — never reformat,
   summarise, or rebuild it; the Bash output panel is collapsed for the user, so
   write it out in full. It already covers what was cleared, whether the server
   revoke went through, and the next command (`/login`).

3. On a non-zero exit, print `display` verbatim in your reply and stop.
