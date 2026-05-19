# phase_14_10_hld.md

## Rich Semantic Editors for `.cave`, `.art`, `.bp`, `.draft`, `.cvs`

**Status:** HLD  
**Phase:** 14.10  
**Owner:** Devtools / Editors  
**Scope:** Devtools UI + Workspace runtime apply wiring + blueprint file shape refactor

---

## 1. Summary

This phase replaces the current raw JSON file editors for semantic file types with structured, domain-aware editors, while preserving the existing devtools shell contract:

- File-level actions (Undo / Redo / Save) remain in the global toolbar.
- A new **Apply to Runtime** action is added to the global toolbar and is disabled when no runtime exists.
- Each supported semantic file type gets a dedicated editor:
    - `.cave` (System Config)
    - `.art` (Asset Pack)
    - `.bp` (Blueprint — **one blueprint per file**)
    - `.draft` (Draft Pack)
    - `.cvs` (Script)

This work is intentionally constrained to:

- reorganizing and reusing existing editor components (from the v1 editor code under `src/ui/devtools/editors/**`)
- wiring correct routing and shell integration
- implementing the `.bp` “single blueprint per file” refactor
- providing comprehensive and efficient testing coverage.

No unrelated refactors or speculative abstractions are introduced.

---

## 2. Why (Motivation)

### 2.1 Authoring correctness and velocity

The current semantic file editors are thin wrappers around `RawJsonEditor`, including:

- `BlueprintFileEditor`
- `AssetPackEditor`
- `SystemConfigEditor`
- `DraftPackEditor`

Each currently renders raw JSON directly. This is correct but error-prone and slow for normal authoring workflows. fileciteturn17file0

### 2.2 UI contract compliance

The project’s architectural laws require:

- UI renders semantic state only and does not “cheat” runtime state.
- Mutations flow through explicit pipelines.
- React views should not contain business logic. fileciteturn18file0

A structured editor approach improves correctness without violating these rules, because:

- editors remain pure views + UI tools
- file/runtime actions remain in the shell.

### 2.3 Runtime apply is a first-class operation

The workspace runtime is designed to be cheap to destroy and recreate, and reloading is explicitly first-class. fileciteturn18file0

`WorkspaceService` already rebuilds the runtime on project load and on module reload by linking the project and calling `replaceRuntime()`. fileciteturn17file0

Adding Apply-to-runtime to the global toolbar formalizes and exposes this workflow.

### 2.4 Blueprint file shape refactor

The `.bp` file type currently routes to a raw JSON editor. fileciteturn17file0  
Additionally, blueprint indexing and reference walking currently assume blueprints are stored under `moduleData.blueprints`. fileciteturn16file0

This phase requires `.bp` to represent **exactly one blueprint per file**, which:

- improves modularity
- makes blueprint tabs “1 file = 1 tab” natural
- simplifies future refactors and file operations.

---

## 3. Non-Goals

This phase does **not**:

- redesign the runtime, ECS, or tick phases
- introduce new persistence systems
- change project manifest semantics
- refactor unrelated devtools layout or terminal systems
- implement new domain features (new abilities, new asset types, etc.)
- replace `RawJsonEditor` globally (it remains for `.json` and advanced fallback).

---

## 4. Current Architecture (As-Is)

### 4.1 Editor routing

File extension routing is defined in:

- `src/ui/devtools/shell/window-manager/WindowLayoutResolver.editors.tsx` fileciteturn17file0

Current mapping:

- `.bp` → `BlueprintFileEditor`
- `.art` → `AssetPackEditor`
- `.cave` → `SystemConfigEditor`
- `.draft` → `DraftPackEditor`
- `.json` → `ManifestEditor` or `RawJsonEditor`
- default → `UnknownFileViewer`

Notably: `.cvs` is not routed.

### 4.2 Shell layout and toolbar

`WindowManager` renders:

- `<GlobalEditorToolbar />`
- `<Layout />` (FlexLayout) fileciteturn16file0

The toolbar is therefore already shell-level, not editor-level.

### 4.3 Toolbar capabilities

`GlobalEditorToolbar` currently provides:

- filename + path display
- status pill
- Undo / Redo / Save buttons fileciteturn17file0

### 4.4 Workspace runtime

`WorkspaceService` is responsible for:

- loading projects
- linking modules into a runtime cartridge
- replacing runtime instances
- reloading modules and replacing runtime fileciteturn17file0

This is the correct layer to integrate Apply-to-runtime.

### 4.5 Shell state

Shell state tracks:

- active file path
- active module filename
- tab titles
- layout mode fileciteturn17file0

---

## 5. Target Architecture (To-Be)

### 5.1 High-level design

The devtools system will remain split into:

- **Shell (chrome):** global toolbar + layout + routing
- **Editors:** per-file-type UI, no persistence/runtime controls
- **Workspace:** file IO, linking, runtime replacement

This aligns with the Context Pack laws:

- UI observes and does not mutate simulation state.
- Runtime is replaceable and reloadable. fileciteturn18file0

### 5.2 File editor responsibilities

Each file editor must:

1. Load the relevant module session state for `filename`
2. Provide structured editing UI for its schema
3. Provide editor-local UI tools (pickers, previews, physics tool panels)
4. Emit validation errors into the shared error surface (existing system)
5. Avoid any Save/Apply controls or business logic

### 5.3 Shell responsibilities

The shell provides:

- Undo/Redo/Save
- Apply-to-runtime (new)
- Breadcrumbs (header)
- Tab management (open/close/guard)

This is consistent with the current layout, where `GlobalEditorToolbar` is already outside editor content. fileciteturn16file0

---

## 6. File-Type Editors (UX + Implementation)

All editors follow the same structural rule:

- **Top bar inside editor:** tabs + filter/search + domain tools
- **Body:** a single content surface

Breadcrumbs show only:

- filename
- active tab label (if the editor has tabs)

No deep section breadcrumbs.

### 6.1 `.bp` — Blueprint File Editor (one blueprint per file)

#### UX

- Tabs at top:
    - Abilities (HLL)
    - Components (LLL)
    - Metadata
- Filter/search at top (applies to ability list, component list)
- Single content window below

#### Implementation

- Replace `BlueprintFileEditor.tsx` (currently RawJson wrapper) with a structured editor. fileciteturn17file0
- Reuse the existing `BlueprintEditor` domain editor where possible:
    - `BlueprintEditor` is already routable via `component: "blueprint"` tabs. fileciteturn16file0
- Abilities UI uses `abilitySchemas` as the canonical schema map. fileciteturn16file0

#### Blueprint-per-file refactor

The system currently expects `moduleData.blueprints` to be a map of blueprintId → blueprint.  
Reference indexing walks this structure. fileciteturn16file0

Target: `.bp` file contains a single blueprint object, and module loading assembles:

```
moduleData.blueprints[blueprint.id] = parsedBlueprintFromFile
```

This preserves the runtime contract while changing file storage format.

#### Rationale

- Aligns tab model: 1 `.bp` file == 1 blueprint tab
- Enables file-level operations (rename, move, delete) per blueprint
- Avoids “registry pack” merge conflicts and editing complexity

---

### 6.2 `.art` — Asset Pack Editor

#### UX

- Tabs at top: Icons / Resources / Styles / Veins / Collection
- Filter/search in the same top row
- Single body window

#### Implementation

- Replace `AssetPackEditor.tsx` (currently RawJson wrapper). fileciteturn17file0
- Schema surface is exported via `src/data/schemas/assets.ts`. fileciteturn16file0
- Reuse existing asset editing components (`AssetEditor`, `AssetListPanel`) already integrated in layout resolver. fileciteturn16file0

---

### 6.3 `.cave` — System Config Editor

#### UX

- Tabs at top: Impulse / Vitality / Game Config
- Single body window

#### Implementation

- Replace `SystemConfigEditor.tsx` (currently RawJson wrapper). fileciteturn17file0
- Reuse `ImpulseSettingsEditor` where possible (already supported as a tab component). fileciteturn16file0

---

### 6.4 `.draft` — Draft Pack Editor

#### UX

- Tabs at top: Options / Pools
- Filter/search at top
- Single body window

#### Implementation

- Replace `DraftPackEditor.tsx` (currently RawJson wrapper). fileciteturn17file0
- Use the module session draft slices:
    - `useDraftOptionSlice`
    - `useDraftPoolSlice` fileciteturn16file0

#### Payload editing

Draft option payload is edited as a structured list of typed entries.
This is explicitly not a new “builder system”; it is a typed list editor for existing schema.

---

### 6.5 `.cvs` — Script Editor

#### UX

- Text editor with syntax highlighting for:
    - `#` comments
    - command tokens
- Optional inline help / autocomplete
- No runtime execution controls inside editor

#### Implementation

- Add `.cvs` routing in `resolveFileComponent` in `WindowLayoutResolver.editors.tsx`. fileciteturn16file0
- Use terminal infrastructure exported from `src/lib/terminal/index.ts`. fileciteturn16file0

---

## 7. Apply-to-Runtime (Global Toolbar)

### 7.1 Requirement

Add **Apply-to-runtime** to the top toolbar alongside Undo/Redo/Save.

### 7.2 Location

This button belongs in `GlobalEditorToolbar`, not inside editors.  
The toolbar is already shell-level and is rendered above the layout surface. fileciteturn16file0 fileciteturn17file0

### 7.3 Enablement

Disabled when:

- no runtime exists (`WorkspaceService.activeRuntime == null`) fileciteturn17file0

### 7.4 Semantics

Apply-to-runtime is a two-step operation:

1. Save current module to disk (existing Save flow)
2. Reload modules in workspace and replace runtime:
    - `WorkspaceService.reloadModules([filename])`
    - which links the project and calls `replaceRuntime()` fileciteturn17file0

### 7.5 Architectural rationale

This design aligns with Context Pack laws:

- Runtime is cheap to recreate
- Reloading is first-class
- UI does not mutate ECS directly; it triggers explicit reload boundaries fileciteturn18file0

---

## 8. Devtools Header Breadcrumbs

### 8.1 Requirement

Breadcrumbs are shown in the devtools header and must update based on the selected editor/tab.

### 8.2 Breadcrumb depth

Breadcrumbs include:

- filename
- active editor tab label (if applicable)

No deeper “section” breadcrumbs.

### 8.3 Contract

Editors provide a minimal breadcrumb view model to the shell.
Shell header renders it.

This avoids coupling the shell to editor internals while keeping breadcrumb output consistent.

---

## 9. Component Reorganization

### 9.1 Problem

The existing editor folder contains:

- file wrappers (currently trivial)
- domain editors
- shared primitives
  intermixed.

### 9.2 Target structure

Move toward feature-first colocation as required by the Context Pack. fileciteturn18file0

Proposed structure:

```
src/ui/devtools/editors/
  file/
    BlueprintFileEditor.tsx
    AssetPackEditor.tsx
    SystemConfigEditor.tsx
    DraftPackEditor.tsx
    CvsEditor.tsx
  blueprint/
  assets/
  draft/
  cvs/
  shared/
```

No new generic frameworks are introduced.
This is a re-home of existing components to reduce coupling and improve testability.

---

## 10. Testing Strategy (Leading Concern)

Testing must comply with Testing Standards — Canonical. fileciteturn18file2

### 10.1 Principles

- Test behavior, not implementation.
- Use factories, avoid boilerplate.
- UI tests verify wiring and rendering only.
- Logic must live in stores/hooks/services and be unit-testable. fileciteturn18file2 fileciteturn18file0

---

### 10.2 Required test layers

#### A) Unit tests (logic)

Targets:

- module session slices and helpers
- `.bp` file assembly logic (blueprint-per-file)
- Apply-to-runtime view model logic (enablement, dispatch)

Coverage requirements:

- happy path
- negative path
- edge cases (empty module, missing blueprint id, etc.) fileciteturn18file2

#### B) Integration tests (workspace)

Targets:

- `WorkspaceService.reloadModules()`
- module write + reload + runtime replacement behavior fileciteturn17file0

Constraints:

- Use real `WorkspaceService` with a test vfs adapter
- No ECS mocking for runtime integration (runtime is cheap and replaceable)

#### C) View tests (UI)

Targets:

- each file editor renders without crashing
- tabs + filter appear at top
- wiring calls the correct store actions

Explicitly avoid:

- testing complex business logic in React components fileciteturn18file2 fileciteturn18file0

---

### 10.3 Test efficiency plan

To keep tests comprehensive _and_ fast:

1. **Factories** for:
    - minimal ModuleCartridge
    - minimal blueprint file object
    - minimal asset pack
    - minimal draft pack
2. **Single integration harness** for WorkspaceService:
    - in-memory vfs
    - minimal linker stub that returns deterministic cartridge
3. **UI tests** are smoke + wiring only:
    - render editor with a preloaded module session
    - assert tab labels and one representative field per tab

This produces broad coverage without large DOM fixtures.

---

## 11. Implementation Phases

### Phase 1 — Add `.cvs` routing + editor skeleton

- Add `.cvs` case in file routing
- Implement minimal `CvsEditor` using terminal primitives

### Phase 2 — Replace `.cave`, `.art`, `.draft` raw wrappers

- Swap each wrapper to structured editor UI
- Preserve raw view only as advanced fallback if required

### Phase 3 — `.bp` single-blueprint-per-file refactor

- Implement file parsing/assembly logic
- Update blueprint editor to operate on a single file
- Ensure reference index behavior remains correct

### Phase 4 — Apply-to-runtime in toolbar

- Extend `useGlobalEditorToolbar` to include Apply
- Wire to workspace reload

### Phase 5 — Cleanup + deletion

- Remove unused v1-only wrappers and dead code
- Ensure all tests pass and no lint issues remain

---

## 12. Risks and Mitigations

### Risk: blueprint-per-file breaks existing module loading

Mitigation:

- Introduce strict tests for module assembly
- Ensure `moduleData.blueprints` is still produced in the same shape for runtime and reference index. fileciteturn16file0

### Risk: Apply-to-runtime introduces nondeterministic runtime state

Mitigation:

- Apply-to-runtime is implemented as save + reload + runtime replacement
- This aligns with deterministic runtime assumptions and avoids mid-tick mutation. fileciteturn18file0 fileciteturn17file0

### Risk: UI logic creeps into TSX

Mitigation:

- All state/logic lives in zustand stores or hooks
- TSX remains presentational. fileciteturn18file0

---

## 13. Acceptance Criteria

### Functional

- `.cave`, `.art`, `.bp`, `.draft`, `.cvs` open in dedicated editors.
- `.bp` file represents exactly one blueprint.
- `.cvs` is routed and editable.
- Global toolbar provides Undo/Redo/Save and Apply-to-runtime.
- Apply-to-runtime is disabled when no runtime exists.

### Architectural

- Editors contain no save/apply controls.
- Shell owns file/runtime actions.
- No violations of Context Pack laws. fileciteturn18file0
- No violations of Prompt Contract. fileciteturn18file1

### Quality

- All tests green.
- Comprehensive coverage across unit/integration/view layers. fileciteturn18file2
- No lint or Sonar issues.
- No TODOs.

---

