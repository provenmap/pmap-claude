# Prov Architect

Architect workbench for ProvenMap boards, running in Claude Code. Explore the board graph,
review insights, and author intents and specs — with the platform keeping governance: **every
write lands as a draft** (a revertible intent) reviewed in ProvenMap, never as direct truth.

Where the ProvenMap code plugins serve developers (analyze a codebase or document set → push
boards → implement intents), this plugin serves **architects**: the people reasoning over boards,
deciding what the architecture should become, and turning findings and documents into work.

## Install

Add the ProvenMap marketplace once, then install the plugin:

```bash
/plugin marketplace add provenmap/prov-claude
/plugin install prov-architect@provenmap
```

Restart Claude Code so the commands load. Scope the install with `--scope user` (default), `--scope project`, or `--scope local`. Claude **Cowork** installs from the same marketplace.

## Connect

The plugin talks to the ProvenMap **MCP server** with a workspace-scoped bearer token
(`ck_mcp_live_…`) — no repo binding, no project files:

1. Mint a token in ProvenMap (**Settings → MCP access tokens**): workspace, scope (`read` or
   `read_write`), optional board-subtree restriction.
2. Set it as `PROV_MCP_TOKEN` in your environment and restart the session
   (`/prov-architect:configure` walks through it; the token never transits the chat).
3. Verify with `/prov-architect:status`.

## Commands

| Command | What it does |
|---|---|
| `/prov-architect:board [slug]` | Orient on a board, then work it — questions, analysis, governed edits |
| `/prov-architect:hub` | Workspace dashboard: board tree, intent counts, latest insights, binding health |
| `/prov-architect:insights` | Review insight runs; promote reviewed findings into draft intents |
| `/prov-architect:intents` | List, author, and manage intents (drafts for in-platform review) |
| `/prov-architect:specs` | Draft specs (from conversation or documents); promote approved requirements |
| `/prov-architect:login` `:configure` `:status` `:logout` | Connection lifecycle (MCP token) |
| `/prov-architect:help` `:update` | Command reference · plugin update |

## How governance works

Reads are unrestricted within the token's workspace (and board restriction, if set). Writes are
scoped by the token and **staged**: a change to a governed board mints a reviewable intent —
delete the intent to revert the change. Rejecting an intent reverts what it staged. Architects
propose; the platform review decides.

## Working with documents

Drop a PRD, RFC, or design doc into the session and ask for it to become board work: the plugin
reads it directly, drafts specs/intents anchored to the right board elements, and everything
still lands as drafts for review. Documents bound to a board are also readable server-side.
