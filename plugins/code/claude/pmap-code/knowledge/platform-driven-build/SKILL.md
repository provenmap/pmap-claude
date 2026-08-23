---
name: platform-driven-build
description: How to build an app from the ProvenMap platform's spec — reading compiled skills as the primary spec, turning designed board elements into components, materializing aspect snapshots (DB schema, API surface) as migrations and contracts, and closing the loop so the board maps the built app. Carries the planning and implementation steps /build delegates here. Used by /build.
user-invokable: false
metadata:
  author: ProvenMap
  version: 0.5.9
---

# Platform-Driven Build — Methodology

`/build` invokes this skill to implement the platform's spec in the repo. It runs Steps 0–2 itself (preflight, assemble the spec pack, the skills freshness gate, the `nextAction` branch) and delegates Steps 3–5 — plan, implement, close the loop — to the section of the same name below; the sections before it are the methodology those steps apply.

The spec has up to four sources, **by primacy**:

| Source | Carries | Comes from |
|---|---|---|
| **Compiled skills** (primary) | Specs, guidelines, conventions, stack choices | `/skills` sync → `skills.skillsDir` (lock-managed files) |
| Intents | Explicit architect work items with anchors | `pmap-intents.js` (pack `intents.open[]`) |
| Board design | Components + relationships (unbuilt elements) | pack `design.unbuilt[]` |
| Aspect snapshots | Data & API contracts | `.provenmap/build/aspects.json` |

Most builds are **skills-driven**: no pre-designed board exists, and the board is *created* by `/analyze` + `/sync` after building. Design-led builds (portal-authored elements) add structure on top; treat absent sources as normal, never as errors.

## Reading compiled skills as the spec

- The bundle is composed on the platform from three tiers — ProvenMap defaults → org customizations → **app-tier overrides**. Where instructions conflict, the app tier wins.
- Distinguish **spec content** (what to build: feature specs, domain rules, API/data requirements — often in per-app skill files or `references/`) from **convention content** (how to build: style, structure, testing, naming). Both bind; specs drive the plan units, conventions drive every file you write.
- Skill files are **lock-managed by `/skills`** (`pmap-skills.lock.json`). Never edit them as part of a build — a local edit blocks future syncs of that file. If a spec is wrong, the fix belongs on the platform.
- If the skills don't pin a stack, that is a genuine decision point — ask the user once, offering what the skills' conventions imply.

## Design-to-code mapping (design-led builds)

Archetypes are server-defined, so map by what the archetype *means*, not a fixed list:

- A **node** becomes the smallest idiomatic unit that honors the repo's conventions: a service/module/package with its own entry point for service-like archetypes; schema + migration + model for data-store archetypes; a route/controller layer for gateway/API archetypes; a job/consumer for worker/queue archetypes.
- An **edge** is a dependency or data flow the code must make true — an import, a client call, a queue publish/subscribe. Realize each edge explicitly; an unrealized edge means the built app diverges from the design.
- Use the node's `description`/`detailedDescription` as its mini-spec; the element `slug` should be recognizable in the code path you create (that's what future `/analyze` runs will match — it closes the loop).
- Build order: dependencies first (data stores → core services → edges/integrations → entry points), so each unit can be verified as it lands.

## Materializing aspect snapshots

From `.provenmap/build/aspects.json` (fields mirror the platform's aspect rows; `ownerSlug` links a row to its owning board element):

- **`database.schema` tables** → migrations + ORM models honoring the row's `dialect` and `orm` fields. Emit columns exactly as specified (name, type, nullability, PK/unique, defaults, enum options); realize `foreignKeys` as real constraints and `indexes` as real indexes. **Never invent or rename columns** — the snapshot is the contract; gaps go back to the architect, not into improvisation.
- **`api.surface` endpoints** → route/controller stubs + contracts from `protocolDetails` (HTTP method + path, GraphQL operation, gRPC method), `params`, `requestBody`/`responses` shapes, and auth from `authScheme`. Wire each endpoint into the component `ownerSlug` names.
- A row with `source: "manual"` was authored by a human on the portal — it is spec in the strongest sense.

## Repo-state decisions

| State | Meaning | Action |
|---|---|---|
| `empty` | No source files | Bootstrap: scaffold per skills conventions, then build every plan unit |
| `partial` | Source exists, spec has unbuilt parts | Gap-fill: touch only what the unbuilt spec requires — never refactor existing code that isn't in the delta |
| `built` | No unbuilt spec | Don't build; `/intents` for remaining work |

## Steps 3–5 — the workflow `/build` delegates here

Reached on the pack's `nextAction: "build"`. Follow these steps in order, exactly as written — every source, invocation, branch, prompt, and rule below is part of `/build`'s contract, not a suggestion. Do not improvise a step.

**Write-capable.** These steps create and edit project files. Never create or edit a file before the user has approved the plan in Step 3, always show the user what changed, and never record an intent resolution before the user has confirmed the outcome.

### Step 3 — Plan from the spec (approval gate)

Read, in this order:

1. The compiled skills under the pack's `skills.skillsDir` — the specs and conventions to honor (app-tier overrides win; never edit these files — they're lock-managed by `/skills`).
2. The pack's `design.unbuilt[]` — designed elements with no source mapping (components to create; board edges give their dependencies).
3. `.provenmap/build/aspects.json`, when the pack reported `aspectsPath` — full DB tables and API endpoints to materialize as migrations and contracts.
4. The pack's `intents.open[]` — architect work items; note which plan units they cover.

Turn the unbuilt spec into an **incremental** implementation plan — the delta only, never a rebuild of what is already there: skill specs → app shape, stack, and conventions; designed nodes → components; edges → dependencies and boundaries; aspects → migrations + API contracts. The mapping rules for each of those four sources are the sections above, and the repo-state table says how much of the tree the plan may touch. If the user supplied a focus prompt argument, it narrows which part to build first.

Use **AskUserQuestion** *only* at genuine decision points: the stack when the compiled skills don't pin one, and build order when the spec is large.

Present the plan — units, order, what each unit creates, which intents it covers — and **get the user's approval before any file is touched**. If the argument was `--plan`, stop after presenting it; no files are touched.

### Step 4 — Implement incrementally

Work plan unit by plan unit:

- **Intent-covered units go through the intent machinery** so attribution and verification accrue there: claim before touching files (`node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-intents.js --claim <intentId> --by "<name>"`), implement, verify, and resolve only after the user confirms — exactly per `/intents` Steps 3–8 (never auto-resolve; no verify, no `implemented`).
- Other units: create/edit the files, matching the conventions the compiled skills establish.
- **Verify each unit** with the project's own checks — discover them in the repo (`package.json` scripts, a Makefile, CI config); for a fresh scaffold there is nothing to discover, so set up the minimal check the skills prescribe. Show the results.

### Step 5 — Close the loop

Tell the user to run `/analyze`, then `/sync` — the next section says what each kind of build gains from it. Then `/build` is idempotent: re-running reports the spec as built and points the user at `/intents`.

## Closing the loop

A build is only *done* when the board reflects it: `/analyze` → `/sync`. Skills-driven builds populate the board for the first time; design-led builds turn designed elements into mapped ones (they leave `design.unbuilt` on the next pack). Intent-backed units get server-verified when the sync matches the proposed change. This is what makes `/build` idempotent and the board a truthful map, not an aspiration.
