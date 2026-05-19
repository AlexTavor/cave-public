# LLD — Organic Frame Full-Frame Cache + Shared Runtime View Invalidation

## 1. Purpose

This document defines the implementation required to:

1. Replace the current 9-slice organic frame renderer with a single cached full-frame SVG asset renderer.
2. Replace the current runtime hot-path `requestAnimationFrame` polling loops with a shared invalidation model driven by the existing runtime store and existing runtime ticker.

## 2. Why this change is required

### 2.1 Organic frame rendering

The current organic frame implementation does not preserve the intended edge shape for runtime cards and buttons.

The current implementation has two fidelity problems:

1. `src/ui/lib/foundation/organic-frame/framePath.ts` generates a simplified contour from a small number of sampled points.
2. `src/ui/lib/foundation/organic-frame/frameSvg.ts` crops that contour into 9 regions, and `src/ui/lib/atoms/organic-frame/OrganicFrameLayer.styles.ts` stretches each region with `background-size: 100% 100%`.

The 9-slice stretching destroys edge phase and spacing. The result is visually different from a continuous organic edge.

### 2.2 Runtime UI performance

The current runtime UI still contains multiple independent perpetual polling loops.

The checked-in source shows perpetual `requestAnimationFrame` loops in all of the following runtime-hot files:

- `src/ui/runtime/world/node-overlays/useNodeOverlayModels.ts`
- `src/ui/runtime/world/node-overlays/useGuidanceCalloutModels.ts`
- `src/ui/runtime/world/node-overlays/runtime-callouts/useRuntimeCalloutModels.ts`
- `src/ui/runtime/world/node-overlays/useScreenGuidanceModels.ts`
- `src/ui/runtime/world/node-overlays/useCaveStatusOverlayPosition.ts`
- `src/ui/runtime/world/entity-state-link/EntityStateLinkContext.tsx`
- `src/ui/runtime/world/selection/useEntitySelector.ts`
- `src/ui/runtime/world/selection/cave/useLiveNumericValue.ts`
- `src/ui/runtime/world/useSelectedEntity.ts`
- `src/ui/runtime/hooks/useEntityQuery.ts`
- `src/ui/runtime/world/selection/useAttributePoolCardData.ts`
- `src/ui/runtime/status/useRuntimeClock.ts`

The checked-in source also shows that camera state is pushed every game update:

- `src/engine/phaser/camera/CameraController.ts` calls `publishCameraState(...)` in every `update()`.
- `src/engine/phaser/camera/cameraInputHandlers.ts` always forwards the camera snapshot.
- `src/ui/runtime/state/cameraSlice.ts` currently writes camera state unconditionally.

This means the runtime UI is doing repeated hot-path polling work even after the frame rendering refactor.

## 3. Scope

This document is **in scope** for the following changes only:

1. Replace the 9-slice frame renderer with a single full-frame cached SVG renderer for all current `OrganicFrameLayer` consumers.
2. Keep the current public `Card`, `Button`, and `BodyBrick` component APIs unchanged.
3. Use the existing runtime store and existing runtime ticker as the shared invalidation source for runtime UI updates.
4. Remove perpetual RAF polling from runtime-hot overlay, selection, bar-link, query, and runtime-clock hooks.
5. Convert runtime callout expiry from view-driven sweeping to store-driven timeout scheduling.

This document is **explicitly out of scope** for the following:

2. Changing color palettes, border colors, or selection-state styling.
3. Changing the public props of `Card`, `Button`, `BodyBrick`, `FillBar`, or selection-card components.
4. Refactoring devtools-only or debug-only RAF loops.
5. Refactoring tutorial camera animation hooks.
6. Refactoring `LivingCardPool` or `useLivingCardsLoop`, which already sleeps when idle.
7. Refactoring `useBodyAvatarPresentation`, which self-terminates after avatar data becomes available.

## 4. Design constraints

1. Runtime state remains authoritative in the runtime/ECS layer.
2. React remains a presentation layer.
3. Frequently changing app-level state must continue to use Zustand.
4. UI-library-local state inside `src/ui/lib/**` may continue to use React Context because that exception is explicitly allowed by the canonical context pack.
5. The design must use existing store/ticker/theme/frame-key mechanisms where possible.
6. The design must not introduce speculative or unrelated refactors.

## 5. Target design summary

### 5.1 Organic frames

The new frame system will render **one full-frame SVG asset per actual rendered size**.

- The asset is generated synchronously as a data URL.
- The asset is cached by `frameKey + widthPx + heightPx + theme`.
- The asset is rendered as a single absolute frame layer.
- No slicing, no per-cell stretching, and no SVG filter mounted in the document tree.

### 5.2 Runtime view invalidation

The new invalidation model will use the existing runtime store as the shared signal source.

Two hot invalidation signals will be added to the runtime store:

1. `runtimeViewTick`
    - Incremented or updated only when the runtime actually advances.
    - Published from the existing `Ticker` callback in `runtimeFactory.ts` and from manual step execution.

2. `cameraRevision`
    - Incremented only when the serialized camera state actually changes.
    - Updated by a deduplicating camera-state setter.

Runtime UI hooks will subscribe to one or both of these signals instead of creating their own RAF loops.

## 6. Organic frame refactor — detailed design

### 6.1 Required behavior

1. Every current `OrganicFrameLayer` consumer must continue to request frames by `OrganicFrameKey`.
2. The frame must match the rendered element size, rounded to integer CSS pixels.
3. Repeated requests for the same `frameKey` and rounded size in the same theme must reuse the cached asset.
4. The frame must be rendered as a single DOM layer, not 9 child cells.
5. The implementation must continue to use the existing frame palette and frame-key model.
6. The implementation must continue to use the existing `buildOrganicFramePath(...)` contour function unless and until a separate, source-backed contour redesign is specified.

### 6.2 File additions and changes

#### 6.2.1 Add `src/ui/lib/foundation/layout/useElementSize.ts`

**Responsibility**

Provide the current integer pixel size of an element using `ResizeObserver`.

**Logic**

- Accept a ref to an `HTMLElement`.
- Observe the element with `ResizeObserver`.
- Publish `{ widthPx, heightPx }`, rounded to integers.
- Return `{ widthPx: 0, heightPx: 0 }` until the element is measurable.
- Avoid state updates when the rounded width and height are unchanged.

**Interface**

- Input: `RefObject<HTMLElement | null>`
- Output: `{ widthPx: number; heightPx: number }`

**Contract**

- No polling.
- No dependence on animation frames.
- No side effects other than observer registration/cleanup.

#### 6.2.2 Change `src/ui/lib/foundation/organic-frame/types.ts`

**Responsibility**

Define the organic-frame cache contract for full-frame assets.

**Logic**

Replace the current slice-set contract with a full-frame asset contract.

**Interface**

Define exactly these types:

- `OrganicFrameAsset`
    - `src: string`
    - `widthPx: number`
    - `heightPx: number`
- `OrganicFrameCatalog`
    - `resolve(frameKey: OrganicFrameKey, widthPx: number, heightPx: number): OrganicFrameAsset | null`

**Contract**

- The catalog resolves one full asset.
- The catalog no longer exposes per-slice entries or inset values.

#### 6.2.3 Change `src/ui/lib/foundation/organic-frame/frameSvg.ts`

**Responsibility**

Generate a single full-frame SVG data URL for a specific frame key, size, and palette.

**Logic**

- Remove 9-slice cropping logic.
- Remove `rectFor(...)` and all per-slice assembly.
- Generate one SVG with:
    - `viewBox="0 0 width height"`
    - one `<path>` using `buildOrganicFramePath(...)`
    - the existing palette-driven fill and stroke behavior
- Return one encoded data URL.

**Interface**

Export exactly one generator function with this contract:

- Inputs:
    - `frameKey: string`
    - `widthPx: number`
    - `heightPx: number`
    - `edgePx: number`
    - `palette: OrganicFramePalette`
- Output:
    - `OrganicFrameAsset`

**Contract**

- The generated SVG must match the exact requested width and height.
- The function must not return slice metadata.

#### 6.2.4 Change `src/ui/lib/foundation/organic-frame/organicFrameCatalog.ts`

**Responsibility**

Provide a lazy, theme-bound cache for full-frame assets.

**Logic**

- Stop prebuilding a catalog entry for every key at provider creation time.
- Build a cache object backed by an internal `Map`.
- Cache key format must be deterministic and must include:
    - `OrganicFrameKey`
    - rounded width in pixels
    - rounded height in pixels
- For a cache miss:
    - derive the bucket from the frame key using the current bucket logic
    - read `edge` from `getFrameDimensions(...)`
    - read palette from `getFramePalette(...)`
    - call the new full-frame generator from `frameSvg.ts`
    - store and return the resulting asset

**Interface**

`buildOrganicFrameCatalog(theme)` must return an `OrganicFrameCatalog` object implementing:

- `resolve(frameKey, widthPx, heightPx)`

**Contract**

- Returning the same key/size combination twice in the same theme must return the cached asset.
- Width or height less than or equal to zero must return `null`.
- Unknown frame keys must return `null` and must not throw.

#### 6.2.5 Change `src/ui/lib/foundation/organic-frame/OrganicFrameProvider.tsx`

**Responsibility**

Provide the theme-bound full-frame catalog to UI consumers.

**Logic**

- Keep the provider component and consumer hook names unchanged.
- Continue to rebuild the catalog only when the theme object changes.
- Continue to warn once when used outside the provider.

**Interface**

No public API changes:

- `OrganicFrameProvider`
- `useOrganicFrameCatalog()`

**Contract**

- `useOrganicFrameCatalog()` now returns a resolver-based catalog instead of a plain object map.

#### 6.2.6 Change `src/ui/lib/atoms/organic-frame/OrganicFrameLayer.tsx`

**Responsibility**

Render one cached organic frame asset over the host element.

**Logic**

- Keep the public props unchanged:
    - `frameKey`
    - `className`
- Create a root ref.
- Use `useElementSize(...)` to observe the rendered size.
- Resolve one asset from the catalog using the measured width and height.
- Render one frame root with one `background-image`.
- Remove the 9-cell render loop entirely.
- Keep the existing one-time missing-frame warning behavior.

**Interface**

Public props remain unchanged.

**Contract**

- No child frame cells may be rendered.
- If width or height is zero, render nothing.
- If the catalog returns `null`, render nothing.

#### 6.2.7 Change `src/ui/lib/atoms/organic-frame/OrganicFrameLayer.styles.ts`

**Responsibility**

Style the single full-frame layer.

**Logic**

- Remove grid layout.
- Remove cell styling.
- Keep `position: absolute`, `inset: 0`, and `pointer-events: none`.
- Keep `background-repeat: no-repeat`, `background-position: center`, and `background-size: 100% 100%` on the root layer itself.

**Interface**

Expose exactly one styled root layer.

**Contract**

- No CSS variables for frame insets.
- No 9-cell structure.

#### 6.2.8 Change `src/ui/lib/atoms/card/Card.styles.ts`

**Responsibility**

Continue to style card frame layers.

**Logic**

No public behavior changes.

Only update selectors or assumptions that currently depend on the 9-slice CSS variable structure.

**Interface**

No public API change.

**Contract**

- Existing frame layer names stay the same.
- The file must not reintroduce slicing or filters.

#### 6.2.9 Change `src/ui/lib/atoms/button/Button.styles.ts`

**Responsibility**

Continue to style button frame layers.

**Logic**

No public behavior changes.

Only update selectors or assumptions that currently depend on the 9-slice structure.

**Interface**

No public API change.

**Contract**

- Existing frame layer names stay the same.
- Glow and base frame layering semantics stay the same.

#### 6.2.10 Change `src/ui/runtime/world/selection/absorption/BodyBrick.styles.ts`

**Responsibility**

Continue to style body-brick frame layers.

**Logic**

No public behavior changes.

Only update selectors or assumptions that currently depend on the 9-slice structure.

**Interface**

No public API change.

**Contract**

- Existing frame layer names stay the same.
- Selected, hover, and idle stacking stays the same.

### 6.3 Organic-frame tests

#### 6.3.1 Change `src/ui/lib/foundation/organic-frame/organicFrameCatalog.test.ts`

**Responsibility**

Verify the lazy full-frame cache contract.

**Required assertions**

1. Resolving a supported key with a valid size returns a non-null asset.
2. The returned asset contains the requested rounded width and height.
3. Re-resolving the same key and size returns the cached asset.
4. Resolving width `0` or height `0` returns `null`.
5. Unsupported/transparent/ghost keys are not introduced.

#### 6.3.2 Add `src/ui/lib/atoms/organic-frame/OrganicFrameLayer.test.tsx`

**Responsibility**

Verify that the layer renders one full-frame asset instead of 9 cells.

**Required assertions**

1. A measurable host element renders exactly one frame layer.
2. The frame layer uses one `background-image`.
3. No 9-cell DOM structure exists.
4. Resizing the host element causes the layer to resolve a different size-specific asset.
5. Zero-size hosts render no frame.

#### 6.3.3 Change `src/ui/lib/atoms/card/Card.test.tsx`

**Responsibility**

Keep card rendering coverage aligned with the new single-layer frame structure.

**Required assertions**

1. Default cards still render content.
2. Interactive cards still render idle and hover frame layers.
3. Transparent cards still render no frame.
4. The assertions must not depend on 9-slice CSS variables.

#### 6.3.4 Change `src/ui/lib/atoms/button/Button.test.tsx`

**Responsibility**

Keep button rendering coverage aligned with the new single-layer frame structure.

**Required assertions**

1. Base frame still renders for frame-bearing variants.
2. Glow frame still renders when hovered/selected.
3. The assertions must not depend on 9-slice DOM structure.

#### 6.3.5 Change `src/ui/runtime/world/selection/absorption/BodyBrick.flyweight.test.tsx`

**Responsibility**

Keep body-brick smoke coverage aligned with the new single-layer frame structure.

**Required assertions**

1. The compact row still renders correctly.
2. The test must not depend on 9-slice DOM structure.

#### 6.3.6 Change `src/ui/shell/UiRoot.test.tsx`

**Responsibility**

Keep provider wiring coverage aligned with the resolver-based catalog.

**Required assertions**

1. `useOrganicFrameCatalog()` still resolves at least one valid frame asset under the provider.
2. The test must not assume the catalog is a plain object keyed by all frame keys.
3. The test must continue to assert that no SVG filter defs are mounted in the document.

## 7. Shared runtime invalidation refactor — detailed design

### 7.1 Required behavior

1. Runtime-driven view updates must be triggered by the existing runtime ticker and existing runtime store.
2. Camera-driven view updates must only trigger when camera values actually change.
3. Runtime-hot hooks must not create their own perpetual RAF loops.
4. Runtime callout expiry must not be driven by view polling.
5. Existing public hook/component interfaces must remain unchanged unless this document explicitly states otherwise.

### 7.2 Store-level invalidation design

#### 7.2.1 Add `src/ui/runtime/state/viewInvalidationSlice.ts`

**Responsibility**

Define the shared runtime-view invalidation state and actions.

**Logic**

Add a dedicated store slice with exactly these state fields:

- `runtimeViewTick: number`
- `cameraRevision: number`

Add exactly these actions:

- `publishRuntimeViewTick(tick: number)`
- `bumpCameraRevision()`
- `resetViewInvalidation()`

**Interface**

- `publishRuntimeViewTick(tick)`
    - Set `runtimeViewTick` to the provided runtime tick.
    - No state mutation when the incoming tick equals the current value.
- `bumpCameraRevision()`
    - Increment `cameraRevision` by one.
- `resetViewInvalidation()`
    - Reset both fields to `0`.

**Contract**

- This slice is the only shared runtime-view invalidation source.
- No animation-frame scheduling is allowed in this file.

#### 7.2.2 Change `src/ui/runtime/state/runtimeStoreTypes.ts`

**Responsibility**

Declare the new invalidation state and actions in the runtime store contract.

**Logic**

Add exactly these fields to `RuntimeStoreState`:

- `runtimeViewTick: number`
- `cameraRevision: number`

Add exactly these actions to `RuntimeStoreActions`:

- `publishRuntimeViewTick(tick: number): void`
- `bumpCameraRevision(): void`
- `resetViewInvalidation(): void`

**Contract**

- Existing store fields and actions remain unchanged.

#### 7.2.3 Change `src/ui/runtime/state/useRuntimeStore.ts`

**Responsibility**

Compose the new invalidation slice into the existing runtime store and reset it at the correct lifecycle boundaries.

**Logic**

- Include the new slice alongside the existing camera, simulation, and persistence slices.
- On `loadCartridge`, call `resetViewInvalidation()` before the new runtime becomes interactive.
- On `unload`, call `resetViewInvalidation()`.
- On `reset`, call `resetViewInvalidation()`.

**Interface**

No public hook name change.

**Contract**

- Runtime lifecycle resets must leave the invalidation slice in a known zeroed state.

#### 7.2.4 Change `src/ui/runtime/state/runtimeFactory.ts`

**Responsibility**

Publish runtime tick invalidation from the existing runtime ticker callback.

**Logic**

After `runtime.tick(dt)` completes inside the ticker callback:

1. Read `runtime.getState().tick`.
2. Call `get().publishRuntimeViewTick(...)`.
3. Continue the existing telemetry synchronization.

**Interface**

No public API change.

**Contract**

- The ticker remains the only runtime progression driver.
- The invalidation publish must happen after the runtime tick completes.

#### 7.2.5 Change `src/ui/runtime/state/simulationSlice.ts`

**Responsibility**

Publish runtime tick invalidation for manual step execution.

**Logic**

Inside `step()`:

1. Execute `runtime.tick(0)`.
2. Read the new runtime tick.
3. Call `get().publishRuntimeViewTick(...)`.
4. Preserve the existing telemetry synchronization.

**Interface**

No public API change.

**Contract**

- Manual stepping must update the shared invalidation signal.

#### 7.2.6 Change `src/ui/runtime/state/cameraSlice.ts`

**Responsibility**

Deduplicate camera-state writes and publish camera invalidation only on real change.

**Logic**

- Compare the incoming serialized camera state against the currently stored state.
- If `centerX`, `centerY`, and `zoom` are unchanged, do not mutate state and do not bump the camera revision.
- If any field changed:
    - update `cameraState`
    - call or apply `bumpCameraRevision()` exactly once

**Interface**

No public API change to `setCameraState(...)`.

**Contract**

- Repeated identical camera publishes from Phaser must become no-ops at the store boundary.

### 7.3 Runtime callout expiry design

#### 7.3.1 Change `src/ui/runtime/world/node-overlays/runtime-callouts/runtimeCalloutStore.ts`

**Responsibility**

Own runtime-callout lifetime expiry without view polling.

**Logic**

- Keep the existing item aggregation behavior.
- Add one internal timeout handle at module scope or store scope.
- After every `applyBatch(...)`, schedule a timeout for the next earliest `expiresAtMs`.
- When the timeout fires:
    - call `sweepExpired(Date.now())`
    - reschedule the next timeout if items remain
- `reset()` must clear the scheduled timeout.

**Interface**

Keep the current public store methods:

- `applyBatch(batch, nowMs?)`
- `sweepExpired(nowMs)`
- `reset()`

**Contract**

- Views must no longer call `sweepExpired(...)` every frame.
- Expiry is store-owned and timer-driven.

### 7.4 Hook migrations — exact file changes

#### 7.4.1 Change `src/ui/runtime/world/selection/useEntitySelector.ts`

**Responsibility**

Continue to expose a live entity-derived value, but drive updates from shared invalidation instead of RAF.

**Logic**

- Keep the current public interface unchanged.
- Subscribe to:
    - `runtime` identity
    - `entityId`
    - `useRuntimeStore((s) => s.runtimeViewTick)`
- On each invalidation:
    - read the entity once from `runtime.getEntity(entityId)`
    - apply the selector
    - update state only when `isEqual(prev, next)` is false
- When runtime or entityId is missing, set the value to `undefined`.

**Interface**

Unchanged:

- `useEntitySelector<T>(runtime, entityId, selector, isEqual?)`

**Contract**

- No internal RAF loop.
- No public API change.
- All current callers continue to work.

#### 7.4.2 Change `src/ui/runtime/world/useSelectedEntity.ts`

**Responsibility**

Keep selection validity synchronized with runtime progression without RAF polling.

**Logic**

- Subscribe to:
    - `runtime`
    - `selectedId`
    - `useRuntimeStore((s) => s.runtimeViewTick)`
- On invalidation:
    - read the selected entity once
    - compute the current lens id once
    - clear selection when the entity no longer exists or the lens changes
    - keep the cached `entity` reference synchronized otherwise

**Interface**

Unchanged return shape.

**Contract**

- No internal RAF loop.
- Selection invalidation stays tied to actual runtime progression.

#### 7.4.3 Change `src/ui/runtime/hooks/useEntityQuery.ts`

**Responsibility**

Continue to provide live query results without perpetual polling.

**Logic**

- Keep the current query-add and query-remove subscriptions.
- Remove the perpetual RAF poll.
- Subscribe to `useRuntimeStore((s) => s.runtimeViewTick)`.
- Re-resolve on:
    - add/remove subscription callback
    - runtime-view tick changes
- Preserve current shallow entity comparison semantics.

**Interface**

Unchanged:

- `useEntityQuery(world, ...components)`

**Contract**

- In-place mutations must still become visible after a runtime tick.
- No perpetual RAF loop.

#### 7.4.4 Change `src/ui/runtime/world/entity-state-link/EntityStateLinkContext.tsx`

**Responsibility**

Synchronize registered fill-bar elements from runtime state using shared invalidation.

**Logic**

- Remove the internal RAF loop.
- Subscribe to:
    - `runtime`
    - `useRuntimeStore((s) => s.runtimeViewTick)`
- On each invalidation, if there are registered bindings:
    - call `syncEntityBarBindings(...)`

**Interface**

No public provider or hook API change.

**Contract**

- No polling loop.
- Registered bars still update when the runtime advances.

#### 7.4.5 Change `src/ui/runtime/world/entity-state-link/entityStateLinkRuntime.ts`

**Responsibility**

Resolve bar values efficiently from runtime state.

**Logic**

- Stop rebuilding an index over every runtime entity on every sync.
- Change `syncEntityBarBindings(...)` to read entities directly by id when possible.
- The function must use `runtime.getEntity(binding.entityId)` if available.
- If `runtime.getEntity` is unavailable, the function may fall back to the current indexed scan behavior.
- Preserve the existing no-op suppression using `didVisualProgressChange(...)`.

**Interface**

Change the runtime input contract to accept direct entity access:

- Required capability: `getEntity?(id: string): any`
- Optional fallback capability: `getEntities?(): readonly any[]`

**Contract**

- Direct entity lookup is the primary path.
- Existing behavior for non-existent entities remains unchanged: no DOM update.

#### 7.4.6 Change `src/ui/runtime/world/selection/cave/useLiveNumericValue.ts`

**Responsibility**

Keep directly-written live numeric spans synchronized without RAF polling.

**Logic**

- Keep the existing public interface unchanged.
- Subscribe to `useRuntimeStore((s) => s.runtimeViewTick)`.
- On each invalidation, re-read the path and update `textContent` only when the formatted text changed.

**Interface**

Unchanged.

**Contract**

- No RAF loop.
- No React state introduction.

#### 7.4.7 Change `src/ui/runtime/world/selection/useAttributePoolCardData.ts`

**Responsibility**

Keep attribute-pool usage text synchronized without RAF polling.

**Logic**

- Subscribe to `useRuntimeStore((s) => s.runtimeViewTick)`.
- Recompute usage only when runtime and attribute key are available.
- Update local state only when the formatted usage tuple changed.

**Interface**

Unchanged.

**Contract**

- No RAF loop.

#### 7.4.8 Change `src/ui/runtime/status/useRuntimeClock.ts`

**Responsibility**

Keep the runtime clock display synchronized from runtime progression rather than animation frames.

**Logic**

- Subscribe to `useRuntimeStore((s) => s.runtimeViewTick)`.
- On each invalidation, read `runtime.getState().tick` and update `textContent` if changed.
- Keep keyboard controls unchanged.

**Interface**

Unchanged exported hooks.

**Contract**

- No RAF loop in `useRuntimeClockTime()`.

#### 7.4.9 Change `src/ui/runtime/world/node-overlays/useNodeOverlayModels.ts`

**Responsibility**

Keep node overlay card models synchronized from shared invalidation.

**Logic**

- Remove the RAF loop.
- Subscribe to:
    - `enabled`
    - `runtime`
    - `useRuntimeStore((s) => s.runtimeViewTick)`
    - `useRuntimeStore((s) => s.cameraRevision)`
    - viewport size from `useElementSize(rootRef)`
- Recompute visible node-overlay models on each invalidation.
- Preserve `warnMissingAssignmentProgress(...)`.
- Preserve `sameModels(...)` equality suppression.

**Interface**

Unchanged.

**Contract**

- No RAF loop.
- Overlay models still respond to runtime progress, camera movement, and viewport resize.

#### 7.4.10 Change `src/ui/runtime/world/node-overlays/useGuidanceCalloutModels.ts`

**Responsibility**

Keep node-targeted guidance callouts synchronized from shared invalidation.

**Logic**

- Remove the RAF loop.
- Subscribe to:
    - `enabled`
    - `runtime`
    - `useRuntimeStore((s) => s.runtimeViewTick)`
    - `useRuntimeStore((s) => s.cameraRevision)`
    - viewport size from `useElementSize(rootRef)`
- Recompute guidance models on each invalidation.
- Add explicit equality suppression before `setModels(...)`.

**Interface**

Unchanged.

**Contract**

- No RAF loop.
- No unconditional array replacement.

#### 7.4.11 Change `src/ui/runtime/world/node-overlays/useScreenGuidanceModels.ts`

**Responsibility**

Keep screen-space guidance models synchronized from shared invalidation.

**Logic**

- Remove the RAF loop.
- Subscribe to:
    - `runtime`
    - `useRuntimeStore((s) => s.runtimeViewTick)`
- Recompute screen-guidance models on each invalidation.
- Add explicit equality suppression before `setModels(...)`.

**Interface**

Unchanged.

**Contract**

- No RAF loop.
- No unconditional array replacement.

#### 7.4.12 Change `src/ui/runtime/world/node-overlays/runtime-callouts/useRuntimeCalloutModels.ts`

**Responsibility**

Project runtime callout items into screen coordinates without view polling.

**Logic**

- Remove the RAF loop.
- Stop calling `runtimeCalloutStore.getState().sweepExpired(Date.now())` from the view.
- Subscribe to:
    - `enabled`
    - `runtime`
    - `useRuntimeStore((s) => s.runtimeViewTick)`
    - `useRuntimeStore((s) => s.cameraRevision)`
    - viewport size from `useElementSize(rootRef)`
    - `runtimeCalloutStore((s) => s.items)`
- Recompute projected callout positions on each invalidation.
- Add explicit equality suppression before `setModels(...)`.

**Interface**

Unchanged.

**Contract**

- Expiry stays store-driven.
- View code performs projection only.

#### 7.4.13 Change `src/ui/runtime/world/node-overlays/useCaveStatusOverlayPosition.ts`

**Responsibility**

Keep the cave status overlay position synchronized from shared invalidation.

**Logic**

- Remove the RAF loop.
- Subscribe to:
    - `enabled`
    - `runtime`
    - `useRuntimeStore((s) => s.runtimeViewTick)`
    - `useRuntimeStore((s) => s.cameraRevision)`
    - viewport size from `useElementSize(rootRef)`
- Recompute the projected cave position on each invalidation.
- Preserve equality suppression on `x` and `y`.

**Interface**

Unchanged.

**Contract**

- No RAF loop.

### 7.5 Files intentionally left unchanged because the shared invalidation migration reaches them transitively

The following files keep their existing public APIs and continue to work through the migrated shared hooks:

- `src/ui/runtime/world/selection/body/useBodyCardData.ts`
- `src/ui/runtime/world/selection/cave/useCaveData.ts`
- `src/ui/runtime/world/selection/face/useFaceCardData.ts`
- `src/ui/runtime/world/selection/entityAnalysis/useEntityAnalysis.ts`
- `src/ui/runtime/world/selection/job-card/JobCard.tsx`
- `src/ui/runtime/world/selection/ability-display/useStorageAbilityBars.ts`
- `src/ui/runtime/world/selection/swarm/useSwarmStatusEntries.ts`
- `src/ui/runtime/attention/useActiveRuntimeAttention.ts`
- `src/ui/runtime/draft/useDraftState.ts`
- `src/ui/runtime/habiti/useHabitiGainModalState.ts`
- `src/ui/runtime/world/selection/usePowerSinkThrottle.ts`
- `src/ui/runtime/world/selection/components/useParentMasterThrottle.ts`

They rely on `useEntitySelector(...)` or store-backed hooks. Once the shared invalidation migration lands, these consumers automatically stop creating their own RAF loops.

## 8. Test plan

### 8.1 Add `src/ui/runtime/state/viewInvalidationSlice.test.ts`

**Responsibility**

Verify the new invalidation-slice contract.

**Required assertions**

1. `publishRuntimeViewTick(...)` updates the value only when the tick changes.
2. `bumpCameraRevision()` increments exactly by one.
3. `resetViewInvalidation()` zeroes both fields.

### 8.2 Change `src/ui/runtime/state/useRuntimeStore.test.ts`

**Responsibility**

Verify runtime-store integration for the invalidation slice.

**Required assertions**

1. `loadCartridge()` resets `runtimeViewTick` and `cameraRevision`.
2. `unload()` resets `runtimeViewTick` and `cameraRevision`.
3. `reset()` resets `runtimeViewTick` and `cameraRevision`.

### 8.3 Change `src/engine/phaser/camera/cameraInputHandlers.test.ts`

**Responsibility**

Retain camera publish coverage.

**Required assertions**

1. Publishing still forwards the same serialized camera payload shape.
2. Store-level deduplication is not asserted here; it belongs in runtime-store tests.

### 8.4 Add `src/ui/runtime/world/selection/useEntitySelector.test.tsx`

**Responsibility**

Verify selector updates now follow shared invalidation instead of RAF.

**Required assertions**

1. The hook resolves the initial value immediately.
2. In-place entity mutation becomes visible after `runtimeViewTick` advances.
3. No update occurs when `isEqual(prev, next)` returns true.
4. Missing runtime or entity id yields `undefined`.

### 8.5 Change `src/ui/runtime/hooks/useEntityQuery.test.tsx`

**Responsibility**

Keep query behavior coverage aligned with shared invalidation.

**Required assertions**

1. Add/remove behavior still works.
2. In-place mutation becomes visible after the shared runtime tick changes.
3. The test must not depend on RAF polling.

### 8.6 Change `src/ui/runtime/world/EntityStateLink.test.tsx`

**Responsibility**

Keep bar-link coverage aligned with shared invalidation.

**Required assertions**

1. Bar transform updates after the shared runtime tick advances.
2. In-place value mutation updates the fill transform.
3. Repeating the same progress does not rewrite the DOM transform.
4. The test must not depend on RAF polling.

### 8.7 Change `src/ui/runtime/world/selection/cave/LiveNumericValue.test.tsx`

**Responsibility**

Keep live numeric text coverage aligned with shared invalidation.

**Required assertions**

1. Text updates after the shared runtime tick advances.
2. Unchanged text does not rewrite DOM content.
3. The test must not depend on RAF polling.

### 8.8 Change runtime selection-card tests that currently mock RAF solely to force view refresh

**Files to update**

- `src/ui/runtime/world/SelectionOverlay.selection-guard.test.tsx`
- `src/ui/runtime/world/selection/body/BodyCard.test.tsx`
- `src/ui/runtime/world/selection/CaveCard.test.tsx`
- `src/ui/runtime/world/selection/FaceCard.test.tsx`
- `src/ui/runtime/world/selection/AttributePoolCard.test.tsx`
- `src/ui/runtime/world/selection/job-card/JobCard.test.tsx`
- `src/ui/runtime/world/selection/SwarmCard.test.tsx`
- `src/ui/runtime/world/selection/ResourceCard.live.test.tsx`
- `src/ui/runtime/world/selection/absorption/AbsorptionCard.test.tsx`
- `src/ui/runtime/world/selection/absorption/BodyBrick.flyweight.test.tsx`

**Responsibility**

Align selection-view tests with store-driven invalidation.

**Required assertions**

1. Tests must drive updates by advancing the shared runtime tick signal.
2. Tests must stop depending on `requestAnimationFrame` mocks unless the test is explicitly about animation.

### 8.9 Change node-overlay tests

**Files to update**

- `src/ui/runtime/world/node-overlays/NodeOverlayViewport.test.tsx`
- `src/ui/runtime/world/node-overlays/NodeOverlayViewport.disabled.test.tsx`
- `src/ui/runtime/world/node-overlays/NodeOverlayViewport.focus.test.tsx`
- `src/ui/runtime/world/node-overlays/NodeOverlayViewport.guidance.test.tsx`
- `src/ui/runtime/world/node-overlays/NodeOverlayViewport.guidanceAnchor.test.tsx`
- `src/ui/runtime/world/node-overlays/NodeOverlayViewport.screenCalloutLayer.test.tsx`

**Responsibility**

Align overlay tests with shared invalidation and store-driven callout expiry.

**Required assertions**

1. Overlay positions update when runtime tick advances.
2. Overlay positions update when camera revision advances.
3. Runtime callouts appear based on store items and disappear after scheduled expiry.
4. Tests must not depend on RAF polling.

### 8.10 Add `src/ui/runtime/world/node-overlays/runtime-callouts/runtimeCalloutStore.test.ts`

**Responsibility**

Verify timeout-driven runtime callout expiry.

**Required assertions**

1. `applyBatch(...)` aggregates matching inputs.
2. `applyBatch(...)` schedules expiry for the earliest item.
3. Expired items are removed when the scheduled timeout fires.
4. `reset()` clears both items and the scheduled timeout.

## 9. Acceptance criteria

The refactor is complete only when all of the following are true:

1. `OrganicFrameLayer` renders one full-frame asset and no 9-cell structure.
2. `Card`, `Button`, and `BodyBrick` still render their existing frame states using the same `OrganicFrameKey` API.
3. Runtime-hot hooks listed in section 7.4 contain no perpetual RAF loops.
4. Runtime callout expiry is no longer driven by view polling.
5. Camera updates do not mutate the runtime store when camera values are unchanged.
6. Selection overlays, node overlays, screen guidance, cave status overlay, fill bars, and runtime clock still update correctly during runtime progression.
7. All updated and added tests pass.
8. No out-of-scope files are changed.

## 10. Implementation order

The implementation must be performed in this order.

1. Add `useElementSize.ts`.
2. Replace the organic-frame types, generator, catalog, provider consumer, and layer implementation.
3. Update organic-frame tests.
4. Add the invalidation slice and integrate it into the runtime store.
5. Publish runtime invalidation from `runtimeFactory.ts` and manual stepping from `simulationSlice.ts`.
6. Deduplicate camera writes in `cameraSlice.ts`.
7. Convert `runtimeCalloutStore.ts` to timeout-driven expiry.
8. Convert `useEntitySelector.ts`, `useSelectedEntity.ts`, `useEntityQuery.ts`, `EntityStateLinkContext.tsx`, `entityStateLinkRuntime.ts`, `useLiveNumericValue.ts`, `useAttributePoolCardData.ts`, and `useRuntimeClock.ts`.
9. Convert overlay hooks.
10. Update runtime tests.

## 11. Pseudocode-level execution notes

### 11.1 Full-frame organic asset resolution

1. Measure element size.
2. Round width and height to integers.
3. Ask the provider catalog to resolve `(frameKey, widthPx, heightPx)`.
4. If cached, reuse the asset.
5. If not cached:
    - derive bucket
    - derive edge
    - derive palette
    - build one SVG asset
    - store it in the cache
6. Render one layer with one `background-image`.

### 11.2 Runtime invalidation flow

1. The existing ticker advances the runtime.
2. After the tick, the runtime store publishes `runtimeViewTick`.
3. Phaser camera publishing continues as today.
4. The runtime store ignores identical camera snapshots and bumps `cameraRevision` only when the snapshot changed.
5. Runtime UI hooks subscribe to `runtimeViewTick` and/or `cameraRevision` and recompute on those signals.
6. Runtime callout expiry is driven by the runtime callout store's own timeout, not by any view loop.

## 12. Explicit non-ambiguity rules

1. Do not reintroduce any document-level SVG filter definition.
2. Do not keep any 9-slice organic-frame DOM structure.
3. Do not create a second runtime ticker.
4. Do not move runtime-derived mutable state into React Context.
5. Do not change public props of `Card`, `Button`, `BodyBrick`, `FillBar`, or selection-card components.
6. Do not add new polling loops to replace the removed ones.
7. Do not expand this refactor into devtools, tutorial animation, or debug overlays.
8. Do not claim exact restoration of the pre-refactor organic waveform. That source is not present in the checked-in archive used for this design.

