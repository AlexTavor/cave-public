Phase 6: Biological Connection Network (The Vein System) — HLD v2

1. Architectural Overview

The Vein System is a read-only visualization layer residing within the Phaser runtime environment. It visualizes the implicit "nervous system" of the colony by projecting a connection graph over the ECS entities.

It adheres to the "UI Observes" law: it reads the ECS Snapshot each frame, resolves the topology based on entity existence and state, and renders the graph without mutating the simulation.

System Diagram

graph TD
subgraph ECS_Runtime
Snapshot[ECS Snapshot]
end

    subgraph Phaser_Engine
        TransferScene
        VeinManager[Vein Manager]
        GraphBuilder[Graph Resolution Strategy]
        PulseEngine[Pulse Engine]
        VeinGraphics[Phaser Graphics Layer]
    end

    Snapshot -->|Read Entities| GraphBuilder
    GraphBuilder -->|Reuse/Populate Buffers| VeinManager
    PulseEngine -->|Time & Job State| VeinManager
    VeinManager -->|Draw Instructions| VeinGraphics

    VeinGraphics -->|Render Z-Index 5| TransferScene

2. Data Structures & Schema

We extend the module schema to support configuration of the vein network visuals and tagging for demand endpoints.

2.1. Settings Schema (src/data/schemas/assets.ts)

A new vein_network block is added to SettingsSchema.

export const VeinHeartbeatSchema = z.object({
bpm: z.number(),
envelope: z.array(z.object({
t: z.number().min(0).max(1), // Time normalized (0-1)
v: z.number().min(0).max(1) // Value/Intensity (0-1)
}))
});

export const VeinConfigSchema = z.object({
thickness: z.object({
attribute_scale_factor: z.number().default(0.5)
}),
colors: z.object({
supply_dim_factor: z.number().default(0.6),
supply_bright_factor: z.number().default(1.2)
}),
heartbeats: z.object({
default: z.string().default("healthy"),
presets: z.record(z.string(), VeinHeartbeatSchema)
})
});

2.2. Runtime Types (src/engine/phaser/veins/types.ts)

Definitions for the resolved graph passed to the renderer.

export interface VeinNode {
id: string;
x: number;
y: number;
radius: number;
}

export interface VeinEdge {
sourceId: string;
targetId: string;
attribute: "body" | "mind" | "social";
power: number; // Drives thickness
intensity: number; // Drives pulse brightness (0-1)
}

3. Core Systems

3.1. Graph Resolution Strategy (GraphBuilder)

Responsible for mapping the ECS entity list into a set of VeinEdges per frame. To avoid GC pressure, this system will accept a reusable array buffer to populate rather than allocating new arrays every frame.

Supply Chain Logic (Star Topology):

Find sys_swarm.

Find all assigned Face entities.

Find Attribute Pools (pool_body, etc.).

Rule: Link Face $\to$ Swarm $\to$ Pool. (If no Swarm, Face $\to$ Pool directly).

Demand Chain Logic (Tag-Driven):

Do NOT hardcode IDs.

Query Snapshot for entities with tags: demand:body, demand:mind, demand:social.

Rule: Link Pool $\to$ Entity if the entity has the matching tag AND is active (has state value > 0 or specific status).

3.2. Pulse Engine (PulseEngine)

Responsible for generating the scalar "intensity" values for current time $t$.

Supply Pulse (Global):

Driven by global phaser.time.

Samples the active HeartbeatPreset envelope to generate a synchronized supplyPulse value (0.0 to 1.0).

All supply lines pulse in unison (The Hivemind Heartbeat).

Demand Pulse (Local):

Driven by Entity State (Job Progress).

Uses the entity's own lifecycle (e.g., (now - jobStartTime)) to determine the phase of the pulse.

Result: Each job throbs at its own rate/phase, creating organic desynchronization.

3.3. Vein Manager (VeinManager)

Orchestrates the frame loop.

Extract: Reads entities/physics from Runtime.

Build: Invokes GraphBuilder to populate the edge buffer.

Simulate: Invokes PulseEngine to calculate intensities for each edge.

Render: Clears Graphics; draws tapered polygons.

Optimization Strategy (1.b):
The VeinManager will maintain a persistent VeinEdge[] buffer. GraphBuilder will overwrite this array and return the count of active edges. This prevents allocating thousands of small objects at 60FPS.

4. Visual Implementation Details

4.1. Tapered Line Rendering

Phaser's Graphics.lineBetween is constant width. To support tapering (Node A radius $\neq$ Node B radius), we must draw polygons.

Algorithm:

Calculate vector $V = P_{target} - P_{source}$.

Calculate normal vector $N$ (perpendicular to $V$).

Determine widths $W_{source}$ and $W_{target}$ based on connection power, clamped by node radii.

Calculate 4 corner points:

$S_1 = P_{source} + N \cdot (W_{source} / 2)$

$S_2 = P_{source} - N \cdot (W_{source} / 2)$

$T_1 = P_{target} + N \cdot (W_{target} / 2)$

$T_2 = P_{target} - N \cdot (W_{target} / 2)$

Draw filled polygon $(S_1, S_2, T_2, T_1)$.

4.2. Color Mixing

Base Color: Retrieved from assets.resources or hardcoded constants for Body/Mind/Social.

Pulse Modulation:

FinalColor = BaseColor _ (dim_factor + (intensity _ (bright_factor - dim_factor)))

Uses Phaser's Color.Interpolate or direct RGB manipulation for speed.

5. Implementation Plan

Step 1: Schema & Data

File: src/data/schemas/assets.ts - Add VeinConfigSchema.

File: src/data/raw/basic_loop.json - Inject default settings and add demand:\* tags to stations.

Step 2: The Pulse Engine

File: src/engine/phaser/veins/PulseEngine.ts

Implement envelope sampling and job-phase math.

Step 3: Graph Building

File: src/engine/phaser/veins/GraphBuilder.ts

Implement resolveVeinGraph using the Buffer/Reuse pattern.

Implement Tag-based demand
