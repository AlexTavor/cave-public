# LLD — Lens Store/Selector Hydration and Node Overlay Hydration

## 1. Scope

This design introduces a store/selector hydration mechanism for every selection lens defined in `src/ui/runtime/world/selection/selectionLensMap.ts`, and a separate hydration mechanism for the node overlay subsystem.

The design is intentionally constrained to the current codebase. It reuses the existing runtime invalidation signals, existing pure resolver utilities, existing Zustand usage, the current selection lens map, and the current overlay model utilities.

The design does **not** change runtime mutation rules, ECS ownership, command flow, or selection matching.

## 2. Why this change is required

### 2.1 Current selection UI hydration is bottom-up and repetitive

The current selection UI allows many descendants to read runtime state independently.

Observed hot paths in the uploaded source tree:

- `src/ui/runtime/world/selection/useEntitySelector.ts`
  - Every selector re-runs on `runtimeViewTick`.
  - Each consumer owns its own React state and equality check.

- `src/ui/runtime/hooks/useEntityQuery.ts`
  - Re-resolves query contents on `runtimeViewTick`.
  - Clones entities and shallow-compares arrays every tick.

- `src/ui/runtime/world/selection/swarm/useSwarmMemberIds.ts`
  - Reads all bodies through `useEntityQuery(..., "body")` and derives member ids from the full result set.

- `src/ui/runtime/world/selection/body/useBodyCardData.ts`
  - Performs many independent `useEntitySelector(...)` reads for one body card.

- `src/ui/runtime/world/selection/job-card/JobCard.tsx`
  - Mixes live selectors, analysis derivation, storage bar derivation, and parent-section derivation inside one render path.

- `src/ui/runtime/world/selection/components/useParentSectionData.ts`
  - Scans all runtime entities on every `runtimeViewTick` for every parent section consumer.

This shape is the direct cause of card hydration fan-out.

### 2.2 Current overlay hydration is split across multiple independently recomputing hooks

Observed overlay hot paths in the uploaded source tree:

- `src/ui/runtime/world/node-overlays/useNodeOverlayModels.ts`
  - Starts its own `requestAnimationFrame` loop.
  - Recomputes node overlay entries every frame.

- `src/ui/runtime/world/node-overlays/useGuidanceCalloutModels.ts`
  - Starts a separate `requestAnimationFrame` loop.
  - Resolves runtime guidance and callout layout every frame.

- `src/ui/runtime/world/node-overlays/resolveNodeOverlayEntries.ts`
  - Scans `runtime.getEntities()`.
  - Resolves lens and overlay model per entity.
  - Projects every eligible entity to screen space.

- `src/ui/runtime/world/node-overlays/runtime-callouts/useRuntimeCalloutModels.ts`
  - Recomputes runtime callout positions independently.

- `src/ui/runtime/world/node-overlays/useScreenGuidanceModels.ts`
  - Recomputes screen guidance models independently.

- `src/ui/runtime/world/node-overlays/useCaveStatusOverlayPosition.ts`
  - Recomputes cave overlay position independently.

This creates multiple overlay data flows that read similar inputs separately.

## 3. Design goals

1. Hydrate each lens once per relevant invalidation instead of many times per descendant.
2. Keep all runtime/world reads out of presentational `.tsx` files.
3. Use Zustand stores and granular selectors, consistent with the project rules.
4. Use React context only to inject store instances, never to carry frequently changing hydrated data directly.
5. Preserve the existing `SelectionCardProps` and existing lens map contract.
6. Preserve existing pure utilities and action hooks where they are already correct.
7. Remove the overlay `requestAnimationFrame` loops and recompute overlays from existing invalidation signals instead.

## 4. Non-goals

1. No change to runtime/ECS mutation rules.
2. No change to selection lens matching priority.
3. No global “mega selection store”.
4. No change to `usePowerSinkThrottle` or `useAbsorptionActions` command semantics.
5. No visual redesign.
6. No optimization of icon/image export, tooltip rendering, or CSS layout outside the hydration boundary.

## 5. Common architecture contract

The same contract applies to every lens store and to the node overlay store.

### 5.1 Store lifecycle

Each lens card instance owns one local Zustand store instance.

- The store instance is created once per card mount.
- The store instance is provided to descendants through a local React context.
- The context carries the **store instance only**.
- Hydrated data lives in the Zustand store, not in React context.

This is dependency injection only.

### 5.2 Store state contract

Each lens store has the same minimal state shape:

- `data`
  - Type: `<Lens>CardData | null`
  - Meaning: the full hydrated snapshot for that lens instance.

- `setData(next)`
  - Replaces the current snapshot.

- `reset()`
  - Clears the snapshot to `null`.

There are no other store actions in the lens store.

The node overlay store uses the same pattern, except `data` is `OverlayViewportData` and the initial empty value is a fully empty object rather than `null`.

### 5.3 Hydration hook contract

Each lens gets one hydration hook.

Input:

- selected entity
- runtime
- store instance

Behavior:

- reads the existing invalidation signal from `useRuntimeStore((s) => s.runtimeViewTick)`
- resolves the full lens snapshot in one pass by calling a pure resolver
- writes the new snapshot into the local store
- clears the store when the card cannot render

The hydration hook does not expose UI data directly.

### 5.4 Resolver contract

Each resolver is a pure function.

Input:

- selected entity
- runtime
- any additional immutable inputs needed for that surface

Output:

- full `<Lens>CardData` snapshot
- `null` when the lens cannot render valid data

Rules:

- no React imports
- no Zustand imports
- no command emission
- no ECS mutation
- no DOM reads
- no silent fallback that masks missing required runtime state

### 5.5 Selector contract

Descendants must read from the local lens store through selectors only.

Rules:

- selectors may only read the local store state
- selectors must not read the runtime directly
- selectors must not allocate derived arrays or objects on every call
- selectors must not call resolver logic

### 5.6 Component contract

Each lens component is split into two roles.

Container role:

- create local store instance
- run hydration hook
- provide store via context
- render the lens view

View role:

- read hydrated data via store selectors
- wire existing action hooks where needed
- render presentational children

### 5.7 Invalidations

#### Selection lenses

All lens hydration hooks use `runtimeViewTick`.

This is grounded in the existing runtime invalidation mechanism already used across the selection UI.

#### Node overlays

Overlay hydration uses:

- `runtimeViewTick`
- `cameraRevision`
- viewport element width/height
- `runtimeCalloutStore` items
- overlay enabled flag

No overlay hydration uses `requestAnimationFrame`.

## 6. Shared cross-cutting changes

### 6.1 `src/ui/lib/foundation/layout/useElementSize.ts` — change

**Responsibility**

Provide live element width/height updates for overlay hydration.

**Current problem**

The current implementation reads size once and does not update on element resize.

**New logic**

- Keep the existing tuple interface: `[width, height]`
- Update size when the observed element changes size
- Use `ResizeObserver`
- Fall back to an immediate bounding box read on mount

**Interface**

Unchanged:

- input: `ref`
- output: `[width, height]`

**Why required**

Without this change, removing overlay `requestAnimationFrame` loops would drop resize responsiveness.

### 6.2 `src/ui/runtime/world/selection/components/resolveRuntimeParentSectionData.ts` — add

**Responsibility**

Resolve all data needed by `RuntimeParentSection` in one pure pass.

**Logic**

- read the selected entity once
- scan runtime entities once
- identify child entities by `parent.parentId`
- compute child label, icon id, own throttle, effective throttle, allocated draw
- compute aggregate draw totals
- compute `hasChildren` and `masterThrottle`

**Interface**

Input:

- `entityId`
- `runtime`

Output:

- `RuntimeParentSectionData`
  - `hasChildren`
  - `masterThrottle`
  - `aggregateAllocatedDraw`
  - `children[]`
    - `id`
    - `label`
    - `iconId`
    - `ownThrottle`
    - `effectiveThrottle`
    - `allocatedDraw`

### 6.3 `src/ui/runtime/world/selection/components/RuntimeParentSection.tsx` — change

**Responsibility**

Render parent/child relationship data only.

**New logic**

- no runtime reads
- no `useParentSectionData`
- no `runtimeViewTick` subscription
- render only from props

**Interface**

Input props:

- `data: RuntimeParentSectionData`
- `targetThrottle: number`
- `onChangeThrottle(value: number): void`

Output:

- rendered parent section
- returns `null` when `data.hasChildren` is `false`

### 6.4 `src/ui/runtime/world/selection/components/useParentSectionData.ts` — delete

**Reason**

Its runtime scanning behavior is replaced by `resolveRuntimeParentSectionData.ts` inside lens hydration.

## 7. Lens-by-lens design

## 7.1 Swarm lens

### Data contract

`SwarmCardData`

Fields:

- `memberCount`
- `totals`
- `rows[]`
  - `entityId`
  - `subjectId`
  - `fallbackIconId`
  - `liveLevel`
  - `attributes`
  - `liveHealth`
  - `liveMaxHealth`
  - `hasUnownedHabiti`
  - `statusIcons[]`
    - `traitId`
    - `iconId`

### Files

#### `src/ui/runtime/world/selection/swarm/swarmCardTypes.ts` — add

**Responsibility**

Define `SwarmCardData` and `SwarmRowData`.

**Logic**

Types only.

**Interface**

Exports:

- `SwarmCardData`
- `SwarmRowData`

#### `src/ui/runtime/world/selection/swarm/resolveSwarmCardData.ts` — add

**Responsibility**

Resolve the complete swarm snapshot in one pass.

**Logic**

- read all runtime entities once
- derive swarm member ids from bodies using the existing `resolveSwarmMemberIds(...)`
- resolve swarm totals from the selected swarm entity using the existing `resolveSwarmTotals(...)`
- for each member id, read the live body entity once
- derive body row fields using existing body selectors and existing swarm status icon logic
- derive habiti ownership once from `sys_world`
- return rows sorted by current member id order

**Interface**

Input:

- `entity`
- `runtime`

Output:

- `SwarmCardData | null`

#### `src/ui/runtime/world/selection/swarm/swarmCardStore.ts` — add

**Responsibility**

Own the local swarm card store instance and expose selector access.

**Logic**

- hold `data`
- expose `setData` and `reset`
- expose provider and selector hook

**Interface**

Exports:

- `createSwarmCardStore()`
- `SwarmCardStoreProvider`
- `useSwarmCardSelector(selector)`

#### `src/ui/runtime/world/selection/swarm/useHydrateSwarmCardStore.ts` — add

**Responsibility**

Hydrate the swarm card store from `runtimeViewTick`.

**Logic**

- subscribe to `runtimeViewTick`
- call `resolveSwarmCardData(...)`
- write snapshot to store
- clear store when runtime is absent

**Interface**

Input:

- `store`
- `entity`
- `runtime`

Output:

- none

#### `src/ui/runtime/world/selection/absorption/BodyBrickView.tsx` — add

**Responsibility**

Render a swarm/body-selector brick from already hydrated row data.

**Logic**

- render avatar, attributes, health, status icons, selection indicators, tooltip shell
- no body data selectors
- no swarm status selectors

**Interface**

Input props:

- `row: SwarmRowData`
- `runtime`
- `selected?`
- `showSelectionIndicators?`
- `onMouseDown?`
- `onMouseEnter?`

#### `src/ui/runtime/world/selection/swarm/SwarmCardView.tsx` — add

**Responsibility**

Render the swarm card from store selectors only.

**Logic**

- select `memberCount`, `totals`, and `rows`
- render `Virtuoso` from hydrated row models
- render each row with `BodyBrickView`

**Interface**

No props beyond the store provider context.

#### `src/ui/runtime/world/selection/swarm/SwarmCard.tsx` — change

**Responsibility**

Become the swarm card container.

**Logic**

- create local store once
- run `useHydrateSwarmCardStore(...)`
- render provider + `SwarmCardView`

**Interface**

Unchanged:

- `SelectionCardProps`

#### `src/ui/runtime/world/selection/swarm/useSwarmMemberIds.ts` — delete

**Reason**

Swarm membership resolution moves into `resolveSwarmCardData.ts`.

## 7.2 Body lens

### Data contract

Use the existing `BodyCardData` with one addition:

- `parentSectionData: RuntimeParentSectionData`

### Files

#### `src/ui/runtime/world/selection/body/bodyCardTypes.ts` — change

**Responsibility**

Extend the body card snapshot type.

**Logic**

Types only.

**Interface**

Add:

- `parentSectionData`

#### `src/ui/runtime/world/selection/body/resolveBodyCardData.ts` — add

**Responsibility**

Resolve body card data in one pure pass.

**Logic**

- resolve selection target id
- read target entity once
- derive level, xp, health, max health, attributes, display name, fallback icon id, habiti
- derive trait/modifier analysis using the existing pure entity-analysis utilities
- derive cave-owned habiti from `sys_world`
- derive `parentSectionData`

**Interface**

Input:

- `entity`
- `runtime`

Output:

- `BodyCardData | null`

#### `src/ui/runtime/world/selection/body/useBodyCardData.ts` — change

**Responsibility**

Remain the legacy body-data hook used by `BodyBrick`, but reduce it to a single per-tick snapshot read.

**Logic**

- subscribe once to `runtimeViewTick`
- call `resolveBodyCardData(...)`
- return the resolved snapshot
- remove all internal multi-selector fan-out

**Interface**

Unchanged.

#### `src/ui/runtime/world/selection/body/bodyCardStore.ts` — add

**Responsibility**

Own the local body card store instance.

**Logic**

Standard lens store contract.

**Interface**

Exports:

- `createBodyCardStore()`
- `BodyCardStoreProvider`
- `useBodyCardSelector(selector)`

#### `src/ui/runtime/world/selection/body/useHydrateBodyCardStore.ts` — add

**Responsibility**

Hydrate body card store from `runtimeViewTick`.

**Logic**

Standard lens hydration contract using `resolveBodyCardData(...)`.

**Interface**

Input:

- `store`
- `entity`
- `runtime`

#### `src/ui/runtime/world/selection/body/BodyCardView.tsx` — add

**Responsibility**

Select hydrated body data from the store and render `BodyCardContent`.

**Logic**

- select `data`
- return `null` when empty
- render `BodyCardContent`

**Interface**

No props beyond provider context.

#### `src/ui/runtime/world/selection/body/BodyCard.tsx` — change

**Responsibility**

Become the body card container.

**Logic**

Standard container contract.

**Interface**

Unchanged.

#### `src/ui/runtime/world/selection/body/BodyCardContent.tsx` — change

**Responsibility**

Render body content only.

**Logic**

- remove direct runtime dependency for parent section rendering
- render `RuntimeParentSection` from `data.parentSectionData`
- keep existing progress/ability subcomponents as-is

**Interface**

Input props:

- `data: BodyCardData`
- remove `runtime`

## 7.3 Face lens

### Data contract

`FaceCardData`

Fields:

- existing face fields from current `useFaceCardData.ts`
- `modifiers`
- `traits`
- `parentSectionData`

### Files

#### `src/ui/runtime/world/selection/face/faceCardTypes.ts` — add

**Responsibility**

Define the hydrated face card snapshot.

#### `src/ui/runtime/world/selection/face/resolveFaceCardData.ts` — add

**Responsibility**

Resolve the complete face card snapshot in one pass.

**Logic**

- resolve target body id
- resolve live face metrics from target entity once
- derive modifiers and traits with the existing analysis utilities
- derive `parentSectionData`

**Interface**

Input:

- `entity`
- `runtime`

Output:

- `FaceCardData`

#### `src/ui/runtime/world/selection/face/faceCardStore.ts` — add

Standard lens store contract.

#### `src/ui/runtime/world/selection/face/useHydrateFaceCardStore.ts` — add

Standard lens hydration contract.

#### `src/ui/runtime/world/selection/face/FaceCardView.tsx` — add

**Responsibility**

Render face card from selectors only.

#### `src/ui/runtime/world/selection/face/FaceCard.tsx` — change

Become the face card container.

#### `src/ui/runtime/world/selection/face/useFaceCardData.ts` — delete

**Reason**

Its selector fan-out is replaced by `resolveFaceCardData.ts` plus the lens store.

## 7.4 Cave lens

### Data contract

`CaveCardData`

Fields:

- existing cave fields from current `useCaveData.ts`
- `modifiers`
- `traits`
- `parentSectionData`

### Files

#### `src/ui/runtime/world/selection/cave/caveCardTypes.ts` — add

Define `CaveCardData`.

#### `src/ui/runtime/world/selection/cave/resolveCaveCardData.ts` — add

**Responsibility**

Resolve the cave card snapshot.

**Logic**

- resolve level, xp, population, comfort, owned habiti, effective attributes
- keep using `useEntityBarRef` in view-layer sections; do not move bar refs into the store
- derive modifiers and traits
- derive `parentSectionData`

**Interface**

Input:

- `entity`
- `runtime`

Output:

- `CaveCardData`

#### `src/ui/runtime/world/selection/cave/caveCardStore.ts` — add

Standard lens store contract.

#### `src/ui/runtime/world/selection/cave/useHydrateCaveCardStore.ts` — add

Standard lens hydration contract.

#### `src/ui/runtime/world/selection/cave/CaveCardView.tsx` — add

Render cave card from selectors only.

#### `src/ui/runtime/world/selection/cave/CaveCard.tsx` — change

Become the cave card container.

#### `src/ui/runtime/world/selection/cave/useCaveData.ts` — delete

**Reason**

Its hook-based hydration is replaced by `resolveCaveCardData.ts` and the lens store.

## 7.5 Job lens (including absorption branch)

### Data contract

`JobCardData` is a discriminated union.

Variant `assignment` fields:

- `variant`
- `label`
- `description`
- `narrativeText`
- `assignedIds`
- `duration`
- `isSelectorOpen`
- `requirements`

Variant `job` fields:

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

### Files

#### `src/ui/runtime/world/selection/job-card/jobCardTypes.ts` — add

Define `JobCardData`.

#### `src/ui/runtime/world/selection/job-card/resolveJobCardData.ts` — add

**Responsibility**

Resolve the complete job lens snapshot, including the absorption branch.

**Logic**

- if the entity has `assignment`, resolve assignment data using existing absorption helpers and existing requirement utilities
- otherwise resolve job data using existing job-analysis utilities, existing power-sink utilities, existing storage bar resolver, existing trait analysis, and `resolveRuntimeParentSectionData(...)`

**Interface**

Input:

- `entity`
- `runtime`

Output:

- `JobCardData | null`

#### `src/ui/runtime/world/selection/job-card/jobCardStore.ts` — add

Standard lens store contract.

#### `src/ui/runtime/world/selection/job-card/useHydrateJobCardStore.ts` — add

Standard lens hydration contract.

#### `src/ui/runtime/world/selection/job-card/JobCardView.tsx` — add

**Responsibility**

Render the correct job-lens branch from store selectors.

**Logic**

- select `data`
- branch by `data.variant`
- keep `usePowerSinkThrottle` only as an action/optimistic-ui hook in the view
- keep `useAbsorptionActions` only as an action hook in the assignment branch

#### `src/ui/runtime/world/selection/job-card/JobCard.tsx` — change

Become the job card container.

#### `src/ui/runtime/world/selection/absorption/AbsorptionCard.tsx` — change

**Responsibility**

Become a presentational assignment-card view.

**Logic**

- no runtime reads
- no `useAbsorptionData`
- render from hydrated assignment data props plus action callbacks

**Interface**

Input props:

- `data: JobCardData` where `variant = assignment`
- `onDispatchBodies(ids)`
- `onRecallBodies(ids)`
- `onOpenSelector()`
- `onCloseSelector()`
- `onConfirmBodies(ids)`
- `onCancelSelector()`
- `runtime` only where still required by `BodySelector`

#### `src/ui/runtime/world/selection/absorption/useAbsorptionData.ts` — delete

**Reason**

Its data responsibility moves into `resolveJobCardData.ts`.

#### `src/ui/runtime/world/selection/job-card/ReservoirList.tsx` — delete

**Reason**

`storageModels` are hydrated once into `JobCardData`; no separate container component is required.

## 7.6 Attribute-pool lens

### Data contract

`AttributePoolCardData`

Fields:

- `label`
- `attribute`
- `usage`
- `isOverloaded`

### Files

#### `src/ui/runtime/world/selection/resolveAttributePoolCardData.ts` — add

**Responsibility**

Resolve attribute-pool usage from runtime once per tick.

**Logic**

- validate the attribute key
- reuse existing `resolvePowerTotals(...)`
- format usage text with existing formatter

**Interface**

Input:

- `entity`
- `runtime`

Output:

- `AttributePoolCardData`

#### `src/ui/runtime/world/selection/attributePoolCardStore.ts` — add

Standard lens store contract.

#### `src/ui/runtime/world/selection/useHydrateAttributePoolCardStore.ts` — add

Standard lens hydration contract.

#### `src/ui/runtime/world/selection/AttributePoolCardView.tsx` — add

Render from selectors only.

#### `src/ui/runtime/world/selection/AttributePoolCard.tsx` — change

Become the attribute-pool card container.

#### `src/ui/runtime/world/selection/useAttributePoolCardData.ts` — delete

**Reason**

Its logic moves into `resolveAttributePoolCardData.ts` and the lens store.

## 7.7 Resource lens

### Data contract

`ResourceCardData`

Fields:

- `label`
- `description`
- `storageModels`

### Files

#### `src/ui/runtime/world/selection/resolveResourceCardData.ts` — add

**Responsibility**

Resolve resource card data from the selected entity and runtime.

**Logic**

- reuse existing `resolveEntityLabel(...)`
- reuse existing `resolveEntityDescription(...)`
- reuse existing pure `resolveStorageAbilityBars(...)`

**Interface**

Input:

- `entity`
- `runtime`

Output:

- `ResourceCardData`

#### `src/ui/runtime/world/selection/resourceCardStore.ts` — add

Standard lens store contract.

#### `src/ui/runtime/world/selection/useHydrateResourceCardStore.ts` — add

Standard lens hydration contract.

#### `src/ui/runtime/world/selection/ResourceCardView.tsx` — add

Render from selectors only.

#### `src/ui/runtime/world/selection/ResourceCard.tsx` — change

Become the resource card container.

#### `src/ui/runtime/world/selection/ability-display/useStorageAbilityBars.ts` — delete

**Reason**

Its only remaining consumers move to pure snapshot hydration using `resolveStorageAbilityBars(...)`.

## 7.8 Display lens

### Data contract

`DisplayCardData`

Fields:

- `label`
- `description`
- `subtitle`
- `parentSectionData`

### Files

#### `src/ui/runtime/world/selection/resolveDisplayCardData.ts` — add

**Responsibility**

Resolve display card data.

**Logic**

- reuse existing display and text resolvers
- derive `parentSectionData`

**Interface**

Input:

- `entity`
- `runtime`

Output:

- `DisplayCardData`

#### `src/ui/runtime/world/selection/displayCardStore.ts` — add

Standard lens store contract.

#### `src/ui/runtime/world/selection/useHydrateDisplayCardStore.ts` — add

Standard lens hydration contract.

#### `src/ui/runtime/world/selection/DisplayCardView.tsx` — add

Render from selectors only.

#### `src/ui/runtime/world/selection/DisplayCard.tsx` — change

Become the display card container.

## 7.9 Transfer lens

### Data contract

`TransferCardData`

Fields:

- `summary`
- `typeLabel`
- `valueLabel`
- `sourceLabel`
- `targetLabel`

### Files

#### `src/ui/runtime/world/selection/resolveTransferCardData.ts` — add

**Responsibility**

Resolve transfer card data.

**Logic**

- reuse current transfer formatting logic
- resolve source and target labels through runtime once per hydration pass

**Interface**

Input:

- `entity`
- `runtime`

Output:

- `TransferCardData`

#### `src/ui/runtime/world/selection/transferCardStore.ts` — add

Standard lens store contract.

#### `src/ui/runtime/world/selection/useHydrateTransferCardStore.ts` — add

Standard lens hydration contract.

#### `src/ui/runtime/world/selection/TransferCardView.tsx` — add

Render from selectors only.

#### `src/ui/runtime/world/selection/TransferCard.tsx` — change

Become the transfer card container.

## 8. Node overlay hydration design

### Data contract

`OverlayViewportData`

Fields:

- `nodeModels`
- `guidanceModels`
- `runtimeCalloutModels`
- `screenGuidanceModels`
- `caveStatusPosition`

All model types reuse the current existing overlay model types already used by the presentational overlay components.

### Behavior contract

A single hydration hook owns all overlay data preparation.

It recomputes when any of the following changes:

- overlay enabled state
- runtimeViewTick
- cameraRevision
- viewport width/height
- runtime callout items

There is no overlay `requestAnimationFrame` loop.

### Files

#### `src/ui/runtime/world/node-overlays/resolveOverlayViewportData.ts` — add

**Responsibility**

Resolve all overlay viewport data in one pure call.

**Logic**

- reuse `resolveNodeOverlayEntries(...)`
- reuse `filterVisibleNodeOverlayModels(...)`
- reuse `resolveRuntimeGuidances(...)`
- reuse `resolveGuidanceCalloutLayout(...)`
- resolve screen guidance models from the current runtime guidances
- resolve runtime callout positions from runtime callout items, camera state, and viewport size
- resolve cave overlay position from the current cave physics body, camera state, and viewport size

**Interface**

Input:

- `runtime`
- `cameraState`
- `viewportWidth`
- `viewportHeight`
- `runtimeCalloutItems`

Output:

- `OverlayViewportData`

#### `src/ui/runtime/world/node-overlays/nodeOverlayViewportStore.ts` — add

**Responsibility**

Own the local node overlay store instance and expose selectors.

**Logic**

- hold the current `OverlayViewportData`
- expose `setData` and `reset`
- expose provider and selector hook

**Interface**

Exports:

- `createNodeOverlayViewportStore()`
- `NodeOverlayViewportStoreProvider`
- `useNodeOverlayViewportSelector(selector)`

#### `src/ui/runtime/world/node-overlays/useHydrateNodeOverlayViewportStore.ts` — add

**Responsibility**

Hydrate the overlay store from the current runtime invalidation signals.

**Logic**

- read `runtimeViewTick`
- read `cameraRevision`
- read `runtimeCalloutStore` items
- read live viewport size from `useElementSize(rootRef)`
- call `resolveOverlayViewportData(...)`
- clear the store when overlays are disabled or runtime is absent

**Interface**

Input:

- `store`
- `rootRef`
- `enabled`

Output:

- none

#### `src/ui/runtime/world/node-overlays/NodeOverlayViewportView.tsx` — add

**Responsibility**

Render the overlay viewport from store selectors only.

**Logic**

- select `nodeModels`, `guidanceModels`, `runtimeCalloutModels`, and `caveStatusPosition`
- apply the existing attention/focus filter logic
- reuse existing presentational overlay cards
- reuse existing `filterNodeOverlayModelsByCallouts(...)`
- render `ScreenOverlay`

#### `src/ui/runtime/world/node-overlays/NodeOverlayViewport.tsx` — change

**Responsibility**

Become the overlay container.

**Logic**

- create local store once
- run `useHydrateNodeOverlayViewportStore(...)`
- provide store and render `NodeOverlayViewportView`

#### `src/ui/runtime/world/node-overlays/ScreenOverlay.tsx` — change

**Responsibility**

Render screen guidance from overlay store selectors only.

**Logic**

- remove `useScreenGuidanceModels(...)`
- select `screenGuidanceModels` from overlay store
- remain purely presentational

#### `src/ui/runtime/world/node-overlays/useNodeOverlayModels.ts` — delete

**Reason**

Replaced by the unified overlay hydration hook.

#### `src/ui/runtime/world/node-overlays/useGuidanceCalloutModels.ts` — delete

**Reason**

Replaced by the unified overlay hydration hook.

#### `src/ui/runtime/world/node-overlays/runtime-callouts/useRuntimeCalloutModels.ts` — delete

**Reason**

Replaced by the unified overlay hydration hook.

#### `src/ui/runtime/world/node-overlays/useScreenGuidanceModels.ts` — delete

**Reason**

Replaced by the unified overlay hydration hook.

#### `src/ui/runtime/world/node-overlays/useCaveStatusOverlayPosition.ts` — delete

**Reason**

Replaced by the unified overlay hydration hook.

## 9. Files explicitly unchanged

These files remain the source of truth and are reused by the new design:

- `src/ui/runtime/world/selection/selectionLensMap.ts`
- `src/ui/runtime/world/selection/selectionTypes.ts`
- `src/ui/runtime/state/useRuntimeStore.ts`
- `src/ui/runtime/state/viewInvalidationSlice.ts`
- `src/ui/runtime/world/context/WorldInteractionContext.tsx`
- `src/ui/runtime/world/node-overlays/resolveNodeOverlayEntries.ts`
- `src/ui/runtime/world/node-overlays/resolveNodeOverlayModel.ts`
- `src/ui/runtime/world/node-overlays/filterVisibleNodeOverlayModels.ts`
- `src/ui/runtime/world/node-overlays/filterNodeOverlayModelsByCallouts.ts`
- `src/ui/runtime/world/node-overlays/runtime-callouts/runtimeCalloutStore.ts`
- `src/ui/runtime/world/selection/usePowerSinkThrottle.ts`
- `src/ui/runtime/world/selection/absorption/useAbsorptionActions.ts`
- existing pure selection utils and analysis helpers

## 10. Test plan

The test plan follows the project testing contract: pure resolver logic gets unit tests; surface wiring gets view tests; no DOM-heavy business logic tests.

### 10.1 Shared tests

#### `src/ui/lib/foundation/layout/useElementSize.test.tsx` — add

Must verify:

- initial mount size is reported
- size updates when `ResizeObserver` reports changes
- cleanup disconnects the observer

#### `src/ui/runtime/world/selection/components/resolveRuntimeParentSectionData.test.ts` — add

Must verify:

- happy path with multiple children
- no-children result
- missing entity/runtime handling
- icon id fallback behavior

#### `src/ui/runtime/world/selection/components/RuntimeParentSection.test.tsx` — change

Must verify:

- presentational render from supplied props
- no runtime dependency remains
- throttle callback wiring remains correct

### 10.2 Lens resolver tests

Add one unit test file per new resolver file.

Each resolver test file must cover:

- happy path
- null/absent runtime or target handling
- empty/edge data shape handling
- stable rendering-relevant field selection only

Required new test files:

- `swarm/resolveSwarmCardData.test.ts`
- `body/resolveBodyCardData.test.ts`
- `face/resolveFaceCardData.test.ts`
- `cave/resolveCaveCardData.test.ts`
- `job-card/resolveJobCardData.test.ts`
- `resolveAttributePoolCardData.test.ts`
- `resolveResourceCardData.test.ts`
- `resolveDisplayCardData.test.ts`
- `resolveTransferCardData.test.ts`

### 10.3 Card/view tests

Existing card tests must be updated so they validate the container + store wiring rather than hook internals.

Files to change:

- `swarm/SwarmCard.test.tsx`
- `body/BodyCard.test.tsx`
- `face/FaceCard.test.tsx`
- `cave/CaveCard.test.tsx`
- `job-card/JobCard.test.tsx`
- `job-card/JobCard.storage.test.tsx`
- `job-card/JobCard.throttleVisibility.test.tsx`
- `absorption/AbsorptionCard.test.tsx`
- `AttributePoolCard.test.tsx`
- `ResourceCard.test.tsx`
- `ResourceCard.live.test.tsx`
- `TransferCard.test.tsx`

These tests must assert only:

- the correct data is visible
- the correct branch renders
- the correct action callbacks or action hooks are wired

They must not assert the internal store implementation.

### 10.4 Overlay tests

#### `src/ui/runtime/world/node-overlays/resolveOverlayViewportData.test.ts` — add

Must verify:

- node models are resolved from runtime entities
- guidance models are resolved from runtime guidances
- runtime callout positions are resolved from callout items
- screen guidance models are resolved
- cave status position is resolved
- empty runtime returns empty overlay data

#### `src/ui/runtime/world/node-overlays/NodeOverlayViewport.test.tsx` — change

Must verify:

- the viewport renders from the unified store data
- no `requestAnimationFrame` dependency remains
- the existing focus filtering still applies

#### Existing overlay tests to update as needed

- `NodeOverlayViewport.disabled.test.tsx`
- `NodeOverlayViewport.focus.test.tsx`
- `NodeOverlayViewport.guidance.test.tsx`
- `NodeOverlayViewport.guidanceAnchor.test.tsx`
- `NodeOverlayViewport.screenCalloutLayer.test.tsx`

These tests must continue to validate externally visible behavior only.

## 11. Implementation sequence

1. Update `useElementSize.ts` to provide live resize updates.
2. Add `resolveRuntimeParentSectionData.ts` and refactor `RuntimeParentSection.tsx` to presentational-only.
3. Implement body lens store/hydration first, because body data is reused by swarm row hydration.
4. Implement swarm lens store/hydration.
5. Implement job lens store/hydration, including the absorption branch.
6. Implement cave, face, attribute-pool, resource, display, and transfer lens stores.
7. Implement the unified overlay store/hydration and remove the overlay `requestAnimationFrame` hooks.
8. Remove superseded hook files.
9. Update tests.

## 12. Acceptance criteria

The implementation is complete only when all of the following are true:

1. Every lens component hydrates its snapshot through a local Zustand store and selectors.
2. No lens presentational view reads runtime/world data directly.
3. `RuntimeParentSection` no longer scans runtime state itself.
4. Node overlays hydrate through one store and one hydration hook.
5. No node overlay hook uses `requestAnimationFrame`.
6. Existing lens component external props remain unchanged.
7. Existing action hooks retain behavior.
8. All new resolver logic is covered by unit tests.
9. All existing view tests remain green after being updated to the new wiring.
10. No deleted file remains referenced anywhere in the tree.
