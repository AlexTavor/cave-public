# Phase 17 Display Editor — Part 2 LLD

## 1. Purpose

This follow-up phase fixes the gaps in the current display editor implementation:

1. Preview starts off-camera.
2. Slot animation cannot be authored per slot.
3. Slot base scale tops out at `2`, but needs to top out at `4`.
4. Radius cannot be edited from the visuals editor even though it is part of the rendered shape.
5. Background family identity is too weak.
6. Background family rotation cannot be authored.
7. Slot default radial position cannot be authored.
8. Styled fill amount cannot be authored.
9. Slot color cannot be authored.

This phase must remain inside the existing authoring and rendering architecture:

- blueprint authoring remains `_editor.abilities.*`
- glyph assets remain `assets.glyphs`
- style assets remain `assets.styles`
- preview remains the disposable Phaser runtime
- runtime rendering remains the existing background and glyph modules

No parallel editor, no parallel asset bucket, and no new runtime rendering system are introduced.

---

## 2. Current code reality

The current branch already contains the Phase 17 editor and runtime path, but the relevant contracts are incomplete.

### 2.1 Preview focus is wrong because of how the preview runtime is built

The preview runtime factory in `src/ui/devtools/editors/blueprint/visuals/createBlueprintVisualsPreviewRuntime.ts` compiles the target blueprint, injects physics only when missing, spawns only the target entity, and does not create or spawn `sys_world`.

The camera bootstrap path centers on the world center when there is no `sys_world` entity. In the current preview runtime, the target entity is at `(0, 0)` when physics is injected, while the camera centers on the default world center. That is why preview starts away from the node.

### 2.2 Radius is not owned by the visuals editor contract

The rendered radius is authored by `_editor.abilities.worldPresence.radius` and compiled by `spatialCompiler` into both `components.spatial` and `components.display.radius`. The visuals editor currently edits only passport-backed style and glyph assets. Therefore radius is missing from the modal even though it is part of the displayed result.

### 2.3 Background family identity is weak in the current math

`src/engine/phaser/display/modules/backgroundBlobMath.ts` currently derives `triangle`, `square`, and `hex` by adding a low-amplitude lobe cosine to the same circular blob process and samples that shape at `48` points. There is also no authored family rotation field. The result is deterministic, but family identity is not strong enough and cannot be oriented.

### 2.4 Styled fill has no authored amount

`src/engine/phaser/display/modules/backgroundStyledRenderer.ts` currently uses live `pulseValue` as the fill coverage fraction for non-solid fill modes. There is no authored `fill amount` in the style schema, so the editor cannot set “how full it is.”

### 2.5 Slot animation is global, not per-slot

`src/engine/phaser/display/glyph/glyphRenderMath.ts` uses the glyph-level `pulse` object for:

- movement relative to center
- scale pulse
- rotation delta

That means the current editor can only edit base placement shape, base scale, base rotation, and delay. It cannot edit slot-specific animation.

### 2.6 Slot color already exists in runtime but is blocked by the asset contract

The renderer already tints glyph images from `placement.colorHex`. The limitation is not the renderer. The limitation is the persisted asset contract:

- `src/data/schemas/assets/glyphs.ts` restricts `colorHex` to the four-value `PALETTE`
- `src/engine/phaser/display/glyph/GlyphPresetParser.ts` repeats that restriction
- `GlyphVisualSection.tsx` does not expose color editing

This is an authoring/schema problem, not a renderer problem.

---

## 3. Locked decisions

### 3.1 Radius stays in `worldPresence`

Radius must continue to be authored in `_editor.abilities.worldPresence`. It must not be moved into passport, glyph assets, or style assets.

Reason: `spatialCompiler` already owns the contract that writes `display.radius` and `physics.radius`.

### 3.2 Per-slot animation is additive to the current glyph contract

The current `glyph.pulse` object remains in place.

Per-slot animation is added as an optional placement-level override. Existing glyph assets remain valid and preserve current behavior without migration.

### 3.3 Preview centering is preview-only

Preview centering must not dirty the session and must not alter authored world coordinates.

### 3.4 Fill amount is authored style data

The requested fill slider is implemented as authored style data, not as temporary preview-only state.

Reason: the current style contract already owns fill mode and fill direction. Fill amount belongs in the same persisted style object.

---

## 4. Data contract changes

## 4.1 Style asset contract

### File changed
`src/data/schemas/assets/styles.ts`

### Responsibility
Defines authored background style presets under `assets.styles`.

### Change
Extend the rich style shape with two new authored fields:

- `familyRotationDeg: number`
- `fillAmount: number`

### Final normalized style contract
Every parsed style must output:

- `family: circle | triangle | square | hex | spiky_circle`
- `familyRotationDeg: number`
- `color: string`
- `alpha: number`
- `fillMode: solid | horizontal | vertical | circular`
- `fillAmount: number`
- `invertFill: boolean`
- `borderColor?: string`

### Validation rules
- `alpha` must be between `0` and `1`, inclusive
- `fillAmount` must be between `0` and `1`, inclusive
- `familyRotationDeg` is a plain number; UI clamps authoring input to `0..360`
- parsing remains loud on invalid values

### Legacy normalization
Legacy style objects normalize to:

- `familyRotationDeg = 0`
- `fillAmount = 1`

No migration step is required.

### Semantic rules
- `familyRotationDeg = 0` means the primary family lobe points to the right
- positive degrees rotate clockwise in screen space
- `fillAmount` affects only `horizontal`, `vertical`, and `circular`
- `solid` remains fully filled and ignores `fillAmount`

---

## 4.2 Glyph asset contract

### File changed
`src/data/schemas/assets/glyphs.ts`

### Responsibility
Defines authored glyph presets under `assets.glyphs`.

### Change
Add placement-level radial positioning and optional placement-level animation override.

### New placement fields
Each placement gains:

- `radialPositionFactor: number`
- `animation?: GlyphAnimationEnvelope`

### New animation envelope
`GlyphAnimationEnvelope` contains:

- `distanceFromCenterMinFactor: number`
- `distanceFromCenterMaxFactor: number`
- `scalePulseMin: number`
- `scalePulseMax: number`
- `rotationDeltaMinDeg: number`
- `rotationDeltaMaxDeg: number`

### Existing fields retained
Each placement still contains:

- `shape`
- `position`
- `rotationDeg`
- `scale`
- `colorHex`

The glyph-level `pulse` object remains in place and continues to own:

- default animation values for placements that do not override
- `delayMsByPosition`

### Validation rules
- `radialPositionFactor` must be between `0` and `1`, inclusive
- `animation.distanceFromCenterMinFactor < animation.distanceFromCenterMaxFactor`
- `animation.scalePulseMin < animation.scalePulseMax`
- `animation.rotationDeltaMinDeg < animation.rotationDeltaMaxDeg`
- `colorHex` must be a valid six-digit hex color string
- `delayMsByPosition` remains the current length-9 array using the current stepped values only

### Color contract
`colorHex` must accept arbitrary six-digit hex colors.

It is no longer limited to the current four-entry palette.

### Compatibility rule
If `placement.animation` is absent, runtime uses `glyph.pulse` exactly as it does today.

If `radialPositionFactor` is absent in existing data, parsing normalizes it to `1`.

No glyph asset migration is required.

---

## 5. Runtime behavior changes

## 5.1 Preview startup focus

### File changed
`src/ui/devtools/editors/blueprint/visuals/createBlueprintVisualsPreviewRuntime.ts`

### Responsibility
Builds the disposable runtime used by the preview pane.

### Change
Keep the existing preview-only sanitation flow, but center the preview entity in the preview world before runtime creation.

### Logic
1. Compile and sanitize the target blueprint exactly as now.
2. Ensure physics exists exactly as now for radius purposes.
3. Determine the preview world center from the same game-world config source that the camera bootstrap uses. If that config is absent, use the default world center.
4. Overwrite the compiled preview blueprint’s physics `x` and `y` with that preview world center.
5. Preserve authored radius.
6. Spawn only the target entity exactly as now.

### Interface
The factory still returns `Runtime | null`.

### Why this is the correct fix
This reuses the existing camera bootstrap logic instead of inventing preview-specific camera plumbing. The preview camera already opens at world center. Putting the preview entity at that center makes the preview start focused without changing authoring state.

---

## 5.2 Background family identity and rotation

### File changed
`src/engine/phaser/display/modules/backgroundBlobMath.ts`

### Responsibility
Produces the organic outer and inner polygons for the background blob.

### Change
Strengthen family identity and add authored family rotation.

### Interface
`computeBlobPolygons(...)` gains:

- `familyRotationDeg?: number`

### Logic
1. Increase sampling density from `48` points to `128` points.
2. Separate the “family envelope” from the organic noise envelope.
3. Rotate the family envelope by `familyRotationDeg`.
4. For `triangle`, `square`, and `hex`, make the family envelope the dominant term and keep organic noise subordinate.
5. For `spiky_circle`, keep the circular base and rotate the spike phase with `familyRotationDeg`.
6. Preserve deterministic seeding by `entityId`.
7. Preserve the existing border/gap derivation and inner-polygon inset contract.

### Non-negotiable visual rule
The result must remain organic and pulse-reactive, but the family must be visually legible at a glance.

### Explicit orientation rule
- `0°`: primary lobe points right
- positive degrees: clockwise rotation

---

## 5.3 Styled fill amount

### Files changed
- `src/engine/phaser/display/modules/backgroundModuleRuntime.ts`
- `src/engine/phaser/display/modules/backgroundStyledRenderer.ts`

### Responsibilities
`backgroundModuleRuntime.ts`
- computes polygons
- dispatches styled vs legacy rendering

`backgroundStyledRenderer.ts`
- renders authored style overlays into the existing graphics objects

### Change
Use authored `style.fillAmount` instead of live `pulseValue` for fill coverage in styled backgrounds.

### Logic
For styled backgrounds:

- `solid`
  - always fill the full interior
  - ignore `fillAmount`

- `horizontal`
  - fill fraction is `style.fillAmount`
  - `invertFill = false` means bottom-to-top
  - `invertFill = true` means top-to-bottom

- `vertical`
  - fill fraction is `style.fillAmount`
  - `invertFill = false` means left-to-right
  - `invertFill = true` means right-to-left

- `circular`
  - fill fraction is `style.fillAmount`
  - `invertFill = false` means center-to-edge
  - `invertFill = true` means edge-to-center

The blob outline and family deformation remain pulse-reactive. Only the fill coverage becomes authored instead of pulse-driven.

### Interface
`renderStyledBackground(...)` no longer needs `pulseValue` as the coverage source.

---

## 5.4 Slot-level animation and radial position

### Files changed
- `src/engine/phaser/display/glyph/GlyphTypes.ts`
- `src/engine/phaser/display/glyph/glyphRenderMath.ts`

### Responsibilities
`GlyphTypes.ts`
- runtime glyph type definitions

`glyphRenderMath.ts`
- computes per-slot position, scale, and rotation at render time

### Change
Support per-slot base radial position and per-slot animation override.

### Logic
For each placement:

1. Resolve the effective animation envelope:
   - use `placement.animation` when present
   - otherwise use `glyph.pulse`

2. Compute animated distance factor from the effective distance min/max.

3. Multiply that animated distance factor by `placement.radialPositionFactor`.

4. Use that final distance factor to compute `xPx` and `yPx`.

5. Compute render scale from:
   - base `placement.scale`
   - effective scale pulse min/max

6. Compute render rotation from:
   - base `placement.rotationDeg`
   - effective rotation delta min/max

### Exact radial semantics
- `radialPositionFactor = 0` places the slot at the center
- `radialPositionFactor = 1` preserves the current external path
- values in between linearly interpolate between those states

### Compatibility rule
Old presets with no `placement.animation` and no `radialPositionFactor` behave exactly as they do now.

---

## 5.5 Glyph preset validation and canonicalization

### Files changed
- `src/engine/phaser/display/glyph/GlyphPresetParser.ts`
- `src/engine/phaser/display/glyph/glyphCanonical.ts`
- `src/engine/phaser/display/glyph/GlyphGenerator.ts`

### Responsibilities
`GlyphPresetParser.ts`
- validates and normalizes raw preset maps from `assets.glyphs`

`glyphCanonical.ts`
- computes semantic equivalence keys and duplicate detection keys

`GlyphGenerator.ts`
- materializes procedural defaults

### Changes

#### `GlyphPresetParser.ts`
Validation must delegate to `GlyphPresetSchema` instead of re-implementing shape/color/pulse rules separately.

This avoids schema drift.

The parser must still throw key-qualified errors and still compute:

- canonical signature
- reserved delay signatures

#### `glyphCanonical.ts`
Canonicalization must include:

- `radialPositionFactor`
- effective placement animation values

If a placement omits `animation`, canonicalization must treat it as the preset’s effective global animation values so that:

- “implicit global defaults”
- and “explicit per-slot override equal to the global defaults”

are semantically identical.

#### `GlyphGenerator.ts`
Generated placements must include:

- `radialPositionFactor = 1`

Generated placements must not include explicit per-slot animation overrides.

That preserves current procedural behavior.

---

## 6. Editor behavior changes

## 6.1 Radius authoring inside the visuals editor

### File changed
`src/ui/devtools/editors/blueprint/visuals/blueprintVisualsDraft.ts`

### Responsibility
Pure helper logic for visuals editor draft access and lazy mutation support.

### Change
Add world-presence helpers.

### New pure helper responsibilities
1. Read the effective radius draft.
2. Lazily create `_editor.abilities.worldPresence` only when radius is edited.
3. Hydrate that new ability from existing blueprint data without guessing.

### Required fallback order

#### Radius read order
1. `_editor.abilities.worldPresence.radius`
2. `components.spatial.radius`
3. `components.display.radius`
4. `components.physics.radius` as `{ min: radius, max: radius }`
5. `SpatialRadiusSchema` defaults

#### X/Y read order when creating `worldPresence`
1. `_editor.abilities.worldPresence.x/y`
2. `components.spatial.x/y`
3. `components.physics.x/y`
4. `0, 0`

### Interface
Add pure helpers equivalent to:

- `readRadiusDraft(...)`
- `ensureWorldPresenceDraft(...)`

No store access is allowed in this file.

---

## 6.2 Visual editor business logic

### File changed
`src/ui/devtools/editors/blueprint/visuals/useBlueprintVisualsEditor.ts`

### Responsibility
Owns all visuals editor mutation logic.

### Change
Expose new editor state and actions.

### New state exposed by the hook
- effective radius draft
- effective selected-slot editor state

### New actions exposed by the hook
- `updateRadiusMin(value)`
- `updateRadiusMax(value)`
- `updateBackgroundFamilyRotation(value)`
- `updateBackgroundFillAmount(value)`
- `updatePlacementColor(position, value)`
- `updatePlacementRadialPosition(position, value)`
- `updatePlacementDistanceMin(position, value)`
- `updatePlacementDistanceMax(position, value)`
- `updatePlacementScalePulseMin(position, value)`
- `updatePlacementScalePulseMax(position, value)`
- `updatePlacementRotationDeltaMin(position, value)`
- `updatePlacementRotationDeltaMax(position, value)`

### Existing actions retained
- family
- fill color
- alpha
- fill mode
- invert
- slot enable/disable
- slot shape
- base slot scale
- base slot rotation
- remove slot
- delay

### Mutation rules
1. Radius edits must mutate `_editor.abilities.worldPresence`, never `components.display`.
2. Slot animation edits must materialize `placement.animation` from `glyph.pulse` on first edit.
3. Slot base scale must clamp to `[0.1, 4]`.
4. `radialPositionFactor` must clamp to `[0, 1]`.
5. Existing five-placement cap remains unchanged.
6. Opening the modal must still not dirty the session.

---

## 6.3 Background section UI

### File changed
`src/ui/devtools/editors/blueprint/visuals/BackgroundVisualSection.tsx`

### Responsibility
Presentation-only background and geometry controls.

### Change
Add the missing authored controls.

### Final controls
- family
- family rotation
- fill color
- alpha
- fill mode
- fill amount
- invert direction
- radius min
- radius max

### UI rules
- `fillAmount` is disabled when `fillMode = solid`
- radius inputs are controlled inputs bound to worldPresence data
- no draft lookup or business logic lives in this component

### Interface
Controlled props only.

---

## 6.4 Glyph section UI

### File changed
`src/ui/devtools/editors/blueprint/visuals/GlyphVisualSection.tsx`

### Responsibility
Presentation-only slot grid and slot inspector.

### Change
Add the missing per-slot controls and raise base scale max.

### Final slot inspector controls
- shape
- base color
- base scale
- base rotation
- radial position factor
- distance animation min
- distance animation max
- scale pulse min
- scale pulse max
- rotation delta min
- rotation delta max
- remove placement

### Existing controls retained
- slot select
- slot enable/disable
- per-position delay sliders

### UI rules
- base scale slider max is `4`
- color input is a real color picker
- inspector displays the effective animation values provided by the hook
- the component does not compute fallback-from-global-pulse itself

### Interface
Controlled props only.

---

## 6.5 Modal composition

### File changed
`src/ui/devtools/editors/blueprint/visuals/BlueprintVisualsModal.tsx`

### Responsibility
Presentation-only modal composition.

### Change
Pass the new background, radius, and slot-inspector props from the hook into the two section components.

### Interface
No external component API change.

---

## 7. Files that must not change in this follow-up

These files already own the correct responsibility and should remain unchanged:

### `src/engine/compiler/abilities/spatialCompiler.ts`
Reason: it already compiles `worldPresence.radius` into the renderable contracts.

### `src/engine/compiler/abilities/passportCompiler.ts`
Reason: this follow-up does not change passport persistence.

### `src/engine/phaser/display/resolveDisplaySpec.ts`
Reason: style schema extension flows through existing parsing; no new resolution rule is needed.

### `src/engine/phaser/display/modules/GlyphModule.ts`
Reason: the glyph renderer already consumes `placement.colorHex` and already uses the glyph registry result. The missing work is in schema, parser, math, and UI.

### `src/engine/phaser/display/modules/BackgroundModule.ts`
Reason: dispatch and pooled-object ownership are already correct; the changes belong in the helper math and styled renderer layers.

---

## 8. Tests

The tests must follow the project contract:

- schema behavior in unit tests
- math/render behavior in unit tests
- preview runtime behavior in integration tests
- UI wiring in component tests
- no business logic inside view tests

## 8.1 Tests to change

### `src/data/schemas/assets/styles.test.ts`
Add coverage for:
- rich style defaulting of `familyRotationDeg = 0`
- rich style defaulting of `fillAmount = 1`
- legacy style normalization of both fields
- `fillAmount` rejection outside `0..1`

### `src/engine/phaser/display/glyph/glyphRenderMath.test.ts`
Add coverage for:
- `radialPositionFactor = 0` places a slot at center
- `radialPositionFactor = 1` preserves current external path
- placement animation override wins over glyph-level pulse defaults
- base placement scale still multiplies with pulse scale

### `src/engine/phaser/display/glyph/GlyphPresetParser.test.ts`
Add coverage for:
- arbitrary valid hex colors are accepted
- missing `radialPositionFactor` normalizes to `1`
- missing placement animation uses global pulse defaults semantically
- explicit override equal to global default does not change canonical identity

### `src/engine/phaser/display/modules/backgroundBlobMath.test.ts`
Add coverage for:
- output point count increases to `128`
- triangle/square/hex remain deterministic
- triangle/square/hex are materially different from circle
- `familyRotationDeg` rotates family orientation deterministically
- spiky circle spike phase also rotates deterministically

### `src/engine/phaser/display/modules/BackgroundModule.styled.test.ts`
Add coverage for:
- `fillAmount` drives directional and circular fill coverage
- `solid` ignores `fillAmount`
- invert direction still flips fill direction correctly

### `src/ui/devtools/editors/blueprint/visuals/createBlueprintVisualsPreviewRuntime.test.ts`
Add coverage for:
- preview entity physics `x/y` are recentered to preview world center
- existing radius is preserved when recentering
- preview still returns `null` for body blueprints
- preview still spawns only the target entity

## 8.2 Tests to add

### `src/data/schemas/assets/glyphs.test.ts`
Unit tests for:
- placement `radialPositionFactor` defaults to `1`
- placement animation envelope validation
- arbitrary valid hex colors accepted
- invalid hex colors rejected

### `src/ui/devtools/editors/blueprint/visuals/blueprintVisualsDraft.test.ts`
Unit tests for:
- radius read fallback order
- first radius edit lazily creates `worldPresence`
- created `worldPresence` preserves existing x/y and radius where present
- first slot animation edit materializes `placement.animation` from `glyph.pulse`
- modal open alone does not create `worldPresence`

### `src/ui/devtools/editors/blueprint/visuals/BackgroundVisualSection.test.tsx`
View tests for:
- family rotation callback wiring
- fill amount callback wiring
- radius min/max callback wiring
- fill amount disabled when fill mode is `solid`

### `src/ui/devtools/editors/blueprint/visuals/GlyphVisualSection.test.tsx`
View tests for:
- color picker wiring
- radial position wiring
- per-slot distance/scale/rotation animation callback wiring
- base scale slider max is `4`

---

## 9. Acceptance criteria

This follow-up is complete only when all of the following are true.

1. Preview opens with the target node in view without requiring manual pan.
2. Radius can be edited inside the visuals modal and persists through `_editor.abilities.worldPresence`.
3. Background family can be rotated.
4. Triangle, square, and hex have clear family identity instead of reading as a noisy circle.
5. Styled fill amount can be authored with a `0..1` control.
6. Slot base scale can be set as high as `4`.
7. Slot color can be authored per placement.
8. Slot default radial position can be authored per placement with `0..1`.
9. Slot movement/scale/rotation animation can be authored per placement.
10. Existing style and glyph assets remain valid without migration.
11. Opening the visuals modal still does not dirty the session by itself.
12. Body blueprints remain excluded from this editor path.

---

## 10. Implementation order

### Step 1
Extend the persisted schemas:

- `styles.ts`
- `glyphs.ts`

### Step 2
Update glyph normalization and runtime math:

- `GlyphTypes.ts`
- `GlyphGenerator.ts`
- `GlyphPresetParser.ts`
- `glyphCanonical.ts`
- `glyphRenderMath.ts`

### Step 3
Update background math and styled rendering:

- `backgroundBlobMath.ts`
- `backgroundModuleRuntime.ts`
- `backgroundStyledRenderer.ts`

### Step 4
Update pure editor draft helpers:

- `blueprintVisualsDraft.ts`

### Step 5
Update editor business logic and UI:

- `useBlueprintVisualsEditor.ts`
- `BackgroundVisualSection.tsx`
- `GlyphVisualSection.tsx`
- `BlueprintVisualsModal.tsx`

### Step 6
Fix preview runtime focus:

- `createBlueprintVisualsPreviewRuntime.ts`

### Step 7
Add and update all tests listed above.

---

## 11. Final notes

This design deliberately does not introduce any new authoring surface or render path.

It uses what is already in the codebase:

- `worldPresence` for radius
- `assets.styles` for authored background state
- `assets.glyphs` for authored slot state
- the existing glyph registry and glyph render math
- the existing background module split between math, runtime helper, and styled renderer
- the existing disposable Phaser preview runtime

The only new persisted data is the minimum required to satisfy the requested editor behavior:

- `familyRotationDeg`
- `fillAmount`
- `radialPositionFactor`
- optional per-slot animation override
- arbitrary hex `colorHex`

Everything else remains on the current contract.

