# Phase 17 — Pool Shaped LLD

## 1. Purpose

Implement shape-specific rendering for attribute pools and vein blobs in the existing Phaser display pipeline.

This phase exists because the current code routes `attr_body`, `attr_mind`, and `attr_social` through the generic `entityStack` in `src/engine/phaser/display/DisplayDefinitionCatalog.ts`, which includes `BackgroundModule` and `GlyphModule`, and because `src/engine/phaser/display/modules/VeinsModule.ts` currently allocates exactly one blob texture with `shape: "circle"` for all vein types.

The implementation must:

- remove the background-rendered pool body for the three attribute pools
- render each attribute pool as a shape silhouette plus colored glow
- render moving vein blobs in the same attribute-specific shape
- reuse existing display modules, pooling, texture generation, and light resolution mechanisms where possible
- avoid changing runtime simulation, ECS behavior, or blueprint semantics

This document is grounded in direct inspection of the current codebase and the uploaded project contract documents.

---

## 2. Inspected Inputs

### 2.1 Contract documents reviewed

- `context-pack.md`
- `prompt-contract.md`
- `testing-standards.md`

### 2.2 Code files reviewed

- `src/engine/phaser/display/DisplayDefinitionCatalog.ts`
- `src/engine/phaser/display/types.ts`
- `src/engine/phaser/display/moduleTypes.ts`
- `src/engine/phaser/display/resolveDisplaySpec.ts`
- `src/engine/phaser/display/modules/BackgroundModule.ts`
- `src/engine/phaser/display/modules/InteractionModule.ts`
- `src/engine/phaser/display/modules/LightModule.ts`
- `src/engine/phaser/display/modules/lightModuleState.ts`
- `src/engine/phaser/display/modules/lightModuleDecorState.ts`
- `src/engine/phaser/display/modules/TransformModule.ts`
- `src/engine/phaser/display/modules/SelectionModule.ts`
- `src/engine/phaser/display/modules/DistressModule.ts`
- `src/engine/phaser/display/modules/VeinsModule.ts`
- `src/engine/phaser/display/modules/veinsEdgeTick.ts`
- `src/engine/phaser/display/modules/veinsPulseLifecycle.ts`
- `src/engine/phaser/display/VeinsDisplayData.ts`
- `src/engine/phaser/utils/ShapeTextureGen.ts`
- `src/engine/phaser/utils/TextureManager.ts`
- `src/engine/phaser/veins/PulseEngine.ts`
- `src/engine/phaser/display/pooling/DisplayTypePool.ts`
- `src/data/raw/example/modules/core.bp`
- `src/data/raw/example/modules/assets.art`
- `src/engine/phaser/display/DisplayDefinitionCatalog.test.ts`
- `src/engine/phaser/display/modules/LightModule.lights.test.ts`

---

## 3. Current-State Facts

### 3.1 Attribute pools are currently generic entity displays

`DisplayDefinitionCatalog.ts` currently binds:

- `attr_body` -> `entityStack`
- `attr_mind` -> `entityStack`
- `attr_social` -> `entityStack`

`entityStack` currently contains:

1. `TransformModule`
2. `BackgroundModule`
3. `GlyphModule`
4. `InteractionModule`
5. `SelectionModule`
6. `DistressModule`

Therefore, attribute pools currently render as generic background bodies with glyph overlay support.

### 3.2 Attribute pools are authored as display entities with style-backed circles

`core.bp` defines:

- `pool_body` with `display_key: "attr_body"` and `style: "style_pool_body"`
- `pool_mind` with `display_key: "attr_mind"` and `style: "style_pool_mind"`
- `pool_social` with `display_key: "attr_social"` and `style: "style_pool_social"`

`assets.art` defines these styles as circular filled styles.

### 3.3 Attribute pools currently inherit glyph fallback by display key

`resolveDisplaySpec.ts` only assigns `glyph_key` when a display or passport glyph key is explicitly authored.

`GlyphModule` falls back to `spec.display_key` when `spec.glyph_key` is null.

`assets.art` defines `icons.attr_body`, `icons.attr_mind`, and `icons.attr_social`.

Therefore, if `GlyphModule` remains in the stack, the attribute pools will continue to show fallback glyph imagery by display key.

### 3.4 Vein blobs are currently all circles

`VeinsModule.ts` allocates a single `pulseTextureKey` during module creation using:

- `shape: "circle"`
- `color: "#ffffff"`

That texture is then passed to `tickEdge(...)` for every edge regardless of `edge.veinType`.

### 3.5 Blob tinting already exists and must remain the color mechanism

`veinsPulseLifecycle.ts` sets the blob image tint from `resolveBlobVariance(...)` and does not encode color in the texture itself.

Therefore the shape textures must remain white and tintable.

### 3.6 Existing shape generation is procedural and cache-backed

`ShapeTextureGen.ts` currently supports only:

- `circle`
- `rect`
- `hex`

`TextureManager.getShapeTexture(...)` delegates to `generateShapeTexture(...)`, which caches by key format:

`shape:${shape}:${color}:${border}`

This existing mechanism is the correct extension point.

### 3.7 Existing light resolution already has a decor branch for special display keys

`lightModuleState.ts` resolves light state in this order:

1. `resolveBaseLightState(...)`
2. `resolveDecorLightState(...)`

`lightModuleDecorState.ts` already owns special-case light resolution for:

- `cave_level`
- `face_avatar_*`
- `swarm_avatar`

This file is the correct place to add attribute-pool glow behavior.

### 3.8 Attribute colors already exist in the pulse engine

`PulseEngine.getAllNodeColors()` returns:

- `body`
- `mind`
- `social`
- `nervous`
- `assignable`
- `absorption`

These existing colors must be the source of truth for attribute-pool glow color.

### 3.9 Interaction behavior depends on whether `scratch.backgroundImage` is set

`InteractionModule.ts` uses image-based interaction when `scratch.backgroundImage` is non-null.
Otherwise it uses a circular hit area on `scratch.root` with radius `spec.radius`.

This matters for the new pool shape module. If it sets `scratch.backgroundImage`, interaction will switch from the current circular root hit area to rectangular image-based hit testing.

---

## 4. Design Goal

Deliver the requested visual change entirely inside the Phaser display layer by:

- introducing a dedicated module for rendering attribute-pool silhouettes
- introducing one shared attribute-to-shape resolver
- extending the existing procedural shape texture generator
- switching vein blob texture selection from one global circle to per-edge shape resolution
- sourcing attribute glow color from the existing pulse engine palette

No runtime, ECS, blueprint schema, or vein simulation behavior may change.

---

## 5. Authoritative Shape Contract

The following mapping is the contract for this phase.

| Attribute key | Shape kind | Meaning |
|---|---|---|
| `body` | `plus_rounded` | rounded plus |
| `mind` | `chevron_up_rounded` | rounded up-pointed chevron |
| `social` | `triple_circle` | three overlapping circles in triangular layout |
| `nervous` | `circle` | unchanged fallback |
| unknown | `circle` | defensive fallback |

The following display-key-to-attribute mapping is also fixed:

| Display key | Attribute |
|---|---|
| `attr_body` | `body` |
| `attr_mind` | `mind` |
| `attr_social` | `social` |

No other display keys are part of this mapping in this phase.

---

## 6. Proposed Rendering Architecture

### 6.1 New display stack for attribute pools

The three attribute pools must stop using `entityStack` and instead use a dedicated stack named `attributePoolStack`.

`attributePoolStack` must contain exactly:

1. `TransformModule`
2. `LightModule`
3. `AttributePoolShapeModule`
4. `InteractionModule`
5. `SelectionModule`

### 6.2 Why this exact stack

- `TransformModule` remains first because it owns anchor positioning and visibility.
- `LightModule` remains the existing light owner and should continue to own glow.
- `AttributePoolShapeModule` becomes the visual body of the pool.
- `InteractionModule` remains unchanged and preserves the current root-circle input model.
- `SelectionModule` remains unchanged.

The following modules must not be present in `attributePoolStack`:

- `BackgroundModule`
- `GlyphModule`
- `DistressModule`

Reasons:

- `BackgroundModule` would reintroduce the pool background that the feature explicitly removes.
- `GlyphModule` would continue to render the fallback attribute icons defined in `assets.art`, which conflicts with shape-only pool presentation.
- `DistressModule` is body-health driven and is not part of the requested pool visualization.

---

## 7. File-Level Design

Each file below is either added or changed. Each definition is normative.

### 7.1 Change: `src/engine/phaser/display/DisplayDefinitionCatalog.ts`

#### Responsibility
Register the module stack for each `display_key`.

#### Required logic

1. Define a new local constant `attributePoolStack`.
2. `attributePoolStack` must equal:
   - `TransformModule`
   - `LightModule`
   - `AttributePoolShapeModule`
   - `InteractionModule`
   - `SelectionModule`
3. Rebind the following display keys from `entityStack` to `attributePoolStack`:
   - `attr_body`
   - `attr_mind`
   - `attr_social`
4. Leave all other registrations unchanged.

#### Interface
No signature changes.

```text
createDisplayDefinitions(
  glyphRegistry: GlyphRegistry,
  avatarRegistry: AvatarAppearanceRegistry,
): DisplayDefinition[]
```

#### Explicit non-goals

- Do not change `entityStack` itself.
- Do not change transfer, cave, avatar, or swarm stacks.
- Do not add any new display keys.

---

### 7.2 Add: `src/engine/phaser/display/modules/attributePowerVisuals.ts`

#### Responsibility
Provide the single source of truth for:

- mapping attribute-pool display keys to attribute names
- mapping attribute names to shape kinds

#### Required logic
This file must be pure logic only.
It must not touch Phaser, scene state, scratch state, or logging except where explicitly required below.

#### Required interface
The file must export exactly these functions:

```text
resolveAttributePoolKey(displayKey: string): "body" | "mind" | "social" | null
resolvePowerShape(attribute: string): ShapeKind
```

#### Required behavior

`resolveAttributePoolKey(...)`:

- `"attr_body"` -> `"body"`
- `"attr_mind"` -> `"mind"`
- `"attr_social"` -> `"social"`
- any other input -> `null`

`resolvePowerShape(...)`:

- `"body"` -> `"plus_rounded"`
- `"mind"` -> `"chevron_up_rounded"`
- `"social"` -> `"triple_circle"`
- any other input -> `"circle"`

#### Error policy
This file must not log.
It is a pure resolver surface.

---

### 7.3 Add: `src/engine/phaser/display/modules/AttributePoolShapeModule.ts`

#### Responsibility
Render the white silhouette body for `attr_body`, `attr_mind`, and `attr_social` using the existing image pool and texture manager.

#### Ownership
This module owns exactly one `Phaser.GameObjects.Image` acquired from `pools.get(spec.display_key).imagePool`.

#### Required scratch writes
On create:

- add the image to `scratch.backgroundAnchor`
- set `scratch.mainImage` to the owned image

On destroy:

- remove the image from `scratch.backgroundAnchor`
- release the image to the display pool
- set `scratch.mainImage` to `null` only if it still points at the module-owned image

#### Required scratch non-writes
This module must not set `scratch.backgroundImage`.

#### Why `scratch.backgroundImage` must remain null
`InteractionModule` changes its targeting behavior when `scratch.backgroundImage` exists.
Leaving it null preserves the current circular root hit target instead of switching to image-based hit testing.

#### Required tick logic
On each tick:

1. If `spec.hasPhysics` is false, hide the image and return.
2. If `isRadiusVisible(spec.radius)` is false, hide the image and return.
3. Resolve the attribute using `resolveAttributePoolKey(spec.display_key)`.
4. If the resolver returns `null`:
   - log one explicit error using `console.error`
   - hide the image
   - return
5. Resolve the shape using `resolvePowerShape(attribute)`.
6. Request a texture from `textureManager.getShapeTexture(...)` with:
   - `shape` = resolved shape
   - `color` = `"#ffffff"`
   - no border color
7. Apply the texture to the image.
8. Set scale to `spec.radius / STANDARD_TEXTURE_RADIUS`.
9. Set the image visible.

#### Interface
The module must export a `DisplayModuleFactory` named `AttributePoolShapeModule`.

#### Explicit non-goals

- Do not read `spec.style`.
- Do not use `GlyphRegistry`.
- Do not create custom graphics objects.
- Do not animate the pool shape.
- Do not add particles.

---

### 7.4 Change: `src/engine/phaser/display/modules/lightModuleDecorState.ts`

#### Responsibility
Resolve decorative point-light state for non-base displays.

#### Required logic
Add a new branch for these display keys:

- `attr_body`
- `attr_mind`
- `attr_social`

This branch must execute before the face-avatar and swarm-avatar branches.

#### Required behavior
For an attribute-pool display key:

1. Resolve the attribute with `resolveAttributePoolKey(tickCtx.spec.display_key)`.
2. If the resolver returns `null`, return `null`.
3. Read colors from `tickCtx.pulseEngine.getAllNodeColors()`.
4. Return a point light state with:
   - `kind: "point"`
   - `blendMode: BLEND_MODE_ADD`
   - `color: colors[attribute]`
   - `alpha: AVATAR_SWARM_AURA_ALPHA`
   - `radius: tickCtx.spec.radius * AVATAR_SWARM_AURA_SCALE`

#### Why those constants are required
This file already uses `AVATAR_SWARM_AURA_ALPHA` and `AVATAR_SWARM_AURA_SCALE` as existing generic soft-glow constants. No dedicated pool glow constants currently exist. Reusing these avoids inventing new magic values for this phase.

#### Explicit non-goals

- Do not add new constants.
- Do not hardcode body/mind/social hex values in this file.
- Do not pulse-modulate the attribute-pool glow.
- Do not change cave, face-avatar, or swarm behavior.

#### Interface
No signature changes.

```text
resolveDecorLightState(tickCtx: DisplayTickContext): LightState | null
```

---

### 7.5 Change: `src/engine/phaser/utils/ShapeTextureGen.ts`

#### Responsibility
Generate and cache procedural shape textures used by `TextureManager.getShapeTexture(...)`.

#### Required changes
Extend `ShapeKind` with exactly these new members:

- `plus_rounded`
- `triple_circle`
- `chevron_up_rounded`

All existing members remain:

- `circle`
- `rect`
- `hex`

#### Required invariants

- Keep `STANDARD_TEXTURE_RADIUS = 64` unchanged.
- Keep the texture key format unchanged.
- Keep the scene texture cache lookup unchanged.
- Keep LINEAR filtering unchanged.
- Keep support for `borderColor` intact.

#### Required geometry contract
All shapes are generated inside the existing `128 x 128` texture canvas centered at `(64, 64)`.

##### `plus_rounded`
This shape is the union of two centered capsules:

- vertical capsule: width `36`, height `112`, centered at `(64, 64)`
- horizontal capsule: width `112`, height `36`, centered at `(64, 64)`

A capsule means a straight bar with semicircular end caps.

##### `triple_circle`
This shape is the union of three filled circles:

- radius `24`
- centers:
  - top: `(64, 42)`
  - lower-left: `(42, 82)`
  - lower-right: `(86, 82)`

The circles must overlap.

##### `chevron_up_rounded`
This shape is the union of two capsules of thickness `24` laid on these segments:

- left arm from `(36, 82)` to `(64, 40)`
- right arm from `(64, 40)` to `(92, 82)`

This shape is an open-bottom upward chevron.

#### Border contract
If `borderColor` is provided, the implementation must stroke the same final silhouette after fill. No caller in this phase will request a border.

#### Interface
No function signatures change. Only the allowed `ShapeKind` values widen.

---

### 7.6 Change: `src/engine/phaser/display/modules/VeinsModule.ts`

#### Responsibility
Manage display state for all vein edges and provide the correct blob texture key to `tickEdge(...)`.

#### Current problem
This file currently creates one `pulseTextureKey` with `shape: "circle"` during `create(...)` and reuses it for all edges.

#### Required logic
Replace the single `pulseTextureKey` with per-shape texture resolution.

#### Required behavior
During module runtime:

1. Maintain a local cache from `ShapeKind` to texture key.
2. For each edge during `tick(...)`:
   - read `edge.veinType`
   - resolve the shape with `resolvePowerShape(edge.veinType)`
   - resolve or create the texture key for that shape using `textureManager.getShapeTexture({ shape, color: "#ffffff" })`
   - pass that texture key into `tickEdge(...)`

#### Fallback behavior

- `body` -> `plus_rounded`
- `mind` -> `chevron_up_rounded`
- `social` -> `triple_circle`
- `nervous` -> `circle`
- unknown vein type -> `circle`

#### Explicit non-goals
This file must not change:

- edge state lifecycle
- reveal timing
- spawn cadence
- blob speed
- tint logic
- size variance logic
- masking
- container ownership

#### Interface
No public factory signature changes.

---

## 8. Files Explicitly Not Changed

The following files must remain unchanged in this phase:

- `src/engine/phaser/display/modules/BackgroundModule.ts`
- `src/engine/phaser/display/modules/veinsEdgeTick.ts`
- `src/engine/phaser/display/modules/veinsPulseLifecycle.ts`
- `src/engine/phaser/display/resolveDisplaySpec.ts`
- `src/engine/phaser/utils/TextureManager.ts`
- `src/engine/phaser/veins/PulseEngine.ts`
- blueprint schema files
- runtime ECS files
- vein simulation files

### Reason
These files already provide the correct behavior or the correct extension seam. Changing them would expand scope beyond the requested rendering change.

---

## 9. Blueprint and Asset Contract Impact

### 9.1 Blueprint data
No blueprint structure changes are required.

`core.bp` may remain exactly as authored.

### 9.2 Existing style definitions
The authored styles:

- `style_pool_body`
- `style_pool_mind`
- `style_pool_social`

may remain in `assets.art` unchanged even if the new stack no longer reads `spec.style` for the three attribute pools.

This is acceptable because the feature request is a display-pipeline override, not an asset-schema cleanup task.

### 9.3 Existing icon definitions
The fallback icon definitions for:

- `attr_body`
- `attr_mind`
- `attr_social`

may remain in `assets.art` unchanged.

They will simply no longer be rendered for attribute pools because `GlyphModule` is removed from the pool stack.

---

## 10. Error Handling Contract

The implementation must log loudly on illegal state and must not fail silently.

### 10.1 Required explicit error
`AttributePoolShapeModule` must log an error when invoked with a `spec.display_key` that does not resolve to an attribute-pool key.

Required behavior:

- log via `console.error`
- hide the module-owned image
- return without throwing

### 10.2 Required fallback behavior
`resolvePowerShape(...)` must never throw.
Unknown attributes and unknown vein types must fall back to `circle`.

---

## 11. Test Design

The tests in this phase must adhere to `testing-standards.md`.
They must be behavior-first, Given/When/Then structured, and isolated at the correct boundary.

### 11.1 Change: `src/engine/phaser/display/DisplayDefinitionCatalog.test.ts`

#### Add test
**Name intent:** attribute pools use the dedicated shape stack.

#### Assertions
For `attr_body`:

- module stack equals exactly:
  1. `TransformModule`
  2. `LightModule`
  3. `AttributePoolShapeModule`
  4. `InteractionModule`
  5. `SelectionModule`

For `attr_mind` and `attr_social`:

- module stack reference must be the same `attributePoolStack`

#### Negative assertions
For `attr_body`:

- stack does not contain `BackgroundModule`
- stack does not contain `GlyphModule`
- stack does not contain `DistressModule`

### 11.2 Add: `src/engine/phaser/display/modules/attributePowerVisuals.test.ts`

#### Scope
Pure unit tests for the new resolver file.

#### Required cases

`resolveAttributePoolKey(...)`:

- `attr_body` -> `body`
- `attr_mind` -> `mind`
- `attr_social` -> `social`
- unknown key -> `null`

`resolvePowerShape(...)`:

- `body` -> `plus_rounded`
- `mind` -> `chevron_up_rounded`
- `social` -> `triple_circle`
- `nervous` -> `circle`
- unknown -> `circle`

### 11.3 Add: `src/engine/phaser/display/modules/AttributePoolShapeModule.test.ts`

#### Scope
Module-boundary unit tests with mocked Phaser/pool/image boundaries only.

#### Required cases

##### Case: renders body pool shape
Given:

- `spec.display_key = "attr_body"`
- `spec.hasPhysics = true`
- visible radius

When the module ticks,
Then:

- it requests `getShapeTexture({ shape: "plus_rounded", color: "#ffffff" })`
- it applies the returned texture to the pooled image
- it scales the image by `spec.radius / STANDARD_TEXTURE_RADIUS`
- it sets the image visible

##### Case: hides when no physics
Given `spec.hasPhysics = false`,
When the module ticks,
Then the image is hidden.

##### Case: hides when radius is not visible
Given a non-visible radius,
When the module ticks,
Then the image is hidden.

##### Case: logs and hides on invalid display key
Given a non-attribute display key routed into the module,
When the module ticks,
Then:

- `console.error` is called
- the image is hidden

##### Case: destroy releases owned image
Given a created module instance,
When `destroy(...)` runs,
Then:

- the image is removed from `backgroundAnchor`
- the image pool release function is called
- `scratch.mainImage` is cleared if it still points to the owned image

### 11.4 Change: `src/engine/phaser/display/modules/LightModule.lights.test.ts`

#### Add cases
Add one case each for:

- `attr_body`
- `attr_mind`
- `attr_social`

#### Assertions
For each case, `resolveLightState(...)` must return:

- `kind: "point"`
- `blendMode = BLEND_MODE_ADD`
- `color = tickCtx.pulseEngine.getAllNodeColors()[attribute]`
- `alpha = AVATAR_SWARM_AURA_ALPHA`
- `radius = spec.radius * AVATAR_SWARM_AURA_SCALE`

#### Test boundary requirement
The test must provide a real palette object through a fake `pulseEngine` boundary rather than hardcoding implementation internals inside the resolver.

### 11.5 Add: `src/engine/phaser/display/modules/VeinsModule.test.ts`

#### Scope
Module-boundary unit tests for blob texture routing.

#### Required cases

##### Case: routes attribute vein types to distinct white textures
Given edges with vein types:

- `body`
- `mind`
- `social`
- `nervous`

When the module ticks,
Then `textureManager.getShapeTexture(...)` is requested with:

- `plus_rounded` for `body`
- `chevron_up_rounded` for `mind`
- `triple_circle` for `social`
- `circle` for `nervous`

All textures must use `color: "#ffffff"`.

##### Case: falls back to circle on unknown vein type
Given an edge with an unknown `veinType`,
When the module ticks,
Then the requested shape is `circle`.

##### Case: does not alter non-shape edge behavior
Given existing edge data,
When the module ticks,
Then `tickEdge(...)` still receives a texture key per edge and all other arguments are preserved.

### 11.6 Add: `src/engine/phaser/utils/ShapeTextureGen.test.ts`

#### Scope
Unit tests for texture-generation cache behavior and support for the new shape kinds.

#### Required cases

##### Case: generates texture key for each new shape
For each of:

- `plus_rounded`
- `triple_circle`
- `chevron_up_rounded`

When `generateShapeTexture(...)` is called on a scene without the texture,
Then:

- a texture key in the existing `shape:${shape}:${color}:${border}` format is returned
- the scene texture cache receives the texture

##### Case: reuses cached texture
Given a scene where the texture key already exists,
When `generateShapeTexture(...)` is called again,
Then it returns the same key and does not regenerate the texture.

---

## 12. Acceptance Criteria

This phase is complete only when all of the following are true.

1. `attr_body`, `attr_mind`, and `attr_social` no longer use `entityStack`.
2. Each attribute pool renders one white silhouette image in its assigned shape.
3. Each attribute pool emits glow color from `PulseEngine.getAllNodeColors()` for the matching attribute.
4. Attribute pools do not render via `BackgroundModule`.
5. Attribute pools do not render via `GlyphModule`.
6. Attribute pools do not render via `DistressModule`.
7. Vein blobs for `body`, `mind`, and `social` use distinct silhouettes.
8. Vein blobs for `nervous` remain circles.
9. Unknown vein types fall back to circle.
10. Blob tinting, speed, spacing, reveal, and size variance remain unchanged.
11. No runtime simulation files are modified.
12. All added and changed tests pass.

---

## 13. Implementation Order

1. Add `attributePowerVisuals.ts` and its tests.
2. Extend `ShapeTextureGen.ts` and add its tests.
3. Add `AttributePoolShapeModule.ts` and its tests.
4. Update `DisplayDefinitionCatalog.ts` and its test.
5. Update `lightModuleDecorState.ts` and `LightModule.lights.test.ts`.
6. Update `VeinsModule.ts` and add `VeinsModule.test.ts`.
7. Run the affected Phaser display test slice.
8. Run the full test suite.

---

## 14. Non-Negotiable Constraints

- No code in this document is normative source code.
- No unrelated refactors are allowed.
- No new rendering abstractions are allowed beyond the files specified here.
- Existing pooling, texture generation, and light systems must be reused.
- Error cases must be handled explicitly.
- The implementation and tests must satisfy this document exactly.

