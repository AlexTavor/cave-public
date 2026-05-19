# Phase 16A — App Shell, Main Menu, and Overlay Navigation LLD

## Status

Normative split of Phase 16.

This document is one of three documents that replace the monolithic `phase_16_editor_presentation_lld_final_lld.md`.
It defines the app-shell and overlay behavior only.
It must be implemented together with:
- `phase_16b_devtools_manuals_and_interactive_navigation_lld.md`
- `phase_16c_bootstrap_snapshot_export_and_load_lld.md`

This document depends on the bootstrap snapshot contract defined in Phase 16C.

---

## 1. Governing Contract

This work must conform to:
- `prompt-contract.md`
- `context-pack.md`
- `testing-standards.md`

Locked constraints relevant to this document:
- UI components render only; app-shell orchestration logic may live in hooks or the top-level app component, but no runtime mutation logic may move into presentation components.
- Runtime remains the single source of truth for simulation state.
- Errors must fail loudly and must be surfaced visibly.
- No fallback project payload may be synthesized in React.
- No scope may be added beyond app shell, overlays, and bootstrap status handling.

---

## 2. Why

The current app shell always mounts `EditorShell` and `RuntimeShell` together and provides no top-level user mode selection.
`src/App.tsx` currently has a single responsibility beyond rendering: a performance cleanup effect.
It does not distinguish between:
- menu
- game
- editor

That is insufficient for the target interaction model.

Phase 16A exists to provide:
- a deterministic entry state
- explicit transitions between menu, runtime view, and devtools
- visible bootstrap status and bootstrap failure reporting
- a runtime-first shell where overlays can come and go without unmounting the runtime

This phase does not define how the bootstrap snapshot is produced or how the terminal bootstrap command works. Those behaviors are defined in Phase 16C.

---

## 3. What

Phase 16A introduces a top-level app mode state with exactly three values:
- `menu`
- `game`
- `editor`

The runtime remains mounted at all times.
The menu and the editor are overlays above the runtime.

On startup, the app must:
1. initialize the VFS
2. determine whether a root `manifest.json` exists in VFS
3. if it does not exist, invoke the bootstrap snapshot load flow defined in Phase 16C
4. surface bootstrap progress and bootstrap failure to the user

Mode semantics are locked:
- `menu`: show the menu overlay above runtime
- `game`: show runtime only
- `editor`: show the editor overlay above runtime

This phase is intentionally limited to shell composition and visibility.
It does not automatically compile the workspace, load a project into runtime, or run gameplay initialization commands.

---

## 4. Integration Boundaries

### 4.1 Dependency on Phase 16C

Phase 16A consumes, but does not define, these Phase 16C contracts:
- the public bootstrap snapshot URL constant
- the bootstrap snapshot validator / loader
- `vfs.importState(...)`

`src/App.tsx` must not duplicate bootstrap parsing or validation logic.
It must call the shared bootstrap logic defined in Phase 16C.

### 4.2 Dependency on existing editor shell behavior

The existing editor shell already has an internal visibility toggle via `useShellStore().isEditorOpen` and the backquote hotkey in `useGlobalKeys`.
Phase 16A does not remove that behavior.

Locked interaction rule:
- App mode decides whether the editor shell is part of the active overlay stack.
- The existing `isEditorOpen` flag continues to decide whether the editor overlay itself is visible while the app is in editor mode.

That means:
- choosing `Open Devtools` from the main menu enters app mode `editor` and sets `isEditorOpen` to `true`
- choosing `Play` enters app mode `game` and sets `isEditorOpen` to `false`
- pressing backquote while already in app mode `editor` may hide or re-show the editor overlay without changing app mode

This preserves existing hotkey semantics without inventing a second hotkey system.

---

## 5. How

## 5.1 File: `src/App.tsx` (Modified)

### Responsibility

`App.tsx` becomes the sole top-level coordinator for:
- app mode
- one-time bootstrap check
- runtime/menu/editor overlay composition

It remains the only file in this document that owns startup sequencing.

### Interface

The default export remains the application root component.
No public props are added.

### Logic

The existing performance cleanup effect remains unchanged.

Add local app state with the following exact responsibilities:
- `mode`: current shell mode, one of `menu`, `game`, `editor`
- `isBootstrapping`: startup bootstrap in progress
- `bootstrapError`: human-readable startup error string, or `null`
- `hasWorkspaceManifest`: whether a usable root `manifest.json` exists after startup processing

Startup flow is locked and must execute once on mount:
1. call `vfs.init()`
2. read `manifest.json` from VFS using `vfs.readFile("manifest.json")`
3. if the result is not `null`, set `hasWorkspaceManifest = true` and finish
4. if the result is `null`, call the shared Phase 16C public-bootstrap loader
5. if Phase 16C returns a valid snapshot, call `vfs.importState(snapshot)`
6. call `refreshFileCache()` after successful import
7. re-check `manifest.json`
8. if `manifest.json` is still absent, store an explicit bootstrap error
9. if any step throws, store an explicit bootstrap error and log it
10. always clear `isBootstrapping` at the end

Render contract:
- always mount `RuntimeShell`
- render `MainMenu` when `mode === "menu"`
- render `EditorShell` when `mode === "editor"`
- render no overlay when `mode === "game"`

Transition handlers are locked:
- `handlePlay`: set app mode to `game`; set `useShellStore.getState().toggleEditor(false)`
- `handleOpenDevtools`: set app mode to `editor`; set `useShellStore.getState().toggleEditor(true)`

Bootstrap-to-menu contract:
- while `isBootstrapping` is `true`, menu actions are disabled
- if bootstrap fails and no root manifest exists, `Play` is disabled and `Open Devtools` remains enabled
- if bootstrap succeeds, both actions are enabled
- bootstrap failure must remain visible on the menu until the user leaves the menu

### Error handling

`App.tsx` must never silently ignore bootstrap failure.
All failures must:
- set `bootstrapError`
- log the original error to the console
- leave the app in a recoverable UI state

### Explicit non-goals for this file

`App.tsx` must not:
- synthesize a placeholder workspace payload
- compile a project manifest into runtime
- auto-run `project-load`
- auto-run `game.init`
- embed the bootstrap snapshot inline in source code

## 5.2 File: `src/ui/production/MainMenu.tsx` (New)

### Responsibility

`MainMenu.tsx` is the full-screen production/editor entry overlay.
It is presentation-only.
It surfaces bootstrap status and exposes the two shell transitions.

### Interface

Props are locked to:
- `onPlay: () => void`
- `onOpenDevtools: () => void`
- `isBootstrapping: boolean`
- `bootstrapError: string | null`
- `canPlay: boolean`
- `canOpenDevtools: boolean`

No VFS access, store access, runtime access, or fetch logic is allowed in this component.

### Logic

The component renders:
- product title area
- primary `Play` action
- secondary `Open Devtools` action
- visible bootstrap status area
- visible bootstrap error area when `bootstrapError` is not `null`

Interaction contract:
- while `isBootstrapping` is `true`, both buttons are disabled
- when `canPlay` is `false`, `Play` is disabled and visibly styled as unavailable
- when `canOpenDevtools` is `false`, `Open Devtools` is disabled
- clicking an enabled button invokes its callback exactly once

### Styling contract

This is an overlay component and must not mutate layout state.
It may use Emotion styled components and theme tokens only.
No inline magic values are allowed outside small one-off semantic values already accepted by the project.

---

## 6. Testing Requirements

All tests must follow the canonical testing standards.
They must use Given / When / Then structure and avoid noise.

## 6.1 View tests

### File: `src/ui/production/MainMenu.test.tsx` (New)

Must cover:
- renders title and both actions when idle
- disables both actions while bootstrapping
- shows explicit bootstrap error text when provided
- `Play` click calls `onPlay` once when enabled
- `Open Devtools` click calls `onOpenDevtools` once when enabled
- disabled actions do not invoke callbacks

### File: `src/App.test.tsx` (New)

Must cover:
- runtime shell remains mounted in all three app modes
- successful startup with existing `manifest.json` does not invoke Phase 16C bootstrap import
- missing `manifest.json` invokes the shared Phase 16C bootstrap loader exactly once
- successful bootstrap import clears bootstrapping state and enables `Play`
- bootstrap failure disables `Play`, keeps `Open Devtools` available, and surfaces visible error text
- selecting `Play` hides overlays and calls `toggleEditor(false)`
- selecting `Open Devtools` shows `EditorShell` and calls `toggleEditor(true)`

### Mocking boundaries

Allowed mocks:
- `vfs`
- shared Phase 16C bootstrap loader
- `refreshFileCache`
- `useShellStore` actions

Not allowed:
- mocking presentation internals that can be observed directly in the DOM

---

## 7. Acceptance Criteria

This document is complete only when all of the following are true:
- the app starts in `menu` mode
- `RuntimeShell` remains mounted regardless of app mode
- the menu visibly reflects bootstrapping and bootstrap failure
- missing root `manifest.json` triggers the shared public-bootstrap import flow exactly once at startup
- `Play` and `Open Devtools` transition modes exactly as defined
- bootstrap failures are explicit and visible
- no compile, project-load, or gameplay initialization side effects are introduced
- all tests described in this document pass

---

## 8. Explicit Non-Goals

Out of scope for Phase 16A:
- manual viewer implementation
- RichText command/action links
- click-through game-view tab behavior
- bootstrap snapshot export button
- terminal bootstrap-load command
- automatic runtime project compilation or gameplay initialization
- any change to terminal hotkey bindings beyond the documented interaction with existing `isEditorOpen`
