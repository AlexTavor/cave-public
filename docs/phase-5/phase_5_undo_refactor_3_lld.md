Phase 5 Delta: Cleanup & Synchronization — Canonical

1. Context & Objective

Problem: The Phase 5 refactor introduced the "Unified Module Session" but left two critical implementation gaps:

UI Architecture Violation: Sub-editors (AssetEditor, ModuleMetadataEditor, ImpulseSettingsEditor) still retain local Undo/Redo/Save buttons. This contradicts the "Toolbar-Only Lifecycle" mandate, creating confusing split-brain state management where local actions might not sync with the global history stack.

Functional Desynchronization: The LayoutEditor hydrates its simulation runtime only once on mount. If a user performs a "Global Undo" (reverting a position change), the LayoutEditor visual state remains stale, deviating from the actual data in the Session Draft.

Objective:

Purge Local Controls: Remove all local lifecycle actions from sub-editors.

Implement Hot-Patching: Make useLayoutEditorController reactive to the Session Draft to support live updates from text edits or undo operations.

2. UI Cleanup Specification

Principle: Sub-editors are "lenses" into the draft. They perform mutations via updateDraft but do not control the transaction lifecycle (Save/Undo). All persistence is delegated to the GlobalEditorToolbar.

2.1 Asset Editor

Target File: src/ui/devtools/editors/assets/AssetEditor.tsx

Logic:

Remove UndoButton, RedoButton, SaveButton from the toolbarActions prop of ToolFrame.

Retain Breadcrumbs and Back navigation.

Retain isDirty check only for internal validation feedback (if needed), but do not expose save triggers.

2.2 Metadata Editor

Target File: src/ui/devtools/editors/fields/module-metadata-editor/ModuleMetadataEditor.tsx

Logic:

Remove Undo, Redo, and Save & Bump buttons.

Ensure the SchemaForm is still correctly wired to the session draft via useModuleMetadataEditor.

2.3 Impulse Settings Editor

Target File: src/ui/devtools/editors/physics/ImpulseSettingsEditor.tsx

Logic:

Remove Undo, Redo, and Save buttons.

Retain Apply to Runtime / Revert Runtime as these are simulation-specific actions, not disk persistence actions.

3. Layout Editor Synchronization (Hot Patching)

Objective: Ensure the visual simulation (ImpulseEngine) always reflects the current SessionDraft, even when changed externally.

3.1 Controller Logic Update

Target File: src/ui/devtools/layout/useLayoutEditorController.ts

Responsibility: Watch the blueprints slice of the draft. If physics coordinates change, update the live physics bodies directly without destroying the runtime.

Detailed Logic:

Draft Subscription:

Use useSessionStore to select session.draft.blueprints.

Use a shallow equality check or specific selector to avoid render thrashing, though useEffect will handle diffing.

Synchronization Effect (useEffect):

Dependency: draftBlueprints, runtime.

Phase 1: Structural Check (Add/Remove):

Compare the set of blueprint IDs in draft vs runtime.

If the sets differ (e.g., Undo created/deleted a blueprint), trigger a Full Re-hydration (existing hydration logic). Hot-patching creation/deletion is risky; reload is safer.

Phase 2: Positional Hot-Patch:

Iterate through draftBlueprints.

For each blueprint, extract components.physics.

Get the corresponding body from runtime.getPhysicsBody(id).

Diff:

Math.abs(body.x - physics.x) > EPSILON

Math.abs(body.y - physics.y) > EPSILON

Math.abs(body.radius - physics.radius) > EPSILON

Apply: If changed:

body.position.x = physics.x

body.position.y = physics.y

body.prevPosition.x = physics.x (Reset velocity)

body.prevPosition.y = physics.y (Reset velocity)

body.radius = physics.radius

Crucial: Do NOT apply if the user is currently dragging this specific entity (check isDragging state if available, or rely on the fact that handleConfirm hasn't run yet).

4. Verification Plan

4.1 Automated Tests

File: src/ui/devtools/layout/useLayoutEditorController.test.tsx

New Test Case: synchronizes runtime bodies when draft changes externally

Given: useLayoutEditorController is mounted with a blueprint at x:0, y:0.

When: useSessionStore.setState is called to update the draft blueprint to x:100, y:100.

Then: runtime.getPhysicsBody reports x:100, y:100.

4.2 Manual Verification Checklist

UI Cleanup:

Open AssetEditor (Icon). Verify no Save button.

Open ModuleMetadataEditor. Verify no Save button.

Open LayoutPhysicsEditor (Impulse). Verify no Save button.

Edit a value in any of the above. Verify Global Toolbar shows "Dirty".

Click Global Save. Verify "Dirty" clears.

Undo/Redo Flow:

Open Layout Editor.

Drag an entity. Click "Save Positions".

Observe entity stays in new position.

Click Global "Undo".

Success Criteria: Entity snaps back to original position immediately.
