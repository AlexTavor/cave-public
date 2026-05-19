# LLD — Display cleanup, fillbar/throttle unification, swarm healthbar, and storage initial values

## Scope

This document defines the low-level design for the requested changes, using the code as the source of truth.
It is constrained by the project architecture and testing contract:

- UI must render semantic state only; business logic stays in stores, hooks, or services.
- Runtime state remains owned by ECS; mutations must continue to flow through the existing command/apply pipeline.
- Reuse existing mechanisms before adding new ones.
- Tests must verify behavior, use real data/factories where applicable, and remain readable.

These constraints come from the uploaded project contract documents. fileciteturn2file0 fileciteturn2file1 fileciteturn2file2

---

## Verified current state

### 1) Swarm row status effects are hard-coded emojis

Current file:
- `src/ui/runtime/world/selection/swarm/SwarmRowItem.tsx`

Observed behavior:
- `starving` renders `🍽️`
- `cold` renders `❄️`
- this path bypasses the project’s icon systems entirely.

Related tests:
- `src/ui/runtime/world/selection/swarm/SwarmRowItem.test.tsx`
- `src/ui/runtime/world/selection/SwarmCard.test.tsx`

### 2) Node border color is currently independent from background color

Current file:
- `src/engine/phaser/display/modules/resolveStyledBackgroundRenderModel.ts`

Observed behavior:
- `interiorColor` comes from `style.backgroundColor ?? DEFAULT_BACKGROUND_COLOR`
- `borderColor` comes from `style.borderColor ?? DEFAULT_BORDER_COLOR`
- therefore authored border color can diverge from the background.

Related test:
- `src/engine/phaser/display/modules/resolveStyledBackgroundRenderModel.test.ts`

### 3) Display animation is currently driven by pulse, not by production state

Current files:
- `src/engine/phaser/display/DisplayInstanceManagerTick.ts`
- `src/engine/phaser/display/modules/glyphModuleRuntime.ts`
- `src/engine/phaser/display/modules/backgroundCycleReader.ts`
- `src/game/systems/energy/energyDistributionTypes.ts`

Observed behavior:
- `DisplayInstanceManagerTick.ts` always injects a pulse value.
- `glyphModuleRuntime.ts` does not use the tick context pulse value; it queries `pulseEngine` directly per glyph placement.
- cycle-readable state exists through `readEntityCycle(...)`.
- power status enum only exposes `nominal | brownout | blackout`.
- there is no explicit runtime status named `insufficient resources` in the inspected code.
- one-off completion is represented by `state.is_depleted.value === 1` and selection logic already treats depleted sinks as inert.

### 4) Progress bars are a simple atom; throttle is a raw range input

Current files:
- `src/ui/lib/atoms/progress-bar/ProgressBar.tsx`
- `src/ui/lib/atoms/progress-bar/ProgressBar.styles.ts`
- `src/ui/runtime/world/selection/job-card/JobCard.tsx`
- `src/ui/runtime/world/selection/SelectionCard.styles.ts`

Observed behavior:
- `ProgressBar` supports `current`, `max`, `color`, `height`, `thresholds`, `showText`, `formatText`, `fillRef`.
- it is a plain rectangular bar.
- throttle in `JobCard.tsx` is a styled native `<input type="range">`.
- there is no reusable slider molecule.
- there is no reusable fillbar atom with icon/title/value slots.

### 5) The live bar update mechanism writes directly to the fill element width

Current files:
- `src/ui/runtime/world/entity-state-link/EntityStateLinkContext.tsx`
- `src/ui/runtime/world/selection/cave/CaveSustainmentSection.tsx`
- `src/ui/runtime/world/selection/cave/CaveVitalsSection.tsx`
- `src/ui/runtime/world/selection/absorption/AbsorptionCard.tsx`

Observed behavior:
- `EntityStateLinkContext` updates `binding.element.style.width = "${percent}%"`.
- therefore any replacement fillbar must continue to expose the actual fill element through `fillRef`.

### 6) Swarm row currently has no healthbar

Current files:
- `src/ui/runtime/world/selection/swarm/SwarmRowItem.tsx`
- `src/ui/runtime/world/selection/body/useBodyCardData.ts`
- `src/ui/runtime/world/selection/body/BodyCardContent.tsx`

Observed behavior:
- swarm row already has access to `liveHealth` and `liveMaxHealth` via `useBodyCardData(...)`.
- tooltip body card already renders a health bar.
- the row itself does not.

### 7) Storage ability does not support authored initial value

Current files:
- `src/data/schemas/abilities/storage.ts`
- `src/ui/devtools/editors/blueprint/mode/abilityDrafts.ts`
- `src/ui/devtools/editors/blueprint/mode/forms/StorageAbilityForm.tsx`
- `src/engine/compiler/abilities/storageCompiler.ts`
- `src/engine/runtime/handlers/SpawnHandler.ts` (inspected separately)

Observed behavior:
- storage schema has no initial/current value field.
- storage draft has no such field.
- storage form has no such field.
- compiler always initializes storage state with `value: 0`.
- spawn already clones compiled blueprint state, so spawn logic does not need a new path if the compiled blueprint already contains the authored starting value.

### 8) Status-effect icon route is incomplete in the current repo

Current files:
- `src/ui/lib/foundation/icon-registry/IconKey.ts`
- `src/ui/devtools/shell/AppIconRegistryProvider.tsx`
- `src/ui/devtools/state/selectors/selectAggregatedIcons.ts`
- `src/ui/devtools/state/moduleStore.assets.icons.ts`

Observed behavior:
- canonical ids `effect_food` and `effect_heat` exist in `IconKey.ts`.
- the app icon registry currently aggregates display assets and blueprint ids, but not module icon assets.
- the current swarm row does not use the icon registry.
- the uploaded example module does not currently define matching icon assets in `assets.art`.

This matters because the request is specifically about routing these status effects through the same icon path as the rest of the game icons.

---

## Design decisions

1. **Status effects in swarm rows will move to the icon-registry route, not the display-export route.**
   Reason: the request is about “game icons”, not node display renders. The current codebase already has an icon registry concept and canonical effect ids, but the row bypasses that route today.

2. **Border color will be derived from the resolved background color, not from authored border color.**
   Reason: the requirement is absolute: border must equal background.

3. **Animation gating will be centralized in a shared display helper and then consumed by every pulse-based display path.**
   Reason: pulse is currently read in more than one place; changing only one path would leave partial animation alive.

4. **The new fillbar design will be introduced as a reusable atom, and the slider variant as a molecule.**
   Reason: this matches the requested atomic structure while keeping business logic outside UI components.

5. **The existing `ProgressBar` API will be preserved as a compatibility wrapper over the new base fillbar.**
   Reason: this lets all existing fillbars adopt the new visual language with minimal feature-level churn and preserves the `fillRef` live-update contract.

6. **Storage initial value will be authored at blueprint level and compiled into `components.state[resource].value`.**
   Reason: spawn already clones compiled state; adding a new spawn-time override path would be unnecessary scope expansion.

---

## Change set 1 — Clean out display detritus in swarm status icons

### Why

The current swarm row renders two hard-coded emojis. That creates a special-case display path and violates the request that these effects go through the same icon route as the rest of the game icons.

### What

Replace emoji rendering with registry-backed status icons.

### How

#### Add: `src/ui/lib/atoms/app-icon/AppIcon.tsx`

**Responsibility**
- render icons from the existing icon registry (`useIcon`) rather than from the display export pipeline.

**Logic**
- accept an icon id string.
- resolve the registry entry.
- render image/component output based on registry entry type.
- fall back to unknown icon if the id is not present.

**Interface**
- inputs: `id`, `size`, `className`, standard span props.
- output: a presentational icon element only.
- no runtime/business logic.

#### Add: `src/ui/lib/atoms/app-icon/AppIcon.styles.ts`

**Responsibility**
- shared sizing/alignment styles for registry-backed icons.

**Logic**
- match the same size tokens already used by `GameIcon`.
- support inline usage inside row/status layouts.

**Interface**
- emotion styled container used only by `AppIcon.tsx`.

#### Change: `src/ui/devtools/state/selectors/selectAggregatedIcons.ts`

**Responsibility**
- aggregate all icons exposed to the app icon registry.

**Logic**
- include `moduleIconAssetsToIconRegistry(...)` in addition to display assets and blueprint image ids.
- preserve existing precedence rules.

**Interface**
- function signature remains unchanged.
- return value remains `Record<string, IconDefinition>`.

#### Change: `src/ui/devtools/shell/AppIconRegistryProvider.tsx`

**Responsibility**
- provide runtime/editor icon registry contents to the app.

**Logic**
- merge module icon assets into `extraIcons` so effect/status icons are available at runtime.

**Interface**
- provider API unchanged.

#### Add: `src/ui/runtime/world/selection/swarm/swarmStatusIcons.ts`

**Responsibility**
- define the explicit mapping from swarm trait ids to icon ids used in the row.

**Logic**
- export the canonical mapping for exactly the traits handled in the row.
- first implementation scope: `starving`, `cold`.
- return no icon for unknown traits.

**Interface**
- pure function: `trait id -> icon id | null`.
- no React, no runtime mutation.

#### Change: `src/ui/runtime/world/selection/swarm/SwarmRowItem.tsx`

**Responsibility**
- render the row using registry-backed icons rather than literal emoji.

**Logic**
- replace inline emoji branches with icon resolution from `swarmStatusIcons.ts`.
- render only verified supported statuses.
- keep all existing data wiring and tooltip behavior unchanged.

**Interface**
- component props unchanged.

#### Change: `src/ui/runtime/world/selection/swarm/SwarmCard.styles.ts`

**Responsibility**
- style the status icon container for icon components instead of emoji glyphs.

**Logic**
- keep layout/gap behavior.
- remove emoji-specific font styling.
- use icon sizing tokens.

**Interface**
- exported styled components remain local to swarm selection UI.

#### Asset prerequisite: status icon assets

**Required fact from the inspected code**
- the repo contains canonical ids `effect_food` and `effect_heat`, but the uploaded example module does not currently define icon assets for them.

**Required implementation step**
- add the actual icon assets for the chosen ids in the active module asset set before switching the row to those ids.

**Important constraint**
- this document does **not** invent the art asset payload. The asset value must be the verified in-game icon asset, not a guessed replacement.

### Tests

#### Change: `src/ui/runtime/world/selection/swarm/SwarmRowItem.test.tsx`
- stop asserting emoji text.
- assert that the status icon element renders for `starving`.
- assert that the row still renders tooltip content including the body health bar.

#### Change: `src/ui/runtime/world/selection/SwarmCard.test.tsx`
- stop asserting emoji text.
- assert presence of the icon-backed status indicator for swarm members.

#### Add: `src/ui/lib/atoms/app-icon/AppIcon.test.tsx`
- happy path: renders image/component icon from registry.
- negative path: falls back to unknown icon when missing.
- edge case: handles unsupported icon type defensively and logs loudly if needed.

---

## Change set 2 — Node border must equal node background

### Why

Current render code allows authored border color to diverge from background color. The requirement forbids that.

### What

Make the final rendered border color equal the resolved interior/background color for styled nodes.

### How

#### Change: `src/engine/phaser/display/modules/resolveStyledBackgroundRenderModel.ts`

**Responsibility**
- compute the styled node render model.

**Logic**
- resolve the final interior/background color first.
- set `borderColor` to that resolved background color.
- ignore `style.borderColor` for the rendered output.
- preserve all other geometry, alpha, and fill behavior.

**Interface**
- exported function signature unchanged.
- returned model shape unchanged.

#### No change required: `src/engine/phaser/display/modules/backgroundStyledRenderer.ts`

**Reason**
- renderer already consumes `model.borderColor`; once the model is corrected, renderer behavior is correct.

### Tests

#### Change: `src/engine/phaser/display/modules/resolveStyledBackgroundRenderModel.test.ts`
- replace the default-color expectation for border with equality-to-interior expectation.
- add explicit case proving authored `style.borderColor` no longer changes rendered border color.
- preserve existing determinism/fill tests.

---

## Change set 3 — Cycle nodes that do not produce must not animate

### Why

Pulse-driven animation currently continues even when a cycle node is not producing. The codebase has multiple animation entry points, so the stop condition must be centralized.

### What

Introduce a shared “display is active” decision and use it to gate pulse-driven animation for cycle nodes.

### How

#### Add: `src/engine/phaser/display/displayActivity.ts`

**Responsibility**
- compute whether a display entity should receive active pulse-driven animation.

**Logic**
- for non-cycle entities: return active.
- for cycle entities: return inactive when either of the following is true:
  - `powerSink.status === "blackout"`
  - `state.is_depleted.value === 1`
- for the request’s “insufficient resources” case:
  - do **not** invent a new status flag.
  - derive inactivity only from an already-available runtime signal.
  - implementation must use the existing cycle-readable state and existing resource/power state already present on the runtime entity.
  - if no such signal exists for a given entity, animation must remain unchanged rather than guessed.

**Required note**
- the inspected codebase does not expose a literal runtime status named `insufficient resources`.
- therefore the implementation must be grounded in current entity state, not in a newly invented enum/string.

**Interface**
- pure function: `RuntimeEntity -> boolean` or `DisplayTick inputs -> boolean`.
- no Phaser side effects.

#### Change: `src/engine/phaser/display/DisplayInstanceManagerTick.ts`

**Responsibility**
- provide pulse input to entity visual instances.

**Logic**
- compute active/inactive via `displayActivity.ts`.
- pass the real pulse only when active.
- pass zero pulse when inactive.

**Interface**
- exported function signature unchanged.

#### Change: `src/engine/phaser/display/modules/glyphModuleRuntime.ts`

**Responsibility**
- tick glyph images.

**Logic**
- stop querying `pulseEngine` directly for active motion when the entity is inactive.
- consume the same shared activity decision used by `DisplayInstanceManagerTick.ts`.
- this change is mandatory because this file currently bypasses `ctx.pulseValue`.

**Interface**
- exported function signatures unchanged.

#### Change: `src/engine/phaser/display/modules/lightModuleDecorState.ts`

**Responsibility**
- compute decorative aura/light state.

**Logic**
- if decorative pulse should follow entity activity, use the same shared activity decision and zero pulse contribution when inactive.
- do not change static non-pulsing light outputs.

**Interface**
- exported function signature unchanged.

### Explicit non-goal

- do not add a new runtime mutation path.
- do not add a new energy status enum.
- do not push selection-card analysis logic into Phaser UI code.

### Tests

#### Add: `src/engine/phaser/display/displayActivity.test.ts`
- happy path: active cycle node stays active when not blacked out and not depleted.
- negative path: blackout returns inactive.
- negative path: depleted one-off returns inactive.
- edge path: non-cycle entity remains active.

#### Change: `src/engine/phaser/display/modules/glyphModuleRuntime.test.ts` or add a focused companion test
- verify zero pulse motion when the shared helper returns inactive.
- verify normal pulse motion remains unchanged when active.

#### Change: `src/engine/phaser/display/DisplayInstanceManagerTick.test.ts` (add if absent)
- verify tick passes zero pulse for inactive entities.

---

## Change set 4 — Unified fillbar system and throttle redesign

### Why

The current UI has a basic `ProgressBar` atom and a one-off native range input. The request requires one shared visual system for all fillbars, with a slider variant that is built according to the atomic UI structure.

### What

Create:
- one reusable base fillbar atom for all bars.
- one slider molecule for throttle interaction.
- one compatibility wrapper so existing fillbar call sites adopt the new visual system without unnecessary feature refactors.

### How

#### Add: `src/ui/lib/atoms/fill-bar/FillBar.tsx`

**Responsibility**
- render the canonical fillbar shell and fill visuals for all non-slider bars.

**Logic**
- render the card-backed frame.
- render the default gold fill using theme XP color unless a color override is supplied.
- render the wavy-edged fill.
- optionally render:
  - left icon
  - top-left title
  - top-right current/max readout
- preserve threshold support.
- preserve direct fill-element ref exposure for `EntityStateLink`.

**Interface**
- accepts current/max/color/height/fillRef/thresholds.
- adds optional metadata props for `icon`, `title`, `showValue`, `formatValue`.
- remains presentational only.

#### Add: `src/ui/lib/atoms/fill-bar/FillBar.styles.ts`

**Responsibility**
- define the visual language for the new fillbar.

**Logic**
- frame is card-like.
- fill has wavy edge treatment.
- use theme tokens; no hard-coded spacing/sizing outside theme.
- include state styles required by both atom and molecule.

**Interface**
- emotion styles only.

#### Add: `src/ui/lib/atoms/fill-bar/types.ts`

**Responsibility**
- define the atom prop contract.

**Logic**
- keep the prop surface explicit and small.
- preserve the existing concepts already used by `ProgressBar`.

**Interface**
- shared type definitions only.

#### Add: `src/ui/lib/molecules/fill-slider/FillSlider.tsx`

**Responsibility**
- render the slider variant of the fillbar for interactive throttle control.

**Logic**
- compose the base fillbar visuals.
- wrap the whole slider in an existing `Card` shell.
- render the handle as a tiny card.
- light the whole slider from inside while dragging.
- use controlled-value semantics only.
- keep the interaction source as a native range input (possibly visually hidden/overlaid) so keyboard and pointer behavior remain native.

**Interface**
- accepts `value`, `min`, `max`, `step`, `onChange`, optional title/icon/value display props.
- emits only numeric value changes.
- no direct runtime command logic.

#### Add: `src/ui/lib/molecules/fill-slider/FillSlider.styles.ts`

**Responsibility**
- slider-specific layout/state styles.

**Logic**
- handle styling.
- drag-active glow styling.
- track/fill alignment with the base fillbar atom.

**Interface**
- emotion styles only.

#### Change: `src/ui/lib/atoms/progress-bar/ProgressBar.tsx`

**Responsibility**
- compatibility wrapper for existing feature code.

**Logic**
- delegate rendering to `FillBar`.
- preserve current prop names and behavior.
- continue to expose the inner fill element through `fillRef`.

**Interface**
- public API unchanged.

#### Change: `src/ui/lib/atoms/progress-bar/ProgressBar.styles.ts`

**Responsibility**
- removed or reduced to compatibility-only exports.

**Logic**
- if no longer used, delete and update imports.
- if still needed during migration, keep only wrapper-specific styles.

**Interface**
- must not remain a parallel design system.

#### Change: `src/ui/runtime/world/selection/job-card/JobCard.tsx`

**Responsibility**
- render the job throttle control.

**Logic**
- replace raw `ThrottleInput` with `FillSlider`.
- keep `usePowerSinkThrottle(...)` as the only source of throttle state and command emission.
- do not move throttle business logic into the molecule.

**Interface**
- component props unchanged.

#### Change: `src/ui/runtime/world/selection/SelectionCard.styles.ts`

**Responsibility**
- selection feature styles.

**Logic**
- remove `ThrottleInput` once unused.
- keep layout helpers only.

**Interface**
- no new business logic.

### Existing fillbar callers that must visually converge on the new base fillbar

These files should keep their feature logic but render through the new fillbar visuals (directly or through the `ProgressBar` compatibility wrapper):

- `src/ui/runtime/world/selection/absorption/AbsorptionCard.tsx`
- `src/ui/runtime/world/selection/body/BodyCardContent.tsx`
- `src/ui/runtime/world/selection/face/FaceCard.tsx`
- `src/ui/runtime/world/selection/cave/CaveSustainmentSection.tsx`
- `src/ui/runtime/world/selection/cave/CaveVitalsSection.tsx`
- `src/ui/runtime/world/selection/job-card/PowerMatrix.tsx`
- `src/ui/runtime/world/selection/job-card/ReservoirList.tsx`

For these files:

**Responsibility**
- keep feature-specific labels/data selection.

**Logic**
- switch to the new base visuals without changing their data semantics.
- continue using color overrides where already meaningful.
- retain `fillRef` usage where live DOM width updates are already wired.

**Interface**
- keep component props unchanged unless a file explicitly benefits from the new metadata slots.

### Optional authored-bar metadata extension

If authored `display.bars` must drive icon/title/value behavior directly, extend the schema.

#### Optional change: `src/data/schemas/components/display.ts`

**Responsibility**
- define authored display bar metadata.

**Logic**
- preserve existing `label` semantics.
- add only the minimum extra metadata needed by generic fillbars.
- do not add presentation fields that are not used.

**Interface**
- schema remains backward-compatible for existing bars.

This change is optional because the current request only requires the **component capability**, not that all authored bars immediately supply all metadata.

### Tests

#### Add: `src/ui/lib/atoms/fill-bar/FillBar.test.tsx`
- smoke: renders.
- display: current/max/title/icon render when enabled.
- negative: clamps visual width when max is zero or current is out of range.
- edge: preserves `fillRef` wiring.

#### Add: `src/ui/lib/molecules/fill-slider/FillSlider.test.tsx`
- display: renders card shell, handle, and current value.
- interaction: `onChange` receives numeric value from slider movement.
- state: drag-active class/state toggles internal light effect.

#### Change: `src/ui/runtime/world/selection/job-card/JobCard.test.tsx`
- assert the throttle renders through the new slider molecule.
- keep existing smoke case for malformed bars.

#### Add/update caller tests where bars are explicitly asserted
- `FaceCard.test.tsx`
- `BodyCard.test.tsx`
- `PowerMatrix.test.tsx`
- any cave card tests covering live bars

The tests must verify presentation/wiring, not fillbar internals.

---

## Change set 5 — Show body healthbar in swarm row

### Why

The row already has the live health data. Showing health only in the tooltip hides a key body-state signal.

### What

Add a compact health bar to each swarm row.

### How

#### Change: `src/ui/runtime/world/selection/swarm/SwarmRowItem.tsx`

**Responsibility**
- render the row summary.

**Logic**
- after XP/level and before attributes, render a compact health bar using the new base fillbar (or `ProgressBar` compatibility wrapper if that remains the chosen feature surface).
- use `data.liveHealth` and `data.liveMaxHealth` already returned by `useBodyCardData(...)`.
- do not duplicate selectors.

**Interface**
- component props unchanged.

#### Change: `src/ui/runtime/world/selection/swarm/SwarmCard.styles.ts`

**Responsibility**
- provide row spacing/layout for the compact healthbar.

**Logic**
- add a local row-level bar slot/container if needed.
- maintain row density and virtualization safety.

**Interface**
- local styles only.

### Tests

#### Change: `src/ui/runtime/world/selection/swarm/SwarmRowItem.test.tsx`
- assert the row contains the compact health bar in addition to the tooltip’s body card content.

#### Change: `src/ui/runtime/world/selection/SwarmCard.test.tsx`
- assert member rows render the health signal, not only status icons.

---

## Change set 6 — Allow initial values in storage

### Why

Current storage compilation always produces zero initial value. That prevents authored starting inventory such as a cracked egg spawning with prefilled storage after its cycle completes.

### What

Add one authored numeric field to storage ability config and compile it into the blueprint state.

### How

#### Change: `src/data/schemas/abilities/storage.ts`

**Responsibility**
- define storage ability authoring contract.

**Logic**
- add `initialValue` as a numeric field with default `0`.
- validate it as a non-negative number.
- keep the rest of the schema unchanged.

**Interface**
- `StorageAbilityConfig` gains `initialValue: number`.

#### Change: `src/ui/devtools/editors/blueprint/mode/abilityDrafts.ts`

**Responsibility**
- provide default draft values for new storage abilities.

**Logic**
- include `initialValue: 0` in `createStorageAbilityDraft()`.
- also bring the draft into full schema parity if any existing schema field is missing.

**Interface**
- draft shape updated to match schema.

#### Change: `src/ui/devtools/editors/blueprint/mode/forms/StorageAbilityForm.tsx`

**Responsibility**
- expose the new storage authoring field.

**Logic**
- add a numeric field for `Initial Value`.
- tooltip must state clearly that this is the starting stored amount on spawned entities.
- constrain authoring to non-negative values.

**Interface**
- form props unchanged.

#### Change: `src/engine/compiler/abilities/storageCompiler.ts`

**Responsibility**
- compile storage config into blueprint state/display metadata.

**Logic**
- initialize `components.state[resource].value` from `config.initialValue` instead of hard-coded zero.
- clamp the initial value into `[0, capacity.base]` during compilation.
- keep `max`, `allowDeposit`, `allowWithdraw`, `priority`, visibility, and bar generation behavior unchanged.
- do not add a new spawn-time mutation path.

**Interface**
- exported compiler signature unchanged.

#### No change required: `src/engine/runtime/handlers/SpawnHandler.ts`

**Reason**
- spawn already clones compiled blueprint state. Once storage compiler writes the authored value into blueprint state, spawned entities inherit it automatically.

### Tests

#### Change: `src/engine/compiler/abilities/storageCompiler.test.ts`
- happy path: authored `initialValue` is compiled into state.
- edge: value clamps to capacity when authored above capacity.
- edge: zero remains zero.
- negative: invalid negative value is rejected at schema/form layer, not silently accepted.

#### Add: `src/ui/devtools/editors/blueprint/mode/forms/StorageAbilityForm.test.tsx`
- smoke: field renders.
- interaction: numeric field writes to draft path.
- validation: negative input is rejected/normalized according to existing form behavior.

#### Add or extend a spawn/integration test
- verify a spawned entity inherits the compiled initial storage value without a special spawn override.

---

## File-by-file implementation summary

## Files to add

### UI atoms / molecules
- `src/ui/lib/atoms/app-icon/AppIcon.tsx`
- `src/ui/lib/atoms/app-icon/AppIcon.styles.ts`
- `src/ui/lib/atoms/fill-bar/FillBar.tsx`
- `src/ui/lib/atoms/fill-bar/FillBar.styles.ts`
- `src/ui/lib/atoms/fill-bar/types.ts`
- `src/ui/lib/molecules/fill-slider/FillSlider.tsx`
- `src/ui/lib/molecules/fill-slider/FillSlider.styles.ts`

### UI feature helpers
- `src/ui/runtime/world/selection/swarm/swarmStatusIcons.ts`

### Display/runtime helper
- `src/engine/phaser/display/displayActivity.ts`

### Tests
- `src/ui/lib/atoms/app-icon/AppIcon.test.tsx`
- `src/ui/lib/atoms/fill-bar/FillBar.test.tsx`
- `src/ui/lib/molecules/fill-slider/FillSlider.test.tsx`
- `src/engine/phaser/display/displayActivity.test.ts`
- `src/ui/devtools/editors/blueprint/mode/forms/StorageAbilityForm.test.tsx` (if absent)

## Files to change

### Icon route / swarm row
- `src/ui/devtools/state/selectors/selectAggregatedIcons.ts`
- `src/ui/devtools/shell/AppIconRegistryProvider.tsx`
- `src/ui/runtime/world/selection/swarm/SwarmRowItem.tsx`
- `src/ui/runtime/world/selection/swarm/SwarmCard.styles.ts`
- `src/ui/runtime/world/selection/swarm/SwarmRowItem.test.tsx`
- `src/ui/runtime/world/selection/SwarmCard.test.tsx`

### Styled node border
- `src/engine/phaser/display/modules/resolveStyledBackgroundRenderModel.ts`
- `src/engine/phaser/display/modules/resolveStyledBackgroundRenderModel.test.ts`

### Display activity gating
- `src/engine/phaser/display/DisplayInstanceManagerTick.ts`
- `src/engine/phaser/display/modules/glyphModuleRuntime.ts`
- `src/engine/phaser/display/modules/lightModuleDecorState.ts`
- display-related tests for those files

### Fillbar / throttle system
- `src/ui/lib/atoms/progress-bar/ProgressBar.tsx`
- `src/ui/lib/atoms/progress-bar/ProgressBar.styles.ts` (or delete if fully subsumed)
- `src/ui/runtime/world/selection/job-card/JobCard.tsx`
- `src/ui/runtime/world/selection/SelectionCard.styles.ts`
- visual callers that render bars:
  - `src/ui/runtime/world/selection/absorption/AbsorptionCard.tsx`
  - `src/ui/runtime/world/selection/body/BodyCardContent.tsx`
  - `src/ui/runtime/world/selection/face/FaceCard.tsx`
  - `src/ui/runtime/world/selection/cave/CaveSustainmentSection.tsx`
  - `src/ui/runtime/world/selection/cave/CaveVitalsSection.tsx`
  - `src/ui/runtime/world/selection/job-card/PowerMatrix.tsx`
  - `src/ui/runtime/world/selection/job-card/ReservoirList.tsx`
- related view tests for any of the above that assert bar output

### Storage initial value
- `src/data/schemas/abilities/storage.ts`
- `src/ui/devtools/editors/blueprint/mode/abilityDrafts.ts`
- `src/ui/devtools/editors/blueprint/mode/forms/StorageAbilityForm.tsx`
- `src/engine/compiler/abilities/storageCompiler.ts`
- `src/engine/compiler/abilities/storageCompiler.test.ts`
- spawn/integration test covering inheritance of compiled state

### Optional authored-bar metadata change
- `src/data/schemas/components/display.ts` only if generic authored bars must directly drive icon/title/value metadata.

---

## Test contract

Implementation is complete only when the following hold:

1. **Unit tests** cover all new pure helpers and compiler logic.
2. **Integration/display tests** verify pulse gating at the display layer without mocking away the real behavior contract.
3. **View tests** verify:
   - registry-backed swarm status icons render,
   - compact swarm-row healthbar renders,
   - fillbar/slider render and dispatch callbacks correctly,
   - existing cards still render valid bars.
4. Tests use Given/When/Then structure and factories where the project already expects them.
5. No UI test checks internal implementation details of the fillbar atom.

---

## Explicit non-goals

- no runtime mutation outside existing command/apply architecture.
- no new energy status enum.
- no speculative refactor of unrelated selection cards.
- no replacement of the live `fillRef`/`EntityStateLink` mechanism.
- no spawn-command payload changes for storage initialization.

---

## Known hard requirement that is not derivable from code alone

The exact visual asset payload for the cold/starving replacement icons is not present in the inspected code. The implementation must therefore use the verified in-game icon asset rather than guessing or substituting new art.

That is the only item in this design that requires asset verification outside the currently inspected source.
