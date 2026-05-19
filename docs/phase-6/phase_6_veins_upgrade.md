LLD: Vein Network Visual Upgrades

1. Why

The current Vein System uses static widths and single-attribute connections for Faces. To better reflect the simulation's "circulatory" nature, we need:

Dynamic Widths: Visual feedback of the "Heartbeat" through physical expansion of the veins.

Rich Face Connectivity: A Face represents the collective potential of the swarm; showing all three attribute connections (Body, Mind, Social) per Face makes the network look more robust and informative.

2. What

Pulse Width: Update VeinGraphics to modulate the line width based on the current intensity (heartbeat phase) and a new config multiplier.

Multi-Attribute Faces: Update GraphBuilder to generate three edges for every Face entity, routing through the Swarm (if present) to the respective Pools.

Spatial Separation: Implement lateral offsetting in VeinGraphics so that multiple attribute lines sharing the same source/target nodes are drawn in parallel rather than overlapping.

3. How (Implementation Plan)

A. Schema Updates

File: src/data/schemas/assets.ts

Responsibility: Define the data contract for vein visuals.

Logic: Add pulse_width_multiplier to VeinConfigSchema.

Interface: - Default value: 2.0.

Validation: z.number().min(1.0).default(2.0).

B. Logic & Graph Generation

File: src/engine/phaser/veins/GraphBuilder.ts

Responsibility: Construct the logical graph from the runtime snapshot.

Logic:

Iterate through all Face entities.

Instead of identifying just the primary attribute, generate three VeinEdge objects per Face (one for body, mind, and social).

Maintain existing routing logic (Face -> Swarm -> Pool or Face -> Pool).

Use a constant power: 1 for Face edges (or derive from actual attribute values if available in body).

C. Rendering Engine

File: src/engine/phaser/veins/VeinGraphics.ts

Responsibility: Draw the graph using Phaser Graphics.

Logic 1: Pulsing Width

The resting width is calculated as base = min_width + power \* scale_factor.

The active width is base _ (1 + (pulse_multiplier - 1) _ intensity).

Ensure width is still clamped by max_width (or treat max_width as the resting ceiling).

Logic 2: Lateral Offsetting (Parallel Lines)

Group edges by their sourceId and targetId.

For each group:

Calculate the normalized direction vector (dx, dy) and the normal vector (nx, ny).

Calculate total width of all lines in the group + spacing.

Iterate through edges in the group, applying an offset along the normal vector to the source and target points before drawing.

Offset formula: offset = (index - (count - 1) / 2) \* (max_width + gap).

D. System Coordination

File: src/engine/phaser/veins/VeinManager.ts

Responsibility: Orchestrate the build/update/render cycle.

Logic: Update the intensity assignment. Since "Face" and "Swarm" lines share the "body pulse", ensure they use pulse.getSupplyPulse(time) to synchronize their rhythm.

4. Verification Plan

Unit Tests

File: src/engine/phaser/veins/GraphBuilder.test.ts

Test: it("generates three attribute edges per Face entity")

Given: A world with 1 Face and 3 Pools.

When: builder.build is called.

Then: graph.edges contains 3 entries with distinct attributes.

File: src/engine/phaser/veins/VeinGraphics.test.ts

Test: it("calculates pulsing width correctly based on intensity")

Given: A config with pulse_width_multiplier: 2.0 and a resting width of 10.

When: Intensity is 1.0.

Then: Width used for drawing is 20.

Integration Tests

File: src/engine/phaser/veins/VeinManager.test.ts

Test: it("synchronizes intensity across face-originated edges")

Given: A graph with Face-to-Swarm and Swarm-to-Pool edges.

When: manager.update is called.

Then: All Face/Swarm edges share the exact same intensity value for that frame.
