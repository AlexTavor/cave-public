# LLD — Display View Editing, Attribute-Pool Shapes, and Passport Display-Key Simplification

## 1. Scope and source basis

This design is derived from direct inspection of the uploaded source archive, not from inference. The implementation must remain inside the current project rules:

- React UI remains presentational; stateful/editor logic stays in hooks, stores, or services. fileciteturn0file0
- Scope is limited to the requested feature set; no unrelated cleanup, no speculative architecture, no TODO placeholders. fileciteturn0file1
- Tests must remain behavior-first, colocated, and factory-driven. fileciteturn0file2

The inspected code establishes these relevant current facts:

1. `DisplayEditorDefinitionSection.tsx` currently mixes type selection, resource fields, attribute-pool fields, and body-only messaging in one file.
2. The existing “Edit Visuals” flow is blueprint-specific and is implemented in `src/ui/devtools/editors/blueprint/visuals/**`.
3. Non-body passport visuals currently depend on `_editor.abilities.passport.styleId` and `_editor.abilities.passport.glyphKey`, plus compiler writes to `components.display.style` and `components.display.glyphKey`.
4. Authored display assets of type `resource` already provide the correct abstraction for “display key → style asset + glyph asset”.
5. Attribute-pool visuals are currently hard-coded via `AttributePoolShapeModule.ts` and `attributePowerVisuals.ts`; they are not driven by authored glyph assets.
6. Glyph rendering currently uses fixed pre-generated textures keyed only by shape, with fixed hard-coded stroke widths and no authored line-thickness field.

This LLD preserves existing mechanisms wherever they already solve the problem:

- asset sessions and scoped session UI state
- sibling `assets.art` linking through `resolveVisualAssetFilename(...)`
- authored display assets as the linkage point from a display key to style/glyph assets
- existing glyph/style asset schemas and preview/export plumbing where they still fit

## 2. Why

### 2.1 Why add “Edit View” to display assets

Today, non-body passport visuals can be edited from the blueprint editor, but authored display assets cannot open the same visual workflow directly. That forces authors to split one conceptual object (“how this display looks”) across unrelated editors.

For `resource` displays, that is redundant because the display asset already owns `styleId` and `glyphKey`.

For `attribute_pool` displays, there is currently no authored visual path at all beyond the fixed built-in shape.

The requested button closes that gap by making the display asset itself the primary authoring entry point.

### 2.2 Why refactor `DisplayEditorDefinitionSection`

The current file has mixed responsibilities:

- section container composition
- type selector rendering
- resource field rendering
- attribute-pool field rendering
- body-only note rendering

That violates the project’s stated preference for narrow files and UI-only components. fileciteturn0file0

### 2.3 Why replace passport style/glyph keys with one display key

The current passport editor exposes three linked identifiers for one visual concept:

- `icon` / display override
- `styleId`
- `glyphKey`

In the inspected code, the display asset layer already provides the proper indirection: `display key -> display asset -> styleId + glyphKey`.

Keeping style and glyph as separate first-class passport inputs duplicates linkage that the display asset system already knows how to express.

The requested simplification is therefore consistent with the existing authored display asset model.

### 2.4 Why change attribute-pool rendering to authored glyphs

The current attribute-pool implementation is hard-coded in `AttributePoolShapeModule.ts` and cannot express:

- authored alternative slot layouts
- authored line thickness overrides
- palette-based slot colors
- reuse of the same view editor contract as resource displays

To support the requested editor capabilities, attribute-pool visuals must become glyph-driven rather than shape-module-driven.

## 3. What will change

## 3.1 User-visible behavior

### Display asset editor

For display assets of type `resource` and `attribute_pool`, the definition section shall show an **Edit View** button.

- `resource` opens the shared view editor against the style/glyph assets referenced by that display asset.
- `attribute_pool` opens the shared view editor against the glyph asset referenced by that display asset.
- `body` does not show the button.

### Shared view editor

The shared view editor shall be used from:

- passport ability editor (existing entry point)
- resource display editor (new entry point)
- attribute-pool display editor (new entry point)

The shared editor shall support:

- all existing background controls for contexts that have an editable style asset
- all existing glyph slot controls
- three new glyph shapes: `plus_rounded`, `chevron_up_rounded`, `triple_circle`
- project-default line thickness control
- per-slot line thickness override
- palette color selection for glyph slots, with `body`, `mind`, and `social` sourced from the project palette

### Passport ability editor

For non-body blueprints, the passport editor shall expose a single authored display key field.

- The existing visible `Style ID` field is removed.
- The existing visible `Glyph ID` field is removed.
- The existing icon/display field becomes the only visual key exposed in the form.
- Clicking **Edit Visuals** shall ensure a display asset exists for that display key before opening the view editor.

If the authored display key does not already exist in sibling `assets.art`, the editor shall create:

- a `displays[displayKey]` resource display asset
- a `styles[displayKey]` style asset
- a `glyphs[displayKey]` glyph preset

The created display asset shall link to the created style/glyph assets by id.

### Attribute-pool runtime and export

Attribute-pool visuals shall no longer be limited to the fixed shape module.

Instead:

- attribute-pool displays render through the glyph pipeline
- built-in defaults still exist for `attr_body`, `attr_mind`, and `attr_social`
- authored attribute-pool display assets may override the default glyph asset reference

## 3.2 Non-goals

This design does **not** do any of the following:

- no body-avatar visual-editor expansion
- no migration pass that rewrites all historical blueprints up front
- no background-style editing for `attribute_pool` displays
- no palette-token support for style/background colors; palette support is limited to glyph slot color selection
- no unrelated refactors outside the touched editor/rendering surface

## 4. Final data contract

## 4.1 Display asset contract

### `resource`

No semantic change.

```text
{
  type: "resource";
  styleId: string;
  glyphKey: string;
  tooltip?: string;
  tags?: string[];
}
```

### `attribute_pool`

Add an explicit glyph asset reference.

```text
{
  type: "attribute_pool";
  attribute: "body" | "mind" | "social";
  glyphKey?: string;
  tooltip?: string;
  tags?: string[];
}
```

Rules:

- `glyphKey` is optional for backward compatibility.
- If missing at runtime/export time, fallback key is the display key itself.
- The editor shall ensure a glyph asset exists before opening the view editor.

### `body`

No semantic change.

## 4.2 Glyph placement contract

Extend glyph placements with two optional authored fields.

```text
{
  shape: GlyphShape;
  position: 0..8;
  rotationDeg: number;
  scale: positive number;
  colorHex: #RRGGBB;
  paletteColorKey?: "body" | "mind" | "social";
  lineThickness?: positive number;
  radialPositionFactor?: 0..1;
  animation?: GlyphAnimationEnvelope;
}
```

Rules:

- `colorHex` remains required to preserve backward compatibility and existing assets.
- `paletteColorKey` overrides `colorHex` only for rendering.
- `lineThickness` overrides the project default only for shapes that honor thickness.
- For shapes that do not honor thickness, `lineThickness` is stored but ignored by rendering.

## 4.3 Project-level glyph view settings

Add a new asset-settings object under `assets.settings`:

```text
assets.settings.glyph_view.defaultLineThickness: number
```

Rules:

- Default value shall be `10`, matching the current hard-coded line thickness in `glyphShapeDrawFns.ts`.
- This setting is global for the module.
- The shared view editor edits this value directly in the active asset session.
- Per-slot `lineThickness` overrides take precedence over the project default.

## 4.4 Passport ability contract

### Visible editing contract

The passport ability editor exposes one visual linkage field for non-body blueprints:

```text
icon?: string   // user-facing meaning: display key override
```

### Compatibility contract

`styleId` and `glyphKey` remain parseable in `PassportAbilitySchema` only as backward-compatible legacy input.

- The form no longer renders them.
- New edits do not write them.
- Runtime fallback may continue to read them only for old content that has not yet been converted to authored display assets.

This is the minimum-risk path because the inspected codebase still uses `glyphKey` for body-avatar behavior and still reads passport `styleId` as a fallback in `resolveDisplaySpec.ts`.

## 5. Rendering contract

## 5.1 Glyph shapes

`GlyphShape` shall be extended with:

- `plus_rounded`
- `chevron_up_rounded`
- `triple_circle`

These names shall match the existing attribute-pool shape names already used in `ShapeTextureGen.ts` / `attributePowerVisuals.ts`.

## 5.2 Shapes that honor line thickness

Thickness-sensitive shapes:

- `line`
- `chevron`
- `ring`
- `hex_ring`
- `oct_ring`
- `square_ring`
- `plus_rounded`
- `chevron_up_rounded`

Thickness-insensitive shapes:

- `crescent`
- `triangle`
- `star5`
- `star6`
- `circle`
- `pixel`
- `triple_circle`

## 5.3 Rounded-cap rule

All open line-based glyph shapes shall be rendered as filled geometry with explicit rounded endpoints, not via renderer-specific line-cap behavior.

That rule applies to:

- `line`
- `chevron`
- `plus_rounded`
- `chevron_up_rounded`

This avoids renderer discrepancies between Phaser scene rendering and display-image export rendering.

## 5.4 Attribute-pool rendering rule

Built-in display keys `attr_body`, `attr_mind`, and `attr_social` shall render through the glyph pipeline.

Default built-in glyph behavior:

- `attr_body` -> center placement with `plus_rounded`
- `attr_mind` -> center placement with `chevron_up_rounded`
- `attr_social` -> center placement with `triple_circle`

If an authored attribute-pool display asset exists and specifies `glyphKey`, that glyph asset is used instead.

## 5.5 Palette-color rule

Glyph placement tint resolution shall be:

1. if `paletteColorKey` is set, use the corresponding project palette color from `assets.settings.vein_network.colors`
2. else use `colorHex`

Only these keys are valid in this change:

- `body`
- `mind`
- `social`

The palette source shall be derived from the existing vein config parser, not from a new parallel palette store.

## 6. How the implementation works

## 6.1 Shared view-editor architecture

A new shared view-editor layer shall separate:

- presentational modal/sections
- adapter hooks for blueprint and asset flows
- pure helpers for linkage, palette resolution, and preview selection

The shared modal receives a fully prepared adapter contract and does not know whether it is editing a blueprint-backed display or an asset-backed display.

### Adapter contract

The adapter contract shall expose:

```text
isOpen: boolean
close(): void
contextLabel: string
background: BackgroundEditorState | null
glyph: GlyphEditorState
projectDefaults: {
  defaultLineThickness: number
  paletteOptions: Array<{ key: "body"|"mind"|"social"; color: string }>
}
preview: one of:
  - { kind: "blueprint_runtime"; draft; blueprintId; enabled; reason? }
  - { kind: "display_icon"; displayKey }
selectedPosition: number
selectPosition(position: number): void
all update actions used by the sections
```

The modal remains UI-only.

## 6.2 Blueprint flow after the change

1. Passport form resolves the effective display key:
   - `passport.icon?.trim() || blueprint.id`
2. Clicking **Edit Visuals** ensures sibling `assets.art` exists in session.
3. If `assets.displays[displayKey]` does not exist, create a `resource` display asset linked to style/glyph assets of the same key.
4. Open the shared view editor.
5. All background/glyph edits mutate the sibling `assets.art` assets referenced by that display asset.
6. Blueprint `_editor.abilities.passport` keeps only the display key linkage.
7. Compiler output for non-body blueprints relies on the display key; it no longer writes direct style/glyph links.

## 6.3 Asset flow after the change

### Resource display

1. The display editor reads `styleId` and `glyphKey` from the display asset.
2. Clicking **Edit View** ensures both referenced assets exist.
3. Open shared editor with:
   - background section enabled
   - glyph section enabled
   - preview kind `display_icon`

### Attribute-pool display

1. The display editor reads `glyphKey` from the display asset; if empty, fallback key is the display asset id for editor creation only.
2. Clicking **Edit View** ensures the glyph asset exists, and if the display asset had no `glyphKey`, it is populated with the ensured key before the modal opens.
3. Open shared editor with:
   - background section disabled
   - glyph section enabled
   - preview kind `display_icon`

### Body display

No view button.

## 6.4 Preview strategy

### Blueprint preview

Keep the existing runtime preview path.

### Asset preview

Use existing display-image export plumbing through the resolved display key.

Reason:

- this already exists
- it uses the active session/module sources
- it avoids creating a fake runtime solely for asset editing

The preview pane therefore becomes adapter-driven:

- blueprint adapter -> runtime preview component
- asset adapter -> resolved display icon image

## 7. File-by-file design

## 7.1 Display editor refactor and asset entry point

### Changed — `src/ui/devtools/editors/assets/display/DisplayEditor.tsx`

**Responsibility**

Compose the asset display editor frame and mount the display-specific modal entry point.

**Logic**

- Keep toolbar, loading, and not-found behavior unchanged.
- Mount the shared asset-backed view modal alongside the existing sections.
- Pass the asset editor state to a now-thin `DisplayEditorDefinitionSection`.

**Interface**

Props unchanged:

```text
{ filename: string; assetId: string; tabId?: string }
```

### Changed — `src/ui/devtools/editors/assets/display/useDisplayEditor.ts`

**Responsibility**

Own display-asset session state and expose asset-editor actions, including modal open/close state.

**Logic**

Add:

- `scopeId = createAssetScopeId("displays", assetId)`
- `isViewOpen`
- `openViewEditor()`
- `closeViewEditor()`
- `canEditView` (`resource` and `attribute_pool` only)

Retain existing rename/type/metadata actions.

**Interface**

Return contract extended with:

```text
scopeId: string
isViewOpen: boolean
canEditView: boolean
openViewEditor(): void
closeViewEditor(): void
```

### Changed — `src/ui/devtools/editors/assets/display/DisplayEditorDefinitionSection.tsx`

**Responsibility**

Compose the narrow display-definition subcomponents only.

**Logic**

This file shall no longer contain inline field branches.

It shall render, in order:

- editable id row
- type selector
- type-specific detail block
- optional Edit View action block

**Interface**

Props remain the same shape.

### Added — `src/ui/devtools/editors/assets/display/DisplayEditorSection.types.ts`

**Responsibility**

Declare the narrow presentational contract used by definition-section child files.

**Logic**

No runtime logic.

**Interface**

Exports:

- `DisplayEditorDefinitionProps`
- `DisplayEditorIds`
- `DisplayEditorState`

### Added — `src/ui/devtools/editors/assets/display/DisplayEditorTypeField.tsx`

**Responsibility**

Render only the display type selector.

**Logic**

Delegates type changes to `handleRetype(...)`.

**Interface**

```text
{ controlId: string; value: ModuleDisplayAsset["type"]; onChange(type): void }
```

### Added — `src/ui/devtools/editors/assets/display/DisplayEditorResourceFields.tsx`

**Responsibility**

Render only `resource`-specific fields.

**Logic**

- style id input + datalist
- glyph key input + datalist

**Interface**

```text
{
  ids: { style: string; glyph: string }
  styleId: string
  glyphKey: string
  styleSuggestions: string[]
  glyphSuggestions: string[]
  onStyleIdChange(value): void
  onGlyphKeyChange(value): void
}
```

### Added — `src/ui/devtools/editors/assets/display/DisplayEditorAttributePoolFields.tsx`

**Responsibility**

Render only `attribute_pool`-specific fields.

**Logic**

Render the existing attribute selector only.

No raw glyph-key input is shown here; that linkage is owned by the Edit View flow.

**Interface**

```text
{ controlId: string; attribute: "body"|"mind"|"social"; onChange(attribute): void }
```

### Added — `src/ui/devtools/editors/assets/display/DisplayEditorBodyNote.tsx`

**Responsibility**

Render only the body-type explanatory note.

**Logic**

Static presentational component.

**Interface**

No special interface beyond optional text prop if desired.

### Added — `src/ui/devtools/editors/assets/display/DisplayEditorViewButton.tsx`

**Responsibility**

Render only the **Edit View** action.

**Logic**

- hidden when `canEditView === false`
- click delegates to `openViewEditor()`

**Interface**

```text
{ enabled: boolean; onClick(): void }
```

### Added — `src/ui/devtools/editors/assets/display/useDisplayViewEditor.ts`

**Responsibility**

Build the asset-backed adapter contract for the shared view editor.

**Logic**

- Reads the active display asset draft.
- Resolves or creates linked glyph/style assets as required.
- Reads project palette colors from existing vein settings.
- Reads/writes project default line thickness in `assets.settings.glyph_view`.
- For `resource`, exposes background + glyph editing.
- For `attribute_pool`, exposes glyph editing only.
- Exposes preview as `{ kind: "display_icon", displayKey: assetId }`.

**Interface**

```text
{ filename: string; assetId: string }
-> ViewEditorAdapter | null
```

### Added — `src/ui/devtools/editors/assets/display/displayViewEditorAssetLinking.ts`

**Responsibility**

Pure helper layer for asset-backed view-editor linkage.

**Logic**

Exports pure helpers:

- `ensureResourceViewAssets(draft, displayId)`
- `ensureAttributePoolGlyphAsset(draft, displayId)`
- `readAssetViewPaletteOptions(draft.assets)`
- `readProjectDefaultLineThickness(draft.assets)`

For attribute-pool assets:

- if `glyphKey` is empty, set it to `displayId`
- ensure `assets.glyphs[glyphKey]` exists

**Interface**

Pure functions only.

## 7.2 Shared view editor

### Added — `src/ui/devtools/editors/view-editor/ViewEditor.types.ts`

**Responsibility**

Declare the shared modal contract.

**Logic**

No runtime logic.

**Interface**

Exports:

- `ViewEditorAdapter`
- `BackgroundEditorState`
- `GlyphEditorState`
- `ViewEditorPreviewState`
- `PaletteOption`

### Added — `src/ui/devtools/editors/view-editor/ViewEditorModal.tsx`

**Responsibility**

Pure presentational shell for the shared view editor.

**Logic**

- Renders modal title
- Renders background section only when adapter provides one
- Always renders glyph section
- Renders preview pane based on `preview.kind`
- Renders project default line-thickness control in the glyph section area

**Interface**

```text
{ adapter: ViewEditorAdapter }
```

### Added — `src/ui/devtools/editors/view-editor/ViewEditor.styles.ts`

**Responsibility**

Shared styles extracted from `BlueprintVisualsModal.styles.ts`.

**Logic**

No business logic.

**Interface**

Exports the styled components currently used by the modal sections.

### Added — `src/ui/devtools/editors/view-editor/ViewEditorBackgroundSection.tsx`

**Responsibility**

Pure presentational background controls.

**Logic**

Lifted from the existing background section with no business logic added.

**Interface**

Matches the current background-section props, but uses shared `BackgroundEditorState`.

### Added — `src/ui/devtools/editors/view-editor/ViewEditorGlyphSection.tsx`

**Responsibility**

Pure presentational glyph-slot section.

**Logic**

Lifted from the existing glyph section and wired to shared types.

**Interface**

Uses `GlyphEditorState` plus update callbacks.

### Added — `src/ui/devtools/editors/view-editor/ViewEditorGlyphInspector.tsx`

**Responsibility**

Pure presentational slot inspector.

**Logic**

Extends the current inspector with:

- new shape options
- project default line-thickness display
- per-slot line-thickness override control
- palette/custom color mode selector

**Interface**

Adds these props beyond the existing ones:

```text
projectDefaultLineThickness: number
lineThickness: number | null
updateLineThickness(position, valueOrNull): void
paletteColorKey: "body"|"mind"|"social"|null
updatePaletteColor(position, keyOrNull): void
paletteOptions: Array<{ key; color }>
```

### Added — `src/ui/devtools/editors/view-editor/ViewEditorPreviewPane.tsx`

**Responsibility**

Render either blueprint runtime preview or asset icon preview.

**Logic**

- `blueprint_runtime` -> render the existing runtime preview component
- `display_icon` -> render an image/icon preview from the resolved display key

**Interface**

```text
{ preview: ViewEditorPreviewState }
```

### Added — `src/ui/devtools/editors/view-editor/ViewEditorDisplayPreview.tsx`

**Responsibility**

Asset-preview implementation using existing resolved display-icon/export plumbing.

**Logic**

- reads the display key
- renders the current resolved display image
- shows the same empty/loading handling style as the modal preview section

**Interface**

```text
{ displayKey: string }
```

### Added — `src/ui/devtools/editors/view-editor/glyphViewPalette.ts`

**Responsibility**

Resolve editor palette options from existing vein config.

**Logic**

- uses existing `parseVeinConfig(...)`
- returns `{ body, mind, social }` entries only

**Interface**

```text
readGlyphPaletteOptions(assets): PaletteOption[]
```

## 7.3 Blueprint visual flow conversion to display-key linkage

### Changed — `src/ui/devtools/editors/blueprint/visuals/BlueprintVisualsModal.tsx`

**Responsibility**

Become a thin blueprint wrapper around the shared modal.

**Logic**

- call blueprint adapter hook
- if adapter is null, render null
- otherwise render `ViewEditorModal`

**Interface**

No prop change.

### Changed — `src/ui/devtools/editors/blueprint/visuals/useBlueprintVisualsEditor.ts`

**Responsibility**

Produce a blueprint-backed `ViewEditorAdapter`.

**Logic**

- preserve current session open/close semantics
- preserve sibling `assets.art` flush-handler behavior
- resolve the effective display key from passport `icon` or blueprint id
- ensure the display asset exists before editing
- expose background + glyph state through the shared adapter contract

**Interface**

Internal hook; return type becomes `ViewEditorAdapter | null`.

### Changed — `src/ui/devtools/editors/blueprint/visuals/useBlueprintVisualsEditorActions.ts`

**Responsibility**

Own blueprint-backed edit actions for the shared modal.

**Logic**

- continue mutating sibling `assets.art`
- stop writing `_editor.abilities.passport.styleId`
- stop writing `_editor.abilities.passport.glyphKey`
- stop writing `components.display.style` for non-body blueprints
- stop writing `components.display.glyphKey` for non-body blueprints
- add `updateProjectDefaultLineThickness(...)`
- add `updatePlacementLineThickness(...)`
- add `updatePlacementPaletteColor(...)`

**Interface**

Action surface expands accordingly.

### Changed — `src/ui/devtools/editors/blueprint/visuals/blueprintVisualsAssetDraft.ts`

**Responsibility**

Resolve blueprint visuals through the authored display key.

**Logic**

Replace `resolveStyleId(...)` / `resolveGlyphId(...)` as primary linkage with:

- `resolveDisplayKey(draft, blueprintId)`
- `ensureDisplayAssetByKey(draft, displayKey)`
- `readDisplayAssetDraft(draft, displayKey)`
- `readStyleDraft(...)` via the resolved display asset’s `styleId`
- `readGlyphDraft(...)` via the resolved display asset’s `glyphKey`

Legacy `styleId` / `glyphKey` values may still be read only as fallback when no authored display asset exists.

**Interface**

Pure helpers only.

### Changed — `src/ui/devtools/editors/blueprint/visuals/blueprintVisualsLinkedMutations.ts`

**Responsibility**

Mutate the linked assets behind a blueprint display key.

**Logic**

Current behavior mutates style/glyph assets and also back-links style/glyph keys into passport/compiled display.

New behavior:

- resolve the display key
- ensure `assets.displays[displayKey]` exists
- mutate the style/glyph assets referenced by that display asset
- do **not** mirror style/glyph ids back into passport/editor state for non-body blueprints

**Interface**

Mutator surface remains `mutateStyle(...)` / `mutateGlyph(...)`, but linkage source changes.

### Changed — `src/ui/devtools/editors/blueprint/visuals/blueprintVisualsActionUtils.ts`

**Responsibility**

Keep generic action helpers only.

**Logic**

Remove non-body use of `linkPassportAsset(...)`.

If the helper remains for body compatibility, it must be explicitly documented as legacy-only and must not be used by the new non-body visual flow.

**Interface**

No required new public interface beyond any cleanup.

### Added — `src/ui/devtools/editors/blueprint/visuals/ensurePassportDisplayAsset.ts`

**Responsibility**

Guarantee that a blueprint display key has a corresponding authored display asset before the shared editor opens.

**Logic**

If `assets.displays[displayKey]` is missing:

- create `displays[displayKey] = { type: "resource", styleId: displayKey, glyphKey: displayKey }`
- ensure `styles[displayKey]` exists
- ensure `glyphs[displayKey]` exists

Must only mutate sibling `assets.art`, never the blueprint file.

**Interface**

```text
ensurePassportDisplayAsset(draft: ModuleCartridge, blueprintId: string): string
// returns effective display key
```

## 7.4 Passport editor and compiler

### Changed — `src/ui/devtools/editors/blueprint/mode/forms/PassportAbilityForm.tsx`

**Responsibility**

Render the passport ability form.

**Logic**

- Rename the visible display field label to `Display Key`.
- Keep using `IconPicker`, because it already selects display keys and can create display assets.
- Remove visible `Style ID` field.
- Remove visible `Glyph ID` field.
- On **Edit Visuals**, ensure the display asset exists before opening the modal.
- Preserve the existing “body blueprints do not open visuals modal” rule.

**Interface**

Prop unchanged:

```text
{ rootPath: string }
```

### Changed — `src/data/schemas/abilities/passport.ts`

**Responsibility**

Schema for passport ability authoring.

**Logic**

- keep `icon` as the single visible authored visual key
- retain `styleId` and `glyphKey` as deprecated optional compatibility fields only
- add schema comments/descriptions clarifying they are legacy and not surfaced in the editor

**Interface**

Type stays parse-compatible.

### Changed — `src/engine/compiler/abilities/passportCompiler.ts`

**Responsibility**

Compile passport ability config into blueprint display/body components.

**Logic**

For non-body blueprints:

- `display.display_key = config.icon?.trim() || draft.id`
- do not write `display.style`
- do not write `display.glyphKey`

For body blueprints:

- keep existing `body_avatar` display-key behavior
- keep `portraitIcon` assignment behavior
- keep existing body-avatar compatibility behavior untouched

Description handling remains unchanged.

**Interface**

Function signature unchanged.

## 7.5 Asset and schema changes for glyph view settings and attribute-pool linkage

### Changed — `src/data/schemas/assets/displays.ts`

**Responsibility**

Display-asset schemas.

**Logic**

Extend `AttributePoolDisplayAssetSchema` with optional `glyphKey`.

**Interface**

Exports unchanged names; inferred type for `AttributePoolDisplayAsset` expands.

### Changed — `src/ui/devtools/state/moduleStore.assets.types.ts`

**Responsibility**

TS-side asset draft type definitions.

**Logic**

Mirror the schema change by adding `glyphKey?: string` to `attribute_pool` display assets.

**Interface**

Union type updated accordingly.

### Changed — `src/data/schemas/assets/collection.ts`

**Responsibility**

Asset collection and asset-settings schema.

**Logic**

Add:

```text
settings.glyph_view.defaultLineThickness
```

Default it during preprocessing exactly as background and vein settings are defaulted today.

**Interface**

`AssetCollection` inferred type expands.

### Added — `src/data/schemas/assets/glyphView.ts`

**Responsibility**

Own the new glyph-view settings schema and defaults.

**Logic**

Export:

- `DEFAULT_GLYPH_VIEW_CONFIG`
- `GlyphViewConfigSchema`

**Interface**

```text
{ defaultLineThickness: number }
```

### Changed — `src/data/schemas/assets.ts`

**Responsibility**

Barrel export.

**Logic**

Export the new glyph-view schema/defaults.

**Interface**

Barrel only.

### Changed — `src/engine/test/factories.ts`

**Responsibility**

Create valid module test fixtures.

**Logic**

Seed `assets.settings.glyph_view` with the new default config, alongside background and vein defaults.

**Interface**

Factory signatures unchanged.

## 7.6 Glyph schema, palette colors, and thickness-aware rendering

### Changed — `src/data/schemas/assets/glyphs.ts`

**Responsibility**

Glyph asset validation.

**Logic**

Extend `GlyphPlacementSchema` with:

- `paletteColorKey?: enum(body|mind|social)`
- `lineThickness?: positive number`

Extend shape enum usage to include the new shapes.

**Interface**

Inferred `GlyphPreset` type expands.

### Changed — `src/engine/phaser/display/glyph/GlyphTypes.ts`

**Responsibility**

Runtime glyph type declarations.

**Logic**

- extend `GlyphShape`
- add `paletteColorKey?`
- add `lineThickness?`
- export a `GlyphPaletteColorKey` type

**Interface**

Updated exported types only.

### Changed — `src/engine/phaser/display/glyph/GlyphGenerator.ts`

**Responsibility**

Procedural glyph generation.

**Logic**

No algorithmic redesign.

Ensure generated placements remain valid under the expanded type by omitting the new optional fields.

**Interface**

No signature change.

### Added — `src/engine/phaser/display/glyph/glyphColorResolver.ts`

**Responsibility**

Resolve authored placement tint from either palette key or hex.

**Logic**

Exports:

```text
resolveGlyphPlacementColorHex(
  placement,
  paletteColors: { body: string; mind: string; social: string }
): string
```

**Interface**

Pure helper only.

### Added — `src/engine/phaser/display/glyph/glyphLineThickness.ts`

**Responsibility**

Resolve the effective line thickness for one placement.

**Logic**

Exports:

```text
resolveGlyphLineThickness(
  placement,
  projectDefault: number,
  shape: GlyphShape
): number | null
```

Returns `null` for thickness-insensitive shapes.

**Interface**

Pure helper only.

### Changed — `src/engine/phaser/display/glyph/GlyphTextureKeys.ts`

**Responsibility**

Texture-key generation for glyph textures.

**Logic**

Replace the fixed constant map with a deterministic key builder that includes thickness where relevant.

**Interface**

Export:

```text
getGlyphTextureKey(shape: GlyphShape, effectiveThickness: number | null): string
```

### Changed — `src/engine/phaser/display/glyph/GlyphTextureGen.ts`

**Responsibility**

Generate glyph textures.

**Logic**

Move from fixed startup pre-generation to deterministic on-demand generation by:

- shape
- effective thickness

The generator must support the new shapes and rounded-cap geometry.

**Interface**

Expose:

```text
generateGlyphTexture(scene, graphics, { shape, effectiveThickness }): string
```

The previous bulk-generation helper may remain only as a thin prewarm wrapper if still needed by `TextureManager.initialize()`.

### Changed — `src/engine/phaser/display/glyph/glyphShapeDrawFns.ts`

**Responsibility**

Draw open/fill glyph shapes.

**Logic**

- remove fixed hard-coded thickness from line-based shapes
- draw line-based shapes as filled capsules/polygons with rounded endpoints
- add `plus_rounded` and `chevron_up_rounded`

**Interface**

Draw functions now accept `effectiveThickness`.

### Changed — `src/engine/phaser/display/glyph/glyphShapeDrawFnsRings.ts`

**Responsibility**

Draw closed ring/polygon-ring glyph shapes.

**Logic**

- remove fixed ring thickness constant
- use the effective thickness argument
- keep closed-shape behavior deterministic
- add `triple_circle` here or in the primary draw file; choose exactly one location and keep it consistent

**Interface**

Draw functions now accept `effectiveThickness`.

### Changed — `src/engine/phaser/utils/TextureManager.ts`

**Responsibility**

Texture access facade.

**Logic**

Add a glyph-texture accessor:

```text
getGlyphTexture({ shape, effectiveThickness }): string
```

Call the updated glyph texture generator.

**Interface**

New public method only.

## 7.7 Runtime display resolution and attribute-pool rendering

### Changed — `src/engine/phaser/display/types.ts`

**Responsibility**

Display spec contract.

**Logic**

Add:

```text
projectGlyphLineThickness: number
```

This keeps the runtime rendering contract explicit and avoids rereading asset settings at every draw site.

**Interface**

`DisplaySpec` expands.

### Changed — `src/engine/phaser/display/resolveDisplaySpec.ts`

**Responsibility**

Resolve runtime display spec from entity + blueprint + assets.

**Logic**

Changes:

- accept asset settings (or full assets settings object) as input
- parse project glyph-view default once
- for display assets, read `glyphKey` from:
  - `resource.glyphKey`
  - `attribute_pool.glyphKey`
- preserve legacy style/glyph fallbacks only when authored display data is absent
- populate `projectGlyphLineThickness`

**Interface**

Param contract expands with asset settings.

### Changed — `src/engine/phaser/display/DisplayInstanceManager.ts`

**Responsibility**

Pass the extra settings input into `resolveDisplaySpec(...)`.

**Logic**

Read `cartridge.assets?.settings` and forward it.

**Interface**

No public interface change.

### Changed — `src/engine/phaser/display/DisplayDefinitionCatalog.ts`

**Responsibility**

Assemble module stacks per display key.

**Logic**

Replace `AttributePoolShapeModule` in attribute-pool module stacks with the existing glyph module factory.

New stack:

```text
[TransformModule, LightModule, BackgroundModule, createGlyphModule(glyphRegistry), InteractionModule, SelectionModule]
```

This makes attribute-pool displays use the same glyph pipeline as authored resource displays.

**Interface**

No public interface change.

### Removed — `src/engine/phaser/display/modules/AttributePoolShapeModule.ts`

**Responsibility**

Current hard-coded attribute-pool shape renderer.

**Removal rationale**

Its responsibility is subsumed by glyph-backed attribute-pool rendering.

No replacement file is needed at the same path.

### Changed — `src/engine/phaser/display/modules/glyphModuleRuntime.ts`

**Responsibility**

Tick/draw glyph images.

**Logic**

- resolve effective line thickness from `placement.lineThickness ?? spec.projectGlyphLineThickness`
- request textures via `textureManager.getGlyphTexture(...)`
- resolve tint through palette-or-hex helper

**Interface**

Function signatures update to accept the new helpers/spec field.

### Changed — `src/engine/phaser/display/modules/GlyphModule.ts`

**Responsibility**

Own glyph-image instance creation.

**Logic**

No structural change beyond compatibility with updated runtime helper behavior.

**Interface**

No public interface change.

### Changed — `src/engine/phaser/display/modules/AvatarGlyphModule.ts`

**Responsibility**

Overlay glyph rendering for body avatars.

**Logic**

No flow change, but it inherits the updated glyph runtime behavior automatically.

**Interface**

No change.

### Changed — `src/engine/phaser/display/modules/attributePowerVisuals.ts`

**Responsibility**

Attribute-pool built-in shape mapping.

**Logic**

Retain key-to-shape mapping.

Add a built-in default glyph-preset helper for `attr_body`, `attr_mind`, and `attr_social` so attribute-pool displays have deterministic defaults when no authored preset exists.

**Interface**

Add pure helper:

```text
createDefaultAttributePoolGlyphPreset(displayKey): GlyphConfigWithoutId
```

### Changed — `src/engine/phaser/display/glyph/GlyphRegistry.ts`

**Responsibility**

Resolve authored or procedural glyphs.

**Logic**

Before procedural fallback, check whether `display_key` is one of the three built-in attribute-pool keys and, if so, return the default attribute-pool glyph preset.

This preserves deterministic built-in visuals after moving attribute pools to `GlyphModule`.

**Interface**

Public API unchanged.

## 7.8 Display-image export and icon rendering

### Changed — `src/engine/phaser/display-export/DisplayImageExportTypes.ts`

**Responsibility**

Display export request contract.

**Logic**

Extend resolved-display and body-avatar requests with:

```text
projectGlyphLineThickness: number
paletteColors: { body: string; mind: string; social: string }
```

`attribute_display` may be removed if no remaining caller needs it.

**Interface**

Union type updated accordingly.

### Changed — `src/engine/phaser/display-export/buildDisplayImageRequest.ts`

**Responsibility**

Build export requests from module sources.

**Logic**

- parse `assets.settings.glyph_view`
- parse project palette colors from vein settings
- for authored `attribute_pool` displays, use `asset.glyphKey ?? displayKey`
- for built-in attribute-pool display keys, return a resolved-display request instead of a special hard-coded attribute-display request

**Interface**

Function signature unchanged.

### Changed — `src/engine/phaser/display-export/DisplayImageExportService.ts`

**Responsibility**

Dispatch to the correct renderer.

**Logic**

- resolved-display requests must no longer be redirected solely because the display key starts with `attr_`
- resolved-display requests always render through the resolved glyph pipeline
- remove or deprecate the special attribute-display branch if no longer needed

**Interface**

No public interface change.

### Changed — `src/engine/phaser/display-export/renderResolvedDisplayImage.ts`

**Responsibility**

Render non-avatar display images.

**Logic**

- request glyph textures through the new thickness-aware texture accessor
- resolve placement tint through palette-or-hex helper
- honor `projectGlyphLineThickness`

**Interface**

Param contract expands.

### Changed — `src/engine/phaser/display-export/renderBodyAvatarImage.ts`

**Responsibility**

Render body-avatar export images.

**Logic**

Same glyph texture/tint behavior changes as `renderResolvedDisplayImage.ts`.

**Interface**

Param usage expands.

### Changed — `src/engine/phaser/display-export/buildBodyAvatarImageRequest.ts`

**Responsibility**

Build body-avatar export requests from runtime.

**Logic**

Forward:

- `projectGlyphLineThickness`
- palette colors

from runtime cartridge settings.

**Interface**

Function signature unchanged.

### Changed — `src/engine/phaser/display-export/resolveBodyAvatarExportInputs.ts`

**Responsibility**

Resolve body-avatar export dependencies from active scene/runtime.

**Logic**

Forward the extra settings input into `resolveDisplaySpec(...)`.

**Interface**

Internal helper only.

### Changed — `src/engine/phaser/display-export/buildDisplayImageCacheKey.ts`

**Responsibility**

Cache-key generation for exported display images.

**Logic**

Include:

- `projectGlyphLineThickness`
- palette colors

in resolved-display and body-avatar cache keys.

This is required because both now affect rendered output.

**Interface**

Function signatures unchanged.

### Changed — `src/ui/lib/foundation/icon-registry/useResolvedDisplayIcon.ts`

**Responsibility**

Resolve display-image requests for editor/runtime icon rendering.

**Logic**

No direct logic change beyond consuming the updated request structure from `buildDisplayImageRequest(...)`.

**Interface**

Hook signature unchanged.

## 8. Migration and backward compatibility

## 8.1 Existing blueprints

Existing blueprints that still rely on `_editor.abilities.passport.styleId` / `glyphKey` must continue to render.

Compatibility rule:

- if a display asset exists for the resolved display key, it is authoritative
- otherwise the existing legacy fallbacks in `resolveDisplaySpec.ts` remain in force

## 8.2 Existing attribute-pool display assets

Existing `attribute_pool` display assets with no `glyphKey` remain valid.

First time the user opens **Edit View**:

- the editor assigns a deterministic glyph key
- ensures the glyph preset exists
- persists that linkage in the display asset draft

No standalone migration command is required.

## 8.3 Existing glyph assets

Existing glyph assets without `paletteColorKey` and `lineThickness` remain valid and render identically, except where the project-default thickness intentionally replaces the old hard-coded texture constants.

Default value is chosen to match the current open-line thickness (`10`), minimizing visual drift.

## 9. Test plan

All new/changed tests must follow the existing testing standard: behavior-first, Given/When/Then structure, and factory-based setup. fileciteturn0file2

## 9.1 View tests (UI)

### Changed — `src/ui/devtools/editors/assets/display/DisplayEditor.test.tsx`

Add coverage for:

- `Edit View` button shown for `resource`
- `Edit View` button shown for `attribute_pool`
- `Edit View` button hidden for `body`
- refactored section still renders the same visible controls as before

### Added — `src/ui/devtools/editors/assets/display/useDisplayViewEditor.test.ts`

Cover:

- resource adapter exposes background + glyph editing
- attribute-pool adapter exposes glyph-only editing
- empty attribute-pool `glyphKey` is assigned before modal opens
- project default line thickness is read/written through `assets.settings.glyph_view`

### Changed — `src/ui/devtools/editors/blueprint/mode/forms/PassportAbilityForm.visuals.test.tsx`

Update expectations to verify:

- `Style ID` field absent
- `Glyph ID` field absent
- `Display Key` field still present
- clicking **Edit Visuals** ensures authored display asset creation when missing before opening modal state

### Added — `src/ui/devtools/editors/view-editor/ViewEditorModal.test.tsx`

Cover:

- blueprint adapter renders background + glyph + runtime preview
- resource asset adapter renders background + glyph + display preview
- attribute-pool asset adapter renders glyph + display preview and no background section
- palette options render current project colors
- slot override can clear back to project default

### Added — `src/ui/devtools/editors/view-editor/ViewEditorGlyphInspector.test.tsx`

Cover:

- new attribute-pool shapes appear in the shape selector
- palette mode selection delegates the correct callbacks
- line-thickness override control delegates the correct callbacks

## 9.2 Unit tests (logic/helpers)

### Changed — `src/ui/devtools/editors/assets/display/displayEditorHelpers.test.ts`

Update for:

- `attribute_pool` default/retype includes `glyphKey` behavior if the helper is responsible for it
- summary behavior remains correct

### Added — `src/ui/devtools/editors/blueprint/visuals/ensurePassportDisplayAsset.test.ts`

Cover:

- missing display/style/glyph assets are created
- existing authored display is not overwritten
- returned key matches `passport.icon` fallback rules

### Changed — `src/ui/devtools/editors/blueprint/visuals/useBlueprintVisualsEditorActions.test.ts`

Update expectations to verify:

- style/glyph assets are mutated through the authored display asset
- non-body passport state is no longer linked via `styleId` / `glyphKey`
- project default line thickness is written correctly
- slot palette color / thickness overrides are written correctly

### Added — `src/engine/phaser/display/glyph/glyphColorResolver.test.ts`

Cover:

- palette key overrides hex
- hex used when palette key absent
- only body/mind/social keys are resolved

### Added — `src/engine/phaser/display/glyph/glyphLineThickness.test.ts`

Cover:

- per-slot override wins
- project default used when override absent
- thickness-insensitive shapes return `null`

### Changed — `src/engine/phaser/display/resolveDisplaySpec.visuals.test.ts`

Update to verify:

- authored `attribute_pool.glyphKey` is used
- authored `resource` display asset still overrides legacy blueprint/entity glyph fields
- project default line thickness is included in spec
- legacy passport/style fallback still works when no authored display exists

### Added — `src/engine/phaser/display/glyph/GlyphRegistry.attributePool.test.ts`

Cover:

- `attr_body`, `attr_mind`, `attr_social` return deterministic built-in presets
- authored presets still override built-ins

### Changed — `src/engine/phaser/display-export/buildDisplayImageCacheKey.test.ts`

Update to verify cache invalidates on:

- project default line thickness change
- palette color change

### Added — `src/engine/phaser/display-export/buildDisplayImageRequest.attributePool.test.ts`

Cover:

- authored attribute-pool display builds resolved-display request using authored glyph key
- built-in attribute-pool key builds resolved-display request with built-in fallback glyph behavior

## 9.3 Integration/runtime tests

### Replaced — `src/engine/phaser/display/modules/AttributePoolShapeModule.test.ts`

Remove this test with the removed module.

### Added — `src/engine/phaser/display/modules/AttributePoolGlyphModule.integration.test.ts`

Cover:

- `attr_body` uses glyph rendering pipeline and remains visible
- authored attribute-pool glyph override is honored
- palette-based color uses pulse-engine colors
- project default line thickness affects rendered texture selection

### Added — `src/engine/phaser/display/modules/GlyphModule.lineThickness.test.ts`

Cover:

- texture key changes when override thickness changes
- texture key changes when project default thickness changes
- palette color affects final tint, not texture-key selection

### Changed — `src/ui/lib/foundation/icon-registry/useResolvedDisplayIcon.test.tsx`

Update to verify:

- authored attribute-pool displays resolve through the new request shape
- request contains project line-thickness + palette payload

## 10. Acceptance criteria

Implementation is complete only when all of the following are true:

1. `DisplayEditorDefinitionSection` has been split into narrow presentational files.
2. `resource` and `attribute_pool` display editors both expose **Edit View**.
3. The same shared view-editor UI is used from passport and asset flows.
4. Attribute-pool view editing supports `plus_rounded`, `chevron_up_rounded`, and `triple_circle`.
5. Glyph line thickness has a project default and a per-slot override.
6. Open-line glyph rendering uses rounded endpoints.
7. Glyph slot color can be sourced from the project palette (`body`, `mind`, `social`).
8. Non-body passport visuals are linked by one authored display key, not by direct style/glyph ids.
9. Clicking passport **Edit Visuals** auto-creates the display asset when missing.
10. Legacy blueprints without authored display assets still render through compatibility fallback.
11. All updated tests pass, with no out-of-scope failures and no architectural rule violations. fileciteturn0file0 fileciteturn0file1 fileciteturn0file2

