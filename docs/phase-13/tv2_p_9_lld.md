LLD: Loot & Logistics (One-Offs & Permissions)

Status: Final
Feature: Abilities V2 Expansion - Phase 2
Scope: Schema, Compiler, Runtime, Editor UI

1. Context & Goals

To support "Loot Box" and "Resource Node" archetypes (e.g., a chest that opens once, dumps resources, and disappears when empty), we need to introduce Lifecycle Management and Storage Permissions to the Abilities system.

One-Off Cycle: A cycle that runs exactly once, triggers its payload, and then manages the entity's destruction based on storage emptiness.

Storage Filtering: The ability to flag a storage container as "Output Only", preventing it from being selected as a destination for resource transfers by other entities.

2. Schema Changes

2.1. Cycle Ability (cycle)

File: src/data/schemas/abilities/cycle.ts

export const CycleAbilitySchema = z.object({
// ... existing fields (maxProgress, inputs, etc.)

// If true, the cycle runs exactly once.
// Upon completion, it enters a "depleted" state.
// The entity will auto-terminate when all local storage is empty.
oneOff: z.boolean().default(false),
});

2.2. Storage Ability (storage)

File: src/data/schemas/abilities/storage.ts

export const StorageAbilitySchema = z.object({
// ... existing fields (resource, capacity, etc.)

// If true (default), this entity is a valid target for external resource transfers.
// If false, this entity is excluded from target selection logic.
allowDeposit: z.boolean().default(true),
});

2.3. Component Schema (state)

File: src/data/schemas/components.ts (and src/engine/runtime/types/runtimeCore.ts)

We need to allow the allowDeposit metadata to exist on the runtime state object so the Transfer system can read it.

// Update StateValueSchema to include optional metadata
export const StateValueSchema = z.object({
value: z.union([z.number(), z.string(), z.boolean(), /* ... */]),
max: z.union([/* ... */]).optional(),
visible: z.boolean().default(true),
// New field
allowDeposit: z.boolean().optional(),
});

3. Logic & Compiler

3.1. Cycle Compiler Updates

File: src/engine/compiler/abilities/cycleCompiler.ts

Signature Change: The compiler needs access to sibling abilities (specifically storage) to generate the cleanup rule.

From: (draft: Blueprint, config: CycleAbilityConfig)

To: (draft: Blueprint, config: CycleAbilityConfig, fullAbilities?: EditorAbilities)

Logic:
If config.oneOff is true:

Inject State:

state.is_depleted: { value: 0, visible: false }.

Lock Progress:

Append condition self.state.is_depleted.value == 0 to the Progress Accumulation rule (preventing restart).

Completion Logic:

Append action MUTATE target: self.state.is_depleted.value, value: 1 to the Completion rule.

Garbage Collection Rule:

Create a new Behavior Rule: sys_cycle_gc.

Trigger: self.state.is_depleted.value == 1.

Conditions: Iterate over fullAbilities.storage.

For each storage item: self.state.[resource].value == 0.

Action: KILL self.

3.2. Storage Compiler Updates

File: src/engine/compiler/abilities/storageCompiler.ts

Logic:

When generating the state.[resource] entry, include allowDeposit: config.allowDeposit.

3.3. Runtime Transfer Logic (Shared)

File: src/engine/runtime/handlers/transferResources.ts

Function: validateTransferPermissions

Responsibility:
Exports a new function to check if a transfer is legally permitted based on entity state flags. Used by both the Handler (enforcement) and the Selector (intelligence).

Logic:

export const validateTransferPermissions = (
target: RuntimeEntity,
resource: string,
isExternal: boolean // derived from sourceId !== targetId
): boolean => {
if (!isExternal) return true;

    // Treat undefined as true (default permissive)
    const targetState = target.state?.[resource];
    const allowDeposit = targetState?.allowDeposit ?? true;

    if (allowDeposit === false) {
        return false;
    }

    return true;

};

Integration:

TransferHandler.ts calls validateTransferPermissions before executing the transfer.

3.4. Target Selection Updates

File: src/engine/runtime/systems/behavior/targetSelector.ts

Logic:

In resolveSmartTarget (and tag-based lookup logic):

Iterate through candidates matching the tag (e.g., storage:wood).

Filter candidates using validateTransferPermissions(candidate, resource, true).

Sort valid candidates by fill percentage (ascending).

Return the first candidate.

4. UI Implementation

4.1. Cycle Form

File: src/ui/devtools/editors/blueprint/mode/forms/CycleAbilityForm.tsx

Add BooleanField for oneOff.

Tooltip: "If enabled, the cycle runs once. The entity destroys itself when all storage is empty."

4.2. Storage Form

File: src/ui/devtools/editors/blueprint/mode/forms/StorageAbilityForm.tsx

Add BooleanField for allowDeposit.

Tooltip: "If disabled, this entity is ignored by producers looking for a place to send resources."

5. Testing Strategy

Adhering to testing-standards.md, tests are colocated with source files and use explicit factory setups.

5.1. Unit Tests (Compiler)

File: src/engine/compiler/abilities/cycleCompiler.test.ts

One-Off Logic:

Given a blueprint with oneOff: true.

When cycleCompiler runs.

Then state.is_depleted exists.

Then the completion rule includes action SET is_depleted 1.

Then a garbage collection rule exists with action KILL.

Given storage abilities defined in the editor config.

Then the garbage collection rule conditions check state.[resource].value == 0.

File: src/engine/compiler/abilities/storageCompiler.test.ts

Permissions:

Given allowDeposit: false.

When storageCompiler runs.

Then state.[resource] contains allowDeposit: false.

5.2. Integration Tests (Runtime)

File: src/engine/runtime/handlers/TransferHandler.permissions.test.ts

Reject Deposit:

Given a Source Entity (Producer).

Given a Target Entity (Chest) with state.wood.allowDeposit = false.

Given a valid TRANSFER command from Source to Target.

When TransferHandler executes.

Then the transfer is rejected (Target wood value remains unchanged).

Allow Internal:

Given a Target Entity (Chest) with state.wood.allowDeposit = false.

Given a valid TRANSFER command from Target to Target (Internal).

When TransferHandler executes.

Then the transfer is accepted (Target wood value increases).

File: src/engine/runtime/systems/behavior/TargetSelector.permissions.test.ts

Smart Filtering:

Given ChestA with state.wood.allowDeposit = true.

Given ChestB with state.wood.allowDeposit = false.

Given both chests have tag storage:wood.

Given a seeker entity equidistant from both.

When resolveSmartTarget is called for storage:wood.

Then it returns ChestA.

File: src/engine/runtime/systems/behavior/OneOffCycle.test.ts

Lifecycle:

Given a LootChest entity with Cycle (oneOff) and Storage (wood: 10).

Given state.is_depleted = 1 (Cycle completed).

When BehaviorSystem ticks.

Then LootChest remains alive (Storage not empty).

Given state.wood.value = 0 (Looted).

When BehaviorSystem ticks.

Then LootChest is destroyed (KILL command emitted).

6. Implementation Steps

Schema: Update CycleAbilitySchema and StorageAbilitySchema.

Schema: Update StateComponentSchema in src/data/schemas/components.ts and runtime types.

Compiler: Update CompilerService to pass full abilities context to cycleCompiler.

Compiler: Implement oneOff compilation logic in cycleCompiler.ts.

Compiler: Implement allowDeposit compilation logic in storageCompiler.ts.

Runtime: Implement validateTransferPermissions in src/engine/runtime/handlers/transferResources.ts.

Runtime: Integrate validation into TransferHandler.ts.

Runtime: Integrate validation into targetSelector.ts.

UI: Update CycleAbilityForm.tsx and StorageAbilityForm.tsx with new fields and correct tooltips.

Tests: Implement the specified unit and integration tests.
