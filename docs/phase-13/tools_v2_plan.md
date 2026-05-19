Implementation Plan: V2 Tooling (The Compiler Shift)

This plan executes the architectural pivot from "Raw ECS Editing" to "Ability-Based Composition".
Each step delivers a functional, verifiable slice of the new workflow.

Phase 1: Compiler Infrastructure & "Cycle" Ability

Goal: Establish the \_editor source-of-truth pattern and prove the compilation pipeline with the foundational "Cycle" ability (Energy Accumulator model).

Schema Definition (src/data/schemas)

[ ] Define ScalableValueSchema (base, perBody) in abilities/utils.ts.

[ ] Define CycleAbilitySchema (maxProgress, inputs: { body, mind, social }) in abilities/cycle.ts.

[ ] Define AbilityConfigurationSchema.

[ ] Extend BlueprintSchema to include optional \_editor field.

Compiler Service (src/engine/compiler)

[ ] Create CompilerService.ts.

[ ] Implement compileScalableValue utility (generates PassiveEffects for dynamic values).

[ ] Implement cycleCompiler (generates state.cycle, powerSink demands via Passives, and accumulation Behavior Rule).

[ ] Implement compileBlueprint orchestration (clears sys\_ rules, applies abilities).

Editor Integration (src/ui/devtools)

[ ] Modify BlueprintEditor to detect \_editor field.

[ ] Add a "Mode Switch" (Raw vs. Designer).

[ ] Implement ScalableValueInput atom (Base + Per Body inputs).

[ ] Implement CycleAbilityForm using the new input components.

[ ] Implement AbilityList UI in Designer view.

[ ] Add a "Compile & Save" action that runs the compiler before persisting to vfs.

Interactable Result:
Open a Blueprint. Switch to Designer Mode. Add a "Cycle" ability (Max: 100, Body Input: Base 10). Save. Switch to Raw Mode/Runtime and verify that:

state.cycle exists.

powerSink.baseDemand.body is set to 10 (via compiled passives if scalable).

A sys_cycle_accumulate rule exists that sums satisfied energy (Demand \* DrawFraction).

Phase 2: Logistics Abilities (Storage & Production)

Goal: Enable the creation of resource chains (Source -> Sink) using the new tooling.

Compiler Expansion

[ ] Implement StorageAbility compiler logic (generates state.[resource], display bindings).

[ ] Implement ProductionAbility compiler logic (generates TRANSFER rules on cycle complete).

[ ] Implement "Emptiest of Available" target resolution logic.

UI Implementation

[ ] Create StorageAbilityForm (resource picker, capacity, entropy).

[ ] Create ProductionAbilityForm (output resource, amount, target tags).

Runtime Support

[ ] Verify TRANSFER behavior handles the generated rules correctly.

Interactable Result:
Create a "Wood Storage" blueprint and a "Lumberjack" blueprint using only the Ability UI. Spawn them in the game. Verify the Lumberjack fills the Storage.

Phase 3: The Buff System (Runtime Injection)

Goal: Implement the "Pull/Census" architecture for global bonuses without modifying receiver blueprints.

Runtime Systems (src/engine/runtime)

[ ] Create BuffComponent schema.

[ ] Implement BuffSystem.ts.

[ ] Index all entities with BuffComponent by tag.

[ ] Expose a public API getBuffsFor(tags: string[]).

[ ] Integrate BuffSystem into Runtime.ts.

Compiler Expansion

[ ] Implement InjectionAbility compiler logic (generates BuffComponent).

UI Implementation

[ ] Create InjectionAbilityForm (target tag, operation, value, target path).

Interactable Result:
Create a "Bellows" blueprint with an Injection Ability targeting tag:producer with speed \* 1.5. Spawn it. Verify existing producers run faster immediately.

Phase 4: Advanced Logic (Conversion & Upkeep)

Goal: Enable complex processing nodes (e.g., Hearth, Kiln) that consume inputs to produce outputs or maintain state.

Compiler Expansion

[ ] Implement ConversionAbility (Input -> Cycle -> Output transaction logic).

[ ] Implement UpkeepAbility (Drain -> Starvation Flag).

Systems Update

[ ] Implement/Update MiserySystem to query and act on state.flags.is_starving.

UI Implementation

[ ] Create forms for Conversion and Upkeep.

Interactable Result:
Recreate the station_hearth (consumes wood, produces heat, decays over time) using purely the V2 Editor.

Phase 5: Polish & Lifecycle

Goal: Handle lifecycle transitions and clean up UX.

Lifecycle Logic

[ ] Update Compiler to generate PATCH_BLUEPRINT rules for state transitions (replacing "One-Off" patterns).

[ ] Ensure Entity IDs are preserved during transitions.

UX Refinement

[ ] Add "Eject" functionality (strip \_editor, keep generated fields as raw).

[ ] Add validation (warn if multiple abilities write to the same state path).

[ ] Hide "System" blueprints from the default list.

Interactable Result:
Create a "Construction Site" blueprint that transforms into a "House" blueprint upon completion. Verify the Entity ID remains constant.
