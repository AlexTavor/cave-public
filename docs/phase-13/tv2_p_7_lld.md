LLD: Intake & Intel Systems (Spawner & Sampler)

Status: Final
Feature: Abilities V2 Expansion
Scope: Schema, Compiler, Validation, Editor UI

1. Context & Goals

To implement the "Hunger Engine" core loop, we need two new High-Level Abilities (HLL) in the Designer Mode. These abstract away complex Behavior Rules into simple, validated forms.

Spawner (Intake): Automates entity creation on cycle completion.

Sampler (Intel): Synchronizes a local state variable with a global/remote value on cycle completion.

These abilities act as "Sugar" that compiles down to standard ECS components and Behavior Rules.

2. Ability Definitions

2.1. Spawner Ability (spawner)

Responsibility: Triggers a SPAWN or SPAWN_BODY action when the entity's Cycle completes.

Schema: src/data/schemas/abilities/spawner.ts

import { z } from "zod";
import { ScalableValueSchema } from "./utils";

export const SpawnerAbilitySchema = z.object({
// The Blueprint ID to spawn
blueprintId: z.string(),

// How many to spawn per cycle
// Uses ScalableValue to allow population-based scaling (e.g. waves)
count: ScalableValueSchema.default({ base: 1, perBody: 0 }),

// The type of spawn action to trigger
// "spawn": Pure entity creation (good for events/signals/abstract)
// "spawn_body": Physical spawn relative to a target/spawner
mode: z.enum(["spawn", "spawn_body"]).default("spawn_body"),

// Optional target entity ID for the spawn origin/destination logic
// Only used when mode is "spawn_body"
// Defaults to "sys_world" to ensure entities always have a valid anchor if self isn't appropriate
target: z.string().default("sys_world"),
});

export type SpawnerAbilityConfig = z.infer<typeof SpawnerAbilitySchema>;

Compiler Logic: src/engine/compiler/abilities/spawnerCompiler.ts

Trigger: cycle_complete.

Action Emission:

Loop count.base times (simplification for V1).

If mode is "spawn":

Emit SPAWN action.

blueprintId: from config.

Note: target is ignored.

If mode is "spawn_body":

Emit SPAWN_BODY action.

blueprintId: from config.

target: config.target.

Validation: src/engine/compiler/validation/collisionDetector.ts

Dependency Check: Error if abilities.cycle is undefined.

Blueprint Check: Warning if blueprintId does not exist in registry.

2.2. Sampler Ability (sampler)

Responsibility: Copies a value from a source path (typically global) to a local state path when the Cycle completes. It effectively "mirrors" a remote value.

Schema: src/data/schemas/abilities/sampler.ts

import { z } from "zod";

export const SamplerAbilitySchema = z.object({
// The value to read (Autocomplete: State Paths)
// e.g., "sys_world.state.notoriety.value"
source: z.string(),

// The local state key to write to (created automatically by the compiler)
// Hidden from UI.
target: z.string().default("sampled_value"),

// Should this state be visible in the UI?
visible: z.boolean().default(true),

// Internal default for the max value placeholder.
// Hidden from UI.
max: z.number().default(100),
});

export type SamplerAbilityConfig = z.infer<typeof SamplerAbilitySchema>;

Compiler Logic: src/engine/compiler/abilities/samplerCompiler.ts

Target Key Generation:

The compiler derives a semantic local key from the source path to avoid collisions if multiple samplers exist (e.g., source="global.heat" -> target="sampled_heat").

Fallback: Uses config.target if derivation fails.

State Injection:

Injects state.[target] into the blueprint.

value: 0 (Initial).

visible: config.visible.

max: config.max (Initial placeholder).

Behavior Rule Generation:

Trigger: cycle_complete.

Action 1 (Sync Value): MUTATE

target: self.state.[target].value

op: SET

value: config.source (string reference).

Action 2 (Sync Max - Inferential):

The compiler analyzes config.source.

If it ends in .value, it attempts to generate a companion action to sync .max.

Logic: const maxSource = config.source.replace('.value', '.max').

Action: MUTATE -> target: self.state.[target].max, value: maxSource.

Validation: src/engine/compiler/validation/collisionDetector.ts

Dependency Check: Error if abilities.cycle is undefined.

Target Validation: Error if the derived target key collides with reserved component keys (e.g., 'cycle', 'physics', 'display') or existing state keys defined elsewhere in the blueprint.

3. UI Implementation

3.1. Forms

File: src/ui/devtools/editors/blueprint/mode/forms/SpawnerAbilityForm.tsx

Blueprint ID: AutocompleteStringField

Tooltip: "The entity blueprint to create when the cycle completes."

Count: ScalableValueInput

Tooltip Base: "Number of entities to spawn."

Tooltip PerBody: "Additional entities per global population count."

Mode: EnumField

Tooltip: "Spawn Type: 'spawn' for abstract creation, 'spawn_body' for physical placement."

Target: AutocompleteStringField

Tooltip: "The physical entity to spawn near/at. Defaults to sys_world."

Condition: Only visible if mode === "spawn_body".

File: src/ui/devtools/editors/blueprint/mode/forms/SamplerAbilityForm.tsx

Source: AutocompleteStringField

Tooltip: "The global or remote state path to mirror (e.g. sys_world.state.notoriety.value)."

Visible: BooleanField

Tooltip: "If true, shows a progress bar for this value on the entity."

Hidden Fields: target and max are not rendered. The user only selects what to sample and if it is visible.

3.2. Integration

Register forms in AbilityList.tsx.

Add ability keys to useDesignerAbilities.ts.

4. Testing Strategy

4.1. Unit Tests (Logic & Compiler)

File: src/engine/compiler/abilities/**tests**/spawnerCompiler.test.ts

Happy Path (Spawn Body):

Given mode: "spawn_body", When compiled, Then SPAWN_BODY action is emitted with target.

Verify default target is "sys_world" if unspecified in previous steps (though Schema default handles this).

Happy Path (Spawn Pure):

Given mode: "spawn", When compiled, Then SPAWN action is emitted without target.

Scaling:

Given count: 5, When compiled, Then 5 actions are emitted.

Negative Path:

Given config with missing cycle, Then collisionDetector returns error.

File: src/engine/compiler/abilities/**tests**/samplerCompiler.test.ts

Happy Path:

Given valid config, When compiled, Then state component has new key derived from source.

Then behavior rule exists with MUTATE set to source reference.

Inference:

Given source ending in .value, Then a second action is generated for .max.

Then state component max defaults to 100 (placeholder).

Edge Cases:

Given target key collision (e.g. state.cycle), Then compiler overwrites (but validation should catch/warn).

4.2. Integration Tests (Runtime Systems)

File: src/engine/runtime/systems/behavior/**tests**/SpawnerIntegration.test.ts

Scenario (Mode: Body):

Given a spawner entity with Cycle (1 tick) and target: "self".

When BehaviorSystem ticks and cycle completes.

Then SpawnHandler receives SPAWN_BODY command with target "self".

Scenario (Mode: Pure):

Given a spawner entity with Cycle.

When BehaviorSystem ticks.

Then SpawnHandler receives SPAWN command.

File: src/engine/runtime/systems/behavior/**tests**/SamplerIntegration.test.ts

Scenario:

Given sys_world with state.notoriety.value = 50 and state.notoriety.max = 100.

Given sampler entity with source: "sys_world.state.notoriety.value".

When BehaviorSystem ticks and cycle completes.

Then sampler.state.sampled_notoriety.value becomes 50.

Then sampler.state.sampled_notoriety.max becomes 100.

4.3. View Tests (UI Smoke)

File: src/ui/devtools/editors/blueprint/mode/forms/**tests**/SpawnerAbilityForm.test.tsx

Smoke: Renders inputs with tooltips.

Interaction: Changing mode to "spawn" hides the "target" input.

Validation: Renders error if blueprintId is empty.

File: src/ui/devtools/editors/blueprint/mode/forms/**tests**/SamplerAbilityForm.test.tsx

Smoke: Renders source and visible inputs. Does NOT render target or max.

Interaction: Toggling visible updates draft.

5. Implementation Steps

Data: Add schemas to src/data/schemas/abilities/. Update index.ts.

Logic: Implement compilers in src/engine/compiler/abilities/.

Pipeline: Hook compilers into CompilerService.ts.

Validation: Add checks to collisionDetector.ts.

UI: Implement Forms and update Registry in src/ui/devtools/editors/blueprint/mode/.

Tests: Write the Unit and View tests defined above.
