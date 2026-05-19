Phase 8 LLD: Cave-Centric Metabolism (The Nervous System)

Why: The Strategic Shift & Thermodynamics

We are shifting from abstract "Comfort/Satiety" to a simulated thermodynamic loop involving Heat and Food. This introduces resource competition and conversion chains.

1.1 The Resource Chain

Edibles: Raw organic matter (gathered).

Fire: Produced in the Hearth from Wood. High intensity, capped.

Heat: Produced by Fire. Decays naturally over time. The "currency" of warmth.

Food: Processed meals created in the Pot by combining Edibles and Heat.

1.2 The Conflict

The Hearth generates Heat.

The Cave needs Heat to survive (Metabolism).

The Pot needs Heat to cook Food.

Conflict: The Pot and the Cave compete for the Hearth's Heat output.

What: Functional Specification

2.1 The Metabolic Loop

Hearth Physics:

Converts Wood -> Fire.

Converts Fire -> Heat.

Heat decays naturally (Entropy).

Pot Chemistry:

Pulls Heat from the Hearth.

Converts Edibles + Heat -> Food.

Cave Metabolism:

Census: Counts active drones.

Drain: Consumes internal Heat and Food based on population.

Pull: Active transfers of Heat from Hearth and Food from Pot.

Signal (Nervous System - Shared Truth):

Cave calculates Health via internal Behavior Rules (JSON Logic).

Formula: Health = (Heat% + Food%) / 2.

Stored in sys_world.state.health.

Used by BodySystem (bonuses) and VeinManager (visuals).

2.2 Visuals (Data-Driven)

Central Node: sys_world physicalized at center.

Nervous System: Purple veins connecting Cave -> Faces -> Swarm.

Dynamic Pulse:

Heartbeat configuration is not hardcoded.

Defined in vein_network settings via an ordered rules array.

Logic: Iterate rules; last rule where condition is TRUE determines the active preset.

How: Implementation Plan

3.1 Data Schema & Blueprints

A. Asset Definitions (New)

Add icons and resource styles for: fire, heat, edibles.

B. Blueprints (src/data/raw/game_loop_v2.json)

Resource Rename: food -> edibles, satiety -> food, comfort -> heat.

Blueprint: station_hearth

State: wood, fire, heat.

Behavior: Stoke, Radiate, Entropy.

Blueprint: station_pot

State: edibles, heat, food.

Behavior: Pull Heat (competes with Cave), Cook.

Blueprint: sys_world (The Cave)

State: heat, food, population, health.

Behavior:

pull_resources: Transfer Heat/Food from stations.

metabolize: Consume Heat/Food based on population.

calc_health: MUTATE health SET ( (heat / max) + (food / max) ) / 2.

C. Vein Configuration Schema

Extend VeinConfigSchema in assets.ts:

// New Schema Addition
const HeartbeatRuleSchema = z.object({
condition: LogicRuleSchema, // Standard JSON Logic
preset: z.string() // ID of the heartbeat preset to apply
});

const HeartbeatConfigSchema = z.object({
default: z.string(),
presets: z.record(z.string(), VeinHeartbeatSchema),
rules: z.array(HeartbeatRuleSchema).optional() // Ordered list, last match wins
});

3.2 Runtime Systems

A. CensusSystem.ts

Updates sys_world.state.population.

B. BodySystem.ts

Reads sys_world.state.health.

Applies attribute bonuses based on Health (0.0 to 1.0).

C. VeinManager.ts (Visuals)

Throttled Evaluation: Every X ms (e.g., 200ms), evaluate config.heartbeats.rules against global state.

Context: Pass globals (including sys_world state) to JsonLogicAdapter.

Selection:

Start with default preset.

Iterate rules. If condition evaluates to true, update activePreset.

Pass activePreset to PulseEngine.

3.3 Visuals Implementation

GraphBuilder.ts: Generate nervous system edges.

VeinGraphics.ts: Render veins using the dynamic width/pulse from PulseEngine.

Testing Standards

4.1 Integration: Thermodynamics.test.ts

Goal: Prove the loop works and sys_world.health is calculated correctly.

Given: Hearth with Wood, Cave with Population.

When: Tick loop runs.

Then:

Hearth produces Heat.

Cave pulls Heat.

Cave consumes Heat.

sys_world.state.health updates reflecting the new saturation levels.

4.2 Visual Logic: NervousSystemRules.test.ts

Goal: Verify data-driven visual switching.

Given:

Mock sys_world state.

Vein Config with 2 rules:

IF health < 0.5 USE panic.

IF heat < 100 USE frozen.

Scenario A: Health 0.4, Heat 500. -> Expect panic.

Scenario B: Health 0.4, Heat 50. -> Expect frozen (Rule 2 overrides Rule 1 because it is last).

Scenario C: Health 1.0, Heat 500. -> Expect default.

Architectural Safeguards

Single Source of Truth: sys_world is the only authority on Health. Visuals and Gameplay simply read it.

Visual Decoupling: VeinManager does not know about "Health" explicitly; it only knows about "Conditions" defined in JSON. This allows designers to change visual triggers (e.g., "Panic when Food is low, ignoring Heat") without code changes.

Performance: Throttling rule evaluation prevents JSON Logic parsing overhead from affecting the 60FPS render loop.
