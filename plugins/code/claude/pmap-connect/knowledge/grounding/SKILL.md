---
name: grounding
user-invokable: false
description: How /sync decides which board nodes are substantiated by which repo documents — the citation quality bar, drift handling, and per-genre reading priority. Use during /sync's evidence-proposal step, or whenever judging if a document backs a node's claim. Defines what counts as substantiation, anchor/excerpt discipline, and how to treat drifted or unlinked evidence.
metadata:
  author: ProvenMap
  version: 0.1.0
---

# Grounding — Evidence Links Between Board Nodes and Documents

`/sync` calls this skill in its evidence-proposal step, after `--pull` mirrors the board and inventories the corpus. The CLI already did the mechanical part (mirroring, hashing, diffing); this skill owns the judgment call underneath it — deciding **which documents substantiate which nodes**.

## Building the link set

`--pull` hands you two objects: `evidence` (`linkCount`, `drifted[]`, `missing[]`,
`unlinkedNodes[]`) and `context` (`nodes[]`, `files[]`, `links[]`, `capped`). The proposed set is
built from all four inputs:

1. **Keep fresh links as-is** — every link in `context.links` that is not also in
   `evidence.drifted` or `evidence.missing` is unchanged; carry its
   `nodeSlug`/`path`/`anchor`/`excerpt`/`docUrl` forward as-is, no need to re-read the document.
2. **Re-link drifted links** — for each entry in `evidence.drifted`, read the document at its
   `path` (its content changed since the citation was recorded) and apply *Drift handling* below.
3. **Propose links for `unlinkedNodes`** — for each node slug with zero evidence, search
   `context.nodes`/`context.files` for a document that genuinely substantiates its claim — read it,
   never link on filename alone. No candidate substantiates it? Leave it unlinked; report that in
   `/sync`'s closing report as a finding, not a failure — name the node and say why, because the
   push report never sees which nodes you chose not to link.
4. **Drop missing links** — omit anything in `evidence.missing` entirely; its document no longer
   exists in the corpus.

If `context.capped` is `true`, `context.files` only lists the first 500 of `corpus.files` — the
count still reflects the true total.

## What counts as substantiation

A link is justified when the document **states or specifies** what the node claims — not merely mentions its name in passing. "The Billing API section describes rate limits, retries, and the `/charges` endpoint" substantiates a `billing-api` node; a line that just says "see also the billing API" does not.

- **Read the document before linking.** Never link on filename, title, or path alone.
- **One node, a few strong links** beats many weak ones. A node with one link to the section that actually defines it is better grounded than five links to documents that merely reference it in passing — don't pad a node with tangential mentions.
- **Prefer the most specific anchor available** — a heading/section anchor over a whole-document link, a line-specific citation over a page-level one.
- **Excerpt ≤500 chars, quoted verbatim** from the document — never paraphrase, and never quote code (this connector grounds documents, not source).
- **No candidate substantiates the node? Leave it unlinked and say so.** An unlinked node is a finding — the architect's claim isn't backed by anything in this repo yet — not a failure of the run.

## Drift handling

`--pull`'s `evidence.drifted` / `evidence.missing` name which tracked links need attention this run:

- **Drifted** (the document's content hash no longer matches): re-read it at its current content. Still substantiates the claim? Refresh `anchor`/`excerpt` to match the current text. The claim moved elsewhere or was removed? Drop the link rather than leaving a stale citation.
- **Missing** (path no longer in the corpus): the document is gone — drop the link.
- Everything else in `context.links` is still fresh — carry it forward unchanged.

## Reading priority

Not every document is worth reading first. `references/linking-heuristics.md` has a genre table for prioritizing — a `Decision`-shaped node claim is more likely substantiated by an ADR than a runbook; a requirement-shaped claim by a spec than a meeting note — and a signal catalogue (links, anchors, definition language, citation phrasing) for recognizing real substantiation versus a passing mention once you're reading a candidate document.

## Output

The proposed set is written to `.provenmap/evidence-links.json` — never edit `.provenmap/boards/stores/*.evidence.json` directly; that file is the CLI's own store, rewritten only by `--push`.

```json
{ "links": [ { "nodeSlug": "billing-api", "path": "docs/billing.md", "anchor": "rate-limits", "excerpt": "…", "docUrl": null } ] }
```

You supply `nodeSlug`/`path`/`anchor`/`excerpt`/`docUrl` only — the CLI fills in `contentHash`
itself from a fresh read of the document at push time, so never compute or guess one.

When `--push` exits 3, the links file failed schema validation or an evidence path didn't resolve
in the document corpus; `validationErrors[]` names the exact field/path. Fix
`.provenmap/evidence-links.json` accordingly and retry the push once.
