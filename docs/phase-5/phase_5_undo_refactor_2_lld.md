LLD: Unified Module Session Architecture (Updated)

1. The Why (Rationale)

The current implementation suffers from State Fragmentation. Each resource (Blueprint, Asset, Metadata) initializes its own scoped session with an isolated history stack.

Consequences:

Toolbar Inactivity: The Global Toolbar observes the filename session, while editors write to disconnected blueprint::id sessions.

Fragmented History: Undo/Redo is localized to a single tab. Changing a Blueprint and then switching tabs breaks the chronological history of the file.

Partial Saving: Users expect a "Save" in the toolbar to commit all pending changes across all tabs belonging to that module.

2. The What (Strategy)

Transition to a Single Module Draft model. Every editor associated with a specific module (e.g., game_data.json) will operate on a single shared session keyed by that filename.

Core Principles

Module Authority: The filename is the unique session key.

Unified History: A single history stack per module tracks changes across all its Blueprints, Assets, and Settings.

Slice-Based Editing: Sub-editors act as "lenses" into specific paths of the unified module draft.

Toolbar-Only Lifecycle: Undo, Redo, and Save actions are removed from sub-editors and exclusively managed by the Global Toolbar.

3. The How (Detailed Implementation)

3.1 Session Store Policy

File: src/ui/devtools/state/useSessionStore.ts

Constraint: sessionId must always correspond to a filename (e.g., game_data.json).

Structure: The Session<TDraft> for a module now contains the full ModuleCartridge object in its draft and original fields.

Cleanup: Deprecate and remove scoped IDs like blueprint::id or asset::id.

Persistence: The unified module draft is persisted to localStorage under the filename key.

3.2 Authoritative Module Hooks

File: src/ui/devtools/state/moduleSession/useModuleSession.ts

Responsibility: Unified interface for file-level operations (undo, redo, save).

Selectors: Use Zustand shallow or granular selectors. A component editing draft.blueprints["a"] should not re-render when draft.blueprints["b"] is updated.

3.3 Editor Refactors (Slice Pattern)

Files:

src/ui/devtools/editors/blueprint/editor/useBlueprintEditorSession.ts

src/ui/devtools/editors/assets/useAssetSession.ts

src/ui/devtools/editors/fields/module-metadata-editor/useModuleMetadataEditor.ts

Logic Changes:

Remove initSession and closeSession from sub-editors.

Lenses: Hooks return a "slice" of the module draft.

Mutations: Use updateDraft(filename, (draft) => { ... }) targeting specific sub-paths.

Force-Commit Mechanism: To resolve race conditions, SchemaForm and other debounced components must register their "flush" functions with the session. When the Global Toolbar triggers "Save", it calls flush() on all active editors before reading the draft for persistence.

3.4 Tab Guard Migration

Shared Dirty State: TabGuards remain per-tab to identify which views have unsaved context, but they observe the isDirty flag of the parent module session.

Result: If any part of the module is modified, every tab belonging to that module displays the "Dirty" indicator.

3.5 UI Component Cleanup

Files:

src/ui/devtools/editors/blueprint/editor/BlueprintEditorView.tsx

src/ui/devtools/editors/assets/AssetEditor.tsx

src/ui/devtools/editors/fields/module-metadata-editor/ModuleMetadataEditor.tsx

Actions: Remove UndoButton, RedoButton, and SaveButton. Contextual actions like Identity, Delete, and Duplicate remain as they are specific to the resource.

3.6 Session Lifecycle Management

Creation: useEnsureModuleSession checks if a session exists for the filename. If not, it loads the file and initializes the singleton session.

Cleanup: Sessions are purged from memory only when the module is explicitly "Closed" via the File Explorer or Terminal, not when individual tabs are closed. This preserves history when toggling between blueprints.

4. Testing Strategy (Canonical Standards)

4.1 Integration: Unified Chronology (Happy Path)

Given: A module with Blueprint A and Blueprint B.

When: User edits A, then edits B.

When: User triggers "Undo" in the Global Toolbar.

Then: Blueprint B returns to its previous state; Blueprint A remains modified.

When: User triggers "Undo" again.

Then: Blueprint A returns to its previous state.

4.2 Integration: Atomic Global Save (Happy Path)

Given: A dirty module with changes in both Metadata and a Blueprint.

When: User clicks "Save" in the Global Toolbar.

Then: Exactly one VFS write occurs containing the aggregated changes.

Then: isDirty is reset for the whole module (all related tabs show as clean).

4.3 Integration: Session Initialization (Edge Case)

Given: No module session exists.

When: Two tabs (e.g., Metadata and a Blueprint) for game.json are opened simultaneously.

Then: The initialization logic utilizes a promise-memoization or a "Loading" state in the store to ensure only one VFS read and one session initialization occur.

4.4 Negative Path: Save while Debouncing

When: A "Global Save" is triggered while a sub-editor's 300ms debounce timer is still running.

Then: The save operation must trigger an immediate flush() of the debounce buffer into the draft before finalizing the VFS write.

4.5 Negative Path: VFS Deletion

When: A module file is deleted from the VFS via terminal while a session is active.

Then: The session remains in-memory, but the Global Toolbar disables the "Save" action and reflects an "Orphaned" status.

4.6 Revert/Discard Behavior

When: "Discard Changes" is triggered.

Then: The entire module draft is reset to original, and history is cleared for all slices (Blueprints, Assets, and Metadata).
