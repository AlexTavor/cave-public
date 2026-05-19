# LLD — Body Death Screen Shake + Purge Red Background Pulse

## 1. Purpose

This document defines the implementation design for two visual changes:

1. **Screen shake when a body dies**
2. **Red pulsing tint on the darker biological-fog background layer while Purge is active**

This design is grounded in the current codebase and project contracts. It reuses existing runtime observation, effect routing, Phaser rendering, and background pulse mechanisms. It does **not** introduce new gameplay state, new React-owned state, or a parallel effect system.

---

## 2. Why

### 2.1 Body death screen shake
The codebase already has a post-apply observation point for runtime events and a dedicated visual-effects pipeline:

- applied-command observation in `ui/runtime/state/runtimeFactory.ts`
- semantic visual-effect resolution in `ui/runtime/effects/resolveRuntimeVisualEffects.ts`
- queueing in `ui/runtime/effects/runtimeVisualEffectsStore.ts`
- Phaser-side execution in `engine/phaser/effects/RuntimeVisualEffectsManager.ts`

The screen shake must be added to this existing path so that:

- the simulation remains deterministic
- the ECS world stays the single source of truth
- React does not inspect or mutate simulation state
- camera-side visual behavior remains localized to Phaser

### 2.2 Purge red background pulse
The background already has a single pulse input:

- `GameScene.update(...)` reads `pulse01` from `VeinsSystem`
- `BiologicalFogBackground.update(runtime, pulse01)` receives that pulse
- `resolveBiologicalFogUniforms(...)` maps semantic inputs into background color uniforms

The red Purge effect must reuse this same pulse. It must not introduce a second pulse source, a React overlay, or a second background effect layer. The existing runtime already exposes Purge state at `sys_world.cave.purge.isActive`, so no new gameplay/UI flag is required.

---

## 3. What

### 3.1 Feature A — body death screen shake
Behavior contract:

- A body death triggers **one** camera shake effect for the applied command batch in which the death occurred.
- Multiple body deaths in the same applied batch trigger **one** shake only.
- Non-body kills do **not** trigger shake.
- Existing kill smoke puff behavior remains unchanged.
- The shake is executed on the Phaser main camera.

Scope contract:

- The shake is derived from `RuntimeCommandType.KILL` commands whose target entity is a body in the **previous snapshot**.
- This includes ordinary body kills, starvation kills, and purge kills because they already flow through `KILL`.
- This change does **not** extend shake behavior to `ABSORB_BATCH` or other non-`KILL` removal flows.

### 3.2 Feature B — Purge red background pulse
Behavior contract:

- While `sys_world.cave.purge.isActive` is `true`, the **darker** biological-fog layer flashes red.
- The **same existing** `pulse01` input drives the flash.
- Only the darker/base layer changes; the lighter/lift layer remains unchanged.
- When Purge is inactive, the background exactly matches authored colors.

Color contract:

- The darker/base color is the existing `base_color` path.
- During Purge, the effective base color is `lerp(authoredBaseColor, pureRed, clamp(pulse01, 0, 1))`.
- The lift color remains the authored `lift_color`.
- No shader pulse duplication is introduced.

---

## 4. How

## 4.1 Architecture decisions

### Decision 1 — reuse the existing runtime visual-effects path for death shake
Accepted.

Reason:

- `runtimeFactory.ts` already observes applied commands after the Apply phase.
- `resolveRuntimeVisualEffects.ts` is already the semantic resolver for non-UI runtime visuals.
- `RuntimeVisualEffectsManager.ts` already owns Phaser-side execution of runtime effects.

### Decision 2 — reuse the existing biological-fog pulse and Purge runtime state
Accepted.

Reason:

- `BiologicalFogBackground.update(runtime, pulse01)` already receives the only pulse needed.
- `sys_world.cave.purge.isActive` already exists in runtime state.
- The darker/lighter split already maps directly to `baseColor` / `liftColor` in `resolveBiologicalFogUniforms(...)`.

### Decision 3 — do not add a React overlay for Purge
Accepted.

Reason:

- The requirement is explicitly about the existing background composition.
- The background is already implemented in Phaser shader/background code.
- The effect belongs in the background pipeline, not in React.

### Decision 4 — do not add a second debounce window for camera shake
Accepted.

Reason:

- The request is satisfied by **batch-scoped coalescing** in `resolveRuntimeVisualEffects.ts`.
- That uses the same applied-command batch already delivered by `runtimeFactory.ts`.
- It avoids speculative extra timing state.

---

## 5. Detailed file design

## 5.1 Changed file — `ui/runtime/effects/runtimeVisualEvents.ts`

### Responsibility
Define the complete runtime-visual event union consumed by `RuntimeVisualEffectsManager`.

### Logic
Extend the event union with a new non-world-space event kind for camera shake caused by body death.

The new event kind is semantic and batch-level. It does not carry entity coordinates because the camera is the receiver.

### Interface
Existing exported union remains the single source of truth for runtime visual event shapes.

Add:

- `kind: "body_death_camera_shake"`

No positional fields are attached to this new event kind.

### Contract
- Existing event kinds remain unchanged.
- Existing world-space event interfaces remain unchanged.
- Consumers must branch by `kind`.

---

## 5.2 Changed file — `ui/runtime/effects/resolveRuntimeVisualEffects.ts`

### Responsibility
Resolve semantic runtime visual events from an applied command batch and adjacent snapshots.

### Logic
Keep existing behavior intact:

- spawn ring effects for spawned entities tagged `anim:spawn`
- kill smoke puff effects for killed entities tagged `anim:kill`

Add one new resolver path:

#### `resolveBodyDeathCameraShake(...)`
Inputs:

- `commands`
- `previousSnapshot`

Resolution rule:

1. Iterate the applied command batch.
2. Consider only commands with `type === RuntimeCommandType.KILL`.
3. For each such command, read the target entity from `previousSnapshot`.
4. Use the existing `isBodyEntity(...)` helper from `ui/runtime/notifications/resolveRuntimeNotificationEvents.helpers.ts` to determine whether the killed entity is a body.
5. If at least one body kill is found, emit exactly one runtime visual event:
   - `kind: "body_death_camera_shake"`
6. If no body kill is found, emit nothing.

Ordering rule:

- Existing spawn and smoke-puff events remain in their current order.
- The body-death camera-shake event may appear once in the returned array.
- The returned array remains a flat list of semantic effect events.

### Interface
The public function signature remains unchanged:

- `resolveRuntimeVisualEffects(commands, previousSnapshot, currentSnapshot): RuntimeVisualEvent[]`

### Contract
- One batch with N body `KILL` commands yields one shake event.
- One batch with only non-body `KILL` commands yields no shake event.
- Existing smoke-puff emission remains unchanged.
- Existing spawn-ring emission remains unchanged.
- No React state or Phaser APIs are touched here.

---

## 5.3 Changed file — `engine/phaser/effects/RuntimeVisualEffectsManager.ts`

### Responsibility
Consume semantic runtime visual events and execute them against Phaser rendering/camera systems.

### Logic
Keep existing responsibilities intact:

- consume burst events
- manage persistent attention rings

Extend `consumeBursts(events)` with a new branch for `body_death_camera_shake`.

Execution rule:

1. Scan the incoming `events` array for the new shake event kind.
2. If one or more such events are present in the same consume call, invoke the Phaser main camera shake exactly once.
3. Ignore additional shake events in the same consume call.
4. Continue processing existing burst events exactly as before.

Tuning rule:

- Duration and intensity are internal, file-local constants in this manager.
- They are not part of any runtime schema, UI store, or external interface.

### Interface
Public interface remains unchanged:

- `consume(events, runtime, nowMs, selectedEntityId?)`
- `destroy()`

No caller changes are required.

### Contract
- Consuming one or more `body_death_camera_shake` events in a single call causes one camera shake.
- Persistent attention behavior remains unchanged.
- Spawn-ring and smoke-puff behavior remain unchanged.
- No new store or queue is introduced.

---

## 5.4 Changed file — `engine/phaser/background/BiologicalFogBackground.ts`

### Responsibility
Bridge runtime/background semantic state into biological-fog uniform resolution and shader application.

### Logic
Keep existing responsibilities intact:

- parse authored background config from runtime cartridge assets
- compute camera-scoped shader inputs
- apply resolved fog uniforms to the shader object

Extend `update(runtime, pulse01)` to read Purge activity from runtime world state:

- read `runtime.getEntity("sys_world")`
- resolve `purgeActive = Boolean(world?.cave?.purge?.isActive)`
- pass `purgeActive` into `resolveBiologicalFogUniforms(...)`

No other state is read or cached.

### Interface
Public interface remains unchanged:

- `update(runtime, pulse01): void`
- `destroy(): void`

Only the internal call into `resolveBiologicalFogUniforms(...)` gains one additional input field.

### Contract
- When Purge is inactive, behavior is unchanged.
- When Purge is active, the resolver receives the active flag and uses the existing pulse input.
- No React-side flag or store is introduced.

---

## 5.5 Changed file — `engine/phaser/background/resolveBiologicalFogUniforms.ts`

### Responsibility
Map authored background config, camera state, time, and pulse into the serializable fog uniform model used by the biological-fog background.

### Logic
Keep existing responsibilities intact:

- clamp `pulse01`
- normalize authored hex colors
- compute resolution/camera values
- map authored background config fields to uniform fields

Extend the resolver input with:

- `purgeActive: boolean`

Color resolution rule:

1. Resolve `authoredBaseColor` from `config.base_color`.
2. Resolve `authoredLiftColor` from `config.lift_color`.
3. Clamp `pulse01` to `[0, 1]`.
4. If `purgeActive` is `false`, output `baseColor = authoredBaseColor`.
5. If `purgeActive` is `true`, output:
   - `baseColor = lerp(authoredBaseColor, [1, 0, 0], clampedPulse01)`
6. Output `liftColor = authoredLiftColor` regardless of Purge state.

No new shader uniform is introduced. The existing `baseColor` path is reused.

### Interface
Change the resolver input shape only.

New required input field:

- `purgeActive: boolean`

The returned `BiologicalFogUniforms` shape remains unchanged.

### Contract
- Invalid authored hex colors still fail loudly.
- `pulse01` remains clamped exactly once here.
- Purge affects only `baseColor`.
- Purge never alters `liftColor`.
- No shader-source change is required.

---

## 6. Files intentionally unchanged

The following files are intentionally **not** changed.

### `ui/runtime/state/runtimeFactory.ts`
Reason:

- It already routes resolved runtime visual effects into `runtimeVisualEffectsStore`.
- No new observer hook is needed.

### `ui/runtime/effects/runtimeVisualEffectsStore.ts`
Reason:

- The existing queue semantics are sufficient.
- Batch coalescing is performed in `resolveRuntimeVisualEffects.ts`, not in the store.

### `engine/phaser/scenes/GameScene.ts`
Reason:

- It already provides `pulse01` to the background system.
- It already feeds visual effect events into `RuntimeVisualEffectsManager.consume(...)`.

### `engine/phaser/background/applyBiologicalFogUniforms.ts`
Reason:

- The returned uniform shape is unchanged.
- Existing base/lift uniform plumbing is sufficient.

### `engine/phaser/background/biologicalFogShaderSource.ts`
Reason:

- The effect is achieved by altering `baseColor` before uniform application.
- No new shader uniform and no fragment-shader logic are required.

### `data/schemas/game/cave.ts`
Reason:

- `purge.isActive` already exists and is sufficient.

### `ui/runtime/notifications/resolveRuntimeNotificationEvents.helpers.ts`
Reason:

- `isBodyEntity(...)` already exists and is already used by adjacent runtime-notification/effect code.
- The helper is reused as-is.

---

## 7. Test design

Testing must follow the project testing contract:

- logic in unit tests
- integration at runtime command/snapshot boundaries
- no UI logic in Phaser/render tests
- Given / When / Then structure

## 7.1 Changed file — `engine/phaser/background/resolveBiologicalFogUniforms.test.ts`

### Responsibility
Verify pure uniform-resolution behavior.

### Add tests

#### Test: returns authored colors when Purge is inactive
Given:

- valid authored background config
- `purgeActive = false`
- a non-zero `pulse01`

When:

- resolving uniforms

Then:

- `baseColor` equals the authored normalized base color
- `liftColor` equals the authored normalized lift color

#### Test: tints only baseColor toward red when Purge is active
Given:

- valid authored background config
- `purgeActive = true`
- `pulse01 > 0`

When:

- resolving uniforms

Then:

- `baseColor` is the red-interpolated value
- `liftColor` is unchanged from authored lift color

#### Existing invalid-color test
Remains and must continue to pass unchanged.

---

## 7.2 Changed file — `engine/phaser/background/BiologicalFogBackground.test.ts`

### Responsibility
Verify runtime-to-background wiring.

### Add tests

#### Test: uses Purge state from world entity when resolving base color
Given:

- a runtime whose `sys_world.cave.purge.isActive` is `true`
- background config enabled
- a known pulse value

When:

- `update(runtime, pulse01)` is called

Then:

- the shader receives a red-shifted `uBaseColor`
- the shader remains visible

#### Test: unchanged behavior when Purge is inactive
Given:

- identical runtime except `purge.isActive = false`

When:

- `update(runtime, pulse01)` is called

Then:

- the shader receives the authored base color

Existing resize/destroy assertions remain unchanged.

---

## 7.3 Changed file — `ui/runtime/effects/resolveRuntimeVisualEffects.test.ts`

### Responsibility
Verify pure event-resolution behavior for runtime visual effects.

### Add tests

#### Test: emits one body-death camera shake for one body kill
Given:

- previous snapshot contains one body entity
- commands contain one `KILL` targeting that body

When:

- resolving runtime visual effects

Then:

- the returned effects contain exactly one `body_death_camera_shake`

#### Test: emits one body-death camera shake for multiple body kills in one batch
Given:

- previous snapshot contains multiple body entities
- commands contain multiple `KILL` commands targeting those bodies

When:

- resolving runtime visual effects

Then:

- the returned effects contain exactly one `body_death_camera_shake`

#### Test: does not emit camera shake for non-body kills
Given:

- previous snapshot contains a non-body entity
- commands contain `KILL` targeting that non-body entity

When:

- resolving runtime visual effects

Then:

- no `body_death_camera_shake` event is returned

Existing spawn-ring and smoke-puff tests remain and must continue to pass.

---

## 7.4 Added file — `engine/phaser/effects/RuntimeVisualEffectsManager.deathShake.test.ts`

### Responsibility
Verify Phaser-side execution of the new shake event without mixing concerns into the attention test file.

### Logic under test
- one or more body-death shake events in a single consume call produce one camera shake call
- absence of the event produces no camera shake call
- existing burst behavior remains unaffected

### Test interface
Use a mocked scene with:

- `cameras.main.shake` spy

### Required tests

#### Test: triggers one camera shake when one shake event is consumed
Given:

- one `body_death_camera_shake` event

When:

- manager consumes the event batch

Then:

- `scene.cameras.main.shake` is called once

#### Test: triggers one camera shake when multiple shake events are consumed in one call
Given:

- multiple `body_death_camera_shake` events in the same array

When:

- manager consumes the event batch

Then:

- `scene.cameras.main.shake` is called once

#### Test: keeps existing burst handling intact
Given:

- existing burst events and one shake event in the same batch

When:

- manager consumes the event batch

Then:

- burst helpers are still invoked
- camera shake is still invoked once

---

## 8. Pseudocode summaries

## 8.1 Body death shake resolution

- For each applied command in the batch:
  - if command type is not `KILL`, skip
  - read the killed entity from `previousSnapshot`
  - if the entity is not a body, skip
  - mark `hasBodyDeath = true`
- After the scan:
  - if `hasBodyDeath`, append one `body_death_camera_shake` event
- Return the existing spawn effects, existing kill smoke-puff effects, and the optional shake event

## 8.2 Purge red background pulse

- Read authored base and lift colors
- Clamp `pulse01`
- Read `purgeActive` from `sys_world.cave.purge.isActive`
- If Purge is inactive:
  - output authored base color unchanged
- If Purge is active:
  - output `baseColor = lerp(authoredBaseColor, pureRed, clampedPulse01)`
- Output authored lift color unchanged
- Apply uniforms through the existing background uniform application path

---

## 9. Acceptance criteria

The implementation is complete only when all of the following are true:

1. A body `KILL` command batch produces one camera shake, regardless of how many bodies were killed in that batch.
2. Non-body kills do not shake the camera.
3. Existing kill smoke-puff behavior still works.
4. Existing spawn-ring behavior still works.
5. While Purge is active, the darker biological-fog layer pulses red using the existing pulse input.
6. The lighter biological-fog layer remains authored and unchanged during Purge.
7. When Purge ends, authored base and lift colors are restored automatically with no residual tint state.
8. No new React state, no new runtime schema, and no new background pulse source are introduced.
9. All updated and added tests pass.

