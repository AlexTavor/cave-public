Low-Level Design: Data-Oriented Flyweight Pattern Migration

1. The Why

Currently, the engine performs a deep-clone of the entire components dictionary from a Blueprint when spawning a RuntimeEntity. This includes massive, read-only definition trees such as AST logic (behavior), UI render settings (display), and constant modifier definitions (passiveEffects and buffs).

This creates three architectural bottlenecks:

Memory Bloat: Hundreds of entities generate thousands of identical, deeply nested objects in the JS heap.

GC Pauses: The Garbage Collector must scan massive amounts of redundant data every frame.

Stale State (No Hot-Reloading): Modifying a blueprint in the editor has no effect on living entities, as their definitions were copied by value at the moment of spawning.

By implementing the Flyweight Pattern, we strictly separate Stateful Components (cloned per entity) from Definition Components (referenced via blueprintId). This reduces the entity memory footprint by ~80% and unlocks instant, global hot-reloading for logic and visuals.

2. The What: Component Taxonomy

The engine must enforce a strict taxonomy during instantiation.

Stateful Components (Must be Deep Cloned)

These components contain values that mutate during the simulation.

state: Current values, dynamic maximums, and runtime flags.

physics: Live spatial coordinates, velocity, and dynamic constraints.

body: Progression (XP, level) and dynamic health.

traits: Live countdown timers and cycle accumulators.

cave: Progression logic unique to the player.

assignment: Live arrays of assigned proxy IDs.

powerSink / powerSource: Dynamic grid draw allocations and throttles.

automation: Mutable remainingMs and repeats countdowns.

Definition Components (Must be Excluded from Clone)

These components are read-only and must be resolved by reference.

behavior: AST logic rules, conditions, and actions.

display: Visual radii, UI labels, icons, and static bar configurations.

passiveEffects: Operations and target paths.

buffs: Target tags and applied effects.

narrative: Event text and static dialogue choices.

3. The Contract: Instance Fallback

All downstream systems (rendering, physics, logic) that consume Definition Components must adhere to the Instance Fallback Contract:

Resolved Component = Entity Instance Override OR Master Blueprint Definition OR Null

Implementation Standard:

const resolveComponent = <T>(entity: RuntimeEntity, snapshot: Snapshot, key: string): T | null => {
if (entity[key] !== undefined) {
return entity[key] as T;
}
if (!entity.blueprintId) {
return null;
}
const blueprint = snapshot.getBlueprint(entity.blueprintId);
if (blueprint?.components?.[key] !== undefined) {
return blueprint.components[key] as T;
}
return null;
};

Note: This contract allows the engine to benefit from zero-memory blueprint references, while preserving the ability to dynamically inject an instance-level override (e.g., a temporary mind-control behavior) directly onto an entity.

4. The How: File Responsibilities & Interfaces

4.1 State Visibility & Core Architecture

src/engine/runtime/Snapshot.ts

Responsibility: Provide immutable, synchronous access to both live entities and master blueprint definitions during a tick.

Interface Modification: \* Add parameter to constructor: blueprints: Record<string, Blueprint>.

Add public method: getBlueprint(id: string): Blueprint | undefined.

Logic: Store the cartridge blueprints in the class instance. When getBlueprint is called, return the matching dictionary entry.

src/engine/runtime/RuntimeCore.ts

Responsibility: Orchestrate the tick phase.

Logic: When instantiating the Snapshot object at the top of the tick method, pass this.cartridge.blueprints as the new third parameter.

4.2 Spawning Mechanics

src/engine/runtime/handlers/spawnUtils.ts

Responsibility: Provide safe instantiation utilities that adhere to the component taxonomy.

Interface: Export const STATEFUL_KEYS = ["state", "physics", "body", "traits", "cave", "assignment", "powerSink", "powerSource", "automation"];

Interface: Export cloneStatefulComponents(blueprintComponents: Record<string, unknown>): Record<string, unknown>.

Logic: Iterate through the keys of the provided blueprint components. If a key is present in STATEFUL_KEYS, apply the deepClone utility and assign it to the output object. If it is not in the array, skip it. Return the resulting lightweight object.

src/engine/runtime/handlers/SpawnHandler.ts & src/game/handlers/spawnFromBlueprint.ts

Responsibility: Entity construction.

Logic:

Replace const uniqueComponents = deepClone(blueprint.components || {}); with const uniqueComponents = cloneStatefulComponents(blueprint.components || {});.

CRITICAL FIX: Remove the hardcoded legacy extraction of passiveEffects (passiveEffects: deepClone(blueprint.components?.passiveEffects ?? [])). The Passive Effects system will now resolve this strictly via the Fallback Contract.

Ensure root attributes (id, blueprintId, label, tags) are explicitly assigned. (Tags must be shallow-cloned [...blueprint.tags]).

4.3 Downstream Logic Systems

src/engine/runtime/systems/BehaviorSystem.ts

Responsibility: Execute AST logic rules.

Logic: In the tick loop, remove direct access to (entity as any).behavior. Apply the Instance Fallback Contract:
const behavior = entity.behavior ?? (entity.blueprintId ? snapshot.getBlueprint(entity.blueprintId)?.components?.behavior : null);

src/engine/runtime/systems/GlobalEffectsIndexer.ts

Responsibility: Index tag-based buffs for global lookup.

Logic: In the tick loop, remove direct access to (entity as any).buffs. Apply the Instance Fallback Contract to resolve the buffs component before iterating through buff.effects.

src/game/systems/passive-effects/passiveEffectsSystemUtils.ts

Responsibility: Gather all active passive effects for a given entity.

Interface Modification: Update signature: collectPassiveEffects(entity: RuntimeEntity, snapshot: Snapshot, getBuffsFor: (tags: string[]) => PassiveEffect[]): PassiveEffect[].

Logic: Apply the Instance Fallback Contract to resolve passiveEffects. Remove any legacy logic that attempts to read passiveEffects from the root of the entity.

src/game/systems/passive-effects/PassiveEffectSystem.ts

Responsibility: Orchestrate the application of passive effects.

Logic: Update the call to collectPassiveEffects to pass the snapshot object.

4.4 Downstream Visual Systems

src/engine/phaser/scenes/transferSceneVisuals.ts

Responsibility: Extract visual properties for WebGL rendering.

Interface Modifications: \* parseDisplayComponent(entity: RuntimeEntity, blueprint?: Blueprint): DisplayComponent | null

resolveBackgroundVisuals(params: { entity: RuntimeEntity, blueprint?: Blueprint, styleAssets: Record<string, unknown>, defaultColor: string })

Logic: In parseDisplayComponent, apply the Instance Fallback Contract: const display = entity.display ?? blueprint?.components?.display;.

src/ui/runtime/world/useEntityNodeModel.ts

Responsibility: Extract render properties for React DOM overlays.

Logic: Retrieve the blueprint via const blueprint = hostEntity.blueprintId ? runtime?.getCartridge().blueprints[hostEntity.blueprintId] : undefined;.

Update the display useMemo hook to apply the Instance Fallback Contract (sourceEntity.display ?? blueprint?.components?.display).

Apply the Fallback Contract for physics.radius as a safety mechanism, ensuring the node defaults gracefully if an entity is missing its stateful physics instance.

5. Testing & Validation Strategy

Instantiation Verification:

Create a test cartridge with a blueprint containing both state and behavior.

Dispatch a SPAWN command.

Assert: The resulting RuntimeEntity in the ECS world contains a state object but DOES NOT contain a behavior object.

Logic Execution Verification:

Ensure the BehaviorSystem successfully fires a rule (e.g., MUTATE) for a spawned entity that lacks an instance-level behavior component.

Assert: The mutation is successfully applied to the entity's state, proving the fallback lookup succeeds.

Hot-Reload Verification:

Spawn an entity. Run a tick.

Programmatically modify the behavior component of the active ModuleCartridge in memory.

Run a second tick.

Assert: The entity immediately executes the new behavior rule without requiring a respawn or game restart.

Passive Effects Integrity:

Spawn an entity with passiveEffects defined in its blueprint.

Assert: The root level of the spawned entity does NOT contain passiveEffects.

Assert: The PassiveEffectSystem correctly applies the operations by successfully looking up the blueprint definition.
