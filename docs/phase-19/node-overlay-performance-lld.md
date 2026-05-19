# LLD: Node Overlay Performance Remediation

## 1. Document Purpose

This document defines the low-level design for the following four changes in the live node overlay path:

1. Fix overlay invalidation fan-out.
2. Snap camera and overlay positions.
3. Move overlay slots from `left`/`top` positioning to `translate3d(...)` positioning.
4. Isolate cave status from the shared node overlay auxiliary data path.

This document is intentionally limited to the current codebase behavior and the requested scope. It does not introduce new product behavior, new rendering features, or Phaser-side background-edge changes.

---

## 2. Scope

### In scope

- React-side node overlay invalidation behavior.
- Camera-state publication semantics used by overlay subscribers.
- DOM positioning mechanics for `OverlaySlot`.
- Separation of cave status position resolution from the shared node overlay auxiliary layer.
- Tests required to lock the behavior.

### Out of scope

- Phaser background-edge rendering changes.
- Rope migration.
- Phaser display-bound publishing semantics.
- Tutorial content logic.
- Runtime invalidation service redesign.
- `CaveStatusNote` content-generation behavior.
- App-shell store subscription work outside the node overlay path.

---

## 3. Current-State Diagnosis

### 3.1 Global display-bounds invalidation is causing fan-out

The current React overlay path subscribes to a single global display-bounds revision and uses that global revision as a recomputation trigger.

Current code paths:

- `src/engine/phaser/display/nodeOverlayDisplayBoundsStore.ts`
  - Holds `byEntityId` and a single global `revision`.
- `src/ui/runtime/world/node-overlays/useNodeOverlayNodeModels.ts`
  - Subscribes to `useNodeOverlayDisplayBoundsStore((state) => state.revision)`.
- `src/ui/runtime/world/node-overlays/useNodeOverlayViewportInputs.ts`
  - Exposes `displayBoundsRevision` as a shared input.
- `src/ui/runtime/world/node-overlays/useNodeOverlayAuxiliaryData.ts`
  - Uses `displayBoundsRevision` as a structural dependency.

Effect:

- Any published bounds change for any rendered entity can invalidate all node card projections.
- Any published bounds change for any rendered entity can invalidate all auxiliary overlay resolution, even when the changed entity is unrelated to the active overlay payload.

This is the primary fan-out defect.

### 3.2 Camera invalidation is stricter than the existing camera restore contract

Current code paths:

- `src/ui/runtime/state/cameraSlice.ts`
  - Uses exact equality for `centerX`, `centerY`, and `zoom` before incrementing `cameraRevision`.
- `src/engine/phaser/camera/cameraRestore.ts`
  - Already treats camera states as equivalent when the deltas are below:
    - `0.5` on `centerX`
    - `0.5` on `centerY`
    - `0.001` on `zoom`

Effect:

- The overlay path wakes up on subpixel camera drift that the restore path already treats as equivalent.
- `cameraRevision` is therefore more volatile than the existing camera contract requires.

### 3.3 Overlay world positions are emitted as raw floats

Current code path:

- `src/ui/runtime/world/node-overlays/nodeOverlayPosition.ts`
  - `projectNodeOverlayWorldPoint(...)` returns raw floating-point `x` and `y`.

Effect:

- Tiny camera drift and tiny display-bounds drift become new overlay coordinates.
- `nodeOverlayModelEqual(...)`, `positionEqual(...)`, and related comparators then see real value changes and allow new render work.

### 3.4 Overlay slots are using layout-affecting position properties

Current code path:

- `src/ui/runtime/world/node-overlays/NodeOverlayViewport.styles.ts`
  - `OverlaySlot` uses `position: absolute`, `left`, and `top`, plus a second `translate(...)` for anchor offset.

Effect:

- Overlay movement is expressed through layout-position properties instead of compositor-friendly transform translation.

### 3.5 Cave status is not isolated from the rest of the auxiliary overlay path

Current code paths:

- `src/ui/runtime/world/node-overlays/useNodeOverlayAuxiliaryData.ts`
  - Returns `caveStatusPosition` in the shared auxiliary object.
- `src/ui/runtime/world/node-overlays/NodeOverlayViewport.tsx`
  - Passes that shared value into `NodeOverlayViewportView`.
- `src/ui/runtime/world/node-overlays/NodeOverlayViewportView.tsx`
  - Renders cave status in the same prop-driven view pipeline as guidance and runtime callouts.

Effect:

- Cave-status position changes participate in the same prop invalidation path as guidance and runtime callouts.
- Cave-status movement is therefore not isolated.

---

## 4. Design Goals

1. A display-bounds update must only invalidate overlay consumers that depend on the changed entity IDs.
2. Camera-driven overlay work must not wake up for deltas already considered equivalent by the existing camera restore contract.
3. Overlay screen positions must be snapped before equality comparison reaches React rendering.
4. `OverlaySlot` movement must be expressed through `translate3d(...)`.
5. Cave status must resolve its own position independently from the shared auxiliary overlay object.
6. The implementation must reuse existing mechanisms where they already exist:
   - Zustand selectors
   - `normalizeRuntimeEntityIds(...)`
   - current node overlay comparators
   - current runtime invalidation hooks
   - current overlay model resolvers
7. No business logic is to be moved into `.tsx` view files.

---

## 5. High-Level Design

### 5.1 Replace global display-bounds revision usage with scoped bounds subscriptions

A new feature-local hook will subscribe to only the display-bounds entries required by the current overlay consumer.

Consumers will use the new hook as an opaque reactive dependency.

Required tracked entity sets:

- Node overlay cards:
  - all `ResolvedNodeOverlayEntry.entityId` values.
- Auxiliary overlay data:
  - all active runtime-guidance target entity IDs.
  - all active runtime-callout `targetEntityId` values.
- Cave status:
  - `sys_world` only.

No live overlay hook may subscribe to `useNodeOverlayDisplayBoundsStore((state) => state.revision)` after this change.

### 5.2 Reuse the existing camera tolerance contract

The tolerance already embedded in `cameraRestore.ts` becomes the shared camera equivalence contract.

That contract will be used in both:

- `cameraRestore.ts`
- `cameraSlice.ts`

The stored camera state remains exact when a real change is accepted. The only change is whether the update is accepted as invalidating.

### 5.3 Snap overlay screen coordinates before they reach render equality

World-projected overlay coordinates will be snapped to integer CSS pixels.

This snapping occurs in the projection layer, not in the view layer.

This ensures:

- node model equality sees stable positions,
- cave-status position equality sees stable positions,
- guidance and runtime-callout world-attached positions inherit the same snapping,
- DOM styles do not receive subpixel jitter from world projections.

### 5.4 Move `OverlaySlot` motion to `translate3d(...)`

`OverlaySlot` will keep the same external prop interface:

- `$x`
- `$y`
- `$anchor`
- `$hidden`

Its CSS contract changes as follows:

- `left` becomes fixed at `0`.
- `top` becomes fixed at `0`.
- moving position is expressed only through `transform`.
- transform order is:
  1. `translate3d($x, $y, 0)`
  2. anchor offset translate

This preserves visual anchoring while moving the dynamic position off `left`/`top`.

### 5.5 Isolate cave status into its own hook-driven layer

Cave status position resolution will move out of `useNodeOverlayAuxiliaryData(...)`.

A new hook will resolve only the cave-status anchor position.

`NodeOverlayViewportView` will render cave status through a dedicated child layer component that resolves its own position internally. The parent view will no longer receive `caveStatusPosition` as a prop.

This isolates cave-status invalidation from the rest of the node overlay auxiliary data path.

---

## 6. Detailed Design

## 6.1 Scoped display-bounds subscription

### New file

#### `src/ui/runtime/world/node-overlays/useScopedNodeOverlayDisplayBounds.ts`

### Responsibility

Provide a stable React subscription to only the display-bounds entries for a specific entity-ID set.

### Logic

1. Accept a read-only list of entity IDs.
2. Normalize the list using the existing `normalizeRuntimeEntityIds(...)` helper.
3. Subscribe to `useNodeOverlayDisplayBoundsStore(...)` with a selector that reads only those IDs from `state.byEntityId`.
4. Use a custom equality function that treats the selected slice as unchanged when:
   - the normalized ID sequence is unchanged, and
   - each selected bounds entry is either both `null`, or both present with identical `entityId`, `centerX`, `topY`, and `bottomY`.
5. Return a stable empty array constant when the normalized ID set is empty.
6. Return the selected bounds slice as an opaque dependency value. Consumers must not depend on output ordering matching the original unsorted input.

### Interface

- Input: `readonly string[]`
- Output: `readonly (NodeOverlayDisplayBounds | null)[]`

### Contract

- Unrelated bounds updates do not change the returned reference.
- Relevant bounds updates do change the returned reference.
- Re-publishing an equal bounds value does not change the returned reference.

---

## 6.2 Node overlay card model invalidation

### Changed file

#### `src/ui/runtime/world/node-overlays/useNodeOverlayNodeModels.ts`

### Responsibility

Project node overlay card models for the currently visible node entries and only recompute when one of the card-relevant inputs changes.

### Logic

1. Keep the existing responsibilities for:
   - runtime presence check
   - viewport size check
   - node entry resolution via `useResolvedNodeOverlayEntries(...)`
   - model-array reuse via `nodeOverlayModelEqual(...)`
2. Remove the global `displayBoundsRevision` subscription.
3. Read the scoped bounds dependency via `useScopedNodeOverlayDisplayBounds(...)` using the current `nodeEntries` entity IDs.
4. Replace the cache key field `displayBoundsRevision` with the scoped bounds dependency reference.
5. Preserve the existing `projectNodeOverlayModels(...)` resolver.
6. Preserve the existing output array reuse rules.

### Interface

Unchanged.

### Contract

- A bounds update for an entity not present in `nodeEntries` must not cause recomputation.
- A bounds update for an entity present in `nodeEntries` must cause recomputation.
- Equal projected output must continue to reuse the prior array reference.

---

## 6.3 Shared viewport inputs

### Changed file

#### `src/ui/runtime/world/node-overlays/useNodeOverlayViewportInputs.ts`

### Responsibility

Provide raw shared viewport inputs only.

### Logic

1. Remove `displayBoundsRevision` from the returned input object and type.
2. Keep:
   - `runtime`
   - `getCameraState`
   - `cameraRevision`
   - `viewportWidth`
   - `viewportHeight`
   - `runtimeCalloutItems`
3. Do not add any new derived overlay logic to this file.

### Interface

`NodeOverlayViewportInputs` no longer contains `displayBoundsRevision`.

### Contract

This file remains a raw-input hook. It does not own overlay invalidation policy.

---

## 6.4 Camera comparison contract reuse

### New file

#### `src/engine/phaser/camera/cameraStateComparison.ts`

### Responsibility

Define the shared equivalence contract for UI-facing camera state comparisons.

### Logic

1. Move the current tolerance policy out of `cameraRestore.ts` into this file.
2. The canonical tolerance is:
   - `abs(centerX delta) < 0.5`
   - `abs(centerY delta) < 0.5`
   - `abs(zoom delta) < 0.001`
3. Expose a comparison function that returns whether two camera states are equivalent within that tolerance.

### Interface

A pure comparison function over `SerializedCameraState` values.

### Contract

This file is the sole source of truth for tolerance-based camera equivalence.

### Changed files

#### `src/engine/phaser/camera/cameraRestore.ts`

- Replace the local tolerance logic with the shared comparison function.
- No behavioral change is allowed beyond moving the source of truth.

#### `src/ui/runtime/state/cameraSlice.ts`

### Responsibility

Publish camera state into the runtime store and increment `cameraRevision` only when the published state is materially different under the shared camera comparison contract.

### Logic

1. Replace exact equality with the shared camera comparison function.
2. When the new state is equivalent within tolerance:
   - do not update `cameraState`
   - do not increment `cameraRevision`
3. When the new state is outside tolerance:
   - store the exact incoming camera state
   - increment `cameraRevision`

### Interface

Unchanged.

### Contract

- The store must not wake overlay subscribers for subpixel drift below the shared tolerance.
- Accepted camera changes continue to store exact values.

---

## 6.5 Overlay screen-position snapping

### Changed file

#### `src/ui/runtime/world/node-overlays/nodeOverlayPosition.ts`

### Responsibility

Project world-space overlay anchors into screen-space overlay anchors.

### Logic

1. Add a pure helper that snaps a numeric screen coordinate to the nearest integer CSS pixel.
2. Apply snapping in `projectNodeOverlayWorldPoint(...)` before returning `ScreenPosition`.
3. Ensure `resolveTopNodeOverlayPosition(...)` and `resolveBottomNodeOverlayPosition(...)` inherit the snapped output.
4. Do not change the meaning of world-to-screen projection.
5. Do not change visibility guards for missing camera or non-positive viewport size.

### Interface

Existing public function signatures remain unchanged.

### Contract

- All world-projected overlay positions are integer CSS-pixel positions.
- Position snapping occurs before model equality reaches React.

### Changed file

#### `src/ui/runtime/world/node-overlays/overlayViewportGuidanceModels.ts`

### Responsibility

Resolve runtime-guidance and runtime-callout overlay models.

### Logic

1. Preserve the existing model shapes.
2. Preserve node-attached callout placement semantics.
3. For targetless runtime callouts that are placed through `toScreenPoint(...)`, snap the resulting screen coordinates to integer CSS pixels before returning the model.
4. Do not change screen-guidance slot selection behavior.

### Interface

Unchanged.

### Contract

Every model rendered through `OverlaySlot` must provide integer CSS-pixel coordinates.

---

## 6.6 Auxiliary overlay data fan-out reduction

### Changed file

#### `src/ui/runtime/world/node-overlays/nodeOverlayViewportLayerUtils.ts`

### Responsibility

Provide equality helpers and empty-value definitions for the live auxiliary overlay data path.

### Logic

1. Remove `caveStatusPosition` from `NodeOverlayAuxiliaryData`.
2. Remove `caveStatusPosition` from:
   - `EMPTY_NODE_OVERLAY_AUXILIARY_DATA`
   - `nodeOverlayAuxiliaryDataEqual(...)`
3. Keep guidance, runtime-callout, and screen-guidance equality behavior unchanged.
4. Keep `positionEqual(...)` exported because it will be reused by the new cave-status hook.

### Interface

`NodeOverlayAuxiliaryData` now contains only:

- `guidanceModels`
- `screenGuidanceModels`
- `runtimeCalloutModels`

### Contract

The shared auxiliary overlay object no longer owns cave-status position.

### Changed file

#### `src/ui/runtime/world/node-overlays/useNodeOverlayAuxiliaryData.ts`

### Responsibility

Resolve the live non-card, non-cave node overlay payload:

- runtime guidance callouts
- screen guidance callouts
- runtime callouts

### Logic

1. Remove `caveStatusPosition` from the hook output.
2. Narrow runtime invalidation to the minimum existing runtime granularity available in the codebase:
   - tutorial data lives on `sys_world`
   - guidance definitions live in the cartridge config
   - target appearance/disappearance can depend on entity-list changes
3. Therefore, the runtime-driven part of this hook must react only to:
   - `entity:sys_world`
   - `entity-list`
   - `blueprint`
4. Do not subscribe this hook to mutation-wide invalidation.
5. Resolve active guidance views from the runtime under that narrowed runtime invalidation contract.
6. Extract the union of:
   - active guidance target IDs
   - runtime callout target entity IDs
7. Subscribe to display bounds only for that union via `useScopedNodeOverlayDisplayBounds(...)`.
8. Recompute auxiliary overlay models only when one of these inputs changes:
   - enabled flag
   - runtime reference
   - camera revision
   - viewport width
   - viewport height
   - active guidance payload
   - runtime callout items
   - scoped bounds dependency
9. Continue to reuse prior arrays using the existing equality helpers.

### Interface

The output type becomes `NodeOverlayAuxiliaryData` without `caveStatusPosition`.

### Contract

- Unrelated display-bounds updates must not change the auxiliary object reference.
- `sys_world` bounds updates must not affect this hook unless `sys_world` is an active guidance or runtime-callout target.
- Tutorial and blueprint changes continue to update guidance models.

### Design note

This design intentionally does not introduce a new tutorial-only runtime invalidation scope. The current runtime invalidation system is entity-granular, and this LLD must use the existing mechanism rather than inventing a new one.

---

## 6.7 Cave-status isolation

### New file

#### `src/ui/runtime/world/node-overlays/useCaveStatusOverlayPosition.ts`

### Responsibility

Resolve only the cave-status anchor position.

### Logic

1. Accept the overlay root ref and `enabled` flag.
2. Read:
   - runtime
   - `getCameraState`
   - `cameraRevision`
   - viewport size
3. Subscribe to display bounds only for `sys_world` via `useScopedNodeOverlayDisplayBounds(["sys_world"])`.
4. Resolve cave-status position with the existing `resolveCaveStatusPosition(...)` pure function.
5. Reuse the previous position reference when `positionEqual(...)` returns true.
6. Return `null` when disabled, when runtime is absent, or when viewport size is non-positive.

### Interface

- Input: `(rootRef, enabled)`
- Output: `ScreenPosition | null`

### Contract

- Only `sys_world` display-bounds updates can invalidate cave-status position.
- Cave-status position changes do not invalidate the shared auxiliary overlay object.

### Changed file

#### `src/ui/runtime/world/node-overlays/NodeOverlayViewportView.tsx`

### Responsibility

Render the overlay viewport layers.

### Logic

1. Remove `caveStatusPosition` from the component props.
2. Keep `rootRef` in the parent so all overlay layers still share the same DOM root.
3. Replace the current pure `CaveStatusLayer` prop-driven component with a child layer component that:
   - receives `rootRef`
   - receives `enabled`
   - reads focus state from the parent
   - resolves its own position through `useCaveStatusOverlayPosition(...)`
4. Do not move cave-status resolution into the `.tsx` parent component body.
5. Preserve current focus-based hiding behavior:
   - hide when there is no cave position
   - hide when focus is active and `sys_world` is not focused

### Interface

`NodeOverlayViewportView` gains `enabled` and loses `caveStatusPosition`.

### Contract

Cave status is rendered in the same overlay root but through an independently reactive child layer.

### Changed file

#### `src/ui/runtime/world/node-overlays/NodeOverlayViewport.tsx`

### Responsibility

Wire the live node overlay hooks into the view.

### Logic

1. Continue to resolve:
   - `enabled`
   - `rootRef`
   - `nodeModels`
   - shared viewport inputs
   - auxiliary data
2. Stop passing `caveStatusPosition` into the view.
3. Pass `enabled` into the view so the cave-status child layer can use it.

### Interface

Unchanged externally.

### Changed file

#### `src/ui/runtime/world/node-overlays/useNodeOverlayViewportData.ts`

### Responsibility

Remain the compatibility wrapper that returns full `OverlayViewportData`.

### Logic

1. Continue to call `useNodeOverlayNodeModels(...)`.
2. Continue to call `useNodeOverlayAuxiliaryData(...)`.
3. Add a separate call to `useCaveStatusOverlayPosition(...)`.
4. Merge those values back into a full `OverlayViewportData` result.
5. Preserve the existing return type.

### Interface

Unchanged.

### Contract

This hook preserves the existing full-data contract, but it is not the live rendering path that owns cave-status isolation.

---

## 6.8 Overlay slot positioning

### Changed file

#### `src/ui/runtime/world/node-overlays/NodeOverlayViewport.styles.ts`

### Responsibility

Define the shared node-overlay slot DOM style contract.

### Logic

1. Keep `position: absolute`, `opacity`, and z-order behavior unchanged.
2. Replace dynamic `left` and `top` positioning with:
   - `left: 0`
   - `top: 0`
3. Express the moving position entirely in `transform` using:
   - `translate3d($xpx, $ypx, 0)`
   - followed by the current anchor translate
4. Preserve current anchor semantics:
   - default and `above` remain vertically translated by `-100%`
   - `below` remains vertically translated by `0`
5. Do not change `OverlaySlot` prop names.

### Interface

Unchanged prop interface.

### Contract

`OverlaySlot` movement is transform-only.

---

## 7. File-by-File Change Summary

## New files

1. `src/ui/runtime/world/node-overlays/useScopedNodeOverlayDisplayBounds.ts`
2. `src/engine/phaser/camera/cameraStateComparison.ts`
3. `src/ui/runtime/world/node-overlays/useCaveStatusOverlayPosition.ts`

## Changed files

1. `src/ui/runtime/world/node-overlays/useNodeOverlayNodeModels.ts`
2. `src/ui/runtime/world/node-overlays/useNodeOverlayViewportInputs.ts`
3. `src/ui/runtime/world/node-overlays/nodeOverlayPosition.ts`
4. `src/ui/runtime/world/node-overlays/overlayViewportGuidanceModels.ts`
5. `src/ui/runtime/world/node-overlays/nodeOverlayViewportLayerUtils.ts`
6. `src/ui/runtime/world/node-overlays/useNodeOverlayAuxiliaryData.ts`
7. `src/ui/runtime/world/node-overlays/NodeOverlayViewportView.tsx`
8. `src/ui/runtime/world/node-overlays/NodeOverlayViewport.tsx`
9. `src/ui/runtime/world/node-overlays/useNodeOverlayViewportData.ts`
10. `src/ui/runtime/world/node-overlays/NodeOverlayViewport.styles.ts`
11. `src/ui/runtime/state/cameraSlice.ts`
12. `src/engine/phaser/camera/cameraRestore.ts`

---

## 8. Non-Goals and Explicitly Preserved Behavior

1. No change to `resolveNodeOverlayDisplayBounds(...)` fallback semantics.
2. No change to display-bounds publication in Phaser.
3. No change to card, guidance, or runtime-callout visual content.
4. No change to tutorial guidance selection semantics.
5. No change to `CaveStatusNote` content animation/update behavior.
6. No change to screen-guidance portal rendering.
7. No Phaser background-edge optimization in this work item.

---

## 9. Test Plan

The tests below are mandatory. They are organized by behavior, not by implementation detail.

## 9.1 Unit tests

### New

#### `src/engine/phaser/camera/cameraStateComparison.test.ts`

Must verify:

- equivalent states within tolerance compare equal,
- larger deltas compare unequal,
- all three fields participate in the comparison contract.

#### `src/ui/runtime/world/node-overlays/useScopedNodeOverlayDisplayBounds.test.tsx`

Must verify:

- unrelated entity bounds updates keep the hook result reference stable,
- relevant entity bounds updates change the hook result reference,
- equal re-publication keeps the hook result reference stable,
- empty input returns the stable empty reference.

#### `src/ui/runtime/world/node-overlays/useCaveStatusOverlayPosition.test.tsx`

Must verify:

- `sys_world` bounds changes update cave-status position,
- unrelated bounds changes do not update cave-status position,
- equal projected positions reuse the previous reference,
- disabled and zero-sized viewport cases return `null` or the stable empty result as appropriate.

### Changed

#### `src/ui/runtime/world/node-overlays/nodeOverlayPosition.test.ts`

Add assertions that projected node-overlay positions are snapped to integer CSS pixels.

#### `src/ui/runtime/state/cameraSlice.test.ts`

Add a unit test file for camera actions.

Must verify:

- `cameraRevision` does not increment for changes within the shared tolerance,
- `cameraRevision` increments for changes outside tolerance,
- accepted updates still store the exact incoming camera state.

## 9.2 Hook and integration tests

### Changed

#### `src/ui/runtime/world/node-overlays/useNodeOverlayNodeModels.displayBoundsRevision.test.tsx`

Replace the current global-revision expectation with scoped behavior.

Must verify:

- publishing bounds for an unrelated entity does not call `projectNodeOverlayModels(...)`,
- publishing bounds for a tracked entity does call `projectNodeOverlayModels(...)`,
- equal projected output still reuses the previous array reference.

#### `src/ui/runtime/world/node-overlays/useNodeOverlayAuxiliaryData.displayBoundsRevision.test.tsx`

Must verify:

- unrelated bounds updates do not recompute auxiliary data,
- tracked guidance or runtime-callout target bounds updates do recompute auxiliary data,
- `sys_world` bounds changes alone do not affect auxiliary data once cave status is isolated.

#### `src/ui/runtime/world/node-overlays/useNodeOverlayViewportData.layers.test.tsx`

Update to reflect the new composition:

- the compatibility wrapper still returns full `OverlayViewportData`,
- cave-status position changes do not churn the shared auxiliary sub-objects.

## 9.3 View tests

### Changed

#### `src/ui/runtime/world/node-overlays/NodeOverlayViewport.guidanceAnchor.displayBounds.test.tsx`

Current style assertions that read `top` must be updated.

Must verify:

- the callout still anchors from published display bounds,
- the rendered transform includes the expected translated screen position,
- the anchor offset remains correct.

#### `src/ui/runtime/world/node-overlays/NodeOverlayViewport.guidanceAnchor.test.tsx`

Update the transform assertion to match the new `translate3d(...)` contract while preserving anchor expectations.

#### `src/ui/runtime/world/node-overlays/NodeOverlayViewport.test.tsx`

Keep the existing smoke/render assertions. No new behavioral scope is required here unless the transform contract is asserted centrally in this file.

---

## 10. Acceptance Criteria

The implementation is complete only when all of the following are true:

1. No live node overlay hook subscribes to the global display-bounds revision.
2. `useNodeOverlayNodeModels(...)` only wakes on camera changes, viewport changes, node entry changes, runtime changes, or bounds changes for tracked node entities.
3. `useNodeOverlayAuxiliaryData(...)` no longer carries `caveStatusPosition`.
4. Cave status resolves through its own dedicated hook and child layer.
5. `cameraRevision` does not increment for sub-threshold drift.
6. World-projected overlay positions are snapped to integer CSS pixels.
7. `OverlaySlot` uses `translate3d(...)` for dynamic movement.
8. Existing view behavior is preserved:
   - overlay content still renders,
   - guidance anchoring still works,
   - cave status still hides under the same focus rules.
9. All new and changed tests pass.

---

## 11. Implementation Order

1. Add shared camera comparison utility and update `cameraRestore.ts` and `cameraSlice.ts`.
2. Add scoped display-bounds hook.
3. Update `useNodeOverlayNodeModels.ts` to use scoped bounds.
4. Update `useNodeOverlayViewportInputs.ts` to remove global bounds revision exposure.
5. Add cave-status hook.
6. Update auxiliary data path to remove cave status and use scoped bounds.
7. Update viewport view wiring to isolate cave status.
8. Update `OverlaySlot` styling to `translate3d(...)`.
9. Update tests in unit, hook, and view layers.

This order minimizes breakage and keeps the reactive contract clear at each step.
