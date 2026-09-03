# Archetype attributes — filling the property panel

Every archetype declares a **field contract**: the properties a node or edge of that type carries
in the ProvenMap app. `service` declares 25 of them; `module` declares 13; even `sync_call`
declares 4. Applying an archetype creates the form; filling it is what turns a board from a
picture into something an architect can query.

Two tools make this a loop:

- **Read the contract** — `get_archetypes` with `includeFields: true` and
  `names: [<the archetypes you actually placed>]`. Field contracts are large and the catalogue is
  hundreds of archetypes deep, so always pair `includeFields` with `names`. You get, per field:
  its `name`, its `type`, whether it `isArray`, and its `options` — the closed vocabulary, when
  it has one.
- **Read the current values** — `get_nodes` / `get_edges` return an `attributes` map on any
  element that has stored values. The key is **absent** when nothing has been filled in, so an
  untouched element and an emptied one never look alike.
- **Write values** — an `attributes` map on `create_nodes` / `update_nodes` / `create_edges` /
  `update_edges`, alongside the element's other fields.

## What is yours to fill

The code plugin and the architect fill different halves of the same contract, and the split is
not a convention — it is the point.

**Not yours: what a repository proves.** A bound app board's `/sync` resolves these from the
manifest and file tree, and re-derives them on every sync. Writing them by hand is churn at best
and a contradiction at worst:

`primaryLanguage` · `technologies` · `version` · `packageName` · `registry` · `moduleType` ·
`codeLocation` · `dependencies` · `parentModule` · `childModules` · `provider`

On an **unbound** board — a landscape you drew, an app that has no repository yet — nobody is
resolving them, so fill the ones you actually know and leave the rest absent.

**Shared, and evidence-bound: what the system means.** The analyzer fills these from code it
read; you fill them from documents, interviews and decisions. Either way the bar is the same —
you must be able to point at the thing that says so:

`domain` · `protocol` · `apiFormat` · `authType` · `authorization` · `exposedInterfaces` ·
`consumedInterfaces` · `responsibilities` · `integrationPattern` · `interactionStyle` ·
`dataFormat` · `businessCapability`

**Yours alone: what no codebase contains.** Ownership, lifecycle and operational facts. These are
the reason the feature exists on your side:

`owner` · `owningTeam` · `sla` · `stage` · `status` · `cloudProvider` · `monitoring` · `logging` ·
`deploymentEnvironment` · `backupPolicy` · `failoverStrategy` · `scalability` · `orchestration` ·
`containerization` · `dataClassification` · `criticality` · `stakeholders` · `encryption`

Twelve of the twenty most frequently declared field names sit in that last group. The plugin
leaves every one of them absent on purpose, precisely so that an architect opening the panel can
see what still needs a human. You are that human.

## Ask before you assert

The one rule that matters more than the tier map: **a value you invented is worse than an empty
cell.** A guess sits in the same panel as a measurement and is indistinguishable from one, so a
single fabricated `owner` costs the reader their trust in every value on the board.

So when a workflow has you at a decision point anyway — founding an app in `/new-app`, placing
systems in `/setup-workspace`, recording an ADR's remediation — ask for the two or three facts
that matter (owner, stage, criticality) and write those. Do not turn the panel into a
questionnaire, and never fill a field to make the panel look complete.

## Merge semantics

Values **merge per key**, in both directions:

- Omitting a field never clears it. An `update_nodes` call that changes a description leaves
  every stored attribute untouched.
- A later `/sync` re-derives only the plugin's own fields; the ownership you typed survives it.
- To change a value, write the new one. There is no "clear" — that is done in the app.

## The vocabulary is closed

Where a field declares `options`, only those exact values are accepted. Use the declared
spelling — `HTTP/REST`, not `http` or `REST`.

A key the archetype does not declare, or a value outside its option list, is **dropped silently**
rather than failing the write: an otherwise good board write is never lost to a stale field
cache. That also means a value that quietly does not appear on read-back was rejected — re-read
the contract with `includeFields` rather than retrying the same spelling. If the vocabulary has
no entry for a real distinction you need, that is a catalogue gap: take it to `/archetypes`.

## Shape

`attributes` is flat — a field name maps to a scalar, or to an array of scalars for a field the
contract marks `isArray`. Nested objects are dropped.

```json
{
  "slug": "billing-api",
  "name": "Billing API",
  "primitiveType": "node",
  "archeType": "service",
  "attributes": {
    "owner": "payments-team",
    "stage": "production",
    "criticality": "high"
  }
}
```
