# phase_16_visuals_2_pt_4_lld.md

## Why

### Current problems
1. **Vein motion is visually “silly”**
   - The rope path undulates in real time, making every vein look alive/wormy rather than structural.
2. **Pulse is coupled to the entire vein**
   - Color changes apply to the whole stroke instead of being localized, so the network “flashes” as a block.
3. **Placement animation layer is missing**
   - When a node is moved or created, the vein does not *grow toward the goal*. Instead, it appears already fully placed (or only appears to “move” after the motion ends), which reads as latency rather than intent.

### Architectural constraints (must remain true)
- UI is presentation-only: no simulation/state cheating; all simulation mutation continues to flow through the runtime command pipeline. fileciteturn1file2L18-L25
- No speculative refactors or scope expansion; only the requested visual behavior changes. fileciteturn1file3L17-L39
- Tests must validate behavior, be readable, and keep logic isolated for unit testing. fileciteturn1file0L7-L27

---

## What

We will implement **two independent animation layers** for veins:

1. **Placement (reveal)**
   - Each vein has a *revealed length* that advances toward the current geometric “goal length”.
   - This makes veins **grow gradually toward a moved/created node** instead of appearing instantly.
   - The placement layer is deterministic, tick-driven, and lives entirely in the Phaser display module (presentation state only).

2. **Pulse (traveling blobs)**
   - The base vein stroke color becomes **static** (dim structural color).
   - Pulse becomes **localized “color blobs”** that travel from A → B along the curve.
   - Pulse is visually clipped using a **mask** so blobs stay inside the vein tube and within the currently revealed portion.

Additionally:
- **Remove realtime undulation**
  - Vein curvature remains organic but becomes **static per edge** (seeded wave with no time term).

---

## How

### High-level rendering model

For each vein edge `E` we render:

1. **Base vein stroke** (Graphics)
   - Drawn along the **currently revealed** portion of the edge curve.
   - Uses `E.baseColor` (static dim).

2. **Pulse overlay** (Container of Image sprites)
   - Each pulse is an Image (“blob”) traveling along the edge curve.
   - Uses `E.pulseColor` (static bright) and sprite alpha/scale constants.
   - The entire pulse container is **masked** by a Graphics geometry mask drawn along the revealed curve at the vein width.

### Placement model (unambiguous)

Per edge `E` we store presentation-only state:

- `revealedLenPx` (number, >= 0)
- `desiredLenPx` (number, >= 0; recomputed each tick from current geometry)
- The visible fraction is `growth01 = clamp(revealedLenPx / desiredLenPx, 0..1)` (defined only when `desiredLenPx > 0`)

Update rule each tick:
- `desiredLenPx` = arc length of the edge’s current curve (polyline approximation over the fixed rope segments).
- If `revealedLenPx < desiredLenPx`:
  - `revealedLenPx = min(desiredLenPx, revealedLenPx + dtSec * PLACEMENT_GROW_SPEED_PX_PER_SEC)`
- Else (`revealedLenPx >= desiredLenPx`):
  - `revealedLenPx = desiredLenPx` (immediate clamp; no retract animation)

This guarantees:
- Veins **never overshoot** the current goal.
- Continuous node movement results in continuous “catch-up” growth (the requested “grow toward it” behavior).

### Pulse model (unambiguous)

Per edge `E` we store presentation-only state:
- `lastIntensity01` (number)
- `activePulses` (list of pulse instances; bounded)

Pulse spawn rule (rising-edge trigger):
- Define constant `PULSE_SPAWN_THRESHOLD_01`.
- A new pulse is spawned exactly when:
  - `lastIntensity01 < PULSE_SPAWN_THRESHOLD_01` AND `E.intensity01 >= PULSE_SPAWN_THRESHOLD_01`
- After evaluating spawn, set `lastIntensity01 = E.intensity01`.

Pulse movement rule:
- Each pulse instance stores `distancePx` traveled along the curve (>= 0).
- Each tick:
  - `distancePx += dtSec * PULSE_SPEED_PX_PER_SEC`
  - If `distancePx > revealedLenPx`: pulse is removed (it has reached the currently placed end).
  - Otherwise, position is computed by sampling the curve polyline at `distancePx`.

Pulse limits:
- `MAX_ACTIVE_PULSES_PER_EDGE` is enforced strictly:
  - If spawning would exceed the cap, the oldest pulse is removed first (deterministic order: FIFO).

### Masks (unambiguous)

- Each edge has a **single GeometryMask** sourced from a Graphics object `maskGraphics`.
- Every tick, `maskGraphics` is redrawn as a stroked polyline covering the **revealed** portion of the curve:
  - Stroke width = `edge.widthPx`
- The pulse container has this mask applied.
- The base stroke does not rely on masking (it is drawn directly over the revealed polyline), but both layers remain consistent because they use the same revealed polyline inputs.

### Determinism

All new animation state:
- lives only in the Phaser display module (presentation state),
- is advanced only by `deltaMs` passed into `tick`,
- uses constant parameters and deterministic ordering.

No simulation state is modified by these changes. fileciteturn1file2L45-L56

---

## File-level design

### 1) CHANGE — `src/engine/phaser/display/VeinsDisplayData.ts`

#### Responsibility
Defines the **data contract** emitted by `VeinsSystem` and consumed by the Phaser display layer for veins.

#### Logic
No logic. Type-only contract.

#### Interface (must match exactly)

`VeinsDisplayEdge` becomes:

- `id: string`
- `veinType: string`
- `sourceKey: string`
- `aId?: string`
- `bId?: string`
- `ax: number`
- `ay: number`
- `ar: number`
- `bx: number`
- `by: number`
- `br: number`
- `widthPx: number`  
  Structural width only (no pulse scaling).
- `intensity01: number`  
  Pulse driver only (0..1). Must not be used to tint the entire stroke.
- `baseColor: number`  
  Packed Phaser color (0xRRGGBB). Used for the base stroke.
- `pulseColor: number`  
  Packed Phaser color (0xRRGGBB). Used to tint pulse blobs.
- `ampPx: number`
- `freq: number`
- `phase0: number`
- `seed: number`

`VeinsDisplayDataComponent` remains:
- `edges: VeinsDisplayEdge[]`

Notes:
- `growth01` is removed from the data contract. Placement is computed entirely in the display module.

---

### 2) CHANGE — `src/engine/phaser/veins/veinsDisplayBuilder.ts`

#### Responsibility
Transforms the runtime-built `VeinGraph` into `VeinsDisplayEdge[]` with:
- positions,
- structural widths,
- pulse driver intensity,
- deterministic curve parameters,
- precomputed display colors (base + pulse).

#### Logic (must implement exactly)
For each `VeinEdge`:
- Determine `widthPx` as **structural width**:
  - Supply edges: `resolveBaseWidth(edge.power, config)`
  - Demand edges (pool → sink): `base = edge.sourceRadius * 2 * max(0, edge.drawFraction)` then clamp to `[min_width, max_width]`
- Set `intensity01 = edge.intensity` (0..1).
- Set `baseColor` and `pulseColor`:
  - For vein types with configured colors (body/mind/social):
    - `baseColor` = dimmed color using `config.colors.supply_dim_factor`
    - `pulseColor` = bright color using `config.colors.supply_bright_factor`
  - For non-configured types (e.g., nervous):
    - Use the existing fallback vein color and apply the same dim/bright factors.
- Preserve seeded curvature params:
  - `ampPx`, `freq`, `phase0`, `seed` remain deterministic derived from `id`.

#### Interface
Exports:
- `buildDisplayEdges(graph: VeinGraph, config: VeinConfig): VeinsDisplayEdge[]`

No other exports are added.

---

### 3) CHANGE — `src/engine/phaser/display/modules/veinsRopeUtils.ts`

#### Responsibility
Builds a **static** polyline approximation of a vein curve for a given edge.

#### Logic (must implement exactly)
- Compute a polyline with a constant number of segments `ROPE_SEGMENTS`.
- Apply a seeded sinusoidal offset perpendicular to the A→B vector:
  - The wave term must **not** include any time-dependent component.
- Return points for the full curve from A to B.

#### Interface
Exports:

- `buildRopePointsFull(edge: { ax, ay, bx, by, ampPx, freq, phase0 }): Vector2Like[]`
- `ROPE_SEGMENTS` is internal-only (not exported) unless already exported elsewhere.

No `timeMs` parameter exists after this change.

---

### 4) ADD — `src/engine/phaser/display/modules/veinsVisualMath.ts`

#### Responsibility
Pure, deterministic math utilities for:
- placement reveal advancement,
- polyline arc-length measurement + sampling,
- pulse spawning decision.

This file exists to keep `VeinsModule` small and to enable unit tests without Phaser objects (logic isolation). fileciteturn1file0L11-L27

#### Logic (must implement exactly)
Exports the following pure functions:

1. `advanceRevealedLenPx(params)`
   - Inputs: `revealedLenPx`, `desiredLenPx`, `deltaMs`, `growSpeedPxPerSec`
   - Output: next `revealedLenPx`
   - Rules:
     - If `desiredLenPx <= 0`: returns `0`
     - If `revealedLenPx < desiredLenPx`: increases by `deltaMs/1000 * growSpeedPxPerSec`, capped at `desiredLenPx`
     - Else clamps to `desiredLenPx`

2. `buildPolylineMetrics(points)`
   - Input: `points: {x,y}[]` length >= 2
   - Output:
     - `segmentLensPx: number[]` length = points.length - 1
     - `totalLenPx: number` sum of segments
   - If input invalid (<2 points): returns totalLenPx = 0 and empty segment array.

3. `samplePolylineAtDistance(points, segmentLensPx, distancePx)`
   - Inputs:
     - `distancePx` clamped to `[0, totalLenPx]`
   - Output: `{x,y}` on the polyline via linear interpolation within the target segment.
   - If totalLenPx == 0: returns first point if present, else `{x:0,y:0}`.

4. `slicePolylineToDistance(points, segmentLensPx, distancePx)`
   - Returns a new points array representing the polyline from start up to `distancePx`.
   - The final point is interpolated exactly at the slice distance.
   - Always returns at least one point if input has one.

5. `isRisingEdgeCrossing(prev, next, threshold)`
   - Returns `true` iff `prev < threshold` and `next >= threshold`.

#### Interface
Only the functions above are exported. No Phaser imports are allowed in this file.

---

### 5) CHANGE — `src/engine/phaser/display/modules/VeinsModule.ts`

#### Responsibility
Renders veins using Phaser objects with:
- static base stroke,
- placement reveal,
- traveling pulse blobs clipped via mask,
- pooling and lifecycle management for all Phaser objects created by the module.

#### Internal state (presentation-only)
Per active edge `id`, store:

`VeinEdgeVisualState`:
- `container: Phaser.GameObjects.Container`
- `baseLine: Phaser.GameObjects.Graphics`
- `maskGraphics: Phaser.GameObjects.Graphics`
- `pulseContainer: Phaser.GameObjects.Container`
- `pulseMask: Phaser.Display.Masks.GeometryMask`
- `revealedLenPx: number`
- `lastIntensity01: number`
- `pulses: PulseInstance[]` (FIFO order)

`PulseInstance`:
- `image: Phaser.GameObjects.Image`
- `distancePx: number`

All instances are created from `DisplayTypePool` (graphicsPool, imagePool, rootPool).

#### Tick logic (must implement exactly, in this order)
For each tick when `veinsDisplayData` is present:

1. **Active edge reconciliation**
   - Compute `activeIds` from `data.edges`.
   - For any state in the map not in `activeIds`, fully dispose (remove from parent, clear mask, release pooled objects).

2. **Per-edge update**
   For each `edge` in `data.edges`:
   - Acquire/create state if missing:
     - revealedLenPx starts at `0`
     - lastIntensity01 starts at `edge.intensity01`
     - pulses empty
     - pulse mask is created once and assigned to `pulseContainer`
   - Build full curve points via `buildRopePointsFull(edge)`.
   - Compute metrics via `buildPolylineMetrics(pointsFull)`.
   - Compute `desiredLenPx = totalLenPx`.
   - Update `revealedLenPx` using `advanceRevealedLenPx(...)`.
   - Build `visiblePoints` via `slicePolylineToDistance(pointsFull, segmentLensPx, revealedLenPx)`.
   - Draw `baseLine` along `visiblePoints` using:
     - width = `edge.widthPx`
     - color = `edge.baseColor`
     - alpha = `BASE_STROKE_ALPHA`
   - Draw `maskGraphics` along `visiblePoints` using:
     - width = `edge.widthPx`
     - color/alpha arbitrary (mask source only)
   - Pulse spawn:
     - if `isRisingEdgeCrossing(lastIntensity01, edge.intensity01, PULSE_SPAWN_THRESHOLD_01)` then spawn pulse
   - Update `lastIntensity01 = edge.intensity01`
   - Pulse advance:
     - For each pulse (in FIFO order):
       - `distancePx += dtSec * PULSE_SPEED_PX_PER_SEC`
       - If `distancePx > revealedLenPx`: despawn
       - Else: position via `samplePolylineAtDistance(...)`
   - Pulse rendering:
     - Each pulse image:
       - texture key = module-scoped `pulseTextureKey`
       - tint = `edge.pulseColor`
       - alpha = `PULSE_ALPHA`
       - scale = derived from `edge.widthPx` (defined by constants below)

3. **No-data behavior**
   - If `veinsDisplayData` is absent:
     - Module container is hidden.
     - No pooled objects are destroyed (consistent with existing module behavior).

#### Constants (must be exact)
The module defines these constants with the specified meaning:

- `PLACEMENT_GROW_SPEED_PX_PER_SEC`
- `PULSE_SPEED_PX_PER_SEC`
- `PULSE_SPAWN_THRESHOLD_01`
- `MAX_ACTIVE_PULSES_PER_EDGE`
- `BASE_STROKE_ALPHA`
- `PULSE_ALPHA`
- `PULSE_RADIUS_MULTIPLIER`  
  Blob radius in pixels is `edge.widthPx * PULSE_RADIUS_MULTIPLIER`

The values must be set in the implementation and treated as locked for phase_16_visuals_2_pt_4.

#### Interfaces
No public exports change:
- `VeinsModule` remains a `DisplayModuleFactory` with `create()` returning `{ tick, destroy }`.

---

## Tests

All tests must follow the project testing philosophy:
- Behavior-focused, readable Given/When/Then, logic isolated. fileciteturn1file0L7-L27
- No DOM; unit tests for pure math; no Phaser scene required.

### 1) ADD — `src/engine/phaser/display/modules/veinsVisualMath.test.ts`

#### Coverage (must include all)
Unit tests for `veinsVisualMath.ts`:

1. `advanceRevealedLenPx`
   - Happy path: grows toward desired at the configured speed.
   - Edge case: clamps exactly at desired.
   - Negative path: desiredLenPx <= 0 returns 0.

2. `isRisingEdgeCrossing`
   - True only on threshold crossing from below to at/above.
   - False when both below, both above, or falling through threshold.

3. `buildPolylineMetrics` + `samplePolylineAtDistance`
   - Given a 2-point line from (0,0) to (10,0):
     - totalLenPx = 10
     - sampling at 0, 5, 10 returns x = 0, 5, 10 respectively.
   - Edge case: invalid input (<2 points) returns safe outputs.

4. `slicePolylineToDistance`
   - Given a 2-point line (0→10):
     - slice at 0 returns [start]
     - slice at 5 returns [start, (5,0)]
     - slice at 10 returns [start, end]

### 2) CHANGE — existing type-driven compile safety
No explicit test is required for the new `VeinsDisplayEdge` fields beyond TypeScript compilation, because:
- The behavior of colors and widths is exercised implicitly by the display layer at runtime,
- The only new non-Phaser logic is covered by the unit tests above.

(If the project requires explicit verification of color derivation, add a unit test colocated with `veinsDisplayBuilder.ts` that validates the mapping from config to `baseColor`/`pulseColor` using fixed inputs.)

---

## Acceptance criteria (must all be true)

1. **No realtime undulation**
   - Vein curves remain shaped but do not animate their curvature over time.
2. **No whole-vein pulse tint**
   - Base stroke color remains stable; pulse is visible only as traveling blobs.
3. **Placement is visible**
   - When a node is moved or created, veins visually “grow” toward the new goal rather than appearing fully placed.
4. **Mask correctness**
   - Pulse blobs never render outside the vein tube and do not extend beyond the currently revealed length.
5. **Performance safety**
   - Pooled objects are reused; removed edges release all allocated Graphics/Images/Containers.
6. **Tests**
   - New unit tests for `veinsVisualMath.ts` pass and meet the testing standards. fileciteturn1file0L29-L55
