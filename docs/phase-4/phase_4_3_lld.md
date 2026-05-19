Phase 4.3 Low-Level Design: Simulation Fidelity & Interaction

1. Executive Summary

This Low-Level Design (LLD) document details the implementation specifications for Status Visualization, Organic Layout & Interaction, and Time Control. It builds upon the High-Level Design (HLD) to provide concrete file-level requirements, interface definitions, and test strategies.

The goal is to increase the transparency of the simulation (visualizing state), allow user agency over the physics world (anchors/dragging), and provide control over the simulation flow (time scale).

2. Status Visualization

Objective: Render data-driven progress bars above entity nodes in the runtime world view.

2.1 Schema Updates

File: src/data/schemas/components.ts

Responsibility: Define the data structure for configuring visual bars in the DisplayComponent.

Changes:

Extend DisplayComponentSchema to include an optional bars array.

Validation Rule: key is required. max or maxKey is required.

Interface:

export const StatusLabelSchema = z.object({
key: z.string(), // State path (e.g., "hp", "state.wood")
max: z.number().optional(), // Static max value
maxKey: z.string().optional(), // State path for max value
color: z.string().optional(), // Hex color
label: z.string().optional(), // Short text label
});
// Added to DisplayComponentSchema
bars: z.array(StatusLabelSchema).optional()

2.2 Logic & Data Resolution

File: src/ui/runtime/world/useEntityNodeModel.ts

Responsibility: Resolve raw state values into normalized progress data (0-1) for rendering.

Logic:

Parse the display.bars configuration.

For each bar:

Resolve current value from entity.state using the key path (handle nested objects like { value: 10 }).

Resolve max value from either the static max property or the maxKey path.

Calculate percentage (current / max).

Sanitize inputs (division by zero protection).

Interface (Return Type Extension):

interface EntityNodeModel {
// ... existing fields
bars: Array<{
id: string;
progress: number; // 0 to 1
color: string;
label?: string;
}>;
}

2.3 Rendering

File: src/ui/runtime/world/EntityNode.tsx

Responsibility: Render the stack of progress bars above the entity icon.

Logic:

Map over the bars array returned by useEntityNodeModel.

Render a ProgressBar atom for each entry.

Position absolutely above the IconSlot.

Styling: Bars should be compact (e.g., 4px height) with minimal spacing.

2.4 Tests

Unit Test (src/data/schemas/components.test.ts):

Validates bars schema accepts valid configs and rejects invalid types.

Hook Test (src/ui/runtime/world/useEntityNodeModel.test.ts):

Happy Path: Resolves correct progress for static max.

Happy Path: Resolves correct progress for dynamic maxKey.

Edge Case: Handles missing state keys (defaults to 0).

Edge Case: Handles division by zero (max = 0).

Smoke Test (src/ui/runtime/world/EntityNode.test.tsx):

Renders an entity with a defined bar configuration without crashing.

3. Organic Layout & Interaction

Objective: Implement physics anchors for stability and enable mouse interaction (selection/dragging).

3.1 Physics Architecture

3.1.1 Schema Updates

File: src/data/schemas/physics.ts

Responsibility: Define anchor configuration on the Physics component.

Changes:

Add anchor field to PhysicsComponentSchema.

Interface:

const AnchorSchema = z.union([
z.object({
type: z.literal("coordinate"),
x: z.number(),
y: z.number(),
stiffness: z.number().default(0.1),
}),
z.object({
type: z.literal("entity"),
entityId: z.string(),
distance: z.number().default(0), // Resting distance
stiffness: z.number().default(0.1),
})
]);

3.1.2 Force Calculation

File: src/engine/physics/impulse/ImpulseAnchor.ts (New File)

Responsibility: Pure function to calculate Hooke's Law force vector.

Logic:

Coordinate Anchor: Vector = (anchor.pos - body.pos) \* stiffness.

Entity Anchor:

Calculate vector to target entity.

Calculate current distance.

Displacement = currentDistance - targetDistance.

Force = normalizedVector _ Displacement _ stiffness.

Interface:

export const computeAnchorForce = (
body: PhysicsBody,
anchor: AnchorConfig,
targetBody?: PhysicsBody // Only for entity anchors
): Vector2;

3.1.3 Engine Integration

File: src/engine/physics/impulse/ImpulseEngine.ts

Responsibility: Apply anchor forces during the tick loop.

Changes:

In applySteering():

Check if body has an anchor.

If coordinate: Call computeAnchorForce.

If entity: Look up target body, then call computeAnchorForce.

Add result to body.acceleration.

3.2 Interaction Architecture

3.2.1 Selection State

File: src/ui/runtime/state/useRuntimeToolStore.ts

Responsibility: Track the currently selected entity ID.

Changes:

Add selectedEntityId: string | null.

Add action selectEntity(id: string | null).

3.2.2 Interaction Handling

File: src/ui/runtime/world/EntityNode.tsx

Responsibility: Handle pointer events for selection and dragging.

Logic:

Click: Call selectEntity(id). Stop propagation.

Drag Start (MouseDown):

Set local dragging state.

Capture initial mouse position.

Crucial: If entity is static or unanchored, we might need to temporarily add a coordinate anchor to allow dragging, or update the existing coordinate anchor.

Drag Move (MouseMove via Window):

Convert screen delta to world delta.

Dispatch RuntimeCommandType.UPDATE_ANCHOR (new command) or POSITION_ENTITY if static.

Drag End (MouseUp):

Release drag state.

File: src/engine/runtime/types.ts & src/engine/runtime/handlers/UpdateAnchorHandler.ts (New File)

Responsibility: Handle runtime updates to anchors during drag.

Logic: Update the entity's physics.anchor component with new coordinates.

3.2.3 Selection UI

File: src/ui/runtime/world/SelectionOverlay.tsx (New File)

Responsibility: Render details for the selected entity.

Logic:

Read selectedEntityId from store.

Fetch entity data from Runtime (via useEntityQuery or direct lookup).

Render Portal (layer: float/overlay).

Display: Label, ID, State JSON (pretty printed), and basic action buttons (e.g., "Kill", "Deselect").

3.3 Tests

Unit Test (src/engine/physics/impulse/ImpulseAnchor.test.ts):

Coordinate: Verify force vector points toward anchor.

Entity: Verify force is zero at resting distance.

Entity: Verify force pulls when stretched and pushes when compressed.

Integration Test (src/engine/physics/impulse/ImpulseEngine.test.ts):

Setup body with coordinate anchor.

Displace body.

Tick engine.

Verify body velocity moves towards anchor.

UI Interaction Test (src/ui/runtime/world/EntityNode.interaction.test.tsx):

Mock selectEntity.

Simulate click. Verify selectEntity called.

4. Time Control

Objective: Allow users to pause, resume, and scale the speed of the simulation.

4.1 Runtime Architecture

File: src/engine/runtime/Runtime.ts

Responsibility: Apply time scaling to the delta time (dt) before processing systems.

Changes:

Add private field timeScale: number = 1.

Add public method setTimeScale(scale: number).

Update tick(dt):

const effectiveDt = dt \* this.timeScale;
if (this.state.status === "paused" && effectiveDt > 0) return;
// Pass effectiveDt to systems

File: src/ui/runtime/state/useRuntimeStore.ts

Responsibility: Expose time control actions to the UI.

Changes:

Add timeScale to state.

Add action setTimeScale(scale: number).

Sync timeScale changes to the Runtime instance.

4.2 UI Component

File: src/ui/runtime/shell/TimeControlPanel.tsx (New File)

Responsibility: Visual interface for time control.

Logic:

Render Play/Pause button (toggles status).

Render Slider (0.1x to 10x). Maps to setTimeScale.

Listen for Space key to toggle Play/Pause globally.

Styling: Fixed position, bottom-center, high z-index.

File: src/ui/runtime/shell/RuntimeShell.tsx

Responsibility: Mount the TimeControlPanel.

4.3 Tests

Runtime Logic Test (src/engine/runtime/Runtime.test.ts):

Scaling: Verify that tick(100) with timeScale = 0.5 results in systems receiving dt = 50.

Paused: Verify that tick(100) while paused results in dt = 0.

Store Test (src/ui/runtime/state/useRuntimeStore.test.ts):

Verify setTimeScale updates state and calls runtime.setTimeScale.

5. Summary of New & Modified Files

File

Type

Responsibility

src/data/schemas/components.ts

Modify

Add bars schema.

src/data/schemas/physics.ts

Modify

Add anchor schema.

src/ui/runtime/world/useEntityNodeModel.ts

Modify

Resolve bar progress values.

src/ui/runtime/world/EntityNode.tsx

Modify

Render bars; Handle Selection/Drag.

src/engine/physics/impulse/ImpulseAnchor.ts

New

Compute Hooke's Law forces.

src/engine/physics/impulse/ImpulseEngine.ts

Modify

Apply anchor forces.

src/ui/runtime/state/useRuntimeToolStore.ts

Modify

Track selected entity.

src/ui/runtime/world/SelectionOverlay.tsx

New

UI for selected entity details.

src/engine/runtime/Runtime.ts

Modify

Handle timeScale.

src/ui/runtime/shell/TimeControlPanel.tsx

New

Play/Pause/Speed UI.

src/engine/runtime/handlers/UpdateAnchorHandler.ts

New

Handle anchor updates from UI.

src/engine/runtime/types.ts

Modify

Register UPDATE_ANCHOR command.
