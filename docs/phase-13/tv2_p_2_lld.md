LLD: V2 Phase 2 — Logistics Abilities (Storage & Production)

Status: Approved for Implementation
Context: Implements the "Economy" layer of the V2 Tooling plan.
Prerequisites: Phase 1 (Cycle Ability & Compiler Infrastructure) complete.

1. Executive Summary

The Objective

Enable the creation of autonomous supply chains using the V2 Editor. Users should be able to define entities that Produce resources (Sources) and entities that Store resources (Sinks) without writing raw behavior rules.

The Strategy

Schemas: Define StorageAbility and ProductionAbility.

Compiler:

storageCompiler: Auto-generates state containers (state.wood), visual bindings (bars/radius), and entropy (decay).

productionCompiler: Hooks into the Cycle from Phase 1. When state.cycle is full, it triggers a TRANSFER action.

Reset Logic: Update cycleCompiler to reset the cycle after production rules have fired.

Runtime Logic:

Implement Tag-Based Targeting for transfers (e.g., tag:storage:wood).

Implement Load Balancing (Select the target with the most available capacity).

2. Data Layer (Schemas)

2.1. Shared Types

Reuse ScalableValueSchema from Phase 1 for dynamic capacities/amounts.

2.2. Storage Ability

File: src/data/schemas/abilities/storage.ts (New)

import { z } from "zod";
import { ScalableValueSchema } from "./utils";

export const StorageAbilitySchema = z.object({
/\*_ The resource key to store (e.g., "wood", "food") _/
resource: z.string().min(1),

    /** Maximum storage capacity */
    capacity: ScalableValueSchema,

    /** * If true, adds the tag `storage:<resource>` to the blueprint.
     * This makes the entity discoverable by producers.
     */
    isDefault: z.boolean().default(true),

    /**
     * Amount of resource lost per second (Decay).
     * Useful for "Heat" or perishable goods.
     */
    entropy: z.number().default(0),

});

export type StorageAbilityConfig = z.infer<typeof StorageAbilitySchema>;

2.3. Production Ability

File: src/data/schemas/abilities/production.ts (New)

import { z } from "zod";
import { ScalableValueSchema } from "./utils";

export const ProductionAbilitySchema = z.object({
/\*_ The resource to produce _/
resource: z.string().min(1),

    /** Amount to produce per cycle completion */
    amount: ScalableValueSchema,

    /**
     * Where to send the output.
     * Defaults to "tag:storage:<resource>" if omitted.
     * Can be specific ID or tag.
     */
    target: z.string().optional(),

});

export type ProductionAbilityConfig = z.infer<typeof ProductionAbilitySchema>;

2.4. Index Update

File: src/data/schemas/abilities/index.ts (Update)

// ... imports
import { StorageAbilitySchema } from "./storage";
import { ProductionAbilitySchema } from "./production";

export const EditorAbilitiesSchema = z.object({
cycle: CycleAbilitySchema.optional(),
storage: z.array(StorageAbilitySchema).optional(), // Support multiple storage slots
production: z.array(ProductionAbilitySchema).optional(), // Support multiple outputs
});

3. Compiler Layer

3.1. Cycle Compiler Update (Reset Logic)

The Cycle ability currently accumulates energy. We need to ensure it resets to 0, but only after production rules have executed.

File: src/engine/compiler/abilities/cycleCompiler.ts (Update)

Add Rule: sys_cycle_reset

Sort Key: sys_999 (Runs last, assuming lexicographical sort sys_001 < sys_999).

Condition: self.state.cycle.value >= self.state.cycle.max

Action: MUTATE self.state.cycle.value SET 0

3.2. Storage Compiler

File: src/engine/compiler/abilities/storageCompiler.ts (New)

Logic:

State Init: Create state.[resource] with { value: 0, max: <base_capacity>, visible: true }.

Dynamic Max: Use compileScalableValue to drive state.[resource].max from capacity config.

Tags: If isDefault is true, push storage:[resource] to blueprint.tags.

Entropy: If entropy > 0, add passiveEffect: SUB self.state.[resource].value by entropy \* global.dt.

Visuals (Heuristic):

If display.radius.valueRef is undefined, bind it to the first storage ability's resource.

Add a bar to display.bars for this resource (Color defaults to hash of resource name or lookup).

3.3. Production Compiler

File: src/engine/compiler/abilities/productionCompiler.ts (New)

Logic:

Dependency Check: Warn if state.cycle is missing (Production requires Cycle).

Target Resolution: If target is undefined, default to tag:storage:[resource].

Amount Calculation: Use compileScalableValue to calculate self.state.vals.prod\_[resource]\_amt.

Behavior Rule: Generate sys*produce*[resource].

Sort Key: sys_050 (Runs after accumulation sys_001 but before reset sys_999).

Condition: self.state.cycle.value >= self.state.cycle.max

Action: TRANSFER [amount] [resource] FROM self TO [target] (Using the computed amount variable).

4. Runtime Layer: Smart Logistics

The engine needs to resolve tag:storage:wood to the best available target at runtime.

4.1. Target Selector Utility

File: src/engine/runtime/systems/behavior/targetSelector.ts (New)

import { Snapshot, RuntimeEntity } from "../../../types/runtimeCore";

/\*\*

- Resolves a reference string to a specific Entity ID.
- Logic:
-   1. "self" -> context.self.id
-   2. "tag:..." -> Query snapshot, filter, sort by headroom.
-   3.  "id" -> Return as is.
        \*/
        export const resolveSmartTarget = (
        ref: string,
        resource: string,
        context: { self: RuntimeEntity, snapshot: Snapshot }
        ): string | null => {
        if (ref === "self") return context.self.id ?? null;
            if (ref.startsWith("tag:")) {
                const tag = ref.slice(4);
                const candidates = context.snapshot.query({ tag });

                if (candidates.length === 0) return null;

                // Load Balancing: Find candidate with most "Headroom" (Max - Value)
                let bestId: string | null = null;
                let maxHeadroom = -1;

                for (const entity of candidates) {
                    // Unsafe access acceptable here; we are checking if the entity *has* the resource
                    const stateAny = entity.state as any;
                    const resState = stateAny?.[resource];

                    // Skip if entity doesn't have storage for this resource
                    if (!resState) continue;

                    const current = resState.value ?? 0;
                    const max = resState.max ?? 0;
                    const headroom = max - current;

                    if (headroom > maxHeadroom) {
                        maxHeadroom = headroom;
                        bestId = entity.id ?? null;
                    }
                }

                return bestId;
            }

            return ref;
        };

4.2. Action Executor Update

File: src/engine/runtime/systems/behavior/actionExecutorTransfer.ts (Modify)

Update executeTransferAction to utilize resolveSmartTarget.

// ...
import { resolveSmartTarget } from "./targetSelector";

export const executeTransferAction = (
action: TransferAction,
context: BehaviorContext,
commands: CommandBuffer<RuntimeCommand>,
resolver: ValueResolver
) => {
// OLD: const targetId = resolveEntityId(action.target, context);

    // NEW:
    const targetId = resolveSmartTarget(action.target, action.resource, {
        self: context.self,
        snapshot: context.snapshot
    });

    if (!targetId) return; // Fail gracefully if no valid target found

    // ... rest of implementation (amount resolution, command enqueue)

};

5. UI Layer

5.1. Storage Ability Form

File: src/ui/devtools/editors/blueprint/mode/forms/StorageAbilityForm.tsx (New)

Props: basePath (e.g., \_editor.abilities.storage[0]).

Fields:

StringField for resource.

ScalableValueInput for capacity.

NumberField for entropy.

BooleanField for isDefault (Label: "Auto-Tag").

5.2. Production Ability Form

File: src/ui/devtools/editors/blueprint/mode/forms/ProductionAbilityForm.tsx (New)

Props: basePath.

Fields:

StringField for resource.

ScalableValueInput for amount.

StringField for target (Placeholder: tag:storage:[resource]).

5.3. Designer Mode Integration

File: src/ui/devtools/editors/blueprint/mode/DesignerMode.tsx (Update)

Integrate AbilityList for storage array.

Integrate AbilityList for production array.

6. Verification Scenario

To validate Phase 2 without full UI integration, we can construct a test cartridge.

Blueprint: wood_storage_v2

\_editor: { storage: [{ resource: "wood", capacity: { base: 100 }, isDefault: true }] }

Expected Compile:

state.wood exists.

tags includes storage:wood.

Blueprint: lumberjack_v2

\_editor:

cycle: { maxProgress: { base: 50 }, inputs: { body: { base: 10 } } }

production: [{ resource: "wood", amount: { base: 1 } }] (Target defaults to tag:storage:wood)

Expected Compile:

behavior has sys_cycle_accumulate, sys_produce_wood, sys_cycle_reset.

Runtime Test:

Spawn wood_storage_v2 (store1).

Spawn lumberjack_v2 (jack1) and assign a worker (or give it base input).

Tick: jack1 accumulates cycle.

Complete: jack1 triggers TRANSFER 1 wood TO store1.

Verify: store1.state.wood.value becomes 1. jack1.state.cycle.value becomes 0.
