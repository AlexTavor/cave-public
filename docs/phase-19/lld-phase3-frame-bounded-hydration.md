# LLD — Frame-Bounded Mutation Publication and Narrow Hydration Invalidation

## 1. Scope

### Objective

Implement the next performance correction for UI hydration invalidation in the codebase.

### In scope

1. Make runtime mutation publication frame-bounded instead of apply-phase-bounded.
2. Make hydration dependency tokens subscribe only to the revisions they actually track.
3. Stop runtime-wide hydration-plan scans from rerunning on every tracked entity revision.
4. Keep existing card resolvers, comparators, card view components, and overlay rendering behavior unchanged.

### Out of scope

1. No card business-logic changes.
2. No resolver output changes.
3. No lens mapping changes.
4. No new app-level state model beyond the existing Zustand runtime store and local hydrated stores.
5. No overlay semantic-model redesign beyond consuming the corrected invalidation stream.

### Locked architectural constraints

1. Runtime state remains the single source of truth.
2. UI remains observational only.
3. Zustand remains the mutable UI-state mechanism.
4. React Context remains dependency injection only; no frequently changing data in Context.

## 2. Why this change is required

The current Phase 2 implementation still publishes invalidation too often and too broadly.

### Problem A — mutation publication is still too frequent

`runtimeFactory.ts` publishes mutation summaries from `onCommandsApplied(...)`. That callback runs inside the fixed-step loop. At high time scales, one browser frame can execute multiple apply phases. The runtime store therefore publishes multiple mutation updates inside a single `requestAnimationFrame` callback.

Consequence:

- selection hydration hooks and overlay hydration wake multiple times per frame
- cost scales with simulation churn rather than visible frame cadence

### Problem B — hydration dependency tokens still subscribe too broadly

`useHydrationDependencyToken.ts` currently selects the entire `entityRevisionById` object. Any entity revision update changes that object identity. Every token consumer therefore rerenders even when none of its tracked ids changed.

Consequence:

- unrelated entity mutations rerender all token consumers
- token hooks still fan out across the selection layer

### Problem C — scan-heavy hydration plans are recomputed on every consumer rerender

Several hydration-plan resolvers scan `runtime.getEntities()`:

- `resolveSwarmCardHydrationPlan(...)`
- `resolveAttributePoolCardHydrationPlan(...)`
- `resolveDisplayCardHydrationPlan(...)`
- `resolveBodyCardHydrationPlan(...)`
- `resolveCaveCardHydrationPlan(...)`
- `resolveFaceCardHydrationPlan(...)`
- `resolveJobCardHydrationPlan(...)`

Those plan functions are currently called inline during render, before token evaluation. Even if only one tracked entity revision changes, the hook rerenders and the plan scan runs again.

Consequence:

- full runtime scans still occur on non-structural invalidation
- Swarm and overlay-adjacent selection surfaces remain expensive

## 3. Design summary

The implementation must make three behavioral changes.

### Change 1 — two-stage mutation invalidation

Mutation summaries must be **buffered during runtime execution** and **published once after the runtime tick completes**.

Behavioral contract:

- zero or more apply phases may contribute mutation summaries during one runtime tick
- the runtime store must not expose those summaries immediately
- after `runtime.tick(dt)` returns, one store publication must apply the merged summary and advance the runtime frame tick
- if the merged summary is empty, only the runtime view tick is advanced

### Change 2 — token selectors track only requested ids

A hydration token must subscribe only to:

- the revisions for the ids present in its normalized dependency plan
- `entityListRevision` only when requested by the plan
- `blueprintRevision` only when requested by the plan

Behavioral contract:

- unrelated entity revisions must not change the token
- tracked entity revisions must change the token
- duplicate ids in the plan remain ignored

### Change 3 — plan scans are structural only

Scan-heavy hydration plans must only be recomputed when one of these changes:

- selected entity identity
- runtime identity
- `entityListRevision`
- `blueprintRevision`

They must **not** be recomputed when only a tracked entity revision changes.

Behavioral contract:

- a tracked body/job/cave/etc. mutation may trigger hydration
- that mutation must reuse the existing dependency plan unless a structural revision changed

## 4. Detailed design

## 4.1 Frame-bounded mutation publication

### 4.1.1 Public state model

The runtime invalidation slice must distinguish between:

1. **pending mutation buffer** — internal, writable during apply phases
2. **published revision state** — visible to UI consumers

Pending mutation buffer fields:

- pending changed entity ids
- pending entity-list-changed flag
- pending blueprint-changed flag

Published revision fields remain:

- `runtimeViewTick`
- `runtimeMutationRevision`
- `entityListRevision`
- `blueprintRevision`
- `entityRevisionById`
- `lastChangedEntityIds`

### 4.1.2 Required behavior

1. `bufferRuntimeMutationSummary(summary)` merges the incoming summary into the pending buffer only.
2. `publishRuntimeFrame(tick)` performs a single store mutation that:
    - updates `runtimeViewTick` if needed
    - normalizes and publishes the pending changed ids
    - increments `runtimeMutationRevision` at most once
    - increments `entityListRevision` if any buffered summary marked entity-list change
    - increments `blueprintRevision` if any buffered summary marked blueprint change
    - increments `entityRevisionById[id]` exactly once for each published changed id
    - sets `lastChangedEntityIds` to the normalized published ids
    - clears the pending buffer
3. If the pending buffer is empty, `publishRuntimeFrame(tick)` must still update `runtimeViewTick` but must not touch the mutation revisions.
4. `resetViewInvalidation()` must clear both published state and pending buffer state.

### 4.1.3 Rationale for exact semantics

The store must publish once per frame because all hydration and overlay work consumes the store. Publishing per apply phase defeats the frame clock and makes time-scale amplify UI work.

## 4.2 Narrow hydration token subscription

### 4.2.1 Token input contract

The `HydrationDependencyPlan` interface remains unchanged:

- `entityIds: string[]`
- `includeEntityListRevision: boolean`
- `includeBlueprintRevision: boolean`

### 4.2.2 Required hook behavior

`useHydrationDependencyToken(plan)` must:

1. normalize ids once per render (`unique`, non-empty, sorted)
2. subscribe to only the revisions for those normalized ids
3. subscribe to `entityListRevision` only when `includeEntityListRevision` is true
4. subscribe to `blueprintRevision` only when `includeBlueprintRevision` is true
5. build the token from the normalized ids and the selected revision values only

### 4.2.3 Forbidden behavior

1. The hook must not subscribe to the full `entityRevisionById` object.
2. The hook must not rerender because an unrelated entity id changed.
3. The hook must not change its external API.

## 4.3 Structural memoization of scan-heavy hydration plans

### 4.3.1 Definition of scan-heavy plans

A scan-heavy plan is any hydration plan resolver that calls runtime-wide utilities such as:

- `runtime.getEntities()`
- `resolveRuntimeChildIds(...)`
- `resolveMatchingEntityIds(...)`

### 4.3.2 Required memoization rule

For scan-heavy plans, the plan must be memoized against structural inputs only:

- selected entity
- runtime
- `entityListRevision`
- `blueprintRevision`

This memoized plan is then passed into `useHydrationDependencyToken(...)`.

### 4.3.3 Why list + blueprint are the correct invalidators

In the current code:

- child-id discovery is based on entity-parent relationships rooted in spawned entities
- Swarm and attribute-pool plan membership is based on entity kinds/components present in the world
- blueprint-sensitive plans already mark `includeBlueprintRevision`

The expensive part is discovering **which ids must be watched**. That set is structural. The actual hydration of watched data remains driven by tracked entity revisions.

### 4.3.4 Required scope

This rule must be applied to the hydration hooks whose plan resolver scans runtime state.

## 5. File-by-file change set

## 5.1 Runtime invalidation publication

### File: `src/ui/runtime/state/resolveRuntimeMutationSummary.ts`

**Responsibility after change**

- Own the mutation-summary type, empty-summary constant, single-command resolution, and summary merge behavior.

**Change required**

- Add an exported empty-summary constant.
- Add an exported merge function that unions changed ids and ORs the structural flags.

**Interface**

- Existing `RuntimeMutationSummary` type remains the canonical summary shape.
- New exported helper: merge two summaries into one canonical summary.
- New exported helper/constant: canonical empty summary.

**Logic**

- Merging must preserve normalization guarantees.
- No caller may implement ad hoc merge logic.

### File: `src/ui/runtime/state/viewInvalidationSlice.ts`

**Responsibility after change**

- Own both pending mutation buffering and published invalidation revisions.

**Change required**

- Extend state with internal pending-mutation buffer fields.
- Replace immediate mutation publication with two-stage behavior.
- Add a single-frame publication action.

**Interface**

- Keep `publishRuntimeViewTick(...)` for existing direct tick-only callers.
- Add `bufferRuntimeMutationSummary(summary)`.
- Add `publishRuntimeFrame(tick)`.
- Keep `resetViewInvalidation()`.

**Logic**

- `bufferRuntimeMutationSummary(summary)` merges into pending buffer and performs no public revision update.
- `publishRuntimeFrame(tick)` updates `runtimeViewTick` and publishes the entire pending summary in one state transition.
- `resetViewInvalidation()` clears pending and published fields.

**Forbidden behavior**

- No public revision field may change during `bufferRuntimeMutationSummary(...)`.
- `runtimeMutationRevision` must not advance more than once per published frame.

### File: `src/ui/runtime/state/runtimeStoreTypes.ts`

**Responsibility after change**

- Type the runtime store with the new buffered/publication actions.

**Change required**

- Add `bufferRuntimeMutationSummary(...)` and `publishRuntimeFrame(...)` to the runtime store action surface.

**Logic**

- No other store contract changes.

### File: `src/ui/runtime/state/runtimeFactory.ts`

**Responsibility after change**

- Buffer apply-phase mutation summaries and publish them once after `runtime.tick(dt)` returns.

**Change required**

- Update the `StoreGetter` contract to require the new actions.
- Change telemetry `onCommandsApplied(...)` to call `bufferRuntimeMutationSummary(...)` instead of directly publishing revisions.
- After each `runtime.tick(dt)` in the ticker callback, call `publishRuntimeFrame(runtime.getState().tick)`.

**Logic**

- Notification, cinematic, runtime-event, callout, and visual-effect behavior remains unchanged.
- Only the invalidation publication path changes.

**Forbidden behavior**

- No direct call to published mutation invalidation inside `onCommandsApplied(...)`.

### File: `src/ui/runtime/state/simulationSlice.ts`

**Responsibility after change**

- Manual stepping must follow the same invalidation contract as the rAF path.

**Change required**

- Extend `SimulationHost` with `publishRuntimeFrame(...)`.
- After `runtime.tick(0)` in `step()`, call `publishRuntimeFrame(runtime.getState().tick)` instead of `publishRuntimeViewTick(...)`.

**Logic**

- Manual stepping and running simulation now share the same frame-bounded invalidation semantics.

## 5.2 Hydration token narrowing

### File: `src/ui/runtime/world/useHydrationDependencyToken.ts`

**Responsibility after change**

- Produce a stable token from only the revisions requested by the dependency plan.

**Change required**

- Replace whole-map subscription with narrow tracked-id revision selection.
- Keep list and blueprint revision subscriptions conditional.

**Interface**

- Signature unchanged.
- Return type unchanged.

**Logic**

- Normalize ids before selecting revisions.
- The selected entity-revision vector must contain one numeric revision per normalized id.
- Token construction must use only the normalized ids and selected revision values.

**Forbidden behavior**

- No subscription to the entire `entityRevisionById` map.

## 5.3 Structural memoization of scan-heavy selection plans

### File: `src/ui/runtime/world/selection/swarm/useHydrateSwarmCardStore.ts`

**Responsibility after change**

- Hydrate Swarm card data using a plan that is recomputed only on structural changes.

**Change required**

- Read `entityListRevision` and `blueprintRevision` from `useRuntimeStore`.
- Memoize `resolveSwarmCardHydrationPlan(entity, runtime)` against `[entity, runtime, entityListRevision, blueprintRevision]`.
- Pass the memoized plan to `useHydrationDependencyToken(...)`.

**Logic**

- Token changes on tracked entity revisions continue to drive hydration.
- Plan scanning is no longer rerun for those token-only changes.

### File: `src/ui/runtime/world/selection/job-card/useHydrateJobCardStore.ts`

**Responsibility after change**

- Same structural-plan memoization for Job card hydration.

**Change required**

- Same memoization rule as above.

### File: `src/ui/runtime/world/selection/useHydrateDisplayCardStore.ts`

**Responsibility after change**

- Same structural-plan memoization for Display card hydration.

**Change required**

- Same memoization rule as above.

### File: `src/ui/runtime/world/selection/body/useHydrateBodyCardStore.ts`

**Responsibility after change**

- Same structural-plan memoization for Body card hydration.

**Change required**

- Same memoization rule as above.

### File: `src/ui/runtime/world/selection/cave/useHydrateCaveCardStore.ts`

**Responsibility after change**

- Same structural-plan memoization for Cave card hydration.

**Change required**

- Same memoization rule as above.

### File: `src/ui/runtime/world/selection/face/useHydrateFaceCardStore.ts`

**Responsibility after change**

- Same structural-plan memoization for Face card hydration.

**Change required**

- Same memoization rule as above.

### File: `src/ui/runtime/world/selection/useHydrateAttributePoolCardStore.ts`

**Responsibility after change**

- Same structural-plan memoization for Attribute Pool hydration.

**Change required**

- Same memoization rule as above.

### Files intentionally unchanged in this step

The following hydration hooks do not perform runtime-wide plan scans and must remain unchanged:

- `src/ui/runtime/world/selection/useHydrateResourceCardStore.ts`
- `src/ui/runtime/world/selection/useHydrateTransferCardStore.ts`

The following direct-id token consumers rely only on the narrowed token behavior and must remain otherwise unchanged:

- `src/ui/runtime/world/useSelectedEntity.ts`
- `src/ui/runtime/world/selection/useEntitySelector.ts`
- `src/ui/runtime/world/selection/cave/useLiveNumericValue.ts`

## 5.4 Overlay path

### File: `src/ui/runtime/world/node-overlays/useHydrateNodeOverlayViewportStore.ts`

**Responsibility after change**

- Continue to consume published mutation revisions, but now those revisions are frame-bounded.

**Change required**

- No logic redesign is required.
- Update only if type or action names in the invalidation store require import or selector adjustments.

**Logic**

- Entry-index rebuild/patch logic remains as implemented.
- The performance gain for overlays in this phase comes from the corrected publication frequency, not from a semantic-model redesign.

## 5.5 Test files

### File: `src/ui/runtime/state/viewInvalidationSlice.test.ts`

**Responsibility after change**

- Verify the new buffered/publication contract.

**Required test coverage**

1. Buffering a summary does not change any published revision field.
2. Publishing a frame with buffered changes updates `runtimeViewTick` and mutation revisions exactly once.
3. Multiple buffered summaries before one frame publication merge into one published summary.
4. Publishing a frame with no pending mutation changes updates only `runtimeViewTick`.
5. Reset clears pending and published state.

### File: `src/ui/runtime/state/runtimeFactory.notifications.test.ts`

**Responsibility after change**

- Verify the notification observer still works while mutation invalidation is buffered.

**Required test coverage**

1. `onCommandsApplied(...)` still drives notifications/cinematics/events/effects.
2. `onCommandsApplied(...)` buffers mutation summaries instead of publishing public revisions directly.

### File: `src/ui/runtime/state/useRuntimeStore.test.ts`

**Responsibility after change**

- Verify store reset semantics still clear invalidation state after the new buffering fields are added.

**Required test coverage**

1. reset clears published revisions
2. unload clears published revisions
3. pending buffer is also cleared

### New file: `src/ui/runtime/state/simulationSlice.test.ts`

**Responsibility**

- Verify manual stepping now publishes a complete frame, not just a tick.

**Required test coverage**

1. `step()` calls `publishRuntimeFrame(runtime.getState().tick)` exactly once.
2. `step()` no longer calls `publishRuntimeViewTick(...)` directly.

### File: `src/ui/runtime/world/useHydrationDependencyToken.test.tsx`

**Responsibility after change**

- Verify tracked-id-only subscription behavior.

**Required test coverage**

1. token changes when a tracked entity revision changes
2. token does not change when an unrelated entity revision changes
3. duplicate ids in the plan are ignored
4. entity-list revision affects the token only when requested
5. blueprint revision affects the token only when requested

### New file: `src/ui/runtime/world/selection/swarm/useHydrateSwarmCardStore.test.tsx`

**Responsibility**

- Verify the Swarm hydration hook does not rescan its dependency plan for non-structural invalidation.

**Required test coverage**

1. initial hydration performs one plan scan
2. a tracked entity revision that does not change `entityListRevision` or `blueprintRevision` rehydrates using the existing plan
3. an `entityListRevision` change recomputes the plan

**Test shape**

- Use a runtime test double with a counted `getEntities()` implementation.
- Assert behavior through scan count and resulting hydration updates.

### New file: `src/ui/runtime/world/selection/body/useHydrateBodyCardStore.test.tsx`

**Responsibility**

- Verify the same structural-only plan recomputation rule for a child-discovery plan.

**Required test coverage**

1. non-structural tracked-entity invalidation does not rescan children
2. structural invalidation rescans children

## 6. Acceptance criteria

The implementation is complete only when all of the following are true.

1. One browser frame can buffer multiple apply-phase mutation summaries but publish them once.
2. `runtimeMutationRevision` advances at most once per published frame.
3. `useHydrationDependencyToken(...)` is insensitive to unrelated entity revisions.
4. Scan-heavy hydration plans no longer rerun on tracked-entity invalidation alone.
5. Existing card resolver outputs are unchanged.
6. Existing local hydrated-store APIs are unchanged.
7. Overlay hydration continues to function with the same view-model output contract.
8. All new and changed tests pass.

## 7. Implementation order

1. Extend `resolveRuntimeMutationSummary.ts` with empty-summary and merge behavior.
2. Update `viewInvalidationSlice.ts` and `runtimeStoreTypes.ts` for buffering + frame publication.
3. Update `runtimeFactory.ts` and `simulationSlice.ts` to use the new actions.
4. Update `useHydrationDependencyToken.ts` and its tests.
5. Update the seven scan-heavy hydration hooks to memoize plans against structural revisions only.
6. Add hook-level tests for representative scan-heavy plans.
7. Run and fix the affected runtime/state/world test suites.

## 8. Non-goals / forbidden shortcuts

1. Do not reintroduce `runtimeViewTick` as the primary selection hydration trigger.
2. Do not redesign card resolvers in this phase.
3. Do not add new Context-based data propagation.
4. Do not add a second shadow model of runtime entities outside the existing hydrated card stores and overlay store.
5. Do not broaden this change into a general overlay semantic-cache redesign.

