# Trail Recipes

Three reusable, archetype-agnostic recipes for demonstrative multi-stop trails. Each maps a graph signal → a trail shape → a polarity. Pick nodes from `pack.degree` (ranked fan-in/fan-out) and ground every consecutive stop pair on `pack.edges`; the worked examples use a React monorepo root board, but the heuristics apply to any board.

In v2, traversal lives in each InsightDraft's `trail` — a `Stop[]`. There are no separate InsightPath objects. Branches are expressed as multiple stops with the same `from` value, each with a `branchLabel`. Every stop's `board` and `node` must be canonical slugs from the pack (`pack.boards[].slug`, `pack.elements[].slug`).

---

## Recipe 1 — Execution Journey (observation)

**Use for:** `feature-journey`, `how-does-it-work`, `onboarding-map`. The friendliest demo trail: a single flow from where work enters to where it ends.

**Graph signal:** an entrypoint node (low inbound from internal nodes, or a renderer/controller/UI archetype) with a forward chain of outbound edges into an engine and then a leaf dependency.

**Trail shape:** linear, 3–5 stops, optionally one branch to an adapter/sibling the entrypoint also calls.

```
entrypoint ──▶ engine ──▶ scheduling/IO leaf
                └─(branch)─▶ adapter
```

**How to pick nodes:**
1. Entrypoint = the node a user action hits first.
2. Follow outbound edges to the component that does the real work (the engine).
3. Continue to the terminal dependency (a queue, scheduler, store, or external call) — the latency-sensitive hop.
4. If the entrypoint also calls an adapter/bindings layer, add it as a branch stop from the entrypoint.

**Trail structure:**

```json
"trail": [
  { "id": "s1", "board": "<board-slug>", "node": "react-dom", "note": "Entry point" },
  { "id": "s2", "from": "s1", "via": { "kind": "edge", "edge": "react-dom--react-reconciler" }, "board": "<board-slug>", "node": "react-reconciler", "note": "Core reconciliation engine" },
  { "id": "s3", "from": "s2", "via": { "kind": "edge", "edge": "react-reconciler--scheduler" }, "board": "<board-slug>", "node": "scheduler", "note": "Latency-sensitive hop", "branchLabel": "main path" },
  { "id": "s4", "from": "s1", "via": { "kind": "edge", "edge": "react-dom--react-dom-bindings" }, "board": "<board-slug>", "node": "react-dom-bindings", "note": "Adapter layer", "branchLabel": "bindings path" }
]
```

Anchor `advice.kind: "context"` on the trail's purpose. Polarity: `observation`.

---

## Recipe 2 — Blast-Radius Cascade (risk)

**Use for:** `blast-radius`. The most dramatic shape — one failure fanning out across the system.

**Graph signal:** a **single point of failure** = highest fan-in node (many inbound edges) that is also synchronously depended upon. Often there's a deeper kernel one ring below it.

**Trail shape:** root stop → SPOF stop → main dependent + branch stops for the other dependents → downstream degradation.

```
kernel ──▶ SPOF hub ──▶ primary dependent ──▶ downstream degradation
              ├─(branch)─▶ dependent A
              ├─(branch)─▶ dependent B
              └─(branch)─▶ dependent C …
```

**How to pick nodes:**
1. Scan `pack.degree` for the node with the highest `fanIn` — sort by `fanIn` yourself since `degree` is ranked by combined fan-in+fan-out. That's the SPOF hub.
2. If the hub depends on a lower node (a shared kernel), make that the entry stop (Ring 0).
3. The SPOF hub is stop 2 (anchor the `critical` risk finding here).
4. All the hub's dependents become branch stops sharing the same `from` (Ring 1) — label each with how it degrades.
5. Continue the main line through one dependent to something it affects (Ring 2 degradation).

**Trail structure (branches from the SPOF stop):**

```json
"trail": [
  { "id": "s1", "board": "<board-slug>", "node": "shared", "note": "Root kernel — Ring 0" },
  { "id": "s2", "from": "s1", "via": { "kind": "edge", "edge": "shared--react-reconciler" }, "board": "<board-slug>", "node": "react-reconciler", "note": "SPOF hub — anchor finding here" },
  { "id": "s3", "from": "s2", "via": { "kind": "edge", "edge": "react-reconciler--react-dom" }, "board": "<board-slug>", "node": "react-dom", "note": "Primary dependent", "branchLabel": "react-dom path" },
  { "id": "s4", "from": "s2", "via": { "kind": "edge", "edge": "react-reconciler--react-art" }, "board": "<board-slug>", "node": "react-art", "note": "Renderer fails", "branchLabel": "react-art path" },
  { "id": "s5", "from": "s2", "via": { "kind": "edge", "edge": "react-reconciler--react-native-renderer" }, "board": "<board-slug>", "node": "react-native-renderer", "note": "RN fails", "branchLabel": "react-native path" },
  { "id": "s6", "from": "s3", "via": { "kind": "edge", "edge": "react-dom--server-components" }, "board": "<board-slug>", "node": "server-components", "note": "Ring 2 degradation" }
]
```

Polarity: `risk`, priority: `critical` on the SPOF hub finding.

---

## Recipe 3 — Hidden-Dependency Chokepoint (risk / observation)

**Use for:** `hidden-dependency`. Shows the unassuming node everything quietly runs through.

**Graph signal:** a node whose fan-in is disproportionate to its archetype — a "utility"/"shared"/"config" type with far more inbound edges than expected.

**Trail shape:** one caller → chokepoint, with branch stops for the other independent callers (fan-in visualised). Optionally a second thin chain ending at a universal hub.

```
caller ──▶ chokepoint
            ├─(branch)─▶ other caller A
            ├─(branch)─▶ other caller B
            └─(branch)─▶ other caller C
```

**How to pick nodes:**
1. Scan `pack.degree` for a node with anomalous `fanIn` for its type.
2. Pick one dependent as the entry stop, make the chokepoint the second stop (anchor the finding here).
3. All other dependents become branch stops with the same `from` as the chokepoint, each labelled.

**Trail structure:**

```json
"trail": [
  { "id": "s1", "board": "<board-slug>", "node": "react-dom", "note": "One dependent — entry" },
  { "id": "s2", "from": "s1", "via": { "kind": "edge", "edge": "react-dom--scheduler" }, "board": "<board-slug>", "node": "scheduler", "note": "Chokepoint — everyone depends on this tiny package" },
  { "id": "s3", "from": "s2", "via": { "kind": "edge", "edge": "react-art--scheduler" }, "board": "<board-slug>", "node": "react-art", "note": "Also depends", "branchLabel": "react-art" },
  { "id": "s4", "from": "s2", "via": { "kind": "edge", "edge": "react-reconciler--scheduler" }, "board": "<board-slug>", "node": "react-reconciler", "note": "Also depends", "branchLabel": "react-reconciler" }
]
```

Note the branch stops on the chokepoint go *back* to callers — this visualises the inbound fan-in. The `via.edge` slug must exist in `pack.edges`; derive it as `callerSlug--schedulerSlug` if not explicit. Polarity: `risk` for chokepoints with no fallback; `observation` for expected hubs.

---

## Combining recipes for a set

A strong 3-insight demo uses one of each: **Journey** (observation) + **Cascade** (risk) + **Chokepoint** (risk/observation). That spread gives the board a flow, a dramatic fan-out, and a coupling story — three different visual signatures and a balance of colour. Keep total stops-per-insight roughly 4–8 so each trail stays readable.
