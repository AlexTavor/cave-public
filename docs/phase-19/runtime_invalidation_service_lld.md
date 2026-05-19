# RuntimeInvalidationService LLD

## 1. Scope and governing constraints

This design implements a **runtime-owned invalidation service** and removes the current UI-owned invalidation mirror.

It is constrained by the project laws and execution contract:

- ECS world remains the single source of truth.
- Runtime remains the sole owner of simulation mutation.
- React observes state; React does not own or mirror simulation truth.
- Context remains dependency injection only.
- Zustand remains app/UI state only, not runtime truth. fileciteturn1file0L14-L18 fileciteturn1file0L29-L33 fileciteturn1file0L39-L44
- Scope is limited to replacing the current runtime invalidation and local hydrated-store design. No unrelated refactors are included. fileciteturn1file1L11-L25
- Tests are behavioral, colocated, and must cover happy path, negative path, and edge cases where applicable. fileciteturn1file2L6-L18 fileciteturn1file2L86-L98

## 2. Why this change is required

### 2.1 Current state of the code

The current design has three distinct layers for the same concern:

1. `RuntimeCore` and `Runtime` mutate authoritative state.
2. `runtimeFactory.ts` derives `RuntimeMutationSummary` from `onCommandsApplied` and feeds it into the UI store.
3. Selection cards and node overlays maintain per-view local Zustand stores hydrated from runtime plus UI-store revision tokens.

That produces the following concrete problems:

- **Runtime invalidation is not owned by runtime.**
  The current mutation summary is derived in `src/ui/runtime/state/runtimeFactory.ts`, not inside `RuntimeCore`.
- **The UI store mirrors simulation dirtiness.**
  `viewInvalidationSlice.ts` stores `runtimeViewTick`, `runtimeMutationRevision`, `entityListRevision`, `blueprintRevision`, `entityRevisionById`, and `lastChangedEntityIds`.
- **Views are hydrated through a second store layer.**
  `createHydratedDataStore.tsx` plus the per-card `*Store.ts` and `useHydrate*Store.ts` files create local writable view stores for data that is synchronously derivable from runtime.
- **The runtime frame publish path is UI-owned.**
  `runtimeFactory.ts` currently calls `publishRuntimeFrame(runtime.getState().tick)` from the ticker callback.
- **Direct runtime status writes still exist in UI state actions.**
  `simulationSlice.ts`, `runtimeFactory.ts`, and `useRuntimeStore.ts` write `runtime.getState().status` directly.

### 2.2 Why the current design is wrong

This violates the intended mental model in two ways:

- It duplicates runtime invalidation in Zustand even though the ECS world is the source of truth.
- It forces React to synchronize with a UI-side revision mirror and local hydrated sub-stores instead of subscribing directly to runtime-owned invalidation.

The result is unnecessary complexity, extra moving parts, and more places for stale subscriptions or incorrect render dependencies.

## 3. Design goals

### 3.1 Goals

1. **Runtime owns invalidation.**
2. **UI subscribes to runtime invalidation directly.**
3. **Views render selected runtime data directly.**
4. **No local hydrated Zustand stores for selection cards or node overlay viewport.**
5. **Zustand remains only for app/UI state** such as runtime instance, playback UI state, saves, and camera state.
6. **Existing dependency plans and equality helpers are reused** where they already exist.
7. **No mutation inference remains in the UI state layer.**

### 3.2 Non-goals

1. No rewrite of runtime commands or handler semantics.
2. No automatic dependency tracking.
3. No expansion to generic query or domain scopes beyond what the current UI actually needs.
4. No renaming sweep of existing `HydrationDependencyPlan` files in this phase.
   The name is imperfect, but the existing files will be reused to minimize churn.
5. No changes to notification, cinematic, visual-effects, or inspector logic beyond removing their dependency on the UI invalidation mirror.

## 4. Target architecture

### 4.1 Ownership model

- **Runtime/ECS**
  - Owns all authoritative world state.
  - Owns all invalidation revisions and subscriber registries.
  - Publishes invalidation on command application, imperative runtime mutations, reset, destroy, and hydrate.

- **React/UI**
  - Reads runtime through selector hooks.
  - Uses runtime invalidation revisions to re-evaluate selectors.
  - Never owns mirrored runtime truth.

- **Zustand UI store**
  - Keeps app/UI state only.
  - Continues to hold: `runtime`, `status`, `timeScale`, save metadata, camera state, pending camera restore.
  - Continues to own `cameraRevision` only because camera state is UI-local.
  - No longer holds runtime invalidation state.

### 4.2 Standard UI mechanism

The standard mechanism is:

1. A component or hook defines a dependency plan.
2. `useRuntimeSelector` subscribes to the runtime invalidation service for that plan.
3. `useRuntimeSelector` re-runs a selector directly against runtime.
4. Existing equality functions suppress unnecessary re-renders.
5. Views receive plain props and render.

For imperative DOM bridges that do not return render data, the same invalidation substrate is exposed through `useRuntimeRevisionToken`.

This is **one invalidation mechanism** with two adapters:

- render adapter: `useRuntimeSelector`
- imperative adapter: `useRuntimeRevisionToken`

There is no second store.

## 5. Runtime invalidation contract

## 5.1 Scopes

The service must support exactly these read scopes in this phase:

- `world`
- `frame`
- `mutation`
- `entity-list`
- `blueprint`
- `entity:<id>`

No query scope and no domain scope are introduced in this phase.

## 5.2 Revisions and semantics

The service owns the following monotonic state:

- `worldRevision`
  - Increments when the world is replaced wholesale on the same runtime instance.
  - Triggered by `reset()`, `destroy()`, and `hydrate()`.
  - Automatically participates in every selector token. This guarantees recomputation after reset/hydrate even when entity-specific revisions are cleared.

- `frameRevision`
  - Represents the current runtime tick value.
  - Changes only when `RuntimeState.tick` changes.
  - Not changed by `flushCommands()`.

- `mutationRevision`
  - Increments exactly once per committed non-empty mutation batch.
  - A mutation batch is non-empty when it contains at least one changed entity id, an entity-list change, or a blueprint change.

- `entityListRevision`
  - Increments exactly once per committed batch where the entity list changed.

- `blueprintRevision`
  - Increments exactly once per committed batch where blueprints changed.

- `entityRevisionById`
  - Increments once per committed batch for each unique changed entity id in that batch.
  - Multiple commands touching the same id inside one committed batch increment that entity revision only once.

- `lastChangedEntityIds`
  - Holds the normalized unique sorted ids from the last committed non-empty mutation batch.
  - Becomes `[]` after a committed frame with no mutations.
  - Becomes `[]` after world reset, destroy, or hydrate.

## 5.3 Notification rules

- Subscribers are notified **after all revisions are updated**.
- A listener registered to multiple affected scopes is called **once** per commit.
- `tick()` emits **one notification flush per `RuntimeCore.tick()` call**, not one per internal logic substep.
- `flushCommands()` emits **one notification flush per call**.
- `reset()`, `destroy()`, and `hydrate()` emit **one notification flush per call**.

## 5.4 Writer behavior

The writer API is internal to runtime.
The UI never receives write access.

The service must support batched mutation collection:

- start batch
- record command-derived summary and/or explicit marks
- commit frame batch or commit mutation batch
- reset lifecycle batch

The service must also support direct marks for imperative runtime methods:

- mark entity changed
- mark entity list changed
- mark blueprint changed

## 5.5 Mutation summary reuse

The current `resolveRuntimeMutationSummary` logic in UI state is correct in spirit and already encodes command-to-entity/list/blueprint effects.
That logic must be moved into `src/engine/runtime/**` and reused by the invalidation service.

This avoids touching every handler in this phase and adheres to the requirement to use existing mechanisms where possible.

## 6. Hook contract

## 6.1 Dependency plan

The existing `HydrationDependencyPlan` type remains the subscription-plan shape in this phase.
It must be extended with two optional flags:

- `includeMutationRevision?: boolean`
- `includeFrameRevision?: boolean`

Existing fields remain unchanged:

- `entityIds`
- `includeEntityListRevision`
- `includeBlueprintRevision`

### Required hook behavior

- Empty and duplicate entity ids are removed.
- Entity ids are sorted before token construction.
- `worldRevision` is always included implicitly.
- A null runtime produces a stable empty token and no subscription.

## 6.2 `useRuntimeRevisionToken`

### Responsibility

Provide a stable revision token for imperative hooks and effect-driven synchronization that must react to runtime invalidation without holding mirrored data.

### Interface

Pseudocode:

- input: `runtime: Runtime | null`
- input: `plan: HydrationDependencyPlan`
- output: `token: string`

### Logic

- Subscribes with `useSyncExternalStore` to the invalidation scopes described by the plan.
- Reads the relevant revisions from the runtime invalidation service.
- Returns a normalized token string composed from:
  - implicit `worldRevision`
  - optional `frameRevision`
  - optional `mutationRevision`
  - optional `entityListRevision`
  - optional `blueprintRevision`
  - requested `entity:<id>` revisions

## 6.3 `useRuntimeSelector`

### Responsibility

Provide the single standard read path for runtime-derived UI data.

### Interface

Pseudocode:

- input: `runtime: Runtime | null`
- input: `plan: HydrationDependencyPlan`
- input: `selector: (runtime: Runtime | null) -> T`
- input: `isEqual?: (left: T, right: T) -> boolean`
- output: `selectedValue: T`

### Logic

- Uses `useRuntimeRevisionToken` to subscribe to the exact invalidation scopes needed by the selector.
- Re-evaluates `selector(runtime)` only when the runtime reference or the revision token changes.
- Preserves the previous selected value when `isEqual(previous, next)` is true.
- Never writes to runtime and never writes to local stores.

## 7. File-by-file implementation plan

## 7.1 Engine/runtime — files to add

### `src/engine/runtime/RuntimeInvalidationService.ts`

- **Responsibility**
  - Own all runtime invalidation state and all subscriber registries.
  - Expose a read-only interface for UI and a write interface for runtime internals.

- **Logic**
  - Store revisions for `world`, `frame`, `mutation`, `entity-list`, `blueprint`, and per-entity ids.
  - Normalize changed entity ids per batch.
  - Batch writes across `tick()`, `flushCommands()`, `reset()`, `destroy()`, and `hydrate()`.
  - Deduplicate listener notification.
  - Clear entity revision maps on world replacement operations.

- **Interface**
  - Read facade:
    - `subscribe(scope, listener) -> unsubscribe`
    - `getRevision(scope) -> number`
    - `getLastChangedEntityIds() -> readonly string[]`
  - Internal writer:
    - `beginBatch()`
    - `recordCommandBatch(commands)`
    - `markEntityChanged(id)`
    - `markEntityListChanged()`
    - `markBlueprintChanged()`
    - `commitMutationBatch()`
    - `commitFrameBatch(tick)`
    - `commitWorldReset(currentTick, options)`

### `src/engine/runtime/runtimeInvalidationSummary.ts`

- **Responsibility**
  - Define the summary shape used to represent one runtime mutation batch.

- **Logic**
  - Provide the empty summary constant.
  - Provide summary merge behavior with unique sorted entity ids.

- **Interface**
  - `RuntimeInvalidationSummary`
  - `EMPTY_RUNTIME_INVALIDATION_SUMMARY`
  - `mergeRuntimeInvalidationSummaries(left, right)`

### `src/engine/runtime/runtimeInvalidationSummary.helpers.ts`

- **Responsibility**
  - Convert applied runtime commands into a `RuntimeInvalidationSummary`.

- **Logic**
  - Move the existing command-to-summary rules out of `src/ui/runtime/state` unchanged in meaning.
  - Continue to identify direct entity ids, entity-list changes, and blueprint changes from command payloads.

- **Interface**
  - `applyRuntimeInvalidationCommand(summary, command)`
  - `resolveRuntimeInvalidationSummary(commands)`

## 7.2 Engine/runtime — files to change

### `src/engine/runtime/RuntimeCore.ts`

- **Responsibility**
  - Instantiate and own the invalidation service.
  - Publish invalidation for every runtime mutation entrypoint.

- **Logic**
  - Add a private invalidation service instance.
  - Expose a read-only invalidation facade through a public getter.
  - Wrap `flushCommands()` in an invalidation batch.
  - Wrap `tick()` in an invalidation batch and commit exactly once per call using the final tick.
  - Convert direct internal paused/running transitions in `stepOncePreservingPause()` to runtime methods rather than raw `state.status` writes.
  - On `reset()` and `destroy()`, reset core state first, then publish a world-reset invalidation commit.

- **Interface**
  - add `getInvalidation()`
  - add `play()`
  - add `pause()`
  - preserve existing public methods and return types

### `src/engine/runtime/Runtime.ts`

- **Responsibility**
  - Publish invalidation for imperative runtime APIs above `RuntimeCore`.

- **Logic**
  - `addEntity(entity)` must mark that entity plus entity-list change.
  - `registerPhysicsBody(body)` remains unchanged from an invalidation perspective in this phase because no current UI selector subscribes to physics-body registration directly.
  - `hydrate(data)` must execute as a world-reset invalidation batch and must not emit per-entity notifications during hydration.
  - `updateImpulseConfig(config)` remains unchanged for invalidation in this phase.

- **Interface**
  - preserve existing public runtime methods
  - add no new UI-facing mutation methods beyond `getInvalidation()` inherited from `RuntimeCore`

### `src/engine/runtime/runtimeTick.ts`

- **Responsibility**
  - Surface applied command batches to `RuntimeCore` during a tick without routing invalidation through telemetry.

- **Logic**
  - Add an optional callback invoked once per internal apply batch with the exact `RuntimeCommand[]` returned by `applyPhase`.
  - Continue to call telemetry `onCommandsApplied` for snapshot-based observers only.

- **Interface**
  - extend `runRuntimeTick(...)` with one optional applied-command callback argument
  - preserve existing telemetry behavior and snapshot sink behavior

### `src/engine/runtime/runtimeCoreTick.ts`

- **Responsibility**
  - Thread the applied-command callback from `RuntimeCore` into `runRuntimeTick`.

- **Logic**
  - Accept the callback parameter and pass it through unchanged.

- **Interface**
  - extend the parameter object with the callback

### `src/engine/runtime/runtimeCoreAdvance.ts`

- **Responsibility**
  - Carry the applied-command callback from `RuntimeCore.tick()` to `tickRuntimeCore()`.

- **Logic**
  - Extend the `RuntimeCoreTickState` input with the callback.
  - Pass it through to `tickRuntimeCore()`.

- **Interface**
  - extend the `RuntimeCoreTickState` input shape

## 7.3 UI/runtime/state — files to change

### `src/ui/runtime/state/runtimeStoreTypes.ts`

- **Responsibility**
  - Define the UI store contract after runtime invalidation state is removed.

- **Logic**
  - Remove all view invalidation state and actions.
  - Keep `cameraRevision` as UI-local state.
  - Keep playback and persistence actions.

- **Interface**
  - state retains: `runtime`, `status`, `timeScale`, save fields, camera fields, `cameraRevision`
  - actions retain: `loadCartridge`, `unload`, `play`, `pause`, `step`, `setTimeScale`, `reset`, persistence actions, camera actions
  - actions removed: `publishRuntimeViewTick`, `bufferRuntimeMutationSummary`, `publishRuntimeFrame`, `publishRuntimeMutationSummary`, `resetViewInvalidation`

### `src/ui/runtime/state/useRuntimeStore.ts`

- **Responsibility**
  - Compose the runtime UI store without any runtime invalidation mirror.

- **Logic**
  - Remove `createViewInvalidationSlice` composition.
  - Keep ticker lifecycle, persistence, and camera setup.
  - Reset no longer touches view invalidation state.
  - Load/reset/unload use runtime methods rather than direct invalidation store resets.

- **Interface**
  - preserve existing store export name and public UI-store access pattern

### `src/ui/runtime/state/runtimeFactory.ts`

- **Responsibility**
  - Build runtime plus telemetry observers without UI-owned invalidation buffering.

- **Logic**
  - Remove import and use of `resolveRuntimeMutationSummary`.
  - Remove `bufferRuntimeMutationSummary` and `publishRuntimeFrame` from the store getter contract.
  - Keep snapshot-based notification, cinematic, callout, and visual-effects observers intact.
  - Replace the initial direct paused write with `runtime.pause()`.
  - Ticker callback only calls `runtime.tick(dt)` and telemetry sync.

- **Interface**
  - `StoreGetter` no longer includes any invalidation methods
  - `buildRuntime(...)` return type unchanged

### `src/ui/runtime/state/simulationSlice.ts`

- **Responsibility**
  - Control playback state through runtime methods only.

- **Logic**
  - `play()` calls `runtime.play()` and updates UI store status.
  - `pause()` calls `runtime.pause()` and updates UI store status.
  - `step()` calls `runtime.stepOncePreservingPause()` and removes any UI-owned frame publish.
  - `setTimeScale()` remains unchanged apart from no invalidation coupling.

- **Interface**
  - action names unchanged
  - host no longer requires `publishRuntimeFrame`

### `src/ui/runtime/state/cameraSlice.ts`

- **Responsibility**
  - Own camera-local revisioning without depending on the removed view invalidation slice.

- **Logic**
  - Move `cameraRevision` and its increment behavior into the camera slice itself.

- **Interface**
  - add `cameraRevision` to camera slice state
  - keep `setCameraState`, `setPendingCameraRestore`, and `consumePendingCameraRestore`

## 7.4 UI/runtime/hooks — files to add

### `src/ui/runtime/hooks/useRuntimeRevisionToken.ts`

- **Responsibility**
  - Bridge runtime invalidation service into React subscriptions for imperative effects.

- **Logic**
  - Use `useSyncExternalStore`.
  - Subscribe to the exact scopes described by a dependency plan.
  - Construct the normalized revision token.

- **Interface**
  - `useRuntimeRevisionToken(runtime, plan) -> string`

### `src/ui/runtime/hooks/useRuntimeSelector.ts`

- **Responsibility**
  - Provide the single standard render-time selector hook for runtime-derived UI data.

- **Logic**
  - Depend on `useRuntimeRevisionToken`.
  - Evaluate the selector against runtime only when runtime or the token changes.
  - Apply equality suppression.

- **Interface**
  - `useRuntimeSelector(runtime, plan, selector, isEqual?) -> selectedValue`

## 7.5 UI/runtime/world — files to change

### `src/ui/runtime/world/hydration/hydrationTypes.ts`

- **Responsibility**
  - Continue to define the dependency-plan shape used by existing selector dependency files.

- **Logic**
  - Extend the type with optional `includeMutationRevision` and `includeFrameRevision`.
  - Do not rename the file or type in this phase.

- **Interface**
  - existing fields preserved
  - two optional flags added

### `src/ui/runtime/world/testUtils.tsx`

- **Responsibility**
  - Provide shared UI test helpers for runtime-aware world context.

- **Logic**
  - Extend the existing helpers with a minimal runtime test double factory that includes a runtime invalidation reader and explicit test-only emit helpers.
  - Reuse this helper in UI hook and component tests that currently call `publishRuntimeMutationSummary` on the UI store.

- **Interface**
  - keep `TestWorldInteractionProvider`
  - add runtime test-double builder(s)

### `src/ui/runtime/world/useSelectedEntity.ts`

- **Responsibility**
  - Resolve and guard the currently selected entity directly from runtime invalidation.

- **Logic**
  - Replace `useHydrationDependencyToken` with `useRuntimeSelector`.
  - Subscribe to:
    - selected entity id
    - entity-list revision
    - blueprint revision
  - Preserve existing selection-guard behavior: if the entity disappears or its lens id changes from the baseline captured at selection time, deselect.

- **Interface**
  - return shape unchanged: `runtime`, `entity`, `selectedId`, `deselect`, `killSelected`

### `src/ui/runtime/world/selection/useEntitySelector.ts`

- **Responsibility**
  - Provide a typed selector hook for a single entity.

- **Logic**
  - Re-implement as a thin wrapper over `useRuntimeSelector`.
  - Preserve the current public signature.

- **Interface**
  - public signature unchanged
  - internal implementation no longer uses tokens from the UI store

### `src/ui/runtime/status/useRuntimeClock.ts`

- **Responsibility**
  - Keep the clock view synchronized with runtime tick without subscribing to Zustand invalidation.

- **Logic**
  - Replace `runtimeViewTick` with a frame-based runtime selector or revision token.
  - Continue to update the DOM ref imperatively to avoid unnecessary text re-renders.

- **Interface**
  - public hook signatures unchanged

### `src/ui/runtime/world/selection/cave/useLiveNumericValue.ts`

- **Responsibility**
  - Imperatively update live numeric spans from runtime entity revisions.

- **Logic**
  - Replace `useHydrationDependencyToken` with `useRuntimeRevisionToken(runtime, plan)`.
  - Preserve current DOM update behavior and path traversal behavior.

- **Interface**
  - public hook signature unchanged

### `src/ui/runtime/world/entity-state-link/EntityStateLinkContext.tsx`

- **Responsibility**
  - Keep bar bindings synchronized using runtime-owned invalidation instead of the UI-store invalidation mirror.

- **Logic**
  - Replace `entityListRevision`, `lastChangedEntityIds`, and `runtimeMutationRevision` reads from Zustand with runtime invalidation subscriptions.
  - Preserve the existing optimization: only re-sync when a registered entity id is present in `lastChangedEntityIds`, unless the runtime instance changed or the entity list changed.

- **Interface**
  - public context value unchanged

### `src/ui/runtime/world/node-overlays/NodeOverlayViewport.tsx`

- **Responsibility**
  - Become a container that computes overlay data directly and passes it to a pure view.

- **Logic**
  - Remove local viewport store creation and hydration.
  - Use a data hook to compute overlay viewport data.

- **Interface**
  - component export unchanged

### `src/ui/runtime/world/node-overlays/NodeOverlayViewportView.tsx`

- **Responsibility**
  - Render overlay viewport data as a pure presentational component.

- **Logic**
  - Remove store selector usage.
  - Receive `OverlayViewportData` as a prop.

- **Interface**
  - add required `data` prop
  - keep `rootRef` prop

### `src/ui/runtime/world/node-overlays/useNodeOverlayViewportData.ts`

- **Responsibility**
  - Replace the local hydrated viewport store with a selector/data hook.

- **Logic**
  - Subscribe to runtime invalidation using:
    - `includeMutationRevision`
    - `includeEntityListRevision`
    - `includeBlueprintRevision`
  - Also depend on `cameraRevision`, element size, and runtime callout store items.
  - Preserve the current entry-index optimization from `nodeOverlayViewportHydration.ts`:
    - full rebuild on entity-list or blueprint change
    - incremental patch using `lastChangedEntityIds` on ordinary mutation batches
  - Preserve referential equality using `overlayViewportDataEqual`.

- **Interface**
  - input: `runtime`, `enabled`, `rootRef`
  - output: `OverlayViewportData`

## 7.6 UI/runtime/world/selection — files to change

The entire selection-card family must be converted to the same pattern:

- container component resolves card data with `useRuntimeSelector`
- view component receives `data` as a prop
- local hydrated store file is deleted
- local hydrate hook file is deleted
- existing `resolve*CardData`, dependency-plan, and equality files are reused unchanged unless explicitly listed below

### Body card

#### `src/ui/runtime/world/selection/body/useBodyCardData.ts`
- **Responsibility**: resolve body-card data directly from runtime.
- **Logic**: replace `runtimeViewTick` dependency with `useRuntimeSelector(runtime, plan, selector, bodyCardDataEqual)` using `resolveBodyCardHydrationPlan` and `resolveBodyCardData`.
- **Interface**: public signature unchanged.

#### `src/ui/runtime/world/selection/body/BodyCard.tsx`
- **Responsibility**: container only.
- **Logic**: remove local store creation and use `useBodyCardData`.
- **Interface**: component props unchanged.

#### `src/ui/runtime/world/selection/body/BodyCardView.tsx`
- **Responsibility**: pure render plus local interaction hooks.
- **Logic**: receive `BodyCardData | null` as a prop; remove selector-store read.
- **Interface**: add `data` prop; keep `runtime` prop.

#### `src/ui/runtime/world/selection/body/bodyCardStore.ts`
- **Responsibility**: removed.
- **Logic**: local hydrated store no longer exists.
- **Interface**: deleted.

#### `src/ui/runtime/world/selection/body/useHydrateBodyCardStore.ts`
- **Responsibility**: removed.
- **Logic**: hydration effect no longer exists.
- **Interface**: deleted.

### Cave card

#### `src/ui/runtime/world/selection/cave/CaveCard.tsx`
- **Responsibility**: container only.
- **Logic**: use `useRuntimeSelector` with `resolveCaveCardHydrationPlan`, `resolveCaveCardData`, and `caveCardDataEqual`.
- **Interface**: component props unchanged.

#### `src/ui/runtime/world/selection/cave/CaveCardView.tsx`
- **Responsibility**: pure render plus existing interaction hooks.
- **Logic**: receive `CaveCardData | null` as a prop; remove selector-store read.
- **Interface**: add `data` prop; keep `runtime` prop.

#### `src/ui/runtime/world/selection/cave/caveCardStore.ts`
- **Responsibility**: removed.
- **Interface**: deleted.

#### `src/ui/runtime/world/selection/cave/useHydrateCaveCardStore.ts`
- **Responsibility**: removed.
- **Interface**: deleted.

### Face card

#### `src/ui/runtime/world/selection/face/FaceCard.tsx`
- **Responsibility**: container only.
- **Logic**: use `useRuntimeSelector` with the existing face dependency plan, resolver, and equality function.
- **Interface**: component props unchanged.

#### `src/ui/runtime/world/selection/face/FaceCardView.tsx`
- **Responsibility**: pure render plus existing interaction hooks.
- **Logic**: receive `FaceCardData | null` as a prop; remove selector-store read.
- **Interface**: add `data` prop; keep `entityId` and `runtime` props.

#### `src/ui/runtime/world/selection/face/faceCardStore.ts`
- **Responsibility**: removed.
- **Interface**: deleted.

#### `src/ui/runtime/world/selection/face/useHydrateFaceCardStore.ts`
- **Responsibility**: removed.
- **Interface**: deleted.

### Swarm card

#### `src/ui/runtime/world/selection/swarm/SwarmCard.tsx`
- **Responsibility**: container only.
- **Logic**: use `useRuntimeSelector` with the existing swarm dependency plan, resolver, and equality function.
- **Interface**: component props unchanged.

#### `src/ui/runtime/world/selection/swarm/SwarmCardView.tsx`
- **Responsibility**: pure render.
- **Logic**: receive `SwarmCardData | null` as a prop; remove selector-store read.
- **Interface**: add `data` prop; keep `runtime` prop.

#### `src/ui/runtime/world/selection/swarm/swarmCardStore.ts`
- **Responsibility**: removed.
- **Interface**: deleted.

#### `src/ui/runtime/world/selection/swarm/useHydrateSwarmCardStore.ts`
- **Responsibility**: removed.
- **Interface**: deleted.

### Job card

#### `src/ui/runtime/world/selection/job-card/JobCard.tsx`
- **Responsibility**: container only.
- **Logic**: use `useRuntimeSelector` with the existing job-card dependency plan, resolver, and equality function.
- **Interface**: component props unchanged.

#### `src/ui/runtime/world/selection/job-card/JobCardView.tsx`
- **Responsibility**: pure render plus existing interaction hooks.
- **Logic**: receive `JobCardData | null` as a prop; remove selector-store read.
- **Interface**: add `data` prop; keep `entity` and `runtime` props.

#### `src/ui/runtime/world/selection/job-card/jobCardStore.ts`
- **Responsibility**: removed.
- **Interface**: deleted.

#### `src/ui/runtime/world/selection/job-card/useHydrateJobCardStore.ts`
- **Responsibility**: removed.
- **Interface**: deleted.

### Resource card

#### `src/ui/runtime/world/selection/ResourceCard.tsx`
- **Responsibility**: container only.
- **Logic**: use `useRuntimeSelector` with `resolveResourceCardHydrationPlan`, `resolveResourceCardData`, and `resourceCardDataEqual`.
- **Interface**: component props unchanged.

#### `src/ui/runtime/world/selection/ResourceCardView.tsx`
- **Responsibility**: pure render.
- **Logic**: receive `ResourceCardData | null` as a prop; remove selector-store read.
- **Interface**: add `data` prop.

#### `src/ui/runtime/world/selection/resourceCardStore.ts`
- **Responsibility**: removed.
- **Interface**: deleted.

#### `src/ui/runtime/world/selection/useHydrateResourceCardStore.ts`
- **Responsibility**: removed.
- **Interface**: deleted.

### Transfer card

#### `src/ui/runtime/world/selection/TransferCard.tsx`
- **Responsibility**: container only.
- **Logic**: use `useRuntimeSelector` with `resolveTransferCardHydrationPlan`, `resolveTransferCardData`, and `transferCardDataEqual`.
- **Interface**: component props unchanged.

#### `src/ui/runtime/world/selection/TransferCardView.tsx`
- **Responsibility**: pure render.
- **Logic**: receive `TransferCardData | null` as a prop; remove selector-store read.
- **Interface**: add `data` prop.

#### `src/ui/runtime/world/selection/transferCardStore.ts`
- **Responsibility**: removed.
- **Interface**: deleted.

#### `src/ui/runtime/world/selection/useHydrateTransferCardStore.ts`
- **Responsibility**: removed.
- **Interface**: deleted.

### Display card

#### `src/ui/runtime/world/selection/DisplayCard.tsx`
- **Responsibility**: container only.
- **Logic**: use `useRuntimeSelector` with `resolveDisplayCardHydrationPlan`, `resolveDisplayCardData`, and `displayCardDataEqual`.
- **Interface**: component props unchanged.

#### `src/ui/runtime/world/selection/DisplayCardView.tsx`
- **Responsibility**: pure render plus existing interaction hooks.
- **Logic**: receive `DisplayCardData | null` as a prop; remove selector-store read.
- **Interface**: add `data` prop; keep `entityId` and `runtime` props.

#### `src/ui/runtime/world/selection/displayCardStore.ts`
- **Responsibility**: removed.
- **Interface**: deleted.

#### `src/ui/runtime/world/selection/useHydrateDisplayCardStore.ts`
- **Responsibility**: removed.
- **Interface**: deleted.

### Attribute-pool card

#### `src/ui/runtime/world/selection/AttributePoolCard.tsx`
- **Responsibility**: container only.
- **Logic**: use `useRuntimeSelector` with `resolveAttributePoolCardHydrationPlan`, `resolveAttributePoolCardData`, and `attributePoolCardDataEqual`.
- **Interface**: component props unchanged.

#### `src/ui/runtime/world/selection/AttributePoolCardView.tsx`
- **Responsibility**: pure render.
- **Logic**: receive `AttributePoolCardData | null` as a prop; remove selector-store read.
- **Interface**: add `data` prop.

#### `src/ui/runtime/world/selection/attributePoolCardStore.ts`
- **Responsibility**: removed.
- **Interface**: deleted.

#### `src/ui/runtime/world/selection/useHydrateAttributePoolCardStore.ts`
- **Responsibility**: removed.
- **Interface**: deleted.

## 7.7 UI/runtime files to delete

These files are implementation artifacts of the incorrect design and must be removed, not retained as wrappers:

- `src/ui/runtime/state/viewInvalidationSlice.ts`
- `src/ui/runtime/state/resolveRuntimeMutationSummary.ts`
- `src/ui/runtime/state/resolveRuntimeMutationSummary.helpers.ts`
- `src/ui/runtime/world/createHydratedDataStore.tsx`
- `src/ui/runtime/world/useHydrationDependencyToken.ts`
- `src/ui/runtime/world/node-overlays/nodeOverlayViewportStore.ts`
- `src/ui/runtime/world/node-overlays/useHydrateNodeOverlayViewportStore.ts`
- all per-card `*Store.ts` files listed above
- all per-card `useHydrate*Store.ts` files listed above

## 8. End-to-end execution flow

### 8.1 Tick path

1. `RuntimeCore.tick(dt)` starts an invalidation batch.
2. Each internal apply phase returns applied commands.
3. `runtimeTick.ts` forwards each applied command batch to `RuntimeCore`.
4. `RuntimeInvalidationService` records those command batches into one pending summary.
5. When `RuntimeCore.tick(dt)` completes:
   - if `state.tick` advanced, the batch commits as a frame commit using the final tick value
   - if the tick did not advance and the pending summary is empty, nothing is published
6. React subscribers re-evaluate selectors once per outer `tick(dt)` call.

### 8.2 Flush path

1. `RuntimeCore.flushCommands()` starts an invalidation batch.
2. Commands are processed once.
3. The resulting command batch is converted to an invalidation summary.
4. The batch commits as a mutation-only commit.
5. `frameRevision` does not change.

### 8.3 Reset path

1. Runtime core state resets.
2. Invalidation service clears entity revisions and last changed ids.
3. `worldRevision` increments.
4. `entityListRevision` increments.
5. `frameRevision` becomes the current runtime tick (`0`).
6. Subscribers re-evaluate once.

### 8.4 Hydrate path

1. `Runtime.hydrate(data)` starts a world-reset batch.
2. Hydration repopulates runtime state.
3. Per-entity invalidation notifications are suppressed for this batch.
4. The batch commits once as a world reset.
5. Selectors re-evaluate from the new world state.

## 9. Test plan

## 9.1 New tests to add

### Engine/runtime unit tests

#### `src/engine/runtime/RuntimeInvalidationService.test.ts`

Given-When-Then coverage:

- **Happy path**
  - subscribes to entity, entity-list, blueprint, mutation, frame, and world scopes
  - increments the correct revisions for one committed summary
  - deduplicates listeners registered to multiple scopes

- **Batching**
  - multiple command batches within one runtime batch produce one notification flush
  - repeated entity ids in one batch increment that entity revision once

- **Lifecycle**
  - reset/hydrate/destroy increment `worldRevision`
  - reset clears entity revisions and last changed ids

- **Negative/edge**
  - empty summary does not bump mutation/entity-list/blueprint revisions
  - empty entity ids are ignored
  - null-op batch does not notify listeners

#### `src/engine/runtime/runtimeInvalidationSummary.test.ts`

Coverage moved from the existing UI summary tests:

- kill/spawn/patch-blueprint/entity-list/blueprint detection
- unique sorted changed entity ids
- summary merge behavior

### Engine/runtime integration tests

#### `src/engine/runtime/Runtime.invalidations.test.ts`

Given-When-Then coverage:

- `flushCommands()` publishes mutation revisions without frame advancement
- `tick()` publishes one frame commit even when multiple logic substeps run inside one outer call
- `addEntity()` publishes entity plus entity-list change immediately
- `reset()` and `hydrate()` publish world-reset invalidation once
- `stepOncePreservingPause()` still preserves paused state while publishing one frame commit

### UI hook tests

#### `src/ui/runtime/hooks/useRuntimeRevisionToken.test.tsx`

Coverage:

- token changes only for subscribed scopes
- world revision is always included implicitly
- entity ids are normalized and sorted
- null runtime produces a stable token

#### `src/ui/runtime/hooks/useRuntimeSelector.test.tsx`

Coverage:

- selector re-evaluates only when subscribed revisions change
- irrelevant entity changes do not change the selected value
- equality function preserves referential stability
- reset/hydrate world revision forces recomputation even when entity revisions are cleared

## 9.2 Existing tests to change

The following tests currently drive invalidation through `useRuntimeStore.getState().publishRuntimeMutationSummary(...)` or depend on removed local hydrated stores. They must be updated to drive invalidation through the runtime invalidation test double or the real runtime invalidation reader.

### UI invalidation tests

- `src/ui/runtime/world/useHydrationDependencyToken.test.tsx`
  - replace with `useRuntimeRevisionToken.test.tsx`
- `src/ui/runtime/world/useHydrationDependencyToken.revisions.test.tsx`
  - replace with `useRuntimeRevisionToken.test.tsx`
- `src/ui/runtime/world/selection/useEntitySelector.test.tsx`
  - keep behavioral assertions; change trigger mechanism to runtime invalidation
- `src/ui/runtime/world/SelectionOverlay.selection-guard.test.tsx`
  - keep behavioral assertions; change trigger mechanism to runtime invalidation
- `src/ui/runtime/world/EntityStateLink.test.tsx`
  - keep behavioral assertions; change trigger mechanism to runtime invalidation
- `src/ui/runtime/world/selection/cave/LiveNumericValue.test.tsx`
  - keep behavioral assertions; change trigger mechanism to runtime invalidation
- `src/ui/runtime/world/selection/ResourceCard.live.test.tsx`
  - keep behavioral assertions; change trigger mechanism to runtime invalidation
- `src/ui/runtime/tutorials/useActiveTutorialAttention.test.tsx`
  - keep behavioral assertions; change trigger mechanism to runtime invalidation

### Runtime factory/store tests

- `src/ui/runtime/state/runtimeFactory.notifications.test.ts`
  - remove invalidation buffering assertions
  - assert only snapshot-based observer behavior remains in `runtimeFactory.ts`
- `src/ui/runtime/state/useRuntimeStore.test.ts`
  - remove expectations for view invalidation fields
  - keep store lifecycle, playback, and persistence assertions

### Selection and overlay tests tied to removed local stores

- `src/ui/runtime/world/node-overlays/NodeOverlayViewport*.test.tsx`
  - update setup to pure-prop viewport view or new data hook behavior as appropriate
- `src/ui/runtime/world/selection/body/useHydrateBodyCardStore.test.tsx`
  - replace with body-card selector hook or component behavior test
- `src/ui/runtime/world/selection/swarm/useHydrateSwarmCardStore.test.tsx`
  - replace with swarm-card selector hook or component behavior test

## 9.3 Existing tests to delete

These tests are implementation-specific to the design being removed and must not survive as dead scaffolding:

- `src/ui/runtime/state/viewInvalidationSlice.test.ts`
- `src/ui/runtime/state/runtimeFactory.mutation-buffering.test.ts`
- `src/ui/runtime/state/useRuntimeStore.invalidation.test.ts`
- `src/ui/runtime/world/createHydratedDataStore.test.tsx`
- all tests that exist solely to verify local hydrated-store wiring rather than user-visible behavior

## 10. Acceptance criteria

Implementation is complete only when all of the following are true:

1. Runtime invalidation is owned entirely by `src/engine/runtime/**`.
2. No runtime invalidation state remains in `useRuntimeStore`.
3. No local hydrated Zustand stores remain under `src/ui/runtime/world/**` for selection cards or node overlay viewport.
4. `useRuntimeSelector` is the standard render-time read path.
5. `useRuntimeRevisionToken` is the only imperative invalidation adapter.
6. Existing dependency-plan files and equality helpers are reused.
7. `runtimeFactory.ts` no longer derives mutation summaries for UI invalidation.
8. `simulationSlice.ts`, `runtimeFactory.ts`, and `useRuntimeStore.ts` no longer write `runtime.getState().status` directly.
9. All affected tests are updated to the new runtime invalidation contract.
10. No additional runtime truth is mirrored into Zustand.

## 11. Implementation order

1. Add engine invalidation summary and service.
2. Wire `RuntimeCore.tick()`, `flushCommands()`, `reset()`, `destroy()`, and `Runtime.hydrate()` to the service.
3. Add `play()` and `pause()` to runtime and remove direct status writes from UI state.
4. Add `useRuntimeRevisionToken` and `useRuntimeSelector`.
5. Remove UI invalidation state from `useRuntimeStore` and `runtimeFactory`.
6. Convert selection cards.
7. Convert node overlay viewport.
8. Convert imperative hooks (`useEntitySelector`, `useSelectedEntity`, `useLiveNumericValue`, `EntityStateLinkContext`, `useRuntimeClock`).
9. Update tests and delete obsolete test files.

## 12. Final design statement

After this change, the architecture is:

- runtime owns truth
- runtime owns invalidation
- UI subscribes directly to runtime invalidation
- selector hooks derive view data directly from runtime
- Zustand retains app/UI state only
- no local hydrated card stores remain

That is the smallest change set that removes the current incorrect design while reusing the existing dependency plans, equality helpers, and command-to-mutation-summary rules already present in the codebase.
