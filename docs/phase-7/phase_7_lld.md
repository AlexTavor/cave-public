Low-Level Design: Energy Grid & Power Distribution System (Phase 7)

1. Abstract

This document specifies the implementation of the Energy Grid. The system calculates proportional power distribution from attribute pools to demand-heavy "Stations." It introduces player-controlled throttling and updates the visual vein network to represent draw percentages through dynamic line thickness. To ensure performance, the system uses delta-patching to only emit commands when state changes significantly.

2. Component Specifications

2.1 PowerSourceComponent

Responsibility: Identifies an entity as a provider for a specific attribute grid.
File: src/data/schemas/components.ts

export const PowerSourceComponentSchema = z.object({
attribute: z.enum(["body", "mind", "social"]),
});

2.2 PowerSinkComponent

Responsibility: Defines the demand profile and tracks distribution results for a consumer.
File: src/data/schemas/components.ts

export const PowerSinkComponentSchema = z.object({
baseDemand: z.object({
body: z.number().default(0),
mind: z.number().default(0),
social: z.number().default(0),
}),
throttle: z.number().min(0).max(1).default(1.0),
// Runtime-calculated fields (emitted via UPDATE_STATE)
efficiency: z.number().default(0),
drawFraction: z.record(z.string(), z.number()).default({}), // attr -> 0..1
status: z.enum(["nominal", "brownout", "blackout"]).default("blackout"),
});

3. System Logic: EnergyDistributionSystem

File: src/game/systems/EnergyDistributionSystem.ts
Responsibility: Calculate grid efficiency and per-node draw fractions.

3.1 Constants & Thresholds

GRID_EPSILON = 0.001: Used for delta-patching to prevent redundant commands.

NOMINAL_THRESHOLD = 0.99: Efficiency above this is considered "Nominal."

BLACKOUT_THRESHOLD = 0.01: Efficiency below this is considered "Blackout."

3.2 Algorithm

Gather Supply: Query all entities with PowerSourceComponent. Aggregate state.power.value into a map: Map<Attribute, TotalSupply>.

Gather Sinks: Query all entities with PowerSinkComponent.

Aggregate Demand: For each attribute $A \in \{body, mind, social\}$:

$RequestedDemand(Sink, A) = Sink.baseDemand[A] \times Sink.throttle$

$TotalDemand(A) = \sum RequestedDemand(Sink, A)$

Calculate Distribution:

$GridEfficiency(A) = min(1.0, TotalSupply(A) / TotalDemand(A))$

If $TotalDemand(A) == 0$, $GridEfficiency(A) = 1.0$.

Resolve Status & Delta-Patch:

For each Sink:

$Sink.drawFraction[A] = RequestedDemand(Sink, A) / TotalDemand(A)$

$AvgEfficiency = \text{mean of GridEfficiency for attributes with demand } > 0$.

Status determination: nominal if $\ge 0.99$, blackout if $\le 0.01$, else brownout.

Budget Protection: Only emit UPDATE_STATE if $|newEfficiency - oldEfficiency| > GRID_EPSILON$ or if status has changed.

4. Visual Bridge & Rendering

4.1 VeinEdge Interface Update

File: src/engine/phaser/veins/types.ts

export interface VeinEdge {
sourceId: string;
targetId: string;
attribute: VeinAttribute;
power: number;
intensity: number;
drawFraction: number; // 0..1 percentage of total draw from pool
sourceRadius: number; // Radius of source pool for base width calc
}

4.2 VeinManager Extension

File: src/engine/phaser/veins/VeinManager.ts

Decoration Logic: When GraphBuilder identifies a Sink-to-Pool edge:

Look up drawFraction from the target's PowerSinkComponent.

Look up sourceRadius from the source's PhysicsBody.

Inject these values into the VeinEdge before passing to the renderer.

4.3 VeinGraphics Implementation

File: src/engine/phaser/veins/VeinGraphics.ts

Dynamic Width:

$BaseWidth = (edge.sourceRadius \times 2) \times edge.drawFraction$

$FinalWidth = max(2.0, BaseWidth \times pulsingIntensity)$

Constraints: Active power draws must never drop below 2px width to ensure visibility during severe brownouts.

5. Blueprint Updates

File: src/data/raw/game_loop_v2.json

Sources: Attach PowerSourceComponent to pool_body, pool_mind, pool_social.

Sinks:

station_hearth: baseDemand: { body: 10, mind: 5 }

station_pot: baseDemand: { social: 8 }

6. Testing Standards

6.1 Integration Test (EnergyDistributionSystem.test.ts)

Scenario: Proportional Load Balancing

Given: A world with one pool_body (Power: 10) and two station_hearth entities (Demand: 10 each).

When: The system ticks.

Then: Both stations should report efficiency: 0.5 and status: brownout.

When: One station's throttle is set to 0.

Then: The remaining station should report efficiency: 1.0 and status: nominal.

6.2 Edge Case: Grid Collapse

Given: A station with active demand.

When: The corresponding pool\_ entity is removed from the world.

Then: The station must immediately transition to status: blackout and efficiency: 0.

6.3 View Test: Proportional Geometry

Given: A VeinEdge with sourceRadius: 50 and drawFraction: 0.2.

Then: The rendered base width should be 20px ($100px \times 0.2$).
