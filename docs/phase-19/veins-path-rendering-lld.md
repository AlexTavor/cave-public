# LLD: Veins Path Rendering Fix

## Status
Proposed.

## Scope
This document covers only the Phaser-side veins path rendering hot path inside `src/engine/phaser/display/modules/**`.

It does **not** change:
- runtime simulation data contracts
- `VeinsDisplayData` payload shape
- `VeinsModule` external behavior
- blob spawning rules
- blob movement rules
- entity lifecycle semantics
- non-veins display modules

## Why

### Observed cost in the current code
The current rendering path rebuilds and redraws substantially more work than is required.

Per edge, per tick, `tickEdge` currently does all of the following unconditionally:
1. advances wave phase
2. rebuilds the full rope path by calling `buildRopePointsFull`
3. rebuilds polyline metrics for that full path
4. recomputes the visible sub-path by slicing the full path
5. redraws the glow ribbon
6. redraws the base ribbon
7. redraws the mask ribbon
8. then updates and spawns pulses against the newly rebuilt path

That work happens even when all of the following are true:
- the edge is not nervous
- the edge geometry is unchanged
- the edge is already fully revealed
- the stroke widths and colors are unchanged
- simulation is paused

### Why that is unnecessary
From the current code:
- `veinsRopePath.ts` rebuilds the smooth guide path, guide metrics, sample distances, and simplex noise every time the full rope points are requested.
- `veinsEdgeTick.ts` then rebuilds full-path metrics and redraws three graphics objects every tick even when the visible ribbon is identical to the previous tick.
- Pulses need the full path and polyline metrics for positioning, but they do **not** require the glow/base/mask ribbons to be redrawn if the ribbon geometry and styling are unchanged.

### Root cause to fix
The hot path has no display-local geometry cache and no redraw invalidation contract.

## What
The fix is to add a **display-local, per-edge path cache** and convert the rendering path from **always rebuild and always redraw** to **rebuild only when invalidated, redraw only when invalidated**.

The design keeps all simulation semantics unchanged. The only change is how the visual module reuses previously computed geometry and previously drawn ribbons.

## Design goals
1. Preserve existing visual output and gameplay semantics.
2. Keep all state local to the display module runtime.
3. Reuse existing math helpers and pooling helpers.
4. Keep the public `buildRopePointsFull` behavior intact for existing callers and tests.
5. Make invalidation rules explicit and testable.
6. Handle degenerate-path error cases explicitly.

## Non-goals
1. No ECS or runtime changes.
2. No React or overlay changes.
3. No blob behavior redesign.
4. No new rendering technology.
5. No broad refactor of unrelated display code.

## Design invariants
1. The cache is display-local only. It must not leak into runtime or ECS state.
2. Geometry must be recomputed when any path-shaping input changes.
3. Ribbon graphics must be redrawn when visible geometry changes or stroke styling changes.
4. Pulse movement and spawning must continue to use the current full path.
5. A paused simulation (`simulationDeltaMs = 0`) must freeze reveal growth, phase advance, and pulse motion, but it must still redraw if the underlying edge input changes.
6. Degenerate paths must leave no stale visible ribbons or pulses on screen.

## Current call flow
- `VeinsModule.tick` reads `veinsDisplayData` and calls `tickEdge` once per edge.
- `tickEdge` builds the full rope path, builds full-path metrics, slices the visible path, draws three ribbons, then updates and spawns pulses.
- `buildRopePointsFull` currently performs both:
  - stable guide-path construction
  - phase-dependent point resolution

Those two concerns must be separated so the stable portion can be cached.

## Proposed design

### Overview
Split veins path work into two layers:

1. **Stable guide-path compilation**
   - depends only on stable path inputs
   - cached across ticks until those inputs change

2. **Per-tick full-path resolution**
   - depends on the compiled guide path and the current wave phase
   - recomputed only when required

Then add redraw invalidation so glow/base/mask graphics are redrawn only when their visible ribbon or styling changed.

## File-by-file design

### 1) Change: `src/engine/phaser/display/modules/veinsModuleTypes.ts`

#### Responsibility
Define the display-local runtime types required for cached veins path rendering.

#### Logic
Extend `VeinEdgeVisualState` with a new cache object that stores:
- the last stable geometry signature
- the compiled guide-path data
- the last resolved full path
- the last resolved full-path metrics
- the phase used to resolve the cached full path
- the last resolved visible path
- the revealed length used to resolve the cached visible path
- the last ribbon style signature used for drawing

#### Interface
Add the following concepts as named types:
- `VeinPoint`
  - a point with `x` and `y`
- `CompiledVeinGuidePath`
  - stable geometry data required to resolve full rope points without rebuilding guide-path scaffolding
- `VeinEdgePathCache`
  - the per-edge cache owned by `VeinEdgeVisualState`

`VeinEdgeVisualState` gains one new field:
- `pathCache`
  - type: `VeinEdgePathCache`
  - ownership: local to the edge visual runtime only

#### Contract
- No existing field is removed.
- No runtime or ECS type is changed.
- The cache fields must be safe to fully discard and rebuild at any time.

### 2) Change: `src/engine/phaser/display/modules/veinsEdgeState.ts`

#### Responsibility
Initialize and tear down the new path cache together with the existing edge visual state.

#### Logic
On create:
- initialize `pathCache` to an empty state
- keep all current pooled object acquisition behavior unchanged

On dispose:
- release pooled pulses exactly as today
- destroy the mask exactly as today
- drop all cached geometry references by clearing the cache object before pooled objects are released

#### Interface
`createEdgeState` continues to return `VeinEdgeVisualState`.

The returned state now includes an empty `pathCache` with these exact initial semantics:
- no compiled guide path
- no cached full path
- no cached visible path
- no cached style signature
- no last-resolved phase
- no last-resolved revealed length

#### Contract
- The function signature does not change.
- Pool ownership semantics do not change.

### 3) Change: `src/engine/phaser/display/modules/veinsRopePath.ts`

#### Responsibility
Separate stable guide-path compilation from phase-dependent full-path resolution while preserving the existing `buildRopePointsFull` behavior.

#### Logic
Add two new exported helpers.

##### A. Stable guide-path compilation
Input:
- the existing rope edge input shape currently accepted by `buildRopePointsFull`

Output:
- either a compiled guide-path object or `null` for a degenerate path

Compilation steps:
1. build the authored guide path from endpoints plus `meanderPoints`
2. smooth it with the existing `buildSmoothGuidePath`
3. build guide-path segment metrics with the existing `buildPolylineMetrics`
4. resolve `pathLengthPx` exactly as today
5. resolve segment count exactly as today
6. precompute the evenly spaced sample distances used along the guide path
7. create the simplex noise function once for the edge seed
8. package all of the above into `CompiledVeinGuidePath`

Degenerate-path rule:
- if the effective path length is below the current zero-length threshold, return `null`

##### B. Full-path resolution
Input:
- a `CompiledVeinGuidePath`
- the rope edge input
- `phaseShiftRad`

Output:
- the resolved full rope points for this phase

Resolution steps:
1. preserve the first point as `{ ax, ay }`
2. preserve the last point as `{ bx, by }`
3. for each interior sample distance, reuse the cached guide-path data and existing `sampleGuidePathPoint`
4. compute the wave offset using the same math used today
5. return the resolved points

##### C. Compatibility wrapper
`buildRopePointsFull` remains exported and remains behaviorally unchanged.

It becomes a thin wrapper:
1. compile the guide path
2. if compilation returned `null`, return an empty array
3. resolve and return the full rope points

#### Interface
New exports:
- `compileVeinGuidePath`
- `resolveVeinRopePoints`

Existing export retained:
- `buildRopePointsFull`

#### Contract
- For identical inputs, `buildRopePointsFull(edge, phase)` must return the same points as before.
- `compileVeinGuidePath` must be deterministic for the same edge input.
- `resolveVeinRopePoints` must be deterministic for the same compiled guide path, edge input, and phase.

### 4) Change: `src/engine/phaser/display/modules/veinsEdgeTick.ts`

#### Responsibility
Use the new cache to avoid unnecessary path rebuilding and ribbon redraws while preserving the current reveal and pulse behavior.

#### Logic
Add explicit invalidation and redraw rules.

##### A. Build signatures
Inside `tickEdge`, build two signatures:

1. **Stable geometry signature**
   - includes every edge field that changes guide-path compilation or full-path resolution except the per-tick phase delta
   - exact fields:
     - `veinType`
     - `ax`, `ay`, `bx`, `by`
     - ordered `meanderPoints`
     - `pathLengthPx`
     - `segments`
     - `ampPx`
     - `freq`
     - `phase0`
     - `seed`
     - `wavinessSimplexScale`

2. **Ribbon style signature**
   - includes every field that changes how the ribbons are drawn
   - exact fields:
     - `startWidthPx`
     - `endWidthPx`
     - `baseColor`
     - `glowAlpha`
     - `glowWidthStartPx`
     - `glowWidthEndPx`

No other fields participate in these signatures.

##### B. Resolve or rebuild the compiled guide path
- if `pathCache.stableGeometrySignature` differs from the current stable geometry signature, or if no compiled guide path exists:
  - compile a new guide path with `compileVeinGuidePath`
  - replace the cached compiled guide path
  - clear the cached full path
  - clear the cached visible path
  - clear the cached ribbon style signature
  - store the new stable geometry signature

##### C. Handle degenerate paths explicitly
If the compiled guide path is `null`:
- clear and hide `glowLine`
- clear and hide `baseLine`
- clear and hide `maskGraphics`
- release all pulses back to the pool
- empty `state.pulses`
- reset `state.revealedLenPx` to `0`
- set cached full and visible paths to empty
- return immediately

This replaces the current implicit early return that can leave stale visuals on screen.

##### D. Resolve the full path only when required
A full-path recompute is required when any of the following is true:
1. there is no cached full path
2. the stable geometry signature changed during this tick
3. the edge is nervous and the current `phaseShiftRad` differs from the last phase used to resolve the cached full path

When a recompute is required:
- resolve full points with `resolveVeinRopePoints`
- rebuild full-path metrics with the existing `buildPolylineMetrics`
- replace cached full points and cached full-path metrics
- store the phase used for the resolved full path
- clear the cached visible path because it is no longer guaranteed valid

When a recompute is not required:
- reuse the cached full points and cached full-path metrics unchanged

##### E. Advance reveal length exactly as today
Use the cached full-path total length with the existing `advanceRevealedLenPx`.

No formula changes are allowed.

##### F. Resolve the visible path only when required
A visible-path recompute is required when any of the following is true:
1. the full path was recomputed during this tick
2. there is no cached visible path
3. `state.revealedLenPx` differs from the last revealed length used to resolve the cached visible path

When required:
- recompute the visible path with the existing `slicePolylineToDistance`
- replace the cached visible points
- store the revealed length used for that visible path

When not required:
- reuse the cached visible points unchanged

##### G. Redraw ribbons only when required
A ribbon redraw is required when any of the following is true:
1. the visible path was recomputed during this tick
2. the current ribbon style signature differs from the cached ribbon style signature

When redraw is required:
- redraw glow, base, and mask ribbons with the existing `drawVeinRibbon`
- keep the current draw order unchanged
- set `maskGraphics` invisible after drawing exactly as today
- store the ribbon style signature that was used for drawing

When redraw is not required:
- do not call `drawVeinRibbon`
- do not clear existing graphics
- keep previously drawn ribbons on screen

##### H. Pulse logic remains behaviorally unchanged
After geometry resolution:
- pulse movement continues to use `samplePolylineAtDistance` against the current full path and current full-path metrics
- pulse spawn rules remain unchanged
- blob spacing variance and tint logic remain unchanged
- release semantics remain unchanged

##### I. Intensity tracking remains unchanged
`state.lastIntensity01` continues to be updated exactly as today.

#### Interface
`tickEdge` keeps its existing signature.

No caller changes are required.

#### Pseudocode
```text
phaseShiftRad = advanceWavePhase(...)

stableGeometrySignature = buildStableGeometrySignature(edge)
ribbonStyleSignature = buildRibbonStyleSignature(edge)

if cache signature missing or changed:
    cache.compiledGuidePath = compileVeinGuidePath(edge)
    clear cached full path
    clear cached visible path
    clear cached ribbon style signature
    cache.stableGeometrySignature = stableGeometrySignature

if cache.compiledGuidePath is null:
    hide and clear all ribbon graphics
    release all pulses
    reset reveal length and cached paths
    return

fullPathChanged = false
if no cached full path:
    fullPathChanged = true
else if edge.veinType is nervous and cached phase != phaseShiftRad:
    fullPathChanged = true

if fullPathChanged:
    cache.fullPoints = resolveVeinRopePoints(compiled, edge, phaseShiftRad)
    cache.fullSegmentLensPx, cache.fullTotalLenPx = buildPolylineMetrics(cache.fullPoints)
    cache.fullPathResolvedForPhaseRad = phaseShiftRad
    clear cached visible path

state.revealedLenPx = advanceRevealedLenPx(... cache.fullTotalLenPx ...)

visiblePathChanged = false
if no cached visible path:
    visiblePathChanged = true
else if cached visible revealed length != state.revealedLenPx:
    visiblePathChanged = true

if visiblePathChanged:
    cache.visiblePoints = slicePolylineToDistance(...)
    cache.visiblePathResolvedForLenPx = state.revealedLenPx

if visiblePathChanged or cached ribbon style signature != ribbonStyleSignature:
    redraw glow ribbon
    redraw base ribbon
    redraw mask ribbon
    cache.ribbonStyleSignature = ribbonStyleSignature

update and spawn pulses using cached full path and metrics
state.lastIntensity01 = edge.intensity01
```

#### Contract
- Static, fully revealed, unchanged edges must not redraw ribbons on subsequent ticks.
- Nervous edges may continue to recompute the full path when phase advances, but they must reuse compiled guide-path data until stable geometry changes.
- Geometry changes while paused must still trigger a redraw.
- Degenerate paths must not leave stale graphics or pulses visible.

### 5) Change: `src/engine/phaser/display/modules/veinsDisplayTestUtils.ts`

#### Responsibility
Keep display-module test factories aligned with the expanded edge visual state contract.

#### Logic
Update `makeState()` so the returned fake state contains a valid empty `pathCache` matching the real state contract.

No other fake behavior changes are required.

#### Interface
`makeState()` continues to return `VeinEdgeVisualState`.

#### Contract
- Test utilities must mirror the real runtime state shape.
- No production logic is added here.

### 6) Change: `src/engine/phaser/display/modules/veinsEdgeTick.test.ts`

#### Responsibility
Lock in the new redraw and cache invalidation contract at the `tickEdge` unit level.

#### Logic
Add the following test cases.

##### Required cases
1. **static fully revealed edge skips redraw on unchanged tick**
   - Given a non-nervous edge with a fully revealed cached ribbon
   - When `tickEdge` runs again with unchanged geometry, unchanged style, and zero simulation delta
   - Then no graphics redraw occurs

2. **style-only change redraws without forcing geometry rebuild**
   - Given cached full and visible paths
   - When only ribbon style fields change
   - Then ribbons redraw
   - And full-path cache reuse still occurs

3. **reveal growth redraws visible ribbon for static edge**
   - Given a non-nervous edge that is not fully revealed
   - When reveal length increases
   - Then the visible path is recomputed and ribbons redraw

4. **nervous edge re-resolves full path when phase advances**
   - Given a nervous edge with compiled guide-path cache
   - When simulation time advances
   - Then the full path is recomputed
   - And the guide-path compilation is reused if stable geometry is unchanged

5. **paused geometry change still redraws**
   - Given `simulationDeltaMs = 0`
   - When an edge endpoint, meander point, segment count, or wave parameter changes
   - Then cached geometry is invalidated and ribbons redraw

6. **degenerate path clears stale visuals**
   - Given an edge that previously rendered normally
   - When its effective path becomes degenerate
   - Then graphics are hidden and cleared
   - And pulses are released

7. **pulse behavior is unchanged when geometry is reused**
   - Given a cached full path for a static edge
   - When pulses move or spawn
   - Then pulse positions and spawn spacing still follow the existing contract

#### Interface
No test-only production hooks are added.

The tests must assert behavior through existing graphics and pool spies.

#### Contract
The test file must remain a unit test for display logic only.

### 7) Add: `src/engine/phaser/display/modules/veinsRopePath.test.ts`

#### Responsibility
Verify the new compile/resolve split without changing the public `buildRopePointsFull` contract.

#### Logic
Add the following test cases.

##### Required cases
1. **compiled guide path is deterministic**
   - same input edge produces equivalent compiled guide-path content

2. **resolve matches compatibility wrapper**
   - `resolveVeinRopePoints(compileVeinGuidePath(edge), edge, phase)` matches `buildRopePointsFull(edge, phase)`

3. **degenerate path compiles to null**
   - zero-length effective path returns `null`

4. **phase-only changes do not require recompilation**
   - compilation result for the same stable geometry input is reusable across multiple phases

#### Interface
The tests import the new rope-path exports directly from `veinsRopePath.ts`.

#### Contract
These tests verify pure path math only. They do not inspect Phaser objects.

## Detailed invalidation contract

### Stable geometry invalidation inputs
The stable geometry cache must invalidate when any of these change:
- `veinType`
- endpoints
- ordered meander points
- `pathLengthPx`
- `segments`
- `ampPx`
- `freq`
- `phase0`
- `seed`
- `wavinessSimplexScale`

It must **not** invalidate for:
- `baseColor`
- ribbon widths
- glow alpha
- pulse color
- blob spawn rate
- blob speed
- intensity-only changes that do not alter path shape

### Ribbon redraw invalidation inputs
The ribbon draw cache must invalidate when any of these change:
- cached visible path identity
- `startWidthPx`
- `endWidthPx`
- `baseColor`
- `glowAlpha`
- `glowWidthStartPx`
- `glowWidthEndPx`

It must **not** invalidate only because pulses moved or spawned.

## Error handling and edge cases
1. Degenerate path must clear graphics and release pulses.
2. Empty `meanderPoints` remains valid and must continue to render a straight or waved path according to existing math.
3. Paused simulation must still reflect data changes.
4. Nervous edges must continue to animate wave phase when simulation is running.
5. Non-nervous fully revealed edges must become redraw-stable.

## Test strategy
This design follows the existing test split:
- pure math and cache contracts remain unit tests in `src/engine/**`
- no DOM tests are introduced
- no runtime integration tests are required because the public `tickEdge` and `buildRopePointsFull` contracts remain inside the existing display-module boundary

Each added or changed test must use the existing Given / When / Then style already used in the display module tests.

## Acceptance criteria
Implementation is complete only when all of the following are true:
1. `tickEdge` no longer redraws static, fully revealed, unchanged ribbons every tick.
2. Nervous edges reuse compiled guide-path data across phase-only updates.
3. Geometry changes while paused are still rendered correctly.
4. Degenerate paths leave no stale visible veins or pulses.
5. Existing `buildRopePointsFull` callers keep their current behavior.
6. All affected tests pass.

## Out-of-scope files
No files outside the following set are to be changed:
- `src/engine/phaser/display/modules/veinsModuleTypes.ts`
- `src/engine/phaser/display/modules/veinsEdgeState.ts`
- `src/engine/phaser/display/modules/veinsRopePath.ts`
- `src/engine/phaser/display/modules/veinsEdgeTick.ts`
- `src/engine/phaser/display/modules/veinsDisplayTestUtils.ts`
- `src/engine/phaser/display/modules/veinsEdgeTick.test.ts`
- `src/engine/phaser/display/modules/veinsRopePath.test.ts`

No other files are required for this fix.
