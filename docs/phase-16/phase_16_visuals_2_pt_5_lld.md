# phase_16_visuals_2_pt_5_lld — Replace BackgroundModule Circle With Standardized Glyph Glow (LLD)

## Governing documents (must be followed)

- **AI Context Pack v1** (architectural laws; determinism; no silent failures)
- **Prompt Contract — Canonical** (no scope creep; explicit error handling; no unrelated refactors)
- **Testing Standards — Canonical** (behavior-first tests; AAA; unit vs integration vs view boundaries)

This document is written as a delta plan that complies with those governing documents.

## Why

### Current behavior

For normal entities (attr\_\*):

- `BackgroundModule` renders a **solid red circle** behind the entity.
- `GlyphModule` renders glyph placements on top.
- `InteractionModule` uses `scratch.backgroundImage ?? scratch.mainImage` as the interactive target.

### Problem

The circle is not glyph-derived and functions as both:

1. a background badge, and
2. the primary interaction affordance for normal entities.

Removing the circle without replacement regresses both visuals and input.

### Goal

Replace the `BackgroundModule` circle for normal entities with a **glyph-derived standardized glow**, while preserving reliable selection input behavior.

### Non-goals (explicit)

- No shaders / post-processing pipeline.
- No new display-key types.
- No changes to transfer visuals (`TransferModule` remains unchanged).
- No simulation, ECS, command pipeline, or runtime tick law changes.
- No refactors unrelated to the explicit file list below.

---

## What (contracts)

## Visual contract

### Normal entities (attr_body, attr_mind, attr_social, default placeholder)

- `BackgroundModule` is **not included** in their module stacks.
- Glyph placements render with **two glow layers** behind each placement’s base glyph.
- Glow parameters are **standardized for all entities** (same tint, alpha, pixel outsets, blend mode).
- The glow is produced by drawing enlarged duplicates of the glyph texture (not a blur shader).

### Transfer entities (transfer\_\*)

- No change; they continue using `TransferModule` for their circular indicator.

## Interaction contract

- If `scratch.backgroundImage != null`: interaction target is **backgroundImage** (transfer behavior unchanged).
- Else: interaction target is **scratch.root** with an explicit **circle hit area** centered at origin `(0,0)` with radius `spec.radius`.
- Interaction is enabled iff:
    - Transfer target: `target.visible === true`
    - Root-circle target: `spec.hasPhysics === true` AND `isRadiusVisible(spec.radius) === true`

---

## How (deterministic design)

## Standardized glow definition (single source of truth)

The glow style is exactly and always:

- **Texture**: same as base glyph placement texture
- **Glow tint (fixed)**: `0x000000` (white)
- **Blend mode**: additive
- **Layers** (exactly 2):
    1. Inner: `outsetPx = 6`, `alpha = 0.18`
    2. Outer: `outsetPx = 14`, `alpha = 0.08`

No other parameters are configurable in this phase.

## Pixel-based standardization rule (no ambiguity)

Let:

- `T = 128` be the glyph texture side length in pixels (project constant)
- `S_base` be the base glyph placement scale used today
- `O` be the glow layer outset in pixels

Then the glow layer scale is:

`S_glow = S_base + (2 * O) / T`

This guarantees standardized glow thickness independent of entity radius.

## Rendering order (strict)

Within `scratch.root` children list:

1. All **outer glow** images in placement index order `0..4`
2. All **inner glow** images in placement index order `0..4`
3. All **base glyph** images in placement index order `0..4`

This guarantees:

- every glow is behind every base glyph, and
- placement ordering among bases remains identical to current behavior.

## Pool safety (strict)

Any pooled `Image` returned by `DisplayTypePool.imagePool` **must** be reset with:

- `blendMode = NORMAL`
  This prevents additive blend mode from leaking into future non-glow image usage.

---

## Files: responsibilities, logic, and interfaces

> Every file listed here is **either changed or added**. No other files are in scope.

### CHANGED — `src/engine/phaser/display/modules/GlyphModule.ts`

**Responsibility**

- Render glyph placements for an entity instance.
- Own all pooled `Image` objects required to render base glyph and standardized glow.
- Maintain `scratch.mainImage` pointing to the base glyph placement `0` for compatibility with other modules.

**External interface**

- Exported factory: `createGlyphModule(glyphRegistry: GlyphRegistry): DisplayModuleFactory`
- Runtime contract:
    - `create(ctx)` acquires and attaches images; sets `scratch.mainImage`
    - `tick(ctx)` updates textures, transforms, visibility, and glow
    - `destroy(ctx)` releases images and clears `scratch.mainImage`

**Internal owned objects**

- `baseImages[0..4]` (existing max placements)
- `innerGlowImages[0..4]`
- `outerGlowImages[0..4]`
  Total acquired images: **15**.

**Logic (create)**

- Acquire 15 images from `pools.get(spec.display_key).imagePool`.
- Add to `scratch.root` in the strict order defined above.
- Set `scratch.mainImage = baseImages[0]`.

**Logic (tick)**

- If `isRadiusVisible(spec.radius) === false`:
    - Set all 15 images `visible=false` and return.
- Else:
    - Read glyph config from `glyphRegistry.get(spec.display_key)`.
    - For each placement index `i` from 0..4:
        - If `i >= glyph.placements.length`: hide the three images at index `i` and continue.
        - Else:
            - Compute the placement transform exactly as today using `resolveGlyphPlacementTransform(...)`.
            - Configure base image:
                - texture: placement texture key
                - tint: placement tint
                - alpha: 1
                - blend: NORMAL
                - position/scale/rotation: from transform
                - visible: true
            - Configure glow images (outer then inner) using:
                - texture: same as base
                - tint: fixed `0xff0000`
                - blend: ADD
                - alpha: per layer spec
                - position/rotation: same as base
                - scale: `computeGlowScale(baseScale, outsetPx)`
                - visible: true

**Logic (destroy)**

- Remove all 15 images from `scratch.root`.
- Release them back to the pool.
- Set `scratch.mainImage = null`.

**Explicit invariants**

- `scratch.mainImage` always refers to the **base** image at index 0 when the module is alive.
- Glow images never become `scratch.mainImage`.
- Base image blend mode is always NORMAL; glow blend mode is always ADD.

**Pseudocode (authoritative)**

```text
IF !isRadiusVisible(spec.radius):
    hide all outer/inner/base images; RETURN

glyph = registry.get(spec.display_key)

FOR i in 0..4:
    IF i >= glyph.placements.length:
        hide outer[i], inner[i], base[i]; CONTINUE

    t = resolveGlyphPlacementTransform(...)
    base[i]  = applyBase(t, placementTint, placementTexture)
    inner[i] = applyGlow(t, GLOW_TINT, ADD, alpha=0.18, outsetPx=6)
    outer[i] = applyGlow(t, GLOW_TINT, ADD, alpha=0.08, outsetPx=14)
```

---

### CHANGED — `src/engine/phaser/display/modules/InteractionModule.ts`

**Responsibility**

- Own entity selection click/tap interactions for a display instance.
- Enable/disable interactivity deterministically based on visibility rules.

**External interface**

- Exported: `InteractionModule: DisplayModuleFactory`
- Uses provided callback: `selectEntity(id: string | null): void`

**Target selection (strict)**

- If `scratch.backgroundImage != null`:
    - `target = scratch.backgroundImage` (unchanged behavior for transfer)
- Else:
    - `target = scratch.root` with custom circle hit area

**Hit area definition (strict)**

- `hitArea` is a plain object: `{ x: 0, y: 0, radius: spec.radius }`
- `contains(x, y)` returns: `x*x + y*y <= radius*radius`
- On every tick for root-circle target: `hitArea.radius = spec.radius`

**Logic**

- `create`:
    - Resolve the target per rules above.
    - If no target exists (unexpected): log error loudly; no interactivity is attached.
    - Attach `pointerdown` handler to call `selectEntity(spec.entityId)`.
- `tick`:
    - Background target: enable when `target.visible` else disable.
    - Root-circle target: enable when `spec.hasPhysics && isRadiusVisible(spec.radius)` else disable; update hitArea radius always.
- `destroy`:
    - Remove pointerdown listener and disable interactivity.

**Pseudocode (authoritative)**

```text
target = backgroundImage ?? rootCircleTarget

ON pointerdown: selectEntity(spec.entityId)

TICK:
  IF target is backgroundImage:
      target.visible ? enable : disable
  ELSE target is rootCircle:
      hitArea.radius = spec.radius
      (spec.hasPhysics && isRadiusVisible(spec.radius)) ? enable : disable
```

---

### CHANGED — `src/engine/phaser/display/DisplayDefinitionCatalog.ts`

**Responsibility**

- Define module stacks per `display_key`.

**Change**

- Remove `BackgroundModule` from the **normal entity stack** only.
- Transfer stack remains unchanged.

**New stacks (strict order)**

- `entityStack`:
    1. TransformModule
    2. GlyphModule
    3. InteractionModule
    4. SelectionModule
    5. DistressModule
- `transferStack`:
    1. TransformModule
    2. TransferModule
    3. InteractionModule
    4. SelectionModule

---

### CHANGED — `src/engine/phaser/display/DefaultPlaceholderDisplayDefinition.ts`

**Responsibility**

- Provide the fallback display module stack when a display key has no registered DisplayDefinition.

**Change**

- Remove `BackgroundModule` from placeholder stack.

**New placeholder stack (strict order)**

1. TransformModule
2. GlyphModule
3. InteractionModule

---

### CHANGED — `src/engine/phaser/display/pooling/DisplayTypePool.ts`

**Responsibility**

- Provide pooled Phaser display objects and guarantee they are reset to a clean default state on reuse.

**Change**

- In the `imagePool.reset(img)` function, set blend mode to NORMAL.

**Reset contract for images (complete list)**
After reset, the pooled image must have:

- position `(0,0)`
- `visible=false`
- `alpha=1`
- `scale=1`
- `rotation=0`
- `flipX=false`
- tint cleared
- **blend mode = NORMAL**

---

### ADDED — `src/engine/phaser/display/blendModes.ts`

**Responsibility**

- Provide canonical numeric blend mode constants without requiring Phaser imports in tests.

**Public interface**

- `BLEND_MODE_NORMAL: number` (value `0`)
- `BLEND_MODE_ADD: number` (value `1`)

**Invariants**

- Values are treated as canonical mapping for NORMAL and ADD blend modes in this codebase.

---

### ADDED — `src/engine/phaser/display/glyph/GlyphGlowStyle.ts`

**Responsibility**

- Single source of truth for standardized glow parameters.

**Public interface**

- `GLYPH_GLOW_TINT: number` = `0xff0000`
- `GLYPH_GLOW_LAYERS` = exactly two entries:
    - `{ outsetPx: 6, alpha: 0.18 }`
    - `{ outsetPx: 14, alpha: 0.08 }`

**Invariant**

- No other glow styles exist in this phase.

---

### ADDED — `src/engine/phaser/display/glyph/glyphGlowMath.ts`

**Responsibility**

- Pure, deterministic computation for converting pixel outsets into scale increments.

**Public interface**

- `computeGlowScale(baseScale: number, outsetPx: number): number`

**Algorithm (strict)**

- Uses `T = 128`.
- Returns: `baseScale + (2 * outsetPx) / 128`.

---

## Tests (added files): responsibilities and coverage

All tests are colocated next to the source file they test. Tests follow AAA (Given/When/Then) and assert behavior/state.

### ADDED — `src/engine/phaser/display/glyph/glyphGlowMath.test.ts`

**Responsibility**

- Verify pixel-based standardized scale calculation.

**Test cases**

1. Delta matches exact formula for `outsetPx=6`.
2. Delta is invariant with respect to `baseScale`.
3. `outsetPx=0` returns `baseScale` exactly.

---

### ADDED — `src/engine/phaser/display/pooling/DisplayTypePool.test.ts`

**Responsibility**

- Verify `imagePool.reset` enforces the image reset contract, specifically `blendMode=NORMAL`.

**Test cases**

1. When an image with `blendMode=ADD` is released, it is reset to `blendMode=NORMAL`.
2. Reset does not mutate unrelated state beyond the reset contract (assert the documented reset fields are applied).

**Test harness (strict)**

- Use a fake image object implementing the methods used by reset.
- Use `DisplayTypePool(...).imagePool.release(fakeImage)` to exercise reset deterministically.

---

### ADDED — `src/engine/phaser/display/modules/InteractionModule.test.ts`

**Responsibility**

- Verify interaction target selection and enable/disable rules.

**Test harness (strict)**

- Fake `Container` and `Image` objects supporting:
    - `setInteractive(...)`, `disableInteractive()`, `on(...)`, `removeAllListeners(...)`, `setData(...)`
    - `visible` boolean
- Context objects are plain JSON with these fakes.

**Test cases**

1. When `scratch.backgroundImage` exists, interaction target is backgroundImage (root is not used).
2. When `scratch.backgroundImage` is null, interaction target is root circle.
3. Root-circle target: enabled only when `spec.hasPhysics && isRadiusVisible(spec.radius)`.
4. Background target: enabled only when `target.visible === true`.
5. Pointerdown triggers `selectEntity(spec.entityId)` exactly once per event.

---

### ADDED — `src/engine/phaser/display/modules/GlyphModule.test.ts`

**Responsibility**

- Verify GlyphModule produces standardized glow rendering behavior and preserves compatibility (scratch.mainImage) without relying on Phaser runtime.

**Test harness (strict)**

- Fake image object with observable state:
    - `textureKey`, `tint`, `alpha`, `blendMode`, `x`, `y`, `scale`, `rotation`, `visible`
    - Setters mimic Phaser chaining semantics.
- Fake container:
    - `children[]` list, `add(obj)`, `remove(obj)`
- Fake pool:
    - `acquire(scene)` returns new fake image
    - `release(img)` records releases

**Test cases**

1. **Create attaches 15 images in strict order**
    - Given a fresh module instance
    - When `create` is called
    - Then root children order is: outer[0..4], inner[0..4], base[0..4]
    - And `scratch.mainImage === base[0]`
2. **Tick renders glow layers with standardized parameters**
    - Given a glyph with at least one placement
    - When `tick` runs with `radius > 0.5`
    - Then for each active placement index:
        - base image is visible, blend NORMAL, alpha 1, tint = placement tint
        - glow images are visible, blend ADD, tint = `0xff0000`, alpha per layer spec
        - glow scale delta equals `(2*outsetPx)/128` relative to that placement’s base scale
3. **Tick hides unused placement slots**
    - Given only N placements where `N < 5`
    - Then indices `N..4` are hidden for base + both glows
4. **Tick hides everything when radius not visible**
    - Given `radius <= 0.5`
    - Then all 15 images are hidden
5. **Destroy releases all images**
    - Given a created module instance
    - When `destroy` is called
    - Then 15 releases occur and `scratch.mainImage` becomes null

---

## Acceptance criteria (all must pass)

1. Normal entities render no BackgroundModule circle.
2. Normal entities render standardized two-layer red additive glow behind each glyph placement.
3. Transfer visuals remain unchanged.
4. Clicking normal entities selects them reliably (root-circle hit area).
5. Clicking transfer entities remains reliable (background image target).
6. No pooled blend mode leakage: after pooling, non-glow images always reset to NORMAL.
7. All new and existing tests pass, and test readability meets the Testing Standards.

---

## Out-of-scope confirmation

No other files are modified. No new runtime/system behavior is introduced. No TODOs are left behind.

