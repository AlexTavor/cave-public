Phase 6: Biological Connection Network (The Vein System) — LLD

1. Overview & Purpose

The Vein System is a visual-only layer running within the Phaser engine. It projects a dynamic, pulsating graph overlay onto the simulation entities to visualize the flow of "Life Force" (Attributes) from the Faces (Producers) through the Swarm (Aggregator) to the Pools (Storage) and finally to consumers (Demand Endpoints).

Primary Goal: Make the implicit dependency network explicit and "alive" without mutating simulation state.

2. Data & Schema Definitions

2.1 Settings Schema

File: src/data/schemas/assets.ts

We extend SettingsSchema to include vein_network.

export const VeinHeartbeatSchema = z.object({
bpm: z.number().default(60),
envelope: z.array(z.object({
t: z.number().min(0).max(1), // Time (0 to 1 cycle)
v: z.number().min(0).max(1) // Intensity
})).default([{ t: 0, v: 0 }, { t: 0.1, v: 1 }, { t: 0.4, v: 0 }])
});

export const VeinConfigSchema = z.object({
thickness: z.object({
attribute_scale_factor: z.number().default(0.5),
min_width: z.number().default(2),
max_width: z.number().default(20)
}),
colors: z.object({
supply_dim_factor: z.number().default(0.6),
supply_bright_factor: z.number().default(1.2),
base_body: z.string().default("#e91e63"),
base_mind: z.string().default("#2196f3"),
base_social: z.string().default("#ffc107")
}),
heartbeats: z.object({
default: z.string().default("healthy"),
presets: z.record(z.string(), VeinHeartbeatSchema).default({})
})
});

// Update AssetCollectionSchema to include 'vein_network' in settings

2.2 Runtime Types

File: src/engine/phaser/veins/types.ts

Types used strictly for the rendering pipeline.

export type VeinAttribute = "body" | "mind" | "social";

export interface VeinNode {
id: string;
x: number;
y: number;
radius: number;
}

export interface VeinEdge {
sourceId: string;
targetId: string;
attribute: VeinAttribute;
power: number; // Determines width
intensity: number; // Determines brightness (0-1)
}

export interface VeinGraph {
nodes: Map<string, VeinNode>; // Quick lookup for positions
edges: VeinEdge[]; // List of connections to draw
}

3. Core Logic Components

3.1 Pulse Engine (Math & Timing)

File: src/engine/phaser/veins/PulseEngine.ts

Pure logic class responsible for calculating scalar intensity values.

Logic:

Global Heartbeat:

Inputs: time (ms), bpm, envelope (points).

Calculation:

cycleDuration = 60000 / bpm.

phase = (time % cycleDuration) / cycleDuration.

Linear interpolation between envelope points based on phase.

Returns: intensity (0-1).

Demand Pulse:

Inputs: entityState (to detect active work/consumption).

Logic: If entity has active consumption (e.g. isWorking tag or state delta), generate a faster, independent pulse. For Phase 6 MVP, this can mirror the global pulse but with a phase offset based on Entity ID hash to create organic desynchronization.

Interface:

export class PulseEngine {
constructor(private config: VeinConfig) {}

    public getSupplyPulse(time: number): number;
    public getDemandPulse(entityId: string, time: number): number;

}

3.2 Graph Builder (Topology Resolution)

File: src/engine/phaser/veins/GraphBuilder.ts

Reconstructs the connection graph every frame from the ECS Snapshot.
Optimization: Accepts a VeinGraph object to mutate/reuse to avoid allocating arrays every frame.

Logic:

Clear Buffer: Reset graph.nodes and graph.edges.

Identify Hubs:

Find sys_swarm.

Find Pools (pool_body, pool_mind, pool_social).

Cache their positions/radii in graph.nodes.

Supply Edges (Face -> Swarm -> Pool):

Query all entities with face component.

If sys_swarm exists:

Add Edge: Face -> Swarm (Attribute: Face's attribute).

Add Edge: Swarm -> Pool (Attribute: All 3).

Else (Fallback):

Add Edge: Face -> Pool.

Demand Edges (Pool -> Consumer):

Query tags demand:body, demand:mind, demand:social.

For each entity:

If entity active (basic check: existence), Add Edge: Pool -> Entity.

Interface:

export class GraphBuilder {
public build(
snapshot: Snapshot,
graphBuffer: VeinGraph
): void;
}

3.3 Vein Graphics (Rendering)

File: src/engine/phaser/veins/VeinGraphics.ts

Wraps a Phaser Graphics object.

Logic:

Clear: graphics.clear().

Draw Loop: Iterate graph.edges.

Geometry:

Lookup source/target VeinNode.

Calculate start/end widths based on edge.power and config.thickness.

Compute tapered polygon (4 points).

Coloring:

Base color from Attribute (Body=Red, Mind=Blue, Social=Gold).

Modulate Luminance (HSL L-value) based on edge.intensity.

L = baseL _ (dimFactor + intensity _ (brightFactor - dimFactor)).

Draw: Fill polygon.

Interface:

export class VeinGraphics {
constructor(private scene: Phaser.Scene, private config: VeinConfig) {}

    public render(graph: VeinGraph): void;
    public destroy(): void;

}

3.4 Vein Manager (Orchestrator)

File: src/engine/phaser/veins/VeinManager.ts

The "System" equivalent in the Phaser world.

Responsibility:

Holds VeinGraph buffer.

Instantiates GraphBuilder, PulseEngine, VeinGraphics.

update() called by TransferScene.

Read config from Runtime (if changed).

GraphBuilder.build(snapshot, buffer).

Iterate buffer edges -> update intensity via PulseEngine.

VeinGraphics.render(buffer).

4. Integration Points

4.1 Update TransferScene

File: src/engine/phaser/scenes/TransferScene.ts

Init: Create VeinManager in create().

Loop: Call veinManager.update(...) in update().

Depth: Ensure Vein graphics render at depth: 5 (Below entities/transfers, above background).

4.2 Module Data

File: src/data/raw/basic_loop.json

Add vein_network settings block.

Tag station_hearth with demand:body (requires manual labor/strength).

Tag station_pot with demand:social (requires care).

(Or relevant tags based on gameplay logic, strictly for testing visualization).

5. Testing Strategy

5.1 Unit Tests (Logic)

PulseEngine: Verify getSupplyPulse returns cyclic values 0-1 based
