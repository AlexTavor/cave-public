# LLD — Overlay Runtime Render-Subscription Fixes and Resource Card Optimization

## 1. Scope

The design is constrained to the current codebase and must remain within the project architecture and prompt contract:

- React renders semantic state only
- Context is dependency injection only
- no speculative patterns or broad refactors
- tests remain behavior-first and colocated

This design addresses exactly three problems observed in the current implementation:

1. expensive derived values are still computed during React render in `useImperativeRuntimeDerivedValue`
2. the node overlay auxiliary layers now subscribe through multiple independent React hooks, increasing React wakeups
3. `ResourceCard` still routes its visible steady-state body through the generic derived-value hook and recomputes display data in render paths where it should not

This document contains no code. Pseudocode is provided where necessary.

---

## 2. Why

## 2.1 What the current code does

### 2.1.1 `useImperativeRuntimeDerivedValue` still resolves during render

Current file:

- `src/ui/runtime/hooks/useImperativeRuntimeDerivedValue.ts`

Current behavior:

- `valueRef` is initialized from `resolve(runtime)` during render
- `nextValue = resolve(runtime)` is also executed during render on every render
- when `isEqual(valueRef.current, nextValue)` is false, the ref is updated during render
- an invalidation subscription also recomputes the same derived value in the callback

That means the current hook has two compute paths:

1. render-time compute
2. subscription-callback compute

This defeats the purpose of the hook for expensive derived data and introduces allocation churn during React render.

### 2.1.2 Node overlay auxiliary layers now subscribe separately

Current files:

- `src/ui/runtime/world/node-overlays/useNodeOverlayGuidanceData.ts`
- `src/ui/runtime/world/node-overlays/useNodeOverlayRuntimeCalloutModels.ts`
- `src/ui/runtime/world/node-overlays/useNodeOverlayCaveStatusPosition.ts`
- `src/ui/runtime/world/node-overlays/NodeOverlayViewport.tsx`
- `src/ui/runtime/world/node-overlays/useNodeOverlayViewportData.ts`

Current behavior:

- `NodeOverlayViewport.tsx` mounts four separate data hooks:
    - `useNodeOverlayNodeModels(...)`
    - `useNodeOverlayGuidanceData(...)`
    - `useNodeOverlayRuntimeCalloutModels(...)`
    - `useNodeOverlayCaveStatusPosition(...)`
- the latter three each use `useImperativeRuntimeDerivedValue(...)`
- all three use the same broad `NODE_OVERLAY_LAYER_PLAN`
- a single mutation can therefore trigger multiple subscription callbacks and multiple derived-value equality checks in the same subtree

This is a worse React orchestration pattern than a single cached auxiliary subscription.

### 2.1.3 `ResourceCard` is still routed through the generic hook

Current files:

- `src/ui/runtime/world/selection/ResourceCard.tsx`
- `src/ui/runtime/world/selection/resolveResourceCardData.ts`
- `src/ui/runtime/world/selection/resourceCardHydration.ts`
- `src/ui/runtime/world/selection/ResourceCardView.tsx`

Current behavior:

- `ResourceCard` calls `useImperativeRuntimeDerivedValue(...)`
- because the hook resolves during render, `resolveResourceCardData(entity, runtime)` is still executed during render
- that function rebuilds:
    - `label`
    - `description`
    - `storageModels`
- `storageModels` includes live-display model fields and tooltip lines
- `ResourceCardView` is not memoized

The current implementation therefore keeps the Resource Card visible body coupled to React render work even though its live bars and live value text are already imperative.

## 2.2 Desired outcome

After the fix:

1. expensive derived values must not be recomputed during render on stable renders
2. the node overlay auxiliary layers must use one React subscription path, not three
3. the visible steady-state `ResourceCard` body must avoid render-time recomputation and avoid subtree rerenders when its derived data reference is unchanged

---

## 3. Goals

1. Eliminate render-time recomputation in `useImperativeRuntimeDerivedValue(...)` except when a structural input actually changes.
2. Collapse node overlay auxiliary data back to one derived-value subscription.
3. Keep node overlay cards on the current optimized path.
4. Keep `ResourceCard` live bars and live text on the existing imperative `entity-state-link` path.
5. Reduce React flush and allocation churn without introducing a new store or provider.

---

## 4. Non-Goals

The following are explicitly out of scope:

1. Any redesign of the node overlay semantic entry cache in `useResolvedNodeOverlayEntries.ts`.
2. Any change to node overlay live bar/text runtime cadence values.
3. Any change to `EntityStateLinkProvider`, `useEntityBarRuntime`, or `useEntityTextRuntime` in this LLD.
4. Any new top-level Context or Zustand store.
5. Any move to an imperative DOM pool for overlay cards.
6. Any change to tooltip infrastructure outside `ResourceCard` steady-state render avoidance.
7. Any attempt to remove Phaser cost or simulation cost.

---

## 5. Existing Contracts to Preserve

The implementation must preserve all of the following existing contracts:

1. `useImperativeRuntimeDerivedValue(...)` remains a hook that:
    - subscribes to runtime invalidation
    - returns a derived value
    - rerenders only when equality fails
2. `useNodeOverlayNodeModels(rootRef, enabled)` remains unchanged.
3. `NodeOverlayCard` remains unchanged in behavior.
4. `EntityStateLinkProvider` remains unchanged in interface.
5. `ResourceCard` remains a selection card that renders:
    - title
    - description/subtitle
    - storage display rows
6. `resolveResourceCardHydrationPlan(...)` remains the source of the Resource Card invalidation plan.
7. `resourceCardDataEqual(...)` remains the equality source for Resource Card data.
8. Existing view behavior for guidance, runtime callouts, cave status, and resource storage rows remains unchanged.

---

## 6. Design Summary

## 6.1 Fix 1 — rewrite `useImperativeRuntimeDerivedValue`

The hook will be changed so that:

- it computes the derived value synchronously only when a caller-declared structural input changes
- it does not call `resolve(runtime)` on every render
- mutation-driven recomputation happens only inside the invalidation subscription callback

This preserves synchronous correctness for structural changes while eliminating unnecessary render-path recomputation.

## 6.2 Fix 2 — collapse node overlay auxiliary data into one subscription

A new hook will replace the current three-hook auxiliary split:

- `useNodeOverlayAuxiliaryData(inputs, enabled)`

This hook will derive, cache, and return:

- `guidanceModels`
- `screenGuidanceModels`
- `runtimeCalloutModels`
- `caveStatusPosition`

using one `useImperativeRuntimeDerivedValue(...)` subscription and one equality boundary.

`NodeOverlayViewport.tsx` and `useNodeOverlayViewportData.ts` will both consume that single auxiliary hook.

## 6.3 Fix 3 — stabilize the steady-state Resource Card body

`ResourceCard` will move behind a dedicated data hook:

- `useResourceCardData(entity, runtime)`

That hook will use the repaired `useImperativeRuntimeDerivedValue(...)` with explicit structural inputs. `ResourceCardView` will be memoized so parent rerenders do not traverse the visible card subtree when the data object reference is unchanged.

This is sufficient because the Resource Card visible live values are already rendered through `AbilityBarDisplay`, which uses:

- `useEntityBarRef(...)`
- `useEntityTextRef(...)`

The visible body therefore needs stable structure, not more live subscription logic.

---

## 7. Detailed Design

## 7.1 Fix 1 — `useImperativeRuntimeDerivedValue`

### 7.1.1 New interface contract

Current interface:

- `runtime`
- `plan`
- `resolve`
- `isEqual`

New interface:

- `runtime`
- `plan`
- `structuralDeps`
- `resolve`
- `isEqual`

Required signature:

```text
useImperativeRuntimeDerivedValue(
    runtime,
    plan,
    structuralDeps,
    resolve,
    isEqual,
): TValue
```

Where:

- `structuralDeps` is a readonly array of caller-supplied structural inputs whose change requires immediate synchronous recomputation for correctness

### 7.1.2 Structural dependency contract

A structural dependency is any input that changes the derived value even if no runtime invalidation callback has fired yet.

Examples from the current codebase:

- viewport width
- viewport height
- camera revision
- runtime callout items reference
- selected entity object identity
- runtime identity

A structural dependency is **not** a live mutation stream. Runtime invalidation remains responsible for mutation-driven updates.

### 7.1.3 Render-time compute rules

The hook must obey these rules exactly:

1. On first render, compute `resolve(runtime)` exactly once and store it.
2. On later renders, do not call `resolve(runtime)` unless either:
    - `runtime` identity changed, or
    - `structuralDeps` changed by shallow equality
3. If neither changed, return the cached ref value without recomputation.
4. Mutation-driven recomputation must happen only in the invalidation subscription callback.

### 7.1.4 Internal state required

The hook must maintain refs for:

- cached derived value
- current `resolve` function
- current equality function
- last runtime identity used for synchronous resolution
- last structural dependency array used for synchronous resolution
- initialization flag

### 7.1.5 Subscription behavior

The subscription behavior remains invalidation-driven.

On callback:

1. compute `next = resolve(runtime)`
2. if `isEqual(current, next)` is true, do nothing
3. otherwise update the cached value ref and force one rerender

### 7.1.6 No-ambiguity rule

After this change, a stable rerender of a component using this hook must not call `resolve(runtime)`.

That is a hard contract.

---

## 7.2 Fix 2 — combined auxiliary overlay hook

## 7.2.1 New file: `useNodeOverlayAuxiliaryData.ts`

A new hook is added:

- `src/ui/runtime/world/node-overlays/useNodeOverlayAuxiliaryData.ts`

### Responsibility

Own all non-node-card overlay data that is currently split across three hooks:

- guidance
- screen guidance
- runtime callouts
- cave status position

### Interface

Input:

- `inputs: NodeOverlayViewportInputs`
- `enabled: boolean`

Output:

- `GuidanceData`
- `runtimeCalloutModels`
- `caveStatusPosition`

Concrete return shape:

```text
{
    guidanceModels,
    screenGuidanceModels,
    runtimeCalloutModels,
    caveStatusPosition,
}
```

### Logic

The hook must:

1. use `useImperativeRuntimeDerivedValue(...)`
2. use the existing `NODE_OVERLAY_LAYER_PLAN`
3. pass structural deps:
    - `enabled`
    - `inputs.getCameraState`
    - `inputs.cameraRevision`
    - `inputs.viewportWidth`
    - `inputs.viewportHeight`
    - `inputs.runtimeCalloutItems`
4. when disabled, return the existing empty auxiliary values
5. when enabled, compute all four auxiliary outputs in one resolver function
6. apply one equality function that checks all four outputs together

### Required reuse

This hook must reuse existing utilities and equality helpers where possible:

- `resolveRuntimeGuidanceViews(...)`
- `resolveGuidanceModels(...)`
- `resolveScreenGuidanceModels(...)`
- `resolveRuntimeCalloutModels(...)`
- `resolveCaveStatusPosition(...)`
- `guidanceEqual(...)`
- `runtimeCalloutEqual(...)`
- `screenGuidanceEqual(...)`
- `positionEqual(...)`
- `arrayEqual(...)`
- existing empty constants from `nodeOverlayViewportLayerUtils.ts`

### Equality contract

The hook must rerender only when one of these actually changes semantically:

- any guidance model
- any screen guidance model
- any runtime callout model
- cave status position

### Why one hook is required

This hook is required because one mutation should cause at most one auxiliary-layer React wakeup, not three parallel hook wakeups.

---

## 7.3 Fix 3 — restore a single auxiliary consumer path

## 7.3.1 Changed file: `NodeOverlayViewport.tsx`

### Responsibility after change

Consume:

- `useNodeOverlayNodeModels(...)`
- `useNodeOverlayAuxiliaryData(...)`

and pass the combined data to `NodeOverlayViewportView`.

### Changes

Replace direct usage of:

- `useNodeOverlayGuidanceData(...)`
- `useNodeOverlayRuntimeCalloutModels(...)`
- `useNodeOverlayCaveStatusPosition(...)`

with one call to `useNodeOverlayAuxiliaryData(...)`.

### Interface contract

No prop or render contract change is allowed for `NodeOverlayViewportView`.

## 7.3.2 Changed file: `useNodeOverlayViewportData.ts`

### Responsibility after change

Remain the combined hook that returns `OverlayViewportData`, but internally use:

- `useNodeOverlayNodeModels(...)`
- `useNodeOverlayAuxiliaryData(...)`

### Changes

Replace the three split-hook calls with the single auxiliary hook.

### Interface contract

No signature or return-shape change is allowed.

## 7.3.3 Changed file: `nodeOverlayViewportLayerUtils.ts`

### Responsibility after change

Continue to own the shared equality helpers and empty constants for overlay auxiliary data.

### Changes

Add one new type:

- `NodeOverlayAuxiliaryData`

This type must be the exact shape returned by `useNodeOverlayAuxiliaryData(...)`.

Add one new equality helper:

- `nodeOverlayAuxiliaryDataEqual(left, right)`

This helper must compare:

- `guidanceModels`
- `screenGuidanceModels`
- `runtimeCalloutModels`
- `caveStatusPosition`

using the existing per-field equality helpers.

## 7.3.4 Files to remove or stop using

The following files must no longer be used by production overlay rendering:

- `useNodeOverlayGuidanceData.ts`
- `useNodeOverlayRuntimeCalloutModels.ts`
- `useNodeOverlayCaveStatusPosition.ts`

The implementation may either:

1. delete them and update imports/tests accordingly, or
2. retain them as thin wrappers around `useNodeOverlayAuxiliaryData(...)` only if they are still required by tests

This LLD prefers option 1 to avoid preserving an undesirable multi-subscription pattern.

---

## 7.4 Fix 4 — Resource Card steady-state optimization

## 7.4.1 New file: `useResourceCardData.ts`

### Responsibility

Own the derived data subscription for `ResourceCard`.

### Interface

Input:

- `entity: RuntimeEntity`
- `runtime: Runtime | null`

Output:

- `ResourceCardData | null`

### Logic

The hook must:

1. call `useImperativeRuntimeDerivedValue(...)`
2. use the existing `resolveResourceCardHydrationPlan(entity, runtime)`
3. pass structural deps:
    - `entity`
    - `runtime`
4. resolve with `resolveResourceCardData(entity, runtime)`
5. compare with `resourceCardDataEqual(...)`

### Why `entity` object identity is a structural dependency

The current `resolveResourceCardData(...)` reads from the selected entity object directly:

- label
- description
- storage display bars

If the selected entity object changes, the card must update synchronously even without a mutation callback.

## 7.4.2 Changed file: `ResourceCard.tsx`

### Responsibility after change

Delegate all data derivation to `useResourceCardData(...)` and render `ResourceCardView`.

### Changes

Replace direct usage of `useImperativeRuntimeDerivedValue(...)` with the dedicated hook.

### Interface contract

No component prop change is allowed.

## 7.4.3 Changed file: `ResourceCardView.tsx`

### Responsibility after change

Remain the presentational Resource Card body, but become memoized.

### Changes

Wrap the exported component in `React.memo(...)`.

### Equality contract

Default React prop equality is sufficient because the only prop is `data`, and `useResourceCardData(...)` returns a stable reference when `resourceCardDataEqual(...)` holds.

## 7.4.4 Optional changed file: `StorageAbilityDisplay.tsx`

### Responsibility after change

Remain the row list renderer for storage bars.

### Recommended change

Wrap in `React.memo(...)`.

This is optional because `ResourceCardView` memoization is the primary boundary, but it is allowed as a second boundary if desired.

This LLD does not require any change to:

- `AbilityBarDisplay.tsx`
- `resolveStorageAbilityBars.ts`
- `resolveResourceCardData.ts`
- `resourceCardHydration.ts`

because fixing the generic hook and memoizing the view is sufficient to remove the current render-path recomputation.

---

## 8. File-Level Change List

## 8.1 Changed file: `src/ui/runtime/hooks/useImperativeRuntimeDerivedValue.ts`

### Responsibility

Provide imperative invalidation-driven derivation without render-time recomputation on stable renders.

### Required interface

Add `structuralDeps` parameter.

### Required logic

- first-render synchronous resolve
- synchronous re-resolve only on runtime identity change or structural dependency change
- subscription-callback recompute for invalidation-driven updates
- no stable-render recompute

---

## 8.2 Changed file: `src/ui/runtime/hooks/useImperativeRuntimeDerivedValue.test.tsx`

### Responsibility

Test the new hook contract.

### New required test cases

1. stable rerender does not call `resolve` again
2. structural dependency change recomputes synchronously exactly once
3. mutation callback recomputes only inside subscription path
4. equal mutation result does not rerender
5. changed mutation result rerenders once
6. runtime swap unsubscribes old runtime and subscribes new runtime

---

## 8.3 Added file: `src/ui/runtime/world/node-overlays/useNodeOverlayAuxiliaryData.ts`

### Responsibility

Provide one combined auxiliary overlay subscription.

### Required interface

- `inputs`
- `enabled`
- returns combined auxiliary overlay data

### Required logic

- one `useImperativeRuntimeDerivedValue(...)`
- one resolver
- one equality boundary

---

## 8.4 Changed file: `src/ui/runtime/world/node-overlays/nodeOverlayViewportLayerUtils.ts`

### Responsibility

Own shared auxiliary types, empties, and equality.

### Required changes

- add `NodeOverlayAuxiliaryData`
- add `nodeOverlayAuxiliaryDataEqual(...)`

---

## 8.5 Changed file: `src/ui/runtime/world/node-overlays/NodeOverlayViewport.tsx`

### Responsibility

Consume one auxiliary hook instead of three.

### Required changes

- keep `useNodeOverlayNodeModels(...)`
- replace three auxiliary hooks with `useNodeOverlayAuxiliaryData(...)`

---

## 8.6 Changed file: `src/ui/runtime/world/node-overlays/useNodeOverlayViewportData.ts`

### Responsibility

Continue to provide `OverlayViewportData` while using one auxiliary hook internally.

### Required changes

- replace three auxiliary hooks with `useNodeOverlayAuxiliaryData(...)`
- keep `overlayViewportDataEqual(...)` caching unchanged

---

## 8.7 Removed or retired files

Preferred removal:

- `src/ui/runtime/world/node-overlays/useNodeOverlayGuidanceData.ts`
- `src/ui/runtime/world/node-overlays/useNodeOverlayRuntimeCalloutModels.ts`
- `src/ui/runtime/world/node-overlays/useNodeOverlayCaveStatusPosition.ts`

If retained for test migration only, they must not be used by production code.

---

## 8.8 Added file: `src/ui/runtime/world/selection/useResourceCardData.ts`

### Responsibility

Provide stable, non-render-recomputing derived data for `ResourceCard`.

### Required interface

- `entity`
- `runtime`
- returns `ResourceCardData | null`

---

## 8.9 Changed file: `src/ui/runtime/world/selection/ResourceCard.tsx`

### Responsibility

Use `useResourceCardData(...)` and render `ResourceCardView`.

---

## 8.10 Changed file: `src/ui/runtime/world/selection/ResourceCardView.tsx`

### Responsibility

Memoized presentational Resource Card body.

---

## 8.11 Optional changed file: `src/ui/runtime/world/selection/ability-display/StorageAbilityDisplay.tsx`

### Responsibility

Optional second render boundary for storage rows.

---

## 9. Tests

## 9.1 Changed test file: `useNodeOverlayViewportData.layers.test.tsx`

### Responsibility after change

Test the combined auxiliary hook instead of three split hooks.

### Required test cases

1. node-only mutations keep auxiliary data refs stable
2. runtime callout item changes update auxiliary data once
3. cave status position stays stable when unaffected
4. guidance data stays stable when unaffected

The test must verify the combined returned object fields, not internal hook steps.

## 9.2 Changed test file: `ResourceCard.live.test.tsx`

### Required additions

Add one new assertion case:

- a parent rerender with unchanged `entity` and unchanged runtime must not rerender the visible Resource Card body

This test must use `Profiler` or equivalent render counting at the Resource Card view boundary.

## 9.3 Changed test file: `ResourceCard.test.tsx`

### Required additions

Keep current behavior tests unchanged.

If `ResourceCardView` is memoized, no extra behavior assertions are required.

## 9.4 New optional test file: `useResourceCardData.test.tsx`

### Responsibility

Test the dedicated Resource Card data hook directly.

### Recommended cases

1. initial resolve is synchronous
2. stable rerender does not recompute
3. entity identity change recomputes synchronously
4. blueprint revision change updates the value

This file is optional but recommended.

---

## 10. Pseudocode

## 10.1 `useImperativeRuntimeDerivedValue`

```text
if first render:
    value = resolve(runtime)
    cache runtime identity
    cache structural deps
    mark initialized
    return value

if runtime identity changed OR structural deps changed:
    next = resolve(runtime)
    if not equal(current, next):
        current = next
    cache runtime identity
    cache structural deps

subscribe to invalidation scopes:
    on callback:
        next = resolve(runtime)
        if equal(current, next):
            return
        current = next
        force rerender once

return current
```

## 10.2 `useNodeOverlayAuxiliaryData`

```text
useImperativeRuntimeDerivedValue(
    runtime when enabled else null,
    NODE_OVERLAY_LAYER_PLAN,
    [enabled, getCameraState, cameraRevision, viewportWidth, viewportHeight, runtimeCalloutItems],
    resolve all auxiliary overlay values together,
    nodeOverlayAuxiliaryDataEqual,
)
```

## 10.3 `useResourceCardData`

```text
useImperativeRuntimeDerivedValue(
    runtime,
    resolveResourceCardHydrationPlan(entity, runtime),
    [entity, runtime],
    () => resolveResourceCardData(entity, runtime),
    resourceCardDataEqual,
)
```

---

## 11. Acceptance Criteria

The implementation is complete only when all of the following are true:

1. `useImperativeRuntimeDerivedValue(...)` does not recompute on stable renders.
2. `NodeOverlayViewport.tsx` does not mount three separate auxiliary derived-value subscriptions anymore.
3. `useNodeOverlayViewportData(...)` uses the same single auxiliary data source as `NodeOverlayViewport.tsx`.
4. `ResourceCard` no longer calls the generic hook directly.
5. `ResourceCardView` does not rerender when its `data` prop reference is unchanged.
6. Existing node overlay and Resource Card behavior remains unchanged.
7. No new provider, store, or speculative abstraction is introduced.
8. All changed and new tests pass.

---

## 12. Explicit Non-Ambiguity Notes

1. This LLD does **not** change `useNodeOverlayNodeModels(...)`.
2. This LLD does **not** change `EntityStateLinkProvider` or either live runtime cadence.
3. This LLD does **not** redesign node overlay cards or move them off React.
4. This LLD does **not** split tooltip content out of `AbilityBarDisplay`.
5. The generic hook fix is mandatory; it is not optional.
6. The combined auxiliary hook is mandatory; keeping the current three-hook production wiring is not allowed.
7. The dedicated `useResourceCardData(...)` hook is mandatory; keeping the current direct generic-hook call in `ResourceCard.tsx` is not allowed.

