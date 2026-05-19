Low-Level Design: Unified Behavior System (Phase 3.6)

1. Introduction

This document details the implementation plan for Phase 3.6: The Unified Behavior System.
This refactor removes the artificial distinction between "Continuous" (Logic/Flow) and "Discrete" (Trigger) systems, replacing them with a single, rule-based BehaviorSystem.

HLD Reference: phase_3_6_hld.md
Constraint Compliance: react-side-30-rules.md

2. Schema Architecture & Migration

2.1. Deprecations

The following schemas in src/data/schemas/components.ts will be deleted:

LogicComponentSchema

FlowComponentSchema

TriggerComponentSchema

FlowRuleSchema

TriggerRuleSchema

2.2. New Data Structures

We define the new schema in src/data/schemas/behavior.ts (new file) and export it to components.ts.

ActionValue

Represents a value that can be a static constant or a dynamic reference.

// Zod
export const ActionValueSchema = z.union([
z.number(),
z.string() // Reference path (e.g., "self.state.hp", "global.difficulty")
]);

BehaviorAction

A discriminated union of all possible effects.

export const MutateActionSchema = z.object({
type: z.literal("MUTATE"),
target: z.string(), // Reference path to write to
op: z.enum(["SET", "ADD", "SUB"]),
value: ActionValueSchema
});

export const TransferActionSchema = z.object({
type: z.literal("TRANSFER"),
source: z.string(), // "self" or entity ID
target: z.string(), // "self" or entity ID
resource: z.string(),
amount: ActionValueSchema
});

export const SpawnActionSchema = z.object({
type: z.literal("SPAWN"),
blueprintId: z.string()
});

export const KillActionSchema = z.object({
type: z.literal("KILL"),
entityId: z.string()
});

export const BehaviorActionSchema = z.discriminatedUnion("type", [
MutateActionSchema,
TransferActionSchema,
SpawnActionSchema,
KillActionSchema
]);

BehaviorRule & BehaviorComponent

export const BehaviorRuleSchema = z.object({
id: z.string(),
sortKey: z.string(),
// Conditions are still logic expressions (JsonLogic)
// "ALL conditions must be truthy"
conditions: z.array(LogicRuleSchema),
actions: z.array(BehaviorActionSchema)
});

export const BehaviorComponentSchema = z.object({
rules: z.array(BehaviorRuleSchema).default([])
});

2.3. Blueprint Integration

In src/data/schemas/blueprint.ts:

Remove logic, flow, trigger fields.

Add behavior: BehaviorComponentSchema.optional().

3. Engine Implementation

3.1. BehaviorSystem

Location: src/engine/runtime/systems/BehaviorSystem.ts
Responsibility: Evaluate rules for all entities every tick and queue commands.

Interface:

export class BehaviorSystem {
public tick(
snapshot: Snapshot,
commands: CommandBuffer<RuntimeCommand>
): void;
}

Execution Logic (Pseudocode):

tick(snapshot, commands) {
const globals = readGlobals(snapshot);

    for (const entity of snapshot.getEntities()) {
        if (!entity.behavior) continue;

        const context = { self: entity, globals, snapshot };

        for (const rule of entity.behavior.rules) {
            // 1. Gating: Evaluate all conditions
            const allMet = rule.conditions.every(cond =>
                jsonLogicAdapter.evaluate(cond, context)
            );

            if (!allMet) continue;

            // 2. Execution: Run actions
            for (const action of rule.actions) {
                this.executeAction(action, context, commands);
            }
        }
    }

}

3.2. ValueResolver

Location: src/engine/runtime/systems/behavior/ValueResolver.ts
Responsibility: Safely resolve ActionValue (number | string) into a concrete number.

Key Logic:

If number: return directly.

If string:

Parse path (self.state.hp vs global.diff).

Query Snapshot or Entity state.

Return 0 on resolution failure (fail-safe).

3.3. ActionExecutor

Location: src/engine/runtime/systems/behavior/ActionExecutor.ts
Responsibility: Convert a BehaviorAction into RuntimeCommand.

MUTATE: Emits UPDATE_STATE or SET_GLOBAL.

TRANSFER: Resolves references in amount, then emits TRANSFER_ASSETS.

SPAWN: Emits SPAWN.

KILL: Emits KILL.

Validation:

TRANSFER source/target resolution must handle "self" correctly.

MUTATE operations must handle overflow/clamping if schema supports it later (currently raw number).

4. Editor & Compiler Updates

4.1. Grammar Definition

The sentence structure remains WHEN ... DO ....
However, the Compiler must now output the new JSON schema.

Updated Grammar Support:

Value References: ADD self.hp global.rate (Already supported by tokenizer, needs compiler support).

Multiple Actions: ... DO SPAWN x AND KILL y (Needs parser support for chained actions).

4.2. BehaviorCompiler

Location: src/ui/devtools/editors/behaviors/compiler/behaviorCompiler.ts
Changes:

Replace compileLogic, compileFlow, compileTrigger with compileBehaviorRule.

Input: string[] (tokens).

Output: BehaviorRule.

Parsing Strategy:

Split tokens by DO. Left = Conditions, Right = Actions.

Split Conditions by AND (if we support explicit multi-condition grammar) or parse as one big Logic Expression (JsonLogic and operator).

Split Actions by AND.

Map each Action token chunk to a BehaviorAction.

4.3. UI Components

BehaviorsPanel.tsx: No major visual changes, but it now reads from entity.behavior.rules instead of 3 separate arrays.

Migration: When the editor loads a legacy blueprint, it acts as a "fresh start". We will not write migration code for old components in the UI.

5. File Manifest & Responsibilities

File Path

Responsibility

Changes

src/data/schemas/behavior.ts

NEW Defines BehaviorComponent and sub-schemas.

Create new Zod schemas.

src/data/schemas/components.ts

Exports component schemas.

Export Behavior, remove Logic/Flow/Trigger.

src/data/schemas/blueprint.ts

Defines entity structure.

Replace old components with behavior.

src/engine/runtime/systems/BehaviorSystem.ts

NEW Main logic loop.

Implements the tick loop logic.

src/engine/runtime/systems/behavior/ValueResolver.ts

NEW Reference resolution.

Helper class/function.

src/engine/runtime/systems/behavior/ActionExecutor.ts

NEW Command dispatch.

Helper class/function.

src/engine/runtime/runtimePhases.ts

Orchestrates systems.

Remove old systems, add BehaviorSystem.

src/ui/devtools/editors/behaviors/compiler/behaviorCompiler.ts

NEW Text -> JSON compiler.

Implements parsing logic.

src/ui/devtools/editors/behaviors/compiler/index.ts

Exports compiler.

Update exports.

6. Testing Strategy (Extensive)

All tests must be placed in src/engine/runtime/systems/behavior/**tests**.

6.1. BehaviorSystem.test.ts

Happy Path (Continuous):

Rule: WHEN true DO MUTATE self.state.energy ADD 1

Expect: state.energy increases by 1 every tick.

Happy Path (Reference):

Rule: WHEN true DO MUTATE self.state.energy ADD global.rate (where rate=5)

Expect: state.energy increases by 5.

Happy Path (One-Shot):

Rule: WHEN self.state.hp < 10 DO SPAWN ghost AND KILL self

Setup: hp = 5.

Expect: SPAWN command emitted, KILL command emitted.

Negative Path (Invalid Ref):

Rule: WHEN true DO MUTATE self.state.energy ADD self.missing_prop

Expect: ValueResolver returns 0, energy stays same (or increases by 0). System does not crash.

Edge Case (Circular Transfer):

Rule: WHEN true DO TRANSFER 1 gold FROM self TO self

Expect: Valid commands emitted, runtime handles it (net zero change).

6.2. ValueResolver.test.ts

Static: Resolve 10 -> 10.

Self State: Resolve self.state.x -> value from entity state.

Global: Resolve global.x -> value from world state.

Deep Path: Resolve self.physics.velocity.x (if physics exposure is added later, currently mostly state).

Missing: Resolve self.state.missing -> 0.

6.3. ActionExecutor.test.ts

Mutate: Verify UPDATE_STATE payloads for SET/ADD/SUB.

Transfer: Verify TRANSFER_ASSETS payload structure.

Lifecycle: Verify SPAWN/KILL payloads.

7. Implementation Steps (Strict Order)

Schemas: Create src/data/schemas/behavior.ts and update blueprint.ts.

Helpers: Implement ValueResolver.ts and ActionExecutor.ts with tests.

System: Implement BehaviorSystem.ts using helpers, with tests.

Integration: Update runtimePhases.ts to swap systems.

Compiler: Update the editor compiler to produce the new schema format.

Cleanup: Delete old system files and schema references.
