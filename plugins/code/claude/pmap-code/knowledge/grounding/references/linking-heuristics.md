# Linking Heuristics — Genre Priority & Signal Catalogue

Salvaged from the retired document/knowledge producer's pattern catalogues, rewritten for **matching** an existing document to a node the architect already authored — not for producing nodes from scratch. See [`../SKILL.md`](../SKILL.md) for how these feed the evidence-proposal step.

## Genre detection (which documents to read first)

A node's claim is usually substantiated by one genre of document more than others. Use these signals to pick reading order among `context.files` candidates before reading everything:

| Genre | Path signals | Front-matter / heading signals | Prose signals | Substantiates claims about… |
| ----- | ------------ | ------------------------------- | -------------- | ---------------------------- |
| **Spec / standard** | `/specs/`, `/standards/` | "Specification" in title, numbered sections | RFC-2119 "MUST/SHOULD/MAY", numbered requirements | Requirements, protocols, contracts |
| **Decision (ADR/RFC)** | `/adr/`, `/rfc/`, `NNNN-*.md` | `status: proposed/accepted/superseded`, "Decision"/"Context"/"Consequences" headings | "we chose X over Y", "Superseded by" | Architecture decisions, trade-offs |
| **Runbook / how-to** | `/runbooks/`, `/how-to/`, `/playbooks/` | "Prerequisites", "Steps" headings | ordered imperative steps | Operational procedures |
| **Policy** | `/policies/`, `/governance/` | "Policy" in title | "must / required / prohibited", compliance framing | Compliance/governance claims |
| **Meeting note** | `/notes/`, `/meetings/` | `date:` + `attendees:` front-matter, "Action Items" | dated discussion, "TODO/owner" lines | Rarely substantiates anything on its own — treat as weak evidence, look elsewhere first |
| **Glossary** | `/glossary/` | "Glossary" title, definition lists | "X — definition", "X means …" | Term/concept definitions |
| **Design doc** | `/designs/`, `/proposals/` | "Goals/Non-Goals", "Alternatives Considered" | architecture prose, trade-off discussion | System/component design claims |
| **Reference / guide** | `/docs/`, `/guides/` | descriptive headings | explanatory prose (the default genre) | General descriptive claims |

When several signals conflict, prefer the most specific genre (Decision > Policy > Reference) — a file under `adr/` with `status: accepted` is a Decision even if its prose reads like a guide.

## Linking signals (real substantiation vs. a passing mention)

Once you're reading a candidate document, these signals tell you whether it actually substantiates the node or just name-drops it:

| Signal | Example | What it tells you |
| ------ | ------- | ------------------ |
| Markdown link / wikilink treating the concept as subject | `[Billing API](../billing/api.md)` | The linked document is worth opening fully as a candidate |
| A heading/section title matching the node's name | `## Billing API` | Strong anchor candidate — link to this section, not the whole document |
| RST/AsciiDoc cross-ref (`:doc:`, `xref:`) | `` :doc:`auth` `` | Same weight as a markdown link — a first-class reference |
| "X is …", "X means …", a canonical "What is X?" section | defines the concept | The strongest form of substantiation for a Term/Concept-shaped claim |
| RFC-2119 requirement language naming the node | "The gateway **MUST** validate…" | A spec-grade claim — cite the specific requirement, not the whole document |
| "see also", "per", "as described in" | a passing cross-reference | Weak on its own — keep reading for the actual claim before citing this |
| Front-matter `owner:`/`team:`, RACI "Accountable" | `owner: platform-team` | Ownership evidence only — use for ownership-shaped claims, not architecture ones |
| ADR "Supersedes" / "Superseded by" | `status: superseded` | Tells you which of two documents is current — link to the current one unless the node is specifically about the historical decision |

Filter out navigation chrome (table of contents, pagers, breadcrumbs, "edit this page") — never a genuine substantiation source, regardless of how often the node's name appears in it.
