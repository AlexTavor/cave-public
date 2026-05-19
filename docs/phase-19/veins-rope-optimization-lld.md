# Low-Level Design: Veins Rope Optimization

## 1. Scope

This document defines the implementation for converting vein body rendering from per-edge `Graphics` ribbons to pooled `Rope` objects.

This design is constrained by the uploaded project contract documents:
- follow existing architectural laws and avoid speculative refactors;
- change only the files required for the vein rendering rewrite;
- keep tests behavioral, readable, colocated, and deterministic.

## 2. Goal

Remove all live `Graphics` usage from vein body rendering.

After this change:
- each vein edge body is rendered by pooled `Rope` objects only;
- no per-edge `Graphics` objects are acquired, updated, or masked by `VeinsModule`;
- the existing cached path compilation and pulse spawning logic remain in place unless explicitly changed in this document;
- tapering is intentionally not preserved.

## 3. Non-Goals

The following are explicitly out of scope:
- changing vein graph construction;
- changing `VeinsSystem` runtime data production;
- changing edge IDs, edge ordering, edge colors, pulse colors, or pulse spawn math;
- changing display layers;
- changing transfer rendering;
- general display-pool refactors;
- introducing any new rendering abstraction beyond the minimum helpers defined here.

## 4. Current State (Observed in Code)

### 4.1 Vein body rendering path

The current vein body path is:
1. `VeinsModule` creates per-edge visual state via `createEdgeState`.
2. `createEdgeState` acquires three `Graphics` objects: `glowLine`, `baseLine`, and `maskGraphics`.
3. `tickEdge` resolves full and visible polyline points.
4. `tickEdge` redraws all three `Graphics` objects through `drawVeinRibbon`.
5. `drawVeinRibbon` delegates to `drawTaperedRibbon`.
6. `drawTaperedRibbon` clears the `Graphics`, rebuilds a polygon from the polyline, and fills it.

### 4.2 Existing reusable pieces that must be kept

The following existing pieces already solve the correct problems and must remain the basis of the implementation:
- `DisplayTypePool.ropePool` already exists and is not currently used by veins.
- `compileVeinGuidePath` and `resolveVeinRopePoints` already compile and resolve the vein centerline.
- `buildPolylineMetrics`, `slicePolylineToDistance`, and `advanceRevealedLenPx` already provide the reveal math.
- `advanceWavePhase` already handles nervous-vein phase motion.
- pulse rendering already uses pooled images and per-vein pulse textures.
- `TextureManager` already owns runtime-generated textures via hidden scratch graphics.

## 5. Why This Change Is Correct

### 5.1 Why the current path is expensive

The current cost is dominated by repeated `Graphics` work, not path discovery:
- each visible redraw clears and refills three separate `Graphics` objects per edge;
- redraw includes polygon reconstruction from the polyline on every relevant update;
- nervous veins can force repeated full-path resolution, which then forces repeated ribbon redraw.

### 5.2 Why ropes fit this codebase

The codebase already has the missing pieces required for a rope-based implementation:
- a rope object pool already exists;
- the centerline path cache already exists;
- visible-path slicing already exists;
- texture generation infrastructure already exists.

The correct optimization is therefore:
- keep the existing vein centerline math;
- stop converting that line into filled `Graphics` polygons;
- feed the visible polyline directly into pooled ropes.

## 6. Design Summary

Each vein edge will own:
- one pooled rope for the glow body;
- one pooled rope for the base body;
- the existing pulse container and pooled pulse images.

Each rope will use the same runtime-generated white strip texture.

The rope body will be styled by runtime tint and alpha.

Tapering is removed intentionally. The rope renderer uses constant width along the full visible path.

The reveal front is represented by shortening the rope point list to `visiblePoints`. No body mask is used.

The pulse mask is also removed. Pulse reveal is enforced by deterministic visibility culling, defined exactly in this document.

## 7. Required Behavioral Contract

### 7.1 Rendering contract

For every active vein edge:
- the base rope must be visible when `visiblePoints.length >= 2`;
- the glow rope must be visible when `visiblePoints.length >= 2`;
- both ropes must be hidden when `visiblePoints.length < 2`;
- both ropes must use the same polyline as their point source;
- both ropes must use the same shared white vein texture key;
- the base rope tint must equal `edge.baseColor`;
- the glow rope tint must equal `edge.baseColor`;
- the base rope alpha must equal `1`;
- the glow rope alpha must equal `edge.glowAlpha`.

### 7.2 Width contract

Tapering is removed.

The rope widths are defined exactly as follows:
- base rope displayed width = `edge.widthPx`;
- glow rope displayed width = `edge.glowWidthEndPx`.

The fields `startWidthPx`, `endWidthPx`, and `glowWidthStartPx` remain in `VeinsDisplayEdge` for compatibility with upstream builders and existing data producers, but the renderer must ignore them.

### 7.3 Reveal contract

The visible vein body is the sliced visible polyline only.

Exact rule:
- `fullPoints` remain the full resolved vein path;
- `visiblePoints` remain the prefix of `fullPoints` ending at `revealedLenPx`;
- ropes render `visiblePoints`, never `fullPoints`;
- no graphics-based reveal mask exists after this change.

### 7.4 Pulse contract

Pulse spawning, motion, spacing, tint variance, and size variance remain unchanged.

Only reveal clipping changes.

Exact pulse visibility rule:
- each spawned pulse stores a scalar `revealInsetPx`;
- `revealInsetPx` equals half of the rendered pulse diameter in pixels;
- a pulse is visible only when `pulse.distancePx <= state.revealedLenPx - pulse.revealInsetPx`;
- a pulse is released when `pulse.distancePx > state.revealedLenPx`, exactly as today.

This replaces the current `GeometryMask` behavior with deterministic full-sprite culling.

## 8. File-Level Design

---

## 8.1 Add: `src/engine/phaser/utils/VeinTextureGen.ts`

### Responsibility
Generate the single shared white strip texture used by all vein ropes.

### Logic
This file owns the runtime texture recipe.

The texture is generated once per scene using the existing hidden scratch `Graphics` owned by `TextureManager`.

The generated texture must be:
- horizontally oriented;
- white;
- symmetric around its vertical centerline;
- suitable for tinting;
- suitable for being stretched along rope length.

Exact texture constants:
- texture key: `vein-strip:white:default`;
- texture length in pixels: `128`;
- texture height in pixels: `16`;
- base rope width reference in pixels: `16`.

Exact visual recipe:
- clear the scratch surface;
- draw one full-length outer strip at low alpha;
- draw one centered mid strip at medium alpha;
- draw one centered inner strip at full alpha;
- generate the texture and set linear filtering.

This is the only permitted live `Graphics` usage in the new design, because it is one-time texture baking through the existing texture manager infrastructure, not per-edge rendering.

### Interface
Exports:
- a function that returns the deterministic texture key after ensuring the texture exists in the scene;
- a constant for the base texture height used for width scaling.

### Error handling
If the texture already exists in the scene texture manager, the function must return the existing key without regenerating it.

---

## 8.2 Change: `src/engine/phaser/utils/TextureManager.ts`

### Responsibility
Expose the vein strip texture through the existing texture manager API.

### Logic
Add one dedicated accessor for the vein strip texture.

The accessor must delegate generation to `VeinTextureGen.ts` and return the single cached texture key.

This avoids ad hoc texture generation from display modules and keeps all generated texture ownership inside `TextureManager`.

### Interface
Add one public method:
- `getVeinStripTexture(): string`

No other `TextureManager` behavior changes.

### Error handling
None beyond the delegated texture-exists check.

---

## 8.3 Add: `src/engine/phaser/display/modules/veinsRopeRenderer.ts`

### Responsibility
Own all rope-specific rendering operations for vein bodies.

### Logic
This file converts the already-resolved visible polyline and style inputs into rope display state.

It must not perform any path generation, reveal math, pulse math, or geometry sampling.

It must do only the following:
- accept a rope object and a full style payload;
- hide the rope when the input point list is shorter than two points;
- otherwise fully configure the rope for the current frame;
- replace the rope point set from the provided polyline;
- apply tint;
- apply alpha;
- apply width scaling from the shared base texture height;
- force the rope to refresh using the rope invalidation mechanism supported by the Phaser version in this repository.

The helper must configure the rope from scratch on every call. It must not depend on hidden persistent rope state.

### Interface
Exports two functions:
- one function that synchronizes one rope from a point list and style payload;
- one function that hides one rope and resets only the rope state that must not remain visible.

The style payload contains exactly:
- `textureKey`;
- `points`;
- `tint`;
- `alpha`;
- `displayWidthPx`.

### Error handling
If the input point list has fewer than two points, the sync function must not partially update the rope. It must hide the rope and return.

---

## 8.4 Change: `src/engine/phaser/display/modules/veinsModuleTypes.ts`

### Responsibility
Define the vein visual runtime state and cache metadata.

### Logic
Replace graphics-based fields with rope-based fields.

Required changes:
- remove `glowLine`;
- remove `baseLine`;
- remove `maskGraphics`;
- remove `pulseMask`;
- add `glowRope`;
- add `baseRope`.

Required pulse change:
- add `revealInsetPx` to `PulseInstance`.

Required cache change:
- rename `ribbonStyleSignature` to `ropeStyleSignature`.

Required helper change:
- replace `hideEdgeGraphics` with `hideEdgeRopes`.

The stable geometry signature remains unchanged.

The style signature must change to represent rope styling rather than graphics ribbon styling.

Exact rope style signature fields:
- `edge.widthPx`;
- `edge.glowWidthEndPx`;
- `edge.baseColor`;
- `edge.glowAlpha`.

The signature must not include taper-only fields.

### Interface
Keep all existing exported types and helpers that remain relevant.

New or changed exported behavior:
- `VeinEdgeVisualState` exposes rope fields instead of graphics fields;
- `PulseInstance` exposes `revealInsetPx`;
- `hideEdgeRopes(state)` hides both ropes.

### Error handling
None.

---

## 8.5 Change: `src/engine/phaser/display/modules/veinsEdgeState.ts`

### Responsibility
Create and dispose per-edge visual state.

### Logic
This file must acquire and release rope objects instead of graphics objects.

Creation behavior:
- acquire one root container from `rootPool`;
- acquire one glow rope from `ropePool`;
- acquire one base rope from `ropePool`;
- acquire one pulse container from `rootPool`;
- add the glow rope, base rope, and pulse container to the edge container in that order;
- add the edge container to the veins parent container;
- initialize all children visible state deterministically.

Disposal behavior:
- reset the path cache;
- release all pulses exactly as today;
- remove the glow rope, base rope, and pulse container from the edge container;
- release both ropes back to `ropePool`;
- release both containers back to `rootPool`.

Creation must receive the shared vein texture key so that ropes can be initialized against the correct texture before first tick.

No mask creation is permitted.

### Interface
Change `createEdgeState` inputs to include the shared vein texture key.

`disposeEdgeState` keeps the same conceptual interface: dispose one state into the parent container and pool.

### Error handling
None.

---

## 8.6 Change: `src/engine/phaser/display/modules/VeinsModule.ts`

### Responsibility
Own module-level setup and per-edge tick routing.

### Logic
This file keeps its current responsibilities and changes only what is required for rope rendering.

Required changes:
- request the shared vein strip texture key once during module creation via `textureManager.getVeinStripTexture()`;
- pass that texture key into `createEdgeState` for newly created edges;
- keep the current per-edge pulse texture resolution by vein type;
- keep the current state map lifecycle behavior;
- keep the current runtime-attention alpha behavior.

`VeinsModule` must not generate per-edge body textures.

`VeinsModule` must not interact with `graphicsPool`.

### Interface
`tickEdge` call contract changes only if required by the final helper wiring. The module must still pass the per-edge pulse texture key exactly as today.

### Error handling
Unchanged.

---

## 8.7 Change: `src/engine/phaser/display/modules/veinsEdgeTick.ts`

### Responsibility
Coordinate cached path resolution, reveal progression, rope refresh, and pulse updates for one vein edge.

### Logic
Keep the existing path and reveal algorithm.

Replace only the rendering branch.

Detailed algorithm:
1. Keep `stableGeometrySignature` handling exactly as today.
2. Keep `compileVeinGuidePath` reuse exactly as today.
3. Keep nervous-phase full-path invalidation exactly as today.
4. Keep `revealedLenPx` growth exactly as today.
5. Keep visible polyline slicing exactly as today.
6. Replace the graphics redraw block with rope synchronization.

Exact rope synchronization rule:
- when `visibleChanged` or `ropeStyleSignature` changed, synchronize the glow rope and the base rope;
- glow rope style uses the shared strip texture, `edge.baseColor`, `edge.glowAlpha`, and `edge.glowWidthEndPx`;
- base rope style uses the shared strip texture, `edge.baseColor`, `1`, and `edge.widthPx`;
- when no compiled guide path exists, hide both ropes, release pulses, reset `revealedLenPx`, and clear cached point arrays exactly as the current degenerate-path branch does.

This file must not import any graphics drawing helpers after the change.

### Interface
Change the function inputs only as needed to supply the shared vein texture key. The pulse texture key input remains separate.

### Error handling
Degenerate-path handling remains explicit and mandatory.

---

## 8.8 Change: `src/engine/phaser/display/modules/veinsPulseLifecycle.ts`

### Responsibility
Spawn and release vein pulses.

### Logic
Pulse creation remains pooled-image based.

Required change:
- compute and store `revealInsetPx` on each pulse at spawn time.

Exact computation:
- rendered pulse diameter = `image.width * applied scale`;
- `revealInsetPx = rendered pulse diameter / 2`.

All other pulse fields remain unchanged.

### Interface
`spawnPulse` still mutates the passed state and adds one pulse instance.

`PulseInstance` now includes `revealInsetPx`.

### Error handling
None.

---

## 8.9 Change: `src/engine/phaser/display/modules/veinsEdgeState.ts` (pulse tick section)

### Responsibility
Advance pulse positions and apply reveal visibility.

### Logic
Keep position sampling and spawn logic.

Add exact pulse visibility rule:
- after setting the pulse position, set the pulse image visible only if `pulse.distancePx <= state.revealedLenPx - pulse.revealInsetPx`;
- otherwise set the pulse image invisible but do not release it until the existing release condition is met.

No masking is permitted.

### Interface
No new exported function. This is a behavioral change inside `tickEdgePulses`.

### Error handling
None.

---

## 8.10 Delete: `src/engine/phaser/display/modules/veinsEdgeDrawing.ts`

### Responsibility after change
None. This file becomes obsolete because there is no graphics ribbon drawing path.

### Action
Delete the file and remove its imports.

---

## 8.11 Delete: `src/engine/phaser/display/modules/veinsTaperedStroke.ts`

### Responsibility after change
None. Tapered graphics polygon generation is no longer used.

### Action
Delete the file and remove its imports.

---

## 8.12 Change: `src/engine/phaser/display/modules/veinsDisplayTestUtils.ts`

### Responsibility
Provide deterministic factories for vein display tests.

### Logic
Replace graphics-based mocks with rope-based mocks.

Required changes:
- add a rope factory exposing only the methods required by the new rope helper and state logic;
- remove the graphics factory from vein tests if no remaining vein test uses it;
- update `makeState` to expose `glowRope` and `baseRope`;
- update the helper that counts redraws so that it counts rope synchronizations instead of graphics clears.

### Interface
Test factory names may change if needed, but the resulting tests must remain concise and Given/When/Then readable.

### Error handling
None.

## 9. Unchanged Files That Must Be Reused

The following files must remain functionally unchanged and must be reused as-is unless implementation reveals a narrow, unavoidable defect directly caused by this rewrite:
- `src/engine/phaser/display/modules/veinsRopePath.ts`
- `src/engine/phaser/display/modules/veinsVisualMath.ts`
- `src/engine/phaser/display/modules/veinsEdgePhase.ts`
- `src/engine/phaser/display/modules/attributePowerVisuals.ts`
- `src/engine/phaser/display/pooling/DisplayTypePool.ts`
- `src/engine/phaser/display/pooling/DisplayPoolObjectLifecycle.ts`
- `src/engine/phaser/veins/veinsDisplayBuilder.ts`
- `src/engine/phaser/display/VeinsDisplayData.ts`

Rationale:
- path compilation already exists;
- reveal math already exists;
- the rope pool already exists;
- upstream vein display data already carries every field required for this implementation.

## 10. Explicit Decisions

### 10.1 Taper handling
Taper is removed intentionally.

The renderer does not approximate taper.

The upstream data still provides taper fields, but the rope body ignores them.

### 10.2 Glow handling
Glow remains present.

Glow is implemented as a second rope using the same shared strip texture with wider width and lower alpha.

### 10.3 Texture count
There is exactly one vein body texture per scene.

Pulse textures remain per-shape as they already are today.

### 10.4 Graphics usage policy
After this change, there must be no live vein-body `Graphics` objects and no live vein-body `GeometryMask` objects.

One-time scratch graphics usage inside `TextureManager` for texture baking is allowed and required.

## 11. Testing Design

The tests must obey the uploaded testing standard:
- behavioral assertions only;
- Given/When/Then readability;
- deterministic factories;
- no unnecessary internal mocks.

### 11.1 Change: `src/engine/phaser/display/modules/VeinsModule.test.ts`

Add or update the following behavioral checks:
- module requests the shared vein strip texture exactly once during creation;
- module still resolves pulse textures by vein type exactly as today;
- newly created edges receive the shared vein strip texture when creating state;
- existing runtime-attention alpha behavior remains unchanged.

### 11.2 Change: `src/engine/phaser/display/modules/veinsEdgeTick.test.ts`

Replace graphics redraw assertions with rope sync assertions.

Required scenarios:
1. static, fully revealed, unchanged tick does not resynchronize ropes;
2. style-only change resynchronizes ropes without rebuilding full path geometry;
3. reveal growth resynchronizes ropes;
4. nervous phase change re-resolves full points while reusing the compiled guide path;
5. degenerate path hides both ropes, clears pulses, and resets reveal length;
6. pulse movement and spawn spacing remain correct when geometry is reused.

### 11.3 Change: `src/engine/phaser/display/modules/veinsEdgeAnimation.test.ts`

Keep the current nervous-vein behavioral intent.

The test must continue proving that nervous veins animate through phase/rope motion and not through pulse spawning.

### 11.4 Change: `src/engine/phaser/display/modules/veinsEdgeState.test.ts`

Keep the current pulse-release ordering assertion.

Add rope disposal assertions:
- both ropes are removed from the container before release;
- both ropes are returned to `ropePool`;
- no mask destruction is expected because no mask exists.

### 11.5 Add: `src/engine/phaser/display/modules/veinsRopeRenderer.test.ts`

Required scenarios:
1. fewer than two points hides the rope;
2. valid points configure texture, tint, alpha, width scaling, and visibility;
3. repeated sync fully overwrites prior rope state rather than depending on stale state.

### 11.6 Add: `src/engine/phaser/utils/VeinTextureGen.test.ts`

Required scenarios:
1. generation is deterministic for the fixed key;
2. existing scene texture is reused rather than regenerated;
3. exported base width constant matches the scaling contract expected by the rope renderer.

## 12. Acceptance Criteria

The implementation is complete only when all of the following are true:
- `VeinsModule` no longer acquires or updates vein-body `Graphics` objects;
- no vein path uses `GeometryMask`;
- `ropePool` is used for both glow and base vein bodies;
- `compileVeinGuidePath` and `resolveVeinRopePoints` are still the source of vein centerline geometry;
- reveal still advances through `revealedLenPx` and sliced visible points;
- pulses still spawn, move, tint, and space correctly;
- taper is removed intentionally and consistently;
- obsolete graphics drawing files are deleted;
- all affected tests are updated and new tests are added as defined above;
- all tests pass.

## 13. Implementation Order

1. Add the shared vein texture generator and `TextureManager` accessor.
2. Add the rope renderer helper.
3. Replace vein visual state fields from graphics to ropes.
4. Rework `createEdgeState` and `disposeEdgeState` to use `ropePool` and remove masking.
5. Replace the render branch in `tickEdge`.
6. Add pulse reveal culling via `revealInsetPx`.
7. Delete obsolete graphics drawing files.
8. Update and add tests.

## 14. Blockers and Unknowns

No design blocker is currently present in the checked source.

The only implementation-sensitive detail is the exact Phaser rope refresh call after point replacement. This must be handled inside `veinsRopeRenderer.ts` using the rope invalidation mechanism supported by the Phaser version already used by this repository. No other file may depend on that engine-specific detail.
