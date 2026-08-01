# ProvenMap Architect

Architect workbench for ProvenMap boards, running in Claude Code. Explore the board graph,
review insights, and author intents — living specs — with the platform keeping governance: **writes
gather in your working copy**, and committing mints a reviewable plan (one intent per governed
app) in ProvenMap — never direct truth.

Where the ProvenMap code plugins serve developers (analyze a codebase or document set → push
boards → implement intents), this plugin serves **architects**: the people reasoning over boards,
deciding what the architecture should become, and turning findings and documents into work.

## Install

Add the ProvenMap marketplace once, then install the plugin:

```bash
/plugin marketplace add provenmap/pmap-claude
/plugin install pmap-arch@provenmap
```

Restart Claude Code so the commands load. Scope the install with `--scope user` (default), `--scope project`, or `--scope local`. Claude **Cowork** installs from the same marketplace.

## Connect

The plugin talks to the ProvenMap **MCP server** with a workspace-scoped bearer token
(`ck_mcp_live_…`) — no repo binding, no project files:

1. Mint a token in ProvenMap (**Settings → MCP access tokens**): workspace, scope (`read` or
   `read_write`), optional board-subtree restriction.
2. Set it as `PMAP_MCP_TOKEN` in your environment and restart the session
   (`/pmap-arch:configure` walks through it; the token never transits the chat).
3. Verify with `/pmap-arch:status`.

## Commands

| Command | What it does |
|---|---|
| `/pmap-arch:start [ask]` | **Start here** — reads your real state and names the next step; routes any open-ended ask |
| `/pmap-arch:setup-workspace` | Bootstrap an empty workspace: estate interview → landscape → app boards → binding handoff |
| `/pmap-arch:new-app <idea>` | Plan a new system on the landscape: grill, place, sketch the target, draft the founding intent |
| `/pmap-arch:author-intent [slug]` | Guided intent authoring: context pull, the grill, a well-grounded draft intent |
| `/pmap-arch:adopt-adr` | Adopt a decision: durable record + compliance review + per-app remediation intents |
| `/pmap-arch:intents` | Turn anything into governed, well-anchored work; manage the queue |
| `/pmap-arch:ask-board <question>` | Ask the architecture a question — slug-grounded answer or highlighted subgraph |
| `/pmap-arch:assess` | Structured review: frame, sweep, defend findings, record the run |
| `/pmap-arch:insights` | Review insight runs; promote reviewed findings into draft intents |
| `/pmap-arch:board [slug]` | Work a board conversationally — portfolio view on the landscape, canvas elsewhere |
| `/pmap-arch:hub` | The command center, attention-first: what needs you, then the portfolio |
| `/pmap-arch:login` `:configure` `:status` `:logout` | Connection lifecycle (MCP token) |
| `/pmap-arch:help` `:update` | Command reference · plugin update |

## How governance works

Reads are unrestricted within the token's workspace (and board restriction, if set). The token
acts as **you**: writes join your one workspace working copy — the same session the ProvenMap
web app shows — where they stay undoable until you decide. **Committing** the working copy
mints a reviewable plan: one `board_diff` intent per governed app, named by your commit
message; **discarding** reverts everything since the last decision. Rejecting a minted intent
reverts what it staged. Architects propose; the platform review decides.

## Working with documents

Drop a PRD, RFC, or design doc into the session and ask for it to become board work: the plugin
reads it directly, drafts intents anchored to the right board elements, and everything
still gathers in your working copy for a reviewed commit. Documents bound to a board are also
readable server-side.
