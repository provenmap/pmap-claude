# ProvenMap Connect

The `pmap-connect` plugin — the grounding connector for [ProvenMap Portal](https://provenmap.com). Binds this document/knowledge repo to an architect-authored board; it produces no boards of its own. Its sibling, **ProvenMap Code** (`pmap-code`), analyzes a codebase into a board — Connect never analyzes a repo into a board; it grounds a board that already exists.

> The architect authors boards; Connect keeps them honest.

## Install

Add the ProvenMap marketplace once, then install the plugin:

```bash
/plugin marketplace add provenmap/pmap-claude
/plugin install pmap-connect@provenmap
```

Restart Claude Code so the commands load. Scope the install with `--scope user` (default), `--scope project`, or `--scope local`. Claude **Cowork** installs from the same marketplace.

> `pmap-connect` is the install id — everywhere else it's **ProvenMap Connect**.

## Configure

Two ways to connect this document repo to a board — both write the same `.provenmap/config.json`:

**Browser login (fastest):** run `/login`. It signs you in through the ProvenMap portal, lets you pick a workspace and a board that already has a Code Plugin binding, and writes the config for you — no tokens to copy. Re-running `/login` while connected just confirms the connection; `/login switch` (or `/configure`'s "change board" option) binds the project to a different board, and `/logout` disconnects it (clears the local credentials).

**Manual:** get a **Binding Token** and **API Secret** from the ProvenMap Portal (**Sources → Add Source → Board Builder** — saving generates the secret), then create `.provenmap/config.json` at the root of your document repo:

```json
{
  "bindingToken": "your-base64url-binding-token",
  "apiSecret": "ck_cp_live_your_api_secret",
  "boardSlug": "engineering-handbook-overview",
  "branch": "main",
  "baseUrl": "https://platform.provenmap.com/api"
}
```

| Field | Required | Notes |
|---|---|---|
| `bindingToken` | yes | Base64url `workspaceId::bindingId` from the portal. Sent as `X-CodePlugin-Token`. |
| `apiSecret` | yes | Must start with `ck_cp_live_`. Sent as `X-CodePlugin-Secret`. |
| `boardSlug` | yes | Target knowledge board. `/configure` can discover and write it for you. |
| `branch` | yes | For git-tracked docs, must match the binding (or `/sync` returns `400 Branch Mismatch`). |
| `baseUrl` | no | Override for self-hosted (default `https://platform.provenmap.com/api`). |
| `excludePaths` | no | Paths skipped during the corpus scan (e.g. `node_modules`, build output). |
| `includeSourceReferences` | no | Attach document path/anchor + excerpt to synced nodes/edges (default `true`). |

Run `/configure` to validate the config, test the connection, and add `.provenmap/` to your `.gitignore`. Credentials live only in this file — never logged, and sent only to `platform.provenmap.com`.

> **Testing against a non-production server:** set `PMAP_BASE_URL` (or pass `--base-url` to the CLI scripts) to point every command — including `/login`'s device handshake — at a staging or local API. The browser login and app URLs then follow from that server's configuration, so nothing is pinned to production. A successful `/login` writes the URL it ran against into `.provenmap/config.json`, so the repo stays on that server without the env var; when both are set, `PMAP_BASE_URL` wins.

## What grounding does

Connect has no analysis brain of its own — the architect authors the board upstream in ProvenMap Portal. Connect's job is three duties, all run from `/sync`:

1. **Evidence** — maintains node ↔ document links between the authored board and this repo's documents: which document(s) substantiate each node's claim, down to an anchor and a quoted excerpt.
2. **Drift** — notices when a linked document changes (or disappears) underneath the board and reports it, so a citation never goes silently stale.
3. **Fulfillment** — beyond `/sync`, `/insights` runs server-defined analysis against the grounded board, and `/intents` implements architect-authored intents by editing this repo's documents directly.

## The `/sync` loop

`/sync` works from a cold start — a freshly installed, freshly connected repo has no prior state to depend on:

1. **Pull & inventory** — mirrors the authored board to `.provenmap/boards/`, inventories this repo's documents.
2. **Propose evidence links** — reads candidate documents and decides what substantiates each node (the `grounding` skill governs this judgment call — the citation bar, anchor/excerpt discipline, drift handling).
3. **Push** — replaces the binding's evidence set on the server.
4. **Report** — stored/removed/drifted counts, any nodes left unlinked, and the next command to run.

Run `/sync` again any time the documents change — it re-mirrors, re-diffs, and only asks you to look at what actually drifted.

## Commands

| Command | Description |
|---|---|
| `/start` | Reads this project's real state and tells you exactly what to run next |
| `/login` | Browser sign-in: pick a workspace + bound board, writes config automatically |
| `/configure` | Set up portal credentials manually, or switch to a different board |
| `/logout [--purge]` | Disconnect this repo from ProvenMap (clears local credentials) |
| `/sync [--board <slug>]` | Mirror the authored board, propose + push evidence links, report drift |
| `/insights` | List available insight skills and run one against the grounded board |
| `/insights <skill-slug>` | Run a specific insight skill directly |
| `/insights --all` | Run every available insight skill |
| `/intents` | Pull architect-authored intents for the board and pick one to implement |
| `/intents <intentId>` | Claim, implement, verify, and resolve a specific intent (write-capable — edits this repo's documents) |
| `/demo-insights [count] [--board <slug>]` | Seed the board with a few demonstrative, path-rich insights |
| `/skills [--status]` | Compile the platform's skill bundle into the repo — never overwrites local edits |
| `/status` | Show config state, mirrored board summary, and evidence sync status |
| `/help` | List commands grouped by lifecycle stage, with the plugin version |
| `/update` | Update this plugin to the latest published version for your host |

## Supported document formats

Automatically discovers documents anywhere in the repo tree (not just conventional folders like
`docs/` or `wiki/`) — it walks the whole project, skipping dot-directories, `node_modules`, and any
configured `excludePaths`, and recognizes any file whose extension matches a supported format:

| Format | Extensions | Typical content |
|---|---|---|
| **Markdown / MDX** | `.md`, `.mdx`, `.markdown` | Wikis, READMEs, RFCs, ADRs, design docs |
| **reStructuredText** | `.rst` | Sphinx / Python documentation |
| **AsciiDoc** | `.adoc`, `.asciidoc` | Technical manuals, books |
| **Plain text** | `.txt` | Notes, exports |
| **Wiki exports** | `.md` / `.html` | Confluence, Notion spaces |
| **PDF** | `.pdf` | Specs, policies (extractable text) |

## Requirements

- Node.js (for the bundled CLI scripts)
- A ProvenMap Portal account with a board already authored by an architect and bound via Board Builder
- A document repo in one of the supported formats (git recommended — pins the binding to a branch; branch checks never block when git isn't present)

## License

BUSL-1.1
