# Phase 17 — Juice LLD

## 1. Scope and decision basis

This design is grounded in the uploaded source tree and in the canonical project constraints.
It is intentionally limited to the requested visual/feedback changes.
It does not introduce speculative refactors.
It reuses the existing runtime command pipeline, Phaser display stacks, veins display-data pipeline, and LightModule wherever those seams already exist.

### Verified existing seams this design builds on

- Transfer visuals already split into runtime render snapshots and Phaser display modules:
    - `src/engine/runtime/handlers/transferRender.ts`
    - `src/engine/runtime/handlers/transferPendingBuilder.ts`
    - `src/engine/phaser/display/modules/TransferModule.ts`
    - `src/engine/phaser/display/modules/TransferGlyphModule.ts`
    - `src/engine/phaser/display/modules/TransferParticlesModule.ts`
    - `src/engine/phaser/display/modules/lightModuleState.ts`

- Runtime already exposes an exact applied-command hook with previous/current snapshots:
    - `src/engine/runtime/createGameRuntime.ts`
    - `src/engine/runtime/runtimeTick.ts`
    - `src/ui/runtime/state/runtimeFactory.ts`

- Veins already flow through a dedicated display-data builder and renderer:
    - `src/engine/phaser/veins/veinsDisplayBuilder.ts`
    - `src/engine/phaser/display/VeinsDisplayData.ts`
    - `src/engine/phaser/display/modules/VeinsModule.ts`
    - `src/engine/phaser/display/modules/veinsEdgeTick.ts`
    - `src/engine/phaser/display/modules/veinsPulseLifecycle.ts`
    - `src/engine/phaser/display/modules/veinsEdgeDrawing.ts`

- Cave eye rendering already supports eye-position movement, but the render-state producer only drives small shared offsets and pupil offsets:
    - `src/game/systems/cave/resolveCaveRenderState.ts`
    - `src/data/schemas/game/caveMind.ts`
    - `src/engine/phaser/display/modules/CaveEyesModule.ts`
    - `src/engine/phaser/display/modules/caveEyesRenderMath.ts`

- Avatar auras are currently texture-based inside avatar modules, and avatar stacks do not yet include `LightModule`:
    - `src/engine/phaser/display/modules/AvatarModule.ts`
    - `src/engine/phaser/display/modules/SwarmAvatarModule.ts`
    - `src/engine/phaser/display/modules/avatarStackRender.ts`
    - `src/engine/phaser/display/DisplayDefinitionCatalog.ts`

## 2. Why

The current implementation already has strong primitives for visual feedback, but the requested Phase 17 changes need three things that do not yet exist together:

1. **Exact runtime-to-visual event delivery** for spawn, kill, and transfer-complete feedback.
   The current code has accurate command/snapshot information, but Phaser does not yet consume a dedicated visual-event stream.

2. **A broader LightModule contract**.
   `LightModule` currently covers pretty transfers and cycle producers only.
   The new work requires the same mechanism to drive transfer-complete flashes, cave glow, and avatar aura replacement.

3. **Richer vein rendering while keeping the current graph/display pipeline intact**.
   Veins already compute edge display data centrally, which is the right place to add taper, glow, and deterministic variance.

The design below preserves the project laws:

- all simulation mutations still happen through runtime commands;
- visual effects remain presentation-only;
- React still observes only;
- deterministic systems remain deterministic;
- Phaser-only feedback stays outside simulation state except where the runtime already provides authoritative events.

## 3. What

### Requested behaviors to implement

1. Flash a node, using `LightModule`, when a transfer to it completes.
2. Preserve the split visual decision:
    - transfer: color by resource, size by quantity;
    - proxy: large, constant, independent of transfer quantity/resource.

3. Add slight variance to vein blobs:
    - saturation;
    - size;
    - spacing.

4. Add slight hue variance to the vein itself.
5. Add a spreading gold-ring effect when a non-transfer object spawns.
6. Add a smoke-puff effect when a non-transfer object is killed.
7. Add glow behind veins, proportional to transfer rate.
8. Make veins taper from source to target; the source width is randomly 10%–15% wider than the target width.
9. Add a pulsing `LightModule` glow behind the Cave.
10. Replace texture-based avatar aura with `LightModule`.
11. Move the Cave’s eyes, not just the pupils:
    - gentle idle drift within available eye travel;
    - eyes bias toward the attention target when focus is present.

### Locked non-goals

- No runtime architecture change.
- No Blueprint mutation.
- No new React-side business logic.
- No new ECS mutation path.
- No unrelated display refactor.
- No change to gameplay balance, transfer routing, proxy routing, or Cave attention scoring.

## 4. Existing behavior that is already correct and must be preserved

### 4.1 Transfer vs proxy visual decision

This split is already present in the inspected code and must be preserved, not reinvented.

- **Transfer color** already comes from resource art in `transferRender.ts`.
- **Transfer size** already comes from payload quantity through `computeTransferScale(...)` in:
    - `src/engine/phaser/scenes/gameSceneMath.ts`
    - `src/engine/phaser/display/modules/TransferModule.ts`
    - `src/engine/phaser/display/modules/transferDisplayHelpers.ts`

- **Proxy display** already resolves independently through:
    - `src/game/handlers/proxyDisplay.ts`
    - `src/game/handlers/DispatchProxyHandler.ts`

- **Proxy body size** is currently constant at dispatch-time physics/body radii and is not payload-driven.

Implementation consequence:

- no production logic change is required to achieve the transfer/proxy split;
- the LLD adds regression tests so this contract cannot drift while other visual work lands.

## 5. High-level design

## 5.1 Runtime visual-event pipeline

### Why this seam

The exact source of truth for:

- actual spawn success,
- actual kill success,
- actual transfer completion,

is the existing `onCommandsApplied(commands, previousSnapshot, currentSnapshot)` hook.

Using this hook avoids guessing from display disappearance.
That is the only existing path that gives exact, post-apply, authoritative information without violating the runtime laws.

### Design

Add a small presentation-only event queue between runtime telemetry and Phaser.

The queue carries three event kinds:

- `spawn_gold_rings`
- `kill_smoke_puff`
- `transfer_completion_flash`

The queue is populated in `runtimeFactory.ts` after commands are applied.
The Phaser scene drains the queue each frame and turns those events into one-shot visual effects and temporary light overlays.

### Event filter rules

A “non-transfer object” is defined precisely as:

- entity does **not** have a `transfer` component, and
- entity tags do **not** contain `pending_transfer`, and
- entity has a physics body at the moment the event is derived.

This intentionally includes proxies.
This intentionally excludes the synthetic `veins_display` entity and transfer particles/nodes.

### Transfer-complete rule

A transfer-complete flash is emitted for:

- every applied `RESOLVE_TRANSFER` command, and
- every applied `TRANSFER_ASSETS` command with `payload.isImmediate === true`.

For `RESOLVE_TRANSFER`, the receiver is:

- `transfer.targetId` when `transfer.status === "pending"`;
- `transfer.sourceId` when `transfer.status === "returning"`.

For immediate transfers, the receiver is `command.payload.targetId`.

The flash carries:

- receiver entity id,
- primary resource key,
- total transferred amount.

The flash color resolves with the same priority as transfer visuals:

1. `assets.resources[resourceKey].transferVisual.light.color`
2. `assets.resources[resourceKey].color`
3. default `#d8d8d8`

## 5.2 LightModule expansion

### Why this seam

The request explicitly requires `LightModule` for:

- transfer-complete node flash,
- Cave glow,
- avatar aura replacement.

A single resolver keeps all light behavior in one place and avoids introducing parallel glow systems.

### Design

Broaden `resolveLightState(...)` so it can derive light state from the full display tick context and from the new runtime visual-effects manager.

The resolver order is:

1. transfer entity pretty-light state (existing behavior, unchanged);
2. transfer-complete flash overlay for the current entity, if active;
3. cycle-producer light (existing behavior, unchanged);
4. Cave glow light;
5. avatar aura light;
6. swarm aura light;
7. no light.

### Overlay rule for transfer-complete flash

If a flash is active on an entity:

- color becomes the flash color;
- alpha is the higher of base alpha and flash alpha;
- radius is the higher of base radius and flash radius.

If the entity had no base light, the flash alone still produces a point light.

### Avatar aura replacement rule

The avatar modules stop creating aura images.
The aura is now a point light only.

Preserved role mapping:

- `body_avatar` remains aura-less because its palette currently has `auraTint: null`;
- `face_avatar_body`, `face_avatar_mind`, `face_avatar_social` produce colored aura lights from `AVATAR_ROLE_PALETTES`;
- `swarm_avatar` produces the existing cyan swarm aura as light.

### Cave glow rule

The Cave gets a pulsing point light using:

- color: `cave.mind.render.eyeColor`
- radius: based on Cave display radius and `tickCtx.pulseValue`
- alpha: based on `tickCtx.pulseValue`
- blend mode: additive

No new Cave display module is introduced.
The existing `LightModule` handles the glow.

## 5.3 Vein rendering enrichment

### Why this seam

Vein visuals are already derived in two stages:

1. build normalized per-edge display data;
2. render that display data in Phaser.

That is the correct place to add taper, glow, and deterministic blob variance.

### Design

#### New edge display-data fields

Each `VeinsDisplayEdge` gains:

- `startWidthPx`
- `endWidthPx`
- `glowAlpha`
- `glowWidthStartPx`
- `glowWidthEndPx`
- `blobSizeVariance01`
- `blobSpacingVariance01`
- `blobSaturationVariance01`

The values are produced once in `veinsDisplayBuilder.ts`.
They are not recomputed in the renderer.

#### Taper rule

For each edge:

- `endWidthPx = widthPx`
- `startWidthPx = widthPx * taperMultiplier`
- `taperMultiplier` is a deterministic value in `[1.10, 1.15]` derived from the edge id

The source side is always `aId/ax/ay` and the target side is always `bId/bx/by`.
This matches the existing builder, which already writes source and target in that order.

#### Glow rule

Glow intensity must be proportional to transfer rate.
The existing direct proxy for transfer rate is `blobSpawnRateHz`, which is already computed from delivered rate.

Implementation rule:

- normalize `blobSpawnRateHz` against the highest `blobSpawnRateHz` in the current display-edge batch;
- store the normalized value as `glowAlpha` after clamping to `[0, 1]`;
- derive glow widths from the tapered widths using a fixed multiplier.

#### Hue variance rule

Hue variance is edge-level, deterministic, and slight.
It is applied in `veinDisplayColors.ts` before base and pulse colors are materialized.

Rule:

- derive a deterministic signed hue offset from edge id;
- keep offset within a small configured degree range;
- apply the same hue shift to both the base vein color and the base color used to derive pulse tint.

#### Blob variance rule

Blob variance is deterministic per edge and blob ordinal.
No random runtime mutation is allowed.

For blob ordinal `n` on edge `edge.id`, derive three multipliers from stable hashes:

- size multiplier
- spacing multiplier
- saturation multiplier

All three are centered at 1 and constrained by small config amplitudes.

This means:

- two runs with the same seed and command sequence produce the same blobs;
- blobs still look slightly organic.

#### Rendering rule

The existing constant-width line drawer is replaced for veins only.
The line becomes a filled tapered ribbon.

The renderer must draw, in order:

1. glow ribbon
2. base vein ribbon
3. pulse container masked by the same tapered path

The pulse mask must match the tapered path so blobs do not spill outside the taper.

## 5.4 Cave eye motion

### Why this seam

The Cave eye renderer already supports moving eye positions through `render.eyeOffsetX/Y`.
The missing piece is the producer of that render state.
That means the correct change belongs in the Cave mind render-state calculation, not in the Phaser module.

### Design

Add deterministic idle drift phases to Cave mind state and blend them with attention focus.

Rules:

- idle drift continuously moves `eyeOffsetX/Y` even when no target is focused;
- drift amplitude is small and always remains inside the existing eye travel envelope;
- when focus strength rises, target-directed eye motion dominates drift;
- pupil motion remains stronger than eye motion, but eye motion is now visible on its own.

The CaveEyes Phaser module remains a pure renderer.
It continues to consume `cave.mind.render`.

## 6. Data contract changes

## 6.1 `CaveMind` contract

Add to `cave.mind.memory`:

- `eyeDriftPhaseX: number`
- `eyeDriftPhaseY: number`

These phases are authoritative Cave render-state inputs.
They are updated only through `UPDATE_CAVE` like the rest of Cave mind.
They are not React state.

No new ECS mutation path is introduced.

## 6.2 Vein config contract

Extend `VeinConfigSchema` with the following explicit fields.

### `thickness`

- `taper_start_width_multiplier_min: number` default `1.10`
- `taper_start_width_multiplier_max: number` default `1.15`
- `glow_width_multiplier: number` default `1.60`

### `flow`

- `blob_size_variance: number` default `0.08`
- `blob_spacing_variance: number` default `0.08`

### `colors`

- `hue_variance_degrees: number` default `4`

### `heartbeats`

- `blob_saturation_variance: number` default `0.08`

Validation rules:

- all variance values are finite and within `[0, 1]`;
- `taper_start_width_multiplier_max >= taper_start_width_multiplier_min`;
- `hue_variance_degrees >= 0`.

## 6.3 Runtime visual event contract

Add a presentation-only union type:

- `spawn_gold_rings`
    - `entityId: string`
    - `x: number`
    - `y: number`
    - `radius: number`

- `kill_smoke_puff`
    - `entityId: string`
    - `x: number`
    - `y: number`
    - `radius: number`

- `transfer_completion_flash`
    - `entityId: string`
    - `resourceKey: string`
    - `totalAmount: number`

This type is not stored in ECS world state.
It exists only in the runtime-to-Phaser presentation bridge.

## 7. File-by-file changes

## 7.1 Add: `src/ui/runtime/effects/runtimeVisualEvents.ts`

### Responsibility

Define the presentation-only event union consumed by Phaser.

### Logic

No logic.
This file is type-only.

### Interface

Exports:

- `RuntimeVisualEvent`
- `RuntimeVisualEventKind`

No runtime dependencies.

## 7.2 Add: `src/ui/runtime/effects/runtimeVisualEffectsStore.ts`

### Responsibility

Hold pending presentation events between runtime command application and Phaser scene consumption.

### Logic

- append ordered batches;
- return and clear all events on consume;
- preserve event order exactly as produced.

### Interface

Exports a store with exactly:

- `enqueueBatch(events: RuntimeVisualEvent[]): void`
- `consumeAll(): RuntimeVisualEvent[]`
- `clear(): void`

No dedupe.
No throttling.
No event transformation.

## 7.3 Add: `src/ui/runtime/effects/resolveRuntimeVisualEffects.ts`

### Responsibility

Translate applied runtime commands plus previous/current snapshots into `RuntimeVisualEvent[]`.

### Logic

- derive non-transfer spawn positions from successful `SPAWN` results in `currentSnapshot`;
- derive non-transfer kill positions from `KILL` targets in `previousSnapshot`;
- derive transfer-complete flashes from `RESOLVE_TRANSFER` and immediate `TRANSFER_ASSETS`.

Rules:

- only emit spawn/kill effects for entities that have a physics body;
- never emit spawn/kill effects for transfer entities;
- never emit transfer flash without a resolved receiver id and resource key.

### Interface

Exports:

- `resolveRuntimeVisualEffects(commands, previousSnapshot, currentSnapshot): RuntimeVisualEvent[]`

It is pure.
It does not touch stores directly.

## 7.4 Change: `src/ui/runtime/state/runtimeFactory.ts`

### Responsibility

Continue to build the runtime and remain the single place where the UI-side telemetry adapter is assembled.

### Logic change

After the existing notification/cinematic work inside `onCommandsApplied(...)`, compute visual events and enqueue them into `runtimeVisualEffectsStore`.

Ordering requirement:

1. existing cinematic evaluation
2. existing notification evaluation
3. existing runtime notification events
4. new visual effect derivation and enqueue

This ordering preserves current behavior and adds the new queue without changing semantics.

### Interface

No public API change.
Only internal telemetry callback logic changes.

## 7.5 Change: `src/ui/runtime/world/context/WorldInteractionContext.tsx`

### Responsibility

Continue to provide world-facing scene dependencies.

### Logic change

None.

### Interface change

Add optional field:

- `consumeRuntimeVisualEffects?: () => RuntimeVisualEvent[]`

This is dependency injection only.
It is not app state.

## 7.6 Change: `src/ui/runtime/world/context/GameWorldAdapter.tsx`

### Responsibility

Bind runtime-store state into `WorldInteractionContext`.

### Logic change

Provide `consumeRuntimeVisualEffects` from `runtimeVisualEffectsStore`.

### Interface

No prop change.
Context value extends with the new callback.

## 7.7 Change: `src/engine/phaser/hooks/usePhaserGame.ts`

### Responsibility

Create the Phaser game and wire React-side dependencies into `GameScene`.

### Logic change

Pass the new `consumeRuntimeVisualEffects` dependency into `GameScene`.

### Interface

No external hook signature change.
Only the internal `GameScene` constructor payload changes.

## 7.8 Change: `src/engine/phaser/scenes/GameScene.ts`

### Responsibility

Own the Phaser scene lifecycle and per-frame update loop.

### Logic change

- accept `consumeRuntimeVisualEffects` in `GameSceneParams`;
- create and own a runtime visual-effects manager;
- on every `update(...)`, drain pending events and forward them to the manager before display tick;
- destroy the manager on scene shutdown.

Ordering requirement inside `update(...)`:

1. attach runtime if needed
2. update camera
3. update veins/background
4. consume pending runtime visual events
5. tick display manager
6. publish debug snapshot

This ensures that transfer-complete flashes are available to `LightModule` in the same frame as the next display tick.

### Interface

Add `consumeRuntimeVisualEffects?: () => RuntimeVisualEvent[]` to `GameSceneParams`.

## 7.9 Add: `src/engine/phaser/effects/RuntimeVisualEffectsManager.ts`

### Responsibility

Consume presentation events and materialize them into Phaser one-shot effects and temporary light overlays.

### Logic

Maintain two responsibilities only:

1. one-shot world effects
    - spawn gold rings
    - kill smoke puff

2. temporary light overlays for transfer-complete flashes

#### Spawn gold rings

- use `graphicsPool` from `pools.get("runtime_effects")`;
- render three additive gold rings in `LayerId.EffectsGlobal`;
- stagger them in time;
- each ring expands and fades, then returns to pool.

#### Kill smoke puff

- create a one-shot particle emitter in `LayerId.EffectsGlobal`;
- use a circle texture from `TextureManager.getShapeTexture(...)`;
- gray-to-transparent alpha fade;
- destroy emitter on completion.

#### Transfer-complete flash

Store active flashes keyed by entity id.
Each entry contains:

- `color: string`
- `alpha: number`
- `radiusMultiplier: number`
- `endTimeMs: number`

Flash intensity derives from transferred amount using the same logarithmic shape as transfer scaling.
The flash duration is a local constant in this manager.

### Interface

Exports a class with:

- `consume(events: RuntimeVisualEvent[], runtime: Runtime | null, nowMs: number): void`
- `readTransferFlash(entityId: string, nowMs: number): { color: string; alpha: number; radiusMultiplier: number } | null`
- `destroy(): void`

No ECS access.
No command emission.
No React dependencies.

## 7.10 Change: `src/engine/phaser/scenes/GameSceneDisplayInit.ts`

### Responsibility

Create the Phaser display subsystem.

### Logic change

Create the `RuntimeVisualEffectsManager` and pass it into the display manager deps.

### Interface

`GameDisplaySystem` gains:

- `runtimeVisualEffects: RuntimeVisualEffectsManager`

## 7.11 Change: `src/engine/phaser/display/DisplayInstanceManager.types.ts`

### Responsibility

Define the dependency contract for the display manager.

### Logic change

None.

### Interface change

Add:

- `runtimeVisualEffects: RuntimeVisualEffectsManager`

## 7.12 Change: `src/engine/phaser/display/DisplayDefinitionCatalog.ts`

### Responsibility

Define display-key to module-stack composition.

### Logic change

Add `LightModule` to these stacks:

- `avatarStack`
- `faceAvatarStack`
- `swarmStack`
- `caveStack`

Stack order requirement:

- `TransformModule` remains first;
- `LightModule` is inserted immediately after `TransformModule`;
- existing render modules remain otherwise unchanged.

This ensures light position follows transform and exists behind the rest of the visuals.

### Interface

No external API change.
Only module-stack composition changes.

## 7.13 Change: `src/engine/phaser/display/modules/LightModule.ts`

### Responsibility

Own the Phaser point-light instance for an entity display instance.

### Logic change

`tick(...)` must resolve light state using full tick context and runtime visual effects, not just `(entity, radius)`.

The module still owns exactly one point light instance.
It still creates lazily.
It still hides when no light state is available.

### Interface

Internal resolver call changes from:

- `resolveLightState(entity, radius)`

to:

- `resolveLightState(tickCtx, runtimeVisualEffects)`

No change to the module factory interface.

## 7.14 Change: `src/engine/phaser/display/modules/lightModuleState.ts`

### Responsibility

Centralize light-state derivation.

### Logic change

Preserve existing producer and pretty-transfer light behavior, then add:

- transfer-complete flash overlay lookup;
- Cave glow state resolution;
- face-avatar aura light resolution;
- swarm-avatar aura light resolution.

Exact rules:

#### Pretty transfer entities

Unchanged.
Continue to use `render.light` and quantity-scaled radius.

#### Cycle producers

Unchanged.
Continue current resource-color selection and radius scaling.

#### Cave

If `spec.display_key === "cave_level"` and entity has `cave.mind.render`, return additive point light using Cave eye color and pulse value.

#### Face avatars

If display key maps to a role whose palette has `auraTint`, return additive point light using that tint and a pulse-modulated radius/alpha derived from the existing avatar aura constants.

#### Swarm avatar

Return additive point light using `AVATAR_SWARM_AURA_TINT` and the existing swarm aura scale/alpha constants.

#### Transfer-complete overlay

If `runtimeVisualEffects.readTransferFlash(...)` returns an active flash, merge it on top of the base light state.

### Interface

Export signature changes to accept full tick context and runtime visual-effects access.

## 7.15 Change: `src/engine/phaser/display/modules/AvatarModule.ts`

### Responsibility

Render the non-swarm avatar stack: glow, silhouette, eyes.

### Logic change

Remove all aura-image creation, ticking, and destroy logic.
The module no longer requests face aura textures.

### Interface

The module runtime still renders the same non-aura image layers.
No public signature change.

## 7.16 Change: `src/engine/phaser/display/modules/SwarmAvatarModule.ts`

### Responsibility

Render swarm member images only.

### Logic change

Remove aura-image creation and ticking.
Swarm aura is now fully handled by `LightModule`.

### Interface

No public signature change.

## 7.17 Change: `src/engine/phaser/display/modules/avatarStackRender.ts`

### Responsibility

Shared image-render helpers for avatar stacks.

### Logic change

Remove `renderAvatarAura(...)` and related aura-specific type definitions.
Keep only the helpers still required for glow/silhouette/eyes.

### Interface

Deleted exports:

- `AvatarAuraStyle`
- `renderAvatarAura(...)`

All remaining exports remain unchanged.

## 7.18 Change: `src/engine/phaser/utils/TextureManager.ts`

### Responsibility

Own generated texture access.

### Logic change

Remove face/swarm aura texture getters because they are no longer used.

### Interface

Delete:

- `getAvatarFaceAuraTexture()`
- `getAvatarSwarmAuraTexture()`

All remaining getters remain unchanged.

## 7.19 Remove: `src/engine/phaser/display/avatar/AvatarAuraTextureGen.ts`

### Responsibility before removal

Generated the old aura textures.

### Removal rule

Delete the file because the texture-based aura is no longer part of the display contract.
This is direct scope work, not speculative cleanup.

## 7.20 Change: `src/data/schemas/game/caveMind.ts`

### Responsibility

Define the Cave mind data contract.

### Logic change

Add `eyeDriftPhaseX` and `eyeDriftPhaseY` to `memory` with numeric defaults.

### Interface

The authoritative Cave mind schema grows by two memory fields only.
No unrelated field changes.

## 7.21 Change: `src/game/systems/cave/CaveMindConfig.ts`

### Responsibility

Hold deterministic Cave mind tuning constants.

### Logic change

Add explicit drift tuning constants:

- `eyeDriftTravel`
- `eyeDriftStepX`
- `eyeDriftStepY`

Retain the existing focus and pupil travel constants.
Do not change attention/emotion thresholds.

### Interface

Config object extends only in the render subsection.

## 7.22 Change: `src/game/systems/cave/resolveCaveRenderState.ts`

### Responsibility

Produce Cave eye render state from attention, emotion, and previous Cave mind state.

### Logic change

Change the resolver to also accept the previous Cave mind memory drift phases.

The resolver must:

1. advance drift phases deterministically each system tick;
2. compute small idle drift offsets from those phases;
3. compute target-directed eye offsets from attention direction and focus strength;
4. blend drift and focus so focus dominates as `focusStrength` rises;
5. keep pupil offsets target-directed and stronger than eye offsets;
6. return both the new `render` object and the updated drift phases.

### Interface

The returned payload becomes:

- `render`
- `pulsePresetKey`
- `memoryPatch` with updated drift phases

No random source is allowed.
No direct world mutation is allowed.

## 7.23 Change: `src/game/systems/CaveMindSystem.ts`

### Responsibility

Run the Cave mind system and emit a single `UPDATE_CAVE` command.

### Logic change

Pass previous drift phases into `resolveCaveRenderState(...)` and write the returned phase updates into the outgoing `mind.memory` payload.

### Interface

No system signature change.
Still emits exactly one `UPDATE_CAVE` command per tick when the Cave mind updates.

## 7.24 Change: `src/data/schemas/assets/veins.ts`

### Responsibility

Define validated vein configuration.

### Logic change

Add the taper, glow-width, hue-variance, blob-size-variance, blob-spacing-variance, and blob-saturation-variance fields listed in section 6.2.

### Interface

`DEFAULT_VEIN_CONFIG` and `VeinConfigSchema` are extended accordingly.
No existing key is renamed or removed.

## 7.25 Change: `src/data/raw/example/modules/assets.art`

### Responsibility

Provide the canonical example module asset data.

### Logic change

Populate the new vein config keys with the default values from section 6.2.

### Interface

No structural change outside the `veins` asset block.

## 7.26 Change: `src/data/raw/game_data.json`

### Responsibility

Provide the canonical raw game data used by the app.

### Logic change

Mirror the same new `veins` config keys and values added in `assets.art`.

### Interface

No structural change outside the `assets.veins` block.

## 7.27 Change: `src/engine/phaser/display/VeinsDisplayData.ts`

### Responsibility

Define the Phaser-facing vein display-data shape.

### Logic change

Add:

- `startWidthPx`
- `endWidthPx`
- `glowAlpha`
- `glowWidthStartPx`
- `glowWidthEndPx`
- `blobSizeVariance01`
- `blobSpacingVariance01`
- `blobSaturationVariance01`

### Interface

`VeinsDisplayEdge` extends only with the new fields above.
Existing fields remain unchanged.

## 7.28 Change: `src/engine/phaser/veins/veinDisplayColors.ts`

### Responsibility

Resolve materialized display colors from vein config.

### Logic change

Accept edge id so color resolution can apply a deterministic hue offset before deriving base and pulse colors.

### Interface

Change signature from:

- `(veinType, intensity01, config)`

to:

- `(edgeId, veinType, intensity01, config)`

Return shape remains `{ baseColor, pulseColor }`.

## 7.29 Change: `src/engine/phaser/veins/colorUtils.ts`

### Responsibility

Provide HSL color helpers for vein rendering.

### Logic change

Export explicit helpers to:

- shift hue by degrees;
- scale saturation;
- materialize RGB ints after those operations.

These helpers are used by both edge-level hue variance and pulse-level saturation variance.

### Interface

Add exported pure helper functions.
Do not remove existing exports.

## 7.30 Change: `src/engine/phaser/veins/veinsDisplayBuilder.ts`

### Responsibility

Build fully resolved per-edge display data from the vein graph and config.

### Logic change

For each edge:

1. compute the current `widthPx` exactly as today;
2. compute deterministic `startWidthPx` in the 1.10–1.15 source taper range;
3. set `endWidthPx = widthPx`;
4. compute `blobSpawnRateHz` exactly as today;
5. compute batch-normalized `glowAlpha` from `blobSpawnRateHz`;
6. compute glow widths from tapered widths and `glow_width_multiplier`;
7. pass edge id into color resolution so hue variance is stable;
8. copy variance amplitudes from config onto the edge record.

### Interface

The function signature remains the same.
The returned `VeinsDisplayEdge[]` carries the extended fields.

## 7.31 Add: `src/engine/phaser/display/modules/veinsBlobVariance.ts`

### Responsibility

Resolve deterministic per-blob size, spacing, and saturation multipliers from edge id and blob ordinal.

### Logic

Use stable hashing only.
No mutable RNG.
No global state.

### Interface

Exports one pure function:

- `resolveBlobVariance(edge: VeinsDisplayEdge, ordinal: number): { sizeMultiplier: number; spacingMultiplier: number; saturationMultiplier: number; tint: number }`

The tint is derived from `edge.pulseColor` and the saturation multiplier.

## 7.32 Add: `src/engine/phaser/display/modules/veinsTaperedStroke.ts`

### Responsibility

Draw a tapered filled ribbon from a center polyline.

### Logic

Given center points and start/end widths:

- compute cumulative path distance;
- interpolate width by normalized distance;
- build left/right offset points from local normals;
- fill a closed polygon.

This helper is used for both the base ribbon and the glow ribbon.

### Interface

Exports:

- `drawTaperedRibbon(graphics, points, startWidth, endWidth, color, alpha): void`

Pure drawing helper only.

## 7.33 Change: `src/engine/phaser/display/modules/veinsModuleTypes.ts`

### Responsibility

Hold runtime visual-state types and rendering constants for vein edges.

### Logic change

Add:

- `glowLine: Phaser.GameObjects.Graphics` to `VeinEdgeVisualState`
- `ordinal: number` and `tint: number` and `scaleMultiplier: number` to `PulseInstance`
- `nextBlobOrdinal: number` to `VeinEdgeVisualState`

### Interface

Type additions only.
Existing constants remain unless renamed for clarity.

## 7.34 Change: `src/engine/phaser/display/modules/veinsEdgeState.ts`

### Responsibility

Allocate and release the per-edge Phaser objects.

### Logic change

Allocate one additional graphics object for the glow ribbon and initialize `nextBlobOrdinal`.
The pulse mask remains geometry-mask based, but the mask path is now tapered.

### Interface

No function signature change.
Returned state object includes the new fields.

## 7.35 Change: `src/engine/phaser/display/modules/veinsEdgeDrawing.ts`

### Responsibility

Own low-level vein path drawing helpers.

### Logic change

Stop drawing veins with constant-width `lineStyle(...)`.
Delegate vein ribbon drawing to `drawTaperedRibbon(...)` from the new tapered-stroke helper.

### Interface

Replace the old constant-width-only helper with tapered-ribbon-aware helpers.
No generic callers outside vein rendering are introduced.

## 7.36 Change: `src/engine/phaser/display/modules/veinsPulseLifecycle.ts`

### Responsibility

Create and release pulse images.

### Logic change

Use the per-pulse scale multiplier and tint resolved at spawn time instead of using only `edge.widthPx` and `edge.pulseColor`.

### Interface

`spawnPulse(...)` now accepts or derives a blob ordinal and stores the resulting variance fields on the pulse instance.

## 7.37 Change: `src/engine/phaser/display/modules/veinsEdgeTick.ts`

### Responsibility

Advance one edge’s revealed path, glow, base ribbon, pulses, and pulse spawning.

### Logic change

- draw glow ribbon first using glow widths and `glowAlpha`;
- draw base ribbon with `startWidthPx/endWidthPx`;
- draw the tapered mask path with the same widths;
- update existing pulses using their stored tint/scale;
- spawn pulses one-by-one using `nextBlobOrdinal` and variable spacing;
- increment `nextBlobOrdinal` only when a pulse is actually spawned.

The pulse source-gap rule remains enforced, but spacing is now cumulative and per-blob instead of one fixed spacing for the whole edge.

### Interface

No function signature change.
Internal spawn logic changes.

## 7.38 Change: `src/engine/phaser/display/modules/TransferModule.test.ts`

### Responsibility

Protect transfer visual radius behavior.

### Logic change

Add regression coverage that transfer radius remains quantity-driven.

### Interface

Test-only.

## 7.39 Change: `src/game/handlers/DispatchProxyHandler.test.ts`

### Responsibility

Protect proxy visual and physics sizing behavior.

### Logic change

Add regression coverage that proxy size remains constant and independent of transfer payload/resource concepts.

### Interface

Test-only.

## 7.40 Add: `src/engine/phaser/display/modules/LightModule.visualEffects.test.ts`

### Responsibility

Protect the expanded light-state contract.

### Logic

Covers:

- transfer-complete flash overlay on entities with no base light;
- transfer-complete flash overlay on entities with an existing base light;
- Cave light generation;
- face avatar aura light generation;
- swarm aura light generation;
- `body_avatar` remaining aura-less.

### Interface

Test-only.

## 7.41 Add: `src/ui/runtime/effects/resolveRuntimeVisualEffects.test.ts`

### Responsibility

Protect the runtime visual-event derivation contract.

### Logic

Covers:

- spawn event emitted only for successful non-transfer spawns;
- kill event emitted only for successful non-transfer kills;
- transfer flash emitted for `RESOLVE_TRANSFER` receiver;
- transfer flash emitted for immediate transfers;
- no events emitted when entity/position/resource resolution fails.

### Interface

Test-only.

## 7.42 Add: `src/engine/phaser/effects/RuntimeVisualEffectsManager.test.ts`

### Responsibility

Protect one-shot effect orchestration and flash storage.

### Logic

Covers:

- gold rings are created on spawn events;
- smoke puff is created on kill events;
- transfer flashes are stored, readable while active, and expire after duration;
- flash color precedence matches transfer visual precedence.

### Interface

Test-only.

## 7.43 Change: `src/data/schemas/assets/veins.test.ts`

### Responsibility

Protect the extended vein config schema.

### Logic

Add:

- default-value assertions for new keys;
- negative-path assertions for invalid variance ranges;
- negative-path assertion for inverted taper min/max.

### Interface

Test-only.

## 7.44 Change: `src/engine/phaser/veins/veinsDisplayBuilder.test.ts`

### Responsibility

Protect per-edge display-data derivation.

### Logic

Add assertions for:

- tapered source width range;
- stable hue variance by edge id;
- glow alpha normalization from transfer rate;
- forwarding of variance amplitudes onto display edges.

### Interface

Test-only.

## 7.45 Add: `src/engine/phaser/display/modules/veinsBlobVariance.test.ts`

### Responsibility

Protect deterministic blob variance.

### Logic

Add assertions that:

- the same edge id and ordinal always produce the same multipliers;
- different ordinals vary inside the configured bounds;
- tint changes are saturation-only and remain bounded.

### Interface

Test-only.

## 7.46 Add: `src/engine/phaser/display/modules/veinsTaperedStroke.test.ts`

### Responsibility

Protect tapered ribbon drawing math.

### Logic

Add assertions that:

- short or invalid paths hide output;
- source width is larger than target width;
- the generated polygon remains ordered and closed;
- taper interpolation is monotonic along the path.

### Interface

Test-only.

## 7.47 Change: `src/game/systems/cave/resolveCaveRenderState.test.ts` or nearest existing Cave render-state test file

### Responsibility

Protect the new Cave eye-motion contract.

### Logic

Add assertions that:

- eye offsets drift while idle;
- eye offsets bias toward target direction under focus;
- pupil offsets remain stronger than eye offsets;
- drift phases advance deterministically.

### Interface

Test-only.

## 7.48 Change: `src/engine/phaser/display/modules/SwarmAvatarModule.test.ts`

### Responsibility

Protect the removal of texture-based swarm aura.

### Logic

Update expectations so the module no longer requests aura textures or owns an aura image.
The visible swarm members remain unchanged.

### Interface

Test-only.

## 7.49 Add: `src/engine/phaser/display/modules/AvatarModule.test.ts`

### Responsibility

Protect the removal of texture-based face aura.

### Logic

Assert that the module renders only glow/silhouette/eyes and no longer depends on aura textures.

### Interface

Test-only.

## 8. Detailed behavior contracts

## 8.1 Transfer-complete flash contract

- flash begins in the same frame that the scene drains the corresponding visual event;
- flash is keyed by receiver entity id;
- a new flash for the same entity replaces the older flash if it has the same frame timestamp, otherwise it refreshes end time and uses the stronger intensity;
- if the receiver disappears before the flash ends, the flash simply becomes unreadable because no display instance asks for it;
- no ECS data is written for this effect.

## 8.2 Spawn gold-ring contract

- only non-transfer entities with physics bodies receive the effect;
- effect origin is the spawned entity physics position from `currentSnapshot`;
- three rings expand outward, fade out, and self-clean;
- rings use additive blend and gold tint;
- effect never blocks selection, dragging, or display module updates.

## 8.3 Kill smoke-puff contract

- only non-transfer entities with physics bodies receive the effect;
- effect origin is the killed entity physics position from `previousSnapshot`;
- the effect is one-shot and self-cleaning;
- no attempt is made to persist or replay the effect across scene recreation.

## 8.4 Vein taper contract

For every display edge:

- source end is always wider than target end;
- source taper multiplier is deterministic per edge id;
- target end width equals the existing width that current tests and balance already derive.

## 8.5 Cave eye contract

- eye drift exists even at zero focus strength;
- eye drift never exceeds the configured eye-travel limit;
- focus increases eye movement toward the target direction;
- pupil motion continues to lead eye motion;
- blinking behavior remains intact.

## 9. Test plan by layer

## 9.1 Unit tests

Target files:

- `resolveRuntimeVisualEffects.ts`
- `RuntimeVisualEffectsManager.ts`
- `lightModuleState.ts`
- `veinsBlobVariance.ts`
- `veinsTaperedStroke.ts`
- `veinDisplayColors.ts`
- `veins.ts`
- `resolveCaveRenderState.ts`

Required cases:

- happy path;
- negative path;
- edge/boundary path.

All tests are pure or in-memory.
No DOM.
No mocked ECS world for vein/Cave logic.

## 9.2 Integration tests

Target areas:

- runtime command application to visual-event derivation;
- transfer-complete flash derivation from `RESOLVE_TRANSFER` and immediate `TRANSFER_ASSETS`;
- Cave mind update command carrying drift-phase memory;
- vein display builder producing enriched edge records from real config.

Rules:

- use real snapshots/world fixtures;
- do not mock the runtime world for runtime command integration;
- assert externally visible outcomes only.

## 9.3 View/Phaser tests

Target areas:

- `LightModule`
- `AvatarModule`
- `SwarmAvatarModule`
- vein edge tick/render
- scene visual effects manager

Rules:

- verify visible configuration/wiring, not internals;
- assert the correct Phaser objects are created, tinted, scaled, and cleaned up;
- do not move business logic into view tests.

## 10. Rollout order

1. Add runtime visual-event types/store/helper and wire them through runtime factory and scene context.
2. Add runtime visual-effects manager and scene wiring.
3. Expand LightModule and add it to Cave and avatar stacks.
4. Remove texture-based avatar aura implementation.
5. Extend Cave mind data/config/render-state logic for eye drift.
6. Extend vein config/data builder types.
7. Implement tapered vein drawing, glow, and deterministic blob variance.
8. Update raw data defaults.
9. Add and update all tests.

This order minimizes breakage because:

- the event pipeline lands before light consumers depend on it;
- LightModule expansion lands before aura removal;
- vein data changes land before renderer changes depend on them.

## 11. Acceptance criteria

The phase is complete only when all of the following are true:

- transfer-complete flashes occur on the receiver node and are driven by `LightModule`;
- immediate transfers also flash the receiver;
- transfer color/size and proxy size behavior remain unchanged from current contracts;
- non-transfer spawns show spreading gold rings;
- non-transfer kills show a smoke puff;
- veins visibly taper from source to target with deterministic 10%–15% source widening;
- veins have visible glow proportional to transfer rate;
- vein hue varies slightly by edge;
- vein blob size, spacing, and saturation vary slightly but deterministically;
- the Cave has a pulsing light glow behind it;
- avatar aura textures are gone and aura is provided by `LightModule` where the current palette allows it;
- Cave eyes drift visibly even while idle and bias toward focused targets;
- all updated and added tests are green;
- no architectural law from the canonical project documents is violated.
