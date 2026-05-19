# LLD: Node Overlay Labels Anchored to the Perceived Display Edge

## 1. Purpose

Implement node-attached overlay positioning so that the visual gap between an overlay and the node display edge remains constant in screen space across zoom levels, while using the actual rendered display geometry where the codebase already knows it.

This design is grounded in the current codebase. It does **not** introduce speculative abstractions, does **not** change runtime simulation behavior, and does **not** move business logic into `.tsx`.

---

## 2. Why

## 2.1 Current behavior

Node overlay cards and node-attached callouts are currently positioned from physics bodies, not from rendered display geometry.

Current path:

- `src/ui/runtime/world/node-overlays/nodeOverlayPosition.ts`
  - Projects the node center into screen space.
  - Offsets upward by `radius * zoom + 12px`.
- `src/ui/runtime/world/node-overlays/overlayViewportModels.ts`
  - Supplies `radius` from `runtime.getPhysicsBody(entityId).radius`.
- `src/ui/runtime/world/node-overlays/guidanceCalloutLayoutPlacement.ts`
  - Repeats the same top/bottom edge calculation from physics radius.

The renderer does **not** use only physics radius to determine the visible node silhouette:

- `src/engine/phaser/display/resolveDisplaySpec.ts`
  - Resolves display radius separately via `resolveDisplayRadius(...)`.
- `src/engine/phaser/display/modules/AvatarModule.ts`
  - Renders silhouettes from scaled images.
- `src/engine/phaser/display/modules/SwarmAvatarModule.ts`
  - Renders multiple moving silhouettes.
- `src/engine/phaser/display/modules/CaveBackgroundModule.ts`
  - Renders an irregular contour plus fur wedges.

Therefore, the current overlay system can preserve a constant gap relative to the **physics circle**, but not relative to the **perceived display edge**.

## 2.2 Root cause

The UI overlay layer is estimating display geometry from runtime physics data. The renderer owns the true display geometry.

## 2.3 Design requirement derived from the code

The implementation must satisfy all of the following:

1. Preserve the existing constant **pixel** gap behavior.
2. Stop using raw physics radius as the primary source of display edge truth.
3. Keep renderer-specific geometry logic in renderer-owned code.
4. Keep React as a pure observer.
5. Reuse existing hooks, Zustand-based state, and current overlay projection flow where possible.
6. Avoid changing `scratch.overlayAnchor` semantics, because it is already used by `SelectionModule` and `DistressModule` as a centered FX anchor.

---

## 3. Non-goals

This change does **not**:

- modify ECS or runtime state
- modify command/apply phase behavior
- alter node overlay card rendering markup or styling
- alter selection/distress FX behavior
- change display definitions or module stack order
- introduce a generic renderer-to-React scene bridge beyond what this feature needs
- solve horizontal attachment to asymmetric silhouettes; horizontal attachment remains centered on the node

---

## 4. Selected design

## 4.1 Summary

The renderer will publish renderer-authored **display bounds** per entity into a dedicated Zustand store. The UI overlay projection layer will consume those bounds and fall back to physics bounds when renderer bounds are unavailable.

The published contract is:

- `centerX`: world-space horizontal anchor for node-attached overlays
- `topY`: world-space top edge of the perceived body display
- `bottomY`: world-space bottom edge of the perceived body display

The UI will continue to apply the fixed 12px gap in screen space.

## 4.2 Why this design is selected

This design is selected because it is the narrowest change that is correct for the existing renderer architecture.

It is preferred over “use display radius in React” because:

- avatar and cave displays are not reducible to a single circle without losing correctness
- the renderer already has the visual information needed to define the edge
- it avoids duplicating renderer logic in the UI

It is preferred over reusing `scratch.overlayAnchor` because:

- `SelectionModule` and `DistressModule` already attach centered halo graphics to `scratch.overlayAnchor`
- moving that anchor to the top edge would break existing FX placement

It is preferred over generic whole-instance `getBounds()` because:

- overlay FX must be excluded
- cave body geometry and avatar silhouettes can provide more precise body-edge data than a generic instance union

---

## 5. Contract

## 5.1 New renderer-authored bounds contract

Add a new type:

- `NodeOverlayDisplayBounds`

Fields:

- `entityId: string`
- `centerX: number`
- `topY: number`
- `bottomY: number`

Semantics:

- coordinates are in **world space**
- `centerX` is the horizontal anchor used by node-attached overlay UI
- `topY` is the body display’s top edge
- `bottomY` is the body display’s bottom edge
- `topY <= bottomY` is required

## 5.2 Default/fallback contract

When renderer-authored bounds are unavailable, the system must fall back to physics-circle bounds:

- `centerX = body.position.x`
- `topY = body.position.y - body.radius`
- `bottomY = body.position.y + body.radius`

This preserves current behavior as a safe fallback.

## 5.3 Publication contract

Renderer publication must be:

- imperative
- per-entity
- idempotent when values do not change
- cleared when an entity visual is destroyed or becomes stale

## 5.4 UI projection contract

The UI must:

1. resolve world-space display bounds
2. project the relevant world point to screen space
3. apply the fixed overlay gap in pixels

The gap remains:

- `12px` above the projected top edge for top-attached overlays
- `12px` below the projected bottom edge for bottom-attached overlays

---

## 6. File-by-file design

## 6.1 New file: `src/engine/phaser/display/nodeOverlayDisplayBounds.ts`

### Responsibility

Own the renderer-side type and helper functions for building display bounds.

### Logic

Provide pure helpers for the three supported renderer-origin cases:

1. **radius-based bounds**
   - from `spec.x`, `spec.y`, `spec.radius`
2. **image-based bounds**
   - from a single visible image’s world bounds
3. **local-geometry vertical bounds**
   - from local-space `minY`/`maxY` values plus `spec.x`/`spec.y`
4. **multi-image union bounds**
   - from multiple visible image bounds, restricted to the images the module explicitly chooses to represent the body silhouette

### Interface

The file exports:

- the `NodeOverlayDisplayBounds` type
- a pure helper to create bounds from a physics/display radius
- a pure helper to create bounds from a single image bounds rectangle
- a pure helper to create bounds from a union of image bounds rectangles
- a pure helper to create bounds from local vertical extents

### Rules

- helpers return `null` only when there is no usable geometry
- helpers do not mutate external state
- helpers do not know about React or stores

---

## 6.2 New file: `src/engine/phaser/display/nodeOverlayDisplayBoundsStore.ts`

### Responsibility

Hold renderer-authored bounds in a Zustand store so React can observe them without pulling renderer logic into the UI layer.

### Logic

State shape:

- `revision: number`
- `byEntityId: Record<string, NodeOverlayDisplayBounds>`

Actions:

- `upsert(bounds)`
- `remove(entityId)`
- `reset()`

Read helper:

- `read(entityId): NodeOverlayDisplayBounds | null`

Revision rules:

- increment only when the effective stored value changes
- do not increment on no-op writes
- do not increment on removing a missing entry
- do not increment on resetting an already-empty store

### Interface

The file exports:

- the Zustand store hook for React consumers that need `revision`
- imperative helpers for engine code:
  - `publishNodeOverlayDisplayBounds(bounds)`
  - `removeNodeOverlayDisplayBounds(entityId)`
  - `resetNodeOverlayDisplayBounds()`
  - `readNodeOverlayDisplayBounds(entityId)`

### Rules

- the store is presentation-only state
- no runtime/ECS objects are stored in it
- only serializable numeric bounds are stored

---

## 6.3 Change: `src/engine/phaser/display/types.ts`

### Responsibility

Extend `DisplayScratch` with renderer-owned node overlay display bounds.

### Logic

Add:

- `nodeOverlayDisplayBounds: NodeOverlayDisplayBounds | null`

This field is written by display modules and read by the instance manager after a tick.

### Interface

`DisplayScratch` gains one new nullable field.

### Rules

- the field is renderer-owned only
- the field is not read by modules other than for optional overwrite discipline

---

## 6.4 Change: `src/engine/phaser/display/EntityVisualInstanceHelpers.ts`

### Responsibility

Initialize and release the new scratch field correctly.

### Logic

- initialize `nodeOverlayDisplayBounds` to `null` in `acquireAnchors(...)`
- do not perform publication here
- release logic remains unchanged because the field is plain data

### Interface

No API shape change outside the returned `DisplayScratch` value.

---

## 6.5 Change: `src/engine/phaser/display/modules/TransformModule.ts`

### Responsibility

Provide the default bounds each tick before specialized modules optionally override them.

### Logic

Current responsibility remains unchanged:

- position `root`, `backgroundAnchor`, `effectsAnchor`, `overlayAnchor`
- hide them when physics is absent

New responsibility:

- when `spec.hasPhysics === false`, set `scratch.nodeOverlayDisplayBounds = null`
- when `spec.hasPhysics === true`, set `scratch.nodeOverlayDisplayBounds` to radius-based bounds from `spec`

### Interface

No public API change.

### Rules

- this module is the default initializer
- later modules in the stack may overwrite the bounds
- this prevents stale bounds when a specialized module cannot render valid body geometry on a later tick

---

## 6.6 Change: `src/engine/phaser/display/modules/AvatarModule.ts`

### Responsibility

Override default bounds with silhouette-image-derived bounds for single-avatar displays.

### Logic

After successful avatar render:

- read the world bounds of `silhouetteImage`
- compute bounds using that image only
- set `scratch.nodeOverlayDisplayBounds` to those bounds

Failure behavior:

- when the module hides images due to invalid state, do not compute custom bounds
- the TransformModule default remains in force for that tick

### Interface

No public API change.

### Rules

- use `silhouetteImage`, not `glowImage`
- `eyesImage` must not affect overlay bounds
- `centerX` remains the value produced by the bounds helper; no manual horizontal offsetting logic is introduced

---

## 6.7 Change: `src/engine/phaser/display/modules/SwarmAvatarModule.ts`

### Responsibility

Override default bounds with the union of swarm member silhouette bounds.

### Logic

After successful swarm render:

- collect `silhouetteImage` from each active slot
- compute a union bounds rectangle from those images only
- set `scratch.nodeOverlayDisplayBounds` from that union

Failure behavior:

- when the module hides the swarm visuals or resets due to invalid data, do not publish custom bounds
- the TransformModule default remains in force for that tick

### Interface

No public API change.

### Rules

- use silhouette images only
- exclude glow images and eyes
- if there are zero visible silhouette images, do not override the default bounds

---

## 6.8 Change: `src/engine/phaser/display/modules/CaveBackgroundModule.ts`

### Responsibility

Override default bounds with cave-body-derived vertical extents.

### Logic

This module already computes the exact local-space body contour and fur wedges.

After successful contour/wedge computation:

- compute `minY` across all contour points and all wedge points
- compute `maxY` across all contour points and all wedge points
- convert those local extents into world-space bounds using `spec.x` and `spec.y`
- keep horizontal anchor centered on the node
- set `scratch.nodeOverlayDisplayBounds`

Failure behavior:

- if physics is absent or `render.fur` is missing, do not override the default bounds from TransformModule

### Interface

No public API change.

### Rules

- eyes and overlay FX are excluded
- cave hairs are included because they are part of the perceived body silhouette in the current renderer
- horizontal anchor remains centered; only vertical edge precision changes

---

## 6.9 Change: `src/engine/phaser/display/EntityVisualInstance.ts`

### Responsibility

Expose the current display bounds of an instance to the manager.

### Logic

Add a read-only instance method:

- `readNodeOverlayDisplayBounds(): NodeOverlayDisplayBounds | null`

This returns the current `scratch.nodeOverlayDisplayBounds`.

### Interface

One new public read method.

### Rules

- the method does not allocate or clone unless required by existing style conventions
- the method does not mutate scratch

---

## 6.10 Change: `src/engine/phaser/display/DisplayInstanceManager.ts`

### Responsibility

Publish renderer-authored bounds into the store and remove stale entries.

### Logic

During `tick(...)`:

- after `tickInstanceSafe(...)`, read the instance bounds via `readNodeOverlayDisplayBounds()`
- if bounds exist, publish them to the store for `spec.entityId`
- if bounds are `null`, remove the entity from the store

When an entity is skipped, loses its spec, or becomes stale:

- remove its bounds from the store before or during instance destruction cleanup

During `destroyAll()`:

- remove all entity bounds owned by the manager
- if the manager is fully clearing its instance set, reset the store after instance teardown

### Interface

No public API shape change.

### Rules

- publication happens in the display manager, not inside modules
- modules author bounds; the manager owns store publication lifecycle
- stale entities must not leave stale overlay bounds behind

---

## 6.11 New file: `src/ui/runtime/world/node-overlays/resolveNodeOverlayDisplayBounds.ts`

### Responsibility

Provide the UI-side resolver that prefers renderer-authored bounds and falls back to physics bounds.

### Logic

Resolution order:

1. read bounds from `nodeOverlayDisplayBoundsStore`
2. if absent, read `runtime.getPhysicsBody(entityId)` and synthesize fallback bounds
3. if neither exists, return `null`

### Interface

Export one pure resolver:

- input: `runtime`, `entityId`
- output: `NodeOverlayDisplayBounds | null`

### Rules

- no camera logic here
- no DOM logic here
- no React logic here

---

## 6.12 Change: `src/ui/runtime/world/node-overlays/nodeOverlayPosition.ts`

### Responsibility

Project world points to screen and apply the fixed overlay gap.

### Logic

Replace the radius-based contract with an edge-based contract.

Required exported helpers:

1. world-point projection helper
   - projects any world point to screen space
2. top-edge overlay position helper
   - projects `(centerX, topY)`
   - subtracts `CARD_GAP_PX`
3. bottom-edge overlay position helper
   - projects `(centerX, bottomY)`
   - adds `CARD_GAP_PX`

### Interface

The file exports projection helpers used by:

- node overlay cards
- node guidance layout
- runtime callout layout
- cave status placement

### Rules

- `CARD_GAP_PX` remains `12`
- gap is always applied in screen space, never world space
- `null` is returned when camera or viewport prerequisites are missing

---

## 6.13 Change: `src/ui/runtime/world/node-overlays/overlayViewportModels.ts`

### Responsibility

Project node-attached overlay models from resolved display bounds instead of raw physics radius.

### Logic

For `projectNodeOverlayModels(...)`:

- resolve display bounds per entity via `resolveNodeOverlayDisplayBounds(...)`
- use top-edge projection helper to position node cards

For `resolveCaveStatusPosition(...)`:

- resolve display bounds for `sys_world`
- use top-edge projection helper

### Interface

No public API shape change.

### Rules

- when renderer bounds are unavailable, behavior matches current physics fallback
- no React logic is added here

---

## 6.14 Change: `src/ui/runtime/world/node-overlays/guidanceCalloutLayoutPlacement.ts`

### Responsibility

Use resolved display bounds for node-attached guidance and runtime callout anchor points.

### Logic

Replace direct physics-radius edge math in `toNodePoint(...)` with display-bounds resolution.

Slot mapping remains unchanged:

- top/top-left/top-right/left/right use the projected top edge as the base vertical anchor
- bottom/bottom-left/bottom-right use the projected bottom edge as the base vertical anchor
- horizontal slot pixel offsets remain exactly as they are now

### Interface

No public API shape change.

### Rules

- slot ordering and collision logic are unchanged
- only the source of the base node edge changes

---

## 6.15 Change: `src/ui/runtime/world/node-overlays/useNodeOverlayViewportInputs.ts`

### Responsibility

Carry the renderer-bounds revision into overlay auxiliary-data computation.

### Logic

Add:

- `displayBoundsRevision: number`

Source:

- select `revision` from `nodeOverlayDisplayBoundsStore`

### Interface

`NodeOverlayViewportInputs` gains one numeric field.

### Rules

- this is a presentation revision only
- it does not interact with runtime invalidation scopes

---

## 6.16 Change: `src/ui/runtime/world/node-overlays/useNodeOverlayNodeModels.ts`

### Responsibility

Recompute projected node models when renderer-authored display bounds change.

### Logic

Add the store revision to the memo/cache invalidation key.

Cache key becomes dependent on:

- runtime reference
- node entries reference
- viewport width
- viewport height
- camera revision
- display bounds revision

Equality/reuse behavior remains unchanged.

### Interface

No public API shape change.

### Rules

- if a recomputation yields equal models, reuse the previous array exactly as current code does

---

## 6.17 Change: `src/ui/runtime/world/node-overlays/useNodeOverlayAuxiliaryData.ts`

### Responsibility

Recompute guidance/callout/cave overlay auxiliary data when renderer-authored display bounds change.

### Logic

Include `inputs.displayBoundsRevision` in the structural dependency list passed to `useImperativeRuntimeDerivedValue(...)`.

### Interface

No public API shape change.

### Rules

- no change to hydration plans or runtime invalidation scopes
- only the structural dependency set changes

---

## 7. End-to-end flow

1. `TransformModule` sets default display bounds from `spec`.
2. Specialized body modules optionally overwrite those bounds with more accurate renderer-derived bounds.
3. `EntityVisualInstance` exposes the bounds.
4. `DisplayInstanceManager` publishes/removes bounds in `nodeOverlayDisplayBoundsStore`.
5. UI overlay hooks observe the store `revision`.
6. `resolveNodeOverlayDisplayBounds(...)` resolves renderer bounds first, physics fallback second.
7. Projection helpers convert world-space edges to screen-space positions.
8. Overlay cards and node callouts render with a constant screen-space gap from the perceived display edge.

---

## 8. Pseudocode

## 8.1 Renderer publication

```text
for each visible entity instance during DisplayInstanceManager.tick:
    tick instance modules
    bounds = instance.readNodeOverlayDisplayBounds()
    if bounds exists:
        store.upsert(bounds)
    else:
        store.remove(entityId)

when instance is destroyed or removed as stale:
    store.remove(entityId)
```

## 8.2 UI bounds resolution

```text
resolveNodeOverlayDisplayBounds(runtime, entityId):
    stored = store.read(entityId)
    if stored exists:
        return stored

    body = runtime.getPhysicsBody(entityId)
    if body missing:
        return null

    return bounds(centerX = body.position.x,
                  topY = body.position.y - body.radius,
                  bottomY = body.position.y + body.radius)
```

## 8.3 Top-attached overlay projection

```text
resolveTopOverlayScreenPosition(bounds, camera, viewport):
    point = projectWorldPoint(bounds.centerX, bounds.topY, camera, viewport)
    if point is null:
        return null
    return (x = point.x, y = point.y - 12)
```

## 8.4 Bottom-attached overlay projection

```text
resolveBottomOverlayScreenPosition(bounds, camera, viewport):
    point = projectWorldPoint(bounds.centerX, bounds.bottomY, camera, viewport)
    if point is null:
        return null
    return (x = point.x, y = point.y + 12)
```

---

## 9. Test plan

All tests below are required. They follow the project testing standard: behavior-focused, Given/When/Then structure, isolated factories where applicable.

## 9.1 New unit test: `src/engine/phaser/display/nodeOverlayDisplayBounds.test.ts`

### Cases

1. radius helper returns centered top/bottom bounds from `spec`
2. image helper derives bounds from a single image rectangle
3. union helper returns the min top and max bottom across multiple images
4. local-extents helper converts local `minY`/`maxY` into world-space bounds
5. helpers return `null` for unusable inputs

## 9.2 New unit test: `src/engine/phaser/display/nodeOverlayDisplayBoundsStore.test.ts`

### Cases

1. `upsert(...)` stores a new entry and increments revision once
2. `upsert(...)` with equal values does not increment revision
3. `upsert(...)` with changed values replaces the entry and increments revision
4. `remove(...)` removes an existing entry and increments revision
5. `remove(...)` on a missing entry is a no-op
6. `reset()` clears all entries and increments revision once
7. `reset()` on an empty store is a no-op

## 9.3 Change test: `src/engine/phaser/display/modules/CaveBackgroundModule.test.ts`

### Add cases

1. after a successful tick, `scratch.nodeOverlayDisplayBounds` is populated
2. `topY` is above `spec.y` and `bottomY` is below `spec.y`
3. when physics is absent, `scratch.nodeOverlayDisplayBounds` is left to the TransformModule default/null contract and the module does not create an invalid custom bounds object

## 9.4 Change test: `src/engine/phaser/display/modules/SwarmAvatarModule.test.ts`

### Add cases

1. after a successful tick, `scratch.nodeOverlayDisplayBounds` is populated from silhouette images only
2. glow/eyes do not affect the published vertical bounds
3. when no visible silhouettes exist, the module does not override the default bounds

## 9.5 New unit test: `src/engine/phaser/display/modules/AvatarModule.test.ts`

### Cases

1. after a successful tick, bounds are derived from `silhouetteImage`
2. `glowImage` does not affect the computed top/bottom edge
3. when subject seed or role resolution fails, the module leaves the default bounds in force

## 9.6 New unit test: `src/engine/phaser/display/DisplayInstanceManager.nodeOverlayDisplayBounds.test.ts`

### Cases

1. manager publishes bounds after ticking an instance
2. manager removes bounds when an entity stops rendering
3. manager removes bounds for stale instances
4. `destroyAll()` clears the store

## 9.7 New unit test: `src/ui/runtime/world/node-overlays/resolveNodeOverlayDisplayBounds.test.ts`

### Cases

1. resolver returns store bounds when present
2. resolver falls back to physics bounds when store data is absent
3. resolver returns `null` when neither source exists

## 9.8 Change test: `src/ui/runtime/world/node-overlays/nodeOverlayPosition.test.ts`

### Update cases

1. top-edge helper projects a world top edge and subtracts 12px
2. bottom-edge helper projects a world bottom edge and adds 12px
3. projection returns `null` when camera or viewport prerequisites are missing

## 9.9 Change test: `src/ui/runtime/world/node-overlays/useNodeOverlayNodeModels.test.tsx`

### Add case

1. changing only `displayBoundsRevision` recomputes projection and preserves referential equality when the resulting models are equal

## 9.10 Change test: `src/ui/runtime/world/node-overlays/useNodeOverlayViewportData.layers.test.tsx`

### Add case

1. changing only `displayBoundsRevision` recomputes auxiliary node-attached positions without churning unrelated arrays when outputs are equal

## 9.11 Change test: `src/ui/runtime/world/node-overlays/NodeOverlayViewport.guidanceAnchor.test.tsx`

### Add case

1. a published bottom edge causes bottom guidance to anchor from the renderer-derived bottom edge, not from the physics radius fallback

---

## 10. Acceptance criteria

The implementation is complete only when all of the following are true:

1. Node overlay cards use renderer-authored top-edge bounds when available.
2. Node-attached guidance and runtime callouts use renderer-authored top/bottom bounds when available.
3. The gap from the display edge remains a fixed 12px in screen space across zoom levels.
4. Avatar and cave displays no longer rely on raw physics radius for node overlay vertical edge placement when renderer-authored bounds are available.
5. Generic/background nodes preserve current behavior through the TransformModule default bounds.
6. Missing renderer bounds fall back to current physics behavior without breaking overlays.
7. No runtime/ECS/data-schema behavior changes occur.
8. No business logic is moved into `.tsx`.
9. All specified tests are green.

---

## 11. Out-of-scope files

The following files do not need to change for this implementation:

- `src/ui/runtime/world/node-overlays/NodeOverlayViewport.tsx`
- `src/ui/runtime/world/node-overlays/NodeOverlayViewportView.tsx`
- `src/ui/runtime/world/node-overlays/NodeOverlayCard.tsx`
- `src/ui/runtime/world/node-overlays/GuidanceCalloutCard.tsx`
- runtime simulation code under `src/engine/runtime/**`
- cartridge/data schema files under `src/data/**`

---

## 12. Final implementation note

This design intentionally makes the renderer the owner of perceived display geometry and the UI the consumer of published presentation state. That is the narrowest implementation that is correct for the current codebase.
