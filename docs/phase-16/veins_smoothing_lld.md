# Veins Smoothing LLD

## Why

The current vein path is built from a raw polyline `[start, ...meanderPoints, end]` and then drawn with straight `lineTo` segments.
That makes each large side-to-side guide change appear as a hard corner.

The implemented meander feature is already present and working.
This LLD is only for replacing the hard-corner spine with a smooth canonical path.

## Scope

In scope:
- make vein spines smooth and curvy
- treat `meanderPoints` as **soft guide points**, not mandatory pass-through vertices
- keep render, reveal, pulse placement, and nervous-vein wave motion on the same canonical path

Out of scope:
- no new authored config
- no schema changes
- no editor changes
- no color, pulse, thickness, or heartbeat changes
- no refactor outside the vein path pipeline

## Contract

1. `meanderPoints` remain in data as authored guide points.
2. The rendered vein path must start exactly at `(ax, ay)` and end exactly at `(bx, by)`.
3. The rendered vein path is **not required** to pass through any `meanderPoints`.
4. The canonical vein path must be deterministic for the same edge input and phase input.
5. `pathLengthPx` must represent the length of the same smooth canonical path used for rendering and wave-phase motion.
6. Waviness is applied **after** the smooth guide path is built, using the local normal of the smooth path.
7. Reveal length, pulse travel, and mask drawing continue to use the final sampled rope points returned by `buildRopePointsFull`.

## Design

### Chosen approach

Use an **endpoint-preserving Chaikin corner-cutting pass** to convert the raw guide polyline into a smooth guide polyline.
Then resample that smooth guide polyline by arc length and apply waviness on top of it.

Why this approach:
- matches the new soft-guide-point requirement
- removes hard corners without adding authored knobs
- stays deterministic
- is a pure geometry step that is easy to test
- avoids changing the Phaser drawing contract

### Canonical path pipeline

1. Build the raw guide polyline:
   - `P0 = start`
   - `P1..Pn-1 = meanderPoints`
   - `Pn = end`
2. If the raw guide polyline has fewer than 3 points, use it unchanged.
3. Otherwise, run **2 Chaikin smoothing passes** with endpoint preservation.
4. Measure the resulting smooth guide polyline length.
5. Use that measured smooth length as `pathLengthPx`.
6. In `buildRopePointsFull`, resample the smooth guide polyline into `segments + 1` arc-length-spaced points.
7. For each interior sampled point, compute the local normal from the smooth guide polyline and apply the existing waviness/noise offset.
8. Keep the first and last sampled points unmodified so endpoints stay anchored.

### Smoothing algorithm

Given an open polyline `P0..Pn`:
- output starts with `P0`
- for each original segment pair, generate corner-cut points
- output ends with `Pn`
- endpoints are never moved

For each pass, for every interior corner formed by `Pi-1, Pi, Pi+1`, replace the hard corner with two points:
- `Q = 0.25 * Pi-1 + 0.75 * Pi`
- `R = 0.75 * Pi + 0.25 * Pi+1`

Equivalent open-path construction for one pass:
- start with `P0`
- for each interior point `Pi` where `1 <= i <= n - 1`, append `Q` then `R`
- end with `Pn`

This makes each authored meander point act as a guide that pulls the curve, without forcing the final path through that exact vertex.

## Files

### 1. Add: `src/engine/phaser/veins/veinSmoothGuidePath.ts`

**Responsibility**
- Own the pure geometry conversion from raw guide polyline to smooth guide polyline.

**Logic**
- Export a pure function that accepts an ordered point array.
- Return the same array for fewer than 3 points.
- Otherwise perform exactly 2 endpoint-preserving Chaikin passes.
- Return the refined smooth guide polyline.

**Interface**
- Input: `Array<{ x: number; y: number }>` ordered from source to target
- Output: `Array<{ x: number; y: number }>` ordered from source to target
- No Phaser dependency
- No randomness

### 2. Add: `src/engine/phaser/veins/veinSmoothGuidePath.test.ts`

**Responsibility**
- Unit-test the smoothing contract in isolation.

**Logic to verify**
- endpoints stay anchored
- fewer-than-3-point paths are unchanged
- same input returns same output
- smoothed output does not contain the original interior guide vertex for a non-collinear bend
- max turn severity is lower than the raw guide polyline for a zig-zag guide path

**Interface**
- Standard Vitest unit tests only

### 3. Change: `src/engine/phaser/veins/veinPathShape.ts`

**Responsibility**
- Continue generating deterministic authored `meanderPoints`
- Change `pathLengthPx` to represent the smooth canonical guide-path length instead of the raw guide polyline length

**Logic**
- Keep existing meander-point generation exactly as is
- After generating `meanderPoints`, build the raw guide polyline `[start, ...meanderPoints, end]`
- Pass it to `buildSmoothGuidePath`
- Measure that returned smooth guide polyline
- Return:
  - the original `meanderPoints` unchanged
  - `pathLengthPx` equal to the measured smooth guide length

**Interface**
- Existing function signature stays unchanged
- Existing return shape stays unchanged
- Semantic change only: `pathLengthPx` now means smooth canonical path length

### 4. Change: `src/engine/phaser/display/modules/veinsRopePath.ts`

**Responsibility**
- Build the final rope point list from the smooth canonical guide path, then apply waviness

**Logic**
- Replace the current raw-spine sampling path with:
  1. raw guide polyline = `[start, ...meanderPoints, end]`
  2. smooth guide polyline = `buildSmoothGuidePath(raw guide polyline)`
  3. measure the smooth guide polyline
  4. resample it by arc length into `segments + 1` points
  5. apply existing waviness/noise offset to interior points only, using the local normal from the smooth guide polyline
- Remove the current requirement that authored meander vertices appear in the returned rope point list
- Do not change the external function signature

**Interface**
- `buildRopePointsFull(edge, phaseShiftRad?) => Array<{ x: number; y: number }>` remains unchanged
- Returned points remain the canonical path for rendering, reveal, and pulse motion

### 5. Change: `src/engine/phaser/display/modules/veinsRopeUtils.test.ts`

**Responsibility**
- Update unit coverage for the new soft-guide contract

**Logic to verify**
- endpoints remain anchored
- deterministic output remains unchanged
- zero simplex scale removes noise but does not require the path to pass through authored guide points
- a bent guide path produces a curved sampled result with reduced corner severity versus the raw guide polyline
- no-meander path remains straight when waviness is zero

**Interface**
- Existing test file; assertions updated to the new contract

### 6. Change: `src/engine/phaser/veins/veinPathShape.test.ts`

**Responsibility**
- Validate the semantic change of `pathLengthPx`

**Logic to verify**
- direct path with zero meander still returns direct length
- non-zero meander returns a `pathLengthPx` measured from the smooth guide path, not the raw guide polyline
- the result stays deterministic for the same inputs

**Interface**
- Existing test file; assertions updated only where `pathLengthPx` meaning changes

### 7. Change: `src/engine/phaser/veins/veinConfig.integration.test.ts`

**Responsibility**
- Keep the end-to-end contract aligned with soft guide points

**Logic to verify**
- config still flows into edge generation unchanged
- `waviness_simplex_scale` still reaches rendering unchanged
- `segments` still derives from `pathLengthPx`
- final rope samples are anchored and dense enough
- zero simplex scale removes noise without requiring authored guide-point pass-through

**Interface**
- Existing integration test file; assertions updated to the new contract

## No-Change Files

No changes are required in:
- schema/data files under `src/data/schemas/assets/**`
- `VeinConfigEditor.tsx`
- `veinsEdgeDrawing.ts`
- `veinsEdgeTick.ts`
- `veinsDisplayBuilder.ts`

Reason:
- no new authored setting is introduced
- Phaser drawing already accepts the canonical point list
- reveal, mask, and pulse placement already consume the canonical point list returned by `buildRopePointsFull`
- `veinsDisplayBuilder.ts` already consumes `pathLengthPx` from `veinPathShape.ts`; once `veinPathShape.ts` computes the smooth length, the builder stays correct

## Test Plan

### Unit

`veinSmoothGuidePath.test.ts`
- Given a straight 2-point path, when smoothed, then output is identical
- Given a 3-point bent path, when smoothed, then endpoints are preserved and the middle authored point is not present in the output
- Given the same guide path twice, when smoothed, then outputs are identical
- Given a zig-zag guide path, when smoothed, then its maximum interior turn angle is lower than the raw path

`veinsRopeUtils.test.ts`
- Given a smoothed guide path with zero waviness, when rope points are built, then endpoints are anchored and no authored-point pass-through is required
- Given no meander and zero waviness, when rope points are built, then all sampled points are collinear
- Given equal input and phase, when rope points are built twice, then outputs are identical

`veinPathShape.test.ts`
- Given zero meander, when shape is built, then `pathLengthPx` equals direct length
- Given non-zero meander, when shape is built, then `pathLengthPx` equals the measured smooth guide length

### Integration

`veinConfig.integration.test.ts`
- Given authored meander and simplex-scale config, when display edges and rope points are built, then the config reaches the edge unchanged, `segments` is derived from smooth `pathLengthPx`, and final rope points remain anchored
- Given zero simplex scale and non-zero meander, when rope points are built, then the rope still bends smoothly but is not required to contain the authored guide point

## Acceptance Criteria

The change is complete when all of the following are true:
- veins with strong lateral meander no longer show hard corners at guide points
- the same smooth canonical path length is used for path-length-derived timing and rendered sampling
- the external data shape and editor surface are unchanged
- all updated unit and integration tests are green
