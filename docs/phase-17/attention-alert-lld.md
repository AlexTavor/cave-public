# LLD — Persistent Attention Alert Rings + Cycle Toggle (Revised)

## Status
Proposed implementation design.

## Source Basis
This design is derived from the current code paths in the uploaded source tree and the supplied contract documents.
The implementation described below is constrained to the mechanisms already present in these files:

- `src/engine/phaser/effects/RuntimeVisualEffectsManager.ts`
- `src/engine/phaser/effects/runtimeVisualEffectBursts.ts`
- `src/engine/phaser/scenes/GameScene.ts`
- `src/ui/runtime/effects/runtimeVisualEvents.ts`
- `src/ui/runtime/effects/resolveRuntimeVisualEffects.ts`
- `src/data/schemas/abilities/cycle.ts`
- `src/ui/devtools/editors/blueprint/mode/abilityDrafts.ts`
- `src/ui/devtools/editors/blueprint/mode/forms/CycleAbilityForm.constants.ts`
- `src/ui/devtools/editors/blueprint/mode/forms/CycleAbilityForm.tsx`
- `src/engine/compiler/abilities/cycleCompiler.ts`
- `src/ui/runtime/world/selection/usePowerSinkThrottle.ts`
- `src/engine/runtime/handlers/UpdatePowerSinkHandler.ts`
- `src/engine/runtime/handlers/UpdateStateHandler.ts`
- `src/data/schemas/components/powerSink.ts`
- `src/engine/runtime/types/runtimeCommandTypes.ts`
- `src/engine/compiler/abilities/cycleCompiler.startActive.test.ts`
- `src/ui/devtools/editors/blueprint/mode/CycleAbilityForm.test.tsx`
- `/mnt/data/context-pack.md`
- `/mnt/data/prompt-contract.md`
- `/mnt/data/testing-standards.md`

No part of this design depends on `VeinsSystem`.
The revised stop condition is based on `powerSink.throttle`, because that state is owned by the entity itself, is compiled by Cycle, and is already mutated through the existing runtime command pipeline.

---

## 1. Why

The existing ring effect is burst-only. `resolveRuntimeVisualEffects(...)` emits one-frame `RuntimeVisualEvent`s, and `RuntimeVisualEffectsManager.consume(...)` immediately turns those into `spawnGoldRings(...)` tweens. That path is correct for spawn feedback and must remain unchanged, but it does not support a persistent “show until told to stop” indicator because the event is consumed and forgotten.

The requested feature has two requirements that are not satisfied by the existing burst path:

1. A caller must be able to start and stop the same attention rings for an arbitrary node at runtime.
2. Cycle must optionally keep those rings visible until the node is considered connected.

For this codebase, the correct ownership signal for the stop condition is `powerSink.throttle`, not Veins. The reasons are structural, not stylistic:

- `cycleCompiler.ts` always creates a `powerSink` for Cycle entities and initializes `throttle` from `startActive`.
- `usePowerSinkThrottle.ts` already treats `throttle` as the runtime control surface for turning the node on and off.
- `UpdatePowerSinkHandler.ts` is the existing authoritative mutation path for that state.
- `VeinsSystem` is Phaser-side derived presentation state, rebuilt each frame, and is not the entity’s owned state.

Therefore the design uses `throttle` as the contract for “connected” for this feature.
This is the smallest change that is consistent with the existing runtime architecture.

---

## 2. What

## 2.1 Functional Requirements

The implementation must provide all of the following:

1. A node can enter a persistent attention-alert state by command.
2. A node can leave that persistent attention-alert state by command.
3. The persistent alert uses the same visual ring look as the existing spawn rings.
4. Cycle gains a new authored toggle named `showAttentionUntilConnected`.
5. That toggle defaults to `false`.
6. When the toggle is `true`, the node shows the attention rings while its own `powerSink.throttle` is not greater than zero.
7. Manual attention is independent of the Cycle toggle and stays visible until explicitly stopped.
8. Existing spawn-ring behavior remains unchanged.

## 2.2 Precise Semantics

### 2.2.1 Manual Attention

Manual attention is a persistent runtime flag owned by the entity’s hidden state.
It is controlled only by explicit runtime commands.

- Manual attention on: the rings must render.
- Manual attention off: the rings must not render unless another contract path requires them.

### 2.2.2 “Connected” for This Feature

For this feature only, `connected` is defined exactly as:

- `connected = powerSink.throttle > 0`

Normalization rules:

- finite numeric throttle greater than `0` => connected
- finite numeric throttle less than or equal to `0` => not connected
- missing or non-finite throttle => invalid authored state for this feature

This definition is not inferred from Veins, energy flow, or graph topology.
It is derived only from the entity’s own `powerSink.throttle` value.

### 2.2.3 Cycle Toggle Semantics

`showAttentionUntilConnected` means:

- if the toggle is `false`, Cycle does not participate in attention rendering
- if the toggle is `true`, Cycle enables persistent attention while `powerSink.throttle <= 0`
- the moment `powerSink.throttle > 0`, the authored attention path stops rendering
- if throttle later returns to `0`, the authored attention path resumes rendering

This is a live condition, not a one-time latch.

## 2.3 Non-Goals

The following are explicitly out of scope:

1. No new runtime command type.
2. No Veins dependency.
3. No change to `resolveRuntimeVisualEffects.ts` or `runtimeVisualEvents.ts` for persistent attention.
4. No new behavior-rule DSL feature.
5. No change to power distribution logic.
6. No editor/runtime refactor beyond the files listed in this document.

---

## 3. How

## 3.1 Existing Mechanisms Reused

This design reuses existing mechanisms instead of inventing new ones:

1. **Runtime command pipeline**
   - Manual show/hide uses the existing `UPDATE_STATE` command handled by `UpdateStateHandler`.
   - Throttle changes continue to use the existing `UPDATE_POWER_SINK` command handled by `UpdatePowerSinkHandler`.

2. **Hidden runtime state**
   - Cycle already compiles hidden state entries.
   - The new attention flags use the same hidden-state pattern.

3. **Phaser pooled graphics**
   - The rings continue to use the existing `runtime_effects` graphics pool.

4. **Current frame synchronization point**
   - `GameScene.update(...)` already calls `runtimeVisualEffects.consume(events, runtime, nowMs)` every frame.
   - Persistent attention is synchronized in that same per-frame call.

5. **Existing ring look**
   - The persistent effect reuses the same ring timing and drawing curve as the existing burst effect.

## 3.2 Data Contract

### 3.2.1 Reserved State Keys

Add a shared attention module that defines these reserved keys:

- `attention_manual`
  - meaning: explicit runtime attention requested by code
  - storage location: `entity.state.attention_manual`
  - value contract: `1` means on; `0`, `false`, or missing means off
  - visibility: hidden

- `attention_until_connected`
  - meaning: Cycle-authored attention gate
  - storage location: `entity.state.attention_until_connected`
  - value contract: `1` means enabled; `0`, `false`, or missing means disabled
  - visibility: hidden

These keys are owned by this feature.
No other feature may assign unrelated meaning to them.

### 3.2.2 Programmatic Interface for Start/Stop

Add explicit helper functions for callers that need to start and stop attention programmatically.
Those helpers do not introduce a new runtime command; they only enqueue the existing `UPDATE_STATE` command.

Required helper interface:

- `enqueueShowAttention(commands, entityId)`
- `enqueueHideAttention(commands, entityId)`

Required command payloads:

- show:
  - `type = UPDATE_STATE`
  - `payload.entityId = <node id>`
  - `payload.key = attention_manual`
  - `payload.value = 1`
  - `payload.visible = false`

- hide:
  - `type = UPDATE_STATE`
  - `payload.entityId = <node id>`
  - `payload.key = attention_manual`
  - `payload.value = 0`
  - `payload.visible = false`

This is the command contract for “start showing” and “stop showing.”

### 3.2.3 Cycle Compile Contract

Cycle gains a new authored field:

- schema field: `showAttentionUntilConnected`
- default: `false`

Compiler output contract:

- if `showAttentionUntilConnected` is omitted or `false`, the compiler does not add `state.attention_until_connected`
- if `showAttentionUntilConnected` is `true`, the compiler adds:
  - `components.state.attention_until_connected = { value: 1, visible: false }`

No other Cycle behavior changes.

## 3.3 Rendering Contract

Per entity, persistent attention is rendered when this exact boolean expression is true:

- `manualOn OR (untilConnectedOn AND notConnected)`

Where:

- `manualOn` is the normalized value of `entity.state.attention_manual`
- `untilConnectedOn` is the normalized value of `entity.state.attention_until_connected`
- `notConnected` means `powerSink.throttle <= 0`

The evaluation rules are:

1. If the entity has no `id`, it is ignored.
2. If the entity has no physics body, no rings are rendered and any active rings for it are released immediately.
3. Manual attention does not require a `powerSink`.
4. Authored until-connected attention requires a finite numeric `powerSink.throttle`.
5. If authored until-connected attention is enabled but `powerSink.throttle` is missing or non-finite, the manager must not render authored attention for that entity and must emit a warning once for that entity id.
6. Manual attention overrides authored suppression. If manual attention is on, rings remain visible even when `throttle > 0`.
7. Burst effects and persistent effects may coexist.
8. When an entity no longer satisfies the render condition, its persistent graphics are released in the same frame.

## 3.4 Visual Contract

The persistent rings must match the existing spawn-ring look exactly.
The authoritative parameters are the ones already hard-coded in `spawnGoldRings(...)`:

- ring count: `6`
- phase offset per ring: `200 ms`
- active duration per ring: `620 ms`
- line width: `3`
- color: `0xf3cf62`
- alpha curve: `0.9 * (1 - t)`
- max radius multiplier: `radius * 3`
- radius curve: `radius * (0.22 + t * 0.42) + maxRadius * t`

The persistent effect must use those same parameters in a loop.

Loop contract:

- loop period = `620 ms + (5 * 200 ms) = 1620 ms`
- each ring uses the same local `t` curve inside its active window
- outside the active window for that ring, the graphics object is cleared for that frame

The visual result must be the same ring language as spawn, but continuously repeated.

---

## 4. File-by-File Design

## 4.1 Add — `src/engine/runtime/runtimeAttention.ts`

### Responsibility
Single source of truth for attention state keys, state normalization, connection evaluation for this feature, and command helper creation.

### Logic
This file defines:

- the reserved state-key constants
- a state-reader that normalizes `attention_manual` and `attention_until_connected`
- a throttle-reader that evaluates `connected = throttle > 0`
- helper functions that enqueue the start/stop commands using `UPDATE_STATE`

Normalization rules in this file are authoritative for the feature.
All other callers must reuse them instead of duplicating string keys or boolean coercion.

### Interface
This file must export:

- `ATTENTION_MANUAL_STATE_KEY`
- `ATTENTION_UNTIL_CONNECTED_STATE_KEY`
- `readAttentionFlags(entity)` returning `{ manualOn, untilConnectedOn }`
- `readAttentionConnection(entity)` returning one of:
  - `connected`
  - `not_connected`
  - `invalid`
- `enqueueShowAttention(commands, entityId)`
- `enqueueHideAttention(commands, entityId)`

### Notes
This file exists to prevent string drift and contract drift between compiler, runtime callers, and Phaser rendering.

## 4.2 Change — `src/data/schemas/abilities/cycle.ts`

### Responsibility
Authoritative schema for authored Cycle config.

### Logic
Add `showAttentionUntilConnected` as a boolean field with default `false`.

### Interface
After this change, valid Cycle configs may include:

- `showAttentionUntilConnected?: boolean`

Parsed output must default the field to `false` when omitted.

### Constraints
No other schema field changes.

## 4.3 Change — `src/ui/devtools/editors/blueprint/mode/abilityDrafts.ts`

### Responsibility
Default data for newly created Cycle ability drafts.

### Logic
Add `showAttentionUntilConnected: false` to `createCycleAbilityDraft()`.

### Interface
New Cycle drafts must include the field explicitly.

### Constraints
No other draft defaults change.

## 4.4 Change — `src/ui/devtools/editors/blueprint/mode/forms/CycleAbilityForm.constants.ts`

### Responsibility
Defines the boolean toggles rendered by `CycleAbilityForm.tsx`.

### Logic
Append a new toggle entry:

- label: `Show Attention Until Connected`
- path: `showAttentionUntilConnected`
- tooltip: must state that the node shows attention rings while its throttle is off and stops when the throttle becomes greater than zero

### Interface
No change to `CycleAbilityForm.tsx` is required because that file already renders all entries from `cycleToggleFields`.

### Constraints
The existing toggle order must remain stable except for the addition of the new field.
The new field must be added in the same data-driven toggle list, not as a special-case JSX block.

## 4.5 Change — `src/engine/compiler/abilities/cycleCompiler.ts`

### Responsibility
Compiles authored Cycle config into runtime blueprint components.

### Logic
If `config.showAttentionUntilConnected` is `true`, write hidden runtime state:

- `components.state.attention_until_connected = { value: 1, visible: false }`

This change must be additive only.
It must not alter:

- `powerSink` creation
- `throttle` initialization from `startActive`
- existing Cycle behavior rules
- progress-bar behavior

### Interface
Input:

- Cycle config may now include `showAttentionUntilConnected`

Output:

- compiled blueprint includes hidden attention state only when that field is `true`

### Constraints
This compiler remains the only source that introduces authored until-connected attention into runtime state.
No editor-only `_editor` metadata may be read at runtime.

## 4.6 Change — `src/engine/phaser/effects/runtimeVisualEffectBursts.ts`

### Responsibility
Owns burst-style runtime effect rendering and the shared ring visual definition.

### Logic
Refactor this file so that the ring-drawing math becomes reusable by both:

- the existing burst tween path
- the new persistent attention path

The file must continue to own the authoritative ring constants and draw curve.
The burst behavior must remain visually unchanged.

### Interface
This file must continue to export `spawnGoldRings(...)` and `spawnSmokePuff(...)`.
It must additionally export the minimal shared ring primitives needed by persistent rendering:

- ring timing constants
- a stateless ring draw helper or equivalent ring-frame calculation primitive

### Constraints
No new behavior is introduced here beyond reuse of the same ring visual contract.

## 4.7 Add — `src/engine/phaser/effects/PersistentAttentionRings.ts`

### Responsibility
Own the lifecycle of one entity’s persistent ring set using pooled Phaser graphics.

### Logic
This file represents one persistent ring controller keyed to one entity id.
Its responsibilities are:

1. Acquire six graphics objects from the existing `runtime_effects` graphics pool.
2. Add them to `LayerId.EffectsGlobal`.
3. On each frame update:
   - compute local loop time from `nowMs`
   - resolve each ring’s phase offset
   - draw or clear each graphics object using the shared ring primitive
4. Release all graphics on stop or destroy.

This file must not inspect the runtime directly.
It only receives resolved draw inputs:

- `x`
- `y`
- `radius`
- `nowMs`

### Interface
Required public interface:

- constructor with the existing Phaser dependencies needed to acquire and release pooled graphics
- `update(x, y, radius, nowMs)`
- `destroy()`

### Constraints
This file is a rendering primitive only.
It does not decide whether attention should exist.
It does not read runtime entities, state keys, or throttle.

## 4.8 Change — `src/engine/phaser/effects/RuntimeVisualEffectsManager.ts`

### Responsibility
Continue consuming burst events and add frame-synchronized orchestration for persistent attention.

### Logic
This file gains an internal map keyed by `entityId` for active `PersistentAttentionRings` instances.

Per-frame flow inside `consume(events, runtime, nowMs)` becomes:

1. Consume burst events exactly as today.
2. If `runtime` is null:
   - destroy all persistent attention instances
   - return
3. Iterate runtime entities once.
4. For each entity:
   - read manual and authored attention flags via `runtimeAttention.ts`
   - evaluate connection state from the entity’s own `powerSink.throttle`
   - compute `shouldRender`
   - resolve current body from the runtime snapshot access already available in runtime
   - create, update, or destroy the per-entity persistent controller accordingly
5. After the iteration, destroy controllers whose entity ids were not visited in the current runtime entity set.

Warning behavior:

- if `attention_until_connected` is enabled but the entity has no finite throttle, log a warning once for that entity id and suppress authored attention for that entity

Destroy behavior:

- `destroy()` must release every active persistent controller and clear internal maps

### Interface
The public method signature remains:

- `consume(events, runtime, nowMs)`
- `destroy()`

No change to constructor signature is required if the manager continues using the dependencies it already receives.

### Constraints
This file must not mutate ECS state.
It is Phaser display orchestration only.
Manual and authored attention are both derived from runtime state that already exists.

---

## 5. Runtime Behavior Sequences

## 5.1 Manual Start

1. Caller invokes `enqueueShowAttention(commands, entityId)`.
2. The helper enqueues `UPDATE_STATE(entityId, attention_manual, 1, visible=false)`.
3. `UpdateStateHandler` applies the state during the normal apply phase.
4. On the next `GameScene.update(...)`, `RuntimeVisualEffectsManager.consume(...)` sees `manualOn = true`.
5. If the entity has a physics body, persistent rings are created or updated.

## 5.2 Manual Stop

1. Caller invokes `enqueueHideAttention(commands, entityId)`.
2. The helper enqueues `UPDATE_STATE(entityId, attention_manual, 0, visible=false)`.
3. `UpdateStateHandler` applies the state during the normal apply phase.
4. On the next frame, the manager recomputes `shouldRender`.
5. If no other path requires attention, the persistent controller is destroyed that frame.

## 5.3 Cycle Toggle On, Node Starts Inactive

1. Authored Cycle config sets `showAttentionUntilConnected = true`.
2. `cycleCompiler.ts` writes hidden state `attention_until_connected = 1`.
3. The compiled Cycle entity already has `powerSink.throttle` initialized from `startActive`.
4. If `startActive = false`, initial throttle is `0`.
5. On the first runtime frame, `shouldRender = true` and persistent rings appear.

## 5.4 User Turns the Node On

1. Runtime UI or another caller updates the entity via the existing `UPDATE_POWER_SINK` path.
2. `UpdatePowerSinkHandler` writes `powerSink.throttle > 0`.
3. On the next frame, authored attention evaluates to connected and therefore stops rendering.
4. If manual attention is also on, rings remain visible.

## 5.5 User Turns the Node Off Again

1. The existing throttle UI sets `powerSink.throttle = 0` through `UPDATE_POWER_SINK`.
2. On the next frame, authored until-connected attention evaluates to not connected.
3. Persistent rings resume rendering automatically.

---

## 6. Error Handling

The implementation must handle error cases explicitly.

### 6.1 Missing Body

- Condition: an entity qualifies for attention but has no physics body
- Required behavior: do not render rings; destroy any active controller for that entity in the same frame

### 6.2 Invalid Authored State

- Condition: `attention_until_connected = 1` but `powerSink.throttle` is missing or non-finite
- Required behavior:
  - suppress authored attention for that entity
  - log one warning for that entity id
  - do not affect manual attention

### 6.3 Runtime Detached

- Condition: `consume(..., runtime, nowMs)` is called with `runtime = null`
- Required behavior: destroy all active persistent attention controllers immediately

No error path may leave pooled graphics orphaned.

---

## 7. Tests

The tests must follow the supplied testing contract:

- behavior-oriented
- Given/When/Then structure
- colocated with the source domain they verify
- no UI business logic tests in `.tsx`
- no ECS mocking for runtime behavior tests

## 7.1 Add — `src/engine/runtime/runtimeAttention.test.ts`

### Responsibility
Unit-test the shared attention contract helpers.

### Required coverage

1. `readAttentionFlags(...)` normalizes `1`, `0`, booleans, and missing state correctly.
2. `readAttentionConnection(...)` returns:
   - `connected` when `throttle > 0`
   - `not_connected` when `throttle <= 0`
   - `invalid` when throttle is missing or non-finite
3. `enqueueShowAttention(...)` emits the exact `UPDATE_STATE` payload for manual-on.
4. `enqueueHideAttention(...)` emits the exact `UPDATE_STATE` payload for manual-off.

## 7.2 Add — `src/engine/compiler/abilities/cycleCompiler.attention.test.ts`

### Responsibility
Unit-test the new compile contract.

### Required coverage

1. default or `false` does not emit `attention_until_connected`
2. `true` emits `attention_until_connected = { value: 1, visible: false }`
3. existing `startActive` behavior remains unchanged
4. existing `showThrottleSlider` behavior remains unchanged

## 7.3 Add — `src/engine/phaser/effects/PersistentAttentionRings.test.ts`

### Responsibility
Unit-test the lifecycle of the persistent pooled graphics controller.

### Required coverage

1. acquires six graphics objects on creation
2. updates draw state for the active window
3. clears graphics outside the active window
4. releases all graphics on destroy
5. destroy is safe when called more than once

## 7.4 Add — `src/engine/phaser/effects/RuntimeVisualEffectsManager.attention.test.ts`

### Responsibility
Unit-test the orchestration logic for persistent attention.

### Required coverage

1. burst event consumption still calls the existing spawn path
2. manual attention creates persistent rings when a body exists
3. manual attention destroys persistent rings when the flag turns off
4. authored until-connected creates rings when `throttle <= 0`
5. authored until-connected suppresses rings when `throttle > 0`
6. manual attention overrides authored suppression
7. missing body removes active rings
8. invalid authored throttle logs once and does not render authored rings
9. `destroy()` releases all active controllers

## 7.5 Add — `src/ui/devtools/editors/blueprint/mode/CycleAbilityForm.attention.test.tsx`

### Responsibility
View-test the new toggle wiring in the Cycle editor.

### Required coverage

1. a new Cycle draft renders the `Show Attention Until Connected` toggle unchecked
2. toggling it updates the draft value at `showAttentionUntilConnected`
3. the existing toggle list continues to render without regression

---

## 8. Final Contract

The implementation is complete only when all of the following are true:

1. A caller can start and stop persistent attention by using the defined command helpers.
2. Cycle has a new `showAttentionUntilConnected` toggle defaulting to `false`.
3. The toggle is compiled into hidden runtime state using the existing Cycle compiler path.
4. Persistent rings use the same look as spawn rings.
5. Authored until-connected attention is controlled only by the entity’s own `powerSink.throttle`.
6. Veins plays no role in this feature.
7. No new runtime command type is introduced.
8. Existing spawn visual behavior remains unchanged.
9. All new and changed tests pass.
10. No pooled graphics leak across stop, runtime detach, or scene destroy.

