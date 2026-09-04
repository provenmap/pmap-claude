# Candidate families

Every `/discover` candidate comes from one of these families — script code over the context
pack, never something the model invents. Each row: the question the family answers, the graph
signal that triggers it, the shape it produces, and the polarity it carries. Families that need
the archetype's structural `family` (from the server catalogue) stand down on an older server
and say so in the plan's `standingDown` list.

## Insight families (a trail on one anchor)

| Family | Question | Signal | Trail shape | Polarity |
|---|---|---|---|---|
| `chokepoint` | Why does everything run through `x`? | fan-in ≥ 3 and ≥ 2× the median of family peers (≥ 5 with no family) | one dependent → the hub → the other dependents as branches | risk; observation for a gateway, datastore, channel, endpoint or infra element |
| `cascade` | What breaks if `x` goes down? | ≥ 3 dependents with no alternative element of the hub's family | what the hub leans on → the hub → ring 1 as branches → one ring-2 element | risk; critical at ≥ 5 |
| `journey` | How does `entry` reach `leaf`? | a source (nothing depends on it) whose family is ui, endpoint, channel, actor or gateway — or any source when no family is known | 3–6 stops along the heaviest out-edges; descends into a drill-down the pack has; one branch from the entry | observation |
| `cycle` | Where do `a`, `b` and `c` depend on each other? | a strongly connected component of 2–6 elements | the cycle walked once, the last note pointing back | risk; high at ≥ 3 |
| `boundary` | Which edges cross the `p` boundary? | ≥ 3 primary edges leaving a top-level container | the inner element with most crossings → each other container as a branch | risk |
| `shared-store` | Who reaches `db`? | a datastore reached from ≥ 2 top-level containers | one accessor → the store → the other accessors as branches, labelled by container | risk at ≥ 3 containers, else observation |
| `unowned-hub` | Who owns `x`, the busiest thing here? | fan-in ≥ 3 and no `owner` attribute, only when some element declares one | the hub → up to 3 dependents as branches; `measurement` = dependents | opportunity |
| `seam` | Where would `x` split cleanly? | fan-in ≥ 5 and fan-out ≥ 5 (one per plan) | the element → a `proposed` ghost node via `proposedEdge` → two dependents | opportunity, with a `proposal` |

## Context-board families (a drawn board)

| Family | Question | Board content | Emphasis / flow |
|---|---|---|---|
| `blast-radius-map` | What is the blast radius of `x`? | the hub, its dependents, their dependents (depth 2), their containers | hub / the in-edges |
| `neighbourhood` | What surrounds `x`? | the subject and every direct neighbour, containment kept | subject / every edge to it |
| `cross-app-flow` | How does a request cross from `a` to `b`? | a chain of apps on the landscape, each opened to the element inside that first handles it — **architect only** | first and last app / the landscape edges |
| `external-surface` | What do we expose to the outside? | every external and everything that touches it | externals / the touching edges |
| `data-gravity` | Where does the data live, and who reaches it? | every datastore and its accessors | the shared stores / the accessor edges |
| `ownership-map` | Who owns what? | the busiest elements with their recorded owner in the note, only when owners exist | the unowned / none |
| `entry-surface` | Where does work enter? | every entry point and its first hop | entry points / the first-hop edges |

A drawn board holds at most 25 nodes; a family that would exceed it trims by degree and records
`trimmed to N of M by degree` in its evidence lines.

## Scoring and the set

Per candidate: 30 for a readable size (3–8 stops, 6–20 nodes; 12 otherwise), up to 30 for the
anchor's degree, +15 for crossing a board, +10 for a layer descent, a small shape bonus
(cross-app-flow 10, cascade 8, journey 6, blast-radius-map 6, chokepoint 4), +20 per lens
whose family list contains the family. The lens lists: reliability → cascade, chokepoint,
blast-radius-map, cycle, shared-store; onboarding → journey, entry-surface, neighbourhood,
cross-app-flow; ownership → unowned-hub, ownership-map, external-surface, data-gravity, boundary.

The recommended set (★): greedy by score under variety — distinct polarities across the
insights before any repeats, no two items on one anchor, at most one seam; then two repairs
that swap the weakest duplicate out: one board-crossing item when the universe has any, and one
item per level present in the universe.
