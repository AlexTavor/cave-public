# LLD — Phase 2 Hydration Invalidation for Selection Lenses and Node Overlays

## 1. Scope

This document defines the Phase 2 implementation required after the Phase 1 store/selector hydration refactor.

Phase 2 changes only the invalidation and equality behavior of:

- selection-card hydration per lens
- selection-related helper hooks that still wake on `runtimeViewTick`
- node overlay hydration
- the runtime UI invalidation slice that feeds those consumers

This document does **not** change:

- resolver business rules
- selection lens matching rules
- command handler behavior
- render composition of the card views
- `runtimeViewTick` itself as a general-purpose signal for existing out-of-scope consumers
- `useEntityQuery` and modal-only selection flows outside the selected-card and overlay path

## 2. Why

### 2.1 Observed failure after Phase 1

Phase 1 centralized hydration into local Zustand stores, but the frame cap did not improve.

The code path explains why:

1. every selected card hydration hook still subscribes to `runtimeViewTick`
2. every tick recomputes the full hydrated view-model for the selected surface
3. every hydration pass writes a fresh object into the local store
4. the store write has no equality guard
5. the view rerenders even when the selected node is visually unchanged
6. higher simulation speed produces more runtime ticks per second, therefore more hydration passes per second

The same failure exists in node overlays.

### 2.2 Root cause

The bottleneck is no longer leaf-level selector fan-out.

The bottleneck is now **surface-level polling**:

- card hydration is still invalidated by the simulation clock
- overlay hydration is still invalidated by the simulation clock
- several support hooks still wake on the simulation clock

The current Phase 1 store layer is therefore still executing this pipeline:

`simulation tick -> hydrate surface -> write local store -> rerender surface`

That is why FPS still falls as game speed rises, even for selected cards whose visible content appears static.

### 2.3 Required correction

Phase 2 must replace tick-driven UI invalidation with **mutation-driven invalidation**, while keeping the existing runtime architecture intact.

The UI must only recompute when one of these actually changes:

- an entity used by the current card or overlay changed
- entity topology changed and the current surface depends on entity discovery
- blueprint display/schema changed and the current surface depends on blueprint-backed display
- the camera changed
- viewport size changed
- runtime callout items changed

## 3. What

Phase 2 introduces four concrete changes.

### 3.1 Add a mutation invalidation lane to the runtime UI store

The runtime UI store will keep revision counters for:

- overall mutation batches
- per-entity changes
- entity-list topology changes
- blueprint changes

This lane is published from the existing `onCommandsApplied(...)` callback in `ui/runtime/state/runtimeFactory.ts`.

### 3.2 Make local hydrated stores equality-aware

Local hydration stores will stop publishing updates when the new hydrated data is display-equivalent to the current hydrated data.

This keeps the existing Phase 1 store shape and selector API, but removes unnecessary local store writes.

### 3.3 Replace `runtimeViewTick` dependencies with dependency plans

Each lens gets a hydration dependency plan resolver that declares exactly which entities and revisions invalidate that lens.

A shared hook converts that plan into a stable dependency token.

The existing `useHydrate*Store` hooks are changed to depend on that token instead of `runtimeViewTick`.

### 3.4 Split node overlay hydration into semantic invalidation and projection invalidation

Node overlays must stop rescanning and rebuilding semantic overlay models on every simulation tick.

Phase 2 will:

- rebuild semantic overlay entries only when relevant mutations occur
- project semantic entries to viewport positions when camera or viewport changes
- keep runtime callout and guidance layout projection in the viewport layer

## 4. Architectural constraints

This design adheres to the existing project contract:

- React continues to observe runtime state only
- mutable UI state remains in Zustand stores
- React Context remains dependency injection only
- business logic stays in hooks/services/resolvers, not `.tsx`

No shadow simulation state is introduced. The UI revision indices are invalidation metadata only.

## 5. Detailed design

## 5.1 Runtime mutation invalidation lane

### 5.1.1 New state contract

The runtime invalidation slice will expose the following additional state.

Pseudotype:

- `runtimeMutationRevision: number`
- `entityListRevision: number`
- `blueprintRevision: number`
- `entityRevisionById: Record<string, number>`
- `lastChangedEntityIds: string[]`

The slice will expose one new action.

Pseudotype:

- `publishRuntimeMutationSummary(summary: RuntimeMutationSummary): void`

### 5.1.2 RuntimeMutationSummary contract

`RuntimeMutationSummary` is a pure data object with exactly these fields:

- `changedEntityIds: string[]`
- `entityListChanged: boolean`
- `blueprintChanged: boolean`

No other fields are permitted.

### 5.1.3 Publication rules

`publishRuntimeMutationSummary(summary)` must behave exactly as follows:

1. Normalize `changedEntityIds` by removing empty ids, deduplicating, and sorting ascending.
2. If the normalized summary has:
   - zero changed ids
   - `entityListChanged === false`
   - `blueprintChanged === false`
   then the action must perform no state write.
3. Otherwise:
   - increment `runtimeMutationRevision` by `1`
   - set `lastChangedEntityIds` to the normalized changed ids
   - increment `entityRevisionById[id]` by `1` for every changed id
   - increment `entityListRevision` by `1` iff `entityListChanged === true`
   - increment `blueprintRevision` by `1` iff `blueprintChanged === true`
4. `resetViewInvalidation()` must reset all invalidation fields, including the new fields.

### 5.1.4 Command-to-summary mapping

A new pure helper resolves the summary from the command batch passed to `onCommandsApplied(...)`.

The mapping is exact and must be implemented as follows.

#### Always map direct entity ids when present

For command payload fields named `entityId`, `id`, `sourceId`, `targetId`, `proxyId`, `stationId`, `triggerEntityId`, and arrays of update records with `entityId`, the helper must add those ids to `changedEntityIds`.

#### Command-specific rules

- `SPAWN`
  - add `payload.id` if present
  - add `payload.parentId` if present
  - set `entityListChanged = true`
- `SPAWN_AUTOMATION`
  - set `entityListChanged = true`
- `KILL`
  - add `payload.entityId`
  - set `entityListChanged = true`
- `TRANSFER_ASSETS`
  - add `payload.sourceId`
  - add `payload.targetId`
  - if `payload.isImmediate !== true`, set `entityListChanged = true`
- `RESOLVE_TRANSFER`
  - add `payload.entityId`
  - set `entityListChanged = true`
- `CANCEL_TRANSFER`
  - add `payload.targetId`
- `PATCH_BLUEPRINT`
  - set `blueprintChanged = true`
- `POSITION_ENTITY`
  - add `payload.id`
- `UPDATE_ANCHOR`
  - add `payload.id`
- `SET_GLOBAL`
  - add `sys_world`
- `UPDATE_STATE`
  - add `payload.entityId`
- `ADJUST_STATE`
  - add `payload.entityId`
- `ADJUST_FACT`
  - add `sys_world`
- `UPDATE_AUTOMATION`
  - add `payload.entityId`
- `EXECUTE_AUTOMATION`
  - no ids; no flags
- `UPDATE_BODIES_BATCH`
  - add every `updates[i].entityId`
- `UPDATE_POWER_SINK`
  - add `payload.entityId`
- `UPDATE_CAVE`
  - add `payload.entityId`
- `UPDATE_ASSIGNMENT`
  - add `payload.entityId`
  - add every id in `payload.assignedIds`
- `DISPATCH_PROXY`
  - add `payload.entityId`
  - add `payload.targetId`
  - add `payload.originId` if present
  - set `entityListChanged = true`
- `RECALL_PROXY`
  - add `payload.proxyId`
- `ABSORB_BATCH`
  - add `payload.stationId`
  - add every id in `payload.killedEntityIds` when present
  - add `sys_world`
  - set `entityListChanged = true`
- `SET_TARGET`
  - add `payload.entityId`
  - add `payload.targetId` when non-null
- `GAME_DORMANCY`
  - add `sys_world`
- `AWAKEN_CAVE`
  - add `sys_world`
- `TRIGGER_DRAFT`
  - add `sys_world`
  - add `payload.triggerEntityId`
- `RESOLVE_DRAFT`
  - add `sys_world`
- `CLEAR_DRAFT`
  - add `sys_world`
- `SET_TUTORIAL_STATE`
  - add `sys_world`
- `SHOW_THOUGHT`
  - add `sys_world`
- `ACKNOWLEDGE_THOUGHT`
  - add `sys_world`
- `CLEAR_THOUGHT`
  - add `sys_world`
- `UPDATE_TRAITS_BATCH`
  - add every `updates[i].entityId`
- `SHOW_CINEMATIC`
  - no ids; no flags
- `SHOW_CUSTOM_NOTIFICATION`
  - no ids; no flags
- `ACKNOWLEDGE_HABITI_ANNOUNCEMENT`
  - add `sys_world`

No other behavior is permitted.

### 5.1.5 Integration point

`ui/runtime/state/runtimeFactory.ts` must call the new summary resolver inside the existing `onCommandsApplied(...)` callback and must publish the summary through the runtime store.

`runtimeViewTick` publication remains unchanged.

## 5.2 Equality-aware hydrated stores

### 5.2.1 Generic store contract

`ui/runtime/world/createHydratedDataStore.tsx` will be extended so the generic factory accepts an optional comparator.

Pseudointerface:

- input:
  - `label: string`
  - `initialData: T`
  - `isEqual?: (left: T, right: T) => boolean`
- output:
  - `createLocalStore()`
  - `HydratedDataStoreProvider`
  - `useHydratedDataSelector(...)`

### 5.2.2 Store write rules

`setData(next)` must behave exactly as follows:

1. Read current `data`.
2. If `isEqual` is supplied and `isEqual(current, next) === true`, do not write state.
3. Otherwise write `data = next`.

`reset()` must behave exactly as follows:

1. If `isEqual` is supplied and `isEqual(current, initialData) === true`, do not write state.
2. Otherwise write `data = initialData`.

This preserves the existing store API while preventing no-op writes.

## 5.3 Shared hydration dependency token

### 5.3.1 HydrationDependencyPlan contract

A new shared type defines the exact invalidation inputs for a hydrated surface.

Pseudotype:

- `entityIds: string[]`
- `includeEntityListRevision: boolean`
- `includeBlueprintRevision: boolean`

### 5.3.2 Token contract

A new shared hook converts a dependency plan into a stable dependency token.

Pseudointerface:

- input: `HydrationDependencyPlan`
- output: `string`

### 5.3.3 Token logic

The hook must behave exactly as follows:

1. Normalize `entityIds` by removing empty ids, deduplicating, and sorting ascending.
2. Read the current revision for each normalized id from `entityRevisionById`, defaulting missing ids to `0`.
3. Read `entityListRevision` only when `includeEntityListRevision === true`.
4. Read `blueprintRevision` only when `includeBlueprintRevision === true`.
5. Return a deterministic token composed from:
   - normalized entity ids
   - their current revisions in the same order
   - the included global revision values

The token must not depend on `runtimeViewTick`.

## 5.4 Selection lens hydration plans

Every lens receives one new hydration helper file. Each helper file owns two responsibilities:

1. dependency-plan resolution for that lens
2. display-equivalence comparison for that lens data

Each file must export exactly two symbols:

- `resolve<Feature>HydrationPlan(...)`
- `<feature>DataEqual(left, right)`

No hook code belongs in these files.

### 5.4.1 Display card

#### File to add

`src/ui/runtime/world/selection/displayCardHydration.ts`

#### Responsibility

Own the dependency plan and equality contract for `resolveDisplayCardData(...)`.

#### Logic

Dependency plan:

- include the selected entity id
- include all current child ids where `entry.parent.parentId === selected entity id`
- set `includeEntityListRevision = true`
- set `includeBlueprintRevision = true`

Rationale:

- display label, description, and subtitle can come from blueprint-backed display resolution
- parent section depends on child discovery and child display data

Equality contract:

Two display card data objects are equal iff all rendered text and parent-section render inputs are equal.

That includes:

- `label`
- `description`
- `subtitle`
- every field inside `parentSectionData`

#### Interface

- input to plan resolver: `(entity, runtime)`
- output: `HydrationDependencyPlan`
- comparator input: `(DisplayCardData | null, DisplayCardData | null)`
- comparator output: `boolean`

### 5.4.2 Resource card

#### File to add

`src/ui/runtime/world/selection/resourceCardHydration.ts`

#### Responsibility

Own the dependency plan and equality contract for `resolveResourceCardData(...)`.

#### Logic

Dependency plan:

- include the selected entity id only
- set `includeEntityListRevision = false`
- set `includeBlueprintRevision = true`

Rationale:

- label and description may be blueprint-backed
- storage bars are derived from the selected entity only

Equality contract:

Equal iff:

- `label` is equal
- `description` is equal
- `storageModels` are equal field-by-field in list order

Every `AbilityBarModel` field used by `StorageAbilityDisplay` must be compared.

#### Interface

Same shape as display-card hydration, using `ResourceCardData | null`.

### 5.4.3 Transfer card

#### File to add

`src/ui/runtime/world/selection/transferCardHydration.ts`

#### Responsibility

Own the dependency plan and equality contract for `resolveTransferCardData(...)`.

#### Logic

Dependency plan:

- include the selected transfer entity id
- include `transfer.sourceId` when present
- include `transfer.targetId` when present
- set `includeEntityListRevision = false`
- set `includeBlueprintRevision = false`

Rationale:

- the resolver depends only on the transfer entity and direct labels of source/target entities

Equality contract:

Equal iff:

- `summary`
- `typeLabel`
- `valueLabel`
- `sourceLabel`
- `targetLabel`

are all equal.

### 5.4.4 Attribute pool card

#### File to add

`src/ui/runtime/world/selection/attributePoolCardHydration.ts`

#### Responsibility

Own the dependency plan and equality contract for `resolveAttributePoolCardData(...)`.

#### Logic

Dependency plan:

- include the selected entity id
- include every current entity id that has `powerSource` or `powerSink`
- set `includeEntityListRevision = true`
- set `includeBlueprintRevision = false`

Rationale:

- the resolver calls `resolvePowerTotals(runtime.getWorld().entities)` across the world entity collection

Equality contract:

Equal iff:

- `label`
- `attribute`
- `usage`
- `isOverloaded`

are equal.

### 5.4.5 Cave card

#### File to add

`src/ui/runtime/world/selection/cave/caveCardHydration.ts`

#### Responsibility

Own the dependency plan and equality contract for `resolveCaveCardData(...)`.

#### Logic

Dependency plan:

- include `sys_world`
- include all current child ids where `entry.parent.parentId === sys_world`
- set `includeEntityListRevision = true`
- set `includeBlueprintRevision = true`

Rationale:

- the resolver reads cave data from `sys_world`
- parent section depends on children of `sys_world`
- parent child icons are blueprint-backed through `resolveEntityDisplay(...)`

Equality contract:

Equal iff all card render inputs are equal:

- `label`
- `targetId`
- `liveLevel`
- `liveXp`
- `liveXpMax`
- `livePopulation`
- `attributes`
- `liveComfort`
- `habiti`
- `modifiers`
- `traits`
- `parentSectionData`

For `modifiers` and `traits`, the file must reuse the existing analysis equality helper where applicable instead of reimplementing divergent logic.

### 5.4.6 Body card

#### File to add

`src/ui/runtime/world/selection/body/bodyCardHydration.ts`

#### Responsibility

Own the dependency plan and equality contract for `resolveBodyCardData(...)`.

#### Logic

Dependency plan:

- include the selected entity id
- include the resolved subject id from `resolveBodySelectionTargetId(...)` or direct body target selection resolution
- include `sys_world`
- include all current child ids where `entry.parent.parentId === subject id`
- set `includeEntityListRevision = true`
- set `includeBlueprintRevision = true`

Rationale:

- the resolver reads the selected entity, the subject body, `sys_world` owned habiti, and parent section children
- description and parent child icons can be blueprint-backed

Equality contract:

Equal iff all rendered body-card fields are equal:

- `subjectId`
- `displayName`
- `description`
- `fallbackIconId`
- `liveLevel`
- `liveXp`
- `liveXpMax`
- `liveHealth`
- `liveMaxHealth`
- `attributes`
- `modifiers`
- `traits`
- `habiti`
- `parentSectionData`

### 5.4.7 Face card

#### File to add

`src/ui/runtime/world/selection/face/faceCardHydration.ts`

#### Responsibility

Own the dependency plan and equality contract for `resolveFaceCardData(...)`.

#### Logic

Dependency plan:

- include the selected face entity id
- include the resolved target body id when present
- include all current child ids where `entry.parent.parentId === selected face entity id`
- set `includeEntityListRevision = true`
- set `includeBlueprintRevision = true`

Rationale:

- the resolver depends on the face entity, the targeted body entity, and face children in the parent section
- display text and icons can be blueprint-backed

Equality contract:

Equal iff all rendered face-card fields are equal:

- `label`
- `subtitle`
- `targetId`
- `liveLevel`
- `liveXp`
- `liveHealth`
- `liveMaxHealth`
- `liveAttributes`
- `maxXp`
- `modifiers`
- `traits`
- `parentSectionData`

### 5.4.8 Job card

#### File to add

`src/ui/runtime/world/selection/job-card/jobCardHydration.ts`

#### Responsibility

Own the dependency plan and equality contract for `resolveJobCardData(...)`.

#### Logic

The file must support both variants of `JobCardData`.

Dependency plan for `variant === "assignment"`:

- include the selected entity id
- include `sys_world`
- include every id in `assignedIds`
- set `includeEntityListRevision = true`
- set `includeBlueprintRevision = true`

Rationale:

- assignment requirements depend on assigned bodies and selector-open state in `sys_world`
- label/description remain blueprint-backed

Dependency plan for `variant === "job"`:

- include the selected entity id
- include all current child ids where `entry.parent.parentId === selected entity id`
- set `includeEntityListRevision = true`
- set `includeBlueprintRevision = true`

Rationale:

- the resolver depends on the job entity and its parent-section children
- label/description and child display data can be blueprint-backed

Equality contract for `variant === "assignment"`:

Equal iff:

- `variant`
- `label`
- `description`
- `narrativeText`
- `assignedIds`
- `duration`
- `isSelectorOpen`
- `requirements`

are equal.

Equality contract for `variant === "job"`:

Equal iff:

- `variant`
- `label`
- `description`
- `sink`
- `showsThrottle`
- `liveEfficiency`
- `analysis`
- `storageModels`
- `traits`
- `parentSectionData`

are equal.

`analysis` comparison must compare:

- `cycleCurrent`
- `cycleMax`
- `ticksRemaining`
- every `nextCycleGroups` item and nested effect field

### 5.4.9 Swarm card

#### File to add

`src/ui/runtime/world/selection/swarm/swarmCardHydration.ts`

#### Responsibility

Own the dependency plan and equality contract for `resolveSwarmCardData(...)`.

#### Logic

Dependency plan:

- include the selected swarm entity id
- include `sys_world`
- include every current entity id that has any of these components or tags used by swarm membership resolution:
  - `body`
  - `assignment`
  - `face`
  - `proxy`
- set `includeEntityListRevision = true`
- set `includeBlueprintRevision = false`

Rationale:

`resolveSwarmCardData(...)` computes membership from the world entity collection and must respond to:

- body entity changes
- assignment exclusions
- face assignment exclusions
- proxy exclusions
- topology changes
- owned habiti changes on `sys_world`

Equality contract:

Equal iff:

- `memberCount`
- `totals`
- `rows`

are equal, where every `SwarmRowData` field is compared:

- `entityId`
- `subjectId`
- `fallbackIconId`
- `liveLevel`
- `attributes`
- `liveHealth`
- `liveMaxHealth`
- `hasUnownedHabiti`
- `statusIcons`

## 5.5 Changes to existing card stores

Each existing card store file must be updated only to pass its comparator into `createHydratedDataStoreTools(...)`.

Files to change:

- `src/ui/runtime/world/selection/displayCardStore.ts`
- `src/ui/runtime/world/selection/resourceCardStore.ts`
- `src/ui/runtime/world/selection/transferCardStore.ts`
- `src/ui/runtime/world/selection/attributePoolCardStore.ts`
- `src/ui/runtime/world/selection/cave/caveCardStore.ts`
- `src/ui/runtime/world/selection/body/bodyCardStore.ts`
- `src/ui/runtime/world/selection/face/faceCardStore.ts`
- `src/ui/runtime/world/selection/job-card/jobCardStore.ts`
- `src/ui/runtime/world/selection/swarm/swarmCardStore.ts`

Responsibility change:

- no interface change to callers
- each store now enforces no-op suppression through its comparator

## 5.6 Changes to existing hydration hooks

Every existing `useHydrate*Store` hook listed below must stop reading `runtimeViewTick` and must instead:

1. compute the appropriate `HydrationDependencyPlan`
2. compute a dependency token from that plan
3. re-run hydration only when the token changes, or when the selected entity/runtime/store instance changes

Files to change:

- `src/ui/runtime/world/selection/useHydrateDisplayCardStore.ts`
- `src/ui/runtime/world/selection/useHydrateResourceCardStore.ts`
- `src/ui/runtime/world/selection/useHydrateTransferCardStore.ts`
- `src/ui/runtime/world/selection/useHydrateAttributePoolCardStore.ts`
- `src/ui/runtime/world/selection/cave/useHydrateCaveCardStore.ts`
- `src/ui/runtime/world/selection/body/useHydrateBodyCardStore.ts`
- `src/ui/runtime/world/selection/face/useHydrateFaceCardStore.ts`
- `src/ui/runtime/world/selection/job-card/useHydrateJobCardStore.ts`
- `src/ui/runtime/world/selection/swarm/useHydrateSwarmCardStore.ts`

Each hook retains its current public interface.

## 5.7 Selection support hooks still tied to `runtimeViewTick`

### 5.7.1 `useEntitySelector`

#### File to change

`src/ui/runtime/world/selection/useEntitySelector.ts`

#### Responsibility after change

Subscribe a component to one runtime entity slice by entity revision, not by runtime tick.

#### Logic

- replace the `runtimeViewTick` dependency with a dependency token for `[entityId]`
- do not change the existing external hook signature
- preserve the current `isEqual` contract
- preserve current initialization semantics

#### Interface

Unchanged.

### 5.7.2 `useSelectedEntity`

#### File to change

`src/ui/runtime/world/useSelectedEntity.ts`

#### Responsibility after change

Keep the selected entity valid against entity mutation, entity removal, and lens changes without waking on every runtime tick.

#### Logic

- remove direct dependency on `runtimeViewTick`
- use a dependency token for the selected id
- include entity-list revision because the selected entity may be removed
- include blueprint revision because lens resolution depends on blueprint-backed display/body/face/resource resolution
- keep the existing baseline-lens behavior exactly as-is

#### Interface

Unchanged.

### 5.7.3 `EntityStateLinkContext`

#### File to change

`src/ui/runtime/world/entity-state-link/EntityStateLinkContext.tsx`

#### Responsibility after change

Synchronize bar bindings only when registered entities are affected by a runtime mutation, not on every runtime tick.

#### Logic

- remove direct dependency on `runtimeViewTick`
- subscribe to `runtimeMutationRevision`, `lastChangedEntityIds`, and `entityListRevision`
- on register: keep the current immediate sync behavior
- on mutation:
  - if there are no registered bindings, do nothing
  - if `entityListRevision` changed, resync all bindings
  - otherwise resync only when `lastChangedEntityIds` intersects the registered binding entity ids

This preserves the existing imperative bar-update mechanism while removing tick polling.

#### Interface

Unchanged.

### 5.7.4 `useLiveNumericValue`

#### File to change

`src/ui/runtime/world/selection/cave/useLiveNumericValue.ts`

#### Responsibility after change

Update the cave numeric text nodes only when the referenced entity mutates.

#### Logic

- replace the `runtimeViewTick` dependency with a dependency token for `[entityId]`
- keep the current imperative text update behavior
- keep the current formatter contract

#### Interface

Unchanged.

## 5.8 Node overlays

## 5.8.1 Problem to solve

The current overlay path still does all of the following on each tick-driven hydration pass:

- resolves runtime guidances
n- scans all runtime entities
- resolves semantic node overlay models
- projects each overlay to screen space
- filters visible overlays
- computes runtime callout placement
- computes cave status position

Phase 2 must separate semantic invalidation from projection invalidation.

## 5.8.2 Overlay type split

#### File to change

`src/ui/runtime/world/node-overlays/nodeOverlayTypes.ts`

#### Responsibility after change

Define two distinct overlay model types:

1. semantic node overlay entry without viewport position
2. projected node overlay model with viewport position

#### Required types

- `ResolvedNodeOverlayEntry`
- `ResolvedNodeOverlayModel`

`ResolvedNodeOverlayModel` remains the view-facing projected type.

`ResolvedNodeOverlayEntry` contains:

- `entityId`
- `kind`
- `label`
- `valueText`
- optional `bar`

and no `position` field.

## 5.8.3 Full semantic scan helper

#### File to change

`src/ui/runtime/world/node-overlays/resolveNodeOverlayEntries.ts`

#### Responsibility after change

Perform a full semantic scan of the runtime world and return sorted `ResolvedNodeOverlayEntry[]`.

#### Logic

- iterate `runtime.getEntities()`
- for each entity, call `resolveNodeOverlayModel(entity, runtime)`
- if the result is non-null, emit a semantic entry with no position
- sort by `entityId`

This file must no longer depend on camera state or viewport dimensions.

#### Interface after change

Input:

- `runtime: Runtime`

Output:

- `ResolvedNodeOverlayEntry[]`

## 5.8.4 Viewport projection helper

#### File to change

`src/ui/runtime/world/node-overlays/resolveOverlayViewportData.ts`

#### Responsibility after change

Project already-resolved semantic node overlay entries into viewport data.

#### Logic

The file must stop calling `resolveNodeOverlayEntries(...)`.

Instead it must accept semantic entries as an explicit input and must:

- project node overlay positions using runtime physics bodies plus camera and viewport size
- filter visible node overlays
- resolve guidance callout layout
- resolve screen guidance models
- resolve runtime callout models
- resolve cave status position

#### Interface after change

Input:

- `runtime`
- `cameraState`
- `viewportWidth`
- `viewportHeight`
- `runtimeCalloutItems`
- `nodeEntries: ResolvedNodeOverlayEntry[]`

Output:

- `OverlayViewportData`

## 5.8.5 Overlay semantic cache coordinator

#### File to add

`src/ui/runtime/world/node-overlays/nodeOverlayViewportHydration.ts`

#### Responsibility

Own the Phase 2 overlay invalidation logic.

This file is the only place that decides when to:

- fully rebuild semantic overlay entries
- incrementally refresh semantic overlay entries for specific ids
- reproject the existing semantic entries without semantic rebuild
- compare viewport data for no-op suppression

#### Interface

The file must export exactly these four symbols:

- `buildNodeOverlayEntryIndex(runtime)`
- `applyNodeOverlayEntryChanges(index, runtime, changedEntityIds)`
- `overlayViewportDataEqual(left, right)`
- `resolveNodeOverlayViewportData(runtime, cameraState, width, height, runtimeCalloutItems, nodeEntries)`

`resolveNodeOverlayViewportData(...)` is a thin wrapper around the projection helper and exists to keep overlay-specific equality and projection wiring co-located.

#### Logic

`buildNodeOverlayEntryIndex(runtime)`:

- calls the updated `resolveNodeOverlayEntries(runtime)`
- returns an index keyed by entity id plus a sorted entry array

`applyNodeOverlayEntryChanges(index, runtime, changedEntityIds)`:

- for each changed entity id:
  - if the entity no longer exists, remove its entry from the index
  - if the entity exists, recompute `resolveNodeOverlayModel(entity, runtime)`
  - if the recomputed model is null, remove the entry
  - otherwise replace the entry for that id
- keep the indexed entry array sorted by `entityId`

Full rebuild is required when either of these occurs:

- `entityListRevision` changed
- `blueprintRevision` changed

Projection-only update is required when any of these occurs without semantic invalidation:

- `cameraRevision` changed
- viewport width changed
- viewport height changed
- runtime callout items changed

`overlayViewportDataEqual(left, right)` must compare all fields used by `NodeOverlayViewportView` and nested overlay views:

- `nodeModels`
- `guidanceModels`
- `runtimeCalloutModels`
- `screenGuidanceModels`
- `caveStatusPosition`

All nested fields must be compared by value.

## 5.8.6 Overlay hydration hook

#### File to change

`src/ui/runtime/world/node-overlays/useHydrateNodeOverlayViewportStore.ts`

#### Responsibility after change

Drive overlay hydration from mutation revisions, camera revision, viewport size, and runtime callout items.

#### Logic

The hook must:

- remove direct dependency on `runtimeViewTick`
- keep a semantic entry index in a ref local to the hook
- keep the last seen values of:
  - `entityListRevision`
  - `blueprintRevision`
  - `runtimeMutationRevision`
- on disabled or missing runtime: reset the store and clear the semantic cache
- on entity-list revision change: full rebuild semantic entries, then project viewport data
- on blueprint revision change: full rebuild semantic entries, then project viewport data
- on runtime-mutation revision change with only entity mutations: incrementally patch semantic entries using `lastChangedEntityIds`, then project viewport data
- on camera/size/runtime-callout change without semantic invalidation: project viewport data from the cached semantic entries only
- write viewport data through the comparator-aware local store

#### Interface

Unchanged.

## 5.8.7 Overlay store

#### File to change

`src/ui/runtime/world/node-overlays/nodeOverlayViewportStore.ts`

#### Responsibility after change

Pass `overlayViewportDataEqual` into the generic hydrated-store factory.

#### Interface

Unchanged.

## 6. File-by-file implementation list

## 6.1 Files to add

### Runtime state

1. `src/ui/runtime/state/resolveRuntimeMutationSummary.ts`
   - responsibility: pure command-batch to mutation-summary resolver
   - logic: exact command mapping defined in section 5.1.4
   - interface: exports `resolveRuntimeMutationSummary(commands)` and `RuntimeMutationSummary`

### Shared hydration

2. `src/ui/runtime/world/hydration/hydrationTypes.ts`
   - responsibility: shared hydration dependency types only
   - logic: no runtime logic
   - interface: exports `HydrationDependencyPlan`

3. `src/ui/runtime/world/useHydrationDependencyToken.ts`
   - responsibility: turn a dependency plan into a stable invalidation token
   - logic: exact normalization and revision-token rules defined in section 5.3.3
   - interface: exports `useHydrationDependencyToken(plan)`

### Selection lens hydration helpers

4. `src/ui/runtime/world/selection/displayCardHydration.ts`
5. `src/ui/runtime/world/selection/resourceCardHydration.ts`
6. `src/ui/runtime/world/selection/transferCardHydration.ts`
7. `src/ui/runtime/world/selection/attributePoolCardHydration.ts`
8. `src/ui/runtime/world/selection/cave/caveCardHydration.ts`
9. `src/ui/runtime/world/selection/body/bodyCardHydration.ts`
10. `src/ui/runtime/world/selection/face/faceCardHydration.ts`
11. `src/ui/runtime/world/selection/job-card/jobCardHydration.ts`
12. `src/ui/runtime/world/selection/swarm/swarmCardHydration.ts`
   - responsibility: per-lens dependency plan and equality contract
   - logic: exact per-lens rules from section 5.4
   - interface: exactly two exports per file, plan resolver and comparator

### Overlays

13. `src/ui/runtime/world/node-overlays/nodeOverlayViewportHydration.ts`
   - responsibility: semantic cache management, projection wiring, viewport equality
   - logic: exact overlay rules from section 5.8.5
   - interface: exactly four exports defined in section 5.8.5

## 6.2 Files to change

### Runtime store state

1. `src/ui/runtime/state/viewInvalidationSlice.ts`
   - add mutation revision state and publish action
   - keep `runtimeViewTick` and `cameraRevision`
   - reset all invalidation fields on reset

2. `src/ui/runtime/state/runtimeStoreTypes.ts`
   - extend store state and actions with the new invalidation fields and action
   - no other shape changes

3. `src/ui/runtime/state/runtimeFactory.ts`
   - publish `RuntimeMutationSummary` from `onCommandsApplied(...)`
   - keep current notification, callout, and effect pipelines intact
   - keep `publishRuntimeViewTick(...)` intact in the ticker callback

### Generic hydrated store

4. `src/ui/runtime/world/createHydratedDataStore.tsx`
   - add comparator support
   - suppress equal `setData(...)` and `reset()` writes
   - do not change provider or selector usage

### Selection support hooks

5. `src/ui/runtime/world/selection/useEntitySelector.ts`
6. `src/ui/runtime/world/useSelectedEntity.ts`
7. `src/ui/runtime/world/entity-state-link/EntityStateLinkContext.tsx`
8. `src/ui/runtime/world/selection/cave/useLiveNumericValue.ts`
   - remove `runtimeViewTick`-driven invalidation
   - use mutation-aware invalidation only
   - keep existing public APIs

### Card stores

9. `src/ui/runtime/world/selection/displayCardStore.ts`
10. `src/ui/runtime/world/selection/resourceCardStore.ts`
11. `src/ui/runtime/world/selection/transferCardStore.ts`
12. `src/ui/runtime/world/selection/attributePoolCardStore.ts`
13. `src/ui/runtime/world/selection/cave/caveCardStore.ts`
14. `src/ui/runtime/world/selection/body/bodyCardStore.ts`
15. `src/ui/runtime/world/selection/face/faceCardStore.ts`
16. `src/ui/runtime/world/selection/job-card/jobCardStore.ts`
17. `src/ui/runtime/world/selection/swarm/swarmCardStore.ts`
   - pass feature comparator to hydrated-store factory
   - no external interface changes

### Card hydration hooks

18. `src/ui/runtime/world/selection/useHydrateDisplayCardStore.ts`
19. `src/ui/runtime/world/selection/useHydrateResourceCardStore.ts`
20. `src/ui/runtime/world/selection/useHydrateTransferCardStore.ts`
21. `src/ui/runtime/world/selection/useHydrateAttributePoolCardStore.ts`
22. `src/ui/runtime/world/selection/cave/useHydrateCaveCardStore.ts`
23. `src/ui/runtime/world/selection/body/useHydrateBodyCardStore.ts`
24. `src/ui/runtime/world/selection/face/useHydrateFaceCardStore.ts`
25. `src/ui/runtime/world/selection/job-card/useHydrateJobCardStore.ts`
26. `src/ui/runtime/world/selection/swarm/useHydrateSwarmCardStore.ts`
   - replace `runtimeViewTick` dependency with dependency-plan token
   - keep resolver invocation and reset behavior intact

### Overlays

27. `src/ui/runtime/world/node-overlays/nodeOverlayTypes.ts`
28. `src/ui/runtime/world/node-overlays/resolveNodeOverlayEntries.ts`
29. `src/ui/runtime/world/node-overlays/resolveOverlayViewportData.ts`
30. `src/ui/runtime/world/node-overlays/nodeOverlayViewportStore.ts`
31. `src/ui/runtime/world/node-overlays/useHydrateNodeOverlayViewportStore.ts`
   - split semantic invalidation from viewport projection
   - remove tick-driven overlay hydration
   - keep view-facing store contract unchanged

## 6.3 Files explicitly unchanged

The following files are intentionally unchanged in Phase 2:

- all resolver business-logic files for the existing cards
- all `.tsx` card view components except for consuming the same store selectors they already use
- `ui/runtime/state/simulationSlice.ts`
- `ui/runtime/world/selection/body/useBodyCardData.ts`
- `ui/runtime/hooks/useEntityQuery.ts`
- `ui/runtime/world/selection/absorption/useBodySelector.ts`

Reason:

Phase 2 is limited to the selected-card and node-overlay invalidation path. These files are outside that scope or do not need interface changes to achieve the Phase 2 goal.

## 7. Test plan

All tests must follow the existing testing contract:

- pure logic in unit tests
- store and hook wiring in view tests
- Given / When / Then structure
- real data factories where possible

## 7.1 New unit tests

1. `src/ui/runtime/state/resolveRuntimeMutationSummary.test.ts`
   - happy path: maps direct entity ids correctly
   - happy path: flags topology-changing commands correctly
   - happy path: flags blueprint changes only for `PATCH_BLUEPRINT`
   - negative path: ignores commands with no entity effect
   - edge case: deduplicates repeated ids
   - edge case: filters empty ids

2. `src/ui/runtime/world/useHydrationDependencyToken.test.tsx`
   - happy path: token changes when a tracked entity revision changes
   - happy path: token changes when included entity-list revision changes
   - happy path: token changes when included blueprint revision changes
   - negative path: token does not change for unrelated entity revisions
   - edge case: duplicate ids in the plan do not affect the token

3. `src/ui/runtime/world/createHydratedDataStore.test.tsx`
   - happy path: unequal data writes a new store value
   - happy path: equal data does not write
   - edge case: reset does not write when already at initial state
   - edge case: reset writes when current data differs from initial data

4. `src/ui/runtime/world/selection/displayCardHydration.test.ts`
5. `src/ui/runtime/world/selection/resourceCardHydration.test.ts`
6. `src/ui/runtime/world/selection/transferCardHydration.test.ts`
7. `src/ui/runtime/world/selection/attributePoolCardHydration.test.ts`
8. `src/ui/runtime/world/selection/cave/caveCardHydration.test.ts`
9. `src/ui/runtime/world/selection/body/bodyCardHydration.test.ts`
10. `src/ui/runtime/world/selection/face/faceCardHydration.test.ts`
11. `src/ui/runtime/world/selection/job-card/jobCardHydration.test.ts`
12. `src/ui/runtime/world/selection/swarm/swarmCardHydration.test.ts`
   - happy path: dependency plan includes exactly the ids/revision flags defined in section 5.4
   - happy path: comparator returns true for display-equivalent data
   - negative path: comparator returns false when any rendered field differs
   - edge case: null handling where applicable

13. `src/ui/runtime/world/node-overlays/nodeOverlayViewportHydration.test.ts`
   - happy path: full semantic rebuild returns sorted entry index
   - happy path: incremental update patches changed ids only
   - happy path: projection returns viewport data from cached semantic entries
   - negative path: removing an entity removes its semantic entry
   - edge case: unchanged viewport data compares equal

## 7.2 Updated unit tests

1. `src/ui/runtime/state/viewInvalidationSlice.test.ts`
   - add assertions for mutation revisions, entity revisions, entity-list revision, blueprint revision, and reset behavior

2. `src/ui/runtime/world/node-overlays/resolveNodeOverlayEntries.test.ts`
   - update to the new semantic-entry contract with no position field and no camera input

## 7.3 View and hook tests

1. `src/ui/runtime/world/selection/useEntitySelector.test.tsx`
   - verify rerun occurs on tracked entity mutation
   - verify rerun does not occur on unrelated mutation

2. `src/ui/runtime/world/useSelectedEntity.test.tsx`
   - if the file does not exist, add it
   - verify selected entity is preserved across unrelated mutations
   - verify selected entity is cleared when the selected entity is removed
   - verify selected entity is cleared when the resolved lens changes after entity or blueprint mutation

3. `src/ui/runtime/world/entity-state-link/EntityStateLinkContext.test.tsx`
   - if the file does not exist, add it
   - verify register triggers immediate sync
   - verify unrelated entity mutation does not resync bindings
   - verify tracked entity mutation resyncs bindings
   - verify entity-list revision resyncs all bindings

4. `src/ui/runtime/world/selection/cave/useLiveNumericValue.test.tsx`
   - if the file does not exist, add it
   - verify text updates on tracked entity mutation only

5. Representative hydration hook tests:
   - `src/ui/runtime/world/selection/body/useHydrateBodyCardStore.test.tsx`
   - `src/ui/runtime/world/selection/job-card/useHydrateJobCardStore.test.tsx`
   - `src/ui/runtime/world/selection/swarm/useHydrateSwarmCardStore.test.tsx`
   - `src/ui/runtime/world/node-overlays/useHydrateNodeOverlayViewportStore.test.tsx`

Each representative hook test must verify:

- hydration runs on initial mount
- unrelated mutation does not trigger a store write
- tracked mutation does trigger a store write
- equal hydrated output does not trigger a second store write

## 7.4 Updated store-level tests

1. `src/ui/runtime/state/useRuntimeStore.test.ts`
   - extend reset/load/unload assertions to include the new invalidation fields

No other existing tests are in scope unless they fail because of the explicit interface changes defined above.

## 8. Acceptance criteria

Phase 2 is complete only when all of the following are true.

1. No selected-card hydration hook depends on `runtimeViewTick`.
2. `useEntitySelector`, `useSelectedEntity`, `EntityStateLinkContext`, and `useLiveNumericValue` no longer depend on `runtimeViewTick`.
3. Node overlay hydration no longer depends on `runtimeViewTick`.
4. The runtime store publishes mutation summaries from `onCommandsApplied(...)`.
5. Local hydrated stores suppress equal writes.
6. All new hydration helpers exist and define exact dependency plans and equality contracts.
7. Tests cover the new mutation-summary logic, dependency-token logic, equality-aware store behavior, per-lens dependency plans, and overlay semantic caching.
8. All tests are green.
9. No `.tsx` file gains business logic beyond selecting and rendering already-hydrated state.

## 9. Implementation order

The required implementation order is:

1. add runtime mutation summary and invalidation slice support
2. add equality-aware hydrated-store support
3. add dependency-token support
4. convert `useEntitySelector`, `useSelectedEntity`, `EntityStateLinkContext`, and `useLiveNumericValue`
5. add per-lens hydration helper files
6. convert each card store and hydration hook
7. convert overlays last
8. update and add tests in the same order

This order is mandatory because each later phase depends on the previous phase being in place.
