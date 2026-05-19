# Lens Cards Fixes — Low-Level Design

## Scope

This document defines the implementation design for the following Lens Card fixes:

1. Nodes with Converters do not show their storage, even when storage has `visible=true`.
2. Nodes with decay in a visible storage must show the decay rate as `[icon][name][decay value]/s`.
3. Storage nodes do not update live; they appear to refresh only intermittently.
4. When a selected node is destroyed or changes semantic card type (example: Egg cycle completion), selection must clear.

This design is based on the code that exists in the repository. It does **not** introduce new gameplay behavior, new architectural patterns, or speculative refactors.

---

## Governing Constraints

This design must remain compliant with the project rules in the canonical context pack, prompt contract, and testing standards.

Implications for this work:

- UI remains observational only; it must not mutate simulation state directly.
- Mutable app state stays in existing stores/hooks/services; no business logic is introduced into `.tsx` views.
- Existing compiler/runtime contracts are reused where they already expose the needed data.
- Tests must verify behavior, use clear Given/When/Then structure, and stay colocated with the code they cover.

---

## Why

## Verified current behavior and root causes

### 1) Converter nodes miss storage because the Job card reads the wrong source

Observed code:

- `engine/runtime/handlers/SpawnHandler.ts` creates runtime entities from `cloneStatefulComponents(...)`.
- `engine/runtime/handlers/spawnCloneUtils.ts` shows that `display` and `behavior` are **not** cloned into runtime entities for normal spawned entities.
- `ui/runtime/world/selection/selectionUtils/entity.ts` already provides `resolveEntityDisplay(entity, runtime)` specifically to resolve flyweight display data from the blueprint when the runtime entity does not carry `display`.
- `ui/runtime/world/selection/job-card/ReservoirList.tsx` currently reads `entity.display?.bars` directly instead of using `resolveEntityDisplay(...)`.

Result:

- Converter/job nodes that rely on blueprint-owned `display.bars` do not surface storage bars in the Job card.
- This is a flyweight-resolution bug in the UI, not a compiler/runtime storage bug.

### 2) Decay already exists in runtime state, but the Lens Card UI ignores it

Observed code:

- `engine/compiler/abilities/storageCompiler.ts` emits visible storage bars into `display.bars` when storage is visible.
- `engine/compiler/abilities/storageEntropyCompiler.ts` compiles entropy/decay into hidden live state entries:
  - `vals_entropy_<resource>_<index>` = decay per second
  - `vals_entropy_tick_<resource>_<index>` = decay applied this tick
- The passive effect subtracts from `self.state.<resource>.value` using the compiled entropy state.

Result:

- The live decay rate already exists in the entity state contract.
- Lens Cards do not show it because storage bar resolution does not read the `vals_entropy_*` state entries.

### 3) Storage bars are only partially live

Observed code:

- `ui/runtime/world/selection/ResourceCard.tsx` resolves bars once from the `entity` prop via `resolveStorageAbilityBars(entity, runtime)`.
- `ui/runtime/world/selection/ability-display/AbilityBarDisplay.tsx` passes static `model.current`, `model.max`, `model.valueText`, and `model.tooltipLines` into `FillBar`.
- `ui/runtime/world/entity-state-link/EntityStateLinkContext.tsx` only updates the fill width of the bar DOM node via `requestAnimationFrame`; it does **not** update the text or tooltip model.

Result:

- The fill animation can move live.
- The value text, tooltip text, and any storage metadata derived from the model remain stale until React re-renders the card for some unrelated reason.

### 4) Selection does not clear because the selected entity is not actively guarded

Observed code:

- `ui/runtime/world/useSelectedEntity.ts` memoizes the selected entity from `runtime` and `selectedId` only.
- It does not subscribe to live runtime entity disappearance or semantic selection-lens changes.
- `ui/runtime/world/selection/selectionLensMap.ts` resolves lens identity from live entity state; for example, `resolvePowerSink(...)` intentionally hides depleted one-off sinks, which means a node can change from `job` lens to `resource` lens without changing selection id.

Result:

- If the selected entity is removed, replaced, or changes enough that its correct Lens Card is no longer the same semantic lens, the current selection remains stuck.

---

## What

## Required behavioral outcome

### A. Converter/job nodes must show visible storage

For any entity selected into the `job` lens:

- If the entity has visible authored storage bars, the Job card must show them.
- Storage resolution must work for both:
  - runtime-owned `display.bars`
  - blueprint-owned flyweight `display.bars`
- Non-storage bars must **not** appear in the storage section.

### B. Visible storage with decay must show a live decay rate

For each visible storage bar:

- If the effective live decay rate for that storage resource is greater than `0`, the Lens Card row must show `[icon][name][decay value]/s`.
- The decay value must be derived from the live compiled entropy state already present on the selected runtime entity.
- If the effective live decay rate is `0` or absent, no decay suffix is shown.

### C. Storage displays must update live

While a Lens Card is open for a storage-bearing entity:

- current amount
- max amount
- displayed fraction text
- tooltip text
- decay rate text

must update from live runtime state without waiting for unrelated React re-renders.

### D. Selection must clear when the selected node is no longer the same semantic target

Selection must clear when either of the following becomes true for the currently selected id:

1. `runtime.getEntity(selectedId)` returns no entity.
2. The entity still exists, but its resolved selection lens id is no longer the same lens id that was active when the selection began.
3. The entity id still exists, but the runtime entity instance has been replaced with a different runtime object for that same id.

The design does **not** change how selection is created. It only guards the validity of an existing selection.

---

## Non-goals

The following are explicitly out of scope:

- changing compiler behavior for storage visibility
- changing runtime mutation rules or ECS phase ordering
- changing lens priority order in `selectionLensMap.ts`
- inventing a new event bus for UI synchronization
- adding global React state for runtime entity snapshots
- changing game semantics for decay, storage, or one-off depletion

---

## How

## Design overview

The implementation reuses the existing contracts instead of inventing new ones:

- **Flyweight display resolution** stays anchored on `resolveEntityDisplay(...)`.
- **Live polling** stays anchored on the existing `useEntitySelector(...)` / `requestAnimationFrame` pattern already used in the UI.
- **Decay source of truth** stays anchored on compiled `state.vals_entropy_<resource>_<index>.value` entries.
- **Selection validity** stays anchored on the existing `resolveSelectionLens(...)` contract.

The implementation is split into two focused tracks:

1. **Storage presentation track**
   - make storage model resolution live
   - include compiled decay metadata in the storage model
   - reuse the same storage model path for Resource cards and Job cards

2. **Selection validity track**
   - actively guard the selected entity each frame
   - clear selection when the entity disappears, is replaced, or resolves to a different lens

---

## File-by-file design

### 1) `ui/runtime/world/selection/ability-display/abilityDisplay.types.ts`

**Change type:** modify

**Responsibility**

Define the UI contract for ability bar models.

**Required change**

Extend `AbilityBarModel` with one optional field:

- `titleMetaText?: string`

**Logic**

- `title` remains the authored storage name.
- `titleMetaText` carries the optional live decay suffix text, formatted as `<value>/s`.
- This keeps the storage model explicit and avoids overloading `title` with mixed concerns.

**Interface**

Current:

- `title: string`
- `valueText: string`

After change:

- `title: string`
- `titleMetaText?: string`
- `valueText: string`

**Why this file changes**

The storage bar model needs a dedicated contract slot for decay text so both Resource and Job storage rows can render the same resolved data without inventing ad hoc string parsing.

---

### 2) `ui/runtime/world/selection/ability-display/resolveStorageAbilityBars.ts`

**Change type:** modify

**Responsibility**

Resolve storage bar view models from a runtime entity and the runtime blueprint flyweight.

**Required change**

Keep the existing storage-bar resolution behavior, and add live decay-rate extraction per storage resource.

**Logic**

For each visible storage bar already resolved by the current function:

1. Determine the storage resource key from the bar path exactly as today.
2. Continue to require an actual storage-owned state entry (same current contract).
3. Resolve current and max exactly as today.
4. Resolve decay by scanning the entity state for keys matching:
   - `vals_entropy_<resource>_`
5. Sum every numeric `.value` found on matching entries.
6. If the summed decay rate is `> 0`:
   - set `titleMetaText` to `<formatted decay>/s`
   - append a tooltip line `Decay: <formatted decay>/s`
7. If the summed decay rate is `<= 0` or no matching entries exist:
   - omit `titleMetaText`
   - omit the decay tooltip line

**Important contract detail**

Decay must be derived from live compiled state, not reconstructed from editor config and not parsed from passive effect strings.

**Why sum matching entropy entries**

The compiler uses indexed entropy state keys. Multiple compiled entropy contributors for the same resource produce additive subtraction against the same storage resource. The UI must display the actual effective total decay rate, not just the first matching entry.

**Interface**

Unchanged function signature:

- `resolveStorageAbilityBars(entity: RuntimeEntity, runtime: Runtime | null): AbilityBarModel[]`

Changed returned model shape:

- each returned model may now include `titleMetaText`

**Why this file changes**

All storage UIs already depend on this resolver for bar construction. This is the correct place to attach compiled decay metadata to the storage view model.

---

### 3) `ui/runtime/world/selection/ability-display/AbilityBarDisplay.tsx`

**Change type:** modify

**Responsibility**

Render a single resolved ability bar model using existing `FillBar` and tooltip primitives.

**Required change**

Render `titleMetaText` alongside the existing icon + title heading without changing the bar-value contract.

**Logic**

- Keep `iconId` as the icon source.
- Keep `valueText` as the right-side value.
- Compose the left-side heading from:
  - icon
  - `title`
  - optional `titleMetaText`

This must reuse the existing `FillBar` title slot rather than introducing a second bar component.

**Interface**

No prop signature change.

- Input remains `model: AbilityBarModel`
- Rendering now respects optional `model.titleMetaText`

**Why this file changes**

The visual requirement is `[icon][name][decay value]/s`. `AbilityBarDisplay` is the single shared renderer that can apply that contract consistently for every storage bar.

---

### 4) `ui/runtime/world/selection/ability-display/useStorageAbilityBars.ts`

**Change type:** add

**Responsibility**

Provide a live, React-friendly storage bar model stream for a selected entity by reusing the existing polling selector mechanism.

**Why a new file is needed**

Both Resource cards and Job cards need the same live storage model behavior. The live resolution should exist in one place, not be duplicated across card components.

**Logic**

This hook must:

1. Accept:
   - `entity: RuntimeEntity`
   - `runtime: Runtime | null`
2. If `runtime` is null or `entity.id` is missing:
   - return the static fallback from `resolveStorageAbilityBars(entity, runtime)`
3. Otherwise use `useEntitySelector(...)` with the selected entity id and a selector that returns:
   - `resolveStorageAbilityBars(liveEntity, runtime)`
4. Use an explicit array comparer so React only re-renders when the storage presentation contract changes.

**Equality contract**

Two storage model arrays are equal only when all of the following match in order:

- array length
- each bar `id`
- `current`
- `max`
- `valueText`
- `title`
- `titleMetaText`
- `tooltipTitle`
- `tooltipLines`
- `iconId`
- `color`

**Interface**

- `useStorageAbilityBars(entity: RuntimeEntity, runtime: Runtime | null): AbilityBarModel[]`

**Why this file changes**

This is the smallest shared hook that turns the existing static resolver into a live UI data source while staying inside the project’s established `requestAnimationFrame` selector pattern.

---

### 5) `ui/runtime/world/selection/ability-display/StorageAbilityDisplay.tsx`

**Change type:** modify

**Responsibility**

Render a list of resolved storage ability bars.

**Required change**

Change the component to render pre-resolved models instead of resolving them internally.

**Logic**

- This component must become presentation-only.
- It must map `AbilityBarModel[]` to `AbilityBarDisplay`.
- It must return `null` when given an empty array.

**Interface**

Current:

- `entity: RuntimeEntity`
- `runtime: Runtime | null`

After change:

- `models: AbilityBarModel[]`

**Why this file changes**

This removes duplicated resolution work and keeps live data logic in the hook layer rather than inside a presentational component.

---

### 6) `ui/runtime/world/selection/ResourceCard.tsx`

**Change type:** modify

**Responsibility**

Render the resource-lens card for storage-only entities.

**Required change**

Use the new live storage model hook and pass the resolved models into `StorageAbilityDisplay`.

**Logic**

- Replace the current one-time `resolveStorageAbilityBars(entity, runtime)` call with `useStorageAbilityBars(entity, runtime)`.
- Use `models.length` to decide whether to show `No visible storage.`
- Pass the same `models` into `StorageAbilityDisplay`.

**Interface**

External props unchanged:

- `entity: RuntimeEntity`
- `runtime: Runtime | null`

Internal dependency change:

- consumes `useStorageAbilityBars(...)`
- passes `models` to `StorageAbilityDisplay`

**Why this file changes**

This is the resource-lens entry point. It must consume live storage data so the visible card content updates continuously.

---

### 7) `ui/runtime/world/selection/job-card/ReservoirList.tsx`

**Change type:** modify

**Responsibility**

Render the Job card’s storage section.

**Required change**

Stop reading raw `entity.display?.bars` and instead render only storage bars resolved from the shared live storage hook.

**Logic**

- Remove the current raw `display.bars` iteration.
- Remove the current `ProgressBar`-specific storage rendering path.
- Resolve storage bars through `useStorageAbilityBars(entity, runtime)`.
- Render those models using the same shared storage bar presentation contract as `ResourceCard`.
- If there are no storage bars, return `null`.

**Important behavior change**

This section must become **storage-only**.

It must not render:

- cycle bars
- absorption bars
- any non-storage display bar

Those concerns are already handled elsewhere in the Job card.

**Interface**

External props unchanged:

- `entity: RuntimeEntity`
- `runtime: Runtime | null`

Internal dependency change:

- consumes `useStorageAbilityBars(...)`
- renders shared storage bar display models

**Why this file changes**

This file is the direct source of the converter-node storage bug because it bypasses flyweight display resolution and treats all display bars as reservoirs.

---

### 8) `ui/runtime/world/useSelectedEntity.ts`

**Change type:** modify

**Responsibility**

Expose the selected runtime entity and selection actions to the Selection overlay.

**Required change**

Add an active selection-validity guard using existing runtime polling semantics.

**Logic**

When `runtime` and `selectedId` are both present:

1. Read the baseline entity once using `runtime.getEntity(selectedId)`.
2. If no entity exists at baseline:
   - immediately clear selection.
3. Resolve the baseline lens id using `resolveSelectionLens(baselineEntity, runtime)`.
4. Start a `requestAnimationFrame` loop.
5. On every frame:
   - read `runtime.getEntity(selectedId)`
   - if missing: clear selection and stop
   - if the runtime entity object reference is not the baseline object reference: clear selection and stop
   - resolve the current lens id
   - if the current lens id differs from the baseline lens id: clear selection and stop
6. Cancel the frame loop on cleanup.

**Selection validity contract**

A selected node is still valid only when all are true:

- same selected id
- entity still exists
- entity is the same runtime object instance
- resolved lens id is unchanged

**Returned data**

- `entity` must be resolved via `runtime.getEntity(selectedId)` instead of searching the sorted entity list
- `deselect` remains `selectEntity(null)`
- `killSelected` remains unchanged

**Interface**

External return shape remains unchanged:

- `runtime`
- `entity`
- `selectedId`
- `deselect()`
- `killSelected()`

**Why this file changes**

This is the narrowest place to add selection invalidation without pushing business logic into `SelectionOverlay.tsx`.

---

## Files intentionally not changed

### `ui/runtime/world/selection/selectionLensMap.ts`

No change.

Reason:

- lens priority order is not the bug
- the problem is that the selected entity is not being re-evaluated live, and Job storage rendering bypasses the shared storage resolution contract

### Engine/compiler runtime files

No change.

Reason:

- storage visibility data already exists
- entropy/decay state already exists
- flyweight display resolution already exists
- the defects are in UI consumption of those contracts

---

## Pseudocode

### Live storage bars

```text
hook useStorageAbilityBars(entity, runtime):
  if runtime is null or entity.id is missing:
    return resolveStorageAbilityBars(entity, runtime)

  liveBars = useEntitySelector(
    runtime,
    entity.id,
    (liveEntity) => resolveStorageAbilityBars(liveEntity, runtime),
    compareStorageBarArrays,
  )

  return liveBars ?? resolveStorageAbilityBars(entity, runtime)
```

### Storage decay resolution

```text
resolveStorageAbilityBars(entity, runtime):
  display = resolveEntityDisplay(entity, runtime)
  bars = display.bars

  for each bar in bars:
    if bar does not map to a storage-owned state entry:
      skip

    resource = resource key from bar path
    current = current live storage value
    max = current live storage max
    decayPerSecond = sum of state entries whose keys start with vals_entropy_<resource>_

    build AbilityBarModel:
      title = authored bar label or resource name
      titleMetaText = "<formatted decay>/s" only when decayPerSecond > 0
      valueText = current/max text
      tooltip includes decay line only when decayPerSecond > 0
```

### Selection validity guard

```text
useSelectedEntity():
  baselineEntity = runtime.getEntity(selectedId)
  baselineLensId = resolveSelectionLens(baselineEntity, runtime)?.id

  every animation frame:
    currentEntity = runtime.getEntity(selectedId)

    if currentEntity is missing:
      clear selection
      stop

    if currentEntity is not the same object as baselineEntity:
      clear selection
      stop

    currentLensId = resolveSelectionLens(currentEntity, runtime)?.id

    if currentLensId != baselineLensId:
      clear selection
      stop
```

---

## Test design

All tests remain colocated and must follow the existing behavioral testing contract.

### A. Unit tests

#### `ui/runtime/world/selection/ability-display/resolveStorageAbilityBars.test.ts`

Add cases:

1. **sums live decay across compiled entropy entries for one resource**
   - Given a storage bar for `food`
   - And state entries `vals_entropy_food_0.value = 0.5`, `vals_entropy_food_1.value = 1.25`
   - When resolving storage bars
   - Then `titleMetaText` is `1.75/s`
   - And tooltip includes `Decay: 1.75/s`

2. **omits decay text when total decay is zero**
   - Given matching entropy entries with zero total
   - Then `titleMetaText` is absent

3. **ignores unrelated entropy keys**
   - Given `vals_entropy_heat_0` while resolving `food`
   - Then food decay does not include heat

These tests are pure and require no DOM.

---

### B. View tests

#### `ui/runtime/world/selection/ResourceCard.test.tsx`

Add case:

1. **updates visible storage text live**
   - Given a runtime entity with `food.value = 10`
   - And a visible storage bar
   - When the runtime entity mutates to `food.value = 4`
   - Then the rendered storage text updates without remounting the card

#### `ui/runtime/world/selection/job-card/JobCard.test.tsx`

Add cases:

1. **shows storage for a flyweight converter node**
   - Given a job-lens entity with blueprint-owned visible storage bars and no runtime `display`
   - Then the Job card renders the storage row(s)

2. **does not render cycle as a reservoir row**
   - Given a job entity with both cycle and storage bars
   - Then only storage rows appear in the reservoir/storage section
   - And cycle remains shown only by `CycleAbilityDisplay`

3. **shows decay suffix for visible storage with compiled entropy state**
   - Given a storage bar and matching `vals_entropy_*` state
   - Then the rendered row includes the decay suffix text

#### `ui/runtime/world/SelectionOverlay.test.tsx`

Add cases:

1. **clears selection when selected entity is removed**
   - Given an initially selected entity
   - When the runtime no longer returns that entity id
   - Then `selectEntity(null)` is called
   - And the overlay disappears

2. **clears selection when selected entity changes lens**
   - Given an entity initially matched as `job`
   - And later its state mutates so `resolvePowerSink(...)` no longer returns a sink but visible storage still exists
   - Then selection is cleared

3. **clears selection when selected id is rebound to a different runtime object instance**
   - Given a selected id with one runtime entity object
   - When runtime returns a different object for the same id
   - Then selection is cleared

These are view/interaction tests because the observable contract is selection state and rendered overlay behavior.

---

## Acceptance criteria

The work is complete only when all of the following are true:

1. A converter node with visible storage displays that storage in the Job card even when the storage bars exist only on the blueprint flyweight.
2. Any visible storage row with positive live decay displays a decay suffix `<value>/s`.
3. Storage amount, max, tooltip text, and decay suffix update live while the card remains open.
4. If the selected entity disappears, is replaced, or changes selection-lens type, selection is cleared automatically.
5. No engine/runtime mutation rules are changed.
6. No lens-priority refactor is introduced.
7. All new/changed tests pass and remain aligned with the canonical testing contract.

---

## Risk notes

### Low risk

- storage decay data source already exists and is stable
- flyweight display resolution already exists and is stable
- `requestAnimationFrame` polling is already an accepted UI pattern in this codebase

### Main implementation risk

The only meaningful implementation risk is accidental duplication of storage-model logic across Resource and Job cards.

Mitigation:

- live storage model resolution must exist in exactly one shared hook
- storage row rendering must stay on the shared `AbilityBarDisplay` path

---

## Final implementation summary

The defects are all UI-consumption defects, not simulation defects.

The minimal compliant fix is:

- make storage model resolution live
- resolve Job-card storage through the same flyweight-aware storage path as Resource cards
- surface compiled entropy as a storage-row decay suffix
- actively invalidate selection when the selected entity is gone or no longer resolves to the same lens

This preserves the current runtime/compiler contracts, keeps business logic out of view components, and uses existing hooks/utilities/mechanisms wherever the repository already provides them.
