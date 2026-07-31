# Anchor recording — verbs, questions, note composition

<!-- Mirrored from platform's web Intent Editor so MCP-authored intents render native
     and read the same to implementers:
       apps/web/src/features-ui/work-board/intent-editor/intent-editor-verbs.ts (questionFor)
       apps/web/src/redux/store/slices/artifacts/intent-builder/v2/materialize-intent.ts
         (VERB_META, composeAnchorNote, composeDirective, caps)
     Keep in lockstep with those files — format parity is the point. -->

## The verb vocabulary (VERB_META, verbatim)

| Verb | Chip label | Directive heading |
|---|---|---|
| `change` | Change behavior | Changes |
| `add` | Add capability | Additions |
| `fix` | Fix an issue | Fixes |
| `remove` | Remove | Removals |
| `investigate` | Investigate | Investigations |

## The question per element (questionFor, verbatim)

Ask the platform's own deterministic question for each attached element:

| Element | Question |
|---|---|
| changed element (role `changed`) | Why did you change `<label>`? |
| `layer` | What in the `<label>` layer? |
| `node` | What should happen to `<label>`? |
| `edge` | What about the `<label>` connection? |
| `aspect` | What should change in `<label>`? |

(Anchors you author are always role `context` — `changed` anchors come only from the **commit
classifier**, which derives them from the session's net diff when the working copy commits.
Element notes for changed anchors are therefore authored at commit time; over MCP the commit
`summary` carries the per-element "why" in prose — `elementNotes` is HTTP/app-dialog-only.)

## Note composition (composeAnchorNote)

The note is `"<Verb label>: <answer>"` — e.g. `Change behavior: collect the new consent field
before submit`. Answer without a verb → the answer alone. Verb without an answer → the label
alone. Cap: 500 chars. One sentence is the norm — the implementer reads it.

## Directive composition (composeDirective)

The directive groups anchors by verb in canonical order (Changes → Additions → Fixes →
Removals → Investigations), one bullet per anchor:

```
Goal: <description, when present>
**Changes**
- **<Label>** (<noun>) — <answer>
**Removals**
- **<Label>** (<noun>) — <answer>
**To clarify**
- **<Label>** (<noun>)
```

The noun is the element type — `connection` for edges, the `aspectKind` for aspects, else the
elementType. Anchors with no verb collect under **To clarify** rather than vanishing. Caps:
name 100, description 500, directive 4000.

## Remove is special

In the platform editor, a `remove`-verbed anchor becomes a machine-checkable REMOVE claim (a
later code push *proves* the element went away). Over MCP you cannot mint that claim on a
directive intent — for a pure removal, prefer making the actual board edit (`delete_nodes` /
`delete_edges`; committing the session mints a `board_diff` intent with the concrete, provable
diff) over describing the removal in prose.
