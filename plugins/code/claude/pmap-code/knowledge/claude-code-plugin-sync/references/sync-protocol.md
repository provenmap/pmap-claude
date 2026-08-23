# Sync Protocol

Documents the sync workflow used by `pmap-sync.js` to push analysis data to ProvenMap.

## Smart Sync (Recommended)

Use `--smart-sync` for diff-based syncing. It pulls server state and computes the diff that drives the sync report and the post-push confirmation; the push itself always carries the full board.

**Workflow:**
1. **Get archetypes** (cached, 1-hour TTL) — validate archetype names in transformed data
2. **Pull server elements** (if stale or forced) — fetch current state from `GET /code-plugin/elements`
3. **Track local elements** — hash each node/edge and store in the element store file
4. **Compute diff** — compare local hashes against server state to find new, changed, unchanged, and server-only elements
5. **Push** — send the full board inventory via `POST /code-plugin/push` (see *Push Mode* below; the diff is for reporting, not for trimming the payload)
6. **Update store** — mark pushed elements as synced

**Diff result fields:**
- `newNodes` / `newEdges` — elements not on server
- `changedNodes` / `changedEdges` — elements with different content hash
- `unchangedNodes` / `unchangedEdges` — identical to server
- `serverOnlyNodes` / `serverOnlyEdges` — on server but not in local analysis

## Legacy Sync (Direct Push)

Without `--smart-sync`, all elements are pushed every time:
1. Load config and analysis data
2. Transform to ProvenMap format
3. Validate archetypes against server
4. Push all nodes and edges

## Dry Run

Use `--dry-run` to validate and transform without pushing. Works with both smart sync and legacy modes.

## Force Options

- `--force-pull` — Always fetch server elements, ignoring the staleness threshold (5 min default)

## Push Mode

Every push is a **replace**: the full board inventory is transmitted and the server deletes the
elements this plugin authored that the latest analysis no longer contains (architect-created
elements are never touched). The latest analysis *is* the board — there is no merge mode.

## Error Handling

- **Config errors** (exit 1): Missing or invalid configuration file
- **Analysis errors** (exit 2): Missing or unparseable analysis JSON
- **Validation errors** (exit 3): Invalid slugs, names, or archetype names
- **API errors** (exit 4): Network failures, auth errors, push errors

Auth failures (401/403) always fail immediately. Other server errors during pull are gracefully degraded (sync continues with local-only data).
