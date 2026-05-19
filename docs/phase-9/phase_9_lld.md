Low-Level Design: Phase 9 (Vitality & Entropy)

Status: Canonical Design Document
Parent: Phase 9 HLD
Scope: VitalitySystem, DormancyHandler, Schema Updates, UI Feedback, Phaser Visuals.

1. Overview & Objectives

Why

To transition the simulation from a stable accumulation loop to a pressure-based survival loop. Resources must be consumed to maintain biological integrity, and failure to provide resources must degrade the system rather than just pausing progress.

What

Biological State: Entities track health and maxHealth.

Metabolism: A central system consumes Food/Heat and applies Health changes based on surplus/deficit.

Entropy: Low health reduces attribute contribution (efficiency).

Visual Distress: Phaser-based particle effects indicate starving entities.

Reset: A "Dormancy" state wipes the board upon extinction.

How

State: Add health/maxHealth to BodyComponent. Configurable constants in GameConfig.

Logic: VitalitySystem reads population from sys_world (populated by CensusSystem), calculates demand, and applies effects.

Efficiency: AttributePoolSystem scales attribute sums by health / maxHealth.

Visuals: A new DistressManager in Phaser renders pooled shockwaves for damaged entities.

UI: EntityNode shows a static health bar. SwarmCard lists all bodies via virtualization.

2. Data & Schema

2.1 Body Schema

File: src/data/schemas/game/body.ts

Responsibility: Persist biological state.

Changes:
Update BodyComponentSchema to include:

{
// ... existing fields
// Default to 100 to prevent instant death on load before first tick
health: z.number().default(100),
// Calculated derived stat, cached for UI/Systems
maxHealth: z.number().default(100)
}

2.2 Game Config Schema

File: src/data/schemas/game/config.ts

Responsibility: specific constants for the vitality simulation, allowing tuning via Cartridge.

Changes:
Define VitalitySettingsSchema and add to GameConfigSchema:

export const VitalitySettingsSchema = z.object({
foodPerPopSec: z.number().default(0.03),
heatPerPopSec: z.number().default(0.1),
starvationDamageSec: z.number().default(5), // Damage/sec at 100% deficit
healRateSec: z.number().default(2), // Health/sec regeneration
});

// Add to GameConfigSchema
vitality: VitalitySettingsSchema.default({})

2.3 Command Types

File: src/engine/runtime/types.ts

Changes:
Add GAME_DORMANCY to RuntimeCommandType.

export interface GameDormancyCommand {
type: RuntimeCommandType.GAME_DORMANCY;
payload: {
reason: string;
};
}

3. Systems

3.1 VitalitySystem

File: src/game/systems/VitalitySystem.ts (New)

Responsibility:
Manage the metabolic cycle using configuration from the cartridge.

Logic (per tick):

Resolve Configuration:

Access snapshot.getCartridge().assets.settings.game_config.vitality for all constants (foodPerPopSec, etc).

Census:

Do NOT count entities manually.

Read sys_world.state.population (value is updated by CensusSystem which runs before behavior systems).

If population <= 0, skip consumption logic (avoid divide by zero).

Update Max Health:

Iterate bodies. Calculate maxHealth = (level _ 20) + (bodyAttr _ 10).

Enqueue update if changed.

Resource Check:

Fetch sys_world state (food, heat).

Calculate foodDemand and heatDemand using constants and population.

Food:

Calculate deficitRatio (0.0 to 1.0). 1.0 means 0 food available for demand.

Consume available food via ADJUST_STATE (clamped to 0).

Heat:

Check heat < heatDemand.

Set isCold flag if true.

Apply Effects:

Iterate bodies.

Health:

If deficit > 0: delta = -1 _ starvationDamageSec _ deficitRatio \* dt.

Else (deficit == 0 && health < maxHealth): delta = healRateSec \* dt.

Clamp health to [0, maxHealth].

Traits:

If isCold: Emit ADD_TRAIT "cold".

Else: Emit REMOVE_TRAIT "cold".

Batch Update: Emit UPDATE_BODIES_BATCH with new health.

Extinction:

If population > 0 AND (all bodies died this tick):

Emit GAME_DORMANCY.

Interface:
implements System

3.2 AttributePoolSystem (Update)

File: src/game/systems/AttributePoolSystem.ts

Changes:
Modify calculateGlobalTotals:

Calculate efficiency: eff = clamp(health / maxHealth, 0, 1).

effectiveAttribute = floor(rawAttribute \* eff).

This ensures the "Death Spiral" mechanic works (starvation -> low production -> more starvation).

4. Visuals (Phaser)

4.1 DistressManager (Visuals)

File: src/engine/phaser/visuals/DistressManager.ts (New)

Responsibility:
Render expanding red circles (shockwaves) around entities with low health. Higher distress = more frequent waves.

Logic:

Pool: Create a pool of Phaser.GameObjects.Graphics (circles).

Update Loop:

Iterate all entities in Runtime.

Check healthRatio = health / maxHealth.

If healthRatio < 0.4 (Distress Threshold):

Determine frequency based on severity (e.g., < 0.1 = very fast).

Check internal timer for that entity.

If timer elapsed: Spawn Wave.

Spawn Wave:

Get graphic from pool.

Set position to entity body position.

Tween: Scale 1 -> 2, Alpha 0.8 -> 0, Color Red.

On Complete: Return to pool.

Integration:

Instantiate inside TransferScene.

Call distressManager.update(time, delta) in TransferScene.update.

5. UI Components

5.1 EntityNode (Update)

File: src/ui/runtime/world/EntityNode.tsx

Changes:

Health Bar:

Render ProgressBar below existing bars.

Color: Static #4caf50 (Green). No dynamic color changing.

Use EntityStateLink for performance.

No CSS Pulse:

Remove any CSS-based distress animations (handled by Phaser now).

5.2 SwarmCard (Update)

File: src/ui/runtime/world/selection/SwarmCard.tsx

Changes:

Virtualized List:

Replace top-5 summary with <Virtuoso> (from react-virtuoso).

Row Content:

Icon + Name.

Level + XP Bar.

Attributes (Body/Mind/Social).

Health Bar.

Status Icons (e.g., "Cold" snowflake if trait present).

Sorting:

Default sort: Health Ascending (Triage view).

6. Migration Steps

Modify game_loop_v2.json:

Remove consume_food / consume_heat rules from sys_world.

Ensure cold trait exists.

Register Systems:

Register VitalitySystem in src/game/main.ts (AFTER CensusSystem, BEFORE AttributePoolSystem).

Register DormancyHandler.

7. Testing Strategy

7.1 VitalitySystem (Unit)

Mock: sys_world with population: 10, food: 0.

Config: Mock config with foodPerPopSec: 1.

Assert:

foodDemand calculated correctly.

deficitRatio is 1.0.

Bodies receive starvationDamage command.

sys_world receives ADJUST_STATE (clamping food to 0).

7.2 DistressVisuals (Manual)

Action: Set entity health to 10 via terminal.

Observe: Red circles radiating from the entity in the Game View (Canvas), distinct from the UI DOM.

7.3 Swarm List (Manual)

Action: Spawn 20 entities.

Observe: Scrollable list in Swarm Card. Performance should be stable.
