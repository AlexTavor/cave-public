High-Level Design: Phase 9 (Vitality & Entropy)

Status: Canonical Design Document
Scope: Vitality System, Starvation, Health, Dormancy, UI Feedback
Goal: Transition the simulation from a stable "SimCity" loop to a pressure-based "Don't Starve" loop.

1. Design Philosophy

The system currently lacks entropy. Resources accumulate, and bodies exist indefinitely. Phase 9 introduces Biological Pressure.

Survival is Active: Food and Heat are no longer just numbers to watch go up; they are fuel that, if exhausted, physically degrades the machine (the Swarm).

Natural Selection: Health is tied to the Body Attribute and Level. Stronger, more experienced bodies naturally survive longer during famine.

Efficiency is Biological: A starving body is a weak body. Economic output scales with physical health.

Death is a Mechanics Reset: Dormancy is not a game over screen; it is a mechanical process of wiping the board while persisting specific meta-data.

2. Core Mechanics

2.1. Constitution (Health Calculation)

Health is not a static number defined in a blueprint. It is derived every tick from the entity's growth.

$$MaxHealth = (Level \times 20) + (BodyAttribute \times 10)$$

Logic: Experience (Level) provides resilience. Muscle (Body) provides bulk.

Consequence: "Faces" (Mind/Social) usually have high levels, granting them a health buffer even if they lack the Body attribute.

2.2. The Metabolic Cycle (VitalitySystem)

Instead of individual entities consuming food via Behavior rules, consumption is centralized in the VitalitySystem.

The Cycle (Per Tick):

Calculate Demand: Sum of all active bodies \* Consumption Rate.

Check Stockpile: Compare against sys_world.state.food.

Branch A: Surplus

Deduct Demand from Stockpile.

Apply Regen to all bodies (e.g., +1% MaxHP/sec).

Branch B: Deficit (Starvation)

Calculate DeficitRatio (How much of the demand was unmet?).

Calculate GlobalDamage = DeficitRatio \* StarvationSeverity.

Distribute Damage: Apply GlobalDamage flatly to every body.

Result: Low HP bodies (Runts) die quickly. High HP bodies (Elders) degrade slowly.

2.3. The Death Spiral (Efficiency Scaling)

Starvation must hurt productivity immediately, not just at the moment of death.

Mechanic: AttributePoolSystem (which sums Body/Mind/Social for the grid) must scale each entity's contribution by their Health %.

Effect: Starvation -> Lower Attributes -> Lower Production -> Less Food -> More Starvation.

2.4. Dormancy (Fail State)

Triggered when Population == 0 (and sys_world exists).

Sequence:

Persist: Save Traits, Understanding (future), and Metadata to a "Legacy" object.

Wipe: Delete all entities except sys_world.

Reset: Set all sys_world resources (Food, Wood, Heat) to baseline.

Spark: Spawn a body_drifter (randomized starter archetype).

3. Architecture & Data

3.1. Schema Updates

File: src/data/schemas/game/body.ts

Update BodyComponentSchema:

Add health: z.number() (Current HP)

Add maxHealth: z.number() (Calculated/Cached)

Note: These are runtime values, but having them in the schema ensures they persist in snapshots.

3.2. Systems

VitalitySystem (New)

Responsibility:

Update maxHealth based on current stats.

Calculate Global Food/Heat demand.

Mutate sys_world resources.

Apply damage or healing to BodyComponent.

Apply Cold trait if Heat is insufficient.

Detect Extinction (Pop == 0) and trigger DormancyCommand.

Phase: Runs before AttributePoolSystem (so health impacts attributes immediately).

AttributePoolSystem (Update)

Change: When summing attributes from bodies, multiply values by (body.health / body.maxHealth).

DormancyHandler (New Command)

Command: GAME_DORMANCY

Responsibility:

Execute the Wipe/Reset/Spark sequence atomicly.

Logs the "Era" or "Cycle" count (future proofing).

3.3. UI & Feedback

EntityNode (Update)

Visual: Add a secondary ProgressBar below the existing bars.

Logic:

Color: Green -> Red gradient based on %.

Visibility: Hidden if Health == 100%. Visible otherwise.

Pulse: If Health < 20%, apply a CSS pulse animation to the node container.

SwarmCard (Update)

Visual: Add "Casualty Watch" section.

Logic: List all bodies sorted by Health % (ascending). Show name + health bar.

sys_swarm Node (Update)

Visual: If sys_world.state.isStarving is true, the node icon pulses red.

4. Implementation Plan

Step 1: Schema & Data

File: src/data/schemas/game/body.ts

Add health, maxHealth. Default health to a safe initial value (e.g. 100) to prevent instant death on load before first tick.

File: src/data/schemas/game/traits.ts

Ensure Cold trait exists (it does).

Step 2: The Vitality Logic

File: src/game/systems/VitalitySystem.ts

Implement the class.

Interface: System.

Logic:

Iterate bodies -> update maxHealth.

Iterate bodies -> calc totalFoodDemand, totalHeatDemand.

Fetch sys_world -> get food, heat.

Apply logic (Surplus vs Deficit).

Update sys_world state.

Check for Pop == 0.

File: src/game/systems/AttributePoolSystem.ts

Update: Modify calculateGlobalTotals to accept health scaling.

Step 3: Dormancy

File: src/engine/runtime/types.ts

Add GAME_DORMANCY command type.

File: src/game/handlers/DormancyHandler.ts

Implement handler.

Logic:

context.world.entities.forEach(e => if (e.id !== 'sys_world') remove(e))

context.impulseEngine.clear() (except sys_world body)

resetSysWorld(sys_world)

spawn('body_drifter')

Step 4: UI Updates

File: src/ui/runtime/world/EntityNode.tsx

Inject health bar logic.

Add Pulse styled component for critical health.

File: src/ui/runtime/world/selection/SwarmCard.tsx

Add CasualtyList component.

Step 5: Integration

File: src/game/main.ts

Register VitalitySystem.

Register DormancyHandler.

Important: Remove consume_food / consume_heat rules from sys_world blueprint in game_loop_v2.json to avoid double consumption.

5. File Specifications

5.1 src/game/systems/VitalitySystem.ts

export class VitalitySystem implements System {
tick(snapshot: Snapshot, commands: CommandBuffer, dt: number): void {
// 1. Resolve World State (Food/Heat)
// 2. Iterate Bodies
// - Calc MaxHealth
// - Calc Consumption
// 3. Determine Global Status (Starving/Freezing)
// 4. Apply Effects
// - If Starving: Deal (Deficit _ 10 _ dt) damage flatly
// - If Full: Heal (5% Max \* dt)
// 5. Extinction Check
// - If activeBodies == 0 -> Emit GAME_DORMANCY
}
}

5.2 src/game/handlers/DormancyHandler.ts

export class DormancyHandler implements CommandHandler<GameDormancyCommand> {
handle(command, context): void {
// 1. Wipe World (Keep sys_world)
// 2. Reset Resources
// 3. Spawn Drifter
// 4. Log "The Cycle Restarts..."
}
}

5.3 src/data/raw/game_loop_v2.json (Modification)

Remove: consume_food rule from sys_world.

Remove: consume_heat rule from sys_world.

Reason: Consumption is now handled natively by VitalitySystem.

6. Testing Strategy

Unit Test (VitalitySystem.test.ts):

Mock sys_world with 0 food.

Tick system.

Assert bodies take damage.

Assert weak body takes higher % damage (due to lower max HP).

Unit Test (DormancyHandler.test.ts):

Populate world with entities.

Execute command.

Assert only sys_world and drifter remain.

Integration Test:

Run simulation with 0 food.

Observe population decline until 0.

Observe Dormancy trigger.
