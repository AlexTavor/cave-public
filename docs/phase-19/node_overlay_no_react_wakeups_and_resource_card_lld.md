# LLD — Remove Mutation-Driven React Wakeups from the Overlay Runtime Path and Optimize Resource Card

## Basis

Canonical constraints in force:

- `context-pack.md`
- `prompt-contract.md`
- `testing-standards.md`

Primary production files inspected:

- `src/ui/runtime/world/entity-state-link/EntityStateLinkContext.tsx`
- `src/ui/runtime/world/entity-state-link/entityStateLinkRuntime.ts`
- `src/ui/runtime/world/entity-state-link/entityStateLinkTextRuntime.ts`
- `src/ui/runtime/world/entity-state-link/useEntityBarRef.ts`
- `src/ui/runtime/world/entity-state-link/useEntityTextRef.ts`
- `src/ui/runtime/world/entity-state-link/types.ts`
- `src/ui/runtime/world/node-overlays/useNodeOverlayViewportData.ts`
- `src/ui/runtime/world/node-overlays/NodeOverlayViewport.tsx`
- `src/ui/runtime/world/node-overlays/NodeOverlayViewportView.tsx`
- `src/ui/runtime/world/node-overlays/useNodeOverlayNodeModels.ts`
- `src/ui/runtime/world/node-overlays/nodeOverlayComparators.ts`
- `src/ui/runtime/world/selection/ResourceCard.tsx`
- `src/ui/runtime/world/selection/resolveResourceCardData.ts`
- `src/ui/runtime/world/selection/resourceCardHydration.ts`
- `src/ui/runtime/world/selection/selectionHydrationUtils.ts`
- `src/ui/runtime/world/selection/ability-display/abilityDisplay.types.ts`
- `src/ui/runtime/world/selection/ability-display/resolveStorageAbilityBars.ts`
- `src/ui/runtime/world/selection/ability-display/AbilityBarDisplay.tsx`
- `src/ui/runtime/hooks/useRuntimeSelector.ts`
- `src/ui/runtime/hooks/useRuntimeRevisionToken.ts`
- `src/ui/runtime/world/hydration/hydrationTypes.ts`
- `src/engine/runtime/runtimeInvalidationTypes.ts`

Primary tests inspected:

- `src/ui/runtime/world/EntityStateLink.test.tsx`
- `src/ui/runtime/world/selection/ResourceCard.live.test.tsx`
- `src/ui/runtime/world/selection/ability-display/AbilityBarDisplay.test.tsx`

---

## 1. Why

### 1.1 Current remaining problem

The current implementation already moved node overlay live text and bar fill off the direct React render path:

- bars are updated by `EntityStateLinkProvider` + `entityStateLinkRuntime.ts`
- live text is updated by `EntityStateLinkProvider` + `entityStateLinkTextRuntime.ts`
- node overlay entry equality ignores live bar snapshots and live text output

However, the UI is still woken by runtime mutations in two places:

1. **Overlay runtime binding path**
    - `EntityStateLinkProvider` still reads `useRuntimeRevisionToken(...)`
    - `useEntityBarRuntime(runtime, token)` and `useEntityTextRuntime(runtime, token)` still depend on that token
    - every relevant mutation therefore still triggers a React external-store wakeup before the provider merely updates refs and waits for cadence timers

2. **Auxiliary overlay layer hooks**
    - `useNodeOverlayGuidanceData(...)`
    - `useNodeOverlayRuntimeCalloutModels(...)`
    - `useNodeOverlayCaveStatusPosition(...)`
      all use `useLayerToken(...)`, which uses `useRuntimeRevisionToken(...)` with mutation revision enabled

The result is that faster simulation still increases the number of React wakeups even when visible node cards are already decoupled from live value rendering.

### 1.2 Resource Card has the same structural issue

`ResourceCard.tsx` currently uses:

- `useRuntimeSelector(...)`
- `resolveResourceCardHydrationPlan(entity, runtime)`
- `resolveResourceCardData(entity, runtime)`
- `resourceCardDataEqual(...)`

`useRuntimeSelector(...)` is token-driven and therefore wakes React whenever the selected entity revision changes.

At the same time:

- `resolveStorageAbilityBars(...)` still includes live `current`, `max`, and `valueText`
- `storageModelsEqual(...)` still compares `current`, `max`, and `valueText`
- `AbilityBarDisplay.tsx` still renders `model.valueText` through React

So Resource Card still rerenders on storage value churn.

### 1.3 What must change

To remove mutation-driven React wakeups from the overlay runtime path and the steady-state Resource Card body:

1. runtime invalidation must be observed **imperatively**, not through `useRuntimeRevisionToken(...)`, for the binding runtime
2. derived overlay layer hooks must subscribe imperatively and only commit React state when the derived value changed semantically
3. Resource Card must stop treating storage live values as semantic render data
4. Resource Card must stop using token-driven selector wakeups for its steady-state card body

---

## 2. Scope

## 2.1 In scope

1. Remove `useRuntimeRevisionToken(...)` from the overlay binding runtime path.
2. Keep bar/text cadence loops but make dirty-tracking fully imperative.
3. Replace token-driven auxiliary overlay hooks with imperative derived subscriptions that only call React state setters when the derived value changes semantically.
4. Optimize Resource Card so live storage values no longer wake React for the steady-state card body.
5. Reuse the existing bar/text binding mechanism for Resource Card visible values.

## 2.2 Out of scope

1. Any change to `useResolvedNodeOverlayEntries(...)` or node overlay semantic selection rules.
2. Any change to `useNodeOverlayNodeModels(...)` projection rules.
3. Any change to Phaser rendering.
4. Any imperative DOM pool for node overlay cards.
5. Any redesign of tooltip infrastructure.
6. Any optimization of hovered tooltip content.

Hovered tooltip content is out of scope because the performance target under discussion is the steady-state visible card set, not an active tooltip subtree.

---

## 3. Goals

1. No runtime mutation may wake React in `EntityStateLinkProvider` merely to update dirty refs.
2. Auxiliary overlay layer hooks must no longer wake React on every mutation when their derived values are semantically unchanged.
3. Resource Card visible storage bars and visible storage text must no longer wake React on value-only mutations.
4. Existing semantic correctness must be preserved for node overlays and Resource Card body rendering.
5. The design must reuse existing invalidation readers, cadence timers, binding infrastructure, and comparators where possible.

---

## 4. Non-Goals

1. Do not introduce a new app-level store.
2. Do not introduce a new top-level provider.
3. Do not redesign `NodeOverlayViewportView`.
4. Do not redesign `ResourceCardView` layout.
5. Do not change tooltip UX or hover delays.
6. Do not change current bar/text cadence values.

---

## 5. Design Summary

The design has three parts.

### Part A — imperative invalidation for entity-state-link

`EntityStateLinkProvider` remains the dependency-injection boundary, but runtime invalidation is no longer observed through React tokens.

Instead:

- bar runtime and text runtime subscribe directly to `runtime.getInvalidation().subscribe(...)` inside effects
- mutation callbacks update refs only
- cadence timers consume those refs on their existing intervals
- React is not woken by mutation publication for this path

### Part B — imperative derived runtime hooks for auxiliary overlay layers

A new hook is introduced for runtime-derived React values that must still render through React, but must not wake on every mutation.

This hook:

- subscribes directly to runtime invalidation scopes
- recomputes a derived value in the subscription callback
- compares that value with the last committed value
- calls a React state setter only when the derived value changed semantically

This replaces the current `useLayerToken(...)` pattern in:

- guidance layer data
- runtime callout models
- cave status position

### Part C — Resource Card live-value split

Resource Card visible storage values will use the same live binding approach already used by node overlays:

- storage bar fill remains on `useEntityBarRef(...)`
- visible storage value text moves to `useEntityTextRef(...)`
- storage model equality ignores live `current`, `max`, and live displayed text
- the card body subscribes imperatively and only rerenders when semantic card structure changes

---

## 6. Detailed Design

## 6.1 New hook: `useImperativeRuntimeDerivedValue`

### File to add

`src/ui/runtime/hooks/useImperativeRuntimeDerivedValue.ts`

### Responsibility

Provide a runtime-derived React value that is updated by an imperative invalidation subscription and only commits React state when the derived value changed semantically.

This hook exists to replace token-driven `useRuntimeRevisionToken(...)` wakeups in UI paths where:

- the runtime-derived value is still React-rendered
- mutation publication is more frequent than semantic UI changes

### Interface

```text
useImperativeRuntimeDerivedValue<TRuntime, TValue>(
    runtime: TRuntime | null,
    plan: HydrationDependencyPlan,
    resolve: (runtime: TRuntime | null) => TValue,
    isEqual: (left: TValue, right: TValue) => boolean,
): TValue
```

### Logic

1. Resolve the initial value synchronously during render using `resolve(runtime)`.
2. Store the committed value in React state.
3. In an effect:
    - read `runtime.getInvalidation?.()`
    - subscribe to the scopes implied by `HydrationDependencyPlan`
4. On each invalidation callback:
    - compute `nextValue = resolve(runtime)`
    - compare with the latest committed value using `isEqual`
    - only call `setState(nextValue)` when `isEqual` returns `false`
5. Unsubscribe on cleanup.
6. Resubscribe when runtime identity or normalized plan scopes change.

### Scope resolution rules

This hook must reuse the exact scope semantics already encoded in `useRuntimeRevisionToken.ts`:

- `world`
- `frame` when requested
- `mutation` when requested
- `entity-list` when requested
- `blueprint` when requested
- `entity:${id}` for each normalized entity ID

The new hook must not invent new invalidation scope rules.

### Contract

- mutation callbacks may occur frequently
- React state commits may only occur when the derived value changed semantically
- if `runtime` is `null`, the hook must return `resolve(null)` and hold no subscription

---

## 6.2 Overlay runtime binding path — remove token-driven wakeups

### Changed file

`src/ui/runtime/world/entity-state-link/EntityStateLinkContext.tsx`

### Responsibility after change

Continue to provide:

- `register(...)`
- `unregister(...)`
- `registerText(...)`
- `unregisterText(...)`

but without using `useRuntimeRevisionToken(...)` to observe mutation changes.

### Required changes

1. Remove the `token` acquisition from `EntityStateLinkProvider`.
2. Stop passing `token` into bar/text runtime hooks.
3. Keep the provider value stable based only on stable callbacks.
4. Replace the internal `useEntityTextRuntime(runtime, token)` signature with `useEntityTextRuntime(runtime)`.
5. Continue to perform immediate first sync on registration.

### Logic contract

`EntityStateLinkProvider` may rerender when:

- the runtime identity changes
- the provider’s own props change

It must not rerender because the mutation revision changed.

---

### Changed file

`src/ui/runtime/world/entity-state-link/entityStateLinkRuntime.ts`

### Responsibility after change

Continue to own bar binding registry management and cadence syncing, but observe invalidation imperatively instead of via React tokens.

### Interface changes

`useEntityBarRuntime` changes from:

```text
useEntityBarRuntime(runtime, token)
```

to:

```text
useEntityBarRuntime(runtime)
```

No caller other than `EntityStateLinkContext.tsx` is affected.

### Required logic changes

1. Remove `token` from the hook signature.
2. Remove any state whose only purpose is to rerun an effect after mutation token changes.
3. Add an effect that:
    - reads `runtime.getInvalidation?.()`
    - subscribes directly to scopes:
        - `entity-list`
        - `mutation`
4. In the invalidation callback:
    - if runtime changed or entity-list revision changed, mark `fullRefreshRef.current = true`
    - if mutation revision changed, union `getLastChangedEntityIds()` into the bar dirty set only for entity IDs that have registered bars
5. Keep the existing cadence interval at `BAR_SYNC_INTERVAL_MS = 16`
6. Keep the existing bar sync functions:
    - `createInternalBarBinding(...)`
    - `syncSingleEntityBarBinding(...)`
    - `syncEntityBarBindings(...)`
7. The cadence effect must start/stop from registry/runtime state only, not from mutation-token-driven React state.

### Timer lifecycle contract

The bar cadence loop must run only when:

- `runtime !== null`
- bar registry size is greater than zero

The bar cadence loop must stop when either condition becomes false.

### Dirty-set contract

A mutation affecting an entity with no registered bars must not dirty any bar binding.

---

### Changed file

`src/ui/runtime/world/entity-state-link/entityStateLinkTextRuntime.ts`

### Responsibility after change

Continue to own live text binding creation, equality, single-binding sync, and bulk sync, but become compatible with a token-free imperative runtime observer.

### Required changes

No interface change is required for the exported sync helpers.

This file remains the authoritative home of:

- `TEXT_SYNC_INTERVAL_MS`
- `createInternalTextBinding(...)`
- `entityTextBindingEqual(...)`
- `syncSingleEntityTextBinding(...)`
- `syncEntityTextBindings(...)`

### Additional contract

No new React state or subscription logic may be added to this file.

This file remains runtime-pure and imperative.

---

## 6.3 Overlay auxiliary layers — replace token wakeups with imperative derived subscriptions

### Changed file

`src/ui/runtime/world/node-overlays/useNodeOverlayViewportData.ts`

### Responsibility after change

Continue to expose:

- `useNodeOverlayViewportInputs(...)`
- `useNodeOverlayGuidanceData(...)`
- `useNodeOverlayRuntimeCalloutModels(...)`
- `useNodeOverlayCaveStatusPosition(...)`
- `useNodeOverlayViewportData(...)`

but stop using `useLayerToken(...)`.

### Required changes

#### A. Remove `useLayerToken(...)`

Delete the internal `useLayerToken(...)` helper.

#### B. Replace each auxiliary layer hook with `useImperativeRuntimeDerivedValue(...)`

##### `useNodeOverlayGuidanceData(...)`

Use `useImperativeRuntimeDerivedValue(...)` with:

- runtime: `inputs.runtime`
- plan:
    - `entityIds: []`
    - `includeEntityListRevision: true`
    - `includeBlueprintRevision: true`
    - `includeMutationRevision: true`
- resolve:
    - current logic that resolves runtime guidance views, then `guidanceModels`, then `screenGuidanceModels`
- equality:
    - existing guidance model array equality logic already in this file

##### `useNodeOverlayRuntimeCalloutModels(...)`

Use `useImperativeRuntimeDerivedValue(...)` with:

- runtime: `inputs.runtime`
- plan:
    - `entityIds: []`
    - `includeEntityListRevision: true`
    - `includeBlueprintRevision: true`
    - `includeMutationRevision: true`
- resolve:
    - current logic calling `resolveRuntimeCalloutModels(...)`
    - continue to key by current `runtimeCalloutItems`
- equality:
    - existing runtime callout model equality logic already in this file

##### `useNodeOverlayCaveStatusPosition(...)`

Use `useImperativeRuntimeDerivedValue(...)` with:

- runtime: `inputs.runtime`
- plan:
    - `entityIds: []`
    - `includeEntityListRevision: true`
    - `includeBlueprintRevision: true`
    - `includeMutationRevision: true`
- resolve:
    - current `resolveCaveStatusPosition(...)` logic
- equality:
    - existing `posEq(...)`

### Contract

These hooks may still respond to mutation-driven **semantic** overlay changes.

They must not wake React merely because the mutation revision changed when the derived layer value is semantically unchanged.

### Explicit non-goal

This file does **not** change `useNodeOverlayNodeModels(...)` or node overlay semantic selection. Those remain intentionally invalidation-driven.

---

## 6.4 Resource Card — remove live storage value churn from React

### Changed file

`src/ui/runtime/world/selection/ability-display/abilityDisplay.types.ts`

### Responsibility after change

Continue to define `AbilityBarModel`, but split value display into static vs live variants.

### Required shape change

`AbilityBarModel` must become an exclusive value-display union.

#### Static value variant

Fields:

- `valueText: string`
- `valueBinding` absent

#### Live value variant

Fields:

- `valueBinding: EntityTextBinding`
- `valueText` absent

All existing non-value fields remain unchanged:

- `id`
- `entityId`
- `valuePath`
- `maxPath`
- `maxValue`
- `current`
- `max`
- `color`
- `iconId`
- `title`
- `titleMetaText`
- `tooltipTitle`
- `tooltipLines`
- `height`

### Contract

Exactly one value-display variant must be present for every `AbilityBarModel`.

---

### Changed file

`src/ui/runtime/world/selection/ability-display/resolveStorageAbilityBars.ts`

### Responsibility after change

Continue to resolve storage bar models, but stop baking the live visible value string into semantic card data.

### Required changes

For each resolved storage bar model:

1. keep all existing semantic fields unchanged
2. keep `current` and `max` snapshots for initial bar mount only
3. replace eager `valueText` with:
    - `valueBinding` of kind `compact-fraction`
    - `id: ${existing model id}:value`
    - `entityId`
    - `valuePath`
    - either `maxPath` or `maxValue` exactly as already resolved

### Contract

The visible storage value text for Resource Card must be live-bound through `EntityStateLinkProvider`, not through React props.

Tooltip lines remain unchanged in this LLD and are explicitly out of scope for steady-state optimization.

---

### Changed file

`src/ui/runtime/world/selection/ability-display/AbilityBarDisplay.tsx`

### Responsibility after change

Continue to render a bar row and its tooltip, but support both static and live visible value text.

### Required changes

1. Continue to use `useEntityBarRef(...)` for the fill bar.
2. Add `useEntityTextRef(...)` for the visible value text when the model carries `valueBinding`.
3. Keep the static `valueText` render path for non-live models.
4. Keep tooltip rendering unchanged.

### Rendering contract

#### Static-value model

Render the current visible value exactly as today.

#### Live-value model

Render a stable value DOM node whose content is imperatively owned by `EntityStateLinkProvider` via `useEntityTextRef(...)`.

The visible value for Resource Card must no longer depend on React rerenders.

---

### Changed file

`src/ui/runtime/world/selection/selectionHydrationUtils.ts`

### Responsibility after change

Continue to provide `storageModelsEqual(...)`, but stop treating live storage snapshots as semantic identity.

### Required changes

`storageModelsEqual(...)` must compare:

- `id`
- `entityId`
- `valuePath`
- `maxPath`
- `maxValue`
- `color`
- `iconId`
- `title`
- `titleMetaText`
- `tooltipTitle`
- `height`
- `tooltipLines`
- value-display identity:
    - static `valueText`, or
    - `entityTextBindingEqual(valueBinding, other.valueBinding)`

`storageModelsEqual(...)` must no longer compare:

- `current`
- `max`
- live displayed value string

### Contract

Live storage value changes must not change Resource Card semantic equality.

---

### Changed file

`src/ui/runtime/world/selection/ResourceCard.tsx`

### Responsibility after change

Continue to render `ResourceCardView`, but stop using token-driven selector wakeups for the steady-state card body.

### Required changes

1. Remove `useRuntimeSelector(...)` from `ResourceCard`.
2. Replace it with `useImperativeRuntimeDerivedValue(...)`.
3. Reuse the existing hydration plan from `resolveResourceCardHydrationPlan(...)`.
4. Reuse the existing resolver from `resolveResourceCardData(...)`.
5. Reuse the updated `resourceCardDataEqual(...)`.

### Contract

The Resource Card body may only call a React state setter when the resolved card data changed semantically.

A storage value-only mutation must not rerender the Resource Card body.

---

### Changed file

`src/ui/runtime/world/selection/resourceCardHydration.ts`

### Responsibility after change

Continue to define Resource Card hydration behavior.

### Required changes

No shape change is required for `resolveResourceCardHydrationPlan(...)`.

`resourceCardDataEqual(...)` must remain the single semantic equality function for Resource Card body data, but it must inherit the new `storageModelsEqual(...)` semantics.

### Contract

The current plan remains authoritative for which runtime revisions are relevant to Resource Card.

This LLD changes only how those revision notifications reach React.

---

## 7. Tests

All existing tests must remain green unless explicitly updated by the contracts below.

## 7.1 New test file

`src/ui/runtime/hooks/useImperativeRuntimeDerivedValue.test.tsx`

### Responsibility

Prove that the new hook subscribes imperatively and only commits React state when the derived value changed semantically.

### Required tests

1. **initial value resolves synchronously**
    - Given runtime and a resolver
    - When the hook mounts
    - Then it returns the resolved value immediately

2. **mutation with equal derived value does not rerender**
    - Given a runtime invalidation reader and a resolver whose semantic output stays equal across mutations
    - When mutation notifications are emitted
    - Then the render count does not increase

3. **mutation with changed derived value rerenders once**
    - Given a resolver whose semantic output changes
    - When a relevant invalidation is emitted
    - Then the render count increases exactly once and the value updates

4. **unsubscribe on runtime change**
    - Given runtime A then runtime B
    - When the runtime prop changes
    - Then the hook unsubscribes from A and subscribes to B

These are logic/hook tests, not view tests.

---

## 7.2 Changed test file

`src/ui/runtime/world/EntityStateLink.test.tsx`

### Responsibility

Extend coverage to prove the provider no longer depends on mutation-driven React wakeups.

### Required additions

1. **live bar updates without provider rerender**
    - instrument a lightweight consumer render count inside `EntityStateLinkProvider`
    - emit multiple runtime mutations for a registered bar entity
    - advance timers
    - assert the bar DOM updates
    - assert the provider consumer render count does not increase from mutation publication

2. **live text updates without provider rerender**
    - same structure for a registered text binding
    - emit mutations
    - advance text cadence timer
    - assert text DOM updates
    - assert no provider rerender from mutation publication

These are view/integration tests because they verify DOM behavior and provider wiring.

---

## 7.3 Changed test file

`src/ui/runtime/world/selection/ResourceCard.live.test.tsx`

### Responsibility

Update Resource Card live storage coverage to verify that visible value text updates live without card-body rerender.

### Required changes

1. Stop mocking only `useEntityBarRef`.
2. Also provide the necessary text-binding support for visible value text.
3. Wrap the card with `EntityStateLinkProvider` if required by the new visible value binding path.
4. Instrument `ResourceCardView` render count or a thin wrapper render count.
5. Assert:
    - initial storage value renders correctly
    - after mutation and cadence advance, visible storage text updates
    - card-body render count does not increase because of the value-only mutation

This is the direct proof of the optimization.

---

## 7.4 Changed test file

`src/ui/runtime/world/selection/ability-display/AbilityBarDisplay.test.tsx`

### Responsibility

Cover both static and live visible value rendering.

### Required additions

1. **static visible value model**
    - existing behavior remains unchanged
2. **live visible value model**
    - the component renders a stable value element
    - the visible value is supplied through `useEntityTextRef(...)`
    - the component does not require a React prop string for the visible value

Tooltip assertions remain unchanged for the static test and are out of scope for live steady-state optimization.

---

## 7.5 Optional new test file

`src/ui/runtime/world/node-overlays/useNodeOverlayViewportData.imperative.test.tsx`

### Responsibility

Verify that auxiliary overlay layers no longer rerender merely because mutation revision changed when the derived values stay equal.

### Recommended cases

1. guidance data unchanged across mutation → no rerender
2. cave status unchanged across mutation → no rerender
3. runtime callouts unchanged across mutation → no rerender

This test file is optional but recommended because it directly covers the new non-token overlay hook contract.

---

## 8. Pseudocode

### 8.1 `useImperativeRuntimeDerivedValue`

```text
compute initialValue = resolve(runtime)
state = initialValue
lastCommittedRef = initialValue

useEffect:
    invalidation = runtime?.getInvalidation?.()
    if no invalidation:
        return

    scopes = resolveScopesFromHydrationPlan(plan)

    unsubscribe = invalidation.subscribe(scopes, () => {
        nextValue = resolve(runtime)
        if isEqual(lastCommittedRef.current, nextValue):
            return
        lastCommittedRef.current = nextValue
        setState(nextValue)
    })

    return unsubscribe
```

### 8.2 Imperative bar runtime

```text
useEffect on runtime:
    subscribe to [entity-list, mutation]
    callback:
        if runtime changed or entity-list changed:
            fullRefresh = true
            return
        for each changedEntityId:
            if entityCounts has changedEntityId:
                dirtyEntityIds.add(changedEntityId)

useEffect on runtime or registry-size:
    if runtime missing or registry empty:
        do nothing
    start interval every 16ms:
        if not fullRefresh and dirtyEntityIds empty:
            return
        syncEntityBarBindings(runtime, registry, entityIndex, dirtySet, fullRefresh)
        fullRefresh = false
        dirtyEntityIds.clear()
```

### 8.3 Resource Card

```text
ResourceCard:
    data = useImperativeRuntimeDerivedValue(
        runtime,
        resolveResourceCardHydrationPlan(entity, runtime),
        () => resolveResourceCardData(entity, runtime),
        resourceCardDataEqual,
    )
    render ResourceCardView(data)
```

### 8.4 AbilityBarDisplay live visible value

```text
if model has static valueText:
    render static visible value as before
else:
    valueRef = useEntityTextRef(model.valueBinding)
    render stable value element with ref=valueRef and no React text child
```

---

## 9. Acceptance Criteria

The work is complete only when all of the following are true:

1. `EntityStateLinkProvider` no longer calls `useRuntimeRevisionToken(...)`.
2. `useEntityBarRuntime(...)` no longer accepts a token argument.
3. runtime mutation publication no longer causes React wakeups in the overlay binding runtime path merely to update dirty refs.
4. `useNodeOverlayGuidanceData(...)`, `useNodeOverlayRuntimeCalloutModels(...)`, and `useNodeOverlayCaveStatusPosition(...)` no longer use token-based cache invalidation.
5. those auxiliary hooks only commit React state when their derived value changed semantically.
6. `ResourceCard.tsx` no longer uses `useRuntimeSelector(...)`.
7. storage visible value text in Resource Card is rendered through `useEntityTextRef(...)`.
8. value-only storage mutations no longer rerender the Resource Card body.
9. existing bar cadence and text cadence values remain unchanged.
10. no new top-level provider or app-level store is introduced.
11. all required tests in section 7 pass.

---

## 10. Explicit Non-Ambiguity Notes

1. This LLD does **not** remove invalidation-driven semantic node overlay selection.
2. This LLD removes mutation-driven React wakeups from the **overlay binding runtime path** and from **auxiliary overlay layer hooks when their derived value is unchanged**.
3. Resource Card optimization in this LLD applies to the steady-state visible card body, not hovered tooltip content.
4. Tooltip infrastructure is intentionally unchanged.
5. `useRuntimeRevisionToken.ts` remains in the codebase for other callers; this LLD does not delete or redesign it globally.
6. The new imperative derived hook is justified because both auxiliary overlay hooks and Resource Card require the same behavior and the current token-based hook does not satisfy the performance contract.

