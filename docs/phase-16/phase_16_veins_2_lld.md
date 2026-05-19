# Phase 16 — Veins 2 LLD

## Goal

Replace the current heartbeat-threshold vein pulse behavior with a delivered-energy blob model, freeze vein animation while the game is paused, and repurpose demand-edge width to represent player throttle.

This document defines the implementation contract for that change.

It is intentionally explicit. Nothing below is optional.

---

## Why

### Current behavior in code

1. `GameScene` updates the Phaser display every frame.
2. `VeinsSystem` freezes its internal heartbeat time when runtime status is not `running`.
3. `VeinsModule` still advances vein visuals from render-frame `deltaMs`.
4. `veinsEdgeTick.ts` spawns pulses from heartbeat threshold crossings and moves them at a fixed speed.
5. `veinsDisplayBuilder.ts` uses demand-edge width as a throughput proxy via `drawFraction`.
6. Upstream resource edges (`face -> swarm/pool`, `swarm -> pool`) do not carry real delivered-flow data today. They use placeholder `power` values only.

### Problems this creates

1. Vein blobs keep moving while the game is paused.
2. Blob count and speed do not represent delivered energy.
3. Width is overloaded as a throughput signal even though the player directly thinks in throttle.
4. Upstream edges cannot honestly display delivered flow because the graph never projects delivered flow onto them.
5. The current `addFaceEdges` implementation creates three resource edges per face, which makes upstream aggregation ambiguous even though face entities already declare a single owning attribute.

### Player-facing target behavior

1. Blobs mean delivered energy.
2. Every fixed amount of delivered energy produces one blob.
3. More delivered energy produces more blobs.
4. Blob speed increases only as much as needed to preserve a minimum blob spacing.
5. Demand-edge width means throttle.
6. Heartbeat affects blob tint only.
7. Pause freezes all vein animation.

---

## Scope

### In scope

1. Body, mind, and social vein resource flow.
2. Demand-edge width semantics.
3. Delivered-flow aggregation onto upstream resource edges.
4. Blob spawn and movement semantics.
5. Heartbeat-driven blob tint.
6. Pause freezing for vein reveal, blob spawning, and blob movement.
7. Config additions required to support the new behavior.
8. Tests for schema, graph construction, flow projection, display projection, and render-tick behavior.

### Out of scope

1. Any change to runtime power distribution semantics.
2. Any change to non-vein display modules.
3. Any cleanup of legacy width-pulse helpers or legacy config fields that are already unused.
4. Any new gameplay meaning for nervous-system edges.
5. Any refactor of the generic display manager.

---

## Final contract

### 1. Meaning of each visual channel

#### Resource attributes: `body`, `mind`, `social`

- **Blob count** means delivered energy.
- **Blob speed** is a spacing-preservation mechanism, not an additional semantic channel.
- **Demand-edge width** means sink throttle.
- **Upstream-edge width** remains structural and does not mean throughput.
- **Heartbeat** affects blob tint only.

#### Nervous attribute: `nervous`

- Nervous edges remain visible lines.
- Nervous edges emit no delivered-energy blobs.
- Nervous edges keep heartbeat intensity for line presentation only.
- Nervous edges always project `deliveredRate = 0`.

### 2. Pause contract

When runtime status is not `running`:

- no new vein blobs are spawned
- existing vein blobs do not move
- reveal length does not advance
- heartbeat time remains frozen exactly as it already does in `VeinsSystem`

This phase does **not** change animation behavior for any non-vein display module.

### 3. Resource-face contract

A resource face is unambiguous only when its owning attribute can be resolved.

A resource face attribute must resolve in this order:

1. `entity.face.attribute`
2. exact tag `face_body`, `face_mind`, or `face_social`
3. exact id `face_body`, `face_mind`, or `face_social`

If none of the above resolves, that face contributes **no resource edge**.

Generic `face` tagging alone is not sufficient for resource-flow edges under the new contract.

### 4. Upstream flow contract

For resource edges, delivered flow is projected onto the graph after topology construction.

- A **leaf demand edge** gets its delivered rate directly from the target sink’s `powerSink.allocatedDraw[attribute]`.
- An **upstream resource edge** gets its delivered rate from the total delivered outflow of its target node for that same attribute.
- If an upstream resource edge has no downstream resource-demand edges, its delivered rate is `0`.
- Flow values are never duplicated across parallel upstream predecessors because resource faces are now single-attribute edges.

### 5. Demand width contract

For demand edges only:

- throttle is read from the target sink’s `powerSink.throttle`
- throttle is clamped into `[0, 1]` for display projection
- if throttle is `0`, width is `0` and the edge is omitted from display output
- if throttle is greater than `0`, width is `clamp(max_width * throttle, min_width, max_width)`

`drawFraction` no longer controls demand-edge width.

### 6. Blob count contract

For each display edge:

- `blobSpawnRateHz = deliveredRate / energy_per_blob`
- one blob always corresponds to exactly `energy_per_blob` units of delivered energy
- no blob is dropped by a fixed hard cap
- if a frame cannot place every due blob without violating spacing, the unplaced whole blobs remain queued in edge-local carry state and are emitted in later ticks

### 7. Blob speed contract

For each display edge:

- `blobSpeedPxPerSec = max(base_blob_speed_px_per_sec, blobSpawnRateHz * min_blob_spacing_px)`
- there is no additional speed cap in this phase
- spacing is therefore guaranteed by construction in steady state

### 8. Blob placement contract inside one render tick

After advancing existing blobs:

1. compute how many whole blobs are due from accumulated fractional carry
2. compute actual spacing for this tick as `blobSpeedPxPerSec / blobSpawnRateHz` when spawn rate is positive
3. compute the available source gap from the nearest existing blob to the source
4. spawn only the number of due blobs that fit into that source gap while preserving spacing
5. position spawned blobs at `0`, `spacing`, `2 * spacing`, and so on from the source
6. keep all unspawned whole blobs in carry state for later ticks

This contract preserves the direct “energy per blob” language without overlap.

### 9. Heartbeat tint contract

Heartbeat no longer controls blob spawning.

For resource blobs only:

- heartbeat intensity linearly increases saturation from base color to a configured saturation multiplier
- existing `supply_bright_factor` remains part of the blob tint calculation
- line color stays on the existing dim resource color path

---

## Data-contract changes

## `src/data/schemas/assets/veins.ts`

### Required config additions

Add a new top-level `flow` object to `VeinConfig`:

- `energy_per_blob: number > 0`
- `min_blob_spacing_px: number > 0`
- `base_blob_speed_px_per_sec: number > 0`

Add a new heartbeat visual field inside `heartbeats`:

- `blob_saturation_multiplier: number >= 1`

### Required defaults

`DEFAULT_VEIN_CONFIG` must include:

- `flow.energy_per_blob = 10`
- `flow.min_blob_spacing_px = 18`
- `flow.base_blob_speed_px_per_sec = 120`
- `heartbeats.blob_saturation_multiplier = 1.25`

### Validation rules

- every `flow` field must reject non-finite and non-positive values
- `blob_saturation_multiplier` must reject values below `1`
- omitted values must resolve through schema defaults

## `src/engine/phaser/veins/types.ts`

### New type

Add:

- `VeinEdgeKind = "resource-upstream" | "resource-demand" | "nervous"`

### `VeinEdge` additions

Every edge must carry:

- `kind: VeinEdgeKind`
- `deliveredRate: number`
- `throttle01: number`

### Field contract

- `deliveredRate` is non-negative and measured in the same per-second units used by `allocatedDraw`
- `throttle01` is clamped into `[0, 1]`
- for all non-demand edges, `throttle01` is always `1`

## `src/engine/phaser/display/VeinsDisplayData.ts`

### `VeinsDisplayEdge` additions

Every display edge must carry:

- `blobSpawnRateHz: number`
- `blobSpeedPxPerSec: number`
- `minBlobSpacingPx: number`

Existing fields remain, with these clarified meanings:

- `baseColor` = line color
- `pulseColor` = current blob tint for this frame
- `intensity01` = current heartbeat intensity only; it no longer implies spawning

### `VeinsDisplayDataComponent` addition

Add:

- `isSimulationRunning: boolean`

This field is the only pause-control input used by `VeinsModule`.

## `src/engine/phaser/display/modules/veinsModuleTypes.ts`

### `VeinEdgeVisualState` addition

Add:

- `spawnCarry: number`

### Constant changes

Remove these constants because they are no longer valid under the new contract:

- fixed blob speed constant
- threshold-spawn constant
- fixed max-active-blob cap constant

Retain only constants that remain purely visual or reveal-related.

---

## Implementation design

## A. Graph topology changes

### `src/engine/phaser/veins/graphBuilderUtils.ts`

#### Responsibility

Provide low-level graph helper functions and the canonical face-attribute resolver.

#### Logic

Add an exported `resolveFaceAttribute(entity)` helper.

Resolution order is exactly:

1. `entity.face.attribute`
2. exact tag `face_body`, `face_mind`, `face_social`
3. exact id `face_body`, `face_mind`, `face_social`
4. otherwise `null`

No other fallback is permitted.

#### Interface

- input: `RuntimeEntity`
- output: `ResourceAttribute | null`

### `src/engine/phaser/veins/graphBuilderEdges.ts`

#### Responsibility

Construct graph edges with explicit semantics.

#### Logic

`addFaceEdges` must change from “three edges per face” to “one resource edge per face”.

New behavior:

- resolve the face attribute once
- if no attribute resolves, skip resource-edge creation for that face
- if `sys_swarm` exists, create one `resource-upstream` edge from face to swarm for that attribute
- otherwise create one `resource-upstream` edge from face to the matching pool for that attribute

`addSwarmEdges` must tag edges as `resource-upstream`.

`addDemandEdges` and `addSinkEdges` must tag edges as `resource-demand`.

`addNervousEdges` must tag edges as `nervous`.

Every created edge must initialize:

- `deliveredRate = 0`
- `throttle01 = 1`

#### Interface

Existing function signatures do not change.

### `src/engine/phaser/veins/types.ts`

#### Responsibility

Remain the only authoritative edge-shape definition used by graph construction, flow projection, and display projection.

#### Logic

No edge may exist without an explicit `kind`.

#### Interface

All edge creators must satisfy the expanded `VeinEdge` contract.

---

## B. Flow projection

### `src/engine/phaser/veins/veinFlowProjection.ts` (new)

#### Responsibility

Project delivered resource flow and direct sink throttle onto the already-built graph.

This file is the sole owner of delivered-flow aggregation for vein edges.

#### Logic

This file must export one public function:

- `projectVeinEdgeFlow(graph, entities)`

Processing rules:

1. Build an entity lookup by id.
2. Build outgoing adjacency grouped by `(sourceId, attribute)`.
3. For every edge:
   - if `kind === "nervous"`, set `deliveredRate = 0` and `throttle01 = 1`
   - if `kind === "resource-demand"`:
     - read the target sink’s `allocatedDraw[attribute]`
     - clamp non-finite or negative values to `0`
     - read the target sink’s `throttle`
     - clamp non-finite throttle to `1`, then clamp into `[0, 1]`
   - if `kind === "resource-upstream"`:
     - resolve delivered rate recursively from the total delivered outflow of the target node for the same attribute
     - set `throttle01 = 1`
4. Memoize per-edge delivered-rate resolution so the graph is traversed once.
5. Detect recursion cycles defensively.
   - on cycle detection, log a loud error and resolve that branch to `0`

#### Interface

Input:

- `graph: VeinGraph`
- `entities: ReadonlyArray<RuntimeEntity>`

Output:

- in-place mutation of `graph.edges[*].deliveredRate`
- in-place mutation of `graph.edges[*].throttle01`

No nodes or edges are added or removed.

### `src/engine/phaser/veins/VeinsSystem.ts`

#### Responsibility

Orchestrate vein config refresh, heartbeat timing, graph building, flow projection, and display-data writeback.

#### Logic

Update order must be:

1. refresh config
2. advance virtual heartbeat time when running
3. evaluate heartbeat preset rules on cadence
4. build graph topology
5. apply edge heartbeat intensities
6. project edge flow
7. write display data

When writing display data, include:

- `edges: buildDisplayEdges(this.graph, this.config)`
- `isSimulationRunning: runtime.getState().status === "running"`

#### Interface

Public methods do not change.

The display entity id remains `veins_display`.

---

## C. Display projection

### `src/engine/phaser/veins/veinGeometry.ts`

#### Responsibility

Own all width-resolution math.

#### Logic

Add a new exported helper:

- `resolveThrottleWidth(throttle01, config)`

Contract:

- if `throttle01 <= 0`, return `0`
- otherwise return `clamp(max_width * throttle01, min_width, max_width)`

Existing `resolveBaseWidth` remains the structural-width function for non-demand edges.

No existing helper is removed in this phase.

#### Interface

New public function:

- input: clamped or unclamped throttle ratio plus `VeinConfig`
- output: width in pixels

### `src/engine/phaser/veins/colorUtils.ts`

#### Responsibility

Own heartbeat-driven blob tint math.

#### Logic

Add a new exported helper that:

- parses the base hex color
- converts to HSL
- multiplies saturation by a value interpolated from `1` to `blob_saturation_multiplier` using heartbeat intensity
- applies the existing bright factor to lightness
- clamps HSL values and converts back to an integer tint

This helper must be used only for blob tint, not line color.

#### Interface

New public function returning a Phaser-compatible numeric color.

### `src/engine/phaser/veins/veinsDisplayBuilder.ts`

#### Responsibility

Convert a projected runtime graph into stable render-edge data.

#### Logic

For every runtime edge:

1. look up source and target nodes
2. resolve line width:
   - `resource-demand` -> `resolveThrottleWidth(edge.throttle01, config)`
   - `resource-upstream` and `nervous` -> `resolveBaseWidth(edge.power, config)`
3. skip display output when resulting width is below visibility threshold
4. resolve line color exactly as today from the dim color path
5. resolve blob tint from the new heartbeat saturation helper using current `edge.intensity`
6. derive blob flow fields:
   - `blobSpawnRateHz = edge.deliveredRate / config.flow.energy_per_blob`
   - `blobSpeedPxPerSec = max(config.flow.base_blob_speed_px_per_sec, blobSpawnRateHz * config.flow.min_blob_spacing_px)`
   - `minBlobSpacingPx = config.flow.min_blob_spacing_px`
7. retain the existing rope-noise seed fields unchanged

#### Interface

`buildDisplayEdges(graph, config)` still returns `VeinsDisplayEdge[]`, but each edge now includes the blob-flow fields defined above.

---

## D. Render-tick behavior

### `src/engine/phaser/display/modules/veinsEdgeState.ts`

#### Responsibility

Initialize and dispose the per-edge visual state.

#### Logic

Initialize `spawnCarry = 0`.

All existing pooled object ownership remains unchanged.

#### Interface

`VeinEdgeVisualState` now requires `spawnCarry`.

### `src/engine/phaser/display/modules/veinsVisualMath.ts`

#### Responsibility

Own pure math for polyline traversal and blob-spacing calculations.

#### Logic

Keep all current polyline helpers.

Add pure helpers for:

- resolving actual blob spacing from spawn rate and speed
- resolving how many queued blobs fit into the current source gap

These helpers must be side-effect free and must not touch Phaser objects.

#### Interface

New helpers must accept only plain numbers and return plain numbers.

### `src/engine/phaser/display/modules/veinsEdgeTick.ts`

#### Responsibility

Advance one edge’s reveal state and blob state for one display tick.

#### Logic

The function contract changes from heartbeat-threshold spawning to delivered-flow spawning.

Exact tick order:

1. build rope points and polyline metrics
2. advance `revealedLenPx` using the provided simulation delta
3. redraw base line and mask from revealed length
4. retint all active blobs to the current `edge.pulseColor`
5. advance all existing blob distances using `edge.blobSpeedPxPerSec * simDt`
6. remove blobs whose distance is beyond `revealedLenPx`
7. accumulate queued blobs into `state.spawnCarry` using `edge.blobSpawnRateHz * simDt`
8. compute the actual spacing for this tick
9. compute the current source gap from the nearest remaining blob
10. spawn only the number of queued blobs that fit in that gap
11. place spawned blobs at exact spacing offsets from the source
12. decrement `spawnCarry` only by the number actually spawned

Prohibited behavior:

- no threshold-based spawn
- no fixed-speed movement
- no fixed hard cap that drops blobs

#### Interface

`tickEdge` still receives the existing Phaser dependencies, but the time-step parameter now semantically means **simulation delta**.

### `src/engine/phaser/display/modules/VeinsModule.ts`

#### Responsibility

Manage the edge-state map and pass the correct simulation delta to `tickEdge`.

#### Logic

Read `data.isSimulationRunning` from `VeinsDisplayDataComponent`.

Compute:

- `simulationDeltaMs = data.isSimulationRunning ? tickCtx.deltaMs : 0`

Pass `simulationDeltaMs` into `tickEdge`.

All other module lifecycle behavior remains unchanged.

#### Interface

No public interface change.

The module remains specific to `veinsDisplayData`.

---

## File-by-file change list

## Production files

### 1. `src/data/schemas/assets/veins.ts`
- **Responsibility:** authoritative vein-config schema and defaults
- **Change:** add `flow` config and `heartbeats.blob_saturation_multiplier`
- **Interface:** expanded `VeinConfig` type and defaults

### 2. `src/data/raw/game_data.json`
- **Responsibility:** canonical raw game asset defaults
- **Change:** add explicit default `flow` values and `blob_saturation_multiplier`
- **Interface:** data-only update

### 3. `src/data/raw/example/modules/assets.art`
- **Responsibility:** example module vein config
- **Change:** add explicit example `flow` values and `blob_saturation_multiplier`
- **Interface:** data-only update

### 4. `src/engine/phaser/veins/types.ts`
- **Responsibility:** runtime vein graph contracts
- **Change:** add `VeinEdgeKind`, `deliveredRate`, `throttle01`
- **Interface:** expanded `VeinEdge`

### 5. `src/engine/phaser/veins/graphBuilderUtils.ts`
- **Responsibility:** graph helper primitives
- **Change:** add `resolveFaceAttribute`
- **Interface:** new exported helper

### 6. `src/engine/phaser/veins/graphBuilderEdges.ts`
- **Responsibility:** edge construction
- **Change:** one resource edge per face; explicit `kind`; initialize flow/throttle fields
- **Interface:** unchanged function signatures, changed edge semantics

### 7. `src/engine/phaser/veins/veinFlowProjection.ts` **(new)**
- **Responsibility:** delivered-flow and throttle projection onto graph edges
- **Change:** new file
- **Interface:** exports `projectVeinEdgeFlow(graph, entities)`

### 8. `src/engine/phaser/veins/VeinsSystem.ts`
- **Responsibility:** end-to-end vein update orchestration
- **Change:** invoke flow projection; write `isSimulationRunning`
- **Interface:** unchanged public API

### 9. `src/engine/phaser/veins/veinGeometry.ts`
- **Responsibility:** width math
- **Change:** add `resolveThrottleWidth`
- **Interface:** new exported helper

### 10. `src/engine/phaser/veins/colorUtils.ts`
- **Responsibility:** vein color math
- **Change:** add heartbeat-driven blob tint helper
- **Interface:** new exported helper

### 11. `src/engine/phaser/veins/veinsDisplayBuilder.ts`
- **Responsibility:** runtime-graph to display-edge projection
- **Change:** demand width from throttle; blob spawn/speed from delivered flow; heartbeat tint for blobs
- **Interface:** expanded `VeinsDisplayEdge` output

### 12. `src/engine/phaser/display/VeinsDisplayData.ts`
- **Responsibility:** display-side data contract for veins
- **Change:** add blob flow fields and `isSimulationRunning`
- **Interface:** expanded `VeinsDisplayEdge` and `VeinsDisplayDataComponent`

### 13. `src/engine/phaser/display/modules/veinsModuleTypes.ts`
- **Responsibility:** per-edge module state and constants
- **Change:** add `spawnCarry`; remove invalid blob constants
- **Interface:** expanded `VeinEdgeVisualState`

### 14. `src/engine/phaser/display/modules/veinsEdgeState.ts`
- **Responsibility:** state create/dispose
- **Change:** initialize `spawnCarry`
- **Interface:** no signature change

### 15. `src/engine/phaser/display/modules/veinsVisualMath.ts`
- **Responsibility:** pure vein render math
- **Change:** add blob-spacing and spawn-capacity helpers
- **Interface:** new exported pure functions

### 16. `src/engine/phaser/display/modules/veinsEdgeTick.ts`
- **Responsibility:** one-edge render advancement
- **Change:** delivered-flow spawning, dynamic speed, queued carry, no hard cap, simulation-delta semantics
- **Interface:** unchanged function signature shape; changed time-step semantics

### 17. `src/engine/phaser/display/modules/VeinsModule.ts`
- **Responsibility:** edge map lifecycle and pause gating
- **Change:** pass zero simulation delta when `isSimulationRunning` is false
- **Interface:** unchanged module identity and lifecycle API

## Test files

### 18. `src/data/schemas/assets/veins.test.ts` **(new)**
- **Responsibility:** schema contract for new vein config fields
- **Logic:** defaulting, positive validation, saturation-multiplier lower bound
- **Interface:** test only

### 19. `src/engine/phaser/veins/GraphBuilder.test.ts`
- **Responsibility:** topology contract for face edges
- **Logic:** assert one resource edge per face attribute; update edge-count expectations
- **Interface:** test only

### 20. `src/engine/phaser/veins/graphBuilderUtils.flyweight.test.ts`
- **Responsibility:** face-attribute fallback contract
- **Logic:** positive case for exact face-attribute tag or id; negative case for generic `face` tag without attribute
- **Interface:** test only

### 21. `src/engine/phaser/veins/graphBuilderUtils.test.ts`
- **Responsibility:** sink-edge construction contract
- **Logic:** assert `resource-demand` kind and duplicate-avoidance behavior remain correct
- **Interface:** test only

### 22. `src/engine/phaser/veins/veinFlowProjection.test.ts` **(new)**
- **Responsibility:** delivered-flow projection contract
- **Logic:** leaf flow, upstream aggregation, throttle projection, nervous zero-flow, cycle defense path
- **Interface:** test only

### 23. `src/engine/phaser/veins/veinsDisplayBuilder.test.ts` **(new)**
- **Responsibility:** display-projection contract
- **Logic:** demand width from throttle, throttle-zero edge omission, spawn-rate derivation, speed derivation, heartbeat tint change
- **Interface:** test only

### 24. `src/engine/phaser/veins/VeinsSystem.test.ts`
- **Responsibility:** system orchestration contract
- **Logic:** existing heartbeat cadence coverage remains; add assertion for `isSimulationRunning` in written display data
- **Interface:** test only

### 25. `src/engine/phaser/veins/PulseEngine.test.ts`
- **Responsibility:** heartbeat engine fixture validity
- **Logic:** update typed config fixture to include new required fields
- **Interface:** test only

### 26. `src/engine/phaser/veins/NervousSystemRules.test.ts`
- **Responsibility:** heartbeat-rule fixture validity
- **Logic:** update typed config fixture to include `blob_saturation_multiplier`
- **Interface:** test only

### 27. `src/engine/phaser/veins/veinGeometry.test.ts`
- **Responsibility:** width-math contract
- **Logic:** retain `resolveBaseWidth` coverage and add `resolveThrottleWidth` happy, edge, and zero-throttle cases
- **Interface:** test only

### 28. `src/engine/phaser/display/modules/veinsVisualMath.test.ts`
- **Responsibility:** pure blob-spacing math contract
- **Logic:** spacing calculation, spawn-capacity calculation, zero-rate edge cases
- **Interface:** test only

### 29. `src/engine/phaser/display/modules/veinsEdgeTick.test.ts` **(new)**
- **Responsibility:** render-tick behavior contract
- **Logic:** pause freeze, positive-delta spawning, multi-blob spacing, carry preservation, no hard-cap dropping
- **Interface:** test only

---

## Detailed algorithm contracts

## Flow projection algorithm

For a resource-demand edge `(pool -> sink)` of attribute `A`:

- `deliveredRate = max(0, finite(sink.powerSink.allocatedDraw[A]) ? value : 0)`
- `throttle01 = clamp(finite(sink.powerSink.throttle) ? value : 1, 0, 1)`

For a resource-upstream edge `(X -> Y)` of attribute `A`:

- find all edges whose `sourceId === Y` and `attribute === A`
- recursively resolve each child edge’s `deliveredRate`
- `deliveredRate = sum(child delivered rates)`
- `throttle01 = 1`

For a nervous edge:

- `deliveredRate = 0`
- `throttle01 = 1`

## Blob render algorithm

Given one display edge and one render tick:

- if `simulationDeltaMs === 0`, reveal length and blob positions must remain unchanged
- otherwise:
  - advance reveal length
  - advance existing blobs by `blobSpeedPxPerSec * dtSec`
  - accumulate due blobs from `blobSpawnRateHz * dtSec`
  - place only the number that fit in the current source gap at the current spacing
  - retain any unplaced whole blobs in carry

## Width algorithm

- demand width uses only throttle
- upstream width uses only structural power class
- nervous width uses the existing structural path
- delivered flow never affects width

---

## Acceptance criteria

Implementation is complete only when all of the following are true:

1. Vein blobs do not move, spawn, or reveal while runtime status is not `running`.
2. Every blob on body, mind, and social edges corresponds to delivered energy via `energy_per_blob`.
3. Demand-edge width changes when throttle changes and does not depend on `drawFraction`.
4. Upstream resource edges show the aggregated delivered flow of their downstream branch.
5. Resource faces contribute exactly one resource edge each, using their resolved owning attribute.
6. Nervous edges emit no delivered-energy blobs.
7. No fixed hard cap drops blobs.
8. All listed tests pass.
9. No out-of-scope files are changed.

---

## Non-negotiable notes for implementation

1. Do not add any new ECS runtime command for veins in this phase.
2. Do not change power distribution math in this phase.
3. Do not push pause semantics into the generic display manager.
4. Do not preserve the old three-edges-per-face resource topology.
5. Do not reuse heartbeat threshold crossing for blob spawning.
6. Do not use throughput to set demand-edge width.
7. Do not invent flow for nervous edges.

