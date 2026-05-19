LLD: Metabolic Loop Implementation (Refined)

1. Overview & Objectives

Goal: Close the resource loop by introducing a metabolic cost to existence and consequences for resource scarcity.

Mechanism

Census: Aggregate global population counts.

Metabolism: Linear consumption of Comfort and Satiety based on population.

Consequence: Bodies suffering from lack of resources gain negative attribute multipliers.

Recovery: Restoring resource levels removes negative traits.

2. Architecture & Logic Flow

2.1 The Cycle (Execution Order)

To ensure data consistency within a single tick, systems must be registered in this order:

CensusSystem: Counts bodies and writes global.population.

BehaviorSystem: Processes sys_world (consumption) and individual bodies (trait check).

BodySystem: Recalculates effective attributes using the updated trait list.

2.2 Mathematical Model

Attributes follow a two-pass calculation to ensure predictable results:

Pass 1 (Additive): Sum_Base = Base + Sum(Additive Modifiers)

Pass 2 (Multiplicative): Effective = Math.floor(Sum_Base \* Product(Multipliers))
Note: We use Math.floor to ensure deterministic integer results for gameplay attributes.

3. Detailed Component Design

3.1 Schema Updates: Multiplicative Traits

File: src/data/schemas/game/traits.ts
Extend TraitModifiersSchema with explicit defaults.

export const TraitModifiersSchema = z.object({
// Existing Additive
body: z.number().optional(),
mind: z.number().optional(),
social: z.number().optional(),
xpMultiplier: z.number().optional(),

    // New Multiplicative (Defaults to 1.0)
    bodyMultiplier: z.number().default(1),
    mindMultiplier: z.number().default(1),
    socialMultiplier: z.number().default(1),

});

3.2 New Behavior Actions: Trait Management

File: src/data/schemas/behavior.ts
Define new command types to enable dynamic trait modification.

export const AddTraitActionSchema = z.object({
type: z.literal("ADD_TRAIT"),
traitId: z.string(),
});

export const RemoveTraitActionSchema = z.object({
type: z.literal("REMOVE_TRAIT"),
traitId: z.string(),
});

// Update BehaviorActionSchema to include these

3.3 Runtime Implementation: Action Executor

File: src/engine/runtime/systems/behavior/ActionExecutor.ts
Handle the new verbs with "Set" semantics (preventing duplicates).

ADD_TRAIT: - Verify self.body component exists.

If traitId is not in body.traits, push it.

Crucial: Trigger a visual refresh by emitting an UPDATE_BODIES_BATCH with the new trait list.

REMOVE_TRAIT:

Filter the body.traits array.

Emit UPDATE_BODIES_BATCH if a trait was actually removed.

3.4 New System: CensusSystem

File: src/game/systems/CensusSystem.ts
Aggregate population once per tick to avoid redundant behavior complexity.

Logic: population = snapshot.getEntities().filter(e => e.body && !e.tags.includes('aggregate')).length

Output: UPDATE_STATE on sys_world for key population with visible: true.

3.5 Compiler & Syntax Updates

Syntax: ADD_TRAIT malnourished | REMOVE_TRAIT malnourished

Target is always implicitly self for this phase.

Update src/ui/devtools/editors/behaviors/compiler/constants.ts and tokenizer.ts.

4. Test Specifications (Given-When-Then)

4.1 Unit Test: Multiplier Math

Given: A body with Base Strength 10.

When: Trait A (Body +5) and Trait B (Body \* 0.5) are applied.

Then: Effective Strength is Math.floor((10 + 5) \* 0.5) = 7.

When: A second Trait C (Body \* 0.5) is added.

Then: Effective Strength is Math.floor((10 + 5) _ 0.5 _ 0.5) = 3.

4.2 Unit Test: Trait Deduplication

Given: Entity with traits: ["strong"].

When: Action ADD_TRAIT "hungry" executes.

Then: traits becomes ["strong", "hungry"].

When: Action ADD_TRAIT "strong" executes again.

Then: traits remains ["strong", "hungry"].

4.3 Integration Test: Census Visibility

Given: 5 Worker entities in the world.

When: CensusSystem runs.

Then: sys_world state population is 5 and visible is true.

4.4 Integration Test: Metabolic Loop

Given: sys_world has behavior WHEN global.population > 0 DO SUB global.satiety (global.population \* global.dt).

Given: A Worker has behavior WHEN global.satiety < 10 DO ADD_TRAIT malnourished.

When: satiety drops below 10.

Then: The Worker receives the malnourished trait.

Then: The Worker's production output (efficiency) decreases.
