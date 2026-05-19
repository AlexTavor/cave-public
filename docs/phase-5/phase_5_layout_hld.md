High-Level Design: Visual Layout Editor (Blueprint Positioning)

Status: Approved for Implementation
Author: System Architect
Date: 2026-01-29
Context: Context Pack v1

1. Executive Summary

The Visual Layout Editor (Layout Mode) is a dedicated modal state within the Editor application. It allows users to spatially organize entities (Blueprints) using the game's actual physics engine, providing a "What You See Is What You Get" (WYSIWYG) placement experience.

Critically, this mode decouples Simulation (physics/rendering) from Logic (behaviors/decay). It treats the entire layout session as a single transactional unit.

To support this without duplicating UI components, we will implement the Context Adapter Pattern. This decouples the WorldLayer and EntityNode from the global stores, allowing us to inject a specialized SimulationRuntime and isolated selection state during layout editing.

2. Problem Statement

Currently, positioning entities requires manual entry of x and y coordinates. This is inefficient. Users need to:

See all entities relative to one another.

Drag them to desired positions using physics boundaries (radii) as a guide.

Commit these changes in bulk without polluting the Undo history.

Architectural Challenge:
Existing UI components (EntityNode, WorldLayer) are hard-coupled to the global useRuntimeStore (Game State) and useRuntimeToolStore (Inspector/Tools). Using them "as is" would cause the Layout Editor to manipulate the live game or show incorrect Inspector UI.

3. Architectural Vision

3.1 The "Simulation Runtime" Pattern

We introduce a lightweight runtime instance specific to this mode:

Transient: Created on entry, destroyed on exit.

Lobotomized: Physics systems are active; Behavior, Automation, and Lifecycle systems are stripped.

Ghost Entities: Blueprints are spawned as inert "ghosts" that represent their static structure.

3.2 The Transactional Session

To satisfy the "single undo step" requirement:

Fork: Clone the current Module state into a layout::{filename} Session Draft.

Drift: User interactions mutate the SimulationRuntime (physics bodies), not the Draft directly.

Merge: On confirmation, harvest positions from the Runtime, diff against the original, and apply a bulk patch to the Session Draft.

3.3 The Context Adapter Pattern (New)

To reuse the complex rendering logic of EntityNode without coupling it to the global game state, we introduce an abstraction layer:

Abstraction: WorldInteractionContext defines how the world is accessed (runtime instance) and how interactions are handled (selection).

Injection: Two providers implement this interface:

GameWorldProvider: Bridges to global useRuntimeStore / useRuntimeToolStore.

LayoutWorldProvider: Bridges to the local SimulationRuntime and local selection state.

4. System Design

4.1 Data Flow Diagram

sequenceDiagram
participant User
participant LayoutEditor
participant LayoutWorldProvider
participant SimRuntime as Simulation Runtime
participant EntityNode

    User->>LayoutEditor: Enter Layout Mode
    LayoutEditor->>SimRuntime: Initialize (Physics Only)
    LayoutEditor->>LayoutWorldProvider: Mount with SimRuntime
    LayoutWorldProvider->>EntityNode: Provide Context (Runtime + Local Selection)

    loop Interaction
        User->>EntityNode: Drag
        EntityNode->>SimRuntime: Update Physics Body (x, y)
    end

    User->>LayoutEditor: Confirm
    LayoutEditor->>SimRuntime: Harvest Positions
    LayoutEditor->>SessionStore: Commit Bulk Update
    LayoutEditor->>LayoutEditor: Unmount

4.2 State Management

ShellStore: Tracks isLayoutMode (boolean).

LayoutEditor: Owns the SimulationRuntime instance and the ephemeral selectedEntityId state (useState).

5. Component Architecture

5.1 WorldInteractionContext (Interface)

Defines the contract for any component that needs to render or interact with a world.

interface WorldInteractionContextValue {
runtime: Runtime | null;
selectedEntityId: string | null;
selectEntity: (id: string | null) => void;
}

5.2 GameWorldProvider (Adapter)

Usage: Wraps the RuntimeShell (Standard Game Mode).

Implementation: Connects to the global Zustand stores (useRuntimeStore, useRuntimeToolStore).

5.3 LayoutWorldProvider (Adapter)

Usage: Wraps the LayoutEditor.

Implementation:

Accepts runtime as a prop (the SimulationRuntime).

Manages selectedEntityId via local useState.

selectEntity updates local state only (preventing the global Inspector from opening).

5.4 LayoutEditor (Container)

Top-level orchestrator mounted by EditorShell when isLayoutMode is true.

Initializes SimulationRuntime.

Renders LayoutWorldProvider -> WorldLayer.

Renders LayoutHUD.

5.5 EntityNode Refactor

Change: Remove direct imports of useRuntimeStore.

Change: Consume useWorldInteraction() hook.

Result: The component becomes agnostic to whether it is running in a game or an editor.

6. Functional Workflows

6.1 Entry

User clicks "Edit Layout".

LayoutEditor mounts.

SimulationRuntime is instantiated.

Entities are spawned from the current Draft.

6.2 Interaction

User clicks an entity.

EntityNode calls selectEntity(id) from context.

Game Mode: Updates global store -> Global Inspector updates.

Layout Mode: Updates local state -> Global Inspector ignores it; Layout HUD might show basic info.

6.3 Exit (Confirm)

Iterate all entities in SimulationRuntime.

Compare (x, y) with original Blueprint.

Apply batch update to Session Draft.

Commit Draft (Push Undo History).

Destroy Runtime.

7. Constraints & Edge Cases

7.1 Viewport

Constraint: No camera panning/zooming in this phase.

Behavior: 1:1 mapping with Physics coordinates.

7.2 Missing Physics

Constraint: Blueprints without physics components are invisible in Layout Mode.

7.3 Selection Isolation

Constraint: Clicking an entity in Layout Mode must not trigger the main game's side panels (Terminal/Telemetry/Inspector).

Solution: Handled by LayoutWorldProvider effectively "swallowing" the selection events into local state.

8. Implementation Phases

UI Refactor (Critical Path):

Create WorldInteractionContext.

Create GameWorldProvider.

Refactor WorldLayer, EntityNode, and useEntityNodeInteractions to use the context.

Verify existing Game Mode still works 100%.

Simulation Runtime:

Implement factory to create a stripped-down Runtime instance.

Layout Editor Shell:

Implement LayoutEditor container.

Implement LayoutWorldProvider.

Wire up "Edit Layout" button in Module Explorer.

Persistence Logic:

Implement "Harvest Positions" and "Batch Update" logic.

HUD & Polish:

Add overlay UI for Confirm/Cancel.
