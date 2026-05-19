High Level Design: Unified Behavior System

1. Executive Summary

This document outlines the architectural refactor to unify the Logic, Flow, and Trigger systems into a single Behavior System.

The Core Philosophy:

"There is no difference between continuous and discrete action. All action is discrete."

We reject the distinction between "continuous" (every tick) and "event-based" (trigger) logic. A simulation step is simply a sequence of atomic operations executed conditionally. By removing these artificial boundaries, we simplify the engine into a single pipeline that evaluates Rules.

2. Architectural Changes

2.1. The Abolition of Components

The following ECS components will be deprecated and removed:

LogicComponent

FlowComponent

TriggerComponent

They will be replaced by a single component:

BehaviorComponent

2.2. The Rule Schema

A BehaviorComponent contains a list of Rules.

Schema Definition (TypeScript/Zod):

type BehaviorComponent = {
rules: Rule[];
}

type Rule = {
// The Conditions (The Gate)
// A list of Logic Expressions. ALL must evaluate to truthy for the actions to run.
// Mandatory. The default/placeholder condition is typically `self.state.active = true`.
conditions: LogicRule[];

    // The Actions (The Payload)
    // An ordered list of discrete effects to apply when the conditions are met.
    actions: Action[];

}

type Action =
| { type: "MUTATE", target: string, op: Op, value: number | string } // Value can be a number OR a reference string
| { type: "TRANSFER", source: string, target: string, resource: string, amount: number | string }
| { type: "SPAWN", blueprintId: string }
| { type: "KILL", entityId: string }

Key Change: References in Values
Both MUTATE and TRANSFER actions support references for their values.

Example: ADD self.hp global.damage_rate

Example: GIVE self.inventory.gold TO shop (Transfers all gold)

2.3. The Execution Model

The system uses a pure Level-Triggered execution model. Implicit state ("previous value") is removed from the engine logic.

The Loop:
For every Tick:
For every Entity:
For every Rule:

1. Evaluate Conditions: Check if ALL condition expressions in the list are true.
2. Execute Actions: If met, run all actions in order.

Implicit Behaviors:

Continuous Logic: Achieved by a condition that remains true.

Example: WHEN self.state.active = true DO ADD self.energy 1 -> Runs every tick.

One-Shot Trigger: Achieved by an action that invalidates the condition.

Example: WHEN self.energy >= 100 DO SPAWN bullet AND SUB self.energy 100 -> Runs once, then energy drops below 100, stopping execution next tick.

3. Implementation Details

3.1. Engine: BehaviorSystem

A new system src/engine/runtime/systems/BehaviorSystem.ts will replace the existing trio.

Pseudocode:

class BehaviorSystem {
tick(snapshot, commands) {
for (const entity of snapshot.getEntities()) {
if (!entity.behavior) continue;

            const context = { self: entity, globals: snapshot.globals };

            for (const rule of entity.behavior.rules) {
                // 1. Evaluate Conditions (AND logic)
                const isMet = rule.conditions.every(condition =>
                    this.evaluator.evaluate(condition, context)
                );

                if (isMet) {
                    // 2. Execute Actions
                    for (const action of rule.actions) {
                        // Resolve values if they are references
                        const value = this.resolveValue(action.value, context);
                        this.executeAction({ ...action, value }, entity, commands);
                    }
                }
            }
        }
    }

}

3.2. Migration Strategy

There is no migration. The system is being built from scratch. Old components will be discarded.

3.3. The Editor Interface (Grammar)

The sentence-based editor allows constructing Rules using a fluent grammar.

Grammar:
WHEN [condition] [AND condition...] DO [action] [AND action...]

WHEN: Mandatory. Starts every rule.

AND: Used to separate multiple conditions in the check phase, OR multiple actions in the execution phase.

DO: Separates the condition block from the action block.

Examples:

Standard Accumulation:
WHEN self.state.active DO ADD self.state.charge 1

Complex Reference Logic:
WHEN self.state.active AND self.state.charge >= self.state.chargeThreshold DO ADD self.state.charge self.state.chargeThreshold AND ADD global.state.triggered 1

4. Why This Is Better

Unified Mental Model: No more guessing if logic runs "before" or "after" flow. It runs in the order defined in the rule list.

Reference Power: Using references for values (e.g. ADD charge chargeThreshold) enables dynamic balancing and data-driven design without code changes.

Explicit Control: "One-shot" vs "Continuous" behavior is explicitly defined by how the rule manages its own state, rather than being hidden in engine flags.

5. Next Steps

Refactor Schemas: Update blueprint.ts to replace legacy components with BehaviorComponent.

Implement System: Write BehaviorSystem.ts with support for reference resolution and multi-condition evaluation.

Update Editor: Rewrite the Behavior Panel to parse/serialize the new WHEN...AND...DO...AND grammar.
