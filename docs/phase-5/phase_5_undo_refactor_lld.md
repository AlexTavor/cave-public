Low-Level Design: Global Module Session Architecture (Phase 5) - Canonical

Objectives & Scope

Refactor the editor's state management from fragmented, per-entity sessions to a Monolithic Module Session.
This unifies the undo/redo stack for all operations within a single module file (e.g., game_data.json), bridging the gap between text-based Blueprint editing, Asset editing, and Visual Layout manipulation.

Primary Goals:

Unified History: A single undo stack per file.

Visual/Text Sync: Layout Editor reflects Blueprint text changes instantly (and vice-versa) without destructive reloads.

Code Simplification: Remove ad-hoc session management from individual editors.

Data Architecture

2.1. Store Interface Updates (src/ui/devtools/state/useSessionStore.ts)

The Session generic type T will now strictly represent ModuleCartridge.
The keys for the sessions map will be filenames (e.g., game.json), not granular entity IDs.

Key Change:

Old: sessions["game.json::blueprints::entity_1"] → Session<Blueprint>

New: sessions["game.json"] → Session<ModuleCartridge>

2.2. New Hook Ecosystem

We introduce "Slice Hooks" to allow components to bind to specific parts of the global module draft without causing full-app re-renders.

A. useModuleSession(filename)

Responsibility: Top-level session management for the Global Toolbar.

Actions: save(), undo(), redo(), isDirty.

B. useBlueprintSlice(filename, blueprintId)

Responsibility: Data provider for BlueprintEditor, Passport, and ComponentDeck.

Implementation:

Selector: (state) => state.sessions[filename]?.draft.blueprints[blueprintId]

Optimization: Must use strict equality checks to prevent re-renders when other blueprints change.

C. useAssetSlice(filename, category, assetId)

Responsibility: Data provider for AssetEditor.

Implementation: Selects draft.assets[category][assetId].

Context Architecture

To support deep component trees (like ComponentDeck and SchemaForm) without prop-drilling, we replace the string-based EditorIdContext with a structured context.

3.1. BlueprintContext
File: src/ui/devtools/editors/blueprint/BlueprintContext.tsx

interface BlueprintContextValue {
filename: string;
blueprintId: string;
}

Provider: BlueprintEditor wraps its children in this provider.

Consumer: ComponentDeck, Passport, BehaviorsPanel.

Component Refactoring

4.1. SchemaForm Refactor
File: src/ui/devtools/editors/SchemaForm.tsx

The SchemaForm currently assumes session.draft is the target object. It must be updated to handle Root Paths within a monolithic draft.

Props Update:
interface SchemaFormProps {
filename: string; // The session key
rootPath: string; // e.g. "blueprints.entity_1.components"
schema: z.ZodTypeAny;
}

Logic:

Read: getByPath(session.draft, rootPath)

Write: updateDraft(filename, (draft) => setByPath(draft, rootPath + "." + fieldPath, value))

4.2. BlueprintEditor & Passport

BlueprintEditor: Becomes a "dumb" container. It sets up the BlueprintContext and renders the layout. It does not manage lifecycle (load/save/undo).

Passport:

Refactored to use useBlueprintSlice(filename, blueprintId).

Edits to Label/Tags dispatch updates to the global module draft via blueprints[id].label path.

4.3. LayoutEditor & Synchronization (Critical)

A. Hydration

Old: Hydrate simulation runtime from moduleStore (disk state).

New: Hydrate simulation runtime from sessionStore (current global draft). This allows seeing unsaved blueprint changes immediately in the visual editor.

B. The "Hot Reload" Loop (Text -> Visual Sync)

Problem: The Runtime inside LayoutEditor has its own entity copies. Updating session draft does NOT automatically update the physics engine.

Solution: LayoutEditorController must implement a reactive synchronization effect.

Logic:

Subscribe to session.draft.blueprints.

On change, diff the physics components against the runtime state.

If a Blueprint's physics x/y/radius changed (and we are NOT currently dragging it), dispatch RuntimeCommandType.POSITION_ENTITY or direct body.position updates to the active runtime.

This ensures that typing "x: 50" in the text editor snaps the entity to 50 in the visual editor without a full reload.

C. Manipulation (Visual -> Text Sync)

Mouse Down: Initialize local drag state.

Mouse Move: Update Local React State / DOM transform. Do NOT dispatch to Immer/Redux.

Mouse Up: Dispatch a single updateDraft action to commit the new position to the global history.

Action: draft.blueprints[id].components.physics = { x, y }

4.4. GlobalEditorToolbar & Initialization
File: src/ui/devtools/shell/GlobalEditorToolbar.tsx

Placement: EditorShell.

Features: File Context, Global Undo/Redo, Save (Full Module), Apply to Runtime.

Session Initialization Strategy:

The useWindowManagerRouteSync hook (or a new SessionManager component) must ensure the root module session exists when a deep link (e.g., game.json::blueprints::e1) is opened.

If sessions["game.json"] is missing, it must trigger a load from disk before rendering the child editor.

Implementation Sequence

Phase 1: Store & Selectors

Update useSessionStore to enforce ModuleCartridge root.

Implement useBlueprintSlice and useAssetSlice with strict selector isolation.

Unit Test: Verify useBlueprintSlice("A") does not re-render when "B" changes.

Phase 2: Global Toolbar & Session Init

Implement GlobalEditorToolbar.

Update useWindowManagerRouteSync to initialize root module sessions.

Wire up Save/Undo/Redo to the filename key.

Phase 3: Editor Migration

Refactor SchemaForm to support rootPath.

Convert BlueprintEditor/Passport to "dumb" components using BlueprintContext.

Convert AssetEditor to use useAssetSlice.

Phase 4: Runtime Synchronization (Hot Reload)

Update LayoutEditorController to read from session draft.

Implement the "Hot Patch" effect: Listen to draft -> Dispatch Runtime Commands (Position/Update).

Implement "Local Drag / Commit on Release".

Phase 5: Cleanup

Remove legacy useBlueprintEditorSession.

Remove per-entity keys from useSessionStore.

Verification Plan

6.1. Unit Tests

Selector Isolation: Explicit test proving useBlueprintSlice(A) ignores updates to useBlueprintSlice(B).

Dirty Logic: Test isDirty calculation when multiple entities are modified in the monolith.

6.2. Integration Tests

Hot Patching:

Initialize LayoutEditor with a draft.

Externally mutate draft.blueprints[id].physics.x.

Assert runtime.getPhysicsBody(id).x matches the new value without runtime destruction.

Layout Drag:

Simulate Drag Start -> Move -> End in Layout Editor.

Assert session.draft is updated once.

Assert session.history has exactly one new entry.

Assert Global Undo reverts the position.
