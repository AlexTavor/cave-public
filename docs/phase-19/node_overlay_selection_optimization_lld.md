# LLD: Node Overlay Selection Optimization

## Basis

This design is based on direct inspection of the uploaded source tree. The ZIP was not indexed by `file_search` in this session, so the references below are source-path and line-range references from the uploaded code.

Primary source files inspected:

- `src/ui/runtime/world/node-overlays/useNodeOverlayViewportData.ts:17-66`
- `src/ui/runtime/world/node-overlays/resolveNodeOverlayEntries.ts:5-14`
- `src/ui/runtime/world/node-overlays/nodeOverlayViewportHydration.ts:13-136`
- `src/ui/runtime/world/node-overlays/overlayViewportModels.ts:53-175`
- `src/ui/runtime/world/node-overlays/NodeOverlayViewportView.tsx:12-60`
- `src/ui/runtime/world/node-overlays/NodeOverlayCard.tsx:16-53`
- `src/ui/runtime/world/node-overlays/NodeOverlayViewport.styles.ts:14-64`
- `src/ui/runtime/world/node-overlays/nodeOverlayTypes.ts:3-26`
- `src/ui/runtime/hooks/useRuntimeRevisionToken.ts:20-66`
- `src/ui/runtime/hooks/useRuntimeSelector.ts:7-24`
- `src/ui/runtime/world/entity-state-link/EntityStateLinkContext.tsx:26-116`
- `src/ui/runtime/world/entity-state-link/entityStateLinkRuntime.ts:18-75`
- `src/engine/runtime/RuntimeInvalidationService.ts:21-86`
- `src/engine/runtime/runtimeInvalidationService.helpers.ts:22-43`
- `src/engine/runtime/runtimeInvalidationTypes.ts:1-31`
- `src/engine/runtime/RuntimeCore.ts:26-55`

Behavioral contract sources:

- `src/ui/runtime/world/node-overlays/NodeOverlayViewport.test.tsx:41-99`
- `src/ui/runtime/world/node-overlays/NodeOverlayViewport.disabled.test.tsx:38-58`
- `src/ui/runtime/world/node-overlays/NodeOverlayViewport.focus.test.tsx:35-62`
- `src/ui/runtime/world/node-overlays/NodeOverlayViewport.guidance.test.tsx:37-112`
- `src/ui/runtime/world/node-overlays/NodeOverlayViewport.screenCalloutLayer.test.tsx:92-132`
- `src/ui/runtime/world/node-overlays/resolveNodeOverlayEntries.test.ts:11-49`
- `src/ui/runtime/world/node-overlays/filterVisibleNodeOverlayModels.test.ts:5-47`
- `src/ui/runtime/world/node-overlays/resolveNodeOverlayModel.test.ts:8-123`

---

## 1. Why

### 1.1 Current problem

The current node-overlay root subscribes to a broad runtime token and fully rebuilds overlay entry data whenever that token changes.

Current flow:

1. `useNodeOverlayViewportData` subscribes with:
   - `entityIds: []`
   - `includeEntityListRevision: true`
   - `includeBlueprintRevision: true`
   - `includeMutationRevision: true`
   (`useNodeOverlayViewportData.ts:24-29`)
2. On any token change, it calls `resolveNodeOverlayEntries(runtime)` (`useNodeOverlayViewportData.ts:48-58`).
3. `resolveNodeOverlayEntries` scans `runtime.getEntities()` and resolves every overlay-capable entity from scratch, then sorts all results by `entityId` (`resolveNodeOverlayEntries.ts:8-14`).
4. `resolveOverlayViewportData` then projects all selected entries to screen-space models (`resolveOverlayViewportData.ts:37-78`, `overlayViewportModels.ts:53-74`).

This makes node overlay selection cost proportional to **all runtime mutations**, not to **overlay-relevant mutations**.

### 1.2 What is already available and should be reused

The codebase already contains the core mechanism needed for incremental selection:

- `buildNodeOverlayEntryIndex(runtime)` builds a keyed index once (`nodeOverlayViewportHydration.ts:39-47`)
- `applyNodeOverlayEntryChanges(index, runtime, changedEntityIds)` updates a keyed index by changed entity ID (`nodeOverlayViewportHydration.ts:49-64`)
- runtime invalidation exposes `getLastChangedEntityIds()` and per-scope revisions (`RuntimeInvalidationService.ts:26-35`, `runtimeInvalidationTypes.ts:9-21`)
- `EntityStateLinkContext` already demonstrates the intended pattern: check `lastChangedEntityIds`, short-circuit when no registered entity changed, and sync only registered bindings (`EntityStateLinkContext.tsx:61-97`)

The missing piece is that the node overlay viewport does not use that incremental path.

### 1.3 Constraints from existing behavior

The optimization must preserve the current functional contract:

- overlays render when enabled (`NodeOverlayViewport.test.tsx:41-99`)
- overlays do not render when disabled (`NodeOverlayViewport.disabled.test.tsx:38-58`)
- overlay entry ordering is by `entityId` (`resolveNodeOverlayEntries.test.ts:11-37`)
- visibility rules remain unchanged (`filterVisibleNodeOverlayModels.test.ts:5-47`)
- focus filtering remains unchanged (`NodeOverlayViewport.focus.test.tsx:35-62`)
- guidance/screen-callout behavior remains unchanged (`NodeOverlayViewport.guidance.test.tsx:37-112`, `NodeOverlayViewport.screenCalloutLayer.test.tsx:92-132`)

### 1.4 Design objective

Reduce React work and runtime selection work for node overlays by ensuring that:

1. unrelated mutations do not trigger a full overlay entry scan
2. unchanged overlay entries retain object identity
3. unchanged node overlay cards do not rerender when sibling entries change
4. the design uses existing invalidation and hydration mechanisms instead of introducing polling

---

## 2. What

### 2.1 In scope

This change optimizes **node overlay selection and reconciliation** only.

In scope:

- incremental node overlay entry selection
- stable entry references for unchanged entities
- stable node model references when selected node data is unchanged
- memoized node overlay card rendering using render-relevant equality

### 2.2 Out of scope

Out of scope for this LLD:

- changing overlay visual design
- changing guidance selection rules
- changing screen callout layering
- changing cave status behavior
- adding a fixed 16 ms / 33 ms polling loop
- moving overlay positioning off React
- changing countdown formatting or throttling display cadence

Those are separate concerns.

---

## 3. How

## 3.1 Target architecture

### 3.1.1 New selection split

The viewport data path will be split into two lanes:

1. **Node model lane**
   - optimized
   - incremental
   - driven by selected overlay entries
2. **Auxiliary overlay lane**
   - unchanged behavior
   - guidance models, runtime callouts, screen callouts, cave status

This split is required because `useNodeOverlayViewportData` currently bundles node models together with guidance/callout/cave-status data (`resolveOverlayViewportData.ts:21-78`). Node overlay selection can be optimized independently without changing auxiliary behavior.

### 3.1.2 Core invariants

After this change, the following invariants must hold:

1. `useResolvedNodeOverlayEntries(runtime, enabled)` returns a sorted array of `ResolvedNodeOverlayEntry`.
2. That array reference remains identical across renders when the logical overlay entry set is unchanged.
3. Entry object references remain identical for unchanged entities after mutation-driven updates.
4. `useNodeOverlayNodeModels(rootRef, enabled)` depends on:
   - runtime identity
   - viewport size
   - camera revision
   - selected entry array reference
5. `NodeOverlayCard` rerenders only when its **render-relevant** props change.
6. Bar fill motion remains owned by `EntityStateLinkContext` and `syncEntityBarBindings`, not by React rerender (`EntityStateLinkContext.tsx:41-97`, `entityStateLinkRuntime.ts:33-75`).

---

## 4. File-by-file design

## 4.1 File to add

### `src/ui/runtime/world/node-overlays/nodeOverlayComparators.ts`

#### Responsibility

Provide the single, authoritative equality contract for node overlay entries, projected node overlay models, and node overlay card render equality.

This file exists to prevent equality logic from being duplicated inconsistently across:

- incremental selection
- viewport caching
- `React.memo` card comparison

#### Interface

This file shall export exactly these functions:

1. `nodeOverlayBarEqual(left, right): boolean`
2. `nodeOverlayEntryEqual(left, right): boolean`
3. `nodeOverlayModelEqual(left, right): boolean`
4. `nodeOverlayCardRenderEqual(left, right): boolean`

The argument types shall be:

- `CompactBarBinding | undefined | null` for bar comparison
- `ResolvedNodeOverlayEntry | undefined | null` for entry comparison
- `ResolvedNodeOverlayModel | undefined | null` for model comparison

#### Logic

`nodeOverlayBarEqual` must compare the full bar data contract used by overlay entry/model equality:

- `id`
- `entityId`
- `valuePath`
- `maxPath`
- `maxValue`
- `current`
- `max`
- `color`

`nodeOverlayEntryEqual` must compare:

- `entityId`
- `kind`
- `label`
- `valueText`
- `bar` via `nodeOverlayBarEqual`

`nodeOverlayModelEqual` must compare:

- all entry fields via `nodeOverlayEntryEqual`
- `position.x`
- `position.y`

`nodeOverlayCardRenderEqual` must compare the fields that affect **rendered React output** of `NodeOverlayCard`.

It must compare:

- `entityId`
- `kind`
- `label`
- `valueText`
- `position.x`
- `position.y`
- bar presence
- if bar is present:
  - `id`
  - `entityId`
  - `valuePath`
  - `maxPath`
  - `maxValue`
  - `color`

It must **not** compare `bar.current` and `bar.max`.

#### Rationale for excluding `bar.current` and `bar.max` from render equality

`NodeOverlayCard` renders the bar shell, but live bar fill updates are already synchronized imperatively through `EntityStateLinkContext` and `syncEntityBarBindings` (`EntityStateLinkContext.tsx:41-97`, `entityStateLinkRuntime.ts:33-75`). Once the binding is registered, bar progress changes do not require a React rerender to stay correct.

#### Contract

- Entry equality and model equality are **data equality**.
- Card render equality is **render-output equality**.
- These are intentionally different and must remain different.

---

### `src/ui/runtime/world/node-overlays/useResolvedNodeOverlayEntries.ts`

#### Responsibility

Own the incremental selection of `ResolvedNodeOverlayEntry[]` for the node overlay viewport.

This hook replaces the current full-scan selection path inside `useNodeOverlayViewportData`.

#### Interface

```text
useResolvedNodeOverlayEntries(
    runtime: Runtime | null,
    enabled: boolean,
): ResolvedNodeOverlayEntry[]
```

#### Logic

The hook shall:

1. subscribe with `useRuntimeRevisionToken` using:
   - `entityIds: []`
   - `includeEntityListRevision: true`
   - `includeBlueprintRevision: true`
   - `includeMutationRevision: true`
2. maintain an internal ref cache containing:
   - `runtime`
   - `worldRevision`
   - `entityListRevision`
   - `blueprintRevision`
   - `mutationRevision`
   - `index: NodeOverlayEntryIndex`
3. return an empty stable array when:
   - `enabled === false`, or
   - `runtime === null`
4. perform a **full rebuild** with `buildNodeOverlayEntryIndex(runtime)` when any of the following changes:
   - runtime object identity
   - world revision
   - entity-list revision
   - blueprint revision
5. perform an **incremental update** with `applyNodeOverlayEntryChanges(index, runtime, changedEntityIds)` when:
   - runtime is unchanged
   - world/entity-list/blueprint revisions are unchanged
   - mutation revision changed
6. read `changedEntityIds` from `runtime.getInvalidation().getLastChangedEntityIds()`
7. return the cached `index.entries`

#### Contract

The hook must guarantee:

- sorted output by `entityId`
- stable array reference when logical selection output is unchanged
- stable entry object references for unchanged entities across mutation-driven updates

#### Why this hook cannot be replaced by `useRuntimeSelector`

`useRuntimeSelector` only exposes a token-driven selector callback and equality function (`useRuntimeSelector.ts:7-24`). It does not expose `getLastChangedEntityIds()` or a place to maintain an incremental keyed index. This hook therefore must use `useRuntimeRevisionToken` directly and manage its own ref cache.

---

### `src/ui/runtime/world/node-overlays/useNodeOverlayNodeModels.ts`

#### Responsibility

Project selected node overlay entries to `ResolvedNodeOverlayModel[]` using existing projection logic, while preserving stable array references when projected output is unchanged.

This hook isolates node model computation from auxiliary overlay computation.

#### Interface

```text
useNodeOverlayNodeModels(
    rootRef: RefObject<HTMLElement | null>,
    enabled: boolean,
): ResolvedNodeOverlayModel[]
```

#### Logic

The hook shall:

1. read `runtime` and `getCameraState` from `useWorldInteraction()`
2. read `cameraRevision` from `useRuntimeStore`
3. read viewport width and height using `useElementSize(rootRef)` and current-client fallback, exactly as `useNodeOverlayViewportData` does today (`useNodeOverlayViewportData.ts:30-34`)
4. read `nodeEntries` from `useResolvedNodeOverlayEntries(runtime, enabled)`
5. maintain a ref cache keyed by:
   - runtime identity
   - `nodeEntries` array reference
   - viewport width
   - viewport height
   - camera revision
6. recompute projected models only when one of those dependencies changes
7. compute projected models using existing `projectNodeOverlayModels(...)` from `overlayViewportModels.ts:53-74`
8. reuse the previous array reference when the newly projected model list is logically equal via `nodeOverlayModelEqual` for every item
9. return an empty stable array when disabled, missing runtime, or non-positive viewport size

#### Contract

- This hook is responsible only for `nodeModels`.
- It must not compute guidance models, runtime callout models, screen guidance models, or cave status position.
- It must not duplicate visibility logic; it must continue to use `projectNodeOverlayModels(...)`, which already applies `filterVisibleNodeOverlayModels(...)` (`overlayViewportModels.ts:53-74`).

---

## 4.2 Files to change

### `src/ui/runtime/world/node-overlays/nodeOverlayViewportHydration.ts`

#### Responsibility after change

Continue to own node overlay entry index creation and incremental application, but now with explicit change detection and stable-reference guarantees.

#### Required interface changes

1. Export `NodeOverlayEntryIndex` type.
2. Change `applyNodeOverlayEntryChanges(...)` return type from `void` to `boolean`.

New signature:

```text
applyNodeOverlayEntryChanges(
    index: NodeOverlayEntryIndex,
    runtime: Runtime,
    changedEntityIds: string[],
): boolean
```

#### Required logic changes

`applyNodeOverlayEntryChanges` must:

1. iterate only the provided `changedEntityIds`
2. for each changed entity ID:
   - read previous entry from `index.byId`
   - read entity via `runtime.getEntity(entityId)`
   - resolve next entry with `resolveNodeOverlayModel(entity, runtime)` when entity exists
3. update `index.byId` only when the logical entry changed
4. delete the map entry only when an existing entry is now absent
5. preserve the existing entry object when `nodeOverlayEntryEqual(previous, next)` is true
6. rebuild `index.entries` only when at least one logical change occurred
7. keep the prior `index.entries` array reference when no logical change occurred
8. return `true` only when the index changed logically

#### Pseudocode

```text
changed = false
for each entityId in changedEntityIds:
    previous = index.byId.get(entityId)
    entity = runtime.getEntity(entityId)
    next = entity ? resolveNodeOverlayModel(entity, runtime) : null

    if next is null:
        if previous exists:
            index.byId.delete(entityId)
            changed = true
        continue

    if previous does not exist:
        index.byId.set(entityId, next)
        changed = true
        continue

    if nodeOverlayEntryEqual(previous, next):
        continue

    index.byId.set(entityId, next)
    changed = true

if changed:
    index.entries = sorted values(index.byId) by entityId

return changed
```

#### Contract

- `buildNodeOverlayEntryIndex(runtime)` remains the canonical full-build path.
- `resolveNodeOverlayViewportData(...)` and `overlayViewportDataEqual(...)` remain behaviorally unchanged.
- No output semantics may change.

---

### `src/ui/runtime/world/node-overlays/useNodeOverlayViewportData.ts`

#### Responsibility after change

Assemble the final `OverlayViewportData`, but stop owning node entry selection directly.

After the change, this hook becomes a composition layer:

- optimized node models from `useNodeOverlayNodeModels`
- existing auxiliary overlay data from current logic

#### Interface

No public interface change.

It remains:

```text
useNodeOverlayViewportData(
    rootRef: RefObject<HTMLElement | null>,
    enabled: boolean,
): OverlayViewportData
```

#### Required logic changes

The hook shall:

1. remove the direct call to `resolveNodeOverlayEntries(runtime)`
2. stop using the runtime mutation token as the direct invalidation source for `nodeModels`
3. read `nodeModels` from `useNodeOverlayNodeModels(rootRef, enabled)`
4. retain the existing auxiliary subscription behavior for:
   - `guidanceModels`
   - `runtimeCalloutModels`
   - `screenGuidanceModels`
   - `caveStatusPosition`
5. compute auxiliary data using existing exported functions from `overlayViewportModels.ts`:
   - `resolveRuntimeGuidanceViews`
   - `resolveGuidanceModels`
   - `resolveRuntimeCalloutModels`
   - `resolveScreenGuidanceModels`
   - `resolveCaveStatusPosition`
6. keep `itemsKey` behavior unchanged for runtime callout store items (`useNodeOverlayViewportData.ts:36-38`)
7. keep existing width/height and fallback behavior unchanged (`useNodeOverlayViewportData.ts:30-34`)
8. retain the `overlayViewportDataEqual(...)` reuse path so the hook can return the prior `OverlayViewportData` object when the combined result is logically unchanged

#### Required cache model

The internal cache must key recomputation on:

- `enabled`
- runtime identity
- node model array reference
- viewport width
- viewport height
- camera revision
- auxiliary token
- runtime callout `itemsKey`

It must **not** key node model recomputation directly on the broad mutation token.

#### Contract

- Output shape remains exactly `OverlayViewportData`.
- Auxiliary overlay behavior remains unchanged.
- Node model selection is optimized without changing external behavior.

---

### `src/ui/runtime/world/node-overlays/NodeOverlayCard.tsx`

#### Responsibility after change

Remain the presentational renderer for a single projected node overlay model, but become memoized using render-relevant equality.

#### Interface

No public interface change.

It remains:

```text
NodeOverlayCard({ model: ResolvedNodeOverlayModel })
```

#### Required logic changes

1. keep `NodeOverlayProgress` behavior unchanged
2. wrap the exported card component in `React.memo`
3. use `nodeOverlayCardRenderEqual(previous.model, next.model)` as the comparator
4. do not add runtime reads or subscriptions inside the card

#### Contract

The memoized card must rerender when any of the following change:

- `label`
- `valueText`
- `position`
- bar binding identity/configuration
- bar presence

The memoized card must **not** rerender solely because `bar.current` or `bar.max` changed.

That behavior is correct because live bar fill is already maintained by `EntityStateLinkContext` and `syncEntityBarBindings`.

---

## 5. End-to-end data flow after change

### 5.1 Node model lane

```text
runtime invalidation token
    -> useResolvedNodeOverlayEntries
        -> full rebuild on runtime/world/entity-list/blueprint change
        -> incremental update on mutation change using lastChangedEntityIds
    -> useNodeOverlayNodeModels
        -> projectNodeOverlayModels using selected entries + camera + viewport
    -> useNodeOverlayViewportData
        -> combine into OverlayViewportData.nodeModels
    -> NodeOverlayViewportView
        -> NodeOverlayCard (memoized)
```

### 5.2 Auxiliary lane

```text
runtime invalidation token + callout store items
    -> useNodeOverlayViewportData
        -> guidance models
        -> runtime callout models
        -> screen guidance models
        -> cave status position
    -> NodeOverlayViewportView
```

---

## 6. Pseudocode for the full implementation

### 6.1 `useResolvedNodeOverlayEntries`

```text
subscribe to broad overlay token
read runtime invalidation revisions

if disabled or runtime missing:
    return EMPTY_ARRAY

if no cache for runtime OR runtime identity changed:
    rebuild full index
    store revisions
    return index.entries

if world revision changed OR entity-list revision changed OR blueprint revision changed:
    rebuild full index
    store revisions
    return index.entries

if mutation revision changed:
    changedIds = invalidation.getLastChangedEntityIds()
    didChange = applyNodeOverlayEntryChanges(index, runtime, changedIds)
    store revisions
    return index.entries (same ref when didChange is false)

return cached index.entries
```

### 6.2 `useNodeOverlayNodeModels`

```text
read runtime, camera state accessor, camera revision
read viewport width/height
read selected nodeEntries

if disabled or runtime missing or viewport invalid:
    return EMPTY_ARRAY

if runtime, entries ref, viewport, and camera revision all match cache:
    return cached models

nextModels = projectNodeOverlayModels(runtime, cameraState, width, height, nodeEntries)
if cached models are logically equal via nodeOverlayModelEqual:
    keep cached array ref
else:
    replace cached models

return cached models
```

### 6.3 `useNodeOverlayViewportData`

```text
nodeModels = useNodeOverlayNodeModels(rootRef, enabled)
auxiliaryToken = broad token for non-node overlays
read viewport width/height and callout items

if disabled or runtime missing:
    nextValue = EMPTY_OVERLAY_VIEWPORT_DATA with nodeModels: []
else:
    guidances = resolveRuntimeGuidanceViews(runtime)
    nextValue = {
        nodeModels,
        guidanceModels: resolveGuidanceModels(...),
        runtimeCalloutModels: resolveRuntimeCalloutModels(...),
        screenGuidanceModels: resolveScreenGuidanceModels(guidances),
        caveStatusPosition: resolveCaveStatusPosition(...),
    }

if cached value is logically equal via overlayViewportDataEqual:
    return cached value
store and return nextValue
```

---

## 7. Test plan

All existing node overlay tests must remain and continue to pass unchanged.

## 7.1 New tests to add

### `src/ui/runtime/world/node-overlays/nodeOverlayComparators.test.ts`

#### Responsibility

Prove the equality contract is explicit and stable.

#### Required test cases

1. `nodeOverlayEntryEqual` returns `true` for identical entries.
2. `nodeOverlayEntryEqual` returns `false` when any of these change:
   - `kind`
   - `label`
   - `valueText`
   - any full bar field including `current` or `max`
3. `nodeOverlayModelEqual` returns `false` when `position.x` or `position.y` changes.
4. `nodeOverlayCardRenderEqual` returns `true` when only `bar.current` changes.
5. `nodeOverlayCardRenderEqual` returns `true` when only `bar.max` changes.
6. `nodeOverlayCardRenderEqual` returns `false` when any of these change:
   - `label`
   - `valueText`
   - `position`
   - bar binding identity/config (`id`, `valuePath`, `maxPath`, `maxValue`, `color`)
   - bar presence

### `src/ui/runtime/world/node-overlays/useResolvedNodeOverlayEntries.test.tsx`

#### Responsibility

Prove that node overlay entry selection is incremental and stable.

#### Test harness requirements

The test runtime double must provide:

- `getEntities()`
- `getEntity(id)`
- `getInvalidation()`
- overlay-relevant entity data

The invalidation implementation must be real `RuntimeInvalidationService` or equivalent behaviorally identical test double.

#### Required test cases

1. **Initial build**
   - returns the same logical entries as `resolveNodeOverlayEntries(runtime)`
   - ordering is by `entityId`
2. **Unrelated mutation is ignored**
   - publish a mutation whose `changedEntityIds` do not affect any current overlay entry and do not introduce a new overlay-capable entity
   - hook returns the exact same array reference
3. **Single-entity overlay mutation is incremental**
   - publish a mutation for one existing overlay entity
   - only that entity is re-resolved
   - sibling entry object references remain identical
4. **Entity removal is incremental**
   - remove one overlay-capable entity and publish a mutation/entity-list change
   - only that entry is removed
   - ordering remains sorted
5. **Entity-list change triggers full rebuild**
   - add a new overlay-capable entity and publish an entity-list change
   - hook rebuilds through `buildNodeOverlayEntryIndex`
6. **Blueprint change triggers full rebuild**
   - publish a blueprint revision change
   - hook rebuilds through `buildNodeOverlayEntryIndex`
7. **Disabled state**
   - when `enabled` becomes `false`, hook returns the empty stable array
   - when re-enabled, hook rebuilds from runtime state

### `src/ui/runtime/world/node-overlays/useNodeOverlayNodeModels.test.tsx`

#### Responsibility

Prove that node model projection is keyed by selected entries, camera revision, and viewport state.

#### Required test cases

1. returns an empty stable array when disabled
2. returns an empty stable array when viewport size is zero
3. reuses the prior array reference when runtime, viewport, camera revision, and node entry reference are unchanged
4. recomputes when camera revision changes
5. recomputes when node entry reference changes
6. preserves logically equal model arrays when projection output is unchanged

## 7.2 Existing tests that must remain green unchanged

The following existing tests define the behavior contract and must remain unchanged:

- `NodeOverlayViewport.test.tsx`
- `NodeOverlayViewport.disabled.test.tsx`
- `NodeOverlayViewport.focus.test.tsx`
- `NodeOverlayViewport.guidance.test.tsx`
- `NodeOverlayViewport.screenCalloutLayer.test.tsx`
- `resolveNodeOverlayEntries.test.ts`
- `filterVisibleNodeOverlayModels.test.ts`
- `resolveNodeOverlayModel.test.ts`

---

## 8. Acceptance criteria

The implementation is complete only when all of the following are true:

1. `useNodeOverlayViewportData` no longer calls `resolveNodeOverlayEntries(runtime)` directly.
2. `useResolvedNodeOverlayEntries` is the only selection owner for node overlay entries in the viewport path.
3. unrelated runtime mutations preserve node entry array identity.
4. unchanged node overlay cards do not rerender when sibling cards change.
5. existing behavior tests pass unchanged.
6. new comparator and incremental-selection tests pass.
7. no polling loop is introduced.
8. no public API changes occur outside the node overlay module.

---

## 9. Non-ambiguous implementation decisions

To remove ambiguity, the following implementation choices are fixed by this design:

1. **Full rebuild triggers** are exactly:
   - runtime identity change
   - world revision change
   - entity-list revision change
   - blueprint revision change
2. **Incremental update trigger** is exactly:
   - mutation revision change with runtime/world/entity-list/blueprint unchanged
3. **Changed entity source** is exactly:
   - `runtime.getInvalidation().getLastChangedEntityIds()`
4. **Ordering rule** is exactly:
   - ascending `entityId` lexical order
5. **Node model projector** is exactly:
   - existing `projectNodeOverlayModels(...)`
6. **Bar live-update owner** remains exactly:
   - `EntityStateLinkContext` + `syncEntityBarBindings`
7. **Auxiliary overlays** remain on the existing behavior path and are not redefined in this change.

---

## 10. Expected outcome

This design does not try to solve every UI cost in the node overlay system. It solves the specific problem visible in the current code:

- broad invalidation currently causes full overlay entry rescans
- unchanged overlay entries currently do not retain identity through the selection path
- unchanged overlay cards currently have no memoized render boundary

After implementation:

- unrelated runtime mutations will stop forcing full node overlay selection work
- only changed overlay entities will be re-resolved on mutation-driven updates
- unchanged node overlay cards will stop rerendering when sibling overlay data changes
- existing behavior will remain unchanged
