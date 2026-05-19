High-Level Design: Global Module Session Architecture

1. Executive Summary

This document outlines the architectural refactoring required to transition from an Atomic Session Model (granular, per-entity undo/save) to a Monolithic Module Session Model (file-level undo/save).

The core objective is to align the user's mental model of "Editing a File" with the application's state management. A user modifying a blueprint, then moving an entity in the layout editor, then modifying an asset, expects these actions to be part of a single linear history stack associated with the open module file.

2. Core Architectural Shift

2.1. Current State (Atomic Sessions)

Session Key: Granular ID (e.g., game.json::blueprints::entity_1).

Scope: Individual Blueprint or ModuleIconAsset.

Persistence: Individual entities are saved to the module in memory, then the module is saved to disk.

History: Separate undo stacks for every open tab.

Problem: Disjointed editing experience; Layout Editor actions (which affect multiple entities) are hard to reconcile with individual blueprint history.

2.2. Future State (Monolithic Session)

Session Key: Filename (e.g., game.json).

Scope: Full ModuleCartridge.

Persistence: The entire module is the atomic unit of save.

History: Single undo stack per module.

Benefit: Unified history across Text, Visual, and Asset editors.

3. Data Model & State Management

3.1. Session Store Refactor (useSessionStore)

The Session interface remains largely the same structurally but changes semantically in generic type usage.

Old Model:
sessions["bp:1"] -> Session<Blueprint>

New Model:
sessions["game.json"] -> Session<ModuleCartridge>

Mutation Strategy

We will continue to use Immer for immutable state updates.

Structural Sharing: Essential to prevent memory explosion. Modifying a single entity's label will only allocate new objects for that entity and the module root; all other entities share references with the previous state.

Atomic Updates: Every user action (typing a character, dragging a node) operates on the root ModuleCartridge.

3.2. Granular Selectors (Performance Critical)

To prevent re-rendering the entire IDE on every keystroke, we must strictly implement granular hooks.

useModuleSession(filename): Returns the full session (for global toolbar).

useBlueprintDraft(filename, blueprintId): Returns only session.draft.blueprints[id]. Components using this will only re-render if that specific blueprint reference changes.

useAssetDraft(filename, category, assetId): Returns only the specific asset.

4. UI Architecture: Hoisting Control

4.1. The Global Toolbar

A new component, GlobalEditorToolbar, will be introduced at the EditorShell level (above WindowManager).

Responsibilities:

Context Awareness: Observes activeModuleFilename from useShellStore.

History Actions: Calls undo(filename) / redo(filename).

Persistence: Calls saveModule(filename) (which flushes the draft to disk via VFS).

Runtime Sync: "Apply to Runtime" now serializes the entire global draft and reloads the engine.

View Modes: Toggles between "Windowed Mode" (FlexLayout) and "Visual Mode" (Layout Editor).

4.2. "Dumb" Editors

Individual editors (BlueprintEditor, AssetEditor) will be stripped of their local lifecycle management.

Removal: Delete usePassport, useBlueprintEditorSession (logic parts), and local toolbars.

Input: They receive filename and entityId props.

Logic: They use the granular selectors defined in 3.2 to bind inputs directly to the global store.

5. Layout Editor Integration

The LayoutEditor currently maintains a private runtime and moduleDraft. This isolation will be removed.

5.1. Hydration

Old: Hydrate simulation runtime from moduleStore (disk state).

New: Hydrate simulation runtime from sessionStore (current global draft). This allows seeing unsaved blueprint changes immediately in the visual editor.

5.2. Manipulation

Dragging: On drag end (mouse up), the LayoutEditorController dispatches a single updateDraft action to the global store.

Action: draft.blueprints[id].components.physics = newPosition.

History: This action automatically pushes a new entry to the global history stack.

5.3. Concurrency

Since BlueprintEditor (text) and LayoutEditor (visual) both read/write to the same Immer draft:

Typing in the text editor updates the state.

The Layout Editor subscribes to the state.

If the user changes physics.x in text, the node jumps in the visual editor instantly.

6. Migration Plan

This refactor will be executed in the following strict order to maintain stability.

Phase 1: Store & Selectors

Update useSessionStore to enforce ModuleCartridge as the root type.

Implement useBlueprintSlice and useAssetSlice hooks.

Implement useModuleSlice for the global toolbar.

Phase 2: Global Toolbar Implementation

Create GlobalEditorToolbar component.

Integrate into EditorShell.

Wire up Save/Undo/Redo actions to the active filename.

Phase 3: Editor Lobotomy

Refactor BlueprintEditor: Remove local history/save logic. Switch data source to useBlueprintSlice. Remove local toolbar.

Refactor AssetEditor: Same as above.

Refactor LayoutEditor: Connect directly to global draft. Remove local "Save Positions" button (it now happens automatically/continuously).

Phase 4: Runtime Synchronization

Update the "Apply to Runtime" global action to pull from session.draft.

Ensure game.new or reload commands respect the dirty state in memory if desired (or strictly load from disk—decision: strictly load from disk to enforce "Save first", or flush-to-disk-then-reload). Decision: Save-then-Reload pattern for clarity.

7. Constraints & Non-Goals

No Multi-File Undo: Undo/Redo is scoped to the active file. We do not support a global application-wide undo stack that crosses file boundaries.

No Real-time Collaboration: We assume a single user.

Exceptions:

Terminal state remains ephemeral and outside the undo stack.

Runtime state (ECS) remains transient and outside the undo stack.

8. Failure Modes & Safety

Closing Dirty Tabs: The WindowManager needs to check session.isDirty for the module when closing the last tab associated with that module, OR we treat the module session as independent of tabs (like VS Code).

Decision: The session persists as long as the file is "open" in the shell, regardless of whether a specific blueprint tab is visible. Closing the Module (via Explorer) prompts for save. Closing a Tab (Blueprint) does not.
