LLD: V2 Tooling Phase 4 - Advanced Logic (Conversion & Upkeep)

1. Context & Scope

This phase introduces Conversion and Upkeep capabilities to the V2 Editor ("Designer Mode"). It also performs a critical architectural refactor to centralize all "negative consequence" logic (Misery) into a single system, separating it from the metabolic simulation (Vitality).

Goal:

Enable Conversion: Transform inputs into outputs upon cycle completion.

Enable Sustain: Consume resources over time to avoid failure states.

Refactor: Split Biological Misery (Starvation) out of VitalitySystem into MiserySystem.

Dependencies:

Requires CycleAbility (Phase 1) for timing Conversion events.

Requires StorageAbility (Phase 2) for holding inputs/outputs/fuel.

2. Data Architecture

2.1. Schemas

We introduce two new ability schemas to src/data/schemas/abilities.

📄 src/data/schemas/abilities/conversion.ts

Responsibility: Define the inputs and outputs for a transactional process.

import { z } from "zod";
import { ScalableValueSchema } from "./utils";

export const ConversionAbilitySchema = z.object({
// Unique ID for this conversion process (e.g., "smelt_iron")
id: z.string().default("default"),

    // Inputs required to perform the conversion
    inputs: z.array(z.object({
        resource: z.string(),
        amount: ScalableValueSchema // Supports base + perBody scaling
    })),

    // Outputs generated upon success
    outputs: z.array(z.object({
        resource: z.string(),
        amount: ScalableValueSchema
    })),

    // If true, the cycle progress resets to 0 after conversion
    resetCycle: z.boolean().default(true)

});

export type ConversionAbilityConfig = z.infer<typeof ConversionAbilitySchema>;

📄 src/data/schemas/abilities/upkeep.ts

Responsibility: Define a constant resource drain and the consequences of depletion.

import { z } from "zod";
import { ScalableValueSchema } from "./utils";

export const UpkeepAbilitySchema = z.object({
resource: z.string(),

    // Amount consumed per second
    rate: ScalableValueSchema,

    // The flag to set in state.flags.[failureState] when empty
    // e.g., "is_starving", "is_cold", "is_disabled"
    failureState: z.string().default("is_starving"),

    // If true, attempts to pull from global storage if internal storage is empty
    autoRequest: z.boolean().default(true)

});

export type UpkeepAbilityConfig = z.infer<typeof UpkeepAbilitySchema>;

📄 src/data/schemas/abilities/index.ts

Responsibility: Export the new schemas and update EditorAbilitiesSchema.

// ... imports
import { ConversionAbilitySchema } from "./conversion";
import { UpkeepAbilitySchema } from "./upkeep";

export const EditorAbilitiesSchema = z.object({
// ... existing
conversion: z.array(ConversionAbilitySchema).optional(),
upkeep: z.array(UpkeepAbilitySchema).optional()
});

3. Compiler Logic

3.1. Conversion Compiler

File: src/engine/compiler/abilities/conversionCompiler.ts

Responsibility: Generate the transaction logic: WHEN cycle_full AND has_inputs THEN consume_inputs AND grant_outputs AND reset_cycle.

Logic:

Prerequisite Check: Ensure a cycle ability exists in the draft.

Path Resolution: For each input, resolve storage path: state.storage.[resource].value.

Rule Generation:

Condition: self.state.cycle.value >= self.state.cycle.max

Condition (Inputs): For each input i: self.state.storage.[i.resource].value >= [i.amount]

Action (Consume): SUB self.state.storage.[i.resource].value [i.amount]

Action (Produce): ADD self.state.storage.[o.resource].value [o.amount]

Action (Reset): SET self.state.cycle.value 0 (if resetCycle is true)

Interface:

export const conversionCompiler = (
draft: Blueprint,
config: ConversionAbilityConfig,
index: number
) => void;

3.2. Upkeep Compiler

File: src/engine/compiler/abilities/upkeepCompiler.ts

Responsibility: Generate passive drain calculations, transfer requests, and failure flags.

Logic:

Passive Effect Generation:

Calculate demand for this tick: upkeep_demand = rate \* global.dt

Store in state.upkeep.[resource].demand

Behavior Rule (Consumption):

Action: SUB self.state.storage.[resource].value self.state.upkeep.[resource].demand

Behavior Rule (Failure Check):

Condition: self.state.storage.[resource].value <= 0

Action: SET self.state.flags.[failureState] 1

Action (Else): SET self.state.flags.[failureState] 0

Behavior Rule (Auto-Request) [Optional via config]:

Condition: self.state.storage.[resource].value <= 0

Action: TRANSFER [chunk_size] [resource] FROM tag:storage:[resource] TO self

Tagging: Add tag:susceptible*to*[failureState] to the blueprint tags.

Interface:

export const upkeepCompiler = (
draft: Blueprint,
config: UpkeepAbilityConfig,
index: number
) => void;

3.3. Compiler Service Integration

File: src/engine/compiler/CompilerService.ts

Update: Register the new compilers in the main pipeline.

// Inside compile method
if (abilities.conversion) {
abilities.conversion.forEach((cfg, idx) => conversionCompiler(draft, cfg, idx));
}
if (abilities.upkeep) {
abilities.upkeep.forEach((cfg, idx) => upkeepCompiler(draft, cfg, idx));
}

4. Runtime Systems

4.1. Misery System (Consolidated)

File: src/game/systems/MiserySystem.ts

Responsibility: The single source of truth for damage, death, and failure states. It handles both Global Biological Misery (formerly in VitalitySystem) and Local Mechanical Misery (new Upkeep logic).

Logic Flow:

Resolve Biological Misery:

Read global metrics from sys_world (Food/Heat Available, Population).

Re-calculate DeficitProfile (Food/Heat Deficit Ratios) locally (stateless calculation based on world state).

Execute buildMiseryResult (Harmonic Damage Distribution).

Note: This logic moves out of VitalitySystem and into MiserySystem.

Resolve Mechanical Misery:

Query entities with tags like susceptible_to_is_disabled.

Check state.flags.is_disabled.

Apply consequences (e.g., state.is_active = 0).

Execution:

Enqueue KILL and UPDATE_BODIES_BATCH commands.

Check for Extinction -> Enqueue GAME_DORMANCY.

Interface:

export class MiserySystem implements System {
constructor(private readonly settings: VitalitySettings) {}
tick(snapshot: Snapshot, commands: CommandBuffer<RuntimeCommand>, dt: number): void;
}

4.2. Vitality System (Refactor)

File: src/game/systems/VitalitySystem.ts

Responsibility: Purely Economic simulation. It manages the flow of resources (Consumption) and environmental factors (Seasonality). It no longer kills entities.

Changes:

Remove: Calls to buildMiseryResult, enqueueMiseryCommands, enqueueDormancyIfExtinct.

Retain: resolveSeasonality, enqueueSeasonIntensity, resolveDemandProfile, enqueueConsumption.

Output: The system's "output" is the modified resource state of sys_world, which MiserySystem reads in the next phase.

5. UI Components

5.1. Forms

📄 src/ui/devtools/editors/blueprint/mode/forms/ConversionAbilityForm.tsx

Components: useArrayField, ScalableValueInput, ResourceField.

📄 src/ui/devtools/editors/blueprint/mode/forms/UpkeepAbilityForm.tsx

Components: ScalableValueInput, ResourceField, StringField (failure flag).

5.2. Integration

📄 src/ui/devtools/editors/blueprint/mode/useDesignerAbilities.ts

Update: Add conversion and upkeep.

📄 src/ui/devtools/editors/blueprint/mode/AbilityListSections.tsx

Update: Render new sections.

6. Testing Strategy

6.1. Unit Tests (Compiler)

Location: src/engine/compiler/abilities/

File: conversionCompiler.test.ts

Fixture: Use createBlueprint.

Case 1: Verify behavior.rules has correct SUB/ADD logic.

Case 2: Verify resetCycle logic.

File: upkeepCompiler.test.ts

Fixture: Use createBlueprint.

Case 1: Verify PassiveEffect for demand calculation.

Case 2: Verify Rule for failure flag setting (IF storage <= 0).

6.2. Integration Tests (Runtime)

Location: src/game/systems/

File: MiserySystem.test.ts

Fixture: createCartridge, createGameRuntime.

Case 1 (Biological): Set sys_world food to 0. Tick. Verify MiserySystem enqueues damage/kill commands for bodies.

Case 2 (Mechanical): Create entity with state.flags.is_disabled = 1. Tick. Verify consequences (if any implemented).

File: VitalitySystem.test.ts

Refactor: Remove death assertions. Verify only ADJUST_STATE (consumption) and SET_GLOBAL (season) commands are emitted.

7. Implementation Steps

Schemas: Create conversion.ts, upkeep.ts.

Refactor Runtime:

Modify VitalitySystem.ts to strip misery logic.

Create/Update MiserySystem.ts to absorb biological misery logic + new mechanical hooks.

Update Runtime.ts registration order (Vitality -> Misery).

Compiler Logic: Implement conversionCompiler and upkeepCompiler.

UI: Implement Forms.

Verification: "Kiln" Scenario + Starvation Scenario.
