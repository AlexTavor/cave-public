Low-Level Design: Tools V2 Phase 3 - The Buff System (Runtime Injection)

Context & Objectives

Goal: Implement a "Pull/Census" architecture to allow entities (Sources) to modify the properties of other entities (Targets) based on Tags, without modifying the Target's blueprint.

Why:

Decoupling: Enable "Upgrades" (e.g., Bellows, Tech Buildings) that boost specific categories of entities (e.g., Producers) without the Producer knowing about the Upgrade.

Composition: Allow dynamic stacking of effects based on world state rather than rigid hierarchy.

Architectural Constraints:

Source of Truth: \_editor.abilities.injection in the Blueprint.

Compilation: Transforms high-level config into a runtime BuffComponent.

Runtime: A GlobalEffectsIndexer builds a transient index; PassiveEffectsSystem pulls and applies.

Data Schema

2.1. src/data/schemas/abilities/injection.ts (New)

Responsibility: Defines the configuration shape for the "Injection" ability in the Editor.

Interface:

import { z } from "zod";
import { Op } from "../primitives";

export const InjectionAbilitySchema = z.object({
targetTag: z.string(), // The tag to search for (e.g., "producer")
effects: z.array(z.object({
op: z.nativeEnum(Op), // ADD, MULT, SET
target: z.string(), // State path (e.g., "state.cycle.max")
value: z.number(), // Static scalar value
})),
});

export type InjectionAbilityConfig = z.infer<typeof InjectionAbilitySchema>;

2.2. src/data/schemas/components.ts (Update)

Responsibility: Defines the runtime component that stores compiled buff data on the Source entity.

Interface:

// Add to existing Component Schemas
import { PassiveEffectSchema } from "./game/passiveEffects";

export const BuffComponentSchema = z.object({
buffs: z.array(z.object({
targetTag: z.string(),
effects: z.array(PassiveEffectSchema),
})),
});

export type BuffComponent = z.infer<typeof BuffComponentSchema>;

Runtime Implementation

3.1. src/engine/runtime/systems/GlobalEffectsIndexer.ts (New)

Responsibility: Creates a transient, tick-lived index of all active global effects. It does not mutate entities directly; it provides a read-only query service for other systems.

Interface:

export class GlobalEffectsIndexer implements System {
// Public API for PassiveEffectsSystem
public getBuffsFor(tags: string[]): PassiveEffect[];

// System Lifecycle
public tick(snapshot: Snapshot, commands: CommandBuffer, dt: number): void;

}

Logic:

Reset: Clear the internal Map<Tag, PassiveEffect[]> at the start of tick.

Census: Iterate all entities in snapshot (using getEntities()) that possess a BuffComponent.

Index: For each entry in the component, push the effects into the Map under the targetTag.

Lookup: In getBuffsFor(tags), iterate the provided tags, retrieve effects from the Map, and flatten them into a single array.

3.2. src/engine/runtime/Runtime.ts (Update)

Responsibility: Lifecycle management and Dependency Injection.

Logic:

Instantiate GlobalEffectsIndexer in the constructor.

Register it using registerPreBehaviorSystem(this.globalEffectsIndexer) to ensure the index is built before behavior runs.

Injection: Pass this.globalEffectsIndexer into the constructor of PassiveEffectsSystem.

3.3. src/game/systems/passive-effects/PassiveEffectSystem.ts (Update)

Responsibility: The consumer of buffs. Applies both local and remote (injected) passive effects to entities.

Logic:

Constructor: Update to accept private readonly globalEffectsIndexer: GlobalEffectsIndexer.

Tick Loop:

Iterate all entities.

Resolve localEffects from entity.passiveEffects.

Resolve tags from entity.tags.

Pull: Call this.globalEffectsIndexer.getBuffsFor(tags) to get remoteEffects.

Merge: allEffects = [...localEffects, ...remoteEffects].

Note: This execution order ensures local base values (from the entity's own definition) are applied before remote modifiers (injected buffs).

Apply: If allEffects is not empty, call applyPassiveEffects(entity, globals, allEffects).

3.4. src/game/systems/passive-effects/passiveEffectUtils.ts (Update)

Responsibility: Pure logic for calculating state deltas from a list of effects. This function has NO knowledge of where effects come from (local vs remote).

Interface:

// Breaking Change: Update signature to accept explicit effects array
export const applyPassiveEffects: (
entity: RuntimeEntity,
globals: Record<string, number>,
effects: PassiveEffect[] // <-- New Argument: Source-agnostic list
) => Record<string, number>;

Logic:

Remove the internal lookup of entity.passiveEffects.

Iterate the passed effects array.

Perform existing math operations (SET, ADD, MULT, etc.).

Return the deltas map.

Compiler Implementation

4.1. src/engine/compiler/abilities/injectionCompiler.ts (New)

Responsibility: Transforms high-level InjectionAbilityConfig into low-level ECS BuffComponent.

Interface:

export const injectionCompiler: (
draft: Blueprint,
configs: InjectionAbilityConfig[]
) => void;

Logic:

Ensure draft.components exists.

Map the configs array to the BuffComponent structure (targetTag, effects).

Assign the result to draft.components.buffs.

4.2. src/engine/compiler/CompilerService.ts (Update)

Responsibility: Orchestrate the compilation pipeline.

Logic:

In the compile method, check for blueprint.\_editor.abilities.injection.

If present, invoke injectionCompiler(blueprint, ...) after other abilities but before cleaning up.

UI Implementation

5.1. src/ui/devtools/editors/blueprint/mode/forms/InjectionAbilityForm.tsx (New)

Responsibility: Render the configuration UI for the Injection ability in Designer Mode.

Interface:

export const InjectionAbilityForm: React.FC<{ basePath: string }>;

Logic:

Use ArrayField bound to basePath (allowing multiple injections per blueprint).

Inside the item render:

StringField for targetTag.

Nested ArrayField for effects.

Inside effects: EnumField (Op), StringField (Target Path), NumberField (Value).

5.2. src/ui/devtools/editors/blueprint/mode/useDesignerAbilities.ts (Update)

Responsibility: Registry of available Designer Mode abilities.

Logic:

Add "injection" to abilityKeys.

In addAbility: Initialize abilities.injection as [].

In removeAbility: Delete abilities.injection.

Testing Strategy

6.1. Unit Tests (src/engine/runtime/systems/GlobalEffectsIndexer.test.ts)

Test Case 1: Indexing.

Given a snapshot with Entity A (Buffs: Tag "X", Effect +10).

When tick() runs.

Then getBuffsFor(["X"]) returns 1 effect with value 10.

Test Case 2: Matching.

Then getBuffsFor(["Y"]) returns empty array.

Test Case 3: Stacking.

Given Entity B also provides Buffs for Tag "X".

Then getBuffsFor(["X"]) returns 2 effects.

6.2. Integration Tests (src/game/systems/RuntimeInjection.test.ts)

Scenario: "Bellows Upgrade"

Given:

Producer entity with tag "producer" and state.speed = 10.

Bellows entity with Injection: Tag "producer", Op "MULT", Value 2.

A Runtime with GlobalEffectsIndexer and PassiveEffectsSystem.

When:

tick() is called.

Then:

Verify Producer receives UpdateState command or has internal state updated to 20.

When:

Bellows is destroyed (KillCommand).

tick() is called.

Then:

Verify Producer state reverts to 10.
