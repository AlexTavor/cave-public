## Phase 6

# Feature Requirement: Biological Connection Network (The Vein System)

Status: Approved / Ready for Implementation
Scope: Runtime Visualization (Phaser)
Theme: "The Connected Self" (State Visualization vs. Flow Visualization)

1. Overview

We will implement a procedural rendering layer that visualizes the structural relationships between the Hivemind (Faces/Swarm), its Attributes (Pools), and its Activities (Jobs).

Unlike Resource transfers (which use impulse physics/balls to denote flow), this system uses continuous lines to denote state and connection. It represents the nervous/circulatory system of the Cave.

2. Visual Metaphor

The Vein: A line connecting two entities.

Thickness: Represents Power/Capacity.

Pulse: Represents Life/Activity.

Colony Pulse: A rhythmic, complex heartbeat indicating the organism is alive.

Job Pulse: A mechanical, frequency-based throb indicating exertion/load.

3. Topology & Routing Rules

The system must dynamically resolve connections based on the current entity graph.

A. The Supply Chain (Upstream)

Logic determines how power flows into the pools.

Scenario A: Early Game (No Swarm)

Source: Face Entities (assigned bodies).

Target: Attribute Pools (Body, Mind, Social).

Result: A mesh network. Faces connect directly to the specific attribute pool they represent.

Scenario B: Hivemind (Swarm Active)

Step 1: Faces $\rightarrow$ Swarm Entity.

Step 2: Swarm Entity $\rightarrow$ Attribute Pools.

Result: A star topology. The Swarm acts as a central hub/concentrator.

B. The Demand Chain (Downstream)

Logic determines how power is used.

Source: Attribute Pools.

Target: Job Nodes / Stations (anything consuming pool power).

Condition: Connection only renders if the job is active/processing.

4. Visual Rules

4.1. Geometry & Layering

Straight Lines: Connections are drawn as straight lines. No slack, no physics dragging.

Z-Index (Back to Front):

Map/Grid Background

Vein Network (This feature)

Resource Balls (Impulse Physics)

Entity Nodes (Icons/Avatars)

UI Overlays (Tooltips)

Rationale: Veins are the deepest layer of the organism. Balls float above them. Nodes sit on top of everything.

4.2. Thickness Constraints

Line thickness is driven by the Attribute Value flowing through it, but strictly bounded by physical geometry.

Constraint: The thickness of a line end must never exceed the diameter of the node it connects to.

Tapering: If Source Node Diameter $\neq$ Target Node Diameter, the line should taper visually between the two clamps.

4.3. Coloring (Attribute Inheritance)

Veins inherit the color of the Attribute they are transporting.

Logic:

pool_body connections $\rightarrow$ Body Color.

pool_mind connections $\rightarrow$ Mind Color.

pool_social connections $\rightarrow$ Social Color.

Hue Variation: Pulses are achieved by shifting the Hue/Lightness of this base color (e.g., Dark Red $\leftrightarrow$ Bright Crimson). No texture scrolling.

4.4. Pulse System A: The Colony Heartbeat (Supply)

Used for: Faces $\rightarrow$ Swarm $\rightarrow$ Pools.

Context: Indicates the holistic health of the colony.

Pattern Packages: The system must support switching between defined rhythmic patterns defined in data.

"Healthy": A quick double succession (Lub-Dub). Strong pulse followed immediately by a weaker echo, then a rest.

"Unhealthy": A diminishing vibration. Strong pulse fading into rapid, weak tremors.

State Control: The runtime must expose a mechanism to switch the active heartbeat package based on game state (e.g., Starvation, Damage).

Synchronization: All Supply lines pulse in unison.

4.5. Pulse System B: The Exertion Throb (Demand)

Used for: Pools $\rightarrow$ Jobs.

Context: Indicates work speed and load.

Pattern: Simple sine or triangle wave.

Frequency (BPM): Driven by Job Duration.

Slow Jobs: ~40 BPM (Deep, heavy throb).

Fast Jobs: High BPM (Rapid vibration/shimmer).

5. Configuration Schema

Control data must be exposed in assets.settings.

{
"vein_network": {
"thickness": {
"attribute_scale_factor": 0.5 // How much 1 attribute point adds to width
},
"colors": {
"supply_dim_factor": 0.6,
"supply_bright_factor": 1.2
},
"heartbeats": {
"default": "healthy",
"presets": {
"healthy": {
"bpm": 60,
"envelope": [
{ "t": 0.0, "v": 0.0 },
{ "t": 0.1, "v": 1.0 }, // Lub
{ "t": 0.2, "v": 0.0 },
{ "t": 0.3, "v": 0.6 }, // Dub
{ "t": 0.5, "v": 0.0 },
{ "t": 1.0, "v": 0.0 }
]
},
"unhealthy": {
"bpm": 90,
"envelope": [
{ "t": 0.0, "v": 1.0 },
{ "t": 0.2, "v": 0.5 },
{ "t": 0.4, "v": 0.25 },
{ "t": 0.6, "v": 0.1 },
{ "t": 1.0, "v": 0.0 }
]
}
}
}
}
}

6. Technical Implementation Strategy

6.1. Data Source

Scan: Runtime.getEntities() per frame.

Identify Nodes:

Faces: face component.

Swarm: ID sys_swarm.

Pools: IDs pool_body, pool_mind, pool_social.

Jobs: Entities with active process/cooldown states.

6.2. Rendering (The FlowRenderer)

Input: Connection Graph.

State Management:

Track current_heartbeat_state (default: 'healthy').

Calculate global pulse_intensity based on performance.now() and current preset.

Draw Loop:

Resolve Source/Target positions and radii.

Calculate line thickness (clamped by radii).

Resolve color (Base Attribute Color \* Pulse Intensity).

Draw Line.
