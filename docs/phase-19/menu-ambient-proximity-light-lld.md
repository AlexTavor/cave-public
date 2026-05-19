# LLD — Menu Ambient Proximity Light

## Status

Approved design target for implementing mouse-proximity lighting for menu ambient nodes with a dedicated `MenuAmbientProximityLightModule`.

---

## 1. Why

### 1.1 User requirement

Ambient runtime nodes must emit a light whose strength depends on distance from the mouse.

Required contract:

- closer to the mouse = stronger light
- at and beyond the cutoff boundary the light is invisible in practice
- the cutoff distance is `300 px`
- the implementation must be display-only

### 1.2 Why this must be a display module and not a runtime system

The existing codebase separates simulation from presentation.

Observed facts from the code:

- menu ambient motion is the only ambient simulation behavior and it already lives in `src/ui/runtime/ambient/MenuAmbientWanderSystem.ts`
- display behavior is assembled through Phaser display modules in `src/engine/phaser/display/**`
- `MenuAmbientDisplayDefinition.ts` already composes ambient visuals as a display-module stack
- `LightModule.ts` already shows the established pattern for owning a Phaser `PointLight` inside a display module

Mouse proximity is not simulation state. It is transient input-derived presentation state. It must therefore remain in the Phaser display layer.

Putting this behavior into the runtime system layer would violate the project mental model:

- it would introduce presentation-driven behavior into simulation
- it would create a path from UI input into runtime mutation for a purely visual effect
- it would add unnecessary command/system complexity where no runtime state change is required

### 1.3 Why a dedicated module is the correct design

A dedicated module is preferable to extending the generic `LightModule` because the existing `LightModule` resolves light from authored style/base/decor sources only.

Observed facts from the code:

- `src/engine/phaser/display/modules/lightModuleState.ts` resolves light from `spec.style.light`, base-state light resolution, and decor-state light resolution
- `src/ui/runtime/ambient/createMenuAmbientCartridge.ts` creates ambient blueprints with empty `assets.displays` and empty `assets.styles`
- `src/engine/phaser/display/MenuAmbientDisplayDefinition.ts` currently omits `LightModule` entirely

Therefore, ambient proximity light is not another authored light source. It is a distinct runtime-rendered effect with a different trigger and must remain isolated.

This design:

- preserves the generic `LightModule` contract
- avoids ambient-specific branching in shared light-state logic
- keeps the new behavior scoped only to menu ambient displays
- reuses the existing Phaser point-light lifecycle pattern already proven in `LightModule.ts`

---

## 2. What exists today

The following statements are based on code inspection of the uploaded source.

### 2.1 Ambient display composition

`src/engine/phaser/display/MenuAmbientDisplayDefinition.ts` currently builds each ambient display with this stack order:

1. `TransformModule`
2. `GlyphModule`
3. `PulseModule`

There is no light module in the ambient stack.

### 2.2 Ambient entity source data

`src/ui/runtime/ambient/createMenuAmbientCartridge.ts` creates ambient agents with:

- `display.display_key = menu_ambient_entity_<variant>`
- fixed display radius derived by `buildDisplayRadius(index)`
- physics enabled
- no authored style light
- no authored display asset light

### 2.3 Generic light behavior

`src/engine/phaser/display/modules/LightModule.ts` already establishes the project-standard Phaser light lifecycle:

- lazily enable the scene light pipeline
- lazily create one `PointLight` per display instance
- update that light during `tick`
- destroy it during module teardown

`src/engine/phaser/display/modules/lightModuleState.ts` already provides reusable helpers for:

- parsing hex colors
- parsing RGB channels
- representing canonical light state

### 2.4 Pointer world-space is already the existing coordinate convention

The codebase already uses Phaser pointer world coordinates for scene interaction.

Observed fact:

- `src/engine/phaser/scenes/entityDragController.ts` reads `pointer.worldX` and `pointer.worldY`

That establishes world-space pointer coordinates as the correct coordinate system for this feature.

---

## 3. Design goals

This implementation must satisfy all of the following:

1. Only menu ambient entities receive this effect.
2. The effect lives entirely in the display layer.
3. No runtime commands, no ECS mutation, and no new runtime system are introduced.
4. Existing shared display mechanisms are reused where they already fit.
5. The behavior is deterministic with respect to the current visual frame only; it does not enter runtime state.
6. The implementation is testable through pure logic tests and display-module runtime tests.

---

## 4. Functional contract

This section is normative.

### 4.1 Affected entities

Only entities rendered through `src/engine/phaser/display/MenuAmbientDisplayDefinition.ts` receive the proximity light.

No other display definition changes.

### 4.2 Pointer source

The module reads the Phaser scene’s current active pointer world position.

Source of truth:

- `scene.input.activePointer.worldX`
- `scene.input.activePointer.worldY`

No new context plumbing is introduced.

### 4.3 Distance metric

Distance is Euclidean distance in world space between:

- node center: `spec.x`, `spec.y`
- pointer world position

### 4.4 Visibility cutoff

The cutoff distance is exactly `300 px`.

Behavioral contract:

- if distance is less than `300`, the light is eligible to render
- if distance is greater than or equal to `300`, the light is hidden

This resolves the boundary unambiguously and ensures the light is invisible at the cutoff.

### 4.5 Strength function

Light strength is linear with distance.

Formula contract:

- normalized strength = `1 - (distance / 300)`
- clamp to `[0, 1]`

Resulting behavior:

- distance `0` ⇒ strength `1`
- distance `150` ⇒ strength `0.5`
- distance `>= 300` ⇒ hidden

### 4.6 Light appearance contract

The light state is fixed except for strength.

Required values:

- light kind: point light
- color: `#ffffff`
- blend mode: additive
- radius: `spec.radius`
- intensity / alpha: normalized strength from section 4.5
- attenuation: same constant already used by `LightModule.ts`

Rationale:

- white is grounded in the existing glyph glow contract, which already uses white glow tint in `GlyphGlowStyle.ts`
- additive blend is the existing glow/light blend convention in the display stack
- `spec.radius` is the existing canonical per-entity size measure in the display layer and avoids inventing a second ambient-only size model
- reusing the existing attenuation constant avoids introducing a new tuning axis

### 4.7 Invalid input handling

The module must hide the light and create no new light if any of the following are true:

- `spec.hasPhysics` is false
- `spec.radius` is not display-visible under the existing `isRadiusVisible` rule
- `scene.input` is unavailable
- `activePointer` is unavailable
- `worldX` is not finite
- `worldY` is not finite

No silent partial rendering is allowed.

### 4.8 Lifecycle contract

Each ambient display instance owns at most one Phaser `PointLight`.

Lifecycle rules:

- creation is lazy and occurs only when a visible light state exists
- subsequent ticks reuse the same `PointLight`
- hidden state sets the existing light invisible instead of destroying and recreating it each frame
- module destroy always destroys the owned `PointLight` if it exists

---

## 5. File-by-file design

Every file listed below is either added or changed. No other source files are in scope.

### 5.1 Change — `src/engine/phaser/display/MenuAmbientDisplayDefinition.ts`

**Responsibility**

Define the module stack for menu ambient display variants.

**Required logic**

Insert `MenuAmbientProximityLightModule` into the ambient stack.

**Required stack order**

1. `TransformModule`
2. `MenuAmbientProximityLightModule`
3. `GlyphModule`
4. `PulseModule`

**Why this order**

- `TransformModule` remains first, matching existing display-stack conventions
- the light module stays grouped with other display-state modules before glyph rendering, consistent with the existing use of `LightModule` near the front of non-ambient stacks
- `PulseModule` remains last so its root-scale behavior remains isolated to the existing ambient visual pulse

**Interface**

No signature changes.

- `MENU_AMBIENT_DISPLAY_VARIANT_COUNT` remains unchanged
- `createMenuAmbientDisplayDefinitions(glyphRegistry)` remains unchanged
- only the module stack contents change

---

### 5.2 Add — `src/engine/phaser/display/modules/menuAmbientProximityLightState.ts`

**Responsibility**

Purely resolve whether an ambient node should emit a proximity light on the current frame, and if so return the exact light state.

**Required logic**

This file owns the entire decision contract from section 4.

It must:

1. validate physics and visible radius using existing display visibility rules
2. validate pointer coordinates
3. compute Euclidean distance in world space
4. apply the `300 px` cutoff
5. compute normalized linear strength
6. return a complete canonical light-state object or `null`

**Required reuse**

Use existing project utilities/constants where they already fit:

- `isRadiusVisible` from `gameSceneMath`
- `BLEND_MODE_ADD` from `blendModes`

Do not duplicate those rules.

**Interface**

This file exports:

- a light-state type for this module’s pure result
- one resolver function that accepts only the minimum primitive inputs needed for deterministic evaluation of one frame

The resolver input contract must contain:

- node world position
- node display radius
- `hasPhysics`
- pointer world position

The resolver output contract must be:

- `null` when no light is allowed
- otherwise an object containing all values needed by the runtime module to update a Phaser `PointLight`

This file must not depend on Phaser object mutation.

---

### 5.3 Add — `src/engine/phaser/display/modules/MenuAmbientProximityLightModule.ts`

**Responsibility**

Own the Phaser `PointLight` lifecycle for ambient proximity light.

**Required logic**

This module must:

1. expose a `DisplayModuleFactory` with id `MenuAmbientProximityLightModule`
2. read the current active pointer world position from the scene during each tick
3. delegate state calculation to `menuAmbientProximityLightState.ts`
4. lazily enable scene lights when first needed
5. lazily create one Phaser `PointLight` when first needed
6. update the existing light’s:
   - position
   - radius
   - color
   - intensity
   - blend mode
   - visibility
7. hide the light when the resolver returns `null`
8. destroy the light during teardown

**Required reuse**

Re-use existing shared light helpers instead of duplicating them:

- `parseHexColor` from `lightModuleState.ts`
- `parseRgb` from `lightModuleState.ts`

Re-use the existing Phaser light attenuation constant already used by `LightModule.ts`.

**Interface**

- implements the existing `DisplayModuleFactory` contract
- accepts only the standard `DisplayInitContext`
- introduces no new public APIs outside the module factory export
- mutates no runtime or React state

**Explicit non-responsibilities**

This file must not:

- inspect ambient runtime systems
- emit runtime commands
- read or mutate world interaction context
- extend generic light resolution behavior

---

## 6. Files explicitly not changed

The following files are intentionally out of scope.

### 6.1 `src/engine/phaser/display/modules/LightModule.ts`

No change.

Reason: the design intentionally avoids ambient-specific branching in the shared generic light path.

### 6.2 `src/engine/phaser/display/modules/lightModuleState.ts`

No behavioral change.

Reason: its parsing helpers are reused, but its generic resolution contract remains untouched.

### 6.3 `src/engine/phaser/display/types.ts`

No change.

Reason: the module can read pointer world position directly from the existing Phaser scene object. No new display context field is needed.

### 6.4 `src/engine/phaser/scenes/GameScene.ts`

No change.

Reason: current scene/input plumbing is already sufficient for display-layer pointer reads.

### 6.5 `src/ui/runtime/ambient/buildMenuAmbientRuntime.ts`

No change.

Reason: the feature is not runtime simulation.

### 6.6 `src/ui/runtime/ambient/MenuAmbientWanderSystem.ts`

No change.

Reason: wandering behavior is unrelated to display-only light rendering.

### 6.7 `src/ui/runtime/world/context/WorldInteractionContext.tsx`

No change.

Reason: no React-side pointer propagation is required.

---

## 7. Detailed runtime behavior

This section describes the exact frame behavior.

### 7.1 Module initialization

When an ambient display instance is created:

- the module stores no global state
- the module initializes with `light = null`
- no light is created eagerly

### 7.2 Tick sequence

For each tick of one ambient display instance:

1. Read `scene.input.activePointer`.
2. Read `worldX` and `worldY` from that pointer.
3. Call the pure resolver with current pointer position and current display spec.
4. If the resolver returns `null`:
   - if a light already exists, set it invisible
   - stop further work for this tick
5. If the resolver returns a light state:
   - ensure scene lights are enabled
   - ensure the instance light exists
   - update the light from the resolved state
   - set the light visible

### 7.3 Destroy sequence

On module destroy:

- if the module owns a point light, destroy it
- do not retain or cache any scene-owned light reference afterward

---

## 8. Testing design

The tests are part of the contract.

They must follow the project testing rules:

- behavior-focused
- human-readable
- Given/When/Then structure
- pure logic isolated from Phaser object mutation where possible

### 8.1 Add — `src/engine/phaser/display/modules/menuAmbientProximityLightState.test.ts`

**Responsibility**

Verify the pure distance-to-light-state contract.

**Required cases**

1. **Happy path: pointer on node center**
   - Given valid physics, visible radius, and pointer exactly at node position
   - When the resolver runs
   - Then it returns a light state with full strength

2. **Mid-range falloff**
   - Given a pointer at `150 px`
   - When the resolver runs
   - Then returned alpha/intensity is exactly `0.5`

3. **Cutoff boundary**
   - Given a pointer at `300 px`
   - When the resolver runs
   - Then it returns `null`

4. **Beyond cutoff**
   - Given a pointer beyond `300 px`
   - When the resolver runs
   - Then it returns `null`

5. **Invalid pointer coordinates**
   - Given missing or non-finite world coordinates
   - When the resolver runs
   - Then it returns `null`

6. **No physics / invisible radius**
   - Given `hasPhysics = false` or non-visible radius
   - When the resolver runs
   - Then it returns `null`

**Why this file exists**

It isolates the core math and boundary contract from Phaser runtime concerns.

---

### 8.2 Add — `src/engine/phaser/display/modules/MenuAmbientProximityLightModule.test.ts`

**Responsibility**

Verify module lifecycle behavior against a minimal fake Phaser scene/light manager.

**Required cases**

1. **Lazy creation**
   - Given no existing light and a visible resolved state
   - When the module ticks
   - Then exactly one point light is created

2. **Light manager enablement**
   - Given scene lights are inactive
   - When the first visible tick occurs
   - Then the module enables the light manager before creating the point light

3. **Property updates**
   - Given an existing light and a visible resolved state
   - When the module ticks
   - Then the light position, radius, color, intensity, blend mode, and visibility match the resolved state

4. **Hide instead of recreate**
   - Given a previously created light and a later invisible state
   - When the module ticks
   - Then the existing light is made invisible and no second light is created

5. **Reuse across ticks**
   - Given repeated visible ticks for the same instance
   - When the module ticks multiple times
   - Then the same light instance is reused

6. **Destroy path**
   - Given a created light
   - When the module is destroyed
   - Then that light is destroyed exactly once

**Required test scaffolding rule**

Keep fakes local to the test unless an exact reusable point-light test helper already exists. Existing transfer-display test helpers model a different Phaser light API and must not be stretched beyond their contract.

---

### 8.3 Add — `src/engine/phaser/display/MenuAmbientDisplayDefinition.test.ts`

**Responsibility**

Lock the ambient module-stack contract.

**Required cases**

1. **Variant count remains stable**
   - Given the ambient definitions factory
   - When definitions are created
   - Then the count equals `MENU_AMBIENT_DISPLAY_VARIANT_COUNT`

2. **Ambient stack includes the new light module in the required order**
   - Given any created ambient definition
   - When its module ids are inspected
   - Then the order is exactly:
     1. `TransformModule`
     2. `MenuAmbientProximityLightModule`
     3. `GlyphModule`
     4. `PulseModule`

This test prevents future regressions that silently remove or reorder the new behavior.

---

## 9. Acceptance criteria

Implementation is complete only when all of the following are true:

1. Menu ambient nodes render with a proximity-dependent point light.
2. No runtime system, command, blueprint, or ECS mutation path was added for this feature.
3. `LightModule` and `lightModuleState` generic behavior remain unchanged.
4. The cutoff contract is enforced at `300 px`.
5. Invalid pointer or non-renderable node states hide the light cleanly.
6. Module lifecycle does not leak lights.
7. All new tests described in section 8 are green.

---

## 10. Non-goals

The following are explicitly out of scope for this change:

- tuning ambient glyph art
- changing pulse behavior
- changing camera behavior
- adding touch-specific light rules
- introducing authored ambient light styles
- refactoring the generic `LightModule`
- changing renderer-selection behavior

---

## 11. Implementation summary

The implementation is intentionally narrow:

- one ambient-only pure light-state resolver
- one ambient-only display module that owns a Phaser point light
- one ambient display-definition change to include that module
- tests that lock the math contract, lifecycle contract, and stack contract

That is the smallest design that satisfies the feature request while staying inside the existing architecture.
