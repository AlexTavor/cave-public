# LLD — Node Overlay 120 FPS Fixes

## 1. Basis

This design is based on direct inspection of the current codebase.

The design is constrained by the following project rules:

- React must render semantic state only.
- Frequently changing data must not flow through Context as React-rendered state.
- Context is for dependency injection, not high-churn UI data.
- Zustand is the app-level mutable state mechanism; no new store is permitted here.
- Tests must remain behavior-first and split between logic and UI responsibilities.

This LLD therefore uses the existing `entity-state-link` provider, existing runtime invalidation APIs, existing node-overlay selection hooks, and existing view hierarchy. It does not introduce a new store, a new top-level provider, or a timer-driven semantic overlay selector.

### 1.1 Files inspected

Primary production files inspected for this design:

- `src/ui/runtime/world/node-overlays/nodeOverlayComparators.ts`
- `src/ui/runtime/world/node-overlays/nodeOverlayTypes.ts`
- `src/ui/runtime/world/node-overlays/resolveNodeOverlayModel.helpers.ts`
- `src/ui/runtime/world/node-overlays/useResolvedNodeOverlayEntries.ts`
- `src/ui/runtime/world/node-overlays/useNodeOverlayNodeModels.ts`
- `src/ui/runtime/world/node-overlays/useNodeOverlayViewportData.ts`
- `src/ui/runtime/world/node-overlays/NodeOverlayViewport.tsx`
- `src/ui/runtime/world/node-overlays/NodeOverlayViewportView.tsx`
- `src/ui/runtime/world/node-overlays/filterVisibleNodeOverlayModels.ts`
- `src/ui/runtime/world/node-overlays/nodeOverlayViewportHydration.ts`
- `src/ui/runtime/world/entity-state-link/EntityStateLinkContext.tsx`
- `src/ui/runtime/world/entity-state-link/entityStateLinkRuntime.ts`
- `src/ui/runtime/world/entity-state-link/entityStateLinkTextRuntime.ts`
- `src/ui/runtime/world/entity-state-link/types.ts`
- `src/ui/runtime/world/entity-state-link/useEntityBarRef.ts`
- `src/ui/runtime/world/entity-state-link/useEntityTextRef.ts`

Primary tests inspected:

- `src/ui/runtime/world/node-overlays/nodeOverlayComparators.test.ts`
- `src/ui/runtime/world/node-overlays/useResolvedNodeOverlayEntries.incremental.test.tsx`
- `src/ui/runtime/world/node-overlays/useNodeOverlayNodeModels.test.tsx`
- `src/ui/runtime/world/EntityStateLink.test.tsx`
- existing `NodeOverlayViewport*.test.tsx` files

---

## 2. Problem Statement

The underscore-version selection optimization improved semantic overlay entry selection, but the current implementation still leaks simulation-rate churn into UI work through three separate paths.

### 2.1 Problem A — bar snapshots still participate in semantic equality

The current comparator contract still treats bar progress snapshots as semantic identity:

- `nodeOverlayBarEqual(...)` compares `current` and `max`
- `nodeOverlayEntryEqual(...)` uses `nodeOverlayBarEqual(...)`
- `nodeOverlayModelEqual(...)` uses `nodeOverlayEntryEqual(...)`

This means a pure progress change can still:

1. replace the semantic node overlay entry
2. change the selected entry array reference
3. change the projected node model array reference
4. force downstream viewport recomputation even though bar fill is already updated imperatively

This is the same architectural error that live text already fixed.

### 2.2 Problem B — bars are still mutation-driven and full-registry-scanned

The current bar runtime path in `entityStateLinkRuntime.ts` still behaves as follows:

1. watch runtime invalidation directly
2. on mutation, detect whether any registered entity changed
3. call `syncEntityBarBindings(...)`
4. iterate the full bar registry

This keeps bar DOM work tied directly to simulation mutation cadence.

Even when only one registered entity changed, the entire bar registry is traversed.

### 2.3 Problem C — viewport aggregation is still broad-mutation-coupled

`useNodeOverlayViewportData.ts` still aggregates these layers together under one hook cache:

- `nodeModels`
- `guidanceModels`
- `runtimeCalloutModels`
- `screenGuidanceModels`
- `caveStatusPosition`

Its cache key still includes a broad runtime token with:

- entity-list revision
n- blueprint revision
- mutation revision

On every such token change, the hook recomputes all auxiliary overlay layers even though the node-model path is already split into `useNodeOverlayNodeModels(...)`.

As a result, “node overlays only” is still not isolated from auxiliary overlay invalidation.

### 2.4 Why the current text-rate fix was not enough

The current text-rate fix correctly moved `valueText` for live overlays off the React semantic path, but it did not address:

- bar snapshot equality
- bar DOM sync cadence
- broad viewport aggregation invalidation

Therefore the text fix improved performance but could not deliver 120 FPS on its own.

---

## 3. Goals

1. Remove live bar snapshots from semantic node overlay equality.
2. Detach bar DOM updates from raw simulation mutation cadence.
3. Isolate node overlay card rendering from auxiliary overlay invalidations.
4. Preserve all current visible node overlay behavior.
5. Reuse existing `entity-state-link`, runtime invalidation, selection hooks, and node overlay projection logic.

---

## 4. Non-Goals

The following are explicitly out of scope:

1. Any change to node overlay semantic selection rebuild-vs-patch rules.
2. Any change to live text binding behavior implemented.
3. Any change to countdown/text formatter precision.
4. Any change to overlay styling, layout, z-order, or DOM structure outside the layer split described here.
5. Any new app-level store.
6. Any new top-level provider.
7. Any change to tutorial guidance semantics, runtime callout store semantics, or cave status semantics.
8. Any change to Phaser rendering or simulation timing.

---

## 5. Design Summary

The implementation has three coordinated fixes.

### 5.1 Fix 1 — semantic bar equality becomes identity-only

Node overlay semantic equality will treat bars the same way the current implementation already treats live text:

- bar binding identity is semantic
- current/max progress snapshot is visual state only

This stops progress-only changes from replacing semantic entries and projected models.

### 5.2 Fix 2 — bar runtime moves to a fixed 16 ms cadence with dirty-entity tracking

Bars will remain imperative DOM updates through `entity-state-link`, but the update contract changes to:

- invalidation marks dirty entities only
- DOM writes occur on a fixed 16 ms interval
- first registration still performs immediate sync for correctness
- only dirty entities are synchronized unless a full refresh is required

This detaches bar DOM writes from simulation mutation frequency while keeping the existing provider and ref hooks.

### 5.3 Fix 3 — viewport aggregation is split by layer

The current monolithic `useNodeOverlayViewportData(...)` will be split into layer-specific hooks while preserving a backward-compatible façade.

The runtime card layer will consume:

- `useNodeOverlayNodeModels(...)`

The auxiliary layers will consume separate hooks for:

- guidance + screen guidance
- runtime callouts
- cave status

`NodeOverlayViewport.tsx` and `NodeOverlayViewportView.tsx` will be changed so node overlay cards are no longer coupled to auxiliary layer invalidations.

---

## 6. Behavioral Contract

After implementation, all of the following must be true.

1. A mutation that changes only bar `current` and/or `max` for an existing overlay must not replace that overlay’s semantic entry.
2. A mutation that changes only bar `current` and/or `max` must not replace that overlay’s projected node model when position and semantic identity are unchanged.
3. A bar fill must update at most once per 16 ms wall-clock tick, except for the immediate first sync on registration.
4. A mutation affecting an unrelated entity must not cause a registered bar for another entity to update.
5. `useResolvedNodeOverlayEntries(...)` must remain the only owner of semantic node entry selection.
6. `useNodeOverlayNodeModels(...)` must remain the only owner of node model projection.
7. `NodeOverlayViewport` must render the same visible output as before for the same runtime state.
8. Auxiliary overlay invalidation must no longer force the node card layer to rerender unless node cards or guidance callout clashes actually changed.
9. No new Context and no new store are allowed.
10. Existing node overlay, guidance, runtime callout, cave status, and bar behaviors remain user-visible equivalent except for the fixed-rate bar update cadence.

---

## 7. Detailed Design

## 7.1 Fix 1 — semantic bar equality contract

### 7.1.1 Current issue

The current `CompactBarBinding` contains both:

- binding identity (`id`, `entityId`, `valuePath`, `maxPath`, `maxValue`, `color`)
- live progress snapshot (`current`, `max`)

`nodeOverlayEntryEqual(...)` must not treat live progress snapshot as semantic identity.

### 7.1.2 Required equality split

The comparator module must explicitly define two different bar equalities.

#### A. Bar identity equality

Bar identity equality compares only:

- `id`
- `entityId`
- `valuePath`
- `maxPath`
- `maxValue`
- `color`

Bar identity equality must ignore:

- `current`
- `max`

#### B. Bar snapshot equality

Bar snapshot equality compares:

- all bar identity fields
- `current`
- `max`

Bar snapshot equality exists only for tests or any future logic that explicitly needs it. It must not participate in semantic entry equality.

### 7.1.3 Required semantic comparator rules

The comparator rules must be:

- `nodeOverlayEntryEqual(...)` uses bar identity equality only
- `nodeOverlayModelEqual(...)` uses entry equality plus position equality only
- `nodeOverlayCardRenderEqual(...)` uses bar identity equality only

This makes bar behavior consistent with the current live-text treatment.

---

## 7.2 Fix 2 — bar runtime cadence and dirty tracking

## 7.2.1 Current issue

`useEntityBarRuntime(...)` currently performs bar DOM sync inside the invalidation-driven effect and `syncEntityBarBindings(...)` traverses the entire registry.

That keeps bar writes coupled to sim mutation rate and registry size.

## 7.2.2 New bar runtime contract

The bar runtime must adopt the same runtime-control pattern already used by text, but with bar-specific cadence and helpers.

### Bar cadence

A single bar cadence timer exists per mounted `EntityStateLinkProvider`.

The interval is fixed at:

- `BAR_SYNC_INTERVAL_MS = 16`

### Dirty tracking

The runtime must track:

- registered bar bindings by binding ID
- how many bindings are registered per entity ID
- a dirty set of entity IDs whose bars require refresh
- a full-refresh flag for runtime swap and entity-list change

### Update rules

1. On initial bar registration, synchronize that specific bar immediately.
2. On runtime swap, mark full refresh.
3. On entity-list revision change, mark full refresh.
4. On mutation revision change, add only registered changed entity IDs to the dirty set.
5. Do not perform bar DOM writes inside the invalidation effect.
6. On each 16 ms timer tick:
   - if full refresh is set, sync all registered bars
   - otherwise sync only bars whose entity ID is dirty
   - clear consumed dirty state after the tick

### Missing entity rule

If a registered bar’s entity no longer exists, the bar sync must set the visual progress to `0` and `data-progress` to `0`.

This rule prevents stale bar visuals during the interval between mutation and unmount.

---

## 7.3 Fix 3 — viewport aggregation split

## 7.3.1 Current issue

The current `useNodeOverlayViewportData(...)` recomputes all overlay layers under one cache key.

That means auxiliary overlay invalidation remains coupled to the node overlay card path.

## 7.3.2 New split contract

The hook file keeps the same file path but exports four hooks with distinct responsibilities.

### A. `useNodeOverlayViewportInputs(rootRef)`

Shared viewport-input hook.

Responsibility:

Read shared runtime view inputs exactly once for all overlay-layer hooks.

Output fields:

- `runtime`
- `getCameraState`
- `cameraRevision`
- `viewportWidth`
- `viewportHeight`
- `runtimeCalloutItems`

This hook is a dependency collector only. It does not resolve any models.

### B. `useNodeOverlayGuidanceData(inputs, enabled)`

Responsibility:

Resolve and cache only:

- `guidanceModels`
- `screenGuidanceModels`

Inputs:

- shared viewport inputs
- `enabled`
- a runtime invalidation token for the guidance layer

This hook must not compute node models, runtime callout models, or cave status.

### C. `useNodeOverlayRuntimeCalloutModels(inputs, enabled)`

Responsibility:

Resolve and cache only `runtimeCalloutModels`.

This hook must not compute node models, guidance, screen guidance, or cave status.

### D. `useNodeOverlayCaveStatusPosition(inputs, enabled)`

Responsibility:

Resolve and cache only `caveStatusPosition`.

This hook must not compute node models, guidance, screen guidance, or runtime callout models.

### E. `useNodeOverlayViewportData(rootRef, enabled)`

Responsibility:

Backward-compatible façade only.

It must compose:

- `useNodeOverlayNodeModels(rootRef, enabled)`
- `useNodeOverlayViewportInputs(rootRef)`
- `useNodeOverlayGuidanceData(...)`
- `useNodeOverlayRuntimeCalloutModels(...)`
- `useNodeOverlayCaveStatusPosition(...)`

and return the existing `OverlayViewportData` shape.

This export remains only for compatibility. The main viewport component will stop using it directly.

## 7.3.3 View split contract

`NodeOverlayViewport.tsx` and `NodeOverlayViewportView.tsx` must stop routing all overlay layers through one data object prop.

### `NodeOverlayViewport.tsx`

Must:

1. create `rootRef`
2. read `enabled`
3. read `nodeModels` from `useNodeOverlayNodeModels(rootRef, enabled)`
4. read shared inputs from `useNodeOverlayViewportInputs(rootRef)`
5. read `guidanceModels` and `screenGuidanceModels` from `useNodeOverlayGuidanceData(inputs, enabled)`
6. read `runtimeCalloutModels` from `useNodeOverlayRuntimeCalloutModels(inputs, enabled)`
7. read `caveStatusPosition` from `useNodeOverlayCaveStatusPosition(inputs, enabled)`
8. pass each layer’s data separately to `NodeOverlayViewportView`

### `NodeOverlayViewportView.tsx`

Must accept explicit props:

- `rootRef`
- `nodeModels`
- `guidanceModels`
- `runtimeCalloutModels`
- `screenGuidanceModels`
- `caveStatusPosition`

It must define internal memoized layer components:

#### Node cards layer

Inputs:

- `nodeModels`
- `guidanceModels`
- `focusedIds`

Responsibility:

- filter by focus
- compute callout clashes via `filterNodeOverlayModelsByCallouts(...)`
- render `NodeOverlayCard` list

This layer must not receive runtime callouts, screen guidance, or cave status props.

#### Guidance layer

Inputs:

- `guidanceModels`
- `focusedIds`

Responsibility:

- filter guidance by focus
- render `GuidanceCalloutCard` list

#### Runtime callout layer

Inputs:

- `runtimeCalloutModels`

Responsibility:

- render `RuntimeCalloutCard` list

#### Cave status layer

Inputs:

- `caveStatusPosition`
- `focusedIds`

Responsibility:

- render `CaveStatusOverlay`

#### Screen guidance layer

Inputs:

- `screenGuidanceModels`

Responsibility:

- render `ScreenOverlay`

### Why this split is required

This split does not change visible behavior, but it narrows the rerender scope:

- node cards no longer rerender because runtime callouts changed
- runtime callouts no longer rerender because node bars changed
- cave status no longer rerenders because node card values changed

That is required to isolate the node overlay card path from unrelated auxiliary invalidations.

---

## 8. File-Level Design

## 8.1 Changed file: `src/ui/runtime/world/node-overlays/nodeOverlayComparators.ts`

### Responsibility

Define semantic, model, and card-render equality for node overlays.

### Required changes

1. Add `nodeOverlayBarIdentityEqual(left, right)`.
2. Add `nodeOverlayBarSnapshotEqual(left, right)`.
3. Change `nodeOverlayEntryEqual(...)` to use bar identity equality.
4. Change `nodeOverlayModelEqual(...)` to inherit that behavior.
5. Change `nodeOverlayCardRenderEqual(...)` to use bar identity equality.
6. Preserve all current live-text binding equality behavior.

### Interface contract

Exports after the change:

- `nodeOverlayBarIdentityEqual`
- `nodeOverlayBarSnapshotEqual`
- `nodeOverlayEntryEqual`
- `nodeOverlayModelEqual`
- `nodeOverlayCardRenderEqual`

No other comparator semantics may change.

---

## 8.2 Changed file: `src/ui/runtime/world/entity-state-link/entityStateLinkRuntime.ts`

### Responsibility

Own the bar-binding runtime contract and imperative bar syncing.

### Required changes

1. Add `BAR_SYNC_INTERVAL_MS = 16`.
2. Add `syncSingleEntityBarBinding(...)`.
3. Change `syncEntityBarBindings(...)` to accept:
   - `dirtyEntityIds: Set<string>`
   - `forceAll: boolean`
4. Change `useEntityBarRuntime(...)` from mutation-driven sync to dirty-set + cadence-driven sync.

### New internal state inside `useEntityBarRuntime(...)`

The hook must maintain:

- `registryRef: Map<string, InternalBarBinding>`
- `entityIndexRef: Map<string, any>`
- `entityCountsRef: Map<string, number>`
- `dirtyEntityIdsRef: Set<string>`
- `fullRefreshRef: boolean`
- `lastRuntimeRef`
- `revisionRef` containing at least:
  - `entityListRevision`
  - `mutationRevision`
- `version` state used only to restart or stop the timer when the registry transitions between empty and non-empty

### Required logic

#### Registration

`register(...)` must:

1. replace any previous binding with the same ID
2. maintain `entityCountsRef`
3. perform immediate sync of the registered bar when runtime is available
4. trigger timer lifecycle recalculation when registry emptiness changes

#### Unregistration

`unregister(...)` must:

1. remove the binding
2. decrement `entityCountsRef`
3. remove the entity ID from `dirtyEntityIdsRef` if the entity has no more registered bars
4. trigger timer lifecycle recalculation when registry emptiness changes

#### Invalidation effect

The effect keyed by `runtime` and `token` must:

1. read runtime invalidation revisions
2. if runtime changed, mark full refresh
3. if entity-list revision changed, mark full refresh
4. if mutation revision changed, add only registered changed entity IDs to `dirtyEntityIdsRef`
5. perform no DOM writes

#### Cadence effect

The cadence effect must:

1. run only when runtime exists and the registry is non-empty
2. tick every `BAR_SYNC_INTERVAL_MS`
3. on each tick:
   - if full refresh is set, sync all registered bars
   - otherwise sync only dirty entity IDs
4. clear consumed dirty state after sync
5. stop the timer on cleanup or when the registry becomes empty

### Interface contract

The public return value of `useEntityBarRuntime(...)` remains unchanged:

- `{ register, unregister }`

No other file may directly own bar cadence logic.

---

## 8.3 Changed file: `src/ui/runtime/world/EntityStateLink.test.tsx`

### Responsibility

Integration-test provider-driven bar behavior.

### Required changes

Update the test contract from immediate mutation-driven updates to cadence-driven updates.

### Required test cases

#### Test 1 — immediate first sync on registration

Given:

- a runtime entity with progress data
- a mounted `EntityStateLinkProvider`
- a bar bound through `useEntityBarRef(...)`

When:

- the component mounts

Then:

- the fill transform and `data-progress` are correct immediately

#### Test 2 — rapid mutations do not update until the cadence tick

Given:

- fake timers enabled
- one registered bar entity

When:

- the entity mutates multiple times in less than 16 ms wall-clock time
- matching mutation summaries are published

Then:

- the bar DOM remains unchanged until the cadence tick

When:

- time advances through one 16 ms tick

Then:

- the bar updates once to the latest value

#### Test 3 — unrelated entity mutations do not update the bar

Given:

- one registered bar entity and one unrelated entity

When:

- only the unrelated entity appears in `changedEntityIds`
- a cadence tick occurs

Then:

- the bar DOM does not change

#### Test 4 — missing entity resets the visual progress

Given:

- a registered bar

When:

- the entity is removed from the runtime
- the mutation/entity-list path marks the bar dirty
- a cadence tick occurs

Then:

- the transform is `scaleX(0)`
- `data-progress` is `0`

---

## 8.4 Changed file: `src/ui/runtime/world/node-overlays/useResolvedNodeOverlayEntries.incremental.test.tsx`

### Responsibility

Verify that live progress-only mutations no longer churn semantic entry identity.

### Required new test cases

#### Test 1 — cycle progress-only mutation preserves entry reference

Given:

- a runtime with an active cycle overlay entry

When:

- only cycle progress changes for that entity
- the entity remains overlay-eligible with the same bar binding identity and same live-text binding identity
- a mutation summary is published for that entity

Then:

- the semantic entry object reference for that entity remains unchanged

#### Test 2 — assignment progress-only mutation preserves entry reference

Given:

- a runtime with an active assignment overlay entry

When:

- only assignment progress changes
- the entity remains overlay-eligible with the same bar binding identity and same live-text binding identity
- a mutation summary is published

Then:

- the semantic entry object reference for that entity remains unchanged

#### Test 3 — storage current/max-only mutation preserves entry reference

Given:

- a runtime with a storage overlay entry

When:

- only the storage current/max values change
- the bar binding identity and live-text binding identity remain unchanged
- a mutation summary is published

Then:

- the semantic entry object reference for that entity remains unchanged

These tests are mandatory. They are the proof that bar snapshots have left semantic equality.

---

## 8.5 Changed file: `src/ui/runtime/world/node-overlays/nodeOverlayComparators.test.ts`

### Responsibility

Verify the comparator contract after the bar-equality split.

### Required changes

Add tests for:

1. `nodeOverlayBarIdentityEqual(...)` returns true when only `current` or `max` differ.
2. `nodeOverlayBarSnapshotEqual(...)` returns false when `current` or `max` differ.
3. `nodeOverlayEntryEqual(...)` returns true when only bar `current`/`max` differ and all semantic identity fields match.
4. `nodeOverlayCardRenderEqual(...)` returns true when only bar `current`/`max` differ.
5. Existing live-text binding equality behavior remains unchanged.

---

## 8.6 Changed file: `src/ui/runtime/world/node-overlays/useNodeOverlayViewportData.ts`

### Responsibility

Own shared viewport input collection, layer-specific auxiliary hooks, and backward-compatible viewport-data composition.

### Required changes

Add the following exports.

#### A. `NodeOverlayViewportInputs`

A local exported type describing the shared inputs used by auxiliary overlay hooks.

Required fields:

- `runtime`
- `getCameraState`
- `cameraRevision`
- `viewportWidth`
- `viewportHeight`
- `runtimeCalloutItems`

#### B. `useNodeOverlayViewportInputs(rootRef)`

Responsibility:

Read all shared runtime/viewport inputs exactly once.

This hook must:

- use `useWorldInteraction()`
- use `useRuntimeStore((state) => state.cameraRevision)`
- use `runtimeCalloutStore((state) => state.items)`
- use `useElementSize(rootRef)` plus current-client fallbacks

It must not resolve any overlay models.

#### C. `useNodeOverlayGuidanceData(inputs, enabled)`

Responsibility:

Resolve only `guidanceModels` and `screenGuidanceModels`.

Required dependencies:

- runtime
- viewport dimensions
- camera revision
- guidance-layer invalidation token

Required cache contract:

- recompute only when a guidance-layer dependency changes
- preserve the previous object when both arrays are equal by the existing guidance equality rules from `nodeOverlayViewportHydration.ts`

#### D. `useNodeOverlayRuntimeCalloutModels(inputs, enabled)`

Responsibility:

Resolve only `runtimeCalloutModels`.

Required dependencies:

- runtime
- viewport dimensions
- camera revision
- runtime callout store items
- callout-layer invalidation token

Required cache contract:

- recompute only when a callout-layer dependency changes
- preserve the previous array when the runtime callout models are equal by the existing runtime-callout equality rule

#### E. `useNodeOverlayCaveStatusPosition(inputs, enabled)`

Responsibility:

Resolve only `caveStatusPosition`.

Required dependencies:

- runtime
- viewport dimensions
- camera revision
- cave-status-layer invalidation token

Required cache contract:

- recompute only when a cave-status dependency changes
- preserve the previous position object when equal by the existing position-equality rule

#### F. `useNodeOverlayViewportData(rootRef, enabled)`

Responsibility:

Compatibility façade only.

It must compose:

- `useNodeOverlayNodeModels(rootRef, enabled)`
- `useNodeOverlayViewportInputs(rootRef)`
- `useNodeOverlayGuidanceData(inputs, enabled)`
- `useNodeOverlayRuntimeCalloutModels(inputs, enabled)`
- `useNodeOverlayCaveStatusPosition(inputs, enabled)`

and return the existing `OverlayViewportData` shape.

The façade must remain functionally correct but must no longer be the primary runtime viewport path.

---

## 8.7 New test file: `src/ui/runtime/world/node-overlays/useNodeOverlayViewportData.layers.test.tsx`

### Responsibility

Verify the new layer hooks and the isolation contract.

### Required test cases

#### Test 1 — guidance hook stays stable across node-only bar mutations

Given:

- a runtime with no guidance changes pending
- a rendered guidance hook output

When:

- a mutation changes only a node overlay entity’s live bar values
- the guidance-layer token changes only because of the broad runtime invalidation path

Then:

- the returned `guidanceModels` and `screenGuidanceModels` remain referentially stable

#### Test 2 — runtime callout hook stays stable when items and target positions are unchanged

Given:

- runtime callout store items unchanged
- target entity positions unchanged

When:

- a mutation unrelated to runtime callouts occurs

Then:

- the returned `runtimeCalloutModels` array remains referentially stable

#### Test 3 — cave status hook stays stable when cave status position is unchanged

Given:

- a stable `sys_world` body position

When:

- an unrelated node overlay mutation occurs

Then:

- the returned `caveStatusPosition` remains referentially stable

These tests validate the caching contract of the new layer hooks.

---

## 8.8 Changed file: `src/ui/runtime/world/node-overlays/NodeOverlayViewport.tsx`

### Responsibility

Compose layer-specific hooks and pass explicit layer props to the view.

### Required changes

Replace the single `useNodeOverlayViewportData(rootRef, enabled)` call with:

1. `useNodeOverlayNodeModels(rootRef, enabled)`
2. `useNodeOverlayViewportInputs(rootRef)`
3. `useNodeOverlayGuidanceData(inputs, enabled)`
4. `useNodeOverlayRuntimeCalloutModels(inputs, enabled)`
5. `useNodeOverlayCaveStatusPosition(inputs, enabled)`

Pass those values separately to `NodeOverlayViewportView`.

### Interface contract

No prop or export change outside the node-overlay domain.

The component remains:

- responsible for `rootRef`
- responsible for reading the enabled flag
- not responsible for any render-time filtering logic

---

## 8.9 Changed file: `src/ui/runtime/world/node-overlays/NodeOverlayViewportView.tsx`

### Responsibility

Render the overlay root and isolate rendering work by layer.

### Required changes

#### A. Prop shape change

Replace the single `data: OverlayViewportData` prop with explicit props:

- `rootRef`
- `nodeModels`
- `guidanceModels`
- `runtimeCalloutModels`
- `screenGuidanceModels`
- `caveStatusPosition`

#### B. Internal memoized layer components

Add internal memoized components for:

1. `NodeOverlayCardsLayer`
2. `GuidanceCalloutLayer`
3. `RuntimeCalloutLayer`
4. `CaveStatusLayer`

These internal components are file-local only. No new exports are allowed.

#### C. Focus handling

The top-level view continues to own focus filtering through `useActiveRuntimeAttention()` and a derived `focusedIds` set.

The top-level view must pass `focusedIds` only to the layers that require it:

- node cards layer
- guidance layer
- cave status layer

It must not pass unrelated props into those layers.

### Layer contracts

#### NodeOverlayCardsLayer

Inputs:

- `nodeModels`
- `guidanceModels`
- `focusedIds`

Logic:

1. apply focus filtering to node models
2. apply focus filtering to guidance models for clash filtering
3. compute `unclashed` with `filterNodeOverlayModelsByCallouts(...)`
4. render `NodeOverlayCard` list

#### GuidanceCalloutLayer

Inputs:

- `guidanceModels`
- `focusedIds`

Logic:

1. apply focus filtering
2. render `GuidanceCalloutCard` list

#### RuntimeCalloutLayer

Inputs:

- `runtimeCalloutModels`

Logic:

- render `RuntimeCalloutCard` list only

#### CaveStatusLayer

Inputs:

- `caveStatusPosition`
- `focusedIds`

Logic:

- render `CaveStatusOverlay` with the existing hidden rule

Screen guidance continues to render through `ScreenOverlay`, but it must consume only `screenGuidanceModels`.

### Required outcome

A change in runtime callouts, screen guidance, or cave status must not force the node cards layer to rerender unless its own inputs changed.

---

## 9. Pseudocode

### 9.1 Bar runtime dirty tracking and cadence

```text
register(id, binding, element):
    replace previous binding if present
    update per-entity registration counts
    store internal binding
    if runtime exists:
        sync this binding immediately
    if registry emptiness changed:
        restart timer lifecycle

invalidation effect(runtime, token):
    read invalidation revisions

    if runtime is null or registry empty:
        store revisions and return

    if runtime changed:
        mark full refresh
        store revisions and return

    if entity list revision changed:
        mark full refresh
        store revisions and return

    if mutation revision changed:
        for each changed entity id:
            if entity has registered bars:
                mark entity dirty
        store revisions

cadence effect(runtime, registry non-empty):
    every 16 ms:
        if full refresh:
            sync all bars
            clear full refresh
            clear dirty entities
            continue

        if no dirty entities:
            do nothing
            continue

        sync only dirty bars
        clear dirty entities
```

### 9.2 Layer hook split

```text
useNodeOverlayViewportInputs(rootRef):
    read runtime and getCameraState
    read cameraRevision
    read runtime callout items
    read width and height with fallbacks
    return shared input object

useNodeOverlayGuidanceData(inputs, enabled):
    if disabled or runtime missing or viewport invalid:
        return stable empty guidance data
    read guidance token
    if cache miss:
        guidances = resolveRuntimeGuidanceViews(runtime)
        guidanceModels = resolveGuidanceModels(...)
        screenGuidanceModels = resolveScreenGuidanceModels(guidances)
        preserve previous cached value if arrays equal
    return cached guidance data

useNodeOverlayRuntimeCalloutModels(inputs, enabled):
    if disabled or runtime missing or viewport invalid:
        return stable empty array
    read callout token
    if cache miss:
        models = resolveRuntimeCalloutModels(...)
        preserve previous array if equal
    return cached models

useNodeOverlayCaveStatusPosition(inputs, enabled):
    if disabled or runtime missing or viewport invalid:
        return null
    read cave token
    if cache miss:
        position = resolveCaveStatusPosition(...)
        preserve previous position if equal
    return cached position
```

---

## 10. Acceptance Criteria

The implementation is complete only when all of the following are true.

1. Bar `current` / `max` no longer participate in semantic node overlay entry equality.
2. Progress-only mutations preserve node overlay entry references and projected model references when semantic identity and position are unchanged.
3. Bar DOM updates occur on a fixed 16 ms cadence and not directly inside the invalidation effect.
4. Immediate bar correctness on mount is preserved through one-shot registration sync.
5. Unrelated entity mutations do not update unrelated registered bars.
6. `NodeOverlayViewport` no longer routes all overlay layers through one monolithic `data` prop.
7. Auxiliary overlay invalidations do not force the node card layer to rerender unless node cards or guidance-clash inputs changed.
8. Existing node overlay viewport behavior remains unchanged.
9. Existing tests remain green and the new/updated tests described above are green.
10. No new store, no new top-level provider, and no changes outside the files listed in this LLD are introduced.

---

## 11. Files Changed or Added

### Changed

- `src/ui/runtime/world/node-overlays/nodeOverlayComparators.ts`
- `src/ui/runtime/world/entity-state-link/entityStateLinkRuntime.ts`
- `src/ui/runtime/world/EntityStateLink.test.tsx`
- `src/ui/runtime/world/node-overlays/useResolvedNodeOverlayEntries.incremental.test.tsx`
- `src/ui/runtime/world/node-overlays/nodeOverlayComparators.test.ts`
- `src/ui/runtime/world/node-overlays/useNodeOverlayViewportData.ts`
- `src/ui/runtime/world/node-overlays/NodeOverlayViewport.tsx`
- `src/ui/runtime/world/node-overlays/NodeOverlayViewportView.tsx`

### Added

- `src/ui/runtime/world/node-overlays/useNodeOverlayViewportData.layers.test.tsx`

No other files are in scope.

---

## 12. Explicit Non-Ambiguity Notes

1. `BAR_SYNC_INTERVAL_MS` is exactly `16`.
2. Bar cadence is owned only by `entityStateLinkRuntime.ts`.
3. `EntityStateLinkContext.tsx` interface remains unchanged.
4. `useEntityBarRef(...)` interface remains unchanged.
5. `useEntityTextRef(...)` and text runtime files are unchanged by this LLD.
6. `useResolvedNodeOverlayEntries(...)` logic is unchanged by this LLD.
7. `useNodeOverlayNodeModels(...)` logic is unchanged by this LLD.
8. `useNodeOverlayViewportData(...)` remains exported but becomes a compatibility façade.
9. `NodeOverlayViewport.tsx` must stop using the façade directly.
10. The only new test file is `useNodeOverlayViewportData.layers.test.tsx`.
