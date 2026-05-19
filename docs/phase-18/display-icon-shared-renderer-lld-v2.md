# LLD — Shared Styled Display Rendering for Runtime and UI Export

## 1. Purpose

Implement a single semantic rendering contract for styled display backgrounds and glyph placement so that:

- runtime rendering and UI export derive from the same geometry and placement rules
- UI icons match the authored display style seen in the game and in the display preview
- the display editor can select `none` as a background family, which means no background is rendered
- obsolete export-only rendering detritus is removed

This design is constrained by the existing architecture and testing contract:

- runtime state remains in the runtime/ECS; UI continues to observe only exported semantic results
- no new React-side business logic is introduced
- scope is limited to the display icon mismatch and the code directly responsible for it

## 2. Why this change is required

The current implementation uses two different rendering paths for the same authored display data.

### 2.1 Current runtime path

Styled in-game backgrounds are resolved by the runtime background module and already use the shared polygon and fill helpers:

- `engine/phaser/display/modules/backgroundModuleRuntime.ts`
- `engine/phaser/display/modules/backgroundBlobMath.ts`
- `engine/phaser/display/modules/backgroundStyledCoverage.ts`
- `engine/phaser/display/modules/backgroundStyledRenderer.ts`
- `engine/phaser/display/modules/glyphModuleRuntime.ts`
- `engine/phaser/display/glyph/glyphRenderMath.ts`

This path honors:

- blob family geometry
- `familyRotationDeg`
- fill mode and fill fraction
- default border and interior behavior
- glyph placement based on display radius

### 2.2 Current UI export path

Resolved display icons are exported through a separate bespoke canvas path:

- `engine/phaser/display-export/renderResolvedDisplayImage.ts`
- `engine/phaser/display-export/drawDisplayBackground.ts`

This path does not share the runtime rendering contract. It currently:

- draws simplified hard-coded background shapes instead of blob polygons
- does not apply `familyRotationDeg`
- does not apply styled fill coverage through `fillMode`, `fillAmount`, and `invertFill`
- computes glyph transforms with a hard-coded radius of `30`

### 2.3 Consequence

Because the UI export path does not reuse the same semantic rendering rules as the runtime path, the UI can drift from the in-game display. The reported symptoms are direct manifestations of that divergence:

- glyphs appear too small relative to the background
- the background edge is not wavy
- the background is not rotated correctly
- fill ignores authored display data

Separately, the editor already permits `family: "none"` at the schema/runtime level, but the display editor family selector does not expose that value. The current gap is therefore editor wiring, not schema or renderer support.

## 3. Scope

### 3.1 In scope

- styled background geometry and fill semantics for resolved display icons
- glyph placement semantics for resolved display icons
- alignment of static export radius/preview constants
- removal of obsolete or empty files directly superseded by this design
- tests for the new shared contract and the existing public export contract
- exposing the already-supported `none` family in the display editor family selector

### 3.2 Out of scope

The following remain unchanged:

- body avatar export
- attribute display export
- unstyled runtime band rendering for gameplay blobs
- live runtime fill state for UI icons derived from entity cycle/absorption state
- placeholder art generation logic
- React hooks, component props, and store contracts
- any unrelated refactor or opportunistic cleanup

## 4. Contract-preserving decisions

### 4.1 Public request/export contract remains unchanged

The following interfaces remain unchanged:

- `DisplayImageRequest` in `engine/phaser/display-export/DisplayImageExportTypes.ts`
- `DisplayImageExportService.getImageUrl(...)`
- `buildDisplayImageRequest(...)`
- `useDisplayImageUrl(...)`
- `useResolvedDisplayIcon(...)`
- `GameIcon`

No caller must change its request shape.

### 4.2 Rendering remains deterministic and static

Resolved display icon export remains a deterministic static render.

For styled display icon export:

- time is fixed
- pulse is fixed
- no runtime entity state is introduced into the request contract

This preserves the current export semantics while replacing the incorrect geometry/fill logic with the runtime-equivalent static contract.

### 4.3 Shared renderer means shared semantic model, not a monolithic new subsystem

The design does not introduce a new generalized scene renderer.

Instead, it introduces two small shared semantic model resolvers:

- one for styled backgrounds
- one for glyph placements

Runtime and canvas export become thin backends over those shared models.

That is the minimum change that satisfies the requirement without speculative generalization.

### 4.4 No schema or action contract change is required for `none`

The `none` family already exists in `data/schemas/assets/styles.ts`.

The runtime styled background path already treats `family === "none"` as "render no background" in `engine/phaser/display/modules/backgroundModuleRuntime.ts`.

The remaining missing contract is only that the display editor family selector must expose `none` as a selectable value.

No change is required to:

- `EntityStyleSchema`
- display-editor style mutation actions
- display-editor style persistence

This keeps the change minimal and contract-preserving.

## 5. Design overview

### 5.1 High-level structure

The implementation will be split into three layers.

#### Layer A — shared semantic model resolvers

Pure functions that transform authored style or glyph data into backend-agnostic render models.

#### Layer B — backends

Thin drawing adapters that consume the shared render models:

- Phaser `Graphics` backend for runtime styled backgrounds
- Canvas 2D backend for export styled backgrounds
- existing Phaser `Image` pool backend for runtime glyphs, now fed by a shared glyph placement model
- existing canvas glyph drawing path for export, now fed by a shared glyph placement model

#### Layer C — unchanged public orchestration

Existing public callers continue to call:

- `renderBackground(...)` at runtime
- `renderResolvedDisplayImage(...)` for export
- `DisplayImageExportService.getImageUrl(...)` from the UI

## 6. Canonical static icon render contract

A single static contract will be used by both export and display-preview setup.

### 6.1 Constants

A new constants file will define the canonical static icon render values:

- canvas size: `128`
- canvas center: `64`
- resolved display icon radius: `60`
- preview/export entity id: `__display_preview__`
- static export time: `0`
- static export pulse value: `0`

### 6.2 Reason for each value

- `128` and `64` are already the export canvas contract in `renderResolvedDisplayImage.ts`
- radius `60` is already the preview/display runtime contract in `createDisplayAssetPreviewRuntime.ts`
- `__display_preview__` is already the preview entity identity in `createDisplayAssetPreviewRuntime.ts`
- fixed time and pulse preserve the existing static export behavior

These values will be centralized and reused instead of being duplicated.

## 7. File-by-file design

## 7.1 New file — `engine/phaser/display-export/displayImageRenderConstants.ts`

### Responsibility

Provide the canonical static icon render constants used by both export and display-preview runtime setup.

### Logic

This file contains constants only. No branching, no side effects, and no runtime state.

### Interface

It exports the following named constants:

- resolved display icon canvas size
- resolved display icon canvas center
- resolved display icon radius
- resolved display preview/export entity id
- resolved display static time
- resolved display static pulse value

### Rationale

This removes duplicated magic numbers and ensures export and preview refer to the same static render contract.

---

## 7.2 New file — `engine/phaser/display/modules/resolveStyledBackgroundRenderModel.ts`

### Responsibility

Resolve the authored styled background into a backend-agnostic render model.

### Logic

Input:

- entity id
- radius
- time in milliseconds
- pulse value
- style
- optional fill-fraction override

Behavior:

1. If the style family is `none`, return no model.
2. If the radius is not drawable, return no model.
3. Compute outer and inner polygons using:
   - `computeBlobPolygons(...)`
   - `computeDerivedBlobConstants(...)`
4. Resolve the effective fill fraction as follows:
   - use the explicit override when supplied
   - otherwise, if `fillMode` is `solid`, use `1`
   - otherwise, use `style.fillAmount`
5. Compute the fill polygon using `resolveStyledFillPolygon(...)` over the inner polygon.
6. Resolve default visual values exactly as the current runtime styled path does:
   - interior color defaults to `#e6ddea` when `backgroundColor` is absent
   - interior alpha is fixed at `0.85`
   - fill color is `style.color`
   - fill alpha is `style.alpha`
   - border color defaults to `#f6f1e9` when `borderColor` is absent
   - border alpha is `1`
7. Return a complete immutable render model.

### Interface

Input contract:

- one argument object with the fields listed above

Output contract:

- either no model
- or a model containing:
  - outer polygon points
  - inner polygon points
  - fill polygon points
  - border width in pixels
  - interior color and alpha
  - fill color and alpha
  - border color and alpha

### Existing utilities reused

- `computeBlobPolygons(...)`
- `computeDerivedBlobConstants(...)`
- `resolveStyledFillPolygon(...)`
- `backgroundPolygon.Point`

### Notes

This file is the semantic source of truth for styled display background rendering across runtime and export.

---

## 7.3 Change — `engine/phaser/display/modules/backgroundStyledRenderer.ts`

### Responsibility after change

Act only as the Phaser `Graphics` backend for a previously resolved styled background render model.

### Logic after change

The file will no longer compute fill coverage or default colors itself.

It will:

1. clear the three graphics objects
2. draw the interior using the model’s inner polygon, interior color, and interior alpha
3. draw the fill overlay using the model’s fill polygon, fill color, and fill alpha
4. draw the border using the model’s outer polygon, border width, border color, and border alpha

If no model is supplied, it clears all three graphics objects and returns.

### Interface after change

Input contract:

- Phaser graphics objects for mask, fill, and border
- one resolved styled background render model or no model

Output contract:

- no return value
- graphics state is fully rewritten from the model on every call

### Existing utilities reused

- `tracePolygon(...)`

### Behavior that must not change

- Phaser runtime visual output for the styled path must remain semantically identical to the current runtime contract

---

## 7.4 Change — `engine/phaser/display/modules/backgroundModuleRuntime.ts`

### Responsibility after change

Continue to own runtime-only fill-fraction resolution, but delegate styled background geometry and drawing to the shared model resolver and the Phaser backend.

### Logic after change

For the styled path only:

1. keep `readStyledFillFraction(...)` exactly as the runtime rule for dynamic fill resolution
2. build a styled background render model by calling the new resolver with:
   - runtime entity id
   - runtime radius
   - runtime time
   - runtime pulse value
   - runtime style
   - the fill fraction returned by `readStyledFillFraction(...)`
3. render the resulting model through `backgroundStyledRenderer.ts`

For the unstyled path:

- keep the existing band-selection and blob rendering path unchanged

### Interface after change

Unchanged public signature.

### Behavior that must not change

- runtime banded backgrounds for non-styled displays remain unchanged
- dynamic styled fill behavior remains unchanged
- `familyRotationDeg` and blob-family geometry continue to come from the existing blob helpers

---

## 7.5 New file — `engine/phaser/display/modules/resolveGlyphPlacementRenderModel.ts`

### Responsibility

Resolve ordered glyph placement data into backend-agnostic draw instructions.

### Logic

Input:

- glyph configuration
- render radius
- optional palette colors
- default line thickness
- a pulse-value reader callback

Behavior:

1. iterate the glyph placements in their existing array order
2. for each placement, compute the pulse value through the supplied callback
3. clamp pulse into the existing valid range `[0, 1]`
4. compute transform using `resolveGlyphPlacementTransform(...)`
5. resolve the display color using `resolveGlyphPlacementColor(...)`
6. resolve line thickness using placement thickness or the supplied default
7. emit one immutable draw instruction per placement

### Interface

Input contract:

- one argument object with the fields listed above

Output contract:

- an ordered array of draw instructions
- each draw instruction contains:
  - slot index
  - glyph shape
  - resolved display color
  - resolved line thickness
  - x position in pixels
  - y position in pixels
  - image scale
  - rotation in degrees

### Existing utilities reused

- `resolveGlyphPlacementTransform(...)`
- `resolveGlyphPlacementColor(...)`

### Notes

The resolver does not perform texture lookup, image pooling, or drawing. It only resolves the semantic placement contract.

---

## 7.6 Change — `engine/phaser/display/modules/glyphModuleRuntime.ts`

### Responsibility after change

Continue to own Phaser image-pool and glow rendering behavior, but consume the shared glyph placement render model instead of computing transforms inline.

### Logic after change

1. preserve the existing early return when the radius is not visible
2. fetch the glyph configuration from the registry exactly as before
3. resolve placement draw instructions through the new shared resolver
4. for each resolved instruction:
   - resolve the glow texture using the instruction’s shape and line thickness with white color
   - resolve the main texture using the instruction’s shape, resolved display color, and line thickness
   - apply the existing glow behavior using the shared transform data from the instruction
   - apply the main image transform using the shared transform data from the instruction
5. hide all unused slots exactly as before

### Interface after change

No public signature change.

### Behavior that must not change

- image pool usage
- glow layer count and order
- visibility handling for unused slots
- behavior when the radius is not visible
- destruction and release behavior

---

## 7.7 New file — `engine/phaser/display-export/renderStyledBackgroundCanvas.ts`

### Responsibility

Act as the Canvas 2D backend for a previously resolved styled background render model.

### Logic

Input:

- canvas 2D context
- one resolved styled background render model

Behavior:

1. do nothing when no model is supplied
2. save the canvas state
3. translate to the canonical icon center
4. draw the interior using the inner polygon, interior color, and interior alpha
5. draw the fill polygon using the fill color and fill alpha
6. draw the border using the outer polygon, border width, border color, and border alpha
7. restore the canvas state

### Interface

Input contract:

- canvas 2D context
- one resolved styled background render model or no model

Output contract:

- no return value
- only the current canvas drawing state is mutated

### Existing utilities reused

- `tracePolygon(...)`
- the browser canvas path API, which already satisfies the `Traceable` shape needed by `tracePolygon(...)`

### Behavior that must not change

- export remains canvas-based and synchronous inside the existing service call

---

## 7.8 Change — `engine/phaser/display-export/renderResolvedDisplayImage.ts`

### Responsibility after change

Orchestrate deterministic static export for resolved display icons by delegating geometry/placement semantics to the new shared resolvers and delegating background drawing to the canvas backend.

### Logic after change

1. size the canvas using the shared static icon constants
2. clear the canvas
3. when a style is present:
   - resolve the styled background render model using the shared resolver
   - use the canonical static icon entity id, radius, time, and pulse constants
   - do not pass a fill-fraction override, so authored display data remains the source of truth for static icon fill
   - draw the model using the canvas backend
4. resolve the glyph key exactly as today
5. when a glyph exists:
   - resolve shared glyph placement draw instructions using the canonical static icon radius and a pulse callback that always returns `0`
   - for each instruction, read the texture via the existing `TextureManager` path and draw it to the canvas using the resolved transform
6. when no glyph exists and style is `null`, preserve the existing placeholder fallback behavior
7. return `canvas.toDataURL()` exactly as today

### Interface after change

No public signature change.

### Behavior that must not change

- placeholder fallback contract
- glyph palette color handling
- default line thickness handling
- data URL export contract
- synchronous render semantics inside the existing export service

### Behavior that changes intentionally

- background geometry now matches runtime styled geometry
- background rotation now matches runtime styled rotation
- static authored fill now matches runtime styled fill semantics
- glyph placement scale now uses the same radius contract as the display preview

---

## 7.9 Change — `ui/devtools/editors/view-editor/createDisplayAssetPreviewRuntime.ts`

### Responsibility after change

Use the shared static icon/display-preview constants instead of duplicating the preview entity id and radius inline.

### Logic after change

Replace the local hard-coded values with imports from the new constants file.

Specifically:

- the preview entity/blueprint id constant becomes the shared preview/export entity id constant
- the display radius and physics radius both use the shared icon/display-preview radius constant

### Interface after change

No public signature change.

### Behavior that must not change

- preview runtime still creates a single preview entity
- preview runtime still ticks exactly as it does today
- only the source of the constants changes

---

## 7.10 Change — `ui/devtools/editors/view-editor/ViewEditorBackgroundSection.tsx`

### Responsibility after change

Expose the full authored background-family contract for the display editor family selector, including `none`.

### Logic after change

1. Add `none` to the rendered family option list in the Family `<select>`.
2. Keep the option list otherwise unchanged and in a deterministic order.
3. Keep the selected value bound to `background.family`.
4. Keep the existing `background.updateFamily(...)` callback wiring unchanged.
5. Do not add new editor-side rendering logic. Selecting `none` only mutates the existing style field; preview and export render no background because the renderer contract already interprets `family === "none"` as "no background model".
6. Do not clear or mutate any other background fields when `none` is selected. Existing values for rotation, colors, alpha, and fill remain persisted and become visually inactive until a drawable family is selected again.

### Interface after change

Props contract remains unchanged.

Rendered family option contract becomes:

- `none`
- `circle`
- `triangle`
- `square`
- `hex`
- `spiky_circle`

### Behavior that must not change

- the component remains presentation-only
- the component continues to delegate mutations through the supplied adapter callbacks
- no business logic moves into `.tsx`
- all non-family controls remain wired exactly as they are today

### Why this file changes and others do not

`ViewEditorBackgroundSection.tsx` is the concrete display-editor UI that renders the family selector.

No change is required in:

- `data/schemas/assets/styles.ts`, because `none` is already part of `STYLE_FAMILIES`
- `visualsBackgroundActions.ts`, because it already passes the selected family value through unchanged
- `buildDisplayAssetViewEditor.ts` and `useDisplayViewEditor.ts`, because they already surface and persist the style family field without constraining its value

---

## 7.11 Remove — `engine/phaser/display-export/drawDisplayBackground.ts`

### Reason for removal

This file is the obsolete bespoke export-only background renderer.

After the new shared background model and canvas backend are introduced, this file has no remaining valid caller and retaining it would preserve the exact divergence this change is meant to eliminate.

### Cleanup requirement

- remove the file
- remove all imports that reference it
- ensure there is no dead export path remaining

---

## 7.12 Remove — `engine/phaser/display-export/bindDisplayImageExportService.ts`

### Reason for removal

This file is an empty unused placeholder and has no callers.

It is detritus in the same feature area and should be removed as part of this cleanup.

### Cleanup requirement

- remove the file
- confirm there are no imports or references

## 8. Detailed semantic rules

## 8.1 Styled background semantic rules

The shared styled background model is authoritative for both runtime styled rendering and export styled rendering.

### Geometry rules

- geometry must be produced only by `computeBlobPolygons(...)`
- `familyRotationDeg` must always be passed through
- border width must be derived only by `computeDerivedBlobConstants(...)`
- no hard-coded square/triangle/hex/circle canvas geometry may remain in the export path

### Fill rules

- solid fill always resolves to full coverage
- non-solid export fill resolves from authored `fillAmount`
- runtime may override fill fraction through the existing runtime fill reader
- `invertFill` and `fillMode` must always be resolved through `resolveStyledFillPolygon(...)`

### Color and alpha rules

- interior uses `backgroundColor` when authored, otherwise `#e6ddea`
- interior alpha is fixed at `0.85`
- styled fill uses `style.color`
- styled fill alpha uses `style.alpha`
- border uses `borderColor` when authored, otherwise `#f6f1e9`
- border alpha is fixed at `1`

## 8.2 Glyph semantic rules

The shared glyph placement model is authoritative for both runtime glyph placement and export glyph placement.

### Placement rules

- placement transform must be produced only by `resolveGlyphPlacementTransform(...)`
- export glyph placement must use the canonical icon/display-preview radius
- runtime glyph placement must use `ctx.spec.radius`
- slot ordering must remain the existing placement array order
- no placement instruction may be fabricated for a missing slot

### Color and thickness rules

- main glyph color must be resolved only by `resolveGlyphPlacementColor(...)`
- line thickness must come from the placement override when authored, otherwise from the default line thickness contract already carried by the glyph registry/export request

### Pulse rules

- runtime continues to supply per-placement pulse values through the pulse engine and the glyph delay configuration
- export uses a constant pulse value of `0`

## 9. Cleanup and detritus policy

Only detritus directly superseded by this change will be removed.

### Files removed

- `engine/phaser/display-export/drawDisplayBackground.ts`
- `engine/phaser/display-export/bindDisplayImageExportService.ts`

### Files intentionally not added or changed for the `none` editor feature

The following files already satisfy the contract and must remain unchanged:

- `data/schemas/assets/styles.ts`
- `ui/devtools/editors/assets/display/buildDisplayAssetViewEditor.ts`
- `ui/devtools/editors/assets/display/useDisplayViewEditor.ts`
- `ui/devtools/editors/blueprint/visuals/visualsBackgroundActions.ts`

### Duplicated constants removed

The following inline constants will no longer remain duplicated after the change:

- preview/export display radius in `createDisplayAssetPreviewRuntime.ts`
- preview/export entity id in `createDisplayAssetPreviewRuntime.ts`
- export canvas sizing literals in `renderResolvedDisplayImage.ts`

### Explicit non-cleanup

No unrelated engine, UI, or editor cleanup is permitted in this task.

## 10. Test design

The tests must follow the existing testing standards: behavior-focused, readable, deterministic, and colocated.

## 10.1 New unit test — `engine/phaser/display/modules/resolveStyledBackgroundRenderModel.test.ts`

### Cases

1. returns no model when the style family is `none`
2. returns full fill coverage for `solid` without an override
3. uses authored `fillAmount` for non-solid export-style resolution when no override is supplied
4. uses the explicit override when supplied, proving runtime dynamic fill can override authored fill
5. changes outer geometry deterministically when `familyRotationDeg` changes
6. applies runtime default colors and fixed alphas exactly

### Purpose

Prove that the shared styled background semantic contract is correct and deterministic.

## 10.2 New unit test — `engine/phaser/display/modules/resolveGlyphPlacementRenderModel.test.ts`

### Cases

1. preserves placement slot order
2. applies palette color overrides when present
3. falls back to the supplied default line thickness when a placement omits thickness
4. changes transform deterministically when the pulse callback changes
5. returns no extra instructions for absent placements

### Purpose

Prove that the shared glyph semantic contract is correct and backend-agnostic.

## 10.3 New unit test — `engine/phaser/display-export/renderResolvedDisplayImage.test.ts`

### Cases

1. styled display with a glyph renders via the shared background resolver/canvas backend and the shared glyph placement model
2. styled display without a glyph renders background only and does not use placeholder fallback
3. unstyled display without a glyph preserves placeholder fallback
4. export canvas is always sized to the canonical icon render size before drawing

### Purpose

Prove that resolved display export orchestration now uses the shared contract and preserves existing branching behavior.

## 10.4 Existing runtime test updates

### `engine/phaser/display/modules/BackgroundModule.styled.test.ts`

Keep this test and update only what is necessary for the changed renderer signature.

The assertions must continue to prove that the styled runtime path renders the authored fill color and alpha.

### `engine/phaser/display/modules/GlyphModule.test.ts`

Keep this test and update only what is necessary for the changed internal glyph-resolution flow.

The assertions must continue to prove:

- glow layers are still rendered
- unused slots are still hidden
- invisible radii still hide all images
- destruction still releases all pooled images

## 10.5 New view test — `ui/devtools/editors/view-editor/ViewEditorBackgroundSection.test.tsx`

### Cases

1. renders `none` as a selectable family option
2. invokes `background.updateFamily("none")` when the user selects `none`
3. preserves the existing option values for the drawable families
4. does not require any change to the component prop contract

### Purpose

Prove that the display editor exposes the already-supported `none` family and that the UI wiring remains callback-driven.

## 10.6 Existing export service tests

### `engine/phaser/display-export/DisplayImageExportService.test.ts`

This test suite must remain behaviorally identical.

Only mocks or helper wiring may change if required by the new internal helper structure.

The assertions must continue to prove:

- cache behavior
- in-flight deduplication
- malformed request rejection

## 11. Acceptance criteria

The implementation is complete only when all of the following are true.

### Functional acceptance criteria

1. For any resolved display icon with a non-null style, export background geometry is derived from `computeBlobPolygons(...)`.
2. `familyRotationDeg` affects export geometry.
3. `fillMode`, `fillAmount`, and `invertFill` affect export fill coverage.
4. Export glyph placement is derived from `resolveGlyphPlacementTransform(...)` using the canonical icon/display-preview radius.
5. Runtime styled rendering and export styled rendering both consume the same styled background render model resolver.
6. Runtime glyph placement and export glyph placement both consume the same glyph placement render model resolver.
7. Placeholder fallback behavior is unchanged.
8. Public export request and hook contracts are unchanged.
9. The display editor family selector includes `none` as a selectable value.
10. Selecting `none` persists `style.family = "none"` through the existing editor action pipeline and results in no rendered background in preview/export because the shared background resolver returns no model.

### Cleanup acceptance criteria

1. `drawDisplayBackground.ts` no longer exists.
2. `bindDisplayImageExportService.ts` no longer exists.
3. No dead imports or duplicate preview/export constants remain in the changed files.

### Quality acceptance criteria

1. all affected tests are green
2. new tests are deterministic and colocated
3. no TODOs are introduced
4. no out-of-scope files are changed

## 12. Implementation order

The implementation must proceed in this order to minimize churn and keep the contract stable.

1. add the shared constants file
2. add the shared styled background render model resolver and its unit test
3. adapt the Phaser styled background backend and runtime caller to use the shared model
4. add the shared glyph placement render model resolver and its unit test
5. adapt the Phaser glyph runtime backend to use the shared model
6. add the canvas styled background backend
7. adapt resolved display export to use the shared constants and shared models
8. add/update export orchestration tests
9. add the display-editor family-selector view test
10. remove superseded detritus files
11. run the full affected test set

## 13. Explicit non-goals

To prevent scope expansion, the implementation must not:

- change `DisplayImageRequest`
- add runtime state to UI export requests
- refactor body avatar export
- change the placeholder rendering contract
- alter non-styled gameplay band rendering
- introduce a new generalized rendering framework
- perform unrelated cleanup outside the files listed above
