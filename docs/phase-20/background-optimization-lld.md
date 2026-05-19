# LLD — Background / Runtime Visual Optimization Plan

## 1. Scope and authority

### Source of truth

- **Code source of truth:** `src-new`
- **Project architecture authority:** AI Context Pack — Canonical
- **Execution constraints authority:** Prompt Contract — Canonical
- **Testing authority:** Testing Standards — Canonical

### This document covers

This design covers the concrete implementation needed to do all of the following:

1. Move **`BackgroundModule` border rendering to Phaser `Rope`**.
2. Ensure that **no runtime-visible `Phaser.GameObjects.Graphics` remain outside `CaveBackgroundModule`**.
3. Keep behavior on the existing contracts that are already visible in tests and in the current display/runtime interfaces.
4. Reduce the hot-path work that was identified in the prior trace review, using only mechanisms that already exist in the codebase unless a new helper is strictly required.

### This document does **not** cover

- Any change to runtime mutation laws, command flow, blueprint semantics, or React ownership rules.
- Any change to data schemas for authored assets or runtime entities.
- Any speculative rendering refactor outside the files named here.
- Any change to Cave being the only allowed live-graphics display path.

## 2. Why this change is required

## 2.1 Background rendering is currently doing live path construction every tick

`BackgroundModule` currently acquires **three** pooled `Graphics` objects (`mask`, `fill`, `border`) and redraws them during `tick()`. The draw work flows through:

- `BackgroundModule.ts`
- `backgroundModuleRuntime.ts`
- `backgroundBlobMath.ts`
- `backgroundFillRenderer.ts`
- `backgroundStyledRenderer.ts`
- `backgroundStyledCoverage.ts`

That path currently does all of the following on the hot path:

- recomputes blob polygons from scratch
- allocates fresh point arrays
- clips fill bands into polygons
- traces and fills/strokes live `Graphics`

That is the exact class of work that must be removed from the runtime-visible path.

## 2.2 The codebase already has the preferred primitives

The current codebase already has the primitives and patterns this design must use:

- pooled `Image` objects
- pooled `Rope` objects
- deterministic rope sync via `syncVeinRope`
- centralized texture generation via `TextureManager`
- existing interaction/attention behavior keyed off `scratch.backgroundImage`

The design therefore must **reuse** those mechanisms rather than inventing a new rendering stack.

## 2.3 There are additional live-graphics paths outside `BackgroundModule`

Runtime-visible `Graphics` are also used by:

- `SelectionModule`
- `DistressModule`
- `PointerPreviewSystem`
- `PersistentAttentionRings`
- `runtimeVisualEffectBursts`

Those uses violate the stated target state. They must be converted in the same implementation plan.

## 2.4 There are low-risk hot-path CPU cleanups that are already visible in code

The current code also has two non-render hot-path issues that are directly visible:

- `PulseEngine.sampleEnvelope()` sorts the heartbeat envelope on every sample.
- `useEntityQuery()` subscribes to frame revision and clones query results even though query membership changes are driven by world/query events and mutation invalidation.
- `useActiveRuntimeAttention()` compares attention objects by `JSON.stringify()`.

These are straightforward, bounded optimizations and belong in the same LLD.

## 3. Required end state

When this work is complete, the system shall satisfy all of the following:

1. **Only `CaveBackgroundModule` may use live `Graphics` for runtime-visible rendering.**
2. `BackgroundModule` shall use:
    - one pooled **`Image`** for its fill/interior presentation
    - one pooled **`Rope`** for its border presentation
3. `scratch.backgroundImage` shall remain the canonical background visual target for interaction and tutorial-attention alpha behavior.
4. The old `blob*Graphics` scratch slots shall no longer exist.
5. `SelectionModule`, `DistressModule`, `PointerPreviewSystem`, `PersistentAttentionRings`, and `runtimeVisualEffectBursts` shall render with `Image` and/or `Rope`, not live `Graphics`.
6. `TextureManager` shall remain the only place that owns scratch `Graphics` for texture baking.
7. All tests changed or added by this work shall obey the existing testing contract:
    - behavior-first
    - Given / When / Then structure
    - no UI-business-logic leakage
    - deterministic runtime tests

## 4. Design decisions

## 4.1 Background fill is an image, not a live path

The fill/interior part of `BackgroundModule` will be rendered as a **baked texture** shown by a pooled `Image`.

The image will be attached to `scratch.backgroundImage`.

That choice is mandatory for three reasons:

- the interaction system already prefers `scratch.backgroundImage`
- the tutorial attention alpha path already prefers `scratch.backgroundImage`
- it removes all live-graphics fill work from the runtime path

## 4.2 Background border is a rope

The border part of `BackgroundModule` will be rendered as a **pooled `Rope`** using a single solid strip texture.

The border rope is mandatory because that was explicitly requested and the project already has rope update mechanics and pooling.

## 4.3 Texture baking is allowed; live graphics are not

A hidden scratch `Graphics` owned by `TextureManager` is already used to generate textures. That mechanism remains allowed.

This document uses the term **live Graphics** to mean a runtime-visible `Phaser.GameObjects.Graphics` that is scene-attached and used as the user-facing display object.

This document does **not** forbid:

- `TextureManager` scratch `Graphics`
- one-off texture generation work that results in `Image` or `Rope` rendering

## 4.4 Background animation responsibility is split

To avoid reintroducing live-graphics fill cost:

- the **border rope** owns the animated outline
- the **fill image** owns the semantic color/fill presentation

The fill image shall update only when the **semantic fill state** changes.

The border rope shall update from the current resolved border geometry.

This is the explicit optimization boundary. The implementation shall not try to keep a frame-by-frame animated fill image.

## 4.5 Existing interaction and alpha contracts must remain intact

Because `InteractionModule`, `EntityVisualInstanceRuntime`, and tutorial attention already work through `scratch.backgroundImage`, this design shall not introduce a second competing background target.

The fill image in `scratch.backgroundImage` is the only correct background interaction target after this change.

## 4.6 Existing rope mechanisms shall be reused

The design shall reuse the same structural ideas already present in:

- `veinsRopeRenderer.ts`
- `progressBarTick.cache.ts`
- `progressBarTick.slot.ts`

That means:

- pooled ropes
- deterministic sync helpers
- style/geometry updates only when inputs differ
- texture generation through `TextureManager`

## 5. Background module design

## 5.1 New runtime object model

`BackgroundModule` runtime state will contain:

- the existing `prevCycle`
- the existing `drained` state
- one pooled fill image (`scratch.backgroundImage`)
- one pooled border rope (`scratch.blobBorderRope`)
- the last applied fill signature
- the last applied border signature

The runtime shall **not** retain or acquire any `Graphics` object.

## 5.2 Semantic fill state

The fill image shall be rebuilt only when the semantic fill state changes.

### Unstyled background semantic state includes

- `display_key`
- `entityId`
- `radius`
- resolved band list from `selectBands(...)`
- border width used to derive the inner polygon
- the current resolved palette colors supplied by `pulseEngine.getAllNodeColors()`

### Styled background semantic state includes

- `entityId`
- `radius`
- authored `style`
- resolved fill fraction override

### Semantic fill state explicitly excludes

- raw `timeMs`
- raw `pulseValue`
- per-frame animation phase

That exclusion is intentional and mandatory.

## 5.3 Border state

The border rope state includes:

- the resolved outer polygon points
- border tint
- border alpha
- border display width
- border texture key

For unstyled backgrounds the tint and alpha remain the current defaults.
For styled backgrounds the tint and alpha remain the values already emitted by the styled render model.

## 5.4 Geometry source of truth

Geometry shall still be resolved from existing pure helpers:

- `computeBlobPolygons(...)`
- `computeDerivedBlobConstants(...)`
- `resolveStyledBackgroundRenderModel(...)`
- `selectBands(...)`
- `readEntityCycle(...)`
- `updateDrain(...)`

This work shall not replace those helpers with new business logic.

## 5.5 Fill texture generation contract

A new fill texture generator will accept a **resolved background fill request** and return a handle describing:

- `textureKey`
- `widthPx`
- `heightPx`
- local image origin/placement information needed to center the image under the entity

The generator is responsible for:

- drawing the fill/interior representation onto `TextureManager` scratch graphics
- generating a deterministic texture key
- returning a handle that lets `BackgroundModule` place the image correctly

The generator shall not perform scene attachment.

## 5.6 Border rope sync contract

A new border-rope sync helper will accept:

- the pooled rope
- the rope texture key
- the resolved polygon points
- tint
- alpha
- display width

The helper is responsible for:

- hiding ropes with fewer than two points
- applying the texture
- applying tint, alpha, scale, points, visibility
- calling `updateVertices()` after point updates

It shall not own pooling or scene attachment.

## 5.7 Background object lifecycle

### Create

`BackgroundModule.create()` shall:

- acquire one pooled image from `imagePool`
- acquire one pooled rope from `ropePool`
- attach both to `scratch.backgroundAnchor`
- assign the image to `scratch.backgroundImage`
- assign the rope to `scratch.blobBorderRope`
- initialize both as hidden

### Tick

`BackgroundModule.tick()` shall:

- early-hide and return when `hasPhysics` is false or radius is not visible
- update the drain accumulator exactly as today
- resolve the current background visual model
- update the fill image only when its semantic signature changed
- update the border rope when its border signature changed
- set both objects visible when a model exists

### Destroy

`BackgroundModule.destroy()` shall:

- remove the image from `scratch.backgroundAnchor`
- release it to `imagePool`
- remove the rope from `scratch.backgroundAnchor`
- release it to `ropePool`
- null `scratch.backgroundImage` if it points at the background fill image
- null `scratch.blobBorderRope`

The destroy path shall not leave any object in scratch.

## 6. Elimination of other non-Cave live Graphics

## 6.1 SelectionModule

### New presentation

`SelectionModule` shall use one pooled `Image` with an existing ring glyph texture.

### Required behavior

- same visibility rules as today
- same tween lifecycle as today
- same radius padding semantics as today
- same infinite pulse animation semantics as today

### Primitive choice

Use `imagePool`, not `graphicsPool`.
Use an existing ring texture key generated by `TextureManager` glyph initialization.

## 6.2 DistressModule

### New presentation

`DistressModule` shall use three pooled `Image` objects with an existing ring glyph texture.

### Required behavior

- same number of halos as today: three
- same stagger values
- same duration values
- same alpha/scale tween envelope
- same position/radius derivation rules

### Primitive choice

Use `imagePool`, not `graphicsPool`.
Use tint and scale instead of redraw.

## 6.3 PointerPreviewSystem

### New presentation

`PointerPreviewSystem` shall render with:

- one `Image` for the carry glow disk
- two `Image` rings for the pickup and connection radii
- one `Rope` for the preview line

### Required behavior

- identical carry-glow gating
- identical preview-line source and target selection
- identical width/color derivation
- identical path points from `buildPointerPreviewPath(...)`

### Constructor change

`PointerPreviewSystem` must receive `TextureManager` in addition to the scene, because the rope line needs a managed strip texture and the circle/ring images must use managed textures.

### Scene hookup change

`attachPointerSceneSystems(...)` and its call site in `GameScene.create.ts` must pass the scene texture manager.

## 6.4 PersistentAttentionRings

### New presentation

`PersistentAttentionRings` shall use pooled `Image` rings instead of pooled `Graphics` rings.

### Required behavior

- same ring count
- same stagger semantics
- same visibility window logic
- same destroy idempotence

### Update model

`drawGoldRingFrame(...)` shall no longer draw. It shall become a pure frame-style resolver that returns the scale/alpha/radius state required by each ring image.

## 6.5 runtimeVisualEffectBursts

### New presentation

`spawnGoldRings(...)` shall spawn pooled `Image` rings, not pooled `Graphics` rings.

### Required behavior

- same ring counts
- same stagger and duration values
- same on-complete release semantics
- no change to `spawnSmokePuff(...)`

## 7. Hot-path CPU cleanup design

## 7.1 PulseEngine

### Problem

`PulseEngine.sampleEnvelope()` sorts the heartbeat envelope every time it samples.

### Change

Cache the sorted envelope per resolved heartbeat preset.

### Required behavior

- no change to returned pulse values
- no change to public API
- `setConfig(...)` and `setActivePreset(...)` must invalidate the cached sorted envelope state

## 7.2 useEntityQuery

### Problem

`useEntityQuery()` currently subscribes to frame revision and clones queried entities.

### Change

`useEntityQuery()` shall stop depending on frame revision.

It shall update only from:

- query add/remove events
- runtime mutation revision
- runtime entity-list revision

### Required behavior

- matching add/remove still updates the hook
- matching in-place entity mutation still updates the hook **when a mutation invalidation is emitted**
- unrelated frame ticks do not cause re-evaluation
- result identity remains stable when the matching entity set and shallow field values are unchanged

## 7.3 useActiveRuntimeAttention

### Problem

`sameAttention(...)` uses `JSON.stringify(...)`.

### Change

Replace it with an explicit structural comparator over the actual attention fields used by the UI.

### Required behavior

- identical observable equality semantics for equivalent attention plans
- no string allocation comparator path

## 8. File-by-file plan

## 8.1 Files to change

### `src/engine/phaser/display/types.ts`

**Responsibility**
Own the display scratch contract.

**Change**

- remove `blobMaskGraphics`
- remove `blobFillGraphics`
- remove `blobBorderGraphics`
- add `blobBorderRope: Phaser.GameObjects.Rope | null`
- retain `backgroundImage` and make it the `BackgroundModule` fill target

**Interface**
The `DisplayScratch` interface is the only source of truth for runtime display object ownership.

### `src/engine/phaser/display/modules/displayScratchTestUtils.ts`

**Responsibility**
Provide the default scratch shape for display tests.

**Change**
Mirror the `DisplayScratch` contract exactly.

**Interface**
Must expose `backgroundImage` and `blobBorderRope` and must not expose removed blob graphics fields.

### `src/engine/phaser/display/EntityVisualInstanceHelpers.ts`

**Responsibility**
Create, release, and validate display scratch slots.

**Change**

- initialize `blobBorderRope` to `null`
- remove validation of the old blob graphics fields
- add validation for leaked `blobBorderRope`
- keep `backgroundImage` validation exactly as the canonical background image slot

**Interface**
No public API change.

### `src/engine/phaser/display/modules/BackgroundModule.ts`

**Responsibility**
Own the lifecycle of the background display objects and apply resolved background visuals.

**Change**

- acquire from `imagePool` and `ropePool`
- stop acquiring from `graphicsPool`
- use `scratch.backgroundImage` for the fill image
- use `scratch.blobBorderRope` for the border rope
- retain the current drain-state logic and early-hide rules

**Interface**
No public API change to the module factory shape.

### `src/engine/phaser/display/modules/backgroundModuleRuntime.ts`

**Responsibility**
Resolve the background visual model from runtime/entity/style inputs.

**Change**
Replace imperative live-draw orchestration with pure resolution of:

- fill texture request
- border rope request

**Interface**
Export a pure resolver that returns a resolved background visual object. It must not accept live graphics objects.

### `src/engine/phaser/display/modules/resolveStyledBackgroundRenderModel.ts`

**Responsibility**
Resolve styled-background geometric and color data.

**Change**
Continue to resolve pure model data only. Do not draw. Ensure the model exposes everything needed by the new fill-texture generator and the new border-rope renderer.

**Interface**
No behavioral API change; only model completeness may expand.

### `src/engine/phaser/utils/TextureManager.ts`

**Responsibility**
Own all scratch-graphics-backed texture generation.

**Change**
Add methods for:

- retrieving a solid strip texture for rope borders/lines
- retrieving a background fill texture handle from a resolved fill request

**Interface**
New public methods shall be additive only. Existing methods remain unchanged.

### `src/engine/phaser/display/modules/SelectionModule.ts`

**Responsibility**
Render selection attention.

**Change**
Replace pooled `Graphics` halo with pooled `Image` halo.

**Interface**
No public API change.

### `src/engine/phaser/display/modules/DistressModule.ts`

**Responsibility**
Render distress pulses around distressed bodies.

**Change**
Replace pooled `Graphics` halos with pooled `Image` halos.

**Interface**
No public API change.

### `src/engine/phaser/pointer/PointerPreviewSystem.ts`

**Responsibility**
Render pointer preview radii and the preview path.

**Change**
Replace the single `Graphics` object with image/rope primitives.

**Interface**
Constructor signature changes to require `TextureManager`.

### `src/engine/phaser/scenes/GameScene.pointer.ts`

**Responsibility**
Attach pointer scene systems.

**Change**
Pass texture-manager access to `PointerPreviewSystem`.

**Interface**
`attachPointerSceneSystems(...)` signature changes accordingly.

### `src/engine/phaser/scenes/GameScene.create.ts`

**Responsibility**
Initialize scene subsystems.

**Change**
Pass `textureManager` into `attachPointerSceneSystems(...)`.

**Interface**
No external API change outside scene wiring.

### `src/engine/phaser/effects/PersistentAttentionRings.ts`

**Responsibility**
Manage persistent world-attention rings.

**Change**
Replace pooled `Graphics` rings with pooled `Image` rings.

**Interface**
Constructor gains `TextureManager` so ring images use managed textures.

### `src/engine/phaser/effects/RuntimeVisualEffectsManager.ts`

**Responsibility**
Own burst and persistent runtime visual effect orchestration.

**Change**
Pass `TextureManager` into `PersistentAttentionRings` construction.

**Interface**
No external API change.

### `src/engine/phaser/effects/runtimeVisualEffectBursts.ts`

**Responsibility**
Spawn transient burst effects.

**Change**
Replace gold-ring graphics with pooled images and make ring-frame resolution pure.

**Interface**
Public spawn functions keep their current call shape.

### `src/engine/phaser/veins/PulseEngine.ts`

**Responsibility**
Resolve heartbeat pulses and palette colors.

**Change**
Cache sorted envelopes.

**Interface**
No public API change.

### `src/ui/runtime/hooks/useEntityQuery.ts`

**Responsibility**
Observe queried world entities for UI consumers.

**Change**
Stop subscribing to frame revision. Use mutation/entity-list invalidation plus query events.

**Interface**
Hook signature stays unchanged.

### `src/ui/runtime/attention/useActiveRuntimeAttention.ts`

**Responsibility**
Expose the active attention plan.

**Change**
Replace `JSON.stringify` equality with explicit structural equality.

**Interface**
Hook signature stays unchanged.

## 8.2 Files to add

### `src/engine/phaser/display/modules/backgroundRenderModel.ts`

**Responsibility**
Define the resolved background visual types used between model resolution and rendering.

**Logic**
This file owns the exact types for:

- fill texture request
- fill texture handle
- border rope request
- full resolved background visual model

**Interface**
Pure types only.

### `src/engine/phaser/display/modules/backgroundFillTextureGen.ts`

**Responsibility**
Generate deterministic fill textures for `BackgroundModule` using `TextureManager` scratch graphics.

**Logic**

- build texture keys from semantic fill state only
- draw the fill/interior representation to scratch graphics
- generate or reuse the texture
- return the placement handle needed by the pooled image

**Interface**
Pure texture-generation helper; no pooling, no scene attachment.

### `src/engine/phaser/display/modules/backgroundRopeRenderer.ts`

**Responsibility**
Synchronize background border ropes.

**Logic**
Equivalent in role to `veinsRopeRenderer.ts`, but for background borders and pointer-preview lines.

**Interface**
Accept a rope and a fully resolved rope style object. Perform no pooling and no ownership.

### `src/engine/phaser/utils/SolidStripTextureGen.ts`

**Responsibility**
Provide a single opaque strip texture for rope-based borders and lines.

**Logic**
Generate one managed white strip texture once through `TextureManager` scratch graphics.

**Interface**
Pure texture helper; additive only.

### `src/engine/phaser/display/modules/SelectionModule.test.ts`

**Responsibility**
Lock the selection-image behavior.

**Logic**
Verify visibility, tween setup, and image-based lifecycle.

**Interface**
Behavior tests only.

## 9. Detailed behavior contracts

## 9.1 Background fill texture contract

The generated fill texture must preserve the following current semantics:

### Unstyled nodes

- nervous fallback color when there is no cycle and no attribute-pool color source
- attribute-colored fallback for attribute pools with no cycle
- assignable-node black base plus active overlay
- default fill color when nothing is drained
- multiple drained bands when power is drained

### Styled nodes

- authored color and alpha
- authored fill mode (`solid`, `horizontal`, `vertical`, `circular`)
- authored fill inversion
- current fill-fraction override rules already present in `backgroundModuleRuntime.ts`

## 9.2 Background border contract

The border rope must preserve:

- border width derivation from `computeDerivedBlobConstants(...)`
- current unstyled default border color
- current styled border color and alpha semantics
- visibility behavior identical to the old border graphics

## 9.3 Interaction contract

Because the fill image lives in `scratch.backgroundImage`, the following must keep working without special-case code:

- background hit area targeting in `InteractionModule`
- tutorial-attention alpha changes
- root/background interaction target selection

## 9.4 Distress / selection / pointer / attention visual contract

These modules must preserve their current visible timing, counts, tint selection, alpha selection, and position logic. The only permitted implementation change is the primitive used to display them.

## 10. Testing plan

## 10.1 BackgroundModule tests to update

### `src/engine/phaser/display/modules/BackgroundModule.test.ts`

Update assertions so they validate:

- image and rope visibility
- fill texture selection semantics
- no graphics acquisition
- correct release of image and rope

### `src/engine/phaser/display/modules/BackgroundModule.styled.test.ts`

Update assertions so they validate:

- styled fill texture selection
- styled fill alpha/color preservation through the generated texture request
- correct release of image and rope

### `src/engine/phaser/display/modules/BackgroundModule.testUtils.ts`

Replace fake graphics with:

- fake image
- fake rope
- deterministic texture-manager test double

## 10.2 New background helper tests

Add unit tests for:

- `backgroundFillTextureGen.ts`
- `backgroundRopeRenderer.ts`
- `SolidStripTextureGen.ts`

These tests must verify:

- deterministic keying
- no redraw when the key is unchanged
- correct rope hide/show behavior
- correct width/tint/alpha propagation

## 10.3 Graphics-elimination tests

### Update existing tests

- `DistressModule.test.ts`
- `PointerPreviewSystem.test.ts`
- `PersistentAttentionRings.test.ts`

### Add missing test

- `SelectionModule.test.ts`

These tests must assert the new primitive usage explicitly:

- `imagePool` or image-like methods are used where specified
- `rope` is used for the pointer preview line
- no live `Graphics` acquisition remains in the covered runtime path

## 10.4 PulseEngine tests

### `src/engine/phaser/veins/PulseEngine.test.ts`

Add assertions that prove:

- pulse values are unchanged after caching
- config/preset changes invalidate the cached sorted envelope

## 10.5 useEntityQuery tests

### `src/ui/runtime/hooks/useEntityQuery.test.tsx`

Change the in-place mutation test so it is driven by mutation invalidation, not frame invalidation.

Add a negative-path assertion that a frame-only invalidation does not cause re-evaluation.

## 10.6 useActiveRuntimeAttention tests

Add or update a test to prove:

- equivalent attention plans remain equal without stringification
- changed attention plans do produce a new selected value

## 11. Migration and rollout order

Implementation order is fixed.

### Step 1 — background type and scratch contract

Change:

- `types.ts`
- `displayScratchTestUtils.ts`
- `EntityVisualInstanceHelpers.ts`

### Step 2 — shared texture and rope helpers

Add:

- `backgroundRenderModel.ts`
- `backgroundFillTextureGen.ts`
- `backgroundRopeRenderer.ts`
- `SolidStripTextureGen.ts`
  Change:
- `TextureManager.ts`

### Step 3 — BackgroundModule migration

Change:

- `backgroundModuleRuntime.ts`
- `BackgroundModule.ts`
- background tests and test utils

### Step 4 — remove remaining non-Cave live graphics

Change:

- `SelectionModule.ts`
- `DistressModule.ts`
- `PointerPreviewSystem.ts`
- `GameScene.pointer.ts`
- `GameScene.create.ts`
- `PersistentAttentionRings.ts`
- `RuntimeVisualEffectsManager.ts`
- `runtimeVisualEffectBursts.ts`
- corresponding tests

### Step 5 — CPU cleanup

Change:

- `PulseEngine.ts`
- `useEntityQuery.ts`
- `useActiveRuntimeAttention.ts`
- corresponding tests

No step may be reordered, because each later step depends on the earlier contracts.

## 12. Acceptance criteria

This design is correctly implemented only when all of the following are true:

1. `BackgroundModule` acquires **zero** live `Graphics` objects.
2. `BackgroundModule` uses `scratch.backgroundImage` and `scratch.blobBorderRope` only.
3. `CaveBackgroundModule` remains the only runtime-visible live-graphics display module.
4. `SelectionModule`, `DistressModule`, `PointerPreviewSystem`, `PersistentAttentionRings`, and `runtimeVisualEffectBursts` no longer render with live `Graphics`.
5. `TextureManager` is the only remaining owner of scratch `Graphics` outside Cave.
6. Existing interaction behavior through `scratch.backgroundImage` still works.
7. All changed tests are green.
8. No new TODOs, no silent fallbacks, no guessed interfaces, and no scope expansion beyond the files named in this LLD.

## 13. Review checklist

Before implementation is approved, the reviewer must be able to answer **yes** to all of these:

- Is every runtime-visible non-Cave `Graphics` path removed?
- Does `BackgroundModule` now use image + rope only?
- Does the design reuse existing pools and `TextureManager` instead of inventing a new renderer?
- Are interaction and tutorial-attention alpha still anchored to `scratch.backgroundImage`?
- Are the new helper boundaries pure and single-responsibility?
- Do the tests validate behavior rather than implementation trivia?
- Are all interfaces additive or intentionally changed with every caller updated in the same plan?

