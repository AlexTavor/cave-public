# LLD — Data-driven transfer visuals (glyph + light + particles)

## 1. Scope

This document specifies the low-level design for replacing the current transfer visual with a data-driven composed visual made of:

- a glyph determined by transfer type,
- a background light determined by data,
- a particle effect determined by data.

This design is grounded in the current codebase and intentionally avoids introducing any proxy-specific rendering abstraction.

## 2. Why this change is necessary

### 2.1 Observed current state

The current implementation is internally inconsistent:

- `engine/runtime/handlers/transferPendingBuilder.ts` always emits pending transfers with `display.display_key = "transfer"`.
- `engine/phaser/display/DisplayDefinitionCatalog.ts` registers `transfer_wood`, `transfer_heat`, `transfer_xp`, and `transfer_food`, but the pending transfer builder never emits those keys.
- `engine/phaser/display/modules/TransferModule.ts` renders transfers as a single colored circle using `entity.render.color` and `entity.render.baseRadius`.
- `engine/phaser/display/modules/GlyphModule.ts` resolves the glyph from `spec.display_key` and scales it using `spec.radius`.
- `engine/phaser/display/modules/ParticlesModule.ts` is not part of any display stack, is limited to particle kinds `heat | xp`, reads intensity from entity state instead of transfer payload, and computes a mapped frequency without applying it.

### 2.2 Architectural consequences of the current state

The current state creates four problems:

1. Transfer visuals are not actually type-specific at the display-definition level because all live transfers use the same display key.
2. Adding a new transferable resource should not require new hardcoded display-key registrations.
3. The generic glyph module cannot be reused directly for transfers because transfer glyph identity must come from transfer content, not `display_key`, and transfer glyph size must come from transfer payload scale, not physics radius.
4. The existing particles path is not suitable for transfers because transfers need a snapshot data-driven effect, not a state-intensity-driven ambient effect.

### 2.3 Explicit non-goal

There is no `ProxyModule` file in the current codebase. The only proxy-specific display logic relevant here is `game/handlers/proxyDisplay.ts`. This transfer-visual change shall not introduce a new proxy display abstraction and shall not route transfer rendering through proxy code.

## 3. Design goals

The implementation shall satisfy all of the following:

- Transfers keep a single canonical `display_key` of `"transfer"`.
- Transfer appearance is selected from transfer payload data, not from hardcoded display keys.
- Transfer visuals are implemented as display modules.
- Transfer glyphs, lights, and particles are defined from cartridge data.
- Transfer visual scale continues to use the existing logarithmic transfer scale from `computeTransferScale` in `engine/phaser/scenes/gameSceneMath.ts`.
- Existing runtime transfer semantics remain unchanged.
- Missing transfer-specific data does not make transfers invisible; it falls back to the current legacy circle visual.
- The design remains deterministic and snapshot-based: once a pending transfer is spawned, its visual spec is fixed on the entity and does not live-update from later asset edits.

## 4. Core contract

### 4.1 Canonical display identity

The canonical transfer display identity shall remain:

- `display.display_key = "transfer"`

The registrations `transfer_wood`, `transfer_heat`, `transfer_xp`, and `transfer_food` may remain temporarily as backward-compatibility aliases in the display registry, but no new runtime code may emit them.

### 4.2 Canonical transfer visual type

Each pending transfer instance shall have exactly one visual type.

The visual type shall be resolved exactly as follows:

- `visualType = Object.keys(payload)[0]`, if the payload has at least one key.
- `visualType = null`, if the payload is empty.

This rule is intentional because it matches the current behavior of `resolveTransferRenderProps`, which already uses the first payload key.

Implication:

- Multi-resource transfers remain logically supported by the runtime.
- Their visual identity is defined only by the first enumerable payload key.
- Redesigning multi-resource transfer visuals is out of scope for this change.

### 4.3 Spawn-time snapshot contract

`buildPendingTransfer` shall resolve a complete transfer visual snapshot once, at spawn time, and write it to the pending entity.

That snapshot is authoritative for rendering.

This means:

- transfer visuals do not query cartridge assets every tick,
- transfer visuals do not change if the underlying asset data is edited after the transfer has already spawned.

This preserves the current pattern where transfer render props are resolved in the runtime handler and stored on the entity.

### 4.4 Visual mode contract

Each pending transfer shall be in one of two visual modes:

- `pretty`
- `legacy`

`pretty` mode is used only when the selected resource has a valid `transferVisual` definition.

`legacy` mode is used when:

- the payload is empty,
- the selected resource key is missing from `assets.resources`, or
- the selected resource has no `transferVisual` definition.

### 4.5 Pretty-mode data contract

The resource asset schema shall support an optional `transferVisual` object.

When present, it shall define:

- `glyphPresetKey`: string
- `glyphColor`: string
- `light.shape`: one of `circle | rect | hex`
- `light.color`: string
- `light.alpha`: number in `[0, 1]`
- `light.radiusFactor`: number greater than `0`
- `light.blendMode`: `NORMAL | ADD`
- `particles.shape`: one of `circle | rect | hex`
- `particles.color`: string
- `particles.speed.min`: finite number, `>= 0`
- `particles.speed.max`: finite number, `>= particles.speed.min`
- `particles.lifespan`: finite number, `> 0`
- `particles.scale.start`: finite number, `>= 0`
- `particles.scale.end`: finite number, `>= 0`
- `particles.alpha.start`: number in `[0, 1]`
- `particles.alpha.end`: number in `[0, 1]`
- `particles.frequency`: finite number, `>= 0`
- `particles.quantity`: integer, `>= 1`
- `particles.blendMode`: `NORMAL | ADD`

The existing resource fields remain unchanged and continue to exist:

- `color`
- `radius`
- `effect`

### 4.6 Legacy-mode contract

Legacy mode shall preserve the current transfer appearance contract:

- circle shape,
- color from resource `color` if present, otherwise `#d8d8d8`,
- base radius from resource `radius` if present, otherwise `4`,
- final rendered radius from `computeTransferScale(baseRadius, payload)`, clamped by the current minimum radius behavior already implemented by `TransferModule`.

### 4.7 Ownership contract inside the display stack

The transfer display stack shall be composed so that scratch-slot ownership is unambiguous.

Pretty mode ownership:

- `TransferLightModule` owns `scratch.backgroundImage`
- `TransferGlyphModule` owns `scratch.mainImage`
- `TransferParticlesModule` owns `scratch.particlesManager`

Legacy mode ownership:

- legacy transfer fallback module owns `scratch.backgroundImage`
- no transfer glyph images are created
- no transfer particles emitter is created

This contract is necessary because `InteractionModule` chooses its interactive target during `create`, not during `tick`. The correct transfer background object must therefore exist before `InteractionModule.create` runs.

## 5. Final module stack

The canonical `"transfer"` display definition shall use the following module stack in this exact order:

1. `TransformModule`
2. `TransferLightModule`
3. `TransferGlyphModule`
4. `TransferParticlesModule`
5. `TransferModule` (repurposed as legacy fallback only)
6. `InteractionModule`
7. `SelectionModule`

Rationale for the order:

- transform must run first,
- light / glyph / particles / fallback must allocate the correct render objects before interaction is initialized,
- interaction must attach to the correct background image,
- selection remains unchanged and stays last.

## 6. File-by-file implementation plan

---

### 6.1 `data/schemas/assets/resources.ts` — **Changed**

**Responsibility**

Define the schema for resource visuals, including the new transfer-specific visual definition.

**Logic**

Extend `ResourceVisualSchema` with an optional `transferVisual` object.

The schema shall validate every field listed in section 4.5.

The existing fields `color`, `radius`, and `effect` shall remain unchanged.

**Interface**

The exported runtime type for resources shall include the optional transfer visual definition. The transfer visual shape and blend-mode enums shall be explicit and closed.

**Contract notes**

- No cross-asset validation is introduced here.
- This schema validates structure, not whether `glyphPresetKey` exists in `assets.glyphs`.

**Tests**

Add a new schema test file that verifies:

- legacy resource visuals still parse,
- a fully specified `transferVisual` parses,
- invalid shapes fail,
- invalid blend modes fail,
- invalid alpha ranges fail,
- invalid speed ranges fail,
- non-positive `radiusFactor`, `lifespan`, or `quantity` fail.

---

### 6.2 `engine/runtime/handlers/transferRender.ts` — **Changed**

**Responsibility**

Resolve a spawn-time transfer visual snapshot from payload + cartridge assets.

**Logic**

This file shall become the single runtime resolver for transfer visual identity and visual mode.

It shall:

- keep `buildPayloadLabel` unchanged,
- add a dedicated resolver for `visualType`,
- resolve either `pretty` or `legacy` mode,
- return a single immutable runtime object that contains everything the display modules need.

The returned object shall include:

- `mode`: `pretty | legacy`
- `visualType`: string or null
- `baseRadius`: number
- legacy fields when in legacy mode
- full pretty-mode glyph / light / particle fields when in pretty mode

**Interface**

The existing exported transfer-render type shall be expanded into a discriminated union with explicit `mode`.

The resolver shall accept:

- `payload: Record<string, number>`
- `context: CommandHandlerContext`

and shall return the discriminated union described above.

**Contract notes**

- `visualType` resolution must use the first payload key exactly.
- Missing resource data must return legacy mode, not null.
- The resolver must not read display keys.

**Tests**

Change or replace the existing transfer-utils render tests so they verify:

- empty payload resolves to legacy mode,
- resource with no `transferVisual` resolves to legacy mode,
- resource with `transferVisual` resolves to pretty mode,
- `visualType` equals the first payload key,
- `baseRadius` still comes from resource radius,
- default legacy color and radius are used when the resource is missing.

---

### 6.3 `engine/runtime/handlers/transferPendingBuilder.ts` — **Changed**

**Responsibility**

Create the pending transfer entity and snapshot the resolved visual contract onto it.

**Logic**

This file shall continue to own:

- transfer spawn position,
- transfer physics body creation,
- transfer entity assembly.

It shall now also:

- resolve the transfer visual snapshot once,
- write `transfer.visualType` onto the pending entity,
- write the resolved visual snapshot into `entity.render`.

The pending entity must continue to use `display.display_key = "transfer"`.

**Interface**

The returned `pendingEntity.transfer` object shall be extended with:

- `visualType: string | null`

The returned `pendingEntity.render` object shall be the exact resolver output from `transferRender.ts`.

**Contract notes**

- The display key remains canonical and unchanged.
- The transfer visual snapshot is immutable for the lifetime of the pending entity.

**Tests**

Add a dedicated `transferPendingBuilder` test file that verifies:

- the pending entity keeps `display_key = "transfer"`,
- `transfer.visualType` matches the selected payload key,
- `render.mode` matches the resolver mode,
- the render snapshot contains the resolved pretty-mode fields when data exists,
- the render snapshot contains legacy-mode fields when data does not exist.

---

### 6.4 `engine/phaser/display/DisplayDefinitionCatalog.ts` — **Changed**

**Responsibility**

Declare the transfer display composition.

**Logic**

Replace the existing transfer stack with the composed stack defined in section 5.

The file shall import and use:

- `TransferLightModule`
- `TransferGlyphModule`
- `TransferParticlesModule`
- the repurposed legacy fallback `TransferModule`

The canonical `"transfer"` display definition shall use that stack.

The existing alias keys `transfer_wood`, `transfer_heat`, `transfer_xp`, `transfer_food` may remain registered to the same stack for compatibility, but no new code shall depend on them.

**Interface**

No public interface changes beyond module-stack composition.

**Tests**

Add a display-definition catalog test that verifies:

- the `"transfer"` definition exists,
- its module stack is in the required order,
- compatibility aliases, if retained, point to the same stack.

---

### 6.5 `engine/phaser/display/modules/TransferModule.ts` — **Changed**

**Responsibility**

This file shall no longer be "the transfer renderer". It shall become the legacy fallback transfer shape renderer.

**Logic**

At `create`, this module shall inspect `ctx.entity.render.mode`.

- If mode is `pretty`, it shall allocate nothing and become a no-op runtime.
- If mode is `legacy`, it shall allocate exactly one background image and render the current colored circle behavior.

The actual legacy rendering behavior shall remain identical to the current implementation:

- read payload,
- read legacy color and base radius,
- compute scaled transfer radius with `computeTransferScale`,
- apply current minimum transfer radius behavior,
- render the generated circle texture into `scratch.backgroundImage`.

**Interface**

The module keeps the same file path and the same factory-style interface, but its semantic contract changes to: legacy fallback only.

**Tests**

Add a dedicated test file that verifies:

- legacy mode allocates one background image,
- pretty mode allocates nothing,
- legacy mode preserves current scale behavior,
- destroy releases the image and clears `scratch.backgroundImage`.

---

### 6.6 `engine/phaser/display/modules/TransferLightModule.ts` — **Added**

**Responsibility**

Render the pretty-mode background light for transfers.

**Logic**

At `create`:

- inspect `ctx.entity.render.mode`,
- if not `pretty`, do nothing and return a no-op runtime,
- if `pretty`, acquire one image from the display-key image pool,
- attach it to `scratch.backgroundAnchor`,
- assign it to `scratch.backgroundImage`.

At `tick`:

- if there is no physics or the transfer is not visible, hide the light,
- compute `renderRadius` from `computeTransferScale(baseRadius, payload)`,
- compute `lightRadius = renderRadius * light.radiusFactor`,
- generate the correct texture from `TextureManager.getShapeTexture` using `light.shape` and `light.color`,
- set alpha and blend mode from the resolved pretty-mode data,
- scale the image so that its rendered radius equals `lightRadius`.

At `destroy`:

- remove the image from `backgroundAnchor`,
- release it to the pool,
- clear `scratch.backgroundImage`.

**Interface**

Consumes only the resolved render snapshot stored on `entity.render`.

Does not read cartridge assets.

Does not read `display_key` for type selection.

**Tests**

Add tests that verify:

- pretty mode allocates a background image,
- legacy mode allocates nothing,
- light scale matches `renderRadius * radiusFactor`,
- blend mode and alpha come from the resolved data,
- hidden state is respected when physics is missing,
- destroy clears `scratch.backgroundImage`.

---

### 6.7 `engine/phaser/display/modules/TransferGlyphModule.ts` — **Added**

**Responsibility**

Render the pretty-mode transfer glyph.

**Logic**

This module shall intentionally not reuse `GlyphModule` directly because `GlyphModule` is keyed by `spec.display_key` and `spec.radius`, while transfer glyphs need `render.glyphPresetKey` and payload-scaled radius.

At `create`:

- inspect `ctx.entity.render.mode`,
- if not `pretty`, do nothing and return a no-op runtime,
- if `pretty`, acquire fifteen images from the image pool in the same structure used by `GlyphModule`:
    - five outer glow images,
    - five inner glow images,
    - five base images,

- attach them to `scratch.root`,
- assign `scratch.mainImage = baseImages[0]`.

At `tick`:

- compute the payload-scaled transfer radius using `computeTransferScale(baseRadius, payload)`,
- resolve the glyph via `glyphRegistry.get(glyphPresetKey)`,
- use the same placement math and glow math used by `GlyphModule`, but with the transfer radius instead of `spec.radius`,
- tint base images using `glyphColor`, not the preset placement colors,
- hide unused placements exactly as `GlyphModule` does.

At `destroy`:

- release all acquired images,
- clear `scratch.mainImage`.

**Interface**

Consumes:

- `glyphPresetKey`
- `glyphColor`
- `baseRadius`
- payload

Does not read `spec.display_key` to select the glyph.

**Contract notes**

- The current `GlyphRegistry` behavior for unknown keys is to allocate a procedural glyph. This runtime behavior remains unchanged.
- This LLD still treats missing pretty-mode preset keys as a content bug even though the runtime will remain non-fatal.

**Tests**

Add tests that verify:

- pretty mode allocates the full glyph image set,
- legacy mode allocates nothing,
- glyph selection uses `glyphPresetKey` rather than `spec.display_key`,
- glyph sizing uses payload-scaled transfer radius rather than `spec.radius`,
- base images are tinted with `glyphColor`,
- destroy releases all images and clears `scratch.mainImage`.

---

### 6.8 `engine/phaser/display/modules/TransferParticlesModule.ts` — **Added**

**Responsibility**

Render the pretty-mode transfer particle emitter.

**Logic**

This module shall be transfer-specific and snapshot-driven.

It shall not use `ParticlesConfigRegistry` and shall not use `ParticlesModule`.

At `create`:

- inspect `ctx.entity.render.mode`,
- if not `pretty`, return a no-op runtime,
- if `pretty`, build a texture key using `TextureManager.getShapeTexture` with `particles.shape` and `particles.color`,
- create one particle emitter with the resolved speed, lifespan, scale, alpha, frequency, quantity, and blend mode,
- attach the emitter to `scratch.effectsAnchor`,
- assign it to `scratch.particlesManager`.

At `tick`:

- if there is no physics, stop and hide the emitter,
- otherwise make the emitter visible and emitting,
- enforce the configured frequency on the emitter each tick,
- never read intensity from entity state,
- never map behavior from `heat` or `xp` kinds.

At `destroy`:

- stop the emitter,
- destroy it,
- clear `scratch.particlesManager`.

**Interface**

Consumes only the resolved pretty-mode particle spec stored on the entity.

No registry lookup is allowed.

**Contract notes**

- Transfer particles are data-defined and unconditional for pretty mode.
- They are not state-intensity-driven.

**Tests**

Add tests that verify:

- pretty mode creates one emitter,
- legacy mode creates none,
- emitter config is copied from the render snapshot,
- physics-hidden transfers stop and hide the emitter,
- the module does not inspect entity state,
- destroy clears `scratch.particlesManager`.

---

## 7. Files intentionally not generalized

### 7.1 `engine/phaser/display/modules/GlyphModule.ts` — **Unchanged**

This generic module remains correct for non-transfer entities because its contract is still:

- glyph identity derives from `display_key`,
- glyph size derives from `spec.radius`.

That contract is incompatible with transfer visuals, so transfer glyph rendering shall live in a separate module.

### 7.2 `engine/phaser/display/modules/ParticlesModule.ts` and `engine/phaser/display/particles/*` — **Unchanged for this change**

These files are not part of the new transfer design.

Reasons:

- they are not currently wired into any transfer display definition,
- they only support `heat` and `xp`,
- they read from entity state rather than transfer payload data,
- the mapped frequency is computed but not applied.

The new transfer particle path shall bypass them completely.

### 7.3 `game/handlers/proxyDisplay.ts` — **Unchanged**

Proxy display resolution remains out of scope.

No transfer rendering responsibility may be moved into proxy code.

## 8. Test plan by contract

The implementation is complete only when the following contracts are tested.

### 8.1 Data contract tests

- Resource schema accepts legacy resource visuals.
- Resource schema accepts pretty transfer visuals.
- Resource schema rejects invalid pretty transfer visuals.

### 8.2 Runtime snapshot tests

- First payload key defines `visualType`.
- Pretty-mode resources resolve to pretty-mode render snapshots.
- Resources without `transferVisual` resolve to legacy snapshots.
- Pending transfers keep canonical `display_key = "transfer"`.
- Pending transfers snapshot resolved render data at spawn.

### 8.3 Display composition tests

- Transfer display stack order is exact.
- Interaction sees the correct background image because light or fallback allocates before interaction initialization.

### 8.4 Pretty-mode rendering tests

- Light radius is derived from payload scale and `light.radiusFactor`.
- Glyph uses `glyphPresetKey`, not `display_key`.
- Glyph uses payload-scaled radius, not physics radius.
- Particles use snapshot config, not state intensity.

### 8.5 Legacy compatibility tests

- Missing pretty data still yields the old circle visual.
- Pretty mode suppresses legacy fallback allocation.

## 9. Migration steps

Implementation shall be done in this order:

1. Extend the resource schema.
2. Expand the runtime transfer render resolver into the discriminated snapshot contract.
3. Snapshot `visualType` and resolved render data in `buildPendingTransfer`.
4. Add `TransferLightModule`.
5. Add `TransferGlyphModule`.
6. Add `TransferParticlesModule`.
7. Repurpose `TransferModule` to legacy fallback mode only.
8. Replace the transfer display stack in `DisplayDefinitionCatalog.ts`.
9. Add or update all tests listed in this document.
10. Populate `assets.resources[*].transferVisual` for each resource type that should render in pretty mode.

## 10. Completion criteria

The change is complete only when all of the following are true:

- every pending transfer still uses `display_key = "transfer"`,
- pretty-mode resources render light + glyph + particles,
- resources without pretty data still render the legacy circle,
- no new per-resource transfer display keys are required,
- no proxy abstraction is introduced,
- all contract tests pass.
