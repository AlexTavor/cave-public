# Phase 16 — Faces / Bodies / Swarm Avatar Display LLD

## Status

Locked. This document reflects the agreed implementation direction:

- bodies, body proxies, face displays, and swarm displays will use a new avatar mechanism
- blinking will be implemented by collapsing eye sprite `scaleY`; there is no closed-eyes texture
- swarm will render one avatar per body currently represented by the swarm, computed as unassigned body count
- existing Glyph visuals remain unchanged for non-avatar entities

---

## 1. Why

The current display system uses Glyph-based visuals keyed by `display.display_key`. That works for abstract/resource-like entities, but it is the wrong abstraction for bodies, faces, proxies, and swarm because those need:

1. a shared silhouette language made from face shape + hair shape
2. glowing eyes that blink cheaply
3. consistent identity across body, face, and proxy renderers
4. a cheap runtime path that can handle hundreds of body visuals without per-frame vector drawing
5. a swarm renderer that reuses the same visual language without becoming a second ad hoc rendering system

The avatar mechanism exists to solve those problems without disturbing the existing Glyph system.

---

## 2. What

### 2.1 Feature outcome

After this phase:

- direct body world displays use `body_avatar`
- proxy displays spawned from bodies use `body_avatar`
- face blueprints use `face_avatar_body`, `face_avatar_mind`, and `face_avatar_social`
- swarm uses `swarm_avatar`
- pool nodes continue using `attr_body`, `attr_mind`, `attr_social`
- avatar rendering is deterministic and cached
- blink is implemented entirely by runtime `scaleY` collapse of the eye image
- swarm renders one avatar per unassigned body and no more

### 2.2 Non-goals

This phase does **not** do any of the following:

- refactor or replace Glyph rendering
- change pool node visuals
- change selection-card UI behavior or member listing logic
- add shader blur, live post-processing, or filter-based glow
- add runtime mutation outside the existing command/apply pipeline
- introduce artist tooling, editor controls, or blueprint schema changes beyond the display key rewiring defined here

---

## 3. Locked decisions

These decisions are final for this phase.

1. **No eyes-closed texture exists.**
   - Eyes are rendered as glowing shapes only.
   - Blink is produced by collapsing the eye image `scaleY` to zero and back.

2. **Avatar rendering is parallel to Glyph rendering, not an extension of it.**
   - Glyph remains the implementation for `attr_*`, transfer, veins, ambient, and fallback visuals.
   - Avatar is a separate display family with its own registry and texture generation.

3. **Silhouette = face shape + hair shape.**
   - The silhouette texture is generated from the union of the selected face and hair shapes.
   - Glow is derived from the silhouette texture, not from separate face and hair layers.

4. **Glow is baked, not filtered.**
   - Runtime does not apply blur or post-processing filters.
   - Glow uses a cached pre-generated texture.

5. **Appearance identity is deterministic.**
   - Body, face, and proxy representations of the same canonical body resolve to the same appearance.
   - Swarm members resolve deterministic per-slot appearances from the swarm id and slot index.

6. **Swarm count comes from unassigned bodies.**
   - `swarm.count` is computed by FaceSystem from the same unassigned body set already used for swarm totals.
   - SwarmAvatarModule renders exactly `swarm.count` avatars.

7. **Body passport icons are preserved for UI.**
   - Body blueprints no longer use the passport icon as the world `display_key`.
   - For body blueprints, the passport icon is copied into `body.passport.portraitIcon`.

---

## 4. Design contract

### 4.1 Simulation / architecture contract

1. All new simulation state updates continue to flow through commands.
2. No Phaser display module mutates ECS state.
3. Avatar rendering remains purely presentational.
4. FaceSystem is the only system in this phase that writes new swarm-related runtime state.
5. Errors remain loud. Missing or malformed avatar inputs must log clearly and degrade visibly rather than silently fail.

### 4.2 Performance contract

1. No avatar module may draw fresh vector graphics per entity per tick.
2. All silhouette, glow, and eye textures are cached by deterministic keys.
3. Direct body / face / proxy avatar rendering uses exactly 3 `Image` objects per visual instance:
   - 1 glow image
   - 1 silhouette image
   - 1 eye image
4. SwarmAvatarModule uses 3 `Image` objects per swarm member slot.
5. SwarmAvatarModule must release pooled images when swarm count shrinks.

### 4.3 Visual contract

1. Silhouette texture is white-on-alpha and tintable.
2. Glow texture is white-on-alpha and tintable.
3. Eye texture is white-on-alpha and tintable.
4. Glow uses additive blending.
5. Silhouette uses normal blending.
6. Eyes use additive blending.
7. Eyes are always drawn above the silhouette.
8. Glow is always drawn behind the silhouette.

---

## 5. Display keys and semantic meaning

The following keys are introduced and are the only avatar display keys in this phase.

| Display key | Meaning | Renderer |
|---|---|---|
| `body_avatar` | canonical body visual in world space, including proxies | `AvatarModule` |
| `face_avatar_body` | body face visual | `AvatarModule` |
| `face_avatar_mind` | mind face visual | `AvatarModule` |
| `face_avatar_social` | social face visual | `AvatarModule` |
| `swarm_avatar` | aggregate swarm visual | `SwarmAvatarModule` |

The following keys remain untouched:

- `attr_body`
- `attr_mind`
- `attr_social`
- `transfer*`
- `veins_display`
- menu ambient keys
- default placeholder behavior

---

## 6. Deterministic appearance model

### 6.1 Canonical subject seed

Every single-avatar render resolves a canonical subject seed string.

Resolution order is exact and mandatory:

1. if `entity.proxy.originalId` is a non-empty string, use that
2. else if `entity.state.assignedEntityId.value` is a non-empty string, use that
3. else if `entity.face.assignedEntityId` is a non-empty string, use that
4. else if `entity.id` is a non-empty string, use that
5. else return `null` and render nothing while logging an error

This guarantees that:

- a body renders as itself
- a face renders as its assigned body
- a proxy renders as its original body

### 6.2 Swarm member seed

Swarm members do **not** resolve from body ids in this phase.
They resolve from deterministic slot seeds.

For swarm entity id `S` and member slot index `i`, the seed is:

`S + ":member:" + i`

### 6.3 Epoch seed

Avatar appearance must vary by runtime seed in the same way Glyph allocation does.

The avatar appearance registry therefore has an epoch seed that is synchronized from:

- `runtime.getState().seed`

When the epoch seed changes, the avatar appearance cache is fully cleared.

### 6.4 Appearance record

Each resolved appearance is immutable and contains exactly these fields:

- `appearanceKey: string`
- `faceShapeIndex: number`
- `hairShapeIndex: number`
- `eyeShapeIndex: number`
- `eyeOffsetY: number`
- `eyeSpacing: number`
- `eyeScaleX: number`
- `eyeScaleY: number`
- `blinkIntervalMs: number`
- `blinkDurationMs: number`
- `blinkPhaseMs: number`

Field rules:

- `appearanceKey` must be stable for the same epoch seed + subject seed
- `faceShapeIndex` indexes the face shape catalog
- `hairShapeIndex` indexes the hair shape catalog
- `eyeShapeIndex` indexes the eye shape catalog
- `blinkIntervalMs` must be within `[2400, 4200]`
- `blinkDurationMs` is fixed at `120`
- `blinkPhaseMs` must be deterministic within `[0, blinkIntervalMs)`

### 6.5 Part catalog cardinality

The part catalogs are fixed-size in this phase:

- 12 face shapes
- 12 hair shapes
- 8 eye shapes

The catalogs must be literal normalized geometry data checked into source control. They are not loaded from content files and are not generated at runtime.

---

## 7. Texture generation contract

### 7.1 Texture families

Exactly three texture families exist:

1. silhouette
2. glow
3. eyes

There is no fourth family for closed eyes.

### 7.2 Texture key format

The texture key format is exact:

- silhouette: `avatar:silhouette:<appearanceKey>`
- glow: `avatar:glow:<appearanceKey>`
- eyes: `avatar:eyes:<appearanceKey>`

### 7.3 Texture canvas

All avatar textures use the same square canvas:

- canvas size: `128 x 128`
- canonical center: `(64, 64)`
- canonical avatar fit radius: `48`

### 7.4 Silhouette generation

Silhouette generation uses this exact process:

1. load face path by `faceShapeIndex`
2. load hair path by `hairShapeIndex`
3. render both paths into a single white alpha mask on the same canvas
4. the resulting texture is the silhouette texture

There is no runtime layer separation between face and hair in this phase.

### 7.5 Glow generation

Glow generation uses this exact process:

1. use the already-resolved silhouette mask
2. stamp the silhouette mask at 8 offsets:
   - `(-2, 0)`, `(2, 0)`, `(0, -2)`, `(0, 2)`, `(-2, -2)`, `(-2, 2)`, `(2, -2)`, `(2, 2)`
3. each offset stamp uses alpha `0.18`
4. render the original silhouette mask once more at alpha `0.10`
5. export the result as the glow texture

The glow texture contains white alpha only and is tintable at runtime.

### 7.6 Eye texture generation

Eye generation uses this exact process:

1. load eye path by `eyeShapeIndex`
2. render the left eye at x `-eyeSpacing`, y `eyeOffsetY`
3. render the right eye as a mirrored copy at x `+eyeSpacing`, y `eyeOffsetY`
4. apply per-appearance `eyeScaleX` and `eyeScaleY` to both eyes at texture-generation time
5. export as a single white-alpha eyes texture

---

## 8. Runtime rendering contract

### 8.1 AvatarModule composition

AvatarModule always owns exactly three pooled images:

- `glowImage`
- `silhouetteImage`
- `eyesImage`

Ownership and placement are exact:

- `glowImage` is attached to `scratch.effectsAnchor`
- `silhouetteImage` is attached to `scratch.root`
- `eyesImage` is attached to `scratch.root`
- `scratch.backgroundImage = silhouetteImage`
- `scratch.mainImage = silhouetteImage`

### 8.2 AvatarModule styling by display key

AvatarModule resolves a role palette from the display key.

Exact mapping:

- `body_avatar` → role `neutral`
- `face_avatar_body` → role `body`
- `face_avatar_mind` → role `mind`
- `face_avatar_social` → role `social`

Exact palette constants:

- `neutral` silhouette tint: `0x0f1720`
- `neutral` glow/eye tint: `0xbfe8ff`
- `body` silhouette tint: `0x1b1a16`
- `body` glow/eye tint: `0xffb347`
- `mind` silhouette tint: `0x151a24`
- `mind` glow/eye tint: `0x7cc8ff`
- `social` silhouette tint: `0x201521`
- `social` glow/eye tint: `0xff8fd8`

### 8.3 AvatarModule transform

For a display radius `R`, all three images use base scale:

`scale = R / 48`

Additional rules:

- glow image scale = `scale`
- silhouette image scale = `scale`
- eyes image scaleX = `scale`
- eyes image scaleY = `scale * blinkScale`

### 8.4 Blink function

Blink function is exact.

Inputs:

- `timeMs`
- `blinkIntervalMs`
- `blinkDurationMs`
- `blinkPhaseMs`

Procedure:

1. `t = (timeMs + blinkPhaseMs) mod blinkIntervalMs`
2. if `t >= blinkDurationMs`, return `1`
3. let `half = blinkDurationMs / 2`
4. if `t < half`, return `1 - (t / half)`
5. otherwise return `(t - half) / half`

Consequences:

- eyes fully open at scale factor `1`
- eyes fully closed at scale factor `0`
- closure and opening are linear and symmetric

### 8.5 SwarmAvatarModule composition

SwarmAvatarModule manages a dynamic array of slot triplets.
Each slot owns:

- `glowImage`
- `silhouetteImage`
- `eyesImage`

If `swarm.count = N`, the module must own exactly `N` live slot triplets after the tick completes.

If `N` shrinks, excess triplets must be released during the same tick.

### 8.6 Swarm member layout

Swarm member placement uses deterministic phyllotaxis.

For member count `N` and slot index `i`:

1. `goldenAngleRad = 2.399963229728653`
2. `angle = i * goldenAngleRad`
3. `radiusNorm = sqrt((i + 0.5) / N)`
4. `distance = radiusNorm * spec.radius * 0.78`
5. `x = cos(angle) * distance`
6. `y = sin(angle) * distance`
7. `memberScale = clamp(0.22, 0.56, 1.4 / sqrt(N))`

`memberScale` is multiplied by the base avatar scale defined in section 8.3.

### 8.7 Swarm style

Swarm uses the `neutral` avatar palette.

---

## 9. Swarm state contract

`SwarmTotals` is extended with a fourth field:

- `count: number`

`count` is defined exactly as:

- number of body entities in `bodyIndex`
- excluding `sys_swarm`
- excluding any body id present in `reservedBodies`

FaceSystem writes the following state keys onto `sys_swarm`:

- `swarm.body`
- `swarm.mind`
- `swarm.social`
- `swarm.count`

All four keys are visible.

No additional swarm state is introduced in this phase.

---

## 10. File-by-file implementation plan

Every file in this list is mandatory. No additional production files are allowed unless a blocker is discovered during implementation.

### 10.1 Change — `src/engine/compiler/abilities/passportCompiler.ts`

**Responsibility**

Compile passport data into blueprint display/body passport fields.

**Required logic**

1. Preserve current non-body behavior exactly.
2. Detect body blueprints by `draft.tags.includes("body")`.
3. For body blueprints only:
   - set `display.label = config.label`
   - set `display.display_key = "body_avatar"`
   - if `draft.components.body` exists, set `draft.components.body.passport.portraitIcon = config.icon`
4. Preserve `display.description` and `display.style` behavior exactly as today.

**Interface**

- input: `(draft: Blueprint, config: PassportAbilityConfig)`
- output: in-place mutation of compiled blueprint draft
- no return value

**Mandatory error handling**

- no new errors
- absence of `draft.components.body` on a tagged body blueprint must not throw

---

### 10.2 Change — `src/data/raw/example/modules/core.bp`

**Responsibility**

Provide canonical example face blueprint display wiring.

**Required logic**

Change only the three face blueprint display keys:

- `face_body.components.display.display_key = "face_avatar_body"`
- `face_mind.components.display.display_key = "face_avatar_mind"`
- `face_social.components.display.display_key = "face_avatar_social"`

No other blueprint in this file changes.

**Interface**

- static data only

---

### 10.3 Change — `src/data/schemas/v2/systemDefaults.ts`

**Responsibility**

Define default runtime display for `sys_swarm`.

**Required logic**

Change only:

- `DEFAULT_SWARM_ENTITY.display.display_key = "swarm_avatar"`

No other system default changes.

**Interface**

- static data only

---

### 10.4 Change — `src/game/handlers/proxyDisplay.ts`

**Responsibility**

Resolve the display component copied onto proxy entities.

**Required logic**

1. Keep existing display resolution order:
   - original instance display first
   - blueprint display fallback second
2. After display resolution, if the original entity is a body entity, override only `display_key` with `"body_avatar"`.
3. Preserve all other display fields unchanged.

A body entity is defined exactly as:

- `original.body` exists and is an object

**Interface**

- input: `(original: RuntimeEntity, context: CommandHandlerContext)`
- output: `Record<string, unknown> | undefined`

**Mandatory error handling**

- none beyond current behavior
- function must never throw for missing display or blueprint

---

### 10.5 Change — `src/game/systems/face/swarmTotals.ts`

**Responsibility**

Compute and emit swarm aggregate state for unassigned bodies.

**Required logic**

1. Extend `SwarmTotals` with `count`.
2. Compute `count` from unreserved bodies exactly as defined in section 9.
3. Extend `initialTotals` with `count: 0`.
4. Extend `totalsEqual` to compare `count`.
5. Extend `buildSwarmCommands` to emit `swarm.count`.
6. Preserve current `body`, `mind`, `social` aggregation semantics exactly.

**Interface**

- `calculateSwarmTotals(bodyIndex, reservedBodies): SwarmTotals`
- `totalsEqual(left, right): boolean`
- `buildSwarmCommands(swarmId, totals): RuntimeCommand[]`

**Mandatory error handling**

- uninitialized body attributes continue to resolve to zero

---

### 10.6 Change — `src/engine/phaser/scenes/gameSceneVisualParsers.ts`

**Responsibility**

Provide the fallback display component when `sys_swarm` has no display object.

**Required logic**

Change the fallback swarm display key from `cave_bodies` to `swarm_avatar`.

No other parser behavior changes.

**Interface**

- existing exports unchanged

---

### 10.7 Add — `src/engine/phaser/display/avatar/AvatarDisplayConstants.ts`

**Responsibility**

Define all avatar-specific constants in one place.

**Required logic**

This file exports only constants and exact mappings for:

- avatar display keys
- avatar role names
- palette map by role
- canvas size and canonical fit radius
- glow blending / alpha constants
- part catalog cardinalities

**Interface**

Must export at least:

- `BODY_AVATAR_DISPLAY_KEY`
- `FACE_AVATAR_BODY_DISPLAY_KEY`
- `FACE_AVATAR_MIND_DISPLAY_KEY`
- `FACE_AVATAR_SOCIAL_DISPLAY_KEY`
- `SWARM_AVATAR_DISPLAY_KEY`
- `AVATAR_CANVAS_SIZE`
- `AVATAR_FIT_RADIUS`
- `AVATAR_ROLE_PALETTES`

No functions with side effects.

---

### 10.8 Add — `src/engine/phaser/display/avatar/AvatarDisplayTypes.ts`

**Responsibility**

Own the avatar-only TypeScript types.

**Required logic**

Define immutable types for:

- avatar role
- avatar appearance
- normalized path point
- normalized shape path
- face/hair/eye catalog record
- swarm member placement

**Interface**

Must export types only. No runtime logic.

---

### 10.9 Add — `src/engine/phaser/display/avatar/AvatarSeedResolver.ts`

**Responsibility**

Resolve deterministic avatar subject seeds from runtime entities.

**Required logic**

1. Implement the canonical subject seed resolution order from section 6.1.
2. Implement swarm slot seed creation from section 6.2.
3. Reuse existing face-assignment resolution helpers where possible.

**Interface**

Must export:

- `resolveAvatarSubjectSeed(entity: RuntimeEntity): string | null`
- `resolveSwarmAvatarSlotSeed(swarmId: string, index: number): string`

**Mandatory error handling**

- if no seed can be resolved, return `null`
- do not throw

---

### 10.10 Add — `src/engine/phaser/display/avatar/AvatarPartCatalog.ts`

**Responsibility**

Hold the literal normalized geometry for face, hair, and eye shape pools.

**Required logic**

1. Export exactly 12 face shapes.
2. Export exactly 12 hair shapes.
3. Export exactly 8 eye shapes.
4. Geometry must be normalized to the canonical fit radius coordinate space centered on `(0, 0)`.
5. This file contains data and only trivial shape-count validation.
6. No hash, randomization, texture generation, Phaser calls, or entity inspection is allowed here.

**Interface**

Must export:

- `AVATAR_FACE_SHAPES`
- `AVATAR_HAIR_SHAPES`
- `AVATAR_EYE_SHAPES`

Optional: a single validation helper that throws during module init if counts are wrong.

---

### 10.11 Add — `src/engine/phaser/display/avatar/AvatarAppearanceRegistry.ts`

**Responsibility**

Resolve, cache, and epoch-synchronize deterministic avatar appearances.

**Required logic**

1. Maintain:
   - current epoch seed
   - cache by subject seed
2. `syncEpoch(seed)` clears cache only when the seed changes.
3. `resolve(subjectSeed)` returns a cached appearance or creates a new one.
4. Appearance generation uses deterministic seeded sampling from the runtime seed + subject seed.
5. Index selection ranges:
   - face shape index: `[0, 11]`
   - hair shape index: `[0, 11]`
   - eye shape index: `[0, 7]`
6. Parameter ranges:
   - `eyeOffsetY` in `[-6, 4]`
   - `eyeSpacing` in `[12, 18]`
   - `eyeScaleX` in `[0.9, 1.2]`
   - `eyeScaleY` in `[0.9, 1.15]`
   - `blinkIntervalMs` in `[2400, 4200]`
   - `blinkDurationMs = 120`
7. `appearanceKey` is a deterministic string built from the chosen indices and scalar parameters.

**Interface**

Must export class `AvatarAppearanceRegistry` with:

- `syncEpoch(seed: string): void`
- `resolve(subjectSeed: string): AvatarAppearance`
- `clear(): void`

**Mandatory error handling**

- empty subject seed must log loudly and throw
- out-of-range catalog access must be impossible by construction

---

### 10.12 Add — `src/engine/phaser/display/avatar/AvatarTextureGen.ts`

**Responsibility**

Generate cached silhouette, glow, and eye textures from avatar appearances.

**Required logic**

1. Expose one function per texture family.
2. Respect the texture-generation contract in section 7 exactly.
3. Use scene texture existence checks to avoid re-generation.
4. Use the shared scratch graphics object supplied by TextureManager.
5. Set generated texture filtering to `LINEAR`.

**Interface**

Must export:

- `generateAvatarSilhouetteTexture(scene, graphics, appearance): string`
- `generateAvatarGlowTexture(scene, graphics, appearance): string`
- `generateAvatarEyesTexture(scene, graphics, appearance): string`

**Mandatory error handling**

- invalid appearance keys or out-of-range catalog indices must throw loudly

---

### 10.13 Add — `src/engine/phaser/display/avatar/avatarBlink.ts`

**Responsibility**

Provide deterministic blink-scale math.

**Required logic**

Implement exactly the blink function from section 8.4.

**Interface**

Must export:

- `resolveBlinkScale(timeMs: number, appearance: AvatarAppearance): number`

No Phaser dependencies.

---

### 10.14 Add — `src/engine/phaser/display/avatar/swarmAvatarLayout.ts`

**Responsibility**

Provide deterministic per-slot placement for swarm avatars.

**Required logic**

Implement exactly the placement algorithm from section 8.6.

**Interface**

Must export:

- `resolveSwarmAvatarPlacement(radius: number, count: number, index: number): SwarmAvatarPlacement`

**Mandatory error handling**

- if `count <= 0`, throw loudly
- if `index < 0` or `index >= count`, throw loudly

---

### 10.15 Add — `src/engine/phaser/display/modules/AvatarModule.ts`

**Responsibility**

Render a single avatar instance for bodies, faces, and proxies.

**Required logic**

1. Acquire exactly three pooled images at create-time.
2. Attach them to anchors exactly as defined in section 8.1.
3. On tick:
   - hide all images if physics is absent or radius is not visible
   - resolve subject seed
   - resolve appearance from `AvatarAppearanceRegistry`
   - resolve silhouette/glow/eye texture keys via TextureManager
   - apply role palette by display key
   - apply transforms and blink scaling
4. On destroy:
   - remove images from parent containers
   - release all three images
   - clear `scratch.backgroundImage` if it still points to `silhouetteImage`
   - clear `scratch.mainImage` if it still points to `silhouetteImage`

**Interface**

Must export:

- `createAvatarModule(avatarRegistry: AvatarAppearanceRegistry): DisplayModuleFactory`

**Mandatory error handling**

- if display key is not one of the single-avatar avatar keys, log error and hide all images
- if subject seed is `null`, log error and hide all images

---

### 10.16 Add — `src/engine/phaser/display/modules/SwarmAvatarModule.ts`

**Responsibility**

Render an avatar crowd for `sys_swarm`.

**Required logic**

1. Maintain a dynamic array of slot triplets.
2. Read `swarm.count` from `entity.state`.
3. On tick:
   - if physics is absent or radius is not visible, hide all live slot triplets
   - if `swarm.count` is missing, log error and hide all live slot triplets
   - grow slot triplets until count matches `swarm.count`
   - shrink and release slot triplets when count decreases
   - for each slot index, resolve seed, appearance, textures, placement, blink, and palette
4. Use the neutral avatar palette for all swarm members.
5. Do not set `scratch.backgroundImage`.
6. Do not allocate Phaser graphics objects.

**Interface**

Must export:

- `createSwarmAvatarModule(avatarRegistry: AvatarAppearanceRegistry): DisplayModuleFactory`

**Mandatory error handling**

- non-numeric `swarm.count` logs loudly and results in no visible members
- negative `swarm.count` logs loudly and results in no visible members

---

### 10.17 Change — `src/engine/phaser/utils/TextureManager.ts`

**Responsibility**

Provide texture accessors for avatar texture families.

**Required logic**

1. Preserve current placeholder and glyph initialization behavior.
2. Add lazy avatar texture accessors that delegate to `AvatarTextureGen`.
3. Do not pre-generate avatar combinations at initialize-time.

**Interface**

Must add:

- `getAvatarSilhouetteTexture(appearance: AvatarAppearance): string`
- `getAvatarGlowTexture(appearance: AvatarAppearance): string`
- `getAvatarEyesTexture(appearance: AvatarAppearance): string`

All existing methods remain unchanged.

---

### 10.18 Change — `src/engine/phaser/display/DisplayDefinitionCatalog.ts`

**Responsibility**

Register avatar display keys and their module stacks.

**Required logic**

1. Preserve all existing non-avatar definitions unchanged.
2. Accept both registries as inputs.
3. Register these stacks exactly:

- `body_avatar` → `[TransformModule, AvatarModule, InteractionModule, SelectionModule, DistressModule]`
- `face_avatar_body` → `[TransformModule, AvatarModule, InteractionModule, SelectionModule]`
- `face_avatar_mind` → `[TransformModule, AvatarModule, InteractionModule, SelectionModule]`
- `face_avatar_social` → `[TransformModule, AvatarModule, InteractionModule, SelectionModule]`
- `swarm_avatar` → `[TransformModule, SwarmAvatarModule, InteractionModule, SelectionModule]`

**Interface**

Change signature to:

- `createDisplayDefinitions(glyphRegistry: GlyphRegistry, avatarRegistry: AvatarAppearanceRegistry): DisplayDefinition[]`

---

### 10.19 Change — `src/engine/phaser/scenes/GameSceneDisplayInit.ts`

**Responsibility**

Construct the display system and wire in the avatar registry.

**Required logic**

1. Instantiate `AvatarAppearanceRegistry` alongside `GlyphRegistry`.
2. Pass both registries to `createDisplayDefinitions`.
3. Return the avatar registry on `GameDisplaySystem`.
4. Pass the avatar registry into DisplayInstanceManager deps.

**Interface**

Add field:

- `avatarRegistry: AvatarAppearanceRegistry`

to `GameDisplaySystem`.

---

### 10.20 Change — `src/engine/phaser/display/DisplayInstanceManager.types.ts`

**Responsibility**

Extend display-manager dependencies with the avatar registry.

**Required logic**

Add:

- `avatarRegistry: AvatarAppearanceRegistry`

**Interface**

Only the dependency type changes.

---

### 10.21 Change — `src/engine/phaser/display/DisplayInstanceManager.lifecycle.ts`

**Responsibility**

Synchronize display registries to the runtime epoch.

**Required logic**

1. Preserve glyph epoch sync behavior.
2. Add avatar registry epoch sync from `runtime.getState().seed`.
3. Rename helper if needed so the name reflects both registries.

**Interface**

Existing exported lifecycle helpers remain; helper naming may change.

---

### 10.22 Change — `src/engine/phaser/display/DisplayInstanceManager.ts`

**Responsibility**

Clear and synchronize both display registries during runtime lifecycle.

**Required logic**

1. When runtime is absent:
   - clear `glyphRegistry`
   - clear `avatarRegistry`
   - destroy instances
   - destroy pools
2. When runtime is present:
   - synchronize both registries before entity iteration
3. No other behavior changes.

**Interface**

Public class interface unchanged.

---

## 11. Test plan

All tests must follow the project testing rules:

- behavior-focused
- Given / When / Then structure
- no implementation-detail assertions unless the implementation detail is the contract itself
- logic tests stay out of UI
- real data shapes, minimal mocking

### 11.1 Add — `src/engine/compiler/abilities/passportCompiler.test.ts`

**Responsibility**

Verify passport compilation behavior for body vs non-body blueprints.

**Cases**

1. body blueprint sets `display.display_key = body_avatar`
2. body blueprint copies passport icon into `body.passport.portraitIcon`
3. non-body blueprint still sets `display.display_key = config.icon`
4. description/style behavior preserved

---

### 11.2 Add — `src/game/handlers/proxyDisplay.test.ts`

**Responsibility**

Verify proxy display rewriting behavior.

**Cases**

1. body original with own display rewrites only `display_key` to `body_avatar`
2. body original with blueprint display fallback rewrites only `display_key`
3. non-body original preserves original display key
4. missing display still returns `undefined`

---

### 11.3 Change — `src/game/systems/face/swarmTotals.test.ts`

**Responsibility**

Verify the new swarm count contract.

**Cases**

1. count equals number of unreserved non-swarm bodies
2. `buildSwarmCommands` emits `swarm.count`
3. `totalsEqual` includes count in equality

---

### 11.4 Change — `src/game/systems/FaceSystem.swarm.test.ts`

**Responsibility**

Verify FaceSystem publishes `swarm.count` with the existing totals.

**Cases**

1. aggregate scenario writes correct `swarm.body`, `swarm.mind`, `swarm.social`, and `swarm.count`
2. fully assigned scenario writes `swarm.count = 0`

---

### 11.5 Change — `src/engine/phaser/scenes/gameSceneVisualParsers.swarm.test.ts`

**Responsibility**

Verify swarm fallback uses the new display key.

**Cases**

1. `sys_swarm` fallback returns `swarm_avatar`
2. non-swarm fallback remains `null`

---

### 11.6 Add — `src/engine/phaser/display/avatar/AvatarSeedResolver.test.ts`

**Responsibility**

Verify canonical subject seed resolution.

**Cases**

1. proxy original id wins
2. state assigned id wins over face assigned id
3. face assigned id wins over entity id
4. entity id is fallback
5. unresolved entity returns `null`
6. swarm slot seed format is exact

---

### 11.7 Add — `src/engine/phaser/display/avatar/AvatarAppearanceRegistry.test.ts`

**Responsibility**

Verify deterministic appearance resolution and epoch invalidation.

**Cases**

1. same epoch + same subject seed returns identical appearance
2. different subject seeds produce different appearance keys
3. different epoch seed invalidates cache and may change appearance
4. all indices remain within catalog ranges
5. scalar params remain within required ranges

---

### 11.8 Add — `src/engine/phaser/display/avatar/avatarBlink.test.ts`

**Responsibility**

Verify blink-scale math.

**Cases**

1. open outside blink window returns `1`
2. midpoint of closure returns `0`
3. opening half ramps back to `1`
4. phase offset changes blink timing deterministically

---

### 11.9 Add — `src/engine/phaser/display/avatar/swarmAvatarLayout.test.ts`

**Responsibility**

Verify deterministic swarm placement.

**Cases**

1. returned positions are deterministic for same inputs
2. returned scale stays within clamp bounds
3. invalid count throws
4. invalid index throws

---

### 11.10 Add — `src/engine/phaser/display/modules/AvatarModule.test.ts`

**Responsibility**

Verify single-avatar rendering contract.

**Cases**

1. create acquires exactly three images
2. tick hides all when radius is not visible
3. tick resolves textures from the canonical subject seed
4. eyes image uses `scaleY` blink collapse and never requests a closed-eyes texture
5. destroy releases exactly three images and clears scratch image pointers

---

### 11.11 Add — `src/engine/phaser/display/modules/SwarmAvatarModule.test.ts`

**Responsibility**

Verify crowd rendering contract.

**Cases**

1. tick grows slot triplets to match `swarm.count`
2. tick shrinks and releases slot triplets when `swarm.count` decreases
3. slot seeds use `swarmId:member:index`
4. missing `swarm.count` hides all members
5. negative `swarm.count` hides all members and logs loudly

---

## 12. Acceptance criteria

This phase is complete only when all of the following are true:

1. body blueprints compile to `body_avatar` in world display while preserving passport icons in `body.passport.portraitIcon`
2. faces render with avatar visuals and no pool visuals change
3. proxies of bodies render with `body_avatar`
4. swarm renders `swarm.count` member avatars
5. eyes blink via `scaleY` collapse only
6. no closed-eyes texture exists anywhere in the implementation
7. no avatar module performs per-frame vector drawing
8. all new and changed tests pass
9. no unrelated files are touched

---

## 13. Implementation order

The implementation order is mandatory.

1. constants, types, seed resolver, catalogs
2. appearance registry and blink/layout helpers
3. texture generation and TextureManager hooks
4. AvatarModule and SwarmAvatarModule
5. display system registry wiring
6. compiler / proxy / swarm state rewiring
7. data file rewiring (`core.bp`, `systemDefaults`)
8. tests

This order minimizes breakage and keeps failures local.

---

## 14. Out-of-scope consequences explicitly accepted

The following are accepted for this phase and are not bugs:

1. swarm UI card member count remains separate from `swarm.count`
2. swarm member visuals do not map to actual body ids; they map to deterministic swarm slots
3. avatar part geometry is source-controlled code data, not user-authored content

These items may be revisited in a later phase only by explicit request.
