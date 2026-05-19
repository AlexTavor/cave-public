# LLD: FPS Stabilization via Incremental Display Sync, Progress-Bar Memoization, and Overlay Hydration De-duplication

## 1. Document intent

This document defines the low-level design for the highest-ROI immediate performance fixes identified from the current codebase.

It is intentionally limited to changes that are supported by the inspected source. It does **not** introduce workerization, rendering-model rewrites, or speculative architecture.

This design conforms to the project contract:
- Runtime remains the single source of truth.
- UI remains observational only.
- Existing invalidation, store, and Phaser mechanisms are reused wherever they already exist.
- Tests validate the contract at the logic, integration, and view layers.

## 2. Scope

### In scope

1. Remove unconditional full-world display-spec recomputation from steady-state `DisplayInstanceManager.tick()`.
2. Remove redundant tutorial-attention application in the display tick path.
3. Reduce steady-state cost in the Phaser progress-bar module by memoizing geometry and render state.
4. Remove repeated entity-index rebuilds inside node-overlay throttle resolution.
5. Remove repeated node-overlay display-bounds store reads during projection by reusing the already-subscribed scoped bounds.

### Out of scope

1. Moving runtime to a worker.
2. Replacing Phaser.
3. Replacing the node-overlay system.
4. Changing gameplay, semantics, visuals, or authored data.
5. Changing DOM/entity-state-link progress bars. The inspected code already updates those incrementally and they are not the target of this patch.

## 3. Why these fixes

### 3.1 Display path

`src/engine/phaser/display/DisplayInstanceManager.entities.ts` currently does all of the following on every frame:

1. iterates `runtime.getEntities()`
2. reads blueprint/display/style assets
3. calls `resolveDisplaySpec(...)`
4. creates or looks up an instance
5. ticks the instance
6. publishes overlay bounds
7. applies tutorial attention
8. removes stale instances

This couples structural synchronization and per-frame animation into one unconditional full-world pass.

That is the largest immediate ROI fix because it is in the Phaser hot path and scales with world size even when display structure has not changed.

### 3.2 Tutorial attention redundancy

`applyTutorialAttentionToInstance(...)` is called from both:

- `src/engine/phaser/display/DisplayInstanceManagerTick.ts`
- `src/engine/phaser/display/DisplayInstanceManager.entities.ts`

That duplication is unnecessary and occurs inside the per-entity hot loop.

### 3.3 Progress bars

`src/engine/phaser/display/modules/progressBarTick.ts` currently:

1. hides every slot every tick
2. rebuilds guide points every tick
3. smooths the path every tick
4. rebuilds polyline metrics every tick
5. rebuilds local bounds every tick
6. re-syncs ropes every tick even when geometry and style are unchanged

This work is deterministic and mostly driven by a small set of inputs that can be memoized.

### 3.4 Overlay hydration and projection

Two avoidable costs exist in the node-overlay path:

1. `src/ui/runtime/world/node-overlays/resolveNodeOverlayThrottle.ts` rebuilds an entity `Map` from `runtime.getEntities()` on every call, and then calls `resolveAncestorMasterThrottle(entities, id)`, which builds another map again in `src/game/systems/energy/parentThrottle.ts`.
2. `src/ui/runtime/world/node-overlays/useNodeOverlayNodeModels.ts` already subscribes to scoped display bounds, but `projectNodeOverlayModels(...)` re-reads the global bounds store for each entry through `resolveNodeOverlayDisplayBounds(...)`.

These are direct, local inefficiencies that can be removed without changing overlay behavior.

## 4. Design summary

The implementation is split into three changesets.

### Changeset A — Incremental display-structure sync

Separate display work into:

1. **structural sync**
   - driven by runtime invalidation revisions
   - updates only display-capable entity records whose structure may have changed
   - full rebuild only on runtime replacement, world reset, entity-list revision, or blueprint revision

2. **frame tick**
   - iterates only cached display-capable records
   - rebuilds only the dynamic `DisplaySpec` fields that depend on live entity state and physics
   - keeps instance tick behavior unchanged

### Changeset B — Progress-bar memoization

Keep the existing `ProgressBarsModule` and slot pool, but make slot updates stateful:

1. stop blanket hiding on every tick
2. cache geometry by `(position, radius, spanRatio)`
3. only resync track/fill rope when the relevant render inputs changed
4. always preserve current behavior for icon rendering unless render inputs are explicitly unchanged and safely comparable

### Changeset C — Overlay de-duplication

1. build one shared `entityById` index per overlay hydration cycle
2. thread that index through cycle/throttle resolution
3. add an index-based parent-throttle resolver
4. pass already-selected scoped bounds into projection, instead of re-reading the global bounds store per entry

## 5. Detailed design

---

## 5A. Incremental display-structure sync

### Behavioral contract

1. If runtime is `null`, all display instances and overlay bounds are destroyed exactly as today.
2. If runtime has no invalidation reader, display sync falls back to the current full-rebuild behavior. This preserves compatibility with existing tests and doubles.
3. If runtime has an invalidation reader and no relevant revisions changed, `DisplayInstanceManager.tick()` must **not** call `runtime.getEntities()`.
4. If only `mutationRevision` changed, only `getLastChangedEntityIds()` may be structurally re-evaluated.
5. `shouldRenderEntity` remains a frame-time visibility gate only. It does **not** control whether an entity is kept in the structural cache.
6. Tutorial attention is applied exactly once per entity tick.

### Data model

A new internal record is introduced for display-capable entities.

#### `DisplayStructuralRecord`
Fields:
- `entityId: string`
- `entity: RuntimeEntity`
- `staticSpec: ResolvedDisplayStaticSpec`

Purpose:
- persist the structural portion of display resolution
- allow instances to be recreated without re-resolving blueprint/style/display assets every frame
- preserve the last known entity for destroy paths

#### `DisplayStructureSyncState`
Fields:
- `runtime: Runtime | null`
- `worldRevision: number`
- `entityListRevision: number`
- `blueprintRevision: number`
- `mutationRevision: number`

Purpose:
- track whether structural sync must do a full rebuild, incremental update, or no work

### File: `src/engine/phaser/display/DisplayInstanceManager.ts` (changed)

**Responsibility**

Own display instance lifetime, structural cache lifetime, and orchestration order.

**Logic**

1. Add a `structuralRecords` map keyed by `entityId`.
2. Add a `DisplayStructureSyncState`.
3. On every `tick(...)`:
   - read runtime
   - if runtime is `null`:
     - clear display registries
     - clear structural sync state
     - destroy all instances
     - destroy pools
     - return
   - sync glyph/avatar epochs exactly as today
   - call `syncDisplayStructure(...)`
   - call `tickDisplayManagerEntities(...)` using the structural cache
4. `destroyAll()` must additionally clear the structural cache and reset structural sync state.

**Interface / contract**

Public interface remains unchanged:
- `tick(timeMs, deltaMs): void`
- `destroyAll(): void`
- `getStats(): DisplayInstanceManagerStats`

No caller changes are required.

### File: `src/engine/phaser/display/DisplayInstanceManager.structural.ts` (new)

**Responsibility**

Synchronize the structural display cache with runtime invalidation state.

**Logic**

Expose one function:

#### `syncDisplayStructure(input): void`

Inputs:
- `deps`
- `runtime`
- `records: Map<string, DisplayStructuralRecord>`
- `instances`
- `last`
- `destroyInstance`
- `syncState`

Algorithm:

1. Read `runtime.getInvalidation?.()`.
2. If no invalidation reader exists:
   - perform a full rebuild from `runtime.getEntities()`
   - update `syncState` with sentinel values derived from current reader absence
   - return

3. Read:
   - `worldRevision`
   - `entityListRevision`
   - `blueprintRevision`
   - `mutationRevision`

4. Decide sync mode:
   - **full rebuild** if any of the following is true:
     - runtime identity changed
     - world revision changed
     - entity-list revision changed
     - blueprint revision changed
   - **incremental mutation update** if mutation revision changed and full rebuild is not required
   - **no-op** otherwise

5. Full rebuild behavior:
   - iterate `runtime.getEntities()`
   - for each entity:
     - resolve structural display spec
     - if no structural spec:
       - remove existing record if present
       - destroy instance if present
       - continue
     - upsert record with latest entity and structural spec
   - after the pass, remove any cached ids not seen in this rebuild and destroy their instances
   - update all stored revisions

6. Incremental mutation behavior:
   - iterate `runtime.getInvalidation().getLastChangedEntityIds()`
   - for each changed id:
     - `runtime.getEntity(id)`
     - if missing:
       - remove record if present
       - destroy instance if present
       - continue
     - resolve structural display spec
     - if no structural spec:
       - remove record if present
       - destroy instance if present
       - continue
     - upsert record with latest entity and structural spec
   - update only `mutationRevision`

**Interface / contract**

Only `DisplayInstanceManager.ts` calls this file.

This file does **not** tick visual instances. It only updates the structural cache and destroys obsolete instances.

### File: `src/engine/phaser/display/resolveDisplaySpec.ts` (changed)

**Responsibility**

Keep the existing full `resolveDisplaySpec(...)` API intact while exposing a structural/static resolution phase and a dynamic composition phase.

**Logic**

Add two exports while preserving the current export:

#### `resolveDisplayStaticSpec(params): ResolvedDisplayStaticSpec | null`

Inputs:
- `entity`
- `blueprint`
- `styles`
- `displays`
- `blueprints`

Behavior:
- parses display component exactly as current code does
- resolves display source, display asset, style, glyph key, label, and display bars exactly as current code does
- stores the parsed display component because dynamic radius composition still depends on it
- does **not** read physics
- does **not** produce `x`, `y`, `radius`, or `hasPhysics`

#### `composeDisplaySpec(staticSpec, entity, physics): DisplaySpec`

Inputs:
- `staticSpec`
- live `entity`
- live `physics`

Behavior:
- if no physics:
  - produce the current no-physics `DisplaySpec` shape with `x = 0`, `y = 0`, `radius = 0`, `hasPhysics = false`
- if physics exists:
  - compute radius through existing `resolveDisplayRadius(entity, staticSpec.display, physics)`
  - produce the current `DisplaySpec`

#### `resolveDisplaySpec(params): DisplaySpec | null`

Behavior:
- becomes a thin wrapper:
  - resolve static spec
  - if null, return null
  - compose full spec with the supplied physics

**Interface / contract**

Existing callers outside the display-manager optimization remain unchanged.

### File: `src/engine/phaser/display/DisplayInstanceManager.entities.ts` (changed)

**Responsibility**

Perform steady-state per-frame ticking over cached structural records only.

**Logic**

1. Remove the top-level `for (const entity of runtime.getEntities())` world scan.
2. Iterate `structuralRecords.values()` instead.
3. For each record:
   - read `runtime.getEntity(record.entityId)` to obtain the authoritative current entity
   - if missing:
     - remove the structural record
     - destroy the instance
     - continue
   - update `record.entity` with the live entity
   - evaluate `shouldRenderEntity(liveEntity)`
     - if false:
       - destroy instance if it exists
       - continue without removing the structural record
   - read live physics through `runtime.getPhysicsBody(record.entityId)`
   - compose full `DisplaySpec`
   - ensure instance exists
   - tick instance
   - publish overlay bounds if present
   - write `last.set(entityId, { spec, entity })`

4. Remove the direct call to `applyTutorialAttentionToInstance(...)` from this file.

5. Remove the end-of-loop stale-instance sweep from steady-state ticking. Structural sync becomes authoritative for stale removal.

**Interface / contract**

Function signature changes to accept:
- `structuralRecords: Map<string, DisplayStructuralRecord>`

All other caller contracts remain internal to the display package.

### File: `src/engine/phaser/display/DisplayInstanceManagerTick.ts` (changed)

**Responsibility**

Remain the single location that applies tutorial-attention state and guards the instance tick with error handling.

**Logic**

No algorithmic expansion. The only semantic rule is:
- tutorial attention is applied here and nowhere else in the per-entity tick path

**Interface / contract**

Unchanged public/internal signature.

### File: `src/engine/phaser/display/DisplayInstanceManager.lifecycle.ts` (changed)

**Responsibility**

Keep instance destruction behavior unchanged and remove stale state when a cached entity is deleted.

**Logic**

No new public behavior. Adjust helper usage so that:
- structural sync paths can remove records and destroy instances using existing `destroyManagedInstance(...)`
- no steady-state `removeStaleInstances(...)` call is required from the frame tick

**Interface / contract**

`destroyManagedInstance(...)` remains the canonical destroy path.

---

## 5B. Progress-bar memoization

### Behavioral contract

1. Visual output must remain identical.
2. A slot that was already hidden and remains inactive must not be hidden again.
3. Track rope updates must occur only when track geometry or track style changes.
4. Fill rope updates must occur only when fill geometry or fill style changes.
5. Local progress-bar geometry must be cached by:
   - `position`
   - `nodeRadius`
   - `spanRatio`
6. Bounds publication remains correct for moving entities. Only local extents are cached; world translation still uses the current `spec.x/spec.y`.

### State model

#### `CachedProgressBarGeometry`
Fields:
- `geometryKey: string`
- `points`
- `metrics`
- `bounds`
- `bulb`
- `trackWidthPx`
- `fillWidthPx`
- `bulbRadiusPx`

Purpose:
- cache all geometry derived solely from `(position, radius, spanRatio)`

#### `ProgressBarSlotRenderState`
Fields:
- `geometryKey: string`
- `trackTint: number`
- `fillTint: number`
- `fillRatio: number`
- `trackWidthPx: number`
- `fillWidthPx: number`
- `resourceId: string`

Purpose:
- represent whether the slot’s visual state is materially unchanged

### File: `src/engine/phaser/display/modules/ProgressBarsModule.ts` (changed)

**Responsibility**

Own module-lifetime caches for progress-bar rendering.

**Logic**

Inside `create(ctx)`:
1. keep `slots` exactly as today
2. keep `loggedDuplicates` exactly as today
3. add `geometryCache = new Map<string, CachedProgressBarGeometry>()`
4. pass `geometryCache` into `tickProgressBars(...)`

**Interface / contract**

Factory signature remains unchanged.

### File: `src/engine/phaser/display/modules/progressBarSlots.ts` (changed)

**Responsibility**

Keep pooled slot objects and expose per-slot render-state storage.

**Logic**

Extend `ProgressBarSlotState` with:
- `visible: boolean`
- `renderState: ProgressBarSlotRenderState | null`

Creation behavior:
- initialize `visible = false`
- initialize `renderState = null`

Hide behavior:
- if slot is already hidden, no-op
- otherwise:
  - hide track/fill/bulb/icons
  - set `visible = false`
  - set `renderState = null`

Destroy behavior remains unchanged.

**Interface / contract**

Slot consumers must treat `visible` and `renderState` as authoritative.

### File: `src/engine/phaser/display/modules/progressBarTick.ts` (changed)

**Responsibility**

Render active progress bars using memoized geometry and diffed rope state.

**Logic**

1. Remove the blanket `hideProgressBarSlots(input.slots)` call.
2. Build `positioned` exactly as today, preserving duplicate-position logging.
3. For each canonical slot position:
   - if no active bar exists for that position:
     - call slot hide only if `slot.visible === true`
     - continue
   - resolve live range exactly as today
   - compute `geometryKey = position + radius + spanRatio`
   - resolve cached geometry:
     - if cache miss:
       - build guide points
       - smooth guide path
       - build polyline metrics
       - measure bounds
       - store bulb point and widths
   - compute:
     - `fillRatio`
     - `fillColor`
     - `trackColor`
     - `fillTint`
     - `trackTint`
   - build `nextRenderState`
   - diff against `slot.renderState`

4. Diff rules:
   - update track rope only if any of:
     - `geometryKey` changed
     - `trackTint` changed
     - `trackWidthPx` changed
   - update fill rope only if any of:
     - `geometryKey` changed
     - `fillTint` changed
     - `fillRatio` changed
     - `fillWidthPx` changed
   - update bulb only if any of:
     - `geometryKey` changed
     - `trackTint` changed
   - icon rendering:
     - keep existing `tickProgressBarIcon(...)` call for every active slot unless the implementation can safely prove identical icon inputs without introducing a new speculative equality mechanism
     - no icon-diffing contract is introduced in this patch

5. Bounds:
   - use cached local bounds
   - translate with the current `spec.x/spec.y`
   - merge into `scratch.nodeOverlayDisplayBounds` exactly as today

6. Commit:
   - set `slot.visible = true`
   - set `slot.renderState = nextRenderState`

**Interface / contract**

Signature change:
- add `geometryCache: Map<string, CachedProgressBarGeometry>`

No external callers beyond `ProgressBarsModule.ts`.

---

## 5C. Overlay de-duplication

### Behavioral contract

1. Overlay content and positions remain unchanged.
2. `resolveNodeOverlayEntries(runtime)` must build the runtime entity list once per full overlay pass.
3. `resolveNodeOverlayThrottle(...)` must use a supplied entity index when available.
4. `resolveAncestorMasterThrottle(...)` keeps its current array-based API for existing callers.
5. Overlay projection must use the already-subscribed scoped bounds first and fall back to physics only when the scoped bound is absent.

### File: `src/game/systems/energy/parentThrottle.ts` (changed)

**Responsibility**

Provide both the existing array-based API and a new map-based API for ancestor throttle resolution.

**Logic**

Add:

#### `resolveAncestorMasterThrottleFromIndex(entityById, entityId): number`

Behavior:
- identical traversal semantics to the current function
- uses the supplied `Map` directly
- preserves cycle logging and destroyed-ancestor fallback behavior

Refactor current:

#### `resolveAncestorMasterThrottle(entities, entityId): number`

Behavior:
- build `entityById` once
- delegate to `resolveAncestorMasterThrottleFromIndex(...)`

**Interface / contract**

Existing callers remain unchanged.
The new map-based API is used only by node overlays.

### File: `src/ui/runtime/world/node-overlays/nodeOverlayViewportHydration.ts` (changed)

**Responsibility**

Own the overlay entry cache and, after this change, the shared runtime entity index.

**Logic**

Extend `NodeOverlayEntryIndex` with:
- `entityById: Map<string, RuntimeEntity>`

`buildNodeOverlayEntryIndex(runtime)`:
1. read `runtime.getEntities()` once
2. build `entityById`
3. resolve entries using that shared index
4. return both `byId`, `entries`, and `entityById`

`applyNodeOverlayEntryChanges(index, runtime, changedEntityIds)`:
1. for each changed id:
   - read `runtime.getEntity(id)`
   - update or delete `index.entityById`
   - resolve overlay model with the shared `entityById`
   - update or delete `index.byId`
2. re-sort `entries` only when `byId` changed

**Interface / contract**

The public signatures remain unchanged for callers of:
- `buildNodeOverlayEntryIndex(runtime)`
- `applyNodeOverlayEntryChanges(index, runtime, changedEntityIds)`

The returned `NodeOverlayEntryIndex` type is extended.

### File: `src/ui/runtime/world/node-overlays/resolveNodeOverlayEntries.ts` (changed)

**Responsibility**

Resolve all overlay entries with a single shared entity index.

**Logic**

Change implementation to:
1. read `runtime.getEntities()` once
2. build `entityById` once
3. resolve each entity through `resolveNodeOverlayModel(entity, runtime, entityById)`
4. sort exactly as today

**Interface / contract**

Add an optional internal parameter:
- `entityById?: Map<string, RuntimeEntity>`

If omitted, the function builds the index once internally.

External call sites remain valid.

### File: `src/ui/runtime/world/node-overlays/resolveNodeOverlayModel.ts` (changed)

**Responsibility**

Pass the shared entity index to overlay helpers that need ancestry or runtime lookups.

**Logic**

Add optional parameter:
- `entityById?: Map<string, RuntimeEntity>`

Only the cycle path uses the new index:
- `resolveCycleOverlayEntry(entity, entityId, runtime, entityById)`

Assignment and storage behavior remain unchanged.

**Interface / contract**

Existing callers remain valid because the new parameter is optional.

### File: `src/ui/runtime/world/node-overlays/resolveCycleOverlayEntry.ts` (changed)

**Responsibility**

Use the shared entity index when computing throttle-dependent waiting-state overlays.

**Logic**

Add optional parameter:
- `entityById?: Map<string, RuntimeEntity>`

Change only this call:
- `resolveNodeOverlayThrottle(entity, runtime, entityById)`

All other behavior remains unchanged.

**Interface / contract**

Existing callers remain valid because the new parameter is optional.

### File: `src/ui/runtime/world/node-overlays/resolveNodeOverlayThrottle.ts` (changed)

**Responsibility**

Resolve cycle throttle without rebuilding entity maps when a shared index is already available.

**Logic**

Add optional parameter:
- `entityById?: Map<string, RuntimeEntity>`

Algorithm:
1. If `entityById` is supplied:
   - use it directly
   - when a throttle-bearing ancestor is found, use `resolveAncestorMasterThrottleFromIndex(entityById, current.id)`
2. Else:
   - preserve the current fallback behavior
   - read `runtime.getEntities()`
   - build local `byId`
   - use `resolveAncestorMasterThrottleFromIndex(byId, current.id)`

No behavior change is allowed in:
- direct throttle reading
- parent traversal
- cycle handling
- fallback to `0`

**Interface / contract**

Existing callers remain valid.

### File: `src/ui/runtime/world/node-overlays/useNodeOverlayNodeModels.ts` (changed)

**Responsibility**

Use the scoped bounds it already subscribes to as the projection input.

**Logic**

This file already computes:
- `nodeEntries`
- `displayBounds`
- viewport size
- camera revision

Change only the call to `projectNodeOverlayModels(...)` so that it passes the selected `displayBounds` array aligned to `nodeEntries`.

Cache-key rules remain:
- runtime identity
- entry array identity
- viewport width/height
- camera revision
- scoped display-bounds array identity

**Interface / contract**

No public signature change.

### File: `src/ui/runtime/world/node-overlays/overlayViewportNodeModels.ts` (changed)

**Responsibility**

Project node overlays using caller-supplied scoped bounds, with existing physics fallback behavior preserved.

**Logic**

Change signature:

#### `projectNodeOverlayModels(runtime, cameraState, viewportWidth, viewportHeight, nodeEntries, displayBoundsByEntry?)`

Rules:
1. `displayBoundsByEntry[i]` corresponds to `nodeEntries[i].entityId`
2. if `displayBoundsByEntry[i]` is non-null, use it directly
3. if it is null or omitted, call `resolveNodeOverlayDisplayBounds(runtime, entityId, null)` to preserve the current fallback to physics

All visibility filtering remains unchanged.

**Interface / contract**

Current call sites continue to work because the new argument is optional.
`useNodeOverlayNodeModels.ts` becomes the only caller that passes the new array.

### File: `src/ui/runtime/world/node-overlays/resolveNodeOverlayDisplayBounds.ts` (changed)

**Responsibility**

Resolve renderer-published bounds, while allowing callers to short-circuit store reads with already-selected scoped bounds.

**Logic**

Change signature:

#### `resolveNodeOverlayDisplayBounds(runtime, entityId, publishedOverride?)`

Rules:
1. if `publishedOverride` is non-null, return it immediately
2. else read from `readNodeOverlayDisplayBounds(entityId)` exactly as today
3. else fall back to physics-circle bounds exactly as today
4. else return `null`

**Interface / contract**

Existing callers remain valid because the new parameter is optional.

---

## 6. Files explicitly not changed

The following files are intentionally not changed by this design:

- `src/ui/runtime/world/entity-state-link/entityStateLinkRuntime.ts`
- `src/ui/runtime/world/entity-state-link/entityStateLinkRuntime.helpers.ts`
- `src/ui/runtime/shell/RuntimeShellCanvas.tsx`
- `src/engine/phaser/hooks/usePhaserGame.ts`

Reason:
- the immediate ROI fixes are in display-structure sync, progress-bar steady-state work, and node-overlay de-duplication
- the inspected code in these files is not the correct first target for this patch

## 7. Implementation order

The order is mandatory because each step preserves behavior and isolates risk.

### Step 1 — Add display structural split
1. add `DisplayInstanceManager.structural.ts`
2. add static/dynamic split helpers in `resolveDisplaySpec.ts`
3. update `DisplayInstanceManager.ts`
4. update `DisplayInstanceManager.entities.ts`
5. remove duplicate tutorial-attention call from `DisplayInstanceManager.entities.ts`

### Step 2 — Add progress-bar state and geometry caching
1. extend `ProgressBarSlotState`
2. add module-lifetime `geometryCache`
3. implement diffing in `progressBarTick.ts`

### Step 3 — Add overlay shared entity index
1. add map-based parent-throttle helper
2. extend overlay hydration index
3. thread shared index through overlay resolution

### Step 4 — Reuse scoped bounds during projection
1. extend `resolveNodeOverlayDisplayBounds(...)`
2. extend `projectNodeOverlayModels(...)`
3. pass scoped bounds from `useNodeOverlayNodeModels(...)`

## 8. Test design

Tests are listed by exact file and contract.

---

## 8A. Display-manager tests

### File: `src/engine/phaser/display/DisplayInstanceManager.structural.test.ts` (new)

**Responsibility**

Unit-test structural synchronization logic against fake runtimes.

**Cases**

1. **fallback mode**
   - Given a runtime without `getInvalidation`
   - When `syncDisplayStructure(...)` runs twice
   - Then it performs a full rebuild both times
   - And structural output matches the current full-scan behavior

2. **steady state with invalidation**
   - Given a runtime with `getInvalidation`
   - And no revision changes
   - When `DisplayInstanceManager.tick()` runs twice
   - Then `runtime.getEntities()` is not called on the second tick

3. **entity-list rebuild**
   - Given a runtime with invalidation
   - When `entityListRevision` changes
   - Then the structural cache is rebuilt from `runtime.getEntities()`
   - And removed ids are destroyed

4. **mutation-only update**
   - Given a runtime with invalidation
   - When only `mutationRevision` changes for a known id
   - Then that id is re-evaluated
   - And unchanged ids remain in the structural cache

5. **shouldRenderEntity toggle**
   - Given a cached structural record
   - When `shouldRenderEntity` flips false then true
   - Then the instance is destroyed and later recreated
   - And the structural record remains cached across the hidden interval

### File: `src/engine/phaser/display/DisplayInstanceManager.tutorialAttention.test.ts` (changed)

**Responsibility**

Confirm behavior is unchanged after removing the duplicate call site.

**Cases**

Existing cases remain. No new expectations are required beyond continued pass/fail stability.

### File: `src/engine/phaser/display/resolveDisplaySpec.test.ts` (changed)

**Responsibility**

Validate the new structural/dynamic split without changing existing behavior.

**Cases**

1. `resolveDisplayStaticSpec(...)` returns the same resolved display metadata currently embedded in `resolveDisplaySpec(...)`
2. `composeDisplaySpec(...)` produces the same physics/no-physics outputs as the current implementation
3. `resolveDisplaySpec(...)` remains behaviorally unchanged for existing callers

---

## 8B. Progress-bar tests

### File: `src/engine/phaser/display/modules/progressBarTick.test.ts` (new)

**Responsibility**

Unit-test progress-bar memoization behavior with fake ropes and images.

**Cases**

1. **inactive slot does not rehypnotize the pool**
   - Given a slot that is already hidden
   - When `tickProgressBars(...)` runs again with no active bar for that slot
   - Then no additional hide calls occur

2. **identical active bar does not rewrite track rope**
   - Given two identical ticks for the same bar
   - When radius, span ratio, colors, and fill ratio are unchanged
   - Then track-rope point updates do not occur on the second tick

3. **fill-only change updates fill rope only**
   - Given two ticks where only current value changes
   - When radius, span ratio, and colors are unchanged
   - Then fill rope updates on the second tick
   - And track rope does not

4. **geometry change invalidates cache**
   - Given a second tick with a different radius or span ratio
   - Then both geometry-dependent ropes update

5. **bounds translation remains live**
   - Given a moving entity with unchanged local geometry
   - Then merged node-overlay display bounds still reflect the new world position

---

## 8C. Overlay tests

### File: `src/game/systems/energy/parentThrottle.test.ts` (changed)

**Responsibility**

Validate that the new map-based helper preserves current semantics.

**Cases**

1. destroyed ancestor fallback remains `1`
2. live ancestor multiplication remains unchanged
3. `resolveAncestorMasterThrottleFromIndex(...)` matches `resolveAncestorMasterThrottle(...)` for equivalent data

### File: `src/ui/runtime/world/node-overlays/resolveNodeOverlayEntries.test.ts` (changed)

**Responsibility**

Validate that full overlay resolution now performs one entity-list read.

**Cases**

1. Given a runtime spy on `getEntities()`
2. When `resolveNodeOverlayEntries(runtime)` runs
3. Then `getEntities()` is called exactly once
4. And returned overlay ids remain unchanged

### File: `src/ui/runtime/world/node-overlays/resolveNodeOverlayThrottle.test.ts` (new)

**Responsibility**

Validate the shared-index path.

**Cases**

1. supplied `entityById` produces the same throttle value as the runtime fallback path
2. cycle handling remains unchanged
3. missing-parent fallback remains unchanged

### File: `src/ui/runtime/world/node-overlays/resolveNodeOverlayDisplayBounds.test.ts` (changed)

**Responsibility**

Validate the new override parameter.

**Cases**

1. when `publishedOverride` is passed, it is returned without store lookup
2. existing published-store behavior remains unchanged
3. physics fallback remains unchanged
4. null behavior remains unchanged

### File: `src/ui/runtime/world/node-overlays/useNodeOverlayNodeModels.displayBoundsRevision.test.tsx` (changed)

**Responsibility**

Validate that scoped bounds still drive recomputation only for tracked entities.

**Cases**

Existing case remains, plus:
1. projection uses the supplied scoped bounds path
2. unrelated bounds updates still do not trigger recomputation

### File: `src/ui/runtime/world/node-overlays/useResolvedNodeOverlayEntries.incremental.test.tsx` (changed)

**Responsibility**

Ensure incremental overlay hydration remains reference-stable for progress-only mutations after the shared entity index is added.

**Cases**

Existing cases remain unchanged and must continue to pass.

## 9. Acceptance criteria

Implementation is complete only when all of the following are true.

### Functional

1. Display output is unchanged.
2. Overlay content and positions are unchanged.
3. Progress-bar visuals are unchanged.
4. Tutorial attention behavior is unchanged.

### Performance-contract

1. With runtime invalidation available and no relevant revision change, `DisplayInstanceManager.tick()` does not call `runtime.getEntities()`.
2. `resolveNodeOverlayEntries(runtime)` performs exactly one `runtime.getEntities()` call for a full resolution pass.
3. An unchanged active progress bar does not resync its track rope on the next tick.
4. A fill-only progress change does not resync the track rope.

### Quality-contract

1. No new direct ECS mutation is introduced in UI/Phaser display code.
2. No TODOs are introduced.
3. No public caller contract is broken.
4. All existing relevant tests continue to pass.
5. All newly added tests pass.

## 10. Risks and explicit mitigations

### Risk: runtime doubles without invalidation

**Mitigation**
- structural sync explicitly falls back to the current full-scan behavior when `getInvalidation` is absent

### Risk: visibility filters recreating instances incorrectly

**Mitigation**
- `shouldRenderEntity` is treated as a frame-time visibility gate only
- structural records are not removed when visibility is false

### Risk: progress-bar cache serving stale world bounds

**Mitigation**
- only local geometry is cached
- world translation continues to use live `spec.x/spec.y` each tick

### Risk: overlay semantics diverging between array-based and map-based parent throttle

**Mitigation**
- the map-based function reuses the same traversal rules
- parity tests are mandatory

## 11. Non-negotiable constraints during implementation

1. Reuse existing invalidation (`getInvalidation`, revisions, changed ids).
2. Reuse existing stores (`nodeOverlayDisplayBoundsStore`).
3. Reuse existing display-spec parsing and radius resolution logic.
4. Do not add speculative background processing, worker plumbing, or new view-model stores.
5. Do not change authored asset schema, runtime commands, or overlay semantics.
