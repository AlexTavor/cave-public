Phase 8 LLD: Cave-Centric Metabolism (The Nervous System)

Objective:
Shift survival mechanics from individual units (The Sims) to a global hivemind state (Frostpunk). Physicalize "The Cave" as an entity that consumes resources to broadcast power to its drones.

1. Conceptual Model

1.1 The Loop

Census: The system counts the active population.

Drain: The Cave (sys_world) consumes Satiety and Comfort proportional to population.

Supply: Production nodes (Hearth, Cookpot) TRANSFER these resources to the Cave.

Signal (The "Bonus"): The Cave broadcasts its own attributes (Body, Mind, Social) to all drones.

Throttling (The Consequence): If the Cave is starving/freezing, the signal degrades. The bonus received by drones is reduced by the Metabolic Health percentage.

1.2 The Visuals (The Nervous System)

The Brain: sys_world becomes a physical node in the center of the layout.

The Nerves: New Purple Veins connect the Cave to the Faces and Swarm.

The Pulse:

Healthy: Strong, rhythmic pulse. Thick veins.

Starving: Arrhythmic, weak pulse. Thin, withered veins.

2. Data Schema Changes

2.1 sys_world Incarnation

Update the sys_world blueprint to be a physical entity.

{
"id": "sys_world",
"label": "The Cave",
"tags": ["sys", "hivemind"],
"components": {
"display": {
"label": "The Cave",
"icon": "cave_level",
"radius": { "min": 50, "max": 60 },
"bars": [
{ "key": "state.satiety", "max": 1000, "color": "#db4437", "label": "Satiety" },
{ "key": "state.comfort", "max": 1000, "color": "#ff9800", "label": "Comfort" }
]
},
"physics": { "x": 0, "y": 0, "radius": 50, "isStatic": true },
"state": {
"satiety": { "value": 500, "max": 1000 },
"comfort": { "value": 500, "max": 1000 },
"population": { "value": 0 },
"body": { "value": 5 }, // Cave Attribute
"mind": { "value": 5 }, // Cave Attribute
"social": { "value": 5 } // Cave Attribute
},
"behavior": {
"rules": [
{
"id": "metabolism",
"conditions": [],
"actions": [
// Consumption = Population * Cost * dt
{ "type": "MUTATE", "target": "self.state.satiety", "op": "SUB", "value": "self.state.population * 0.1 * global.dt" },
{ "type": "MUTATE", "target": "self.state.comfort", "op": "SUB", "value": "self.state.population * 0.05 * global.dt" }
]
}
]
}
}
}

2.2 Resource Definitions

Ensure satiety and comfort are registered in assets.resources so TRANSFER logic creates visible particles.

3. Systems Implementation

3.1 CensusSystem (New)

Responsibility: Count the flock.

Input: Query all entities with body component (exclude sys_swarm).

Logic: count = entities.length

Output: UPDATE_STATE(sys_world, "population", count)

3.2 Behavior Updates (Supply)

Update blueprints for Hearth and Cookpot.

Old: MUTATE global.comfort ADD 5

New: TRANSFER 5 comfort FROM self TO sys_world

Why: Creates visual transfer particles flying to the Cave.

3.3 BodySystem (The Buff Logic)

Modify processBodyEntity.ts to include the Cave Bonus.

Algorithm:

Get sys_world.

Calculate Throttle:

satietyPct = cave.state.satiety.current / cave.state.satiety.max;
comfortPct = cave.state.comfort.current / cave.state.comfort.max;
throttle = Math.min(satietyPct, comfortPct); // Bottleneck logic

Apply Bonus:

// Example for Body Attribute
base = entity.baseAttributes.body;
caveBonus = cave.state.body.value \* throttle;
entity.attributes.body = base + caveBonus;

4. Visuals: The Nervous System

4.1 Vein Graph Topology (GraphBuilder.ts)

Add a new pass to GraphBuilder after standard veins:

Find sys_world.

Find all Faces and sys_swarm.

Create edges: sys_world -> Target.

Metadata: Tag these edges as type: "nervous".

4.2 Rendering (VeinGraphics.ts)

Update render loop to handle nervous edges distinct from resource veins.

Color: #9C27B0 (Purple/Eldritch).

Width: baseWidth \* Throttle. (Starvation = Withered veins).

Pulse:

Calculate pulseFrequency based on Throttle.

Decision: Healthy = 60 BPM. Starving = 120 BPM (Tachycardia/Panic).

5. Execution Plan

Assets: Register satiety/comfort as resources.

Blueprints: Update sys_world (add physics/state) and Stations (change output to TRANSFER).

Runtime:

Implement CensusSystem.

Update BodySystem to read sys_world and apply throttled bonus.

Visuals:

Update GraphBuilder to link Cave -> Faces.

Update VeinGraphics to render the purple Nervous System.
