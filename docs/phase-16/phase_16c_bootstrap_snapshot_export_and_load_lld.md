# Phase 16C — Bootstrap Snapshot Export and Load LLD

## Status

Normative split of Phase 16.

This document is one of three documents that replace the monolithic `phase_16_editor_presentation_lld_final_lld.md`.
It defines the bootstrap snapshot contract, export button, and load command.
It must be implemented together with:
- `phase_16a_app_shell_and_overlay_navigation_lld.md`
- `phase_16b_devtools_manuals_and_interactive_navigation_lld.md`

This document also provides the shared bootstrap loader consumed by Phase 16A.

---

## 1. Governing Contract

This work must conform to:
- `prompt-contract.md`
- `context-pack.md`
- `testing-standards.md`

Locked constraints relevant to this document:
- terminal commands may access the `vfs` singleton directly; this is an allowed exception
- React components must not embed file-system mutation logic; UI actions may delegate to hooks/services
- failures must be explicit and visible
- scope is limited to the exact bootstrap snapshot flows defined here

---

## 2. Why

The codebase already has the essential editor-side disk seam and terminal patterns needed for this feature:
- `FileSystemBase.saveToDisk(...)` posts to `/__editor/save`
- `fsCommands.ts` reads and writes through `/__editor/tree`, `/__editor/read`, and `/__editor/save`
- terminal commands already return deterministic success or error messages
- `useGlobalEditorToolbarActions.ts` already owns global toolbar save/compile orchestration

What the codebase does not have is an explicit, intentional production bootstrap artifact workflow.

Phase 16C exists to provide exactly two operations:
1. an explicit editor action that writes the current VFS snapshot to `public/bootstrap/vfs-prod.json`
2. a terminal command that clears VFS and repopulates it from `/bootstrap/vfs-prod.json`

This phase also defines the shared snapshot validator/loader used by Phase 16A startup bootstrap.

---

## 3. Locked Decisions

## 3.1 Bootstrap artifact locations

The locations are fixed:
- disk path: `public/bootstrap/vfs-prod.json`
- runtime public URL: `/bootstrap/vfs-prod.json`

No alternate filename, folder, or environment-specific path is in scope.

## 3.2 Import semantics

Bootstrap snapshot import is destructive replace-all.

Exact semantics:
- clear current VFS contents
- write every snapshot entry into VFS
- do not merge with existing VFS contents
- do not auto-open a project
- do not auto-compile
- do not auto-run gameplay initialization commands

## 3.3 Snapshot data model

The snapshot format is locked to a top-level JSON object:
- keys are exact VFS paths
- values are the exact JSON-serializable VFS payloads stored under those paths

This phase does not introduce binary payload support.

## 3.4 Export trigger

The export flow is an explicit editor action, not an automatic side effect.
It is triggered from the global editor toolbar.

No CI integration is in scope.
No automatic export-on-save is in scope.

---

## 4. Shared Snapshot Contract

This section is shared by:
- Phase 16A app startup bootstrap
- Phase 16C toolbar export
- Phase 16C terminal bootstrap-load command

## 4.1 Valid snapshot

A valid snapshot is:
- a non-null object
- not an array
- serializable by `JSON.stringify`

The validator is intentionally strict only at the top level.
It does not attempt to schema-validate individual project files.
Those files remain governed by existing workspace/parser/compile contracts.

## 4.2 Required helper ownership

Shared bootstrap helper logic belongs in `src/engine/vfs/bootstrap.ts`.
`App.tsx` and `bootstrapLoadCommand.ts` must both call that shared logic rather than duplicating validation or URL construction.

---

## 5. How

## 5.1 File: `src/engine/vfs/persistence.ts` (Modified)

### Responsibility

Extends the persistence adapter contract with bulk snapshot operations.

### Interface

Add optional bulk methods to `PersistenceAdapter<T>`:
- `exportAll?: () => Promise<Record<string, unknown>>`
- `importAll?: (data: Record<string, unknown>) => Promise<void>`

### Contract

These methods are optional at the interface level so existing adapters remain structurally compatible until updated.
Phase 16C then updates the concrete IndexedDB adapter to implement them.

## 5.2 File: `src/engine/vfs/IndexedDBPersistence.ts` (Modified)

### Responsibility

Implements bulk snapshot extraction and destructive import at the database boundary.

### Interface

Add exact public methods:
- `exportAll(): Promise<Record<string, unknown>>`
- `importAll(data: Record<string, unknown>): Promise<void>`

Keep existing single-entry methods unchanged.

### Logic

`exportAll()`:
1. enumerate all keys in the object store
2. load each stored value
3. build a flat object `{ [key]: value }`
4. return that object

`importAll(data)`:
1. clear the object store completely
2. iterate the provided keys in deterministic sorted order
3. write each entry into the object store

### Error handling

Invalid top-level input must throw.
The method must never partially ignore keys.
If import fails, the failure is surfaced to the caller.

## 5.3 File: `src/engine/vfs/FileSystem.base.ts` (Modified)

### Responsibility

Exposes snapshot operations at the VFS service boundary and provides a shared editor-save helper for non-VFS-path writes.

### Interface

Add exact public methods:
- `exportState(): Promise<Record<string, unknown>>`
- `importState(data: Record<string, unknown>): Promise<void>`
- `saveJsonToDisk(path: string, content: Record<string, unknown>): Promise<void>`

Keep existing `saveToDisk(filename)` behavior unchanged.

### Logic

`exportState()`:
- ensure initialization
- delegate to adapter `exportAll`
- throw explicit error if the adapter does not support bulk export

`importState(data)`:
- ensure initialization
- validate top-level shape using the shared bootstrap validator
- delegate to adapter `importAll`
- throw explicit error if the adapter does not support bulk import

`saveJsonToDisk(path, content)`:
- call the existing editor save endpoint `/__editor/save`
- send `{ path, content }`
- do not require the content to already exist as a VFS key

### Contract

This file is the correct place for the non-file-backed disk write helper because the editor-save seam already lives here.
This avoids duplicating raw editor endpoint logic across UI actions.

## 5.4 File: `src/engine/vfs/bootstrap.ts` (Modified)

### Responsibility

Defines the shared bootstrap snapshot constants and validation/loading helpers.

### Interface

Add exact exports:
- `BOOTSTRAP_SNAPSHOT_DISK_PATH = "public/bootstrap/vfs-prod.json"`
- `BOOTSTRAP_SNAPSHOT_PUBLIC_URL = "/bootstrap/vfs-prod.json"`
- `assertValidBootstrapSnapshot(data: unknown): Record<string, unknown>`
- `loadBootstrapSnapshotFromPublicAsset(fetcher?: typeof fetch): Promise<Record<string, unknown>>`

Keep existing hydration helpers for `game_data.json` unchanged.

### Logic

`assertValidBootstrapSnapshot(data)`:
- accept only non-null plain objects
- reject arrays
- return the object as `Record<string, unknown>` when valid
- throw explicit error otherwise

`loadBootstrapSnapshotFromPublicAsset(fetcher)`:
1. fetch `BOOTSTRAP_SNAPSHOT_PUBLIC_URL`
2. require `res.ok === true`
3. parse JSON
4. validate using `assertValidBootstrapSnapshot`
5. return the validated snapshot

### Contract

This file is the single source of truth for bootstrap snapshot path constants and validation.
No other file may inline those strings or duplicate validation.

## 5.5 File: `src/ui/devtools/shell/useGlobalEditorToolbarActions.ts` (Modified)

### Responsibility

Adds the explicit bootstrap export action to the existing global toolbar action hook.

### Interface

Extend the returned action model with:
- `isExportingBootstrap: boolean`
- `handleExportBootstrap: () => Promise<void>`

Keep existing save/compile actions unchanged.

### Logic

`handleExportBootstrap()` is locked to this sequence:
1. set `isExportingBootstrap = true`
2. call `vfs.exportState()`
3. call `vfs.saveJsonToDisk(BOOTSTRAP_SNAPSHOT_DISK_PATH, snapshot)`
4. log and toast explicit success message on success
5. log and toast explicit error message on failure
6. always clear `isExportingBootstrap`

This action must not be chained into regular save or compile.
It is intentionally separate.

## 5.6 File: `src/ui/devtools/shell/useGlobalEditorToolbar.ts` (Modified)

### Responsibility

Exposes the export-bootstrap action and disabled state to the toolbar view.

### Interface

Extend `GlobalEditorToolbarViewModel` with:
- `isExportingBootstrap: boolean`
- `disableExportBootstrap: boolean`
- `handleExportBootstrap: () => Promise<void>`

### Logic

Disabled-state contract:
- export is disabled while save, compile, or export is already running
- export is otherwise enabled whenever the toolbar is visible

## 5.7 File: `src/ui/devtools/shell/GlobalEditorToolbar.tsx` (Modified)

### Responsibility

Adds the explicit Export Bootstrap button to the existing toolbar.

### Interface

No prop interface changes.
The component continues to consume the toolbar view model.

### Logic

Add a dedicated button labeled exactly:
- `Export Bootstrap`

Button behavior:
- invokes `handleExportBootstrap`
- shows busy text while export is active
- is disabled according to `disableExportBootstrap`

### Contract

This button is a distinct action.
It must not be folded into `Save`.

## 5.8 File: `src/engine/terminal/commands/bootstrapLoadCommand.ts` (New)

### Responsibility

Provides the explicit terminal command that replaces all VFS contents with the shipped public bootstrap snapshot.

### Interface

This file exports one `CommandDefinition` with:
- `name: "bootstrap-load"`
- `description`: explicit destructive-replace description
- `usage: "bootstrap-load"`

No arguments are accepted.

### Logic

Execution sequence is locked:
1. call `loadBootstrapSnapshotFromPublicAsset()` from `src/engine/vfs/bootstrap.ts`
2. call `vfs.importState(snapshot)`
3. call `refreshFileCache()`
4. call `context.ui?.closeWorkspace?.()` to drop stale open workspace/editor state
5. return deterministic success message

### Error handling

On any failure, return deterministic error message.
Do not partially apply additional UI actions after a failed import.

### Contract

This command is destructive and explicit.
There is no confirmation session in this phase.
The destructive nature must be clear in the description and success/error text.

## 5.9 File: `src/engine/terminal/commands.ts` (Modified)

### Responsibility

Registers the new bootstrap load command in the standard terminal command bundle.

### Interface

Add `bootstrapLoadCommand` to `STANDARD_COMMANDS`.

### Contract

No alias is added in this phase.
The canonical command is exactly `bootstrap-load`.

---

## 6. Testing Requirements

All tests must follow the canonical testing standards.
Use Given / When / Then structure and keep mocks at the boundary.

## 6.1 Unit tests

### File: `src/engine/vfs/bootstrap.test.ts` (Modified)

Must cover:
- valid plain-object snapshot is accepted
- array snapshot is rejected
- null snapshot is rejected
- public URL constant is exact
- disk path constant is exact
- successful `loadBootstrapSnapshotFromPublicAsset()` fetches, parses, and returns validated snapshot
- non-OK fetch produces explicit error

### File: `src/engine/vfs/IndexedDBPersistence.test.ts` (Modified)

Must cover:
- `exportAll()` returns complete flat snapshot of stored keys
- `importAll()` clears prior contents before writing new keys
- import preserves all provided keys exactly
- empty snapshot produces empty store

### File: `src/engine/vfs/FileSystem.test.ts` (Modified)

Must cover:
- `exportState()` delegates to adapter bulk export
- `importState()` delegates to adapter bulk import after validation
- unsupported adapter bulk methods throw explicit error
- `saveJsonToDisk()` posts `{ path, content }` to `/__editor/save`

### File: `src/engine/terminal/commands/bootstrapLoadCommand.test.ts` (New)

Must cover:
- successful command fetches snapshot, imports state, refreshes file cache, and closes workspace
- fetch failure returns deterministic error result
- validation failure returns deterministic error result
- import failure returns deterministic error result
- no arguments are required or consumed

## 6.2 View tests

### File: `src/ui/devtools/shell/useGlobalEditorToolbarActions.test.ts` (New)

Must cover:
- `handleExportBootstrap()` exports current VFS state and writes it to `public/bootstrap/vfs-prod.json`
- success path emits success toast and success log
- failure path emits error toast and error log
- `isExportingBootstrap` toggles correctly during the async lifecycle

### File: `src/ui/devtools/shell/useGlobalEditorToolbar.test.ts` (New)

Must cover:
- view model exposes export state and export handler
- export is disabled while save is running
- export is disabled while compile is running
- export is disabled while export is already running

### File: `src/ui/devtools/shell/GlobalEditorToolbar.test.tsx` (New)

Must cover:
- renders `Export Bootstrap` button
- clicking the button invokes the provided export handler
- button shows busy state while exporting
- disabled state is reflected in the button

---

## 7. Acceptance Criteria

This document is complete only when all of the following are true:
- the current VFS can be exported intentionally from the toolbar to `public/bootstrap/vfs-prod.json`
- `/bootstrap/vfs-prod.json` is the single public bootstrap asset consumed by shared bootstrap load logic
- `bootstrap-load` clears current VFS and replaces it from `/bootstrap/vfs-prod.json`
- `bootstrap-load` clears stale workspace/editor state after successful import
- no merge behavior exists in bootstrap import
- no auto-project-load, auto-compile, or auto-`game.init` behavior exists
- Phase 16A can consume the shared loader from this document without duplicating validation or path strings
- all tests described in this document pass

---

## 8. Explicit Non-Goals

Out of scope for Phase 16C:
- CI automation
- generic import/export file picker flows
- alternate bootstrap filenames or environments
- binary asset export/import
- project compilation after snapshot import
- runtime gameplay initialization after snapshot import
- confirmation dialog/session for the destructive terminal command
