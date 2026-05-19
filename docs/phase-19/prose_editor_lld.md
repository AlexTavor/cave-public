# LLD — Full-screen Texts Editor

## 1. Why

### Problem

Player-authored text is currently authored inline inside semantic module data spread across `.bp`, `.draft`, and `.cave` files. The source code already normalizes those files into `ModuleCartridge` objects and saves them back through semantic serializers, but there is no project-wide surface for:

- seeing all authored text in one place,
- filtering it,
- editing it as continuous prose,
- previewing RichText rendering before save.

### Existing code facts this design is based on

From the codebase:

- Full-screen devtools modes already exist:
    - `EditorShell` switches to `LayoutEditor` when `useShellStore().isLayoutMode` is true.

- The top toolbar already has a stable insertion point:
    - `GlobalEditorToolbar` renders `Menu`, `Undo`, `Redo`, `Physics`, `Compile`, `Export Bootstrap`, `Save`.

- Project modules already load and save through existing semantic IO:
    - `useModuleStore.loadModule`
    - `useModuleStore.saveModuleCartridge`
    - backed by `readSemanticModule` / `saveSemanticModule`

- Project file enumeration already exists:
    - `readProjectManifest`

- RichText preview already exists and is stable:
    - `ui/lib/atoms/rich-text/RichText`

### Design consequence

The texts tool must be:

- a **full-screen devtools mode**, not a FlexLayout tab,
- **transactional** (`ABORT | SAVE`),
- implemented over the **existing module read/write pipeline**,
- isolated from runtime and app shell concerns.

---

## 2. What

## 2.1 Scope

Implement a full-screen texts editor inside devtools, opened from the global toolbar by a new `Texts` button placed immediately left of `Physics`.

The editor will:

- load all eligible authored text from the currently loaded project manifest,
- present it as a single continuous scrolling surface,
- group fields by the first owning object with an `id`,
- render two mirrored columns:
    - left: editable raw text,
    - right: RichText preview,

- provide three filters:
    - `Category`
    - `Type`
    - free-text search,

- provide `ABORT` and `SAVE` controls for exit.

## 2.2 Out of scope

The following are explicitly out of scope for this implementation:

- runtime language switching,
- translation-key replacement inside runtime code,
- scanning hardcoded English strings in `.ts` / `.tsx`,
- integration with FlexLayout tabs,
- undo/redo inside the texts editor,
- “show only dirty blocks”,
- alternate preview modes,
- external diff/export/CSV tooling.

---

## 3. Behavioral contract

## 3.1 Open

The `Texts` button opens the full-screen texts editor.

### Preconditions

The button is enabled only when all of the following are true:

- `activeManifestPath !== null`
- `isLayoutMode === false`
- `isTextsMode === false`
- **no module session in `useSessionStore().sessions` is dirty**

### Why the dirty-session precondition is mandatory

The texts editor is transactional. `ABORT` must discard all of its work, and `SAVE` must persist only the editor’s committed transaction. Existing dirty module sessions would make both guarantees unsafe because open tab work could be stale or overwritten.

This restriction is required for correctness.

## 3.2 Load

On open, the editor:

1. reads the current project manifest,
2. takes only files with extensions:
    - `.bp`
    - `.draft`
    - `.cave`

3. loads each file through `useModuleStore.loadModule`,
4. reads each normalized `ModuleCartridge` through `useModuleStore.getModule`,
5. deep-clones the modules into the texts editor store as isolated working drafts,
6. builds the registry from those isolated working drafts.

No `useSessionStore` draft is mutated during load.

## 3.3 Edit

Editing happens only against the texts editor’s isolated drafts.

For every visible owner block:

- left column shows editable textareas,
- right column shows RichText previews,
- both columns use the same owner frame and field order,
- textarea updates are immediate and update preview immediately.

## 3.4 Abort

`ABORT`:

- discards the texts editor store entirely,
- exits texts mode,
- performs **no save**,
- performs **no mutation** to `useModuleStore`,
- performs **no mutation** to `useSessionStore`,
- performs **no disk write**.

## 3.5 Save

`SAVE`:

1. computes dirty files by diffing the editor’s current registry values against the editor’s baseline registry values,
2. if no file is dirty:
    - exits texts mode,
    - performs no write,

3. otherwise saves dirty files sequentially through `useModuleStore.saveModuleCartridge`,
4. after each successful save:
    - updates the editor baseline for that file to the returned saved module,
    - if a clean `useSessionStore` session exists for that file, syncs it with `replaceDraft` then `commitDraft`,

5. exits texts mode only if **all** dirty files save successfully.

### Save failure behavior

If any file save fails:

- saving stops immediately,
- the editor remains open,
- the error is surfaced through the existing shell log and toast mechanisms,
- no silent recovery occurs.

There is **no rollback** of files already saved before the failure. This is explicit and intentional.

---

## 4. Registry model

## 4.1 Data types

### `TextFieldCategory`

Exact values:

- `label`
- `title`
- `description`
- `body`
- `text`
- `textOverride`
- `summary`
- `name`
- `message`
- `displayName`

### `TextOwnerType`

Exact values:

- `blueprint_display`
- `blueprint_passport`
- `blueprint_body_passport`
- `blueprint_notification`
- `blueprint_storage`
- `blueprint_upkeep`
- `blueprint_draft_ability`
- `draft_option`
- `draft_pool`
- `guidance`
- `tutorial`
- `knowledge`
- `trait`
- `habitus`
- `purge_milestone`

### `TextFieldEntry`

Fields:

- `key: string`
- `filename: string`
- `ownerKey: string`
- `ownerType: TextOwnerType`
- `ownerId: string`
- `category: TextFieldCategory`
- `label: string`
- `path: string`
- `value: string`

### `TextOwnerBlock`

Fields:

- `key: string`
- `filename: string`
- `ownerType: TextOwnerType`
- `ownerId: string`
- `fields: TextFieldEntry[]`

---

## 5. Extraction contract

The registry is built only from normalized `ModuleCartridge` drafts inside the texts editor store.

## 5.1 Inclusion whitelist

### `.bp` modules

For each `blueprints.${blueprintKey}`:

#### ownerType = `blueprint_display`

ownerId = `blueprint.id`
included fields:

- `blueprints.${blueprintKey}.components.display.label` → `label`
- `blueprints.${blueprintKey}.components.display.description` → `description`

#### ownerType = `blueprint_body_passport`

ownerId = `blueprint.id`
included fields:

- `blueprints.${blueprintKey}.components.body.passport.name` → `name`
- `blueprints.${blueprintKey}.components.body.passport.description` → `description`

#### ownerType = `blueprint_passport`

ownerId = `blueprint.id`
included fields:

- `blueprints.${blueprintKey}._editor.abilities.passport.label` → `label`
- `blueprints.${blueprintKey}._editor.abilities.passport.description` → `description`

#### ownerType = `blueprint_notification`

ownerId = `blueprint.id`
for each notification index `i`:

- `blueprints.${blueprintKey}._editor.abilities.notifications.${i}.title` → `title`
- `blueprints.${blueprintKey}._editor.abilities.notifications.${i}.text` → `text`

Field labels:

- `notification[${i + 1}].title`
- `notification[${i + 1}].text`

#### ownerType = `blueprint_storage`

ownerId = `blueprint.id`
for each storage index `i`:

- `blueprints.${blueprintKey}._editor.abilities.storage.${i}.displayName` → `displayName`

Field label:

- `storage[${resource}].displayName`
  where `${resource}` is the current `resource` value for that storage row, or `${i + 1}` if missing.

#### ownerType = `blueprint_upkeep`

ownerId = `blueprint.id`
for each upkeep index `i`:

- `blueprints.${blueprintKey}._editor.abilities.upkeep.${i}.displayName` → `displayName`

Field label:

- `upkeep[${resource}].displayName`
  where `${resource}` is the current `resource` value for that upkeep row, or `${i + 1}` if missing.

#### ownerType = `blueprint_draft_ability`

ownerId = `blueprint.id`
included field:

- `blueprints.${blueprintKey}._editor.abilities.draft.label` → `label`

---

### `.draft` modules

#### ownerType = `draft_option`

ownerId = `draftOption.id`
included fields:

- `draftOptions.${optionKey}.title` → `title`
- `draftOptions.${optionKey}.description` → `description`

#### ownerType = `draft_pool`

ownerId = `draftPool.id`
for each text index `i`:

- `draftPools.${poolKey}.texts.${i}` → `text`

Field label:

- `text[${i + 1}]`

---

### `.cave` modules

#### ownerType = `guidance`

ownerId = `guidance.id`
included fields:

- `config.settings.guidances.${i}.title` → `title` **only if the property exists**
- `config.settings.guidances.${i}.text` → `text` **only if the property exists**

#### ownerType = `tutorial`

ownerId = `tutorial.id`
for each guidance-use index `j`:

- `config.settings.tutorials.${i}.guidances.${j}.textOverride` → `textOverride` **only if the property exists**

Field label:

- `guidance[${guidanceId}].textOverride`
  where `${guidanceId}` is the current `guidanceId` value, or `${j + 1}` if missing.

#### ownerType = `knowledge`

ownerId = `knowledge.id`
included fields:

- `config.settings.knowledge.${i}.label` → `label`
- `config.settings.knowledge.${i}.description` → `description`
- `config.settings.knowledge.${i}.textOverride` → `textOverride` **only if the property exists**

#### ownerType = `trait`

ownerId = `trait.id`
included fields:

- `config.traits.${traitKey}.label` → `label`
- `config.traits.${traitKey}.description` → `description` **only if the property exists**

#### ownerType = `habitus`

ownerId = `habitus.id`
included fields:

- `config.habiti.${habitusKey}.label` → `label`
- `config.habiti.${habitusKey}.description` → `description`
- `config.habiti.${habitusKey}.summary` → `summary`
- for each effect index `j`:
    - `config.habiti.${habitusKey}.effects.${j}.description` → `description`

Field label for effect descriptions:

- `effect[${j + 1}].description`

#### ownerType = `purge_milestone`

ownerId = `milestone.id`
for each message index `j`:

- `config.settings.game_config.purge.milestones.${i}.messages.${j}` → `message`

Field label:

- `message[${j + 1}]`

---

## 5.2 Explicit exclusions

The following are excluded from v1 by design:

- `config.settings.game_config.susDisplays[].text`
    - excluded because the entry does not have an owning `id`, and the editor’s grouping invariant is “group by first owning object with `id`”

- `components.display.bars[].label`
    - excluded because these are UI status-label atoms, not prose surfaces

- `metadata.*`
- any hardcoded strings in `.ts` / `.tsx`
- any path not listed in the whitelist above

No other fields are extracted.

---

## 6. Filtering contract

## 6.1 Category filter

Single-select.
Values:

- `all`
- every `TextFieldCategory` present in the registry

Semantics:

- filters **fields**
- a block remains visible if at least one field survives

## 6.2 Type filter

Single-select.
Values:

- `all`
- every `TextOwnerType` present in the registry

Semantics:

- filters **blocks**
- only blocks whose `ownerType` equals the selected type are shown

## 6.3 Free-text search

Single input.
Case-insensitive substring match.

Search domain:

- `filename`
- `ownerId`
- `ownerType`
- `field.label`
- `field.value`

Semantics:

- filters **fields**
- a block remains visible if at least one field matches
- only matching fields remain visible inside that block

## 6.4 Combined filter semantics

The final visible surface is:

1. type-filtered blocks
2. then category-filtered fields
3. then search-filtered fields
4. blocks with zero remaining fields are removed

---

## 7. UI contract

## 7.1 Shell integration

The texts editor is a full-screen devtools mode, parallel to layout mode.

It is **not** a FlexLayout tab.

## 7.2 Overall layout

- full viewport overlay inside `EditorShell`
- top HUD with:
    - title badge
    - subtitle
    - `ABORT`
    - `SAVE`

- filter bar below HUD
- single vertical scroll surface below filters

## 7.3 Block layout

Each `TextOwnerBlock` renders as one row with two mirrored panels:

### Left panel

- owner outline
- owner id, non-editable
- secondary metadata line: `ownerType · filename`
- one autosizing textarea per visible field
- each textarea preceded by its field label

### Right panel

- same owner outline
- same owner id
- same secondary metadata line
- one RichText preview per visible field
- same field labels and order as left panel

## 7.4 Autosizing text fields

Each editable field is an autosizing textarea:

- height is recalculated on every value change,
- minimum height is one text row,
- manual resize is disabled,
- scrollbars inside the textarea are not used.

## 7.5 Preview contract

Each visible field preview uses:

- `RichText`
- default `variant="body"`

The preview reflects the current in-editor raw value immediately.

---

## 8. How

## 8.1 Mode ownership

### `useShellStore`

Add a second full-screen mode flag alongside layout mode:

New state:

- `isTextsMode: boolean`
- `textsTargetManifestPath: string | null`

New action:

- `toggleTextsMode(active: boolean, manifestPath?: string): void`

Behavior:

- enabling sets:
    - `isTextsMode = true`
    - `textsTargetManifestPath = manifestPath ?? state.activeManifestPath`

- disabling sets:
    - `isTextsMode = false`
    - `textsTargetManifestPath = null`

No shell persistence changes:

- `isTextsMode` and `textsTargetManifestPath` are **not** added to `partialize`

## 8.2 EditorShell switching

`EditorShell` switching order:

1. if `isLayoutMode && layoutTargetFilename`, render `LayoutEditor`
2. else if `isTextsMode && textsTargetManifestPath`, render `TextsEditor`
3. else render normal `WindowManager`

Both full-screen modes still mount the toast portal.

## 8.3 Toolbar opening

`GlobalEditorToolbar` adds `Texts` immediately before `Physics`.

`useGlobalEditorToolbar` adds:

- `disableTexts`
- `handleTexts`

`disableTexts` is true when:

- no active manifest
- layout mode active
- texts mode active
- any session in `useSessionStore.getState().sessions` has `isDirty === true`

`handleTexts`:

- calls `toggleTextsMode(true, activeManifestPath)`

## 8.4 Texts editor store

Use a dedicated Zustand store for the editor’s isolated transaction state.

State:

- `manifestPath: string | null`
- `files: string[]`
- `draftsByFile: Record<string, ModuleCartridge>`
- `baselineByFile: Record<string, ModuleCartridge>`
- `isLoading: boolean`
- `isSaving: boolean`
- `error: string | null`
- `categoryFilter: "all" | TextFieldCategory`
- `typeFilter: "all" | TextOwnerType`
- `query: string`

Actions:

- `beginLoad(manifestPath)`
- `finishLoad(files, draftsByFile)`
- `failLoad(message)`
- `setCategoryFilter(value)`
- `setTypeFilter(value)`
- `setQuery(value)`
- `updateText(filename, path, value)`
- `beginSave()`
- `finishSave(savedByFile)`
- `failSave(message)`
- `discard()`

Rules:

- `finishLoad` deep-clones input drafts into both `draftsByFile` and `baselineByFile`
- `finishSave` deep-clones saved modules into both `draftsByFile` and `baselineByFile`
- `discard` resets the entire store to initial empty state

## 8.5 Load flow

`useTextsEditorController(manifestPath)` performs:

1. `beginLoad(manifestPath)`
2. `readProjectManifest(vfs, manifestPath)`
3. filter manifest files to `.bp`, `.draft`, `.cave`
4. for each eligible file:
    - `await useModuleStore.getState().loadModule(filename)`
    - `const module = useModuleStore.getState().getModule(filename)`
    - if module is null, throw explicit error

5. call `finishLoad(eligibleFiles, loadedModules)`

Pseudo-flow:

- read manifest
- load eligible modules through existing module store
- clone them into isolated editor state
- derive registry from isolated drafts

## 8.6 Registry building

`buildTextRegistry(draftsByFile, files)` is a pure function.

Input:

- current drafts by file
- manifest-order file list

Output:

- ordered `TextOwnerBlock[]`

Ordering:

1. file order = manifest order
2. within a file, owner blocks in extractor-spec order
3. fields in spec order and natural array order

No side effects.

## 8.7 Save flow

`useTextsEditorController` save path:

1. build current registry from `draftsByFile`
2. build baseline registry from `baselineByFile`
3. compute dirty filenames by comparing extracted field values only
4. if dirty filename list is empty:
    - `discard()`
    - `toggleTextsMode(false)`
    - log info
    - return

5. `beginSave()`
6. for each dirty filename in manifest order:
    - `const draft = draftsByFile[filename]`
    - `const saved = await useModuleStore.getState().saveModuleCartridge({ filename, module: draft })`
    - if `useSessionStore.getState().sessions[filename]` exists:
        - if session is dirty: throw explicit error and stop
        - else `replaceDraft(filename, saved)` then `commitDraft(filename)`

    - accumulate `saved`

7. `finishSave(savedByFile)`
8. `toggleTextsMode(false)`
9. log success and toast success

Failure path:

- `failSave(message)`
- keep editor open

---

## 9. Files to change

## 9.1 `src/ui/devtools/shell/shell.types.ts`

### Responsibility

Declare shell state contract.

### Change

Add:

- `isTextsMode: boolean`
- `textsTargetManifestPath: string | null`
- `toggleTextsMode(active: boolean, manifestPath?: string): void`

### Interface

Shell consumers may read mode flags and toggle texts mode exactly the same way they already do for layout mode.

---

## 9.2 `src/ui/devtools/shell/shell.ts`

### Responsibility

Own persisted devtools shell state.

### Change

Add initial state and action implementation for texts mode.

### Logic

- initialize `isTextsMode = false`
- initialize `textsTargetManifestPath = null`
- implement `toggleTextsMode`
- do **not** add texts mode state to persisted `partialize`

### Interface

Existing callers remain unchanged.
New callers use `toggleTextsMode`.

---

## 9.3 `src/ui/devtools/shell/EditorShell.tsx`

### Responsibility

Top-level devtools shell mode switch.

### Change

Add texts-mode branch.

### Logic

Render priority:

1. layout mode
2. texts mode
3. normal window manager

### Interface

No prop changes.

---

## 9.4 `src/ui/devtools/shell/GlobalEditorToolbar.tsx`

### Responsibility

Render global devtools toolbar actions.

### Change

Insert `Texts` button immediately left of `Physics`.

### Logic

- button label: `Texts`
- button title: `Open full-screen texts editor`
- button uses `viewModel.disableTexts`
- button uses `viewModel.handleTexts`

### Interface

Reads the extended toolbar view model.

---

## 9.5 `src/ui/devtools/shell/useGlobalEditorToolbar.types.ts`

### Responsibility

Define toolbar view model shape.

### Change

Add:

- `disableTexts: boolean`
- `handleTexts: () => void`

---

## 9.6 `src/ui/devtools/shell/useGlobalEditorToolbar.ts`

### Responsibility

Assemble toolbar state and actions.

### Change

Compute texts-mode button state and action.

### Logic

- subscribe to `isTextsMode`
- subscribe to `activeManifestPath`
- subscribe to `useSessionStore` dirty-session presence
- compute `disableTexts`
- implement `handleTexts` by calling `toggleTextsMode(true, activeManifestPath)`

### Interface

Returns the extended toolbar view model.

---

# 10. Files to add

## 10.1 `src/ui/devtools/texts/state/useTextsEditorStore.ts`

### Responsibility

Own all mutable state for the transactional texts editor.

### Logic

Implement the exact state and actions listed in section 8.4.

### Interface

Zustand hook returning store state and actions.

---

## 10.2 `src/ui/devtools/texts/types.ts`

### Responsibility

Declare all feature-local types.

### Logic

Define:

- `TextFieldCategory`
- `TextOwnerType`
- `TextFieldEntry`
- `TextOwnerBlock`

### Interface

Pure type exports only.

---

## 10.3 `src/ui/devtools/texts/textRegistrySpecs.ts`

### Responsibility

Define the extraction whitelist.

### Logic

This file is the authoritative source of:

- supported module kinds,
- owner types,
- exact field path patterns,
- field labels,
- optional-field rules.

No traversal logic lives here; this file is declarative.

### Interface

Exports read-only spec data used by registry builders.

---

## 10.4 `src/ui/devtools/texts/buildTextRegistry.ts`

### Responsibility

Build ordered `TextOwnerBlock[]` from isolated drafts.

### Logic

- read only from `draftsByFile`
- use `textRegistrySpecs`
- extract only whitelisted paths
- omit missing optional fields
- order blocks and fields deterministically

### Interface

Pure function:

- input: `draftsByFile`, `files`
- output: `TextOwnerBlock[]`

---

## 10.5 `src/ui/devtools/texts/filterTextRegistry.ts`

### Responsibility

Apply type/category/query filters to the registry.

### Logic

- apply type at block level
- apply category and query at field level
- drop blocks with zero surviving fields

### Interface

Pure function:

- input: blocks + filter state
- output: filtered blocks

---

## 10.6 `src/ui/devtools/texts/useTextsEditorController.ts`

### Responsibility

Own load, abort, save orchestration.

### Logic

- load manifest and modules
- initialize editor store
- compute filtered registry
- save dirty files through `useModuleStore`
- sync clean module sessions after save
- log/toast successes and failures
- close mode on abort/save success

### Interface

Hook returns:

- `isLoading`
- `isSaving`
- `error`
- `blocks`
- `categoryOptions`
- `typeOptions`
- `filters`
- `setCategoryFilter`
- `setTypeFilter`
- `setQuery`
- `handleAbort`
- `handleSave`
- `canSave`

---

## 10.7 `src/ui/devtools/texts/TextsEditor.tsx`

### Responsibility

Render the full-screen texts editor.

### Logic

Render only:

- HUD
- filter bar
- scroll surface of owner blocks
- loading / error states

No loading, persistence, or extraction logic lives here.

### Interface

Props:

- `manifestPath: string`

---

## 10.8 `src/ui/devtools/texts/TextsEditor.styles.ts`

### Responsibility

Emotion styles for the full-screen texts editor layout.

### Logic

Define:

- root overlay
- stage chrome
- filter bar
- scroll surface
- two-column block grid
- owner outline panels
- field stack
- preview stack

### Interface

Style exports only.

---

## 10.9 `src/ui/devtools/texts/TextsHUD.tsx`

### Responsibility

Render the top action HUD for the full-screen editor.

### Logic

- show mode badge and subtitle
- render `ABORT`
- render `SAVE`
- disable save when `canSave === false`

### Interface

Props:

- `onAbort: () => void`
- `onSave: () => void`
- `disableSave?: boolean`

---

## 10.10 `src/ui/devtools/texts/TextsHUD.styles.ts`

### Responsibility

Style the HUD using the same design language as `LayoutHUD`.

### Logic

Mirror the structural pattern of `LayoutHUD` without reusing layout-specific labels.

---

## 10.11 `src/ui/devtools/texts/TextFiltersBar.tsx`

### Responsibility

Render the three filters.

### Logic

Use existing themed form styles:

- one select for category
- one select for type
- one text input for query

### Interface

Props:

- `category`
- `type`
- `query`
- `categoryOptions`
- `typeOptions`
- `onCategoryChange`
- `onTypeChange`
- `onQueryChange`

---

## 10.12 `src/ui/devtools/texts/TextOwnerBlock.tsx`

### Responsibility

Render one owner block as mirrored left/right panels.

### Logic

- render owner header on both sides
- render identical field ordering on both sides
- left side uses editable field components
- right side uses RichText previews

### Interface

Props:

- `block: TextOwnerBlock`

---

## 10.13 `src/ui/devtools/texts/TextFieldRow.tsx`

### Responsibility

Render one field pair inside an owner block.

### Logic

- left: autosizing editable textarea
- right: RichText preview
- both show the same field label
- writes directly to `useTextsEditorStore.updateText`

### Interface

Props:

- `filename`
- `path`
- `label`
- `value`

---

## 10.14 `src/ui/devtools/texts/AutosizeTextArea.tsx`

### Responsibility

Provide autosizing textarea behavior for the texts editor.

### Logic

- height reset to `auto`
- height set to `scrollHeight`
- rerun on value change

### Interface

Props:

- standard textarea props
- no business logic beyond autosizing

---

# 11. Test plan

Tests must follow the project testing standard: behavior-first, explicit Given/When/Then structure, with pure logic tested outside UI and UI tests limited to rendering and interaction.

## 11.1 Files to add or change for tests

### `src/ui/devtools/shell/GlobalEditorToolbar.test.tsx`

Add assertions:

- `Texts` button exists
- click invokes `handleTexts`
- button appears before `Physics`

### `src/ui/devtools/shell/EditorShell.texts.test.tsx` (new)

Verify:

- when `isTextsMode` is true and `textsTargetManifestPath` is set, `TextsEditor` renders instead of `WindowManager`

### `src/ui/devtools/shell/useGlobalEditorToolbar.texts.test.tsx` (new)

Verify:

- `disableTexts` true when no manifest
- `disableTexts` true when layout mode active
- `disableTexts` true when texts mode active
- `disableTexts` true when any session is dirty
- `handleTexts` toggles texts mode with the active manifest path

### `src/ui/devtools/shell/shell.texts.test.ts` (new)

Verify:

- `toggleTextsMode(true, manifestPath)` sets texts mode state
- `toggleTextsMode(false)` clears texts mode state
- texts mode state is not persisted through `partialize`

### `src/ui/devtools/texts/buildTextRegistry.test.ts` (new)

Unit tests for:

- exact whitelist extraction
- deterministic ordering
- owner grouping
- optional-field omission
- exclusion of `susDisplays[].text`
- exclusion of non-whitelisted fields

### `src/ui/devtools/texts/filterTextRegistry.test.ts` (new)

Unit tests for:

- type filtering
- category filtering
- query filtering
- combined filters
- block removal when no fields remain

### `src/ui/devtools/texts/useTextsEditorController.test.tsx` (new)

Integration-style hook tests for:

- manifest load success
- module load failure
- no-dirty-files save path exits without writes
- dirty-files save path writes sequentially
- session-sync on save for clean sessions
- hard failure when a session is dirty during save
- abort exits without writes

### `src/ui/devtools/texts/TextsHUD.test.tsx` (new)

View tests for:

- `ABORT` callback
- `SAVE` callback
- disabled save state

### `src/ui/devtools/texts/TextsEditor.test.tsx` (new)

View tests for:

- loading state
- error state
- mirrored owner headers
- filter interaction
- live RichText preview after edit
- continuous block rendering

### `src/ui/devtools/texts/AutosizeTextArea.test.tsx` (new)

View test for:

- height updates when value grows

---

# 12. Final implementation rules

1. No business logic in `.tsx`.
2. All mutable editor state lives in Zustand.
3. All extraction and filtering logic is pure and colocated under `ui/devtools/texts`.
4. The texts editor is transactional and isolated.
5. `ABORT` never mutates module/session/disk state.
6. `SAVE` uses only existing module save mechanisms.
7. The whitelist in section 5 is authoritative.
8. No route-tab integration.
9. No runtime i18n work.
10. No guessing outside the exact field list and flows defined above.

This is the implementation contract.
