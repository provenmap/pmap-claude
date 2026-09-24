# ProvenMap Connect (retired)

**This plugin has moved into [ProvenMap Code](https://provenmap.com) (`pmap-code`).** Grounding — mirroring an architect-authored board, linking its nodes to this repo's documents, reporting drift when a document changes underneath a citation — is pmap-code's `/ground` command now. It reads the same `.provenmap/` state this plugin wrote, so nothing needs migrating.

## What to do

Install **pmap-code** from the same ProvenMap marketplace this plugin came from (`/plugin install pmap-code@provenmap` on Claude Code; pick it from `/plugins` on Codex), then restart Claude Code.

Then run `/ground` in this repo and uninstall `pmap-connect`. This plugin ships three commands (`/start`, `/help`, `/update`) that say exactly this, and nothing else; it receives no further updates.

## License

BUSL-1.1
