Phase 4.3 HLD: Simulation Fidelity & Interaction

Executive Summary

This document outlines the design and implementation strategy for the final remaining components of the "Simulation Fidelity" work plan (phase_4.md).

We are targeting three specific gaps to bring the simulation to life:

Status Visualization: Real-time visual feedback for entity state (Health, Energy, Progress).

Organic Layout & Interaction: Physics-based anchoring and direct node manipulation (Selection, Dragging).

Time Control: User sovereignty over the simulation speed (Pause, Time Scale).

1. Status Visualization (Phase 4)

1.1 The "What"

We will enable entities to display dynamic progress bars above their icons in the World View. These bars will be data-driven, mapped directly to the Entity's StateComponent.

1.2 The "Why"

Currently, entity state (like wood: 50 or progress: 0.5) is invisible unless the user inspects the entity in the editor. Players need immediate feedback to understand simulation bottlenecks.

1.3 The "How"

A. Schema Updates

We will extend DisplayComponentSchema to include a configuration for status bars.

File: src/data/schemas/components.ts

// Add to DisplayComponentSchema
bars: z.array(z.object({
key: z.string(), // The state key to track (e.g., "hp", "progress")
max: z.number().optional(), // Static max value
maxKey: z.string().optional(), // Dynamic max value from state (e.g., "max_hp")
color: z.string().optional(), // Bar color
label: z.string().optional() // Optional text overlay
})).optional()

B. Component Logic (useEntityNodeModel)

The existing hook useEntityNodeModel will be updated to extract state values:

Look up entity.state[bar.key].value.

Resolve max value (static max or dynamic maxKey).

Normalize to a 0-1 range.

C. Rendering (EntityNode.tsx)

We will utilize the existing ProgressBar atom, stacked above the entity icon inside the NodeContainer.

2. Organic Layout & Interaction (Phase 6)

2.1 The "What"

We will implement "Elastic Anchors" in the physics engine. Instead of entities being rigidly static or free-floating, they will be tethered to a specific point. Additionally, users can Select nodes to view details and control them.

2.2 The "Why"

Physics: Entities should "breathe"—moving slightly to avoid overlap (Separation) but always returning to their assigned spot.

UX: Players need to inspect specific nodes, cancel mistake transfers, and reorganize their layout intuitively.

2.3 Physics Architecture (The Anchors)

A. Physics Schema (src/data/schemas/physics.ts)

anchor: z.union([
// Anchor to world coordinates (User-placed buildings)
z.object({
type: z.literal("coordinate"),
x: z.number(),
y: z.number(),
stiffness: z.number().default(0.1)
}),
// Anchor to another entity (Satellites / Minions)
z.object({
type: z.literal("entity"),
entityId: z.string(),
distance: z.number().default(0),
stiffness: z.number().default(0.1)
})
]).optional()

B. Impulse Engine Update

Add applyAnchorForce steering behavior:

Calculate vector from body.position to anchor.target.

Apply Hooke's Law: Force = Distance \* Stiffness.

Allows dragging to feel like pulling a weight on a rubber band.

2.4 Interaction Architecture (The Selection)

A. Selection State

We will track selectedEntityId in the RuntimeToolStore (or a dedicated InteractionStore).

B. Selected Node UI

When a node is selected (selectedEntityId === entity.id):

Visual Highlight: Render a selection ring/glow around the EntityNode.

Context Controls: Show floating action buttons near the node:

Cancel Transfer: If the entity is a pending transfer.

Toggle Anchor: Lock/Unlock the node (add/remove coordinate anchor).

Info Card: Display a detailed card (Portal Overlay) with:

Large Title & Icon.

Full Description.

Numeric breakdown of State values.

C. Drag & Drop Refinement

Drag Start: If anchored, we are moving the Anchor Point, not just the physics body.

Visuals: Draw a dashed line from the Entity to the Cursor (the new Anchor Point) during drag.

Drop: Update anchor.x / anchor.y to the drop location.

3. Time Control (Runtime UX)

3.1 The "What"

A sticky control panel at the bottom-center of the screen to manage simulation flow.

3.2 The "How"

A. UI Component (TimeControlPanel)

Position: Fixed, Bottom Center, z-index above WorldLayer.

Widgets:

Play/Pause Button: Toggles RuntimeStatus.

Time Slider: Range input 0.0 to 10.0. Controls timeScale.

Keyboard Shortcut: Spacebar toggles Play/Pause.

B. Runtime Integration

Update Runtime.tick(dt):

const effectiveDt = dt \* this.timeScale;
if (this.isPaused && effectiveDt > 0) return;
// ... proceed with simulation

4. Implementation Plan

This work will be executed in sequential steps.

Step 1: Status UI (Visuals)

Update DisplayComponentSchema.

Update EntityNode to render ProgressBars.

Verification: Add an hp bar to a test entity.

Step 2: Physics Anchors (Feel)

Update PhysicsComponentSchema.

Implement computeAnchorForce in ImpulseEngine.

Verification: Entities should "spring" back to position after collision/separation.

Step 3: Interaction & Selection (Touch)

Implement SelectionStore logic.

Create EntityInfoCard and ControlButtons components.

Update EntityNode to handle clicks (select) and drags (update anchor).

Verification: Click node -> Show Card. Drag node -> Update Anchor.

Step 4: Time Control (Flow)

Add timeScale to Runtime and RuntimeStore.

Create TimeControlPanel UI.

Bind Spacebar hotkey.

Verification: Slider at 0 stops movement; Slider at 10 speeds it up.
