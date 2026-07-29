---
category: author
description: "Author · WRITE-CAPABLE: List, draft, and promote board specs — the requirement layer upstream of intents"
argument-hint: "[board-slug] [spec-slug]"
allowed-tools: AskUserQuestion, Bash(node:*), mcp__plugin_prov-architect_provenmap__*
---

Work the specs of a board: read specs and their live delivery coverage, draft new ones (from the
conversation, a bound document, or a document shared in this session), and promote approved
requirements into draft intents. The funnel and drafting rules live in the **specs-authoring**
skill; load it (and **architect-core**) first.

## Workflow

1. **Resolve the board** (argument / session board / `get_board_tree` + AskUserQuestion).
2. **List** — `list_specs`: table of slug, name, status, requirement count.
3. **Branch:**
   - **Read** → `get_spec`; present narrative, requirements with acceptance criteria, and the
     live delivery coverage per requirement (unpromoted / in_delivery / delivered / attention)
     with linked intents. Answer "is it done?" from coverage, never from the spec text.
   - **Draft** → run the full authoring interview (specs-authoring, "The authoring
     interview" — the same workflow `/author-spec` enters): route per the taxonomy, surround
     pull, grill to the done-bar, then `create_spec` — staged as a **draft**; a human approves
     in the platform. For anything beyond a trivial capture, `/author-spec` is the front door.
   - **Promote** → only an APPROVED spec can be promoted. Group requirement slugs so each group
     is one coherent change (each group becomes ONE intent), confirm the grouping with the user
     (AskUserQuestion — this is a genuine decision point), then `promote_spec_requirements`.
     Report the minted draft intents by slug → `/intents` to open them.
4. Every stop names the next command.

## Failure branches

- Tools missing / connection errors → `ProvenMap not configured — run /login (browser) or /configure (manual) first`
- 401 → `Your ProvenMap architect token was rejected — run /login to reconnect`
- Promote refused (spec not approved) → say the spec must be approved in the platform first;
  point at `get_spec`'s status.
- Board not code-bound → the binding-gate narration (specs-authoring) — never a raw 400.
- Write tools absent → read-only token: continue with reads, note authoring needs `read_write`.
