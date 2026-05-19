# Phase 17 — Cave Fur LLD

## Purpose
Replace Cave's use of the generic `BackgroundModule` with a dedicated `CaveBackgroundModule` that renders:
- a filled Cave body with no border,
- a high-granularity animated contour,
- explicit tapered fur strands,
- pulse-responsive fur motion,
- a clean zod-backed tuning contract for all appearance and animation levers.

This document defines the **why**, the **what**, and the **how**. It is implementation-ready. It contains no optional paths.

---

## 1. Why

### 1.1 Current implementation is structurally wrong for Cave
`cave_level` currently uses this display stack:
- `TransformModule`
- `LightModule`
- `BackgroundModule`
- `CaveEyesModule`
- `InteractionModule`
- `SelectionModule`

`BackgroundModule` is generic attribute-node rendering. It assumes:
- a border ring,
- an inner fill polygon,
- band-based interior fills,
- low-resolution blob geometry.

That behavior is produced by:
- `backgroundBlobMath.ts` — 48-point contour and border-gap math,
- `backgroundFillRenderer.ts` — explicit border stroke,
- `backgroundBandSelector.ts` — Cave-specific constant black fill band.

This is incompatible with the required Cave look.

### 1.2 Required visual behavior
Cave must have:
- no border,
- much denser edge shape,
- explicit fur strands at the silhouette,
- fur motion that responds to pulse,
- fur levers that can all be tuned and emotion-driven.

### 1.3 Required runtime behavior
The project already has the correct state path for Cave display:
- `CaveMindSystem` computes deterministic Cave visual state,
- `resolveCaveRenderState` resolves that state,
- `UPDATE_CAVE` writes the full `cave.mind` payload,
- `UpdateCaveHandler` replaces `cave.mind` during apply.

The fur system must extend this path. It must not introduce a new mutation path or side-channel state.

---

## 2. What

## 2.1 Design decisions
1. Add a dedicated `CaveBackgroundModule`.
2. Remove `BackgroundModule` from the `cave_level` stack only.
3. Keep `LightModule` and `CaveEyesModule` in the Cave stack unchanged.
4. Add a new `caveDisplay` game-config schema for Cave visual tuning.
5. Extend `cave.mind.render` with a `fur` subtree.
6. Resolve all non-frame-varying Cave fur coefficients in `resolveCaveRenderState`.
7. Apply time and pulse animation in `CaveBackgroundModule` only.
8. Render body and fur with pooled Phaser `Graphics`, not sprites and not one object per hair.
9. Render fur as tapered wedges, not line strokes.
10. Remove the dead Cave branch from the generic background selector.

## 2.2 Non-goals
- No shader implementation.
- No sprite-per-hair implementation.
- No new ECS component.
- No new runtime command.
- No change to generic attribute-pool visuals.
- No change to Cave glow behavior.
- No refactor outside the named files.

---

## 3. Contract

## 3.1 Runtime contract
All Cave fur state consumed by the display layer must come from:
- `entity.cave.mind.render.fur`
- `pulseValue`
- `timeMs`
- deterministic entity/hair seeds

The display layer must not inspect Cave emotion values directly.

## 3.2 Rendering contract
Cave rendering must satisfy all of the following:
- no call path draws a Cave border,
- Cave body is a solid filled contour,
- fur is rendered as explicit tapered wedges rooted on the contour,
- pulse affects both body contour deformation and fur motion,
- the strength of pulse influence is configurable,
- the rendering remains deterministic for a fixed entity id, time, render state, and pulse value.

## 3.3 Testing contract
Tests must follow the existing project standard:
- pure logic: unit tests,
- runtime/system behavior: integration-style tests using real world state,
- display modules: isolated view/render tests.

No new behavior is complete until all changed and added tests are green.

---

## 4. Data model

## 4.1 New file: `src/data/schemas/game/caveDisplay.ts`

### Responsibility
Define the authoritative zod schema and defaults for all Cave appearance and animation levers.

### Logic
Introduce these schemas.

#### `CaveSignalDriverSchema`
Purpose: resolve any numeric display lever from runtime signals.

Fields:
- `base: number`
- `comfortWeight: number`
- `focusWeight: number`
- `happinessWeight: number`
- `sadnessWeight: number`
- `terrorWeight: number`
- `curiosityWeight: number`
- `min: number`
- `max: number`

Evaluation rule:
- `value = base + comfort*comfortWeight + focus*focusWeight + happiness*happinessWeight + sadness*sadnessWeight + terror*terrorWeight + curiosity*curiosityWeight`
- clamp final value to `[min, max]`

#### `CaveContourOctaveSchema`
Fields:
- `frequency: number`
- `amplitudePx: number`

#### `CavePulseOctaveSchema`
Fields:
- `frequency: number`
- `amplitudePx: number`
- `speedHz: number`

#### `CaveEyeMotionConfigSchema`
Move the current eye animation constants here:
- `eyeTravel`
- `eyeDriftTravel`
- `eyeDriftStepX`
- `eyeDriftStepY`
- `pupilTravel`
- `minBlinkMs`
- `maxBlinkMs`

#### `CaveFurConfigSchema`
Fields:
- `sampleCount: number`
- `bodyRadiusScale: number`
- `hairStride: number`
- `midpointRatio: number`
- `baseOctaves: CaveContourOctave[]`
- `pulseOctaves: CavePulseOctave[]`
- `lengthPx: CaveSignalDriver`
- `rootWidthPx: CaveSignalDriver`
- `tipWidthPx: CaveSignalDriver`
- `flareAngleRad: CaveSignalDriver`
- `swayAngleRad: CaveSignalDriver`
- `curlAngleRad: CaveSignalDriver`
- `stiffness01: CaveSignalDriver`
- `tremorPx: CaveSignalDriver`
- `motionHz: CaveSignalDriver`
- `pulseLengthScale: CaveSignalDriver`
- `pulseAngleRad: CaveSignalDriver`
- `attentionBias01: CaveSignalDriver`

Validation rules:
- `sampleCount >= 16`
- `hairStride >= 1`
- `hairStride < sampleCount`
- `0 < midpointRatio < 1`
- every driver must satisfy `min <= max`
- `tipWidthPx.max <= rootWidthPx.max`

#### `CaveDisplayConfigSchema`
Fields:
- `eyes: CaveEyeMotionConfig`
- `fur: CaveFurConfig`

### Interface
Export:
- `CaveSignalDriverSchema`
- `CaveContourOctaveSchema`
- `CavePulseOctaveSchema`
- `CaveEyeMotionConfigSchema`
- `CaveFurConfigSchema`
- `CaveDisplayConfigSchema`
- inferred types for all public schemas
- `DEFAULT_CAVE_DISPLAY_CONFIG`

## 4.2 Change: `src/data/schemas/game/config.ts`

### Responsibility
Expose Cave display tuning through game config.

### Logic
Add a `caveDisplay` property to `GameConfigSchema` using `CaveDisplayConfigSchema.default(DEFAULT_CAVE_DISPLAY_CONFIG)`.

### Interface
`DEFAULT_GAME_CONFIG` and parsed `gameConfig` must always include `caveDisplay`.

## 4.3 Change: `src/data/schemas/game/caveMind.ts`

### Responsibility
Extend the persisted Cave render contract.

### Logic
Add `render.fur` with these fields:
- `lookDirX: number`
- `lookDirY: number`
- `sampleCount: number`
- `bodyRadiusScale: number`
- `hairStride: number`
- `midpointRatio: number`
- `baseOctaves: CaveContourOctave[]`
- `pulseOctaves: CavePulseOctave[]`
- `lengthPx: number`
- `rootWidthPx: number`
- `tipWidthPx: number`
- `flareAngleRad: number`
- `swayAngleRad: number`
- `curlAngleRad: number`
- `stiffness01: number`
- `tremorPx: number`
- `motionHz: number`
- `pulseLengthScale: number`
- `pulseAngleRad: number`
- `attentionBias01: number`

Existing eye render fields remain.

`createDefaultCaveMind()` must parse a valid default `render.fur` subtree.

### Interface
`CaveMind`, `CaveRender`, and `createDefaultCaveMind()` all expose the new fur contract.

---

## 5. Runtime derivation

## 5.1 Add file: `src/game/systems/cave/resolveCaveDisplayDriver.ts`

### Responsibility
Pure evaluation of one `CaveSignalDriver`.

### Logic
Inputs:
- driver
- comfort
- focus
- happiness
- sadness
- terror
- curiosity

Output:
- resolved numeric value after weighted sum and clamp.

### Interface
Export one pure function:
- `resolveCaveDisplayDriver(...) => number`

## 5.2 Change: `src/game/systems/cave/resolveCaveRenderState.ts`

### Responsibility
Resolve deterministic Cave display state from attention, emotions, comfort, and config.

### Logic
Retain current responsibilities:
- eye shape,
- eye color,
- eye offsets,
- pupil offsets,
- blink cadence,
- pulse preset selection,
- eye drift memory patch.

Add new responsibilities:
- resolve `lookDirX` and `lookDirY`,
- resolve all `render.fur` scalar levers using `resolveCaveDisplayDriver`,
- copy structural fur config directly into `render.fur`.

Pulse itself is **not** resolved here. Only pulse-coupling coefficients are resolved here.

### Interface
New function signature:
- `resolveCaveRenderState(attention, emotions, comfort01, caveWorldX, caveWorldY, displayConfig, phaseX?, phaseY?)`

Return shape remains:
- `render`
- `pulsePresetKey`
- `memoryPatch`

`render` now includes `fur`.

## 5.3 Change: `src/game/systems/CaveMindSystem.ts`

### Responsibility
Pass Cave display config into render resolution and emit the full resolved mind.

### Logic
- accept `CaveDisplayConfig` in the constructor,
- use `stimuli.world.comfort` when calling `resolveCaveRenderState`,
- emit the full updated `mind` through the existing `UPDATE_CAVE` command.

### Interface
Constructor becomes:
- `new CaveMindSystem(displayConfig = DEFAULT_GAME_CONFIG.caveDisplay)`

No change to command type or handler use.

## 5.4 Change: `src/game/main.ts`

### Responsibility
Wire parsed game config into `CaveMindSystem`.

### Logic
Replace `new CaveMindSystem()` with `new CaveMindSystem(gameConfig.caveDisplay)`.

### Interface
No other system registration changes.

## 5.5 Change: `src/game/systems/cave/CaveMindConfig.ts`

### Responsibility
Remain the config source for cognition, emotion, look-mode, and pulse-preset behavior only.

### Logic
Remove the current `render` subsection from `CAVE_MIND_CONFIG`.

### Interface
`CAVE_MIND_CONFIG.render` must no longer exist.

---

## 6. Display path

## 6.1 Change: `src/engine/phaser/display/DisplayDefinitionCatalog.ts`

### Responsibility
Register the Cave-specific display stack.

### Logic
Change the `cave_level` stack to:
- `TransformModule`
- `LightModule`
- `CaveBackgroundModule`
- `CaveEyesModule`
- `InteractionModule`
- `SelectionModule`

All other stacks remain unchanged.

### Interface
Import and use `CaveBackgroundModule`.

## 6.2 Change: `src/engine/phaser/display/types.ts`

### Responsibility
Add Cave-specific pooled graphics slots to `DisplayScratch`.

### Logic
Add:
- `caveFillGraphics: Phaser.GameObjects.Graphics | null`
- `caveHairGraphics: Phaser.GameObjects.Graphics | null`

Do not reuse the blob slots for Cave.

### Interface
`DisplayScratch` shape changes globally.

## 6.3 Change: `src/engine/phaser/display/EntityVisualInstanceHelpers.ts`

### Responsibility
Initialize and validate the new Cave scratch slots.

### Logic
In `acquireAnchors`, initialize both new fields to `null`.
In `validateScratchSlots`, log them as leaks if still populated at release time.

### Interface
No behavioral change outside the new slots.

---

## 7. Cave rendering

## 7.1 Add file: `src/engine/phaser/display/modules/CaveBackgroundModule.ts`

### Responsibility
Own Cave body and fur rendering.

### Logic
Allocate exactly two graphics from the existing `graphicsPool`:
- `caveFillGraphics`
- `caveHairGraphics`

Tick behavior:
1. if `!spec.hasPhysics` or radius is not visible, hide both graphics and return,
2. if `entity.cave.mind.render.fur` is absent, hide both graphics, log once with `entityId`, and return,
3. build contour and fur geometry using pure helpers,
4. draw filled body,
5. draw fur wedges,
6. set both graphics visible.

Destroy behavior:
- remove both graphics from `backgroundAnchor`,
- release both through `graphicsPool`,
- null both scratch slots.

No mask graphics. No border graphics. No call to `renderBlobs`.

### Interface
Export a `DisplayModuleFactory` named `CaveBackgroundModule`.

## 7.2 Add file: `src/engine/phaser/display/modules/caveBackgroundGeometry.ts`

### Responsibility
Pure deterministic geometry for Cave body and fur.

### Logic
#### Contour generation
Inputs:
- `entityId`
- `radius`
- `timeMs`
- `pulseValue`
- resolved `render.fur`

Rules:
- build `sampleCount` contour points,
- base radius = `radius * bodyRadiusScale`,
- static contour deformation = sum of `baseOctaves`,
- pulse deformation = `pulseValue * sum of pulseOctaves`,
- octave phases derive from deterministic seed based on `entityId` and octave index,
- compute tangent and outward normal at every contour point.

#### Hair root generation
Rules:
- choose roots at every `hairStride` contour points,
- root start offset is deterministic from `entityId`,
- root count = `floor(sampleCount / hairStride)`.

#### Hair motion
For each hair:
- base direction = contour outward normal,
- add deterministic signed flare,
- add attention steering from `lookDirX`, `lookDirY`, scaled by `attentionBias01`,
- add sway oscillation from `motionHz`, `timeMs`, and a seeded phase,
- add pulse angular motion from `pulseValue * pulseAngleRad`,
- attenuate sway, curl, and tremor by `(1 - stiffness01)`,
- effective length = `lengthPx * (1 + pulseValue * pulseLengthScale)`.

#### Hair shape
Each hair is a two-segment tapered wedge with these points:
- root-left
- root-right
- mid-left
- mid-right
- tip

Rules:
- midpoint distance = `midpointRatio * effectiveLength`,
- width transitions from `rootWidthPx` to `tipWidthPx`,
- tip lies on the final resolved hair direction,
- wedge polygon must always be non-self-intersecting.

### Interface
Export pure types and pure functions for:
- contour computation,
- fur wedge computation.

## 7.3 Add file: `src/engine/phaser/display/modules/caveHairRenderer.ts`

### Responsibility
Phaser `Graphics` drawing only.

### Logic
Provide two draw helpers:
- draw Cave body contour as a filled polygon,
- draw all fur wedges as filled polygons.

Rules:
- clear before draw,
- fill color = black,
- no line style,
- no border,
- no mask.

### Interface
Export:
- `renderCaveBody(graphics, contour)`
- `renderCaveHairs(graphics, wedges)`

---

## 8. Generic background cleanup

## 8.1 Change: `src/engine/phaser/display/modules/backgroundBandSelector.ts`

### Responsibility
Remain the band selector for generic background nodes only.

### Logic
Remove the special case:
- `if (displayKey === "cave_level") ...`

### Interface
Function signature remains unchanged.

There must be no Cave-specific branch left in the generic background pipeline.

---

## 9. File-by-file implementation plan

## 9.1 Production files to add
- `src/data/schemas/game/caveDisplay.ts`
- `src/game/systems/cave/resolveCaveDisplayDriver.ts`
- `src/engine/phaser/display/modules/CaveBackgroundModule.ts`
- `src/engine/phaser/display/modules/caveBackgroundGeometry.ts`
- `src/engine/phaser/display/modules/caveHairRenderer.ts`

## 9.2 Production files to change
- `src/data/schemas/game/config.ts`
- `src/data/schemas/game/caveMind.ts`
- `src/game/systems/cave/resolveCaveRenderState.ts`
- `src/game/systems/CaveMindSystem.ts`
- `src/game/main.ts`
- `src/game/systems/cave/CaveMindConfig.ts`
- `src/engine/phaser/display/DisplayDefinitionCatalog.ts`
- `src/engine/phaser/display/types.ts`
- `src/engine/phaser/display/EntityVisualInstanceHelpers.ts`
- `src/engine/phaser/display/modules/backgroundBandSelector.ts`

---

## 10. Tests

## 10.1 Add: `src/data/schemas/game/caveDisplay.test.ts`
Responsibility:
- validate defaults,
- validate driver range rules,
- validate fur structural rules.

## 10.2 Add: `src/game/systems/cave/resolveCaveDisplayDriver.test.ts`
Responsibility:
- weighted resolution,
- clamp behavior,
- negative weights,
- min and max edges.

## 10.3 Change: `src/game/systems/cave/resolveCaveRenderState.test.ts`
Responsibility:
- assert `render.fur` exists,
- assert comfort/focus/emotions affect the configured levers,
- assert pulse preset behavior remains unchanged.

## 10.4 Add: `src/engine/phaser/display/modules/caveBackgroundGeometry.test.ts`
Responsibility:
- determinism for identical inputs,
- contour point count equals `sampleCount`,
- fur root count matches `hairStride`,
- pulse changes contour and effective hair length,
- wedge geometry remains valid.

## 10.5 Add: `src/engine/phaser/display/modules/CaveBackgroundModule.test.ts`
Responsibility:
- acquires exactly two graphics,
- hides when physics is absent,
- hides and logs when `render.fur` is missing,
- draws body and hairs,
- never draws a border,
- releases and nulls both graphics on destroy.

## 10.6 Change: `src/engine/phaser/display/DisplayDefinitionCatalog.test.ts`
Responsibility:
- assert `cave_level` now uses `CaveBackgroundModule`,
- assert generic attribute stacks still use `BackgroundModule`.

## 10.7 Change: `src/engine/phaser/display/modules/backgroundBandSelector.test.ts`
Responsibility:
- verify generic behavior only,
- verify Cave special-casing is gone.

## 10.8 Delete: `src/engine/phaser/display/modules/backgroundBandSelector.cave.test.ts`
Responsibility:
- remove obsolete Cave-specific selector coverage.

## 10.9 Compile-fix updates required because `DisplayScratch` changes
These files construct `DisplayScratch`-shaped literals and must add:
- `caveFillGraphics: null`
- `caveHairGraphics: null`

Files:
- `src/engine/phaser/display/modules/GlyphModule.test.ts`
- `src/engine/phaser/display/modules/TransferDisplayModule.testUtils.ts`
- `src/engine/phaser/display/modules/BackgroundModule.testUtils.ts`
- `src/engine/phaser/display/modules/AvatarGlyphModule.test.ts`
- `src/engine/phaser/display/modules/InteractionModule.test.ts`

No other test behavior changes are in scope.

---

## 11. Acceptance criteria

The phase is complete only when all of the following are true:
1. `cave_level` no longer uses `BackgroundModule`.
2. Cave renders with no border.
3. Cave contour granularity is controlled by schema-backed `sampleCount`.
4. Cave fuzz is rendered as explicit tapered fur wedges.
5. Fur motion responds to time and pulse.
6. Pulse coupling strength is configurable.
7. Every Cave visual lever introduced here is controlled through `game_config.caveDisplay`.
8. Emotion, comfort, and focus can affect any lever through `CaveSignalDriver`.
9. `CaveBackgroundModule` consumes only resolved `render.fur` plus frame signals.
10. No new mutation path exists.
11. Generic background behavior for non-Cave nodes is unchanged.
12. All changed and added tests are green.

---

## 12. Scope guardrails

The implementation must not:
- modify unrelated modules,
- refactor the runtime command pipeline,
- add new display abstractions not required by this phase,
- keep dead Cave logic in generic background code,
- leave any failing or obsolete tests behind.

This is the complete LLD for Phase 17 Cave fur.
