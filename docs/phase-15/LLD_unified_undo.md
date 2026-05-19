# LLD — Unified Undo Stack (Session + Project) + Deterministic Recording

**Status:** Draft (implementation-ready)  
**Scope:** Devtools editor undo/redo + project-load determinism  
**Primary files:** `useSessionStore`, `useProjectHistoryStore`, shell sync, global toolbar, raw JSON editor  
**Constraints enforced:** “UI observes, never cheats”, “No business logic in .tsx”, tests are contract tests (see `context-pack.md`, `prompt-contract.md`, `testing-standards.md`).

---

## 0. Why

### 0.1 User-visible failures we must eliminate

1. **Undo stack is not deterministic.** After certain flows (notably project-load), editor changes stop updating the undo UI and/or undo no longer affects the edited state.
2. **Multiple undo stacks exist.** Undo/redo can come from:
   - per-session history inside `useSessionStore` (module sessions)
   - project history in `useProjectHistoryStore` (VFS snapshots)
   This makes “the undo stack” ambiguous to the user and allows UI to point at the wrong stack.
3. **Some editors mutate VFS without recording an undo point.** Example: `RawJsonEditor` writes to VFS but does not call `recordProjectSnapshot`, making changes non-undoable from the project-history perspective.
4. **Shell state can desync from the active tab**, leaving the global toolbar (and any logic that keys off shell state) in an incorrect scope after project-load and tab changes.

### 0.2 Code facts that prove the above

- `useGlobalEditorToolbar` selects undo/redo behavior based on scope:
  - module scope → `useModuleSession(...).undo/redo/canUndo/canRedo`
  - project scope → `useProjectHistoryStore(...).undo/redo/canUndo/canRedo`
  (`src/ui/devtools/shell/useGlobalEditorToolbar.ts`)
- Session history is stored per-session:
  - `updateDraft` pushes `current(session.draft)` into `session.history.past`
  - `undo(sessionId)` pops from `session.history.past` and restores via `replaceDraft`
  (`src/ui/devtools/state/sessionStore/actionsEditing.ts`, `src/ui/devtools/state/sessionStore/actionsHistory.ts`)
- Project history is stored in `useProjectHistoryStore` as VFS snapshots:
  - `recordSnapshot()` reads all files from VFS and pushes that snapshot into `past`
  - `undo()` applies the last snapshot to VFS
  (`src/ui/devtools/state/useProjectHistoryStore.ts`)
- `useManifestDraft` records project history before writing to VFS.
  (`src/ui/devtools/editors/manifest/useManifestDraft.ts`)
- `RawJsonEditor` writes to VFS but currently **does not record** a project snapshot.
  (`src/ui/devtools/editors/manifest/RawJsonEditor.tsx`)
- `loadProjectFromManifest` opens the manifest file tab and resets project history, but does not directly set shell’s active file path for that tab.
  (`src/ui/devtools/shell/loadProject.ts`)
- `useSyncActiveTabToShellPath` currently contains logic that can prevent shell updates when the active tab changes, leaving stale shell state.
  (`src/ui/devtools/shell/hooks/useSyncActiveTabToShellPath.ts`)

---

## 1. Goals and non-goals

### 1.1 Goals

G1. **Single user-facing undo stack for the system.** Undo/redo always traverses one ordered history regardless of whether the last change was:
- a module session edit (via `useSessionStore`)
- a project/VFS edit (via `useProjectHistoryStore`)

G2. **Session + project undo are delivered as one timeline.** In other words: there is exactly one sequence of undoable steps, not two competing sources.

G3. **No missing recording paths.** Every editor mutation path in scope MUST record an undo entry.

G4. **Project-load determinism.** After project-load, new edits MUST immediately record undo entries and undo/redo MUST function without requiring a page reload.

G5. **Tests enforce the contract.** Tests must fail if:
- a mutation path forgets to record
- unified undo/redo deviates from the defined sequence

### 1.2 Non-goals

N1. Persisting undo/redo history across browser reloads.  
N2. Optimizing VFS snapshot performance. (We preserve existing snapshot strategy in `useProjectHistoryStore`.)  
N3. Retrofitting undo for every possible VFS write in the codebase (e.g., save/version-bump flows) unless explicitly covered below.

---

## 2. High-level design

### 2.1 Key idea

Add a **single global undo timeline** that records **what kind of undoable step occurred** (session vs project) in a strict order.

- The global timeline is the *only* source for:
  - `canUndo`, `canRedo`
  - “Undo” and “Redo” actions triggered by UI

- The underlying stores (`useSessionStore`, `useProjectHistoryStore`) remain responsible for:
  - storing the actual snapshots (already implemented today)
  - applying those snapshots on their own `undo` / `redo`

This avoids expensive “full system snapshots” on every keystroke while still enforcing a single ordered stack.

### 2.2 Components to introduce

1. **`useUndoHistoryStore`** (new): stores the ordered stack as entries.
2. **`useUnifiedUndo`** (new hook): the only API used by UI to undo/redo.
   - It reads from `useUndoHistoryStore`
   - It calls `useSessionStore.undo/redo(sessionId)` or `useProjectHistoryStore.undo/redo()` based on the entry kind
   - It updates `useUndoHistoryStore` only after the underlying operation succeeds

### 2.3 Recording strategy (no ambiguity)

We record a global undo entry **exactly once per underlying history mutation**:

- **Session edits**
  - The only “recording source” is `useSessionStore` actions that currently add to session history:
    - `updateDraft(sessionId, recipe)`
    - `replaceDraft(sessionId, newDraft)`
  - When these functions successfully mutate a session, they MUST also append a `kind:"session"` entry to the global history.

- **Project/VFS edits**
  - The only “recording source” is `useProjectHistoryStore.recordSnapshot()`
  - Whenever `recordSnapshot()` successfully pushes a VFS snapshot into its own history, it MUST also append a `kind:"project"` entry to the global history.

**Therefore, any code path that wants project-undo support MUST call `recordProjectSnapshot()` before mutating VFS.**  
This is already true for manifest editor and project explorer ops; we add the missing call for `RawJsonEditor`.

### 2.4 Undo/Redo execution strategy

- Undo:
  - Look at the last global entry (`past[past.length - 1]`)
  - Perform the corresponding underlying undo
  - Move that entry to global `future`

- Redo:
  - Look at the first global future entry (`future[0]`)
  - Perform the corresponding underlying redo
  - Move that entry back into global `past`

Atomicity rule:
- **Global history is updated only if the underlying undo/redo succeeded.**

Concurrency rule:
- While a project undo/redo is in flight, undo/redo actions are disabled (`isBusy`).

---

## 3. Data model and interfaces

### 3.1 Types

**File:** `src/ui/devtools/state/useUndoHistoryStore.ts` (NEW)

```ts
export type UndoEntry =
  | { kind: "session"; sessionId: string }
  | { kind: "project" };

export interface UndoHistoryState {
  // Ordered from oldest → newest
  past: UndoEntry[];

  // Ordered from next redo → last redo
  future: UndoEntry[];

  // Prevent concurrent undo/redo (project undo is async)
  isBusy: boolean;

  // Derived flags (must be consistent with arrays)
  canUndo: boolean;
  canRedo: boolean;

  // Recording API (called by underlying stores)
  recordSessionEdit: (sessionId: string) => void;
  recordProjectEdit: () => void;

  // Lifecycle
  clear: () => void;

  // Stack inspection (used by unified undo)
  peekUndo: () => UndoEntry | null;
  peekRedo: () => UndoEntry | null;

  // Stack commits (used by unified undo)
  commitUndo: () => void;
  commitRedo: () => void;

  // Busy flag control (used by unified undo)
  setBusy: (busy: boolean) => void;
}
```

### 3.2 Unified undo hook API

**File:** `src/ui/devtools/state/useUnifiedUndo.ts` (NEW)

```ts
export interface UnifiedUndoApi {
  canUndo: boolean;
  canRedo: boolean;
  isBusy: boolean;

  undo: () => Promise<void>;
  redo: () => Promise<void>;
}
```

Contract:
- `undo()`/`redo()` MUST be safe to call when disabled; they must no-op.
- `undo()`/`redo()` MUST NOT mutate global history if the underlying undo/redo throws.
- `isBusy === true` MUST disable undo and redo actions.

---

## 4. Detailed changes by file

This section is the authoritative “what to change” list.  
For each file: responsibility, logic, interface.

### 4.1 Add — `src/ui/devtools/state/useUndoHistoryStore.ts`

**Responsibility**
- Single source of truth for the global undo timeline (ordered stack).
- Contains no UI logic and does not call underlying undo/redo itself.

**Logic**
- `recordSessionEdit(sessionId)`
  - Append `{kind:"session", sessionId}` to `past`
  - Clear `future`
  - Update `canUndo/canRedo`
  - MUST be a no-op if `isBusy === true` (prevents corrupting redo during undo/redo execution)
- `recordProjectEdit()`
  - Same as above but for `{kind:"project"}`
- `peekUndo()/peekRedo()` return the next entry without mutating state.
- `commitUndo()`
  - Pop last element from `past`
  - Unshift it into `future` (so redo uses `future[0]`)
- `commitRedo()`
  - Shift first element from `future`
  - Push it into `past`
- `clear()`
  - `past=[]`, `future=[]`, `canUndo=false`, `canRedo=false`, `isBusy=false`

**Interface**
- Export Zustand hook `useUndoHistoryStore`.

---

### 4.2 Add — `src/ui/devtools/state/useUnifiedUndo.ts`

**Responsibility**
- Provide the only user-facing undo/redo API:
  - global toolbar
  - editor-local undo buttons
  - any other consumers

**Logic (undo)**
1. Read `entry = useUndoHistoryStore.getState().peekUndo()`
2. If `entry == null` or `isBusy` → return
3. `setBusy(true)`
4. Execute underlying undo:
   - `kind:"session"` → `useSessionStore.getState().undo(entry.sessionId)`
   - `kind:"project"` → `await useProjectHistoryStore.getState().undo()`
5. On success → `useUndoHistoryStore.getState().commitUndo()`
6. `setBusy(false)` in finally

**Logic (redo)**
Same shape, using `peekRedo` + underlying redo + `commitRedo`.

**Error handling**
- If underlying undo/redo throws:
  - global history MUST NOT change (no commit)
  - `isBusy` MUST be restored to false
  - No silent failure: surface error via existing error boundary / toast mechanism if one exists in devtools.
    - If there is no shared toast mechanism in scope, the hook MUST rethrow so callers can handle.
    - (Pick one and implement consistently; do not swallow.)

**Interface**
- Export `useUnifiedUndo(): UnifiedUndoApi`

---

### 4.3 Change — `src/ui/devtools/state/sessionStore/actionsEditing.ts`

**Responsibility (existing)**
- Mutate session drafts and maintain per-session history stacks.

**Change required**
- When a session edit is recorded into per-session history (`session.history.past.push(...)`), also record it into the global undo history.

**New logic**
- In both `updateDraft` and `replaceDraft`:
  1. `const session = get().sessions[sessionId]`
  2. If missing session → return (no recording)
  3. Call `useUndoHistoryStore.getState().recordSessionEdit(sessionId)`
  4. Proceed with existing per-session history mutation and draft update

**Interface**
- No public signature changes.

**Important invariant**
- The global entry MUST only be recorded if the session exists and the edit will actually be applied.

---

### 4.4 Change — `src/ui/devtools/state/useProjectHistoryStore.ts`

**Responsibility (existing)**
- Maintain VFS snapshot history and apply undo/redo to VFS.

**Changes required**

1) **Global recording**
- In `recordSnapshot()`:
  - After the snapshot is successfully produced and appended to project history, call:
    - `useUndoHistoryStore.getState().recordProjectEdit()`

2) **Global reset on project-load**
- In `resetAndSnapshot()` (invoked by `resetProjectHistory()` from `loadProjectFromManifest`):
  - Call `useUndoHistoryStore.getState().clear()` before/after resetting project history.
  - This prevents undo entries from previous projects surviving a new project load.

**Interface**
- No public signature changes.

**Important invariant**
- `recordProjectEdit()` MUST run only if the project snapshot was successfully captured and stored.

---

### 4.5 Change — `src/ui/devtools/editors/manifest/RawJsonEditor.tsx`

**Responsibility (existing)**
- Provide a raw JSON editor UI for a given file.
- Debounced writes to VFS (`vfs.writeFile`) when JSON is valid.

**Change required**
- Ensure the write path records a project snapshot (and therefore a global undo entry).

**New logic**
- Inside the debounced write callback, before `vfs.writeFile(...)`:
  - `await useProjectHistoryStore.getState().recordSnapshot()` (or import `recordProjectSnapshot` via selector)
  - Then perform the write

**Interface**
- No prop changes.
- No business logic added beyond calling the project-history recorder (still minimal).

**Invariant**
- A VFS write originating from `RawJsonEditor` MUST always be preceded by a successful `recordProjectSnapshot()`.

---

### 4.6 Change — `src/ui/devtools/state/shell.ts`

**Responsibility (existing)**
- Shell navigation state: active file path, active manifest, editor visibility.
- Provides actions like `openFile(...)`.

**Change required**
- Add an explicit action for file-tab contexts to set shell state without routing side-effects.

**Add**
```ts
setActiveFileTabPath: (filePath: string | null) => void;
```

**Logic**
- `setActiveFileTabPath(filePath)` MUST:
  - set `activeFilePath` to the raw file path (or null)
  - set `activeModuleFilename` to the raw file path (or null)
  - MUST NOT serialize the path into a routed `"...::..."` form
  - MUST NOT invoke window-manager routing logic (that is driven by `useWindowManagerRouteSync` and only when `activeFilePath` includes `"::"`)

This enables shell + toolbar context to follow file tabs (manifest editor, raw JSON editor) without forcing a routed “module” navigation.

---

### 4.7 Change — `src/ui/devtools/shell/hooks/useSyncActiveTabToShellPath.ts`

**Responsibility (existing)**
- Keep shell state aligned with the currently active tab.

**Change required**
- Remove the guard that blocks syncing when shell-derived tab ID differs from the active tab.
- Add correct handling for file tabs by using `setActiveFileTabPath`.

**New logic (authoritative)**
1. Read:
   - `activeTabId` from `useLayoutStore`
   - `activeFilePath`, `openFile`, `setActiveFileTabPath` from `useShellStore`
2. `const path = tabIdToVirtualPath(activeTabId)`
   - If null → return
3. If `activeTabId.startsWith("file:")`:
   - If `activeFilePath === path` → return
   - Call `setActiveFileTabPath(path)`
4. Else:
   - Call `openFile(path)` (openFile already no-ops if same path)

This ensures that selecting the manifest file tab updates shell context deterministically (fixing project-load state) while not triggering routed navigation because the file path is raw.

**Interface**
- No external signature changes.

---

### 4.8 Change — `src/ui/devtools/shell/loadProject.ts`

**Responsibility (existing)**
- Loads a project by manifest path.
- Resets project history.
- Opens the manifest file tab.

**Change required**
- After opening the manifest file tab, set shell active path to that file tab path.

**New logic**
- After `openFileTab(..., manifestPath)`:
  - `useShellStore.getState().setActiveFileTabPath(manifestPath)`

This is required to make the post-load editor state deterministic even if the tab->shell sync hook is not yet mounted or is delayed.

---

### 4.9 Change — `src/ui/devtools/shell/useGlobalEditorToolbar.ts`

**Responsibility (existing)**
- Derives toolbar UI state including undo/redo enablement.

**Change required**
- Undo/redo MUST come exclusively from unified undo.

**New logic**
- Replace:
  - `projectCanUndo/projectCanRedo` and `session.canUndo/session.canRedo`
  - `undoProject/redoProject` and `session.undo/session.redo`
- With:
  - `const { canUndo, canRedo, isBusy, undo, redo } = useUnifiedUndo()`
  - `disableUndo = !canUndo || isBusy`
  - `disableRedo = !canRedo || isBusy`

Everything else (save/compile/asset) remains unchanged and continues to use existing scope logic.

---

### 4.10 Change — `src/ui/devtools/state/moduleSession/useModuleSession.ts`

**Responsibility (existing)**
- Wrap session store access for a module file and expose an editor handle.

**Change required**
- The handle’s `undo/redo/canUndo/canRedo` must reflect the unified undo stack, not per-session history.

**New logic**
- Import `useUnifiedUndo()` and set:
  - `canUndo = unified.canUndo`
  - `canRedo = unified.canRedo`
  - `undo = unified.undo`
  - `redo = unified.redo`

**Invariant**
- No editor should expose a “local undo stack” after this change.

---

### 4.11 Change — `src/ui/devtools/editors/blueprint/components/toolbar-actions/UndoButton.tsx`  
### 4.12 Change — `src/ui/devtools/editors/blueprint/components/toolbar-actions/RedoButton.tsx`

**Responsibility (existing)**
- Editor-local undo/redo buttons using `useSessionStore`.

**Change required**
- Use unified undo API.

**New logic**
- Replace selectors from `useSessionStore` with `useUnifiedUndo()`.

**No additional business logic in TSX**
- The TSX component must only bind button enabled state and click handler to the hook results.

---

### 4.13 Change — `src/ui/devtools/editors/fields/module-metadata-editor/useModuleMetadataEditor.ts`

**Responsibility (existing)**
- Metadata editor VM currently exposes session-local undo/redo.

**Change required**
- Replace session-local undo/redo with unified undo/redo.

**New logic**
- Use `useUnifiedUndo()` for `canUndo/canRedo/undo/redo`.
- Keep using `useSessionStore.updateDraft/replaceDraft` for mutation (which now records into unified history via store changes).

---

## 5. End-to-end behavior after changes

### 5.1 What “single undo stack” means in practice

- Every time a session edit occurs (module editor, blueprint editor, asset editor, metadata editor), the global history gets an entry `{"kind":"session","sessionId":...}`.
- Every time a project snapshot is recorded (manifest editor, project explorer ops, raw JSON editor), the global history gets an entry `{"kind":"project"}`.
- Undo always walks those entries in order, regardless of what editor is currently visible.

### 5.2 Project-load determinism

After `loadProjectFromManifest(manifestPath)` completes:

- project history is reset (as before)
- unified undo history is cleared
- manifest tab is opened
- shell active file state is set to the manifest file tab path
- subsequent edits immediately record into unified history

No reload is required.

---

## 6. Tests

All tests listed here are **contract tests**: they validate observable behavior and the defined interfaces.  
Tests must be colocated and use existing standards (Vitest).

### 6.1 Add — `src/ui/devtools/state/useUndoHistoryStore.test.ts`

**Covers**
1. `recordSessionEdit` appends to `past` and clears `future`.
2. `recordProjectEdit` appends to `past` and clears `future`.
3. `clear()` resets everything.
4. `peekUndo/peekRedo` reflect stack contents without mutation.
5. `commitUndo` moves the last past entry to the front of future.
6. `commitRedo` moves the first future entry to the end of past.
7. `isBusy` prevents record functions from mutating history.

**Example assertions**
- Start: `past=[] future=[]`
- Record session A → `past=[{session A}] future=[] canUndo=true canRedo=false`
- Commit undo → `past=[] future=[{session A}] canUndo=false canRedo=true`

---

### 6.2 Add — `src/ui/devtools/state/useUnifiedUndo.test.ts`

**Strategy**
- Mock underlying undo/redo calls to validate correct dispatch without relying on real VFS.
- Use `vi.spyOn(useSessionStore.getState(), "undo")` etc.

**Cases**
1. When last entry is `session`, `undo()` calls `useSessionStore.undo(sessionId)` and commits global undo.
2. When last entry is `project`, `undo()` awaits `useProjectHistoryStore.undo()` and commits global undo.
3. If underlying undo throws, global history is not committed.
4. `redo()` mirrors behavior.
5. `isBusy` blocks reentrancy.

---

### 6.3 Change/Add — `src/ui/devtools/state/sessionStore/actionsEditing.test.ts` (or new test file colocated in sessionStore folder)

**Goal**
- Ensure editing actions record unified history.

**Cases**
1. Initialize a session:
   - `initSession("mod.bp", draft)`
2. Call `updateDraft("mod.bp", recipe)` once.
3. Assert:
   - `useUndoHistoryStore.getState().past` last entry is `{kind:"session", sessionId:"mod.bp"}`
4. Call `useUnifiedUndo().undo()` and assert draft value reverted (using session store state).

---

### 6.4 Change/Add — `src/ui/devtools/state/useProjectHistoryStore.test.ts`

**Strategy**
- Mock `vfs` module to provide:
  - `listFiles(): string[]`
  - `readFile(path): {data: Uint8Array}`
  - `writeFile(path, data): Promise<void>`
  - `deleteFile(path): Promise<void>`

**Cases**
1. After calling `recordSnapshot()`, unified history contains `{kind:"project"}` as last past entry.
2. `resetAndSnapshot()` clears unified history (verify empty).

---

### 6.5 Change/Add — `src/ui/devtools/editors/manifest/RawJsonEditor.test.tsx`

**Strategy**
- Render `RawJsonEditor` with a stub `useFile` value and mock `vfs.writeFile`.
- Use fake timers to advance debounce.

**Cases**
1. Enter valid JSON
2. Advance timers past debounce
3. Assert call order:
   - `recordProjectSnapshot` called before `vfs.writeFile`

---

### 6.6 Change/Add — `src/ui/devtools/shell/loadProject.test.ts`

**Strategy**
- Mock `workspaceService.loadProject` and `openTab` (layout store) to avoid UI.
- Ensure shell state set.

**Case**
- Call `loadProjectFromManifest("/path/manifest.json")`
- Assert:
  - `useShellStore.getState().activeManifestPath === "/path/manifest.json"`
  - `useShellStore.getState().activeFilePath === "/path/manifest.json"`

---

## 7. Acceptance checklist (must all pass)

A1. Global toolbar undo/redo reflects unified stack only.  
A2. Blueprint editor undo/redo buttons use unified stack only.  
A3. Module metadata editor undo/redo uses unified stack only.  
A4. `RawJsonEditor` edits are undoable via unified undo (project entry recorded).  
A5. After project-load, new edits immediately record undo entries (no reload).  
A6. All tests in §6 pass.

---

## 8. Notes on compatibility and risk

- This design keeps existing underlying snapshot implementations intact and only unifies the user-facing timeline.
- The unified history is cleared on project-load to prevent cross-project corruption.
- Busy/atomicity rules prevent partial undo commits when project undo fails.

