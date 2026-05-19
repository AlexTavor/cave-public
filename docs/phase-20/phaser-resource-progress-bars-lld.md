# LLD: Phaser Resource Progress Bars Around Nodes

## 1. Purpose

Design and implement curved, rounded, generated-texture resource progress bars in Phaser for nodes and the cave, while removing the existing resource node-overlay path and updating orbit spacing to respect the bar footprint.

This design is grounded in the current codebase, not on assumptions. The existing relevant seams are:

- authored and compiled bar semantics already live in `components.display.bars`
- Phaser currently reads `display.bars` only for background-fill selection, not for visible around-node bars
- React node overlays currently provide the only in-world storage/resource presentation
- orbit radius logic is currently blind to any display-bar footprint
- the cave already has a `display.bars` entry in default data, so default-data authoring is already the correct place for cave bar ownership

## 2. Why

### 2.1 Problem being solved

The current implementation splits resource presentation across two unrelated systems:

- semantic bar definitions are authored/compiled into `components.display.bars`
- visible in-world resource feedback is provided by React node overlays (`kind: "storage"`)

That split is incorrect for this feature for four reasons:

1. It duplicates presentation concerns across Phaser and React.
2. It prevents the bars from being visually integrated with the node itself.
3. It leaves orbit spacing unaware of the visual footprint of resource presentation.
4. It violates the intended single-source-of-truth path already present in the codebase (`display.bars`).

### 2.2 Why this design is the correct fit for the current codebase

This codebase already has the exact primitives needed to implement the feature without inventing a parallel system:

- `components.display.bars` is the existing canonical authored/compiled bar list.
- `DisplayDefinitionCatalog` already composes node visuals from modules.
- `TextureManager`, `ShapeTextureGen`, `Rope` pooling, `syncVeinRope`, and path utilities already support generated-texture curved strips efficiently.
- `nodeOverlayDisplayBounds` is already the public way to publish visual extents from Phaser to React.
- `resolveStorageAbilityBars` and `backgroundStorageFill` already read the same semantic bar list.

The correct implementation is therefore to extend the existing bar contract, render it in Phaser via a new display module, and delete only the obsolete storage overlay path.

## 3. What

### 3.1 In scope

The implementation must do all of the following:

- render resource progress bars in Phaser around nodes and the cave
- use curved guide paths that hug the node silhouette
- use generated textures, not per-frame `Graphics`, for the bar strips and bulb
- use rounded edges for both track and fill
- render a bulb at the bar start containing the relevant resource icon
- render a darker, wider background track behind the fill
- drive fill from live runtime state every display tick
- author storage-bar position and color in the storage ability editor
- author cycle-cost-bar position and color in the cycle cost editor
- define cave food/heat bars in default data
- remove only resource/storage node overlays and their test detritus
- make orbit-entry and orbit-radius calculations respect the bar footprint

### 3.2 Explicitly out of scope

The implementation must not do any of the following:

- replace cycle overlays
- replace assignment overlays
- move business logic into `.tsx`
- introduce any React shadow state for bar values
- mutate ECS state from Phaser or React
- add a second authored data source for resource bars
- generalize bars into a new unrelated abstraction beyond what is required here

### 3.3 Governing invariants

1. `components.display.bars` remains the single source of truth for authored/compiled bar semantics.
2. Phaser renders from that source; it does not invent bars.
3. React selection/resource cards continue to read from that source.
4. Storage/resource node overlays are removed; cycle and assignment overlays remain.
5. Orbit spacing derives from the same canonical bar geometry used by rendering; it does not inspect rendered objects.
6. Visible storage and visible cycle-cost resource bars require explicit authored positions. No runtime auto-placement is allowed.
7. Only one visible resource bar may occupy each of the four slot positions on a single entity.

## 4. Current codebase facts that this design relies on

### 4.1 Existing authored/compiled bar path

- `src/data/schemas/components/display.ts` already defines `bars` on the display component.
- `src/engine/compiler/abilities/storageCompiler.ts` already compiles visible storage abilities into `display.bars`.
- `src/engine/compiler/abilities/cycleResourceCostCompileGroup.ts` already compiles visible cycle-cost reservoirs into `display.bars`.
- `src/data/schemas/v2/systemDefaults.ts` already authors a cave/world bar directly in default data.

### 4.2 Existing consumers of `display.bars`

- `src/ui/runtime/world/selection/ability-display/resolveStorageAbilityBars.ts` uses `display.bars` to build resource-card bars.
- `src/engine/phaser/display/modules/backgroundStorageFill.ts` uses `display.bars` to choose storage fill for node backgrounds.
- `src/engine/phaser/display/resolveDisplaySpec.ts` already forwards `display.bars` into the Phaser display spec.

### 4.3 Existing obsolete resource overlay path

- `src/ui/runtime/world/node-overlays/resolveNodeOverlayModel.ts` currently resolves `kind: "storage"` overlays when the selection lens is `resource`.
- `src/ui/runtime/world/node-overlays/resolveNodeOverlayModel.helpers.ts` currently builds that overlay from `resolveStorageAbilityBars(...)[0]`.
- `src/ui/runtime/world/node-overlays/nodeOverlayTypes.ts` currently includes `"storage"` in `NodeOverlayKind`.

### 4.4 Existing Phaser primitives to reuse

- `TextureManager` already owns hidden scratch graphics for texture generation.
- `ShapeTextureGen` already generates cached shape textures.
- `DisplayTypePool` already pools `Image` and `Rope` objects.
- `syncVeinRope`, `buildPolylineMetrics`, `slicePolylineToDistance`, and `buildSmoothGuidePath` already provide efficient curved textured-strip rendering.

### 4.5 Existing orbit seam to extend

- `resolveOrbitRadius` ultimately depends on `resolveOrbitPolar` and `resolveProcessingOrbitRadius`.
- `navigateAssignedBody`, `orbitAssignedBody`, and `processingProgress.ts` all consume that orbit radius.
- none of those paths currently know anything about display bars.

## 5. Data contract

## 5.1 New shared enum: resource bar slot position

A new shared enum/value set must be introduced and reused everywhere that talks about authored/renderable resource bars.

Allowed values:

- `top_left`
- `top_right`
- `bottom_left`
- `bottom_right`

Semantics:

- `top_left`: bulb starts at the top of the node and the bar curves down the left side
- `top_right`: bulb starts at the top of the node and the bar curves down the right side
- `bottom_left`: bulb starts at the bottom of the node and the bar curves up the left side
- `bottom_right`: bulb starts at the bottom of the node and the bar curves up the right side

## 5.2 Extended display-bar descriptor

The existing display-bar descriptor remains the canonical compiled/rendered format. It is extended; it is not replaced.

Required existing fields that remain unchanged:

- `key`
- either `max` or `maxKey`
- optional `color`
- optional `label`

New optional fields:

- `position`: one of the four slot positions above
- `paletteColorKey`: one of the existing display palette keys
- `spanRatio`: finite number in the closed-open range `(0, 1]`

Contract:

- `position` absent means the bar is not rendered by the new Phaser progress-bar module.
- `spanRatio` absent means the renderer uses the default span ratio of `0.5`.
- `paletteColorKey` overrides the rendered fill color when a palette color is available.
- `color` remains the manual fallback color and must still be preserved even when `paletteColorKey` is present.
- the existing `max or maxKey` refinement remains mandatory.

## 5.3 Storage ability authoring fields

`StorageAbilitySchema` must gain three new optional authoring fields:

- `barPosition`
- `barColorHex`
- `barPaletteColorKey`

Contract:

- these fields only affect the compiled `display.bars` entry for that storage resource
- `barPosition` is required by validation when `visible !== false`
- `barColorHex` is a manual color fallback suitable for `ViewEditorColorField`
- `barPaletteColorKey` selects the same palette source used by the display editor

## 5.4 Cycle-cost authoring fields

`CycleResourceCostSchema` must gain the same three optional authoring fields:

- `barPosition`
- `barColorHex`
- `barPaletteColorKey`

Contract:

- they only affect the compiled `display.bars` entry for that visible cycle-cost reservoir
- `barPosition` is required by validation when `visible !== false`
- color authoring behaves exactly the same way as storage authoring

## 5.5 Cave default bars

`DEFAULT_WORLD_ENTITY.display.bars` must stop carrying the current comfort-only bar and instead author the cave-specific resource bars directly in default data.

Required default entries:

- food bar
  - `key`: `state.food`
  - `maxKey`: `state.food.max`
  - `label`: `Food`
  - `position`: `bottom_left`
  - `paletteColorKey`: `green`
  - `spanRatio`: `0.8`
- heat bar
  - `key`: `state.heat`
  - `maxKey`: `state.heat.max`
  - `label`: `Heat`
  - `position`: `bottom_right`
  - `paletteColorKey`: `red`
  - `spanRatio`: `0.8`

Cave comfort remains owned by the cave card UI and world rules. It is no longer represented as an around-node progress bar.

## 6. Rendering contract

### 6.1 Which bars render in Phaser

A bar renders in Phaser only when all of the following are true:

1. its `key` resolves to `state.<resource>` (with or without `.value` suffix)
2. it resolves a finite current value from runtime entity state
3. it resolves a finite positive max from `max` or `maxKey`
4. it has an explicit `position`

Bars that fail any of those checks are ignored by the progress-bar renderer.

That rule is intentional:

- it renders storage bars, cycle-cost reservoir bars, and cave food/heat bars
- it does not render health bars or cycle-progress bars
- it does not auto-place old resource bars that have no authored slot position

### 6.2 Shape semantics

The bar follows a side arc outside the node.

Canonical side arcs:

- left side: top to bottom on the node’s left semicircle
- right side: top to bottom on the node’s right semicircle

`spanRatio` is interpreted as the fraction of that side arc that the bar occupies.

Examples:

- default span ratio `0.5`
  - `top_left` = top to mid-left
  - `top_right` = top to mid-right
  - `bottom_left` = bottom to mid-left
  - `bottom_right` = bottom to mid-right
- cave span ratio `0.8`
  - `bottom_left` = bottom to near top-left
  - `bottom_right` = bottom to near top-right

The start point of that arc is the bulb center. Fill grows away from the bulb along the curve.

### 6.3 Width, padding, and rounding contract

The renderer must use a single canonical geometry helper so that rendering, bounds publication, and orbit clearance all agree.

The helper must expose these derived values from `nodeRadius`:

- fill width
- track padding
- track width
- gap from node edge to the track inner edge
- bulb radius
- guide-path radius
- local bounds
- maximum radial outset beyond the node radius

Required relationships:

- track width = fill width + 2 × track padding
- bulb diameter = track width
- track and fill share the same guide path
- both track and fill are rendered from rounded strip textures
- the bulb is rendered from a generated circle texture, not `Graphics`

The exact numeric formula is owned by the shared geometry file and must be exported from there. Tests must consume those exports instead of duplicating literals.

### 6.4 Color contract

Rendered fill color resolution order:

1. palette color from `paletteColorKey`, when present and resolvable
2. manual `color`
3. shared deterministic default resource color helper

Track color:

- always a deterministic darker transform of the resolved fill color
- never separately authored

Bulb color:

- same as the track color

Icon color:

- use the resolved resource display glyph colors, not the bar fill color

### 6.5 Icon contract

The bulb icon must come from the existing display/glyph system, not from a new icon system.

Resolution order:

1. treat the resource id as the display key
2. resolve it with existing `resolveDisplaySource`
3. derive the glyph key from the resolved display asset using the same helpers already used by display-spec resolution
4. read glyph placements from the existing glyph registry
5. render bulb icon layers using existing generated glyph textures (`TextureManager.getGlyphTexture`)

If the resource display cannot be resolved, the bulb uses the existing unknown/fallback display glyph.

### 6.6 Live-value contract

On every display tick, the progress-bar renderer must:

- read current value from runtime entity state
- read max from runtime entity state or constant max
- clamp the visual fill ratio to `[0, 1]`
- never cache current/max across ticks

Invalid live range behavior:

- non-finite or non-positive max hides the bar for that tick
- non-finite current is treated as `0`

## 7. Orbit and bounds contract

### 7.1 Published display bounds

The progress-bar renderer must publish enlarged node overlay display bounds by unioning the node’s existing bounds with the bars’ local bounds.

This is required even after storage overlays are removed, because the published bounds are still consumed by:

- cycle overlays
- assignment overlays
- guidance/callout placement

### 7.2 Orbit clearance

Orbit clearance must be derived from the same geometry contract as the Phaser bar renderer.

For any owner entity, define:

- `ownerBarOutsetPx` = the maximum outward radial distance from the node radius caused by all visible positioned progress bars on that owner

Then:

- non-processing orbit radius must be at least `ownerRadius + ownerBarOutsetPx + bodyRadius`
- processing orbit must treat `ownerRadius + ownerBarOutsetPx` as the effective owner radius for both its outer and inner interpolation endpoints
- navigation entry checks and processing-completion checks must use the clearance-aware orbit radius

No orbit code may inspect Phaser display objects. The calculation must be pure and based on entity/blueprint display data plus physics radius.

## 8. Validation and migration contract

### 8.1 Validation rules

The blueprint validation layer must add two new error classes.

Rule A: missing slot position

- Applies to visible storage abilities and visible cycle resource costs.
- If a visible entry lacks `barPosition`, emit an error.
- Message must clearly identify the ability type and resource.

Rule B: duplicate slot position

- Applies across the union of visible storage abilities and visible cycle resource costs on one blueprint.
- If more than one visible entry uses the same `barPosition`, emit an error.
- Message must clearly identify the duplicated position.

Validation ignores entries where `visible === false`.

### 8.2 Runtime fallback on invalid positioned bars

For safety outside the editor path, the Phaser renderer must be deterministic when duplicate positioned bars still reach runtime.

Required behavior:

- first bar in `display.bars` order wins for each position
- later duplicates are ignored
- log a loud error once per entity/position

### 8.3 Content migration gate

The repository’s example content currently relies on storage/cycle resource overlays and does not author bar positions yet. Those files must be updated before the storage overlay path is removed in a shipping build.

A repo scan shows the example content does not exceed four visible resource bars on any blueprint, so the four-slot model is sufficient for shipped example content.

Known example content files that require authoring updates:

- `src/data/raw/example/modules/butcher.bp`
- `src/data/raw/example/modules/buycoinchest.bp`
- `src/data/raw/example/modules/coinchest.bp`
- `src/data/raw/example/modules/daylabor.bp`
- `src/data/raw/example/modules/egg.bp`
- `src/data/raw/example/modules/hearth.bp`
- `src/data/raw/example/modules/investigate_accountant.bp`
- `src/data/raw/example/modules/larder.bp`
- `src/data/raw/example/modules/lodging_hommlet.bp`
- `src/data/raw/example/modules/lure_homlet_native.bp`
- `src/data/raw/example/modules/lure_hommlet_merchant.bp`
- `src/data/raw/example/modules/sell_wood.bp`
- `src/data/raw/example/modules/slave_market.bp`
- `src/data/raw/example/modules/woodstorage.bp`

Required content-only change for each of those files:

- add `barPosition` to every visible storage entry and visible cycle resource cost entry
- optionally add `barColorHex` or `barPaletteColorKey`
- ensure no duplicate visible positions within the same blueprint

This is content authoring, not engine logic. The engine must not guess these positions.

## 9. File-by-file design

## 9.1 New shared library files

| File | Responsibility | Required logic | Interface contract |
| --- | --- | --- | --- |
| `src/lib/displays/resourceProgressBars.ts` | Canonical shared semantics for authored/compiled resource bars. This is the one reusable place for bar parsing, color resolution, and normalized live-range extraction. | Define the shared position enum; define the extended display-bar shape; read bars from raw display data; normalize `state.<resource>` paths; resolve current/max from an entity; resolve effective fill color from palette/manual/default fallback; expose storage-like-state detection for existing consumers. | Must be pure. Must not import React or Phaser. Must preserve backward compatibility for bars that have no `position`. Must be reusable by compiler, selection, Phaser, and game-system code. |
| `src/lib/displays/resourceProgressBarGeometry.ts` | Canonical shared bar geometry and footprint math. | Export the default span ratio; derive fill width, track padding, track width, gap, bulb radius, guide-path radius; generate unsmoothed arc points for each slot position; measure local bounds and max outward outset. | Must be pure. Must be the only source for bar footprint math. Rendering, published bounds, and orbit clearance must all consume this file so they cannot drift. |

## 9.2 Data schema and default-data files

| File | Responsibility | Required logic | Interface contract |
| --- | --- | --- | --- |
| `src/data/schemas/components/display.ts` | Extend the display-bar schema without creating a new authored bar system. | Add optional `position`, `paletteColorKey`, and `spanRatio`; keep existing `max or maxKey` refine intact. | Existing bars with only `key` and `max/maxKey` remain valid. `position` must use the shared enum. `spanRatio` must be finite and within `(0, 1]`. |
| `src/data/schemas/abilities/storage.ts` | Add explicit resource-bar authoring inputs to storage abilities. | Add `barPosition`, `barColorHex`, `barPaletteColorKey`. | These fields are optional at schema level so existing content still parses, but validation will reject visible entries missing `barPosition`. |
| `src/data/schemas/abilities/cycle.ts` | Add explicit resource-bar authoring inputs to cycle-cost reservoirs. | Add `barPosition`, `barColorHex`, `barPaletteColorKey` to `CycleResourceCostSchema`. | Same contract as storage. No other cycle semantics change. |
| `src/data/schemas/v2/systemDefaults.ts` | Author the cave’s progress bars in canonical default data. | Replace the current comfort-only bar with explicit food/heat positioned bars using `spanRatio: 0.8`. | Cave food/heat bars must exist even with no blueprint editor involvement. Comfort is not rendered as an around-node bar. |
| `src/data/schemas/components.test.ts` | Guard the extended display-bar schema. | Add acceptance tests for `position`, `paletteColorKey`, and `spanRatio`; add rejection tests for invalid positions and invalid span ratios. | Must still prove the existing `max or maxKey` contract. |

## 9.3 Compiler and validation files

| File | Responsibility | Required logic | Interface contract |
| --- | --- | --- | --- |
| `src/engine/compiler/abilities/storageCompiler.ts` | Compile storage authoring into canonical display-bar descriptors. | When `visible !== false`, emit a storage bar with `position`, `paletteColorKey`, and `color` copied from storage authoring. Use the shared default color helper when no manual color is authored. Preserve label behavior. Preserve radius binding behavior. | No auto-positioning. If `barPosition` is absent, compile the bar without `position`; validation, not compilation, owns the error. |
| `src/engine/compiler/abilities/cycleResourceCostCompileGroup.ts` | Compile visible cycle-cost reservoirs into canonical display-bar descriptors. | Emit cycle-cost bars with the same extended metadata as storage bars. Use the shared default color helper. Preserve existing `state.<resource>` / `state.vals_cycle_cost_total_<resource>.value` binding contract. | The cycle progress bar remains separate and unchanged. Cycle-cost reservoir bars are resource bars; cycle progress is not. |
| `src/engine/compiler/abilities/cycleResourceCostCompilerUtils.ts` | Stop owning a second, diverging color rule. | Remove the local standalone color algorithm and route color resolution through the shared default color helper. | No duplicate color-generation logic may remain between storage and cycle-cost compilers. |
| `src/engine/compiler/validation/collisionDetector.ts` | Integrate the new bar-position validation into existing editor validation flow. | Include the new validation builders in the existing issue list. | Validation severity must be `error`, not warning. |
| `src/engine/compiler/validation/collisionDetectorUtils.ts` | Define the concrete validation rules for missing/duplicate resource-bar positions. | Add builders for missing visible positions and duplicate visible positions across storage and cycle resource costs. | Hidden entries are ignored. Messages must name the resource and/or duplicated slot position explicitly. |
| `src/engine/compiler/abilities/storageCompiler.test.ts` | Prove compiled storage bars carry the new metadata correctly. | Add tests for `barPosition`, manual color, palette key propagation, and default-color fallback. | Tests must use real compilation via `CompilerService`. |
| `src/engine/compiler/abilities/cycleResourceCostCompiler.test.ts` | Prove compiled cycle-cost bars carry the new metadata correctly. | Add tests for `barPosition`, manual color, palette key propagation, and unchanged cycle-progress-bar behavior. | Must still prove only one `state.cycle` bar exists. |
| `src/engine/compiler/validation/collisionDetector.test.ts` | Prove authoring validation catches missing and duplicate positions. | Add Given/When/Then tests for visible storage/cycle resource bars with missing `barPosition` and duplicate positions. | Must use real editor-like ability data, not mocked validation outputs. |

## 9.4 Devtools/editor files

| File | Responsibility | Required logic | Interface contract |
| --- | --- | --- | --- |
| `src/ui/devtools/editors/blueprint/mode/forms/StorageAbilityForm.tsx` | Author storage bar slot and color directly in the storage ability editor. | Add a position selector and a color selector using the existing `ViewEditorColorField`. Read palette options from existing display palette utilities. Persist `barPosition`, `barColorHex`, and `barPaletteColorKey`. | No business logic beyond store wiring. Visible state does not auto-fill a position. The form may retain configured values even when `visible` is false. |
| `src/ui/devtools/editors/blueprint/mode/forms/CycleResourceCostRow.tsx` | Author cycle-cost reservoir bar slot and color directly in the cycle cost editor. | Same behavior as storage form. | Same contract as storage form. |
| `src/ui/devtools/editors/blueprint/mode/forms/StorageAbilityForm.test.tsx` | Guard storage-form wiring. | Verify that the new slot selector and color selector write the correct draft fields and preserve palette/manual behavior. | UI tests must assert wiring only, not compiler behavior. |
| `src/ui/devtools/editors/blueprint/mode/forms/CycleResourceCostRow.test.tsx` | Guard cycle-cost-form wiring. | Verify the row renders the new fields and writes them into the draft correctly. | Same test-layer rule as above. |

## 9.5 Selection and resource-card files

| File | Responsibility | Required logic | Interface contract |
| --- | --- | --- | --- |
| `src/ui/runtime/world/selection/ability-display/resolveStorageAbilityBars.ts` | Continue building resource-card bars from the canonical display-bar list, now with palette-aware color resolution and shared semantics. | Replace local bar/path heuristics with the shared helper where applicable; resolve effective color via palette/manual/default fallback; keep existing tooltip, decay-rate, and live-binding behavior. | Must continue to return storage-card models for storage-like resource state entries even when a bar has no `position`. Resource cards and Phaser visibility are intentionally decoupled. |
| `src/ui/runtime/world/selection/ability-display/resolveStorageAbilityBars.test.ts` | Guard shared semantic compatibility. | Add tests that palette-backed colors resolve correctly and bars without positions still appear in the resource card. | Existing storage-card contract must remain intact. |
| `src/ui/runtime/world/selection/ability-display/resolveStorageAbilityBars.cycleCost.test.ts` | Guard cycle-cost resource-card compatibility. | Ensure cycle-cost reservoirs still appear as resource-card bars with the new shared resolver. | No change to cycle-cost card semantics. |
| `src/ui/runtime/world/selection/ability-display/resolveStorageAbilityBars.decay.test.ts` | Guard decay metadata preservation. | Ensure entropy/decay text survives the refactor to shared helpers. | Must still read real state entries, not mocked formatted text. |

## 9.6 Storage-overlay removal files

| File | Responsibility | Required logic | Interface contract |
| --- | --- | --- | --- |
| `src/ui/runtime/world/node-overlays/resolveNodeOverlayModel.ts` | Stop creating storage/resource overlays. | Remove the `resource` lens branch that returns a storage overlay. Keep assignment and cycle behavior unchanged. | Resource entities no longer produce node overlay entries. |
| `src/ui/runtime/world/node-overlays/resolveNodeOverlayModel.helpers.ts` | Delete obsolete storage-overlay helper logic and keep only still-valid helpers. | Remove `resolveStorageOverlayEntry`. Keep assignment helper and cycle re-export. | No dead storage-overlay helpers may remain. |
| `src/ui/runtime/world/node-overlays/nodeOverlayTypes.ts` | Remove obsolete storage overlay kind from the overlay type system. | Remove `"storage"` from `NodeOverlayKind`. | `CompactBarBinding` remains because cycle overlays still use compact bars. |
| `src/ui/runtime/world/node-overlays/resolveNodeOverlayModel.test.ts` | Guard resource-overlay removal. | Replace previous storage-overlay expectations with `null` for resource entities. | Cycle and assignment coverage remains. |
| `src/ui/runtime/world/node-overlays/filterVisibleNodeOverlayModels.test.ts` | Remove obsolete storage-kind expectations. | Update fixtures and expectations to reflect only cycle/assignment kinds. | No `storage` kind may remain in test fixtures. |
| `src/ui/runtime/world/node-overlays/nodeOverlayComparators.test.ts` | Remove obsolete storage-kind test fixtures. | Update comparator tests to use only remaining overlay kinds. | Comparator behavior itself does not change beyond the removed kind. |
| `src/ui/runtime/world/node-overlays/useResolvedNodeOverlayEntries.incremental.test.tsx` | Guard incremental overlay rebuild behavior after storage overlay removal. | Update fixture entities and expected retained entries so resource-only entities no longer produce overlay entries. | Must continue to prove incremental stability for remaining overlay kinds. |

## 9.7 Phaser display files

| File | Responsibility | Required logic | Interface contract |
| --- | --- | --- | --- |
| `src/engine/phaser/utils/ProgressBarTextureGen.ts` | Generate and cache the white rounded strip texture used by both fill and track ropes. | Use scratch graphics once per texture key to generate a rounded capsule strip texture; cache it in scene textures; return a stable key. | No per-frame graphics. The generated texture must be tint-safe and reusable by any bar instance. |
| `src/engine/phaser/utils/TextureManager.ts` | Expose the new generated strip texture through the existing texture manager. | Add `getProgressBarStripTexture()`. Keep ownership in the texture manager, consistent with all other generated textures. | No direct texture generation inside the display module. |
| `src/engine/phaser/display/types.ts` | Carry the richer bar descriptor through Phaser display-spec typing. | Replace the narrow `{ key, maxKey, max }` inline type with the shared extended bar type. | Phaser display code must be able to read `position`, `paletteColorKey`, and `spanRatio` without casting. |
| `src/engine/phaser/display/resolveDisplaySpec.helpers.ts` | Stop owning a second bar-shape parser. | Read bars using the new shared display-bar helper/type. | Bar parsing logic must not diverge between Phaser and UI code. |
| `src/engine/phaser/display/DisplayDefinitionCatalog.ts` | Insert the new progress-bar renderer into the node display stacks. | Create the module via a factory that captures the glyph registry and add it to `generic_node`, `attr_*`, and `cave_level` display stacks after the core background/glyph modules and before selection. | The module is node-only. Body avatars and unrelated displays do not get the progress-bar module. |
| `src/engine/phaser/display/modules/ProgressBarsModule.ts` | Render canonical resource bars around the node using pooled ropes and images only. | At create-time, allocate pooled ropes/images for the renderable bar slots; resolve icon glyph data; at tick-time, resolve live current/max, compute geometry, smooth the guide path, sync background and fill ropes, lay out the bulb and icon, and union the resulting bounds into `scratch.nodeOverlayDisplayBounds`; at destroy-time, release everything to the pools. | Must not use per-frame `Graphics`. Must not mutate runtime state. Must render only bars with explicit `position`. Must log duplicate-position runtime errors once and keep the first bar in array order. |
| `src/engine/phaser/display/nodeOverlayDisplayBounds.ts` | Support unioning base node bounds with progress-bar bounds. | Add a helper that merges existing published bounds with additional bounds while preserving the entity id and canonical center. | The progress-bar module must use this helper instead of duplicating bounds-union logic. |
| `src/engine/phaser/display/modules/backgroundStorageFill.ts` | Keep background fill selection aligned with the canonical bar semantics. | Replace local resource-bar parsing logic with the shared helper; continue to return the first qualifying storage-like resource fill. | This file continues to care about storage-like state, not positioned-bar rendering. |
| `src/engine/phaser/display/modules/backgroundCycleReader.storage.test.ts` | Guard that background storage fill still works after the shared-helper refactor. | Ensure the first qualifying storage-like resource bar still wins and cycle bars are still ignored. | Existing background-fill behavior must remain stable. |
| `src/engine/phaser/display/modules/ProgressBarsModule.test.ts` | Guard the new renderer. | Add tests for: slot filtering; fill slicing; cave `spanRatio: 0.8`; pooled-object reuse; duplicate-position logging/first-wins behavior; enlarged published bounds. | Use existing Phaser display test utilities and real module contexts where available. |
| `src/engine/phaser/display/DisplayInstanceManager.nodeOverlayDisplayBounds.test.ts` | Guard that display-manager-published bounds include progress-bar extents. | Update or extend the test so a node with visible positioned bars publishes enlarged bounds. | This proves the module participates correctly in the existing bounds-publication path. |

## 9.8 Orbit and motion files

| File | Responsibility | Required logic | Interface contract |
| --- | --- | --- | --- |
| `src/game/systems/BodyAssignmentSystem.ts` | Thread owner display information into navigation/orbit paths so orbit clearance can be computed from data, not from render objects. | Pass the owner entity into the navigation path as well as the orbit path. | No simulation mutation semantics change. |
| `src/game/systems/body-assignment/navigateAssignedBody.ts` | Use clearance-aware orbit radius when deciding when a body has reached orbit-entry distance. | Resolve the owner’s effective bar outset from owner entity + blueprint display data + owner radius, and pass it into `resolveOrbitRadius`. | The existing layer/target commands remain unchanged. |
| `src/game/systems/body-assignment/orbitAssignedBody.ts` | Use clearance-aware orbit radius/position during actual orbiting. | Resolve owner bar outset once per tick and pass it into `resolveOrbitOffsets` / `resolveOrbitPosition`. | Motion remains deterministic and purely data-driven. |
| `src/game/systems/body-assignment/orbitLayout.ts` | Carry clearance-aware orbit inputs through the orbit helpers. | Extend the orbit input contract to include owner bar outset and forward it consistently. | This file stays the single public orbit-layout entry point. |
| `src/game/systems/body-assignment/orbitPolar.ts` | Respect bar clearance for non-processing orbit radius. | Compute the base orbit radius exactly as today, then clamp it upward against the minimum clearance radius. | Existing angle/stack/speed behavior remains unchanged. |
| `src/game/systems/body-assignment/processingOrbit.ts` | Respect bar clearance for processing orbit interpolation. | Replace direct `ownerRadius` use with `effectiveOwnerRadius = ownerRadius + ownerBarOutsetPx`. | Existing progress-ratio interpolation semantics remain unchanged. |
| `src/game/systems/processingProgress.ts` | Use the clearance-aware orbit radius when checking processing completion. | Resolve and pass the owner bar outset for the processing node before calling orbit helpers. | Completion checks must match the visible orbit path. |
| `src/game/systems/body-assignment/bodyAssignmentMotion.test.ts` | Guard orbit clearance behavior. | Add tests proving that visible positioned resource bars increase minimum orbit radius and affect both navigation and processing owners. | Tests must use real motion helpers and real minimal entities, not mocked orbit outputs. |

## 9.9 Example-content authoring files

Each file below has the same responsibility, logic, and interface contract, so they are grouped.

### Responsibility

Author explicit `barPosition` (and optionally `barColorHex` / `barPaletteColorKey`) for every visible storage ability and visible cycle resource cost so that the shipping example content continues to expose resource state in-world after storage overlays are removed.

### Logic

- add `barPosition` to every visible `_editor.abilities.storage[*]`
- add `barPosition` to every visible `_editor.abilities.cycle.resourceCosts[*]`
- optionally set color via the new editor-backed fields
- ensure no duplicate visible positions within the same blueprint

### Interface contract

Only the new editor-facing fields are added. Existing resource ids, capacities, priorities, and cycle-cost semantics remain unchanged.

Files:

- `src/data/raw/example/modules/butcher.bp`
- `src/data/raw/example/modules/buycoinchest.bp`
- `src/data/raw/example/modules/coinchest.bp`
- `src/data/raw/example/modules/daylabor.bp`
- `src/data/raw/example/modules/egg.bp`
- `src/data/raw/example/modules/hearth.bp`
- `src/data/raw/example/modules/investigate_accountant.bp`
- `src/data/raw/example/modules/larder.bp`
- `src/data/raw/example/modules/lodging_hommlet.bp`
- `src/data/raw/example/modules/lure_homlet_native.bp`
- `src/data/raw/example/modules/lure_hommlet_merchant.bp`
- `src/data/raw/example/modules/sell_wood.bp`
- `src/data/raw/example/modules/slave_market.bp`
- `src/data/raw/example/modules/woodstorage.bp`

## 10. Behavioral flow

### 10.1 Authoring and compile flow

1. Author sets storage/cycle resource visibility, slot position, and color in the existing ability editor surfaces.
2. Validation rejects missing visible positions and duplicate visible positions.
3. Compiler writes the extended bar descriptor into `components.display.bars`.
4. Runtime instantiation carries that compiled bar data into entities/blueprints exactly as today.

### 10.2 Phaser render flow

1. Display spec resolves and carries the extended bar descriptors.
2. The new progress-bar module filters to renderable positioned resource bars.
3. For each slot:
   - resolve live current/max
   - resolve fill color
   - compute guide path and footprint from the shared geometry helper
   - sync rounded background rope
   - sync rounded fill rope sliced to current ratio
   - place bulb and resource icon
4. The module unions the resulting bounds into `scratch.nodeOverlayDisplayBounds`.

### 10.3 Orbit flow

1. Orbit code resolves the owner’s canonical progress-bar footprint from the same shared bar data.
2. Orbit radius is clamped/interpolated outward accordingly.
3. Bodies never orbit through the visible bar footprint.

### 10.4 Overlay flow

1. Resource entities still produce resource cards via `resolveStorageAbilityBars`.
2. Resource entities no longer produce node overlay entries.
3. Cycle and assignment overlays continue exactly as before.

## 11. Test plan

The tests must follow the project testing standard:

- logic in unit tests
- interaction of systems/runtime in integration tests
- editor/view wiring in view tests
- Given/When/Then structure
- factories over boilerplate

### 11.1 Unit tests

Required new/changed unit coverage:

- extended display-bar schema accepts and rejects the right shapes
- shared bar resolver normalizes `state.<resource>` paths correctly
- palette/manual/default color resolution works deterministically
- geometry helper returns the correct slot semantics and `spanRatio` behavior
- validation catches missing visible positions and duplicate visible positions
- background storage fill still chooses the first qualifying storage-like resource bar

### 11.2 Integration tests

Required integration coverage:

- storage compiler emits extended display-bar descriptors correctly
- cycle-cost compiler emits extended display-bar descriptors correctly
- Phaser progress-bar module reuses pooled objects and updates fill live from entity state
- published node overlay display bounds include bar extents
- orbit motion and processing completion respect the bar footprint

### 11.3 View tests

Required view coverage:

- storage ability form writes `barPosition`, `barColorHex`, and `barPaletteColorKey`
- cycle resource cost row writes the same fields
- resource cards still display resource bars even when bar positions are absent
- node overlay views no longer render resource/storage overlays

## 12. Implementation order

The implementation order must be:

1. add shared bar types/helpers and geometry helpers
2. extend schemas and validation
3. extend the storage and cycle-cost editor forms
4. update compilers to emit the extended bar metadata
5. update example content and cave default data
6. add the Phaser progress-bar textures and renderer
7. wire bounds publication and orbit clearance to the shared geometry
8. remove storage node overlays and update their tests

This order prevents a temporary state where overlays are removed before authored positions exist and before Phaser can render the replacement bars.

## 13. Acceptance criteria

The implementation is complete only when all of the following are true:

- visible storage and visible cycle-cost resource bars render around nodes in Phaser
- cave renders food and heat bars from default data at bottom-left and bottom-right with `spanRatio: 0.8`
- bars are curved, rounded, and built from generated textures plus pooled images/ropes
- fill tracks live runtime state every display tick
- track is darker and wider than fill
- each bar starts with a bulb containing the relevant icon
- orbiting bodies keep clear of the bar footprint
- resource/storage node overlays are gone
- cycle and assignment overlays still work
- selection/resource cards still work
- published display bounds still work
- validation loudly catches missing/duplicate visible bar positions
- all touched tests are green and no dead storage-overlay detritus remains

