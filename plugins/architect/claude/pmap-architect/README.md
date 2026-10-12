# ProvenMap Architect (renamed)

**This plugin is [ProvenMap Workspace](https://provenmap.com) (`pmap-workspace`) now.** Same commands, new name: it works across your whole ProvenMap workspace, beside ProvenMap Code's one repo. Your login carries over, so there is nothing to reconnect.

## What to do

Install **pmap-workspace** from the same ProvenMap marketplace this plugin came from (`/plugin install pmap-workspace@provenmap` on Claude Code; `codex plugin add pmap-workspace@provenmap` on Codex; **Customize → Plugins** in Cowork), then restart Claude Code and uninstall `pmap-architect`.

Every command keeps its name under `/pmap-workspace:`, except `/setup-workspace`, which is `/pmap-workspace:setup` now. This plugin ships three commands (`/start`, `/help`, `/update`) and a session-start line that say exactly this, and nothing else; it receives no further updates.

## License

BUSL-1.1
