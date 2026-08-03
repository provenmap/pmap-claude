---
category: explore
description: "Explore · Ask the architecture a question — get a slug-grounded answer, or a drawn context board when the answer is a subgraph"
argument-hint: "[board-slug] <question>"
allowed-tools: AskUserQuestion, mcp__plugin_pmap-architect_provenmap__*
---

Answer one architecture question by reading only what the question needs — no full orientation.
Method (question-scoped reading, the answer-mode heuristic) lives in **board-reading**; load it
plus **architect-core**.

## Workflow

1. **Resolve the board** — argument, session board, or `get_board_tree` + AskUserQuestion.
2. **Answer in prose (default)** — pick the analysis pattern, read the needed slices, follow
   `childBoardSlug` when the answer lives a layer down, cross-board via the tree. Answer
   slug-first, lead with the direct answer.
3. **Escalate to a drawn answer when the answer IS a subgraph** (board-reading's heuristic:
   traces, cross-app flows, >~5 elements + relationships). Offer once per session
   (AskUserQuestion), remember the preference. On yes: `create_context_board` → draw the
   answer-subgraph → hand back the board slug + a prose précis. At the end of the session,
   clean up with `delete_context_board` for boards this conversation minted — **never**
   `discard_write_session` (that reverts the architect's whole working copy, not just the
   canvas). Tool absent (older server) → `create_insight` with `scope.elements`; never fake a
   board.
4. **Substantial analysis** → offer to record it (`create_insight`) so it isn't lost; name
   `/assess` for a structured review.

## Failure branches

- Tools missing / connection errors → `ProvenMap not configured — run /login (browser) or /configure (manual) first`
- 401 → `Your ProvenMap architect token was rejected — run /login to reconnect`
- Empty root → nothing to interrogate; offer `/setup-workspace`.
