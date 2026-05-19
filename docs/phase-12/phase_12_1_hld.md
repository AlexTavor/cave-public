Cave Engine V3: Colony Sim & Economy

High-Level Design Document

Objective:
Shift the core gameplay from metabolic survival (Heat maintenance) to a Colony Sim model focusing on Comfort, Economic Expansion (Gold/Trade), and Tech Upgrades.

1. Core Architecture & Game Phases

Phase 1: The Awakening (Cinematic Start)

Initial State: The board contains only:

sys_world (Population: 0, Setup: 0)

sys_swarm (Empty)

face_body, face_mind, face_social (Hidden or inactive)

The Trigger:

A single worker spawns at the edge of the map (x: 0, y: 500).

Worker behavior: DISPATCH self TO sys_world.

The Reaction (World Logic):

sys_world detects population >= 1.

Actions:

Spawn pool_body, pool_mind, pool_social (The Attributes).

Spawn station_egg (The Starter Battery).

Set global flag setup_complete = 1.

Phase 2: The Egg (Kickstart)

Concept: A low-cost "battery" that charges up to unlock the game loop.

Behavior:

Consumes small trickle of Body/Mind/Social.

When progress >= 100:

Explode Resources: TRANSFER huge amounts of Food and Comfort to sys_world.

Spawn Infrastructure: Spawn station_forage and station_explore.

Spawn Storage: Spawn storage_wood, storage_gold, storage_grain (initially invisible).

Self-Destruct: KILL self.

Phase 3: The Core Loop (Comfort & Consumption)

Needs: Bodies now consume Food and Comfort (not Heat).

Consumption Logic (On Worker):

MUTATE sys_world.state.food SUB 0.1 (per tick).

MUTATE sys_world.state.comfort SUB 0.1 (per tick).

Production:

Food: Produced by Foraging, Butcher, Cooking.

Comfort: Produced by station_rest and station_cleanup.

Heat: Still exists but is now an intermediate resource (Wood $\to$ Heat $\to$ Comfort/Cooking), not a biological necessity for survival.

2. Economy & Trade Flow

Resource Storage Strategy

Physical Nodes: Every resource (Wood, Grain, Gold) has a physical storage entity on the map.

Visibility: Storage nodes utilize dynamic radii.

If value <= 0, radius clamps to 0 (Invisible).

If value > 0, radius scales up.

The Gold Loop

Production:

Wood Trader: Takes Wood $\to$ Internal Buffer $\to$ Transfer Gold to storage_gold.

Grain Trader: Takes Grain $\to$ Internal Buffer $\to$ Transfer Gold to storage_gold.

Poppables: "Hidden Treasure" nodes spawn with Gold, transfer it out, then die.

Spending (Tech Tree):

Gold is consumed by One-Time Upgrade Nodes (Draft choices).

3. Progression: The Explore Draft

The Engine (Station Explore)

Behavior:

Charges up using power.

On complete: TRIGGER_DRAFT pool_explore.

Inflation: Every trigger increases the powerSink.maxDemand.

The Draft Pool (pool_explore)

Tier 1: Basics (Repeatable)

Logging: Body/Mind $\to$ Wood. Scalable (more power = more wood).

Hearth: Wood $\to$ Heat.

Rest: Heat $\to$ Comfort.

Butcher: Corpses/Hunting $\to$ Food.

Lure: Social $\to$ New Bodies.

Tier 2: Agriculture (Repeatable)

Fields: Body/Mind/Social $\to$ Grain.

Cooking: Grain + Heat $\to$ Food (High Efficiency).

Tier 3: Trade (Repeatable)

Wood Trader: Wood $\to$ Gold (Poor Ratio).

Grain Trader: Grain $\to$ Gold (Good Ratio).

Tier 4: Technology (One-Time via Conditionals)

Buy Cooking Pot:

Cost: Gold.

Effect: Spawns "Pot Upgrade" node $\to$ Sets global.tech_pot = 1 $\to$ Dies.

Result: Cooking Station checks global.tech_pot to boost efficiency.

Foraging Gear:

Cost: Gold.

Effect: Sets global.tech_forage_gear = 1.

Logging Gear:

Cost: Gold.

Effect: Sets global.tech_logging_gear = 1.

Tier 5: Poppables (One-Time Resource Dumps)

Abandoned Camp: Spawns node_loot_wood (Contains 500 Wood).

Lost Shipment: Spawns node_loot_grain.

Smoked Meat: Spawns node_loot_food.

Hidden Treasure: Spawns node_loot_gold.

Survivors: Spawns node_loot_bodies (Spawns 3 workers then dies).

4. Special Entity Logic

The Training Station (Inversion of Control)

Concept: Assigned bodies gain XP.

Logic:

The Station does not push XP to the worker.

The Worker has a rule:

Condition: self.assignment.parentId == "station_training" AND station_training.state.active == 1.

Action: MUTATE self.body.xp ADD 1.

Poppable Nodes

Blueprint: node_loot_generic

State: Starts with resource: 500.

Behavior:

TRANSFER resource FROM self TO storage_resource.

Condition: self.state.resource.value <= 0.

Action: KILL self.

5. Implementation Debt (Engine Changes Required)

Before implementing the JSON, the C++ Engine must be updated to support:

A. Conditional Draft Options

Requirement: Prevent "One-Time" upgrades (like Cooking Pot) from appearing in the draft pool again after purchase.

Schema Change: Add conditions array to draftOptions entries.

Logic: When generating a draft hand, evaluate the condition. If false, exclude the option.

Example:

"option_buy_pot": {
"conditions": [
{ "tokens": [ { "t": "ref", "v": "global.tech_pot" }, { "t": "op", "v": "=" }, { "t": "val", "v": 0 } ] }
]
}
