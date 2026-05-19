# LLD: Complete Display Editor Implementation

## 1. Scope

This document defines the low-level design for completing authored display editing in the devtools UI.

This task covers only authored display assets under `assets.displays` inside `.art` modules.

This task does not introduce any new asset category, virtual path kind, storage model, or rendering/export pipeline.

## 2. Why this work is required

Direct inspection of the current code shows that display editing is only partially implemented:

1. `src/ui/devtools/editors/file/AssetPackEditor.tsx` already exposes a **Displays** entry and opens `list::<filename>::assets::displays`.
2. `src/ui/devtools/shell/window-manager/WindowLayoutResolver.editors.tsx` sends `asset_list` to `AssetListPanel` only when `config.category === "icons"`. Valid asset categories in `src/ui/devtools/state/moduleStore.assets.types.ts` are `displays`, `styles`, and `glyphs`. As a result, the canonical display route is not sent to the visual asset list.
3. `src/ui/devtools/editors/fields/module-explorer/AssetListPanel.tsx`, `asset-grid/useAssetGrid.ts`, `DeleteAssetConfirmModal.tsx`, `create-asset-modal/CreateAssetModal.tsx`, and the asset store actions are already effectively **display-only**, despite their generic names.
4. `src/ui/devtools/editors/assets/AssetEditor.tsx` always renders `DisplayAssetEditorForm`, which is a flat form. It is not a custom accordion editor and it does not match the thoughts-editor UX.
5. `src/ui/devtools/editors/fields/display-asset-editor/DisplayAssetEditorForm.tsx` contains the current type-switch semantics. Those semantics must be preserved.
6. `src/ui/devtools/editors/fields/schemaFieldRenderers.tsx` does not implement `ui:style` or `ui:glyph`. Therefore the generic schema-driven field layer cannot satisfy the required display editor UX.
7. `src/ui/devtools/editors/fields/module-explorer/hooks/useModuleExplorer.ts`, `ModuleExplorer.tsx`, and `ModuleExplorerView.tsx` still use **Icons** and route to `list::<filename>::assets::icons`, which is not the canonical routed path for display assets.
8. `src/data/schemas/assets/displays.ts` defines the exact authored display contract:
   - `body`
   - `attribute_pool` with required `attribute`
   - `resource` with required `styleId` and `glyphKey`
   - optional `tooltip`
   - optional `tags`
9. `src/ui/devtools/editors/blueprint/mode/forms/PassportAbilityForm.tsx` already demonstrates the correct existing pattern for display-related autocompletion: derive style suggestions from `draft.assets.styles` and glyph suggestions from `draft.assets.glyphs`, then feed them into `AutocompleteStringField`.

The correct completion path is therefore not a new generic editor system. The correct completion path is to finish the already-started display-specific editor flow and route it correctly.

## 3. What will be implemented

### 3.1 User-visible result

The completed implementation will provide all of the following:

1. The **Displays** card in the module explorer opens the canonical display list route: `list::<filename>::assets::displays`.
2. The router sends that route to the existing visual asset list panel.
3. Opening a display asset opens a dedicated **custom display editor** instead of the flat `DisplayAssetEditorForm`.
4. The display editor uses collapsible accordions, explicit tooltips, type-aware fields, and autocompletion for `styleId` and `glyphKey`.
5. The display id is editable in-place from the editor header, using the same double-click affordance pattern already used by `EditableTraitId`.
6. Display create, rename, edit, save, and delete all remain on the existing module/session pipeline. No new persistence model is introduced.

### 3.2 Explicit non-goals

The following are out of scope and must not be added in this task:

1. No custom editor for `assets.styles`.
2. No custom editor for `assets.glyphs`.
3. No generic schema-renderer upgrade for `ui:style` or `ui:glyph`.
4. No changes to runtime display resolution, Phaser display export, `GameIcon`, or display image generation.
5. No new asset categories.
6. No new store.
7. No refactor of module save/delete actions to support styles or glyphs.
8. No change to the existing virtual path kinds.

## 4. Current-state constraints that the design must preserve

1. Module editing uses the existing session-draft model and global save flow.
2. `saveAssetToModule` and `deleteAssetFromModule` currently support only `displays`. This task must keep that contract intact.
3. The create-display modal currently creates a placeholder asset and opens its detail tab immediately. That flow remains.
4. Type migration semantics already exist in `DisplayAssetEditorForm.tsx`; those semantics must be preserved exactly.
5. The project contract forbids speculative abstractions and unrelated cleanup.

## 5. UX contract

### 5.1 Routes

The implementation must use the existing route structure only.

1. Display list route: `list::<filename>::assets::displays`
2. Display detail route: `<filename>::assets::displays::<assetId>`
3. Style list route remains `list::<filename>::assets::styles`
4. Glyph list route remains `list::<filename>::assets::glyphs`

No new route prefix or path grammar is allowed.

### 5.2 Display list behavior

1. The display list remains `AssetListPanel`.
2. The list continues to show the existing grid with create and delete actions.
3. The list data source must prefer the active session draft when a module session exists; otherwise it must fall back to the loaded module from `useModuleStore`.
4. The filter behavior remains unchanged: id, tooltip, and tags are searchable.
5. The list remains display-only. It is not generalized to styles or glyphs in this task.

### 5.3 Display detail editor layout

The custom detail editor will have exactly two accordion sections.

#### Section A: Definition

Default state: open.

Contents:

1. Editable display id in the row title.
2. Type selector.
3. Type-specific fields.
4. A short explanatory note for `body` displays.

Collapsed summary string:

1. `body` -> `body`
2. `attribute_pool` -> `attribute_pool · <attribute>`
3. `resource` -> `resource · <styleId-or-unset> / <glyphKey-or-unset>`

#### Section B: Metadata

Default state: open.

Contents:

1. Tooltip textarea.
2. Tags input as a comma-separated editor string.

Collapsed summary string:

1. First non-empty trimmed line of `tooltip`, if present.
2. Otherwise `tags: <comma-separated-tags>`, if at least one tag exists.
3. Otherwise `No metadata`.

### 5.4 Type-specific field contract

#### `body`

Visible editable fields:

1. Type
2. Tooltip
3. Tags

Not shown:

1. Attribute
2. Style ID
3. Glyph Key

Additional UI:

1. A read-only note stating that this display type has no additional authored fields.

#### `attribute_pool`

Visible editable fields:

1. Type
2. Attribute
3. Tooltip
4. Tags

Not shown:

1. Style ID
2. Glyph Key

#### `resource`

Visible editable fields:

1. Type
2. Style ID
3. Glyph Key
4. Tooltip
5. Tags

Autocompletion rules:

1. `Style ID` suggestions come from the current module draft at `assets.styles`.
2. `Glyph Key` suggestions come from the current module draft at `assets.glyphs`.
3. Suggestions are assistive only. Free-form values remain allowed.

### 5.5 Tooltips

The editor must follow the same established pattern already used by the thoughts editor and shared field components:

1. Every accordion title has a tooltip.
2. Every field label has a tooltip.
3. Every explicit action control in the display editor surface has a tooltip.
4. The display id title tooltip must explain the double-click rename affordance.

No interactive control in the new display editor may be left without an explicit tooltip contract.

### 5.6 Rename rules

Rename is a detail-editor operation only.

Rules:

1. Input is trimmed before validation.
2. Empty id is rejected.
3. Duplicate id within `assets.displays` is rejected.
4. The current id may remain unchanged without error.
5. On success, the display record is moved to the new key and the asset value is preserved exactly.
6. On success, the shell must navigate to the new canonical detail route.
7. On failure, the editor must not mutate the draft.
8. On failure, the user must receive an explicit error via toast. Silent failure is not allowed.

### 5.7 Retype rules

Retyping must preserve the current semantics exactly.

1. Re-typing to the same type performs no mutation.
2. Re-typing to `body` results in:
   - `type: "body"`
   - preserve `tooltip`
   - preserve `tags`
   - remove type-specific fields
3. Re-typing to `attribute_pool` results in:
   - `type: "attribute_pool"`
   - `attribute: "body"`
   - preserve `tooltip`
   - preserve `tags`
   - remove resource-only fields
4. Re-typing to `resource` results in:
   - `type: "resource"`
   - `styleId: ""`
   - `glyphKey: ""`
   - preserve `tooltip`
   - preserve `tags`
   - remove attribute-only fields

### 5.8 Tags rules

1. The editor shows tags as a single comma-separated string.
2. On commit, the editor splits by comma, trims each token, removes empty tokens, and preserves original order.
3. The stored draft value remains `string[]`.
4. An input containing no tags stores an empty array.

### 5.9 Save and persistence rules

1. The detail editor edits the existing module session draft only.
2. The detail editor does not write directly to disk.
3. The existing global save path remains the only persistence path for detail edits.
4. The create modal continues to persist the new display immediately through `saveAssetToModule`, then mirrors that result into the current session draft if one exists.
5. The delete modal continues to persist deletion immediately through `deleteAssetFromModule`, then mirrors the deletion into the current session draft if one exists.

### 5.10 Unsupported-category behavior

`AssetEditor` must become explicit.

1. If `category === "displays"`, render the custom display editor.
2. For any other category, render an explicit unsupported-category state with a Back button.
3. It must not silently fall back to the display editor.

## 6. How the implementation works

### 6.1 Architecture choice

The implementation will use the existing display-specific editor path rather than inventing a new one.

The reason is straightforward:

1. The store layer already supports only display assets.
2. The list panel, create modal, and delete modal are already display-specific in behavior.
3. The generic schema renderer does not support the required autocomplete contract.
4. The thoughts editor and `ComponentRow` already provide the desired accordion pattern.

### 6.2 State ownership

The state contract is:

1. `useModuleStore` owns loaded persisted module data.
2. `useSessionStore` owns the editable module draft.
3. `useAssetSession` remains the route-level session adapter for a display asset tab.
4. The new `useDisplayEditor` hook composes `useAssetSession` and adds display-specific mutations and derived view data.
5. The custom editor never bypasses the existing session/update pipeline.

### 6.3 Data flow

#### Open display list

1. Module explorer opens `list::<filename>::assets::displays`.
2. The router sends that path to `AssetListPanel`.
3. `AssetListPanel` uses the existing list/grid UI.
4. `useAssetGrid` resolves display items from session draft first, then from module store.

#### Create display

1. User clicks the existing ghost add item.
2. `CreateAssetModal` collects id and type.
3. `useCreateDisplayAssetModal` builds the new display object with the shared display helper.
4. `saveAssetToModule` persists the new display.
5. If a session exists for the file, the same display is inserted into the session draft.
6. The shell opens the new canonical display detail route.

#### Edit display

1. `AssetEditor` renders `DisplayEditor` for category `displays`.
2. `DisplayEditor` gets the draft asset, derived suggestions, and action handlers from `useDisplayEditor`.
3. Field changes update the current session draft via `updateDraft`.
4. Global save persists the module session as it already does today.

#### Rename display

1. User double-clicks the display id.
2. `EditableTraitId` collects the new id.
3. `useDisplayEditor` validates it with the shared helper.
4. On success, the hook moves the record inside `draft.assets.displays` and then calls `openFile` with the new detail path.
5. On failure, the hook pushes an error toast and returns an error token to the title editor.

#### Delete display

1. User deletes from the list panel.
2. `DeleteAssetConfirmModal` calls the existing store delete action.
3. After successful persistence, it removes the same key from the current session draft if one exists.
4. The list immediately reflects the deletion because it reads from the session draft when present.

## 7. File-by-file design

### 7.1 Files to add

#### `src/ui/devtools/editors/assets/display/displayEditorHelpers.ts`

Responsibility:

Pure display-editor helper functions. This file is the single source of truth for display default creation, retype semantics, tag parsing, rename validation, and collapsed summary text.

Logic:

1. Expose the default asset factory currently duplicated in the create modal.
2. Expose the exact retype semantics currently embedded in `DisplayAssetEditorForm.tsx`.
3. Expose tag parse/format helpers for the metadata editor field.
4. Expose a rename validation helper that rejects empty ids and duplicates.
5. Expose the exact definition-summary formatter used by the Definition accordion.
6. Expose the exact metadata-summary formatter used by the Metadata accordion.

Interface:

Exports the following named functions:

1. `createDefaultDisplayAsset(type)` -> returns a valid `ModuleDisplayAsset` for the requested type.
2. `retypeDisplayAsset(asset, nextType)` -> returns a new `ModuleDisplayAsset` using the exact semantics in section 5.7.
3. `parseDisplayTags(input)` -> returns `string[]` using the exact semantics in section 5.8.
4. `formatDisplayTags(tags)` -> returns the editor string for the current `tags` array.
5. `validateDisplayRename(displays, currentId, nextId)` -> returns `null` when valid, otherwise one of: `empty`, `duplicate`, `missing_current`.
6. `getDisplayDefinitionSummary(asset)` -> returns the exact summary contract in section 5.3.
7. `getDisplayMetadataSummary(asset)` -> returns the exact summary contract in section 5.3.

#### `src/ui/devtools/editors/assets/display/useDisplayEditor.ts`

Responsibility:

Display-specific session adapter for the custom detail editor.

Logic:

1. Compose `useAssetSession` with `ASSET_CATEGORY_DISPLAYS`.
2. Read the current display draft.
3. Derive `styleId` suggestions from the current session draft `assets.styles`.
4. Derive `glyphKey` suggestions from the current session draft `assets.glyphs`.
5. Expose the formatted tags string.
6. Implement display-specific mutators:
   - rename
   - retype
   - set attribute
   - set style id
   - set glyph key
   - set tooltip
   - set tags string
7. Push toast errors for rename failure.
8. Perform route update after successful rename.

Interface:

Exports one hook:

`useDisplayEditor({ filename, assetId, tabId? })`

Returned object fields:

1. `isLoading`
2. `draft`
3. `definitionSummary`
4. `metadataSummary`
5. `tagsText`
6. `styleSuggestions`
7. `glyphSuggestions`
8. `handleBack()`
9. `handleRename(nextId)` -> returns `string | null` for `EditableTraitId`
10. `handleRetype(nextType)`
11. `handleAttributeChange(nextAttribute)`
12. `handleStyleIdChange(nextStyleId)`
13. `handleGlyphKeyChange(nextGlyphKey)`
14. `handleTooltipChange(nextTooltip)`
15. `handleTagsChange(nextTagsText)`

No persistence methods are added here. Save remains owned by the existing global editor/session flow.

#### `src/ui/devtools/editors/assets/display/DisplayEditor.styles.ts`

Responsibility:

Display-editor-only layout primitives.

Logic:

1. Provide vertical spacing and section grouping for the two accordions.
2. Provide a read-only note surface for the `body` type.
3. Provide any local layout wrappers needed by the editor, without introducing business logic.

Interface:

Exports only styled components used by `DisplayEditor.tsx`. No hooks, no store access, no mutation.

#### `src/ui/devtools/editors/assets/display/DisplayEditor.tsx`

Responsibility:

Render the custom detail editor for one authored display asset.

Logic:

1. Use `useDisplayEditor`.
2. Render the existing `ToolFrame`/breadcrumb/back pattern already used by `AssetEditor`.
3. Render exactly two `ComponentRow` accordions: Definition and Metadata.
4. Use `EditableTraitId` for the title-level rename affordance.
5. Use the existing shared field styling and shared tooltip mechanism.
6. Render type-specific fields according to section 5.4.
7. Render `AutocompleteStringField`-style behavior for `styleId` and `glyphKey` using the suggestions returned by the hook.

Interface:

Props:

1. `filename: string`
2. `assetId: string`
3. `tabId?: string`

Behavioral contract:

1. Renders loading state while the module session is not ready.
2. Renders not-found state when the requested display id is absent from the current draft.
3. Never renders unsupported categories; that is owned by `AssetEditor.tsx`.

#### `src/ui/devtools/editors/assets/display/displayEditorHelpers.test.ts`

Responsibility:

Unit-test the helper contract.

Logic covered:

1. Default asset creation for all three display types.
2. Exact retype semantics.
3. Tag parsing and formatting.
4. Rename validation.
5. Definition-summary formatting.
6. Metadata-summary formatting.

Interface:

Pure unit tests only. No DOM. No store. No module loader.

#### `src/ui/devtools/editors/assets/display/DisplayEditor.test.tsx`

Responsibility:

View-test the custom display editor.

Logic covered:

1. Resource displays render type, style, glyph, tooltip, and tags controls.
2. Attribute-pool displays render type and attribute controls, but not style/glyph controls.
3. Body displays render the read-only explanatory note and no extra authored-field controls.
4. Retyping updates the visible field set correctly.
5. Rename uses the editable title affordance and delegates to the hook contract.
6. Tooltips exist on row titles and field labels.

Interface:

DOM-facing tests only. Store/session state is provided through the existing test wrappers and factory module draft.

### 7.2 Files to change

#### `src/ui/devtools/shell/window-manager/WindowLayoutResolver.editors.tsx`

Responsibility:

Resolve editor routes to the correct editor component.

Logic change:

1. Route `asset_list` with category `displays` to `AssetListPanel`.
2. Route `asset_list` with categories `styles` and `glyphs` to `AssetCategoryEditor` exactly as today.
3. Leave file-routing and all non-asset routes unchanged.

Interface:

No new exports. Existing `resolveEditorComponent(node)` signature remains unchanged.

#### `src/ui/devtools/editors/assets/AssetEditor.tsx`

Responsibility:

Route-level shell for asset detail tabs.

Logic change:

1. Replace `DisplayAssetEditorForm` usage with `DisplayEditor` when `category === "displays"`.
2. Keep loading and not-found states.
3. Add explicit unsupported-category state for non-display categories.
4. Keep the existing breadcrumb and Back behavior.

Interface:

`AssetEditorProps` remains unchanged:

1. `filename`
2. `category`
3. `assetId`
4. `tabId?`

#### `src/ui/devtools/editors/assets/create-asset-modal/useCreateDisplayAssetModal.ts`

Responsibility:

Create one new display asset and open its detail route.

Logic change:

1. Replace the local `makeAsset` function with `createDefaultDisplayAsset` from the new helper file.
2. Resolve `existingIds` from the session draft when a module session exists, otherwise from loaded module data.
3. Keep canonical validation and create flow.
4. Continue mirroring the created asset into the session draft after successful persistence.

Interface:

Hook signature remains unchanged.

#### `src/ui/devtools/editors/assets/create-asset-modal/CreateAssetModal.tsx`

Responsibility:

Display-create modal UI.

Logic change:

1. Change title text from generic asset language to display-specific language.
2. Change helper copy to state that the new display opens in the custom display editor.
3. Keep id and type fields only.

Interface:

`CreateAssetModalProps` remains unchanged.

#### `src/ui/devtools/editors/fields/module-explorer/hooks/useModuleExplorer.ts`

Responsibility:

Provide module-explorer navigation actions.

Logic change:

1. Rename the display navigation action from `openIcons` to `openDisplays`.
2. Change the route target to `list::<filename>::assets::displays`.
3. Leave all other explorer navigation unchanged.

Interface:

`ModuleExplorerViewState` changes one field only:

1. remove `openIcons`
2. add `openDisplays`

#### `src/ui/devtools/editors/fields/module-explorer/ModuleExplorer.tsx`

Responsibility:

Wire module-explorer state into the view.

Logic change:

1. Pass `onOpenDisplays` instead of `onOpenIcons`.
2. Leave loading/error handling unchanged.

Interface:

`ModuleExplorerProps` remains unchanged.

#### `src/ui/devtools/editors/fields/module-explorer/ModuleExplorerView.tsx`

Responsibility:

Render the module explorer dashboard.

Logic change:

1. Rename the dashboard card from **Icons** to **Displays**.
2. Keep the same slot in the dashboard grid.
3. Keep the rest of the dashboard unchanged.

Interface:

Props change one field only:

1. remove `onOpenIcons`
2. add `onOpenDisplays`

#### `src/ui/devtools/editors/fields/module-explorer/asset-grid/useAssetGrid.ts`

Responsibility:

Provide list-panel display items and actions.

Logic change:

1. Resolve the display asset record from session draft first, module store second.
2. Keep the existing filter behavior.
3. Keep edit/create/delete actions unchanged.
4. Continue opening display detail routes under `assets::displays`.

Interface:

Function signature remains unchanged:

`useAssetGrid(filename, sessionId)`

Returned fields remain unchanged.

#### `src/ui/devtools/editors/fields/module-explorer/DeleteAssetConfirmModal.tsx`

Responsibility:

Confirm and execute display deletion from the list panel.

Logic change:

1. After successful `deleteAssetFromModule`, remove the same id from the current session draft if the session exists.
2. Keep terminal logging behavior unchanged.
3. Keep modal copy display-specific.

Interface:

Props remain unchanged:

1. `filename`
2. `sessionId`

#### `src/ui/devtools/shell/window-manager/WindowLayoutResolver.editors.test.tsx`

Responsibility:

Verify route-to-editor resolution.

Logic change:

1. Update the asset-list assertions to the canonical category names.
2. Assert that `displays` resolves to `AssetListPanel`.
3. Assert that `styles` and `glyphs` resolve to `AssetCategoryEditor`.
4. Remove legacy `icons` and `resources` expectations from this test.

Interface:

No production exports.

#### `src/ui/devtools/editors/fields/module-explorer/state/explorerStore.test.ts`

Responsibility:

Verify explorer sessions remain isolated.

Logic change:

Update the asset-session id fixture from `assets::icons` to `assets::displays`.

Interface:

No production exports.

#### `src/ui/devtools/editors/assets/AssetEditorFlow.test.tsx`

Responsibility:

End-to-end editor flow test for display assets.

Logic covered:

1. The module explorer opens the **Displays** route.
2. The display list opens the create-display modal.
3. Creating a display opens the custom display editor.
4. Editing `styleId` and `glyphKey` updates the session draft.
5. Renaming the display updates the detail route and the list view before save.
6. Saving persists the renamed display and authored fields.
7. Deleting a display removes it from both the persisted module and the active session draft.

Interface:

DOM integration test only.

### 7.3 Files to delete

#### `src/ui/devtools/editors/fields/display-asset-editor/DisplayAssetEditorForm.tsx`

Reason for deletion:

1. Its flat-form UX is the behavior being replaced.
2. Its only remaining valuable logic is the type-retype behavior, which moves to `displayEditorHelpers.ts`.
3. Keeping it would leave an obsolete second implementation of the same editor contract.

No replacement file may duplicate its business logic. The helper file becomes the single source of truth.

## 8. Test plan

The implementation is complete only when the following tests exist and pass.

### 8.1 Unit tests

`displayEditorHelpers.test.ts` must verify:

1. `createDefaultDisplayAsset("body")`
2. `createDefaultDisplayAsset("attribute_pool")`
3. `createDefaultDisplayAsset("resource")`
4. retype `resource -> body`
5. retype `resource -> attribute_pool`
6. retype `attribute_pool -> resource`
7. tooltip/tags preservation across every retype
8. tag parse trimming and empty-token removal
9. rename validation for empty id
10. rename validation for duplicate id
11. rename validation for missing current id
12. rename validation success
13. definition summary for all three types
14. metadata summary for tooltip-first, tags-fallback, empty-fallback

### 8.2 View tests

`DisplayEditor.test.tsx` must verify:

1. Resource editor shows style and glyph inputs with the correct suggestions source.
2. Attribute-pool editor shows attribute selector and hides resource-only fields.
3. Body editor shows the explanatory note and hides type-specific fields.
4. Changing the type changes the visible control set immediately.
5. The rename affordance is present on the title.
6. Each accordion title and each field label has tooltip content.

### 8.3 Integration tests

`AssetEditorFlow.test.tsx` must verify the complete display flow:

1. Start in the module explorer.
2. Open the Displays card.
3. Create a new display.
4. Edit its resource fields.
5. Rename it.
6. Return to the list and observe the renamed id before save.
7. Save and assert persisted module data.
8. Delete the display and assert both persisted data and draft state are updated.

### 8.4 Regression tests

`WindowLayoutResolver.editors.test.tsx` and `explorerStore.test.ts` must be updated so the canonical path contract is locked.

## 9. Acceptance criteria

The task is complete only when all of the following are true:

1. The module explorer says **Displays**, not **Icons**.
2. The Displays card opens `list::<filename>::assets::displays`.
3. The router resolves that route to the visual asset list.
4. Opening a display renders the new custom accordion editor.
5. `resource` displays have autocomplete-backed `styleId` and `glyphKey` fields sourced from the current draft.
6. Rename, retype, tooltip, and tags editing all work through the existing session draft.
7. Invalid rename never mutates state and never fails silently.
8. Create and delete keep the session draft in sync with the persisted module state.
9. Styles and glyphs remain on the raw JSON editor path.
10. All tests described above are green.

## 10. Rationale for the chosen design

This design is intentionally narrow.

It completes the already-existing display-specific editor path instead of introducing a new abstraction. That is the only approach that is both grounded in the inspected code and consistent with the project contract.

Specifically, this design:

1. reuses existing routes
2. reuses existing store/session mechanisms
3. reuses the existing accordion component
4. reuses the existing rename affordance pattern
5. reuses the existing autocomplete pattern already present in passport editing
6. preserves the current display type semantics exactly
7. avoids touching runtime rendering, Phaser export, generic schema editors, and unrelated asset categories

That is the minimal, contract-compliant completion of the display editor implementation.
