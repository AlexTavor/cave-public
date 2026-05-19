# LLD: Replace `BackgroundModule` with `CycleProgressModule`

## Review outcome

The prior LLD artifact was not present in `/mnt/data`; this document is the corrected implementation LLD. It is based on the uploaded source tree and the canonical context, prompt, and testing standards.

## Contract

This implementation must satisfy all of the following requirements.

1. `BackgroundModule` is removed, not adapted. No runtime module, resolver, render model, texture generator, authoring UI, test, helper, or type may remain under a BackgroundModule-specific name.
2. `CycleProgressModule` replaces `BackgroundModule` in display module stacks.
3. The display authoring UI exposes cycle-progress rope authoring, not background authoring.
4. The rope family choices are exactly the current background family choices: `none`, `circle`, `triangle`, `square`, `hex`, and `spiky_circle`.
5. For `CycleProgressModule`, the authored family means the rope path shape. It does not mean a filled interior shape.
6. The module renders only a rope. It renders no interior fill, no bands, no background image, and no non-circular fill modes.
7. Progress is measured by arc length along the computed rope path. A progress value of `0.25` renders exactly 25% of the rope perimeter, not 90 degrees of polar angle.
8. Progress starts at the top of the rope path.
9. Progress proceeds clockwise in screen coordinates.
10. When progress is full, the rendered rope uses the same geometry, width, solid-strip texture mechanism, and pulse animation as the current BackgroundModule border rope.
11. Color authoring uses the existing palette-aware color-field mechanism, but only one rope color is authored. The previous Background Color / Fill Color split is deleted because there is no background fill.
12. Existing generic display mechanisms must be reused where they are still semantically correct: display module factories, display pools, `backgroundAnchor` layering, `TextureManager.getSolidStripTexture`, view-editor draft mutation, and the existing glyph/light editor patterns.
13. No ECS state is mutated by UI or Phaser display code.
14. Illegal or malformed cycle state logs loudly. Absence of cycle state is legal and hides the rope without logging.
15. No compatibility shim may keep old background authoring alive. Old background-specific style fields are rejected by schema validation.

## Explicit scope boundary

The following names are not BackgroundModule detritus and must not be deleted solely because they contain the word `background`:

- `src/engine/phaser/background/**`: this is the scene-level biological fog background system, not `BackgroundModule`.
- `assets.settings.background` and `BackgroundConfigSchema`: these configure the scene-level biological fog background, not display-node BackgroundModule authoring.
- `backgroundAnchor`: this is a display layer anchor used by multiple modules.
- `backgroundImage`: this scratch slot is used by `AvatarModule`, `TransferModule`, alpha handling, and interaction behavior. It is not specific to `BackgroundModule`.
- CSS or style fields named `backgroundColor` outside the display-style schema and display visual editor.

The following names are BackgroundModule detritus and must be removed or renamed as part of this implementation:

- `BackgroundModule`
- `backgroundBlob*`
- `backgroundCycleReader`
- `backgroundFill*`
- `backgroundRender*` when it refers to display-node background rendering
- `backgroundRopeRenderer`
- `backgroundStyled*`
- `backgroundUnstyled*`
- `backgroundVisualKey`
- `blobBorderRope`
- `ViewEditorBackground*`
- `BackgroundVisual*`
- `visualsBackgroundActions`
- display-style fields `backgroundColor`, `fillMode`, `fillAmount`, and `invertFill`

## Why

`BackgroundModule` currently conflates three separate concepts: an interior background fill, a progress fill, and a decorative border rope. The requested product behavior keeps only one of those concepts: a cycle-progress rope. Retaining any BackgroundModule runtime or authoring would preserve obsolete semantics and create ambiguous behavior in editor previews, runtime rendering, and tests.

The current circular fill is not rope-length based. It builds a radial wedge from a fixed angle. That means progress is angular, not perimeter-length based, so irregular families such as triangle, square, hex, and spiky circle do not display proportional rope progress. `CycleProgressModule` must instead compute progress over cumulative path length.

The current display editor names the feature as background and exposes background fill controls. Those controls must be removed because the new feature has no background fill. The editor must author a rope shape and rope color only.

## What

The implementation introduces a new display module named `CycleProgressModule`. It renders a Phaser Rope segment representing the entity cycle fraction.

Runtime input:

| Input | Source | Required behavior |
|---|---|---|
| Display radius and physics visibility | `DisplayTickContext.spec` | If no physics or invisible radius, hide the rope. |
| Entity cycle | `entity.state.cycle.value` and `entity.state.cycle.max` | If absent, hide the rope without logging. If malformed, log an error and hide. |
| Rope style | `DisplaySpec.style.cycleProgress` | If absent or `family` is `none`, hide the rope. |
| Pulse | `DisplayTickContext.timeMs` and `pulseValue` | Use the same organic pulse inputs that old border geometry used. |
| Texture | `TextureManager.getSolidStripTexture()` | Reuse the existing solid strip texture for the rope. |

Authored style shape:

| Field | Type | Required behavior |
|---|---|---|
| `cycleProgress.family` | enum: `none`, `circle`, `triangle`, `square`, `hex`, `spiky_circle` | Determines the rope path family. `none` disables the rope. |
| `cycleProgress.familyRotationDeg` | finite number, default `0` | Rotates polygonal and spiky families before rope path generation. Clamp in editor actions to `0..360`. |
| `cycleProgress.color` | string | Rope tint, selected through the existing palette-aware color field. |
| `light` | existing optional light object | Preserved as display style lighting. It is no longer nested under or presented as background authoring. |

Removed authored style fields:

| Removed field | Reason |
|---|---|
| `backgroundColor` | No background fill or border/background color split exists. |
| `fillMode` | Non-circular fills are deleted, and cycle progress is always rope-length based. |
| `fillAmount` | Runtime progress comes from cycle state. Static previews render full rope. |
| `invertFill` | Direction is fixed: top start, clockwise progression. |
| `borderColor` | Existing background border override was already ignored by the old styled resolver; no equivalent is introduced. |

Static display-image previews render the cycle-progress rope as full progress so the authored family and color are visible. Runtime rendering uses actual cycle fraction only.

## How

### Runtime algorithm

1. On `create`, acquire one Rope from the display type pool.
2. Add the Rope to `scratch.backgroundAnchor`, because this remains the layer used for visuals behind glyphs.
3. Store the Rope in `scratch.cycleProgressRope` for leak validation.
4. Read the solid strip texture key once from `TextureManager.getSolidStripTexture()`.
5. On each tick:
   - If `spec.hasPhysics` is false or `isRadiusVisible(spec.radius)` is false, hide the rope.
   - Read `spec.style?.cycleProgress`; if absent or family is `none`, hide the rope.
   - Read entity cycle state.
   - If cycle is absent, hide the rope without logging.
   - If cycle exists but `value` or `max` is non-finite, or `max <= 0`, log `[CycleProgressModule] Invalid cycle for entity: <entityId>` and hide the rope.
   - Compute `progressFraction = clamp(value / max, 0, 1)`.
   - Compute the full animated rope polygon for the authored family using the old border geometry formula renamed into cycle-progress geometry files.
   - Derive a progress path whose total length is `progressFraction * fullPerimeterLength`.
   - If the progress path has fewer than two points, hide the rope.
   - Otherwise sync the Rope texture, tint, alpha, width scale, points, and vertices.
6. On `destroy`, remove the Rope from `scratch.backgroundAnchor`, release it to the rope pool, and clear `scratch.cycleProgressRope` if it still references the released Rope.

### Rope geometry algorithm

The old border geometry behavior must be preserved under cycle-progress names:

1. `borderWidthPx = max(2, round(radius * 0.1))`.
2. `outerMaxRadius = radius - borderWidthPx / 2`.
3. Generate 128 outer points from the authored family, rotation, entity seed, pulse value, and time.
4. Use only the outer points. Do not compute or expose an inner polygon for cycle progress.
5. The full rope width is `borderWidthPx`.
6. Full progress uses the same full outer path points as the old BackgroundModule border rope, except the points are rotated to start at the top.

### Top-start, clockwise progress algorithm

The path-length algorithm is deterministic and exact within floating-point tolerance.

1. Treat the rope polygon as a closed polyline: every point connects to the next point, and the last point connects back to the first.
2. Find the top start point as the point on the closed polyline with minimum `y`.
3. If the top is a horizontal segment, choose the point on that segment closest to `x = 0`; if still tied, choose the lower `x`.
4. Split the closed polyline at that start point.
5. Traverse the point order clockwise in screen coordinates. For the generated polygon order, this is the existing increasing point order after the split.
6. Compute total perimeter length, including the closing segment back to the start point.
7. Clamp the requested fraction into `0..1`.
8. If the fraction is `0`, return no points.
9. If the fraction is `1`, return the full split path without appending a duplicate start point. This matches the old BackgroundModule border behavior, which passed the polygon points directly to Phaser Rope without adding a closing duplicate.
10. For partial fractions, walk segments until the target length is reached, then append one interpolated endpoint on the final segment.
11. The returned path length must equal `fraction * perimeter` within `1e-6 * max(perimeter, 1)`.

### Authoring behavior

The display editor must present a `Cycle Progress` section instead of a `Background` section.

The `Cycle Progress` section contains only:

| Field | UI control | Behavior |
|---|---|---|
| `Family` | select | Values: `none`, `circle`, `triangle`, `square`, `hex`, `spiky_circle`. |
| `Family Rotation` | range | Mutates `cycleProgress.familyRotationDeg`, clamped to `0..360`. |
| `Rope Color` | existing `ViewEditorColorField` | Mutates `cycleProgress.color`. Uses the same palette options mechanism as current background color fields. |

The following controls must not appear anywhere in the display view editor:

- `Background`
- `Background Color`
- `Fill Color`
- `Fill Mode`
- `Fill Amount`
- `Invert Direction`

Light controls remain supported but are rendered under a `Light` section, not as background controls. Transfer-node radius controls remain supported but are rendered under their own radius section, not as background controls.

## Files to delete

Delete the entire display-node background module directory:

| File or directory | Required action |
|---|---|
| `src/engine/phaser/display/modules/background/` | Delete the directory and all files inside it. Recreate required geometry under `cycle-progress` names only. |

Delete the old background-specific display export renderer:

| File | Required action |
|---|---|
| `src/engine/phaser/display-export/renderStyledBackgroundCanvas.ts` | Delete. Replace with `renderCycleProgressCanvas.ts`. |

Delete old background authoring UI files:

| File | Required action |
|---|---|
| `src/ui/devtools/editors/view-editor/ViewEditorBackgroundSection.tsx` | Delete. Replace with cycle progress section. |
| `src/ui/devtools/editors/view-editor/ViewEditorBackgroundCoreFields.tsx` | Delete. Replace with cycle progress fields. |
| `src/ui/devtools/editors/view-editor/ViewEditorBackgroundColorsFields.tsx` | Delete. Replace with rope color field. |
| `src/ui/devtools/editors/view-editor/ViewEditorBackgroundRadiusFields.tsx` | Delete. Replace with non-background radius section. |
| `src/ui/devtools/editors/view-editor/ViewEditorBackgroundSection.test.tsx` | Delete. Replace with cycle progress and radius view tests. |
| `src/ui/devtools/editors/blueprint/visuals/BackgroundVisualSection.tsx` | Delete unconditionally. Update every importer to use `ViewEditorCycleProgressSection` through `ViewEditorModal` or remove the importer. |
| `src/ui/devtools/editors/blueprint/visuals/BackgroundVisualSection.types.ts` | Delete with the component. |
| `src/ui/devtools/editors/blueprint/visuals/BackgroundVisualSection.test.tsx` | Delete with the component. |
| `src/ui/devtools/editors/blueprint/visuals/visualsBackgroundActions.ts` | Delete. Replace with cycle-progress/light/radius actions under non-background names. |
| `src/ui/devtools/editors/blueprint/visuals/visualsBackgroundActions.test.ts` | Delete. Replace with action tests under non-background names. |

Delete obsolete runtime tests by deleting their source files with the background module. Do not keep tests for removed fill behavior.

## Files to add

### `src/engine/phaser/display/modules/cycle-progress/CycleProgressModule.ts`

Responsibility: Phaser display module factory for cycle-progress rope rendering.

Interface:

| Export | Contract |
|---|---|
| `CycleProgressModule` | `DisplayModuleFactory` with id `CycleProgressModule`. |

Logic:

- Acquires exactly one Rope.
- Adds it to `scratch.backgroundAnchor`.
- Stores it in `scratch.cycleProgressRope`.
- Hides it initially.
- On tick, resolves style, cycle fraction, geometry, and render request.
- Delegates path computation to cycle-progress geometry/path helpers.
- Delegates Rope mutation to `syncCycleProgressRope`.
- Does not acquire an Image.
- Does not call `TextureManager.getBackgroundFillTexture`.
- Does not mutate ECS state.
- Logs only malformed cycle state, not missing cycle state.

### `src/engine/phaser/display/modules/cycle-progress/cycleProgressRenderModel.ts`

Responsibility: Type-only render model for the rope request.

Interface:

| Type | Fields |
|---|---|
| `CycleProgressRopeRequest` | `textureKey`, `points`, `tint`, `alpha`, `displayWidthPx`. |
| `ResolvedCycleProgressVisual` | `ropeRequest`, `ropeSignature`. |
| `CycleProgressResolverParams` | `entity`, `entityId`, `radius`, `timeMs`, `pulseValue`, `style`, `solidStripTextureKey`. |

Rules:

- `style` is the parsed display style, not raw JSON.
- `ropeRequest` is `null` when no rope should be visible.
- `alpha` is always `1`. This preserves old edge behavior.

### `src/engine/phaser/display/modules/cycle-progress/cycleProgressReader.ts`

Responsibility: Read cycle state from a runtime entity without mutating it.

Interface:

| Export | Contract |
|---|---|
| `readCycleProgress(entity)` | Returns one of three states: absent, valid, or invalid. |

Logic:

- Valid state requires object path `state.cycle`, finite numeric `value`, finite numeric `max`, and `max > 0`.
- Absent state means no `state.cycle` object exists.
- Invalid state means `state.cycle` exists but fails validation.
- Does not read `powerSink`, assignment, storage, display bars, or drained resource state.

### `src/engine/phaser/display/modules/cycle-progress/cycleProgressGeometry.ts`

Responsibility: Compute the full cycle-progress rope path and width.

Interface:

| Export | Contract |
|---|---|
| `CycleProgressFamily` | Enum union: `circle`, `triangle`, `square`, `hex`, `spiky_circle`. `none` is handled before geometry. |
| `computeCycleProgressRopeGeometry(params)` | Returns full outer rope points and `displayWidthPx`. |
| `computeCycleProgressRopeConstants(radius)` | Returns `borderWidthPx` and `outerMaxRadius`. |

Logic:

- Reuse the old mathematical behavior from `backgroundBlobMath` under the new names.
- Do not expose inner polygons, border gaps, fill polygons, or fill clipping helpers.
- Return no points when radius is `<= 0.5`.
- Keep deterministic seeding from `entityId` via existing `stringHash`.
- Preserve family rotation behavior from old `backgroundBlobFamilyMath`.

### `src/engine/phaser/display/modules/cycle-progress/cycleProgressPath.ts`

Responsibility: Convert a closed full rope path into a top-starting progress path by cumulative length.

Interface:

| Export | Contract |
|---|---|
| `resolveCycleProgressPath(points, fraction)` | Returns the path segment for the clamped progress fraction. |
| `measureClosedPathLength(points)` | Returns the full perimeter including closing segment. |
| `findTopPathStart(points)` | Returns the deterministic top start point and source segment index. |

Logic:

- Does not know about Phaser.
- Does not know about entities or styles.
- Handles empty and one-point inputs by returning an empty path.
- Handles fraction `0` by returning an empty path.
- Handles fraction `1` by returning the full split path without appending a duplicate start point.
- Uses interpolation for the final partial segment.

### `src/engine/phaser/display/modules/cycle-progress/cycleProgressRopeRenderer.ts`

Responsibility: Apply a `CycleProgressRopeRequest` to a Phaser Rope.

Interface:

| Export | Contract |
|---|---|
| `hideCycleProgressRope(rope)` | Hides the Rope and resets scale, position, alpha, and dirty state. |
| `syncCycleProgressRope(rope, request)` | Applies texture, tint, alpha, width scale, points, visibility, and vertex update. |

Logic:

- Reuse the current `SOLID_STRIP_BASE_HEIGHT_PX` scale calculation from `backgroundRopeRenderer`.
- Hide requests with fewer than two points.
- Use `setTintFill(false)`, `setColors(tint)`, `setAlpha(alpha)`, and `updateVertices()` as the current border renderer does.

### `src/engine/phaser/display/modules/cycle-progress/cycleProgressVisual.ts`

Responsibility: Resolve runtime inputs into a render model.

Interface:

| Export | Contract |
|---|---|
| `resolveCycleProgressVisual(params)` | Returns `ResolvedCycleProgressVisual`. |

Logic:

- Validates style presence and `cycleProgress.family`.
- Calls `readCycleProgress`.
- Logs malformed cycle state with entity id.
- Computes clamped cycle fraction.
- Computes full rope geometry.
- Computes progress path by length.
- Converts authored color hex to numeric tint.
- Builds a deterministic signature from entity id, radius, time, pulse, style, and progress fraction.

### `src/engine/phaser/display/modules/cycle-progress/cycleProgressVisualKey.ts`

Responsibility: Stable deterministic render signatures.

Interface:

| Export | Contract |
|---|---|
| `toCycleProgressColor(hex)` | Converts `#rrggbb` strings into numeric tint. |
| `buildCycleProgressKey(prefix, payload)` | Hashes a serializable payload using existing `stringHash`. |

Logic:

- Same mechanism as old `backgroundVisualKey`, renamed and scoped to cycle progress.
- Invalid color strings are not corrected here; schema/editor validation owns authored style validity.

### `src/engine/phaser/display/modules/cycle-progress/CycleProgressModule.testUtils.ts`

Responsibility: Shared factories for cycle-progress module tests.

Interface:

| Export | Contract |
|---|---|
| `makeCycleProgressTestCtx(overrides)` | Builds a valid display init/tick context with a Rope pool, solid strip texture, style, and cycle state. |

Logic:

- Reuse existing `makeDisplayScratch` and `makeRope` test helpers.
- Do not include Image pool assertions because the module must not acquire images.
- Factories keep tests readable and Given/When/Then compliant.

### `src/engine/phaser/display-export/renderCycleProgressCanvas.ts`

Responsibility: Draw static cycle-progress rope previews in display image export.

Interface:

| Export | Contract |
|---|---|
| `renderCycleProgressCanvas(ctx, model)` | Draws the full or requested progress rope path onto the display image canvas. |

Logic:

- Uses the same cycle-progress geometry and path helpers.
- Static display image previews use full progress.
- Draws only the rope stroke. It does not fill an interior polygon.
- Translates by `DISPLAY_IMAGE_CANVAS_CENTER`, as current background canvas rendering does.

### `src/ui/devtools/editors/view-editor/ViewEditorCycleProgressSection.tsx`

Responsibility: Render the display editor section for cycle-progress rope authoring.

Interface:

| Prop | Contract |
|---|---|
| `editor` | `ViewEditorAdapter` with non-null `cycleProgress`. |

Logic:

- Renders title `Cycle Progress`.
- Renders family, family rotation, and rope color fields only.
- Uses no business logic beyond invoking adapter callbacks.

### `src/ui/devtools/editors/view-editor/ViewEditorCycleProgressCoreFields.tsx`

Responsibility: Render family and rotation controls.

Interface:

| Prop | Contract |
|---|---|
| `cycleProgress` | Non-null adapter cycle-progress object. |

Logic:

- Family select values are exactly `none`, `circle`, `triangle`, `square`, `hex`, `spiky_circle`.
- Rotation range is `0..360`, step `1`.

### `src/ui/devtools/editors/view-editor/ViewEditorCycleProgressColorFields.tsx`

Responsibility: Render palette-aware rope color selection.

Interface:

| Prop | Contract |
|---|---|
| `cycleProgress` | Non-null adapter cycle-progress object. |
| `paletteOptions` | Existing project palette options. |

Logic:

- Uses `ViewEditorColorField`.
- Label is exactly `Rope Color`.
- Calls `cycleProgress.updateColor`.

### `src/ui/devtools/editors/view-editor/ViewEditorTransferNodeRadiusFields.tsx`

Responsibility: Render transfer-node radius controls that were previously embedded in the background section.

Interface:

| Prop | Contract |
|---|---|
| `radius` | Nullable adapter radius object. |

Logic:

- If radius callbacks are absent, render nothing.
- Labels remain `Radius Min` and `Radius Max`.
- No background terminology appears in this file.

### `src/ui/devtools/editors/blueprint/visuals/visualsCycleProgressActions.ts`

Responsibility: Draft mutation actions for cycle-progress style fields.

Interface:

| Action | Contract |
|---|---|
| `updateCycleProgressFamily(value)` | Writes `style.cycleProgress.family`. |
| `updateCycleProgressFamilyRotation(value)` | Writes clamped `style.cycleProgress.familyRotationDeg`. |
| `updateCycleProgressColor(value)` | Writes `style.cycleProgress.color`. |

Logic:

- Ensures `style.cycleProgress` exists before writing.
- Uses the existing `clamp` helper.
- Does not write removed background fields.

### `src/ui/devtools/editors/blueprint/visuals/visualsLightActions.ts`

Responsibility: Draft mutation actions for style lighting.

Interface:

| Action | Contract |
|---|---|
| `updateLightEnabled(value)` | Creates or deletes `style.light`. |
| `updateLightColor(value)` | Writes `style.light.color`. |
| `updateLightAlpha(value)` | Writes clamped `style.light.alpha`. |
| `updateLightRadiusFactor(value)` | Writes positive `style.light.radiusFactor`. |
| `updateLightBlendMode(value)` | Writes `NORMAL` or `ADD`. |

Logic:

- Moved from old `visualsBackgroundActions` because light is not background authoring.
- Default new light color is `style.cycleProgress.color` when available; otherwise `#ffffff`.

### `src/ui/devtools/editors/blueprint/visuals/visualsRadiusActions.ts`

Responsibility: Draft mutation actions for transfer-node radius fields.

Interface:

| Action | Contract |
|---|---|
| `updateRadiusMin(value)` | Writes `presence.radius.min`. |
| `updateRadiusMax(value)` | Writes `presence.radius.max`. |

Logic:

- Moved from old background actions because radius is not background authoring.

## Files to change

### `src/data/schemas/assets/styles.ts`

Responsibility after change: schema for display visual style, consisting of optional cycle progress and optional light.

Required changes:

- Replace the current rich style fields with `cycleProgress` and `light`.
- Delete `backgroundColor`, `fillMode`, `fillAmount`, `invertFill`, and `borderColor` from accepted style shape.
- Delete the legacy style transform that accepts `{ shape, color, borderColor }`, because it preserves background-era authoring.
- Keep strict object validation so removed fields are rejected.
- Export `DisplayStyle` and `DisplayStyleSchema`.
- Keep `EntityStyle` and `EntityStyleSchema` only as aliases to `DisplayStyle` and `DisplayStyleSchema` to reduce unrelated import churn. These aliases must validate the new shape and must reject old fields.

### `src/data/schemas/assets/styles.test.ts`

Responsibility after change: document schema acceptance and rejection.

Required tests:

- Parses a valid style with `cycleProgress.family`, `familyRotationDeg`, and `color`.
- Defaults `familyRotationDeg` to `0`.
- Accepts `cycleProgress.family = none`.
- Accepts optional `light`.
- Rejects `backgroundColor`.
- Rejects `fillMode`.
- Rejects `fillAmount`.
- Rejects `invertFill`.
- Rejects legacy `{ shape, color }` input.

### `src/data/schemas/assets.ts`

Responsibility after change: export display style schema/type under the new non-background names.

Required changes:

- Export the changed style schema/type.
- Do not export any background-style helper from `styles.ts`.
- Keep exporting scene-level `BackgroundConfigSchema` from `assets/background.ts` because it is out of scope.

### `src/data/schemas/assets/collection.ts`

Responsibility after change: validate asset collections using the new display style schema.

Required changes:

- Replace `EntityStyleSchema` references with the new style schema name, unless an alias is deliberately retained.
- Preserve `settings.background` handling for scene-level biological fog.

### `src/engine/linker/semanticArtSchema.ts`

Responsibility after change: validate `.art` semantic fragments using the new display style schema.

Required changes:

- Replace old style schema imports.
- Preserve scene-level background settings validation.
- Reject `.art` styles containing removed background fields.

### `src/engine/linker/types.ts`

Responsibility after change: expose runtime cartridge asset style type.

Required changes:

- Replace `EntityStyle` with the new style type, or point the alias to the new type.
- Do not expose old background fields.

### `src/engine/phaser/display/types.ts`

Responsibility after change: display runtime type definitions.

Required changes:

- Change `DisplaySpec.style` and `ResolvedDisplayStaticSpec.style` to the new display style type.
- Remove `blobBorderRope` from `DisplayScratch`.
- Add `cycleProgressRope: Phaser.GameObjects.Rope | null` to `DisplayScratch`.
- Leave `backgroundAnchor` and `backgroundImage` unchanged for unrelated modules.

### `src/engine/phaser/display/visual-instance/EntityVisualInstanceHelpers.ts`

Responsibility after change: acquire/release anchors and validate scratch cleanup.

Required changes:

- Initialize `cycleProgressRope` to `null`.
- Remove `blobBorderRope` initialization and leak validation.
- Add `cycleProgressRope` leak validation.

### `src/engine/phaser/display/modules/displayScratchTestUtils.ts`

Responsibility after change: create test scratch objects.

Required changes:

- Replace `blobBorderRope` with `cycleProgressRope`.
- Keep `backgroundImage` because other modules use it.

### `src/engine/phaser/display/DisplayDefinitionCatalog.ts`

Responsibility after change: register module stacks.

Required changes:

- Replace import of `BackgroundModule` with `CycleProgressModule`.
- Replace `BackgroundModule` with `CycleProgressModule` in the attribute-pool/generic node stack.
- Do not change avatar, cave, transfer, or menu stacks unless they directly import BackgroundModule.

### `src/engine/phaser/display/DefaultPlaceholderDisplayDefinition.ts`

Responsibility after change: default display module composition.

Required changes:

- Replace `BackgroundModule` with `CycleProgressModule`.

### `src/engine/phaser/utils/TextureManager.ts`

Responsibility after change: texture manager for active render paths.

Required changes:

- Remove imports of `generateBackgroundFillTexture`, `BackgroundFillTextureHandle`, and `BackgroundFillTextureRequest`.
- Remove `getBackgroundFillTexture`.
- Keep `getSolidStripTexture`; `CycleProgressModule` uses it.

### `src/engine/phaser/display-export/renderResolvedDisplayImage.ts`

Responsibility after change: render static display icon previews.

Required changes:

- Remove `resolveStyledBackgroundRenderModel` and `renderStyledBackgroundCanvas` usage.
- Use cycle-progress preview rendering when `style.cycleProgress` exists and family is not `none`.
- Preview progress fraction is always `1`.
- Preserve glyph and light rendering order: light first, cycle-progress rope second, glyphs third.
- Preserve placeholder fallback only when there is no glyph and no style-driven visual.

### `src/engine/phaser/display-export/renderResolvedDisplayImage.test.ts`

Responsibility after change: verify static preview wiring.

Required changes:

- Mock/use cycle-progress preview renderer instead of background renderer.
- Assert static previews call cycle-progress rendering for styled displays.
- Assert no background renderer is referenced.
- Preserve canvas sizing and placeholder fallback tests.

### `src/engine/phaser/display-export/renderDisplayStyleLightCanvas.ts`

Responsibility after change: display style light rendering.

Required changes:

- Read light from the new display style shape.
- Do not refer to background text in titles, errors, comments, or tests.

### `src/ui/devtools/editors/view-editor/ViewEditor.types.ts`

Responsibility after change: view-editor adapter contract.

Required changes:

- Remove the `background` adapter object.
- Add `cycleProgress`, nullable, with fields `family`, `familyRotationDeg`, `color`, and update callbacks.
- Add `light`, nullable or always present, with existing light fields and callbacks.
- Add `transferNodeRadius`, nullable, with existing radius min/max fields and callbacks.
- Preserve `glyph`, `projectDefaults`, and `preview` contracts.

### `src/ui/devtools/editors/view-editor/ViewEditorModal.tsx`

Responsibility after change: compose view-editor sections.

Required changes:

- Replace `ViewEditorBackgroundSection` with `ViewEditorCycleProgressSection`.
- Render `ViewEditorLightSection` from `editor.light`.
- Render `ViewEditorTransferNodeRadiusFields` from `editor.transferNodeRadius`.
- No visible `Background` label may remain.

### `src/ui/devtools/editors/view-editor/ViewEditorLightSection.tsx`

Responsibility after change: render style lighting controls.

Required changes:

- Accept `light`, not `background`.
- Update titles to say `display light` or `light halo`, not `background light`.
- Use existing `ViewEditorColorField` and palette options.

### `src/ui/devtools/editors/assets/display/buildDisplayAssetViewEditor.ts`

Responsibility after change: adapt display asset drafts into `ViewEditorAdapter`.

Required changes:

- Map `styleDraft.cycleProgress` to `editor.cycleProgress`.
- Map `styleDraft.light` to `editor.light`.
- Map transfer-node radius callbacks to `editor.transferNodeRadius`.
- Use renamed action objects.
- Remove all background adapter keys.

### `src/ui/devtools/editors/assets/display/useDisplayViewEditor.ts`

Responsibility after change: wire display asset view editor state and actions.

Required changes:

- Import cycle-progress, light, and radius actions instead of background actions.
- Ensure resource and attribute-pool style assets contain a default `cycleProgress` object when the visual editor is opened.
- Do not write removed background fields.

### `src/ui/devtools/editors/blueprint/visuals/buildBlueprintViewEditor.ts`

Responsibility after change: adapt blueprint visual drafts into `ViewEditorAdapter`.

Required changes:

- Same adapter mapping as display asset view editor.
- Keep radius controls, but outside cycle progress.

### `src/ui/devtools/editors/blueprint/visuals/useBlueprintVisualsEditor.ts` and related action wiring files

Responsibility after change: provide renamed visual editor action groups.

Required changes:

- Replace old background action creation with cycle-progress, light, and radius action creation.
- Ensure style assets have default cycle progress before mutation.
- Preserve existing glyph action behavior.

### `src/ui/devtools/editors/view-editor/viewEditorAssetLinking.ts`

Responsibility after change: ensure linked display style and glyph assets exist.

Required changes:

- Replace default style with the new display style shape.
- Default `cycleProgress.family` is `circle`.
- Default `cycleProgress.familyRotationDeg` is `0`.
- Default `cycleProgress.color` is `#ffffff`.
- Keep glyph defaults unchanged.

### `src/ui/devtools/editors/blueprint/visuals/blueprintVisualsAssetDraft.ts`

Responsibility after change: read and ensure blueprint visual drafts.

Required changes:

- Use the new display style schema and default shape.
- Remove any references to background fields.

### `src/ui/devtools/editors/blueprint/visuals/blueprintVisualsAssetById.ts`

Responsibility after change: ensure display style assets by id.

Required changes:

- Use the new display style default.
- Remove old background fields from defaults.

### `src/data/raw/example/modules/assets.art`

Responsibility after change: canonical example asset data.

Required changes:

- Replace each old style object with the new style object.
- Remove `backgroundColor`, `fillMode`, `fillAmount`, `invertFill`, and `borderColor` from every style.
- Preserve only equivalent cycle-progress fields: family, rotation, and rope color.
- When old data had `backgroundColor`, use that value as the new `cycleProgress.color` because old full rope edge color came from the background/interior color.
- When old data lacked `backgroundColor`, use the old `color` as the new `cycleProgress.color`.
- Delete no unrelated glyphs, displays, vein settings, glyph view settings, or scene-level background settings.

### All tests and helpers containing `blobBorderRope`

Responsibility after change: align scratch helpers with the new rope slot.

Required changes:

- Replace `blobBorderRope` expectations with `cycleProgressRope` where they refer to the new module.
- Remove `blobBorderRope` from unrelated test scratch factories.

Known grep hits that must be resolved:

- `src/engine/phaser/display/types.ts`
- `src/engine/phaser/display/visual-instance/EntityVisualInstanceHelpers.ts`
- `src/engine/phaser/display/modules/displayScratchTestUtils.ts`
- `src/engine/phaser/display/modules/background/**` by deletion
- `src/engine/phaser/display/modules/transfer/TransferDisplayModule.testUtils.ts`
- Any other test utility that constructs a full `DisplayScratch`

## Testing plan

All tests must follow Given/When/Then or AAA structure and use factories for setup.

### Unit tests: cycle-progress geometry

File: `src/engine/phaser/display/modules/cycle-progress/cycleProgressGeometry.test.ts`

Required cases:

1. Given radius `100`, when constants are computed, then width is `10` and outer max radius is `95`.
2. Given small radius `10`, when constants are computed, then width is clamped to `2`.
3. Given radius `0.5`, when geometry is computed, then no rope points are returned.
4. Given the same entity id, time, pulse, family, and radius twice, then geometry is identical.
5. Given different pulse values, then at least one rope point differs.
6. Given each family, then geometry returns 128 points for visible radius.
7. Given polygon and spiky families with different rotations, then geometry changes deterministically.
8. Given `circle` and `triangle`, then geometry materially differs.

### Unit tests: cycle-progress path length

File: `src/engine/phaser/display/modules/cycle-progress/cycleProgressPath.test.ts`

Required cases:

1. Given empty points, when resolving progress, then output is empty.
2. Given one point, when resolving progress, then output is empty.
3. Given a square closed path, when finding top start, then start is on the minimum-y edge and closest to `x = 0`.
4. Given a square path and fraction `0`, then output is empty.
5. Given a square path and fraction `0.25`, then measured output length equals 25% of perimeter within tolerance.
6. Given a square path and fraction `0.5`, then measured output length equals 50% of perimeter within tolerance.
7. Given a square path and fraction `1`, then output contains the full split path without a duplicate final start point.
8. Given fractions below `0` or above `1`, then they clamp to `0` and `1`.
9. Given a generated spiky-circle path and fraction `0.37`, then output length equals 37% of perimeter within tolerance.
10. Given a generated path, then the first output point is the deterministic top start.

### Unit tests: cycle reader

File: `src/engine/phaser/display/modules/cycle-progress/cycleProgressReader.test.ts`

Required cases:

1. Missing `state.cycle` returns absent.
2. Finite `value` and positive finite `max` returns valid.
3. Non-finite value returns invalid.
4. Non-finite max returns invalid.
5. `max <= 0` returns invalid.
6. Reader does not inspect `powerSink`, storage, assignment, or display bars.

### Unit tests: visual resolver

File: `src/engine/phaser/display/modules/cycle-progress/cycleProgressVisual.test.ts`

Required cases:

1. Missing style returns no rope request.
2. Missing `cycleProgress` returns no rope request.
3. Family `none` returns no rope request.
4. Missing cycle returns no rope request and does not log.
5. Invalid cycle returns no rope request and logs the entity id.
6. Valid half cycle returns a rope request whose path length is half the full perimeter.
7. Full cycle returns the full split rope path without a duplicate final start point and with the same width formula as the old edge geometry.
8. Authored rope color is converted to numeric tint.
9. Signature changes when cycle fraction changes.
10. Signature changes when animated time or pulse changes.

### Unit tests: rope renderer

File: `src/engine/phaser/display/modules/cycle-progress/cycleProgressRopeRenderer.test.ts`

Required cases:

1. Fewer than two points hides the Rope and does not set points.
2. Valid request applies texture, tint, alpha, scale, points, visibility, and vertex update.
3. Width scale uses `displayWidthPx / SOLID_STRIP_BASE_HEIGHT_PX` with minimum denominator protection.
4. Hide resets visibility, scale, position, alpha, and dirty state.

### Unit tests: CycleProgressModule

File: `src/engine/phaser/display/modules/cycle-progress/CycleProgressModule.test.ts`

Required cases:

1. Create acquires exactly one Rope and no Image.
2. Create adds the Rope to `scratch.backgroundAnchor` and stores it in `scratch.cycleProgressRope`.
3. No physics hides the Rope.
4. Invisible radius hides the Rope.
5. Missing cycle hides the Rope without logging.
6. Invalid cycle hides the Rope and logs.
7. Valid cycle syncs the Rope.
8. Changing cycle fraction resyncs the Rope.
9. Changing only unrelated entity fields does not resync when signature is unchanged.
10. Destroy removes and releases the Rope and clears `scratch.cycleProgressRope`.

### Unit tests: schemas

File: `src/data/schemas/assets/styles.test.ts`

Required cases are listed in the file-specific section above. These tests must explicitly prove old background fields are rejected.

### Unit tests: display image export

Files:

- `src/engine/phaser/display-export/renderCycleProgressCanvas.test.ts`
- `src/engine/phaser/display-export/renderResolvedDisplayImage.test.ts`

Required cases:

1. Canvas renderer strokes only the rope path and never fills an interior polygon.
2. Static preview uses full progress.
3. Resolved display image calls cycle-progress renderer for styles with cycle progress.
4. Resolved display image does not call or import any background renderer.
5. Light, cycle-progress, and glyph render in that order.
6. Placeholder fallback remains for unstyled displays without glyphs.

### View tests

Files:

- `src/ui/devtools/editors/view-editor/ViewEditorCycleProgressSection.test.tsx`
- `src/ui/devtools/editors/view-editor/ViewEditorLightSection.test.tsx`
- `src/ui/devtools/editors/view-editor/ViewEditorTransferNodeRadiusFields.test.tsx`
- Existing display/blueprint view-editor tests updated for new adapter keys.

Required cases:

1. Cycle progress section renders `Cycle Progress`.
2. Family select shows exactly `none`, `circle`, `triangle`, `square`, `hex`, and `spiky_circle`.
3. Rope color field renders using palette-aware color control.
4. Changing family calls `updateFamily`.
5. Changing rotation calls `updateFamilyRotation`.
6. Changing rope color calls `updateColor`.
7. The view editor does not render `Background`, `Background Color`, `Fill Color`, `Fill Mode`, `Fill Amount`, or `Invert Direction`.
8. Light section labels do not mention background.
9. Radius fields render independently from cycle progress.

### Action tests

Files:

- `src/ui/devtools/editors/blueprint/visuals/visualsCycleProgressActions.test.ts`
- `src/ui/devtools/editors/blueprint/visuals/visualsLightActions.test.ts`
- `src/ui/devtools/editors/blueprint/visuals/visualsRadiusActions.test.ts`

Required cases:

1. Cycle progress actions create `style.cycleProgress` when missing.
2. Family action writes only `cycleProgress.family`.
3. Rotation action clamps to `0..360`.
4. Color action writes only `cycleProgress.color`.
5. Light actions preserve existing behavior without referencing background.
6. Radius actions preserve existing behavior without referencing background.
7. No action writes `backgroundColor`, `fillMode`, `fillAmount`, or `invertFill`.

### Registry and deletion tests

Required tests or assertions:

1. `DisplayDefinitionCatalog` includes `CycleProgressModule` where `BackgroundModule` used to be.
2. Default placeholder definition includes `CycleProgressModule`.
3. No test imports `BackgroundModule`.
4. No source file under `src/engine/phaser/display/modules` imports from `modules/background`.
5. No source file imports `renderStyledBackgroundCanvas`.
6. No source file references `blobBorderRope`.

A final grep check must be run before completion:

| Forbidden term | Allowed exceptions |
|---|---|
| `BackgroundModule` | none |
| `ViewEditorBackground` | none |
| `BackgroundVisual` | none |
| `visualsBackgroundActions` | none |
| `blobBorderRope` | none |
| `backgroundFill` | none |
| `backgroundStyled` | none |
| `backgroundUnstyled` | none |
| `fillMode` | none in display style or view editor; unrelated domain uses require explicit review |
| `fillAmount` | none in display style or view editor; unrelated domain uses require explicit review |
| `invertFill` | none |
| `backgroundColor` | allowed only for CSS/style object properties and unrelated UI styling; not allowed in display visual schema/editor |

## Acceptance criteria

Implementation is complete only when all of the following are true.

1. The project has no display-node `BackgroundModule` runtime code.
2. The project has no display-node background authoring UI.
3. The project has no display-style background fill fields.
4. `CycleProgressModule` renders a top-starting clockwise rope segment by cumulative path length.
5. Full cycle progress visually matches the old BackgroundModule border edge geometry and width.
6. Partial cycle progress has measured path length equal to the clamped cycle fraction times full perimeter.
7. Missing cycle state hides the rope without logging.
8. Malformed cycle state hides the rope and logs loudly.
9. The display editor exposes cycle-progress rope family and rope color only.
10. Light and radius authoring remain available outside background terminology.
11. No deleted behavior is preserved through compatibility shims.
12. All unit and view tests described above are implemented and pass.
13. Existing unrelated biological fog background config and rendering still passes its tests.
14. No lint, type, or Sonar issue is introduced.

## Non-goals

The following are explicitly out of scope.

1. Changing scene-level biological fog background config or rendering.
2. Adding a track rope behind the progress rope.
3. Adding authored rope thickness.
4. Adding authored progress amount for runtime. Runtime progress comes from entity cycle state; preview uses full progress.
5. Adding direction authoring. Direction is fixed to clockwise from top.
6. Migrating old background authoring at runtime. Source fixture data must be updated; old fields are rejected.
7. Refactoring unrelated display modules.
