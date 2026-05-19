# LLD — Vein Meandering and Waviness Control

## 1. Purpose

Add explicit authoring control for vein path meandering and waviness variation.

The implementation must satisfy four requirements:

1. Data must expose the new settings as part of `assets.settings.vein_network`.
2. The editor must surface those settings without introducing UI-side business logic.
3. Logic must convert those settings into deterministic, per-edge render inputs.
4. Render must draw veins that obey the new contract exactly.

## 2. Observed Current State

### 2.1 Current data contract

Current vein settings live at `assets.settings.vein_network`.

The current geometry subtree contains:

- `waviness_per_meter`
- `segments_per_meter`

There is no authored meander contract.
There is no authored simplex scale contract for waviness variation.

### 2.2 Current editor surface

The vein editor is `VeinConfigEditor`, which delegates to `SessionJsonEditor` with root path `assets.settings.vein_network`.

That means the editor already renders the full vein config subtree as JSON and does not contain vein-specific logic.

### 2.3 Current logic surface

`buildDisplayEdges` converts the vein graph plus `VeinConfig` into `VeinsDisplayEdge`.

It currently derives:

- width
- colors
- blob timing
- segment count
- wave frequency
- wave amplitude seed
- wave phase seed

It does not derive authored meander control points.

### 2.4 Current render surface

`buildRopePointsFull` currently creates the rope polyline directly from the start and end points.

It uses hardcoded simplex-based offsets for:

- broad center meander
- wave amplitude variation
- wave phase variation

This is the specific gap the feature must close:

- the broad meander is not authored; it is implicit noise
- the waviness simplex scale is hardcoded and not authored

## 3. Scope and Non-Goals

### In scope

- authored meander point-count range
- authored meander sideways offset range
- authored waviness simplex scale
- deterministic per-edge derivation
- render contract updates
- tests for schema, logic, render, and editor visibility

### Out of scope

- changing vein width rules
- changing blob flow rules
- changing heartbeat rules
- changing pulse colors
- changing the raw JSON editor pattern
- introducing spline interpolation or any new rendering technology

The renderer will continue to use polylines.
The editor will continue to use the existing JSON editor.

## 4. Authoritative New Contract

## 4.1 Config shape

Add the following authored fields under `assets.settings.vein_network.geometry`:

Pseudocode shape:

- `waviness_per_meter: number >= 0` (existing)
- `waviness_simplex_scale: number >= 0` (new)
- `segments_per_meter: number >= 1` (existing)
- `meander:` (new object)
    - `point_count_min: integer >= 0`
    - `point_count_max: integer >= point_count_min`
    - `offset_min_px: number >= 0`
    - `offset_max_px: number >= offset_min_px`

## 4.2 Behavioral meaning

### Meander

For each edge, the system will choose a deterministic integer `X` in the inclusive range `[point_count_min, point_count_max]`.

The rope spine must then pass through exactly `X` additional points between source and target.

Each additional point is defined by:

- a deterministic path position `t` in the open interval `(0, 1)`
- a deterministic sideways offset magnitude in the inclusive range `[offset_min_px, offset_max_px]`
- a deterministic sign of `+1` or `-1`

The additional points are ordered by ascending `t`.
The base rope spine is the ordered polyline:

`source -> meander points -> target`

### Waviness simplex scale

`waviness_simplex_scale` controls the frequency of simplex-driven waviness variation.

Definition:

- `0` means no simplex-driven waviness variation is applied
- values greater than `0` scale the normalized-distance input used for waviness simplex sampling
- larger values produce faster local variation
- smaller values produce smoother local variation

This field controls waviness variation only.
It does not control wave amplitude, width, or wave cycles per meter.

## 4.3 Determinism contract

Given the same runtime seed, same entities, and same config:

- the same edge must always receive the same meander point count
- the same edge must always receive the same meander point positions
- the same edge must always receive the same meander offsets
- the same edge must always render the same rope shape for the same animation phase

All per-edge random choices must therefore be derived from a stable edge identifier, never from frame time or mutable runtime state.

## 4.4 Backward compatibility

Existing asset files that omit the new fields remain valid.

Defaults will be supplied by the schema.

The implementation must also remove the existing ambiguity between `DEFAULT_VEIN_CONFIG` and `VeinConfigSchema` for geometry defaults. A missing vein config and an empty vein config must resolve to the same geometry defaults.

## 5. Implementation Design

## 5.1 Data flow after the change

1. Asset file is parsed into `VeinConfig`.
2. `buildDisplayEdges` resolves deterministic, per-edge path-shape metadata from the authored config.
3. Render receives a `VeinsDisplayEdge` that already contains the full authored path-shape contract.
4. `buildRopePointsFull` samples the spine polyline and applies waviness on top of that spine.
5. `tickEdge` renders the resulting polyline and keeps blob motion behavior unchanged.

## 5.2 Meander derivation algorithm

The meander derivation belongs in logic, not in UI and not as ad hoc state inside the renderer.

Pseudocode:

- build stable edge id
- derive deterministic random draws from that edge id
- choose `count` in `[point_count_min, point_count_max]`
- for each meander index:
    - sample `t` in `(0, 1)`
    - sample `offsetMagnitude` in `[offset_min_px, offset_max_px]`
    - sample `sign` in `{ -1, +1 }`
- sort all generated points by `t`
- project each point from the source-target centerline using its sideways offset
- compute spine length as the polyline length of `source -> points -> target`
- return both `meanderPoints` and `spineLengthPx`

Important rule:

No new runtime state is stored for these points. They are re-derived deterministically from edge id plus config.

## 5.3 Waviness derivation algorithm

Waviness remains render-time geometry, but it must now respect authored scale.

Pseudocode:

- build the base spine polyline from source, meander points, and target
- sample along the spine using equal distance steps, not straight-line interpolation
- for each sample:
    - compute local tangent from the containing spine segment
    - compute local normal from that tangent
    - compute the existing sine-wave displacement using `freq`, `phase0`, and animation phase
    - if `waviness_simplex_scale == 0`, set amplitude noise and phase noise to zero
    - otherwise, sample simplex using the existing waviness noise formulas multiplied by `waviness_simplex_scale`
    - offset the sampled spine point along the local normal
- force the first and last sampled points to remain exactly on source and target

Important rule:

The old simplex-based broad center meander is removed. Broad path deviation now comes only from authored meander points.

## 5.4 Length semantics

After this change, all path-length-derived values must use the meander spine length, not the straight-line distance.

That includes:

- `segments`
- `freq`
- nervous-system wave phase advancement length

This keeps authored meandering from accidentally reducing sampling density or wave count.

## 6. File-by-File Design

## 6.1 `src/data/schemas/assets/veins.ts`

### Responsibility

Own the authoritative vein config schema and defaults.

### Change

Extend `geometry` with:

- `waviness_simplex_scale`
- `meander.point_count_min`
- `meander.point_count_max`
- `meander.offset_min_px`
- `meander.offset_max_px`

Also align `DEFAULT_VEIN_CONFIG.geometry` with the schema defaults so the default source is unambiguous.

### Logic

Validation rules:

- `waviness_simplex_scale` must be finite and `>= 0`
- `point_count_min` and `point_count_max` must be finite integers and `>= 0`
- `point_count_max >= point_count_min`
- `offset_min_px` and `offset_max_px` must be finite and `>= 0`
- `offset_max_px >= offset_min_px`

### Interface

Input:

- raw vein config JSON

Output:

- `VeinConfig` with fully populated defaults for the new fields

No consumer is allowed to infer defaults outside this schema.

## 6.2 `src/engine/phaser/display/VeinsDisplayData.ts`

### Responsibility

Define the render-facing display contract for a single vein edge.

### Change

Add the following fields to `VeinsDisplayEdge`:

- `meanderPoints: Array<{ x: number; y: number }>`
- `pathLengthPx: number`
- `wavinessSimplexScale: number`

Retain the existing fields already used by the renderer.

### Logic

This file contains no behavior.
It is the explicit interface between logic and render.

### Interface

Producer:

- `buildDisplayEdges`

Consumers:

- `tickEdge`
- `buildRopePointsFull`
- tests that build `VeinsDisplayEdge` fixtures

## 6.3 `src/engine/phaser/veins/veinPathShape.ts` (new)

### Responsibility

Derive deterministic meander control points and authored path length for one vein edge.

### Logic

Inputs:

- edge endpoints
- stable edge id
- numeric edge seed
- authored meander config

Outputs:

- `meanderPoints`
- `pathLengthPx`

Rules:

- endpoints are not included in `meanderPoints`
- returned points are sorted from source to target order
- each returned point lies on the correct sideways side of the source-target centerline
- `pathLengthPx` is the polyline length of `source -> meander points -> target`
- if point count resolves to zero, `meanderPoints` is empty and `pathLengthPx` is the direct endpoint distance

### Interface

Pseudocode interface:

`buildVeinPathShape(params) -> { meanderPoints, pathLengthPx }`

This helper must be pure and deterministic.

## 6.4 `src/engine/phaser/veins/veinsDisplayBuilder.ts`

### Responsibility

Convert the vein graph plus authored config into the render contract.

### Change

For each edge:

- build stable edge id as today
- derive the existing numeric seed as today
- call `buildVeinPathShape(...)`
- compute `freq` from `pathLengthPx`
- compute `segments` from `pathLengthPx`
- copy `wavinessSimplexScale` from authored config
- attach `meanderPoints` and `pathLengthPx` to the returned `VeinsDisplayEdge`

### Logic

Unchanged behavior:

- width rules
- blob flow rules
- color rules
- heartbeat tint rules
- amplitude seed rule `ampPx = 2 + (seed % 3)`
- initial phase seed rule

Changed behavior:

- wave cycles and segment counts now use authored path length
- render input now explicitly carries authored meander points and authored waviness simplex scale

### Interface

Input:

- `VeinGraph`
- `VeinConfig`

Output:

- `VeinsDisplayEdge[]`

## 6.5 `src/engine/phaser/display/modules/veinsRopeUtils.ts`

### Responsibility

Build the final render polyline for one edge from the render contract.

### Change

Replace the implicit broad-center meander noise with the authored spine path.

### Logic

New steps:

- build spine polyline from `A + meanderPoints + B`
- resample the spine by distance using `segments`
- compute local normal from the active spine segment
- apply waviness on that normal
- use `wavinessSimplexScale` to control simplex-driven amplitude and phase variation
- keep endpoints anchored exactly

Removed behavior:

- the old simplex-derived `centerOffset` meander term

Preserved behavior:

- seeded determinism
- waviness sine phase behavior
- nervous-system phase animation hook
- endpoint anchoring

### Interface

Input:

- `VeinsDisplayEdge`
- `phaseShiftRad`

Output:

- ordered rope points for rendering

## 6.6 `src/engine/phaser/display/modules/veinsEdgeTick.ts`

### Responsibility

Advance animation state and draw one edge each frame.

### Change

Use `edge.pathLengthPx` when advancing nervous-system wave phase instead of recomputing straight-line endpoint distance.

### Logic

No changes to blob spawning, reveal growth, masking, or pulse placement.

### Interface

Input and output remain unchanged.
This is a behavior update only.

## 6.7 `src/data/raw/game_data.json`

### Responsibility

Provide the bootstrapped project data used by the app.

### Change

Add the new vein geometry fields explicitly under `assets.settings.vein_network.geometry`.

### Logic

No runtime logic.
The purpose is to make the new authored contract visible immediately in loaded data.

### Interface

Must serialize the same defaults defined in `DEFAULT_VEIN_CONFIG`.

## 6.8 `src/data/raw/example/modules/assets.art`

### Responsibility

Provide the example asset module content.

### Change

Add the new vein geometry fields explicitly under `settings.vein_network.geometry`.

### Logic

No runtime logic.
The purpose is to keep the example asset pack aligned with the new contract.

### Interface

Must serialize the same defaults defined in `DEFAULT_VEIN_CONFIG`.

## 6.9 `src/ui/devtools/editors/config/VeinConfigEditor.tsx`

### Responsibility

Expose the vein config subtree in the editor.

### Production change

No production code change required.

### Why no change is correct

This editor already renders `assets.settings.vein_network` through `SessionJsonEditor`.
Once the schema and loaded draft contain the new fields, the editor surfaces them automatically.

### Interface

Unchanged.
The editor contract remains the full JSON subtree.

## 6.10 `src/engine/phaser/veins/veinTestConfig.ts`

### Responsibility

Provide test-only config factories.

### Change

Update the geometry merge behavior so `geometry.meander` is deep-merged rather than overwritten wholesale.

### Logic

This prevents tests from having to restate the full meander object every time they override a single field.

### Interface

Input:

- partial `VeinConfig` overrides

Output:

- fully populated `VeinConfig`

## 7. Files Explicitly Not Changed

The following files should not be edited for this feature because they already consume the vein config as a whole and will inherit the new fields automatically once `DEFAULT_VEIN_CONFIG` is updated:

- `src/engine/vfs/bootstrapHydration.ts`
- `src/engine/terminal/commands/makeCommands.ts`
- `src/ui/devtools/project/newFileTemplates.ts`
- `src/lib/modules/fragmentSerializers.ts`
- `src/lib/modules/semanticModuleFragments.ts`
- `src/engine/phaser/veins/VeinsSystem.ts`
- `src/engine/phaser/veins/veinsRuntimeHelpers.ts`
- `src/engine/phaser/veins/veinsDisplayWriter.ts`
- `src/engine/phaser/display/modules/VeinsModule.ts`

This is intentional scope control.

## 8. Test Plan

The tests must follow the project testing standards:

- behavior-focused
- Given / When / Then structure
- isolated logic tests for pure helpers
- real data shapes instead of implementation-heavy mocks where feasible

## 8.1 `src/data/schemas/assets/veins.test.ts`

### Add/Update cases

1. defaults include the new fields
2. empty config and missing config resolve to the same geometry defaults
3. rejects negative `waviness_simplex_scale`
4. rejects negative meander counts
5. rejects non-integer meander counts
6. rejects `point_count_max < point_count_min`
7. rejects `offset_max_px < offset_min_px`

## 8.2 `src/engine/phaser/veins/veinPathShape.test.ts` (new)

### Cases

1. same edge id + same config returns identical meander points
2. resolved point count is always within the configured inclusive range
3. every returned point is ordered from source to target
4. every returned point stays within the authored sideways offset bounds
5. zero-point config returns no meander points and direct path length

## 8.3 `src/engine/phaser/veins/veinsDisplayBuilder.test.ts`

### Add/Update cases

1. output includes `meanderPoints`, `pathLengthPx`, and `wavinessSimplexScale`
2. `freq` and `segments` are derived from `pathLengthPx`, not direct endpoint distance
3. width and blob-flow behavior remain unchanged

## 8.4 `src/engine/phaser/display/modules/veinsRopeUtils.test.ts`

### Add/Update cases

1. endpoints remain anchored exactly
2. when `waviness_per_meter = 0` and `waviness_simplex_scale = 0`, the rope passes through the authored meander points with no extra waviness
3. the same input edge returns identical point arrays
4. increasing `waviness_simplex_scale` changes interior point variation while keeping endpoints fixed
5. zero meander points produces a straight spine plus any authored waviness

## 8.5 `src/engine/phaser/display/modules/veinsEdgeTick.test.ts`

### Add/Update cases

1. nervous veins advance wave phase using `pathLengthPx`
2. existing blob spawning behavior remains unchanged after the display-edge contract expansion

## 8.6 `src/engine/phaser/veins/veinConfig.integration.test.ts`

### Add/Update cases

1. a config containing authored meander and authored waviness simplex scale survives parse -> display-edge build -> rope-point generation
2. the generated rope contains the expected number of samples from authored path length
3. a zero-simplex-scale config removes waviness noise but preserves authored meander

## 8.7 `src/ui/devtools/editors/config/VeinConfigEditor.test.tsx` (new)

### Cases

1. the vein editor renders the JSON subtree containing the new geometry fields
2. the editor still points at `assets.settings.vein_network`

This is a view-layer contract test only. No business logic belongs here.

## 9. Acceptance Criteria

The feature is complete only when all of the following are true:

1. The new fields exist in the vein config schema with explicit validation.
2. Missing fields default correctly and deterministically.
3. The editor shows the new fields through the existing vein config JSON surface.
4. Each edge renders through exactly the authored number-range contract for additional meander points.
5. Each meander point lies within the authored offset range.
6. Waviness simplex scale is authored, validated, and applied by render.
7. Rope endpoints remain anchored.
8. Existing width, flow, heartbeat, and blob behavior is unchanged.
9. Same seed plus same config still yields the same result.
10. All new and existing relevant tests pass.

## 10. Summary of the Design Decision

- Meandering becomes explicit authored path geometry.
- Waviness variation remains procedural, but its simplex scale becomes authored.
- Logic derives deterministic path metadata.
- Render consumes that metadata and no longer invents broad meander on its own.
- The existing JSON editor remains the correct editor surface; no UI-side business logic is introduced.

