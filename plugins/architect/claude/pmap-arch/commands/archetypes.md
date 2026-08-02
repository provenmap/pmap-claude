---
category: author
description: "Author · WRITE-CAPABLE: Review the archetype catalogue for a board kind, scan shared documents for gaps, and submit proposals for admin review"
argument-hint: "[board-slug] [code|knowledge] [gap material or paths]"
allowed-tools: AskUserQuestion, Bash(node:*), mcp__plugin_pmap-arch_provenmap__*
---

Catalogue gap analysis: hold shared material up against the org's live archetype catalogue, name
what it can't classify, and submit proposals for admin review. This is governance, not a gate —
no lock files, and nothing here blocks `/board`, `/new-app`, or any other command; the catalogue
widens on its own schedule. Load **architect-core** for the error vocabulary and formatting norms.

## Workflow

1. **Resolve the board** — argument, session board, or `get_board_tree('root')` + AskUserQuestion.
   This is the board `propose_archetypes` grounds the round on (its `boardSlug`, stamped onto
   every item's `sourceContext`) — pick the board the gap material actually concerns, not a
   default; a board-restricted token can only ground on boards inside its own subtree.
2. **Pick the catalogue** — the argument, or AskUserQuestion (`code` archetypes classify
   codebases/apps; `knowledge` classify documents/knowledge material) — then `get_archetypes`
   with that `kind` and render the current vocabulary compactly: name + one-line description,
   per row.
3. **The source gate** — the same hard rule as `/setup-workspace`'s Step 2 — the fork, the
   source gate, then the interview: never touch the filesystem, git state, or any repository
   unprompted. Material arrives one of three ways — **describe it in conversation** · **name
   paths to scan** (repo inventories only, the architect names the paths first, then
   `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-arch.js --scan-repos --paths <p1,p2,...>`) · **share
   documents** — scan output is interview *candidates*, never conclusions. A proposal needs
   evidence from real material; no gap-hunting from vibes.
4. **Gap analysis (judgment)** — compare the material against the rendered catalogue: a
   recurring shape with no fit archetype becomes a `proposed` entry (name, `visualPrimitiveType`,
   description — a `proposed` item has no separate rationale field, so cite the material's
   evidence in `detectionRules`, never drop it); an existing archetype that's a poor fit becomes
   an `improvements` entry (existing name, the suggested change, the rationale). Grill vague
   candidates before they're proposed — would an admin reviewing this know what to do with it?
5. **Confirm & submit** — show the full proposal set (proposed + improvements) and
   AskUserQuestion to confirm before anything leaves the session. Then ONE `propose_archetypes`
   call with the resolved `boardSlug`, `catalogueKind`, and the two arrays. Say plainly that
   this is passive review: proposals land **pending admin review** in the platform, never a live
   catalogue change.
6. **Report** — the tool result's accepted counts, naming any `rejected` items (duplicates of
   an existing name). Nothing to wait on locally — the admin reviews in the platform; rerun
   `/archetypes` for the next gap round whenever new material surfaces.

## Failure branches

- Tools missing / connection errors → `ProvenMap not configured — run /login (browser) or /configure (manual) first`
- 401 → `Your ProvenMap architect token was rejected — run /login to reconnect`
- Write tools absent → read-only token: render the catalogue and the gap analysis as markdown;
  name the `read_write` requirement — nothing is submitted.
