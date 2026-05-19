LLD: Cycle Ability Redefinition (Energy Accumulator)

Status: Approved for Implementation
Context: Refining Phase 1 of tools_v2_plan.md.
Supersedes: Previous Cycle definitions in tv2_p_1_lld.md.

1. Executive Summary

The Pivot

We are shifting the Cycle Ability from a time-based model ("Duration + Power Draw") to an Energy Accumulator model.

Old: "Run for 10 seconds. If efficiency is 50%, take 20 seconds."

New: "Accumulate 1000 Joules. Draw energy from the grid. When full, complete."

The Why

This aligns the game mechanics with the "Vein Network" (Energy Grid). It allows entities to participate in the economy dynamically:

Scalable Costs: Larger tasks require more energy.

Scalable Throughput: Assigning more workers (Bodies) increases the energy draw (Demand), filling the accumulator faster.

Multi-Attribute: A task can require physical labor (body) AND focus (mind) simultaneously.

The How

Schema: Define ScalableValue (Base + PerBody) and update CycleAbilitySchema.

Compiler:

Generate passiveEffects to calculate dynamic powerSink.baseDemand and state.cycle.max.

Generate a behavior rule to accumulate satisfied energy (Demand \* DrawFraction) into state.cycle.value.

UI: Create ScalableValueInput and update CycleAbilityForm.

2. Data Layer Strategy

2.1. New Shared Schema: ScalableValue

We need a standard way to define a number that scales with the workforce.

File: src/data/schemas/abilities/utils.ts (New)

import { z } from "zod";

export const ScalableValueSchema = z.object({
base: z.number().default(0),
perBody: z.number().default(0),
});

export type ScalableValue = z.infer<typeof ScalableValueSchema>;

2.2. Updated Schema: CycleAbility

File: src/data/schemas/abilities/cycle.ts (Modify)

import { z } from "zod";
import { ScalableValueSchema } from "./utils";

export const CycleAbilitySchema = z.object({
// The Container: How much energy to complete the cycle?
// e.g. Base 100 + 10 per body (if difficulty scales)
maxProgress: ScalableValueSchema,

    // The Inputs: Energy Demand per second, per attribute
    inputs: z.object({
        body: ScalableValueSchema.optional(),
        mind: ScalableValueSchema.optional(),
        social: ScalableValueSchema.optional(),
    }),

});

export type CycleAbilityConfig = z.infer<typeof CycleAbilitySchema>;

2.3. Blueprint Schema Update

File: src/data/schemas/blueprint.ts (No Change to file structure, just ensuring it imports the new CycleAbilityConfig)

3. Engine Layer: The Compiler

3.1. Utility: Passive Chain Generator

Since PassiveEffects execute sequentially and only support one operation at a time (ADD, MULT, SET), we need a helper to generate the chain for Base + (PerBody \* Count).

File: src/engine/compiler/utils/scalableCompiler.ts (New)

import { Blueprint } from "../../../data/schemas/blueprint";
import { ScalableValue } from "../../../data/schemas/abilities/utils";

/\*\*

- Generates PassiveEffects to calculate: Target = Base + (PerBody \* AssignmentCount)
- Uses a temp variable for the multiplication step.
  \*/
  export const compileScalableValue = (
  draft: Blueprint,
  config: ScalableValue,
  targetPath: string,
  tempVarName: string
  ) => {
  const effects = draft.components.passiveEffects ??= [];
  const countPath = "self.state.assignment.count"; // Contract: AssignmentSystem must provide this or default to 0

        // Optimization: If static, just SET
        if (config.perBody === 0) {
            effects.push({
                op: "SET",
                target: targetPath,
                value: config.base
            });
            return;
        }

        // 1. Reset Temp Var = Count
        effects.push({
            op: "SET",
            target: `self.state.vals.${tempVarName}`,
            source: countPath
        });

        // 2. Temp Var = Temp Var * PerBody
        effects.push({
            op: "MULT",
            target: `self.state.vals.${tempVarName}`,
            value: config.perBody
        });

        // 3. Target = Base
        effects.push({
            op: "SET",
            target: targetPath,
            value: config.base
        });

        // 4. Target += Temp Var
        effects.push({
            op: "ADD",
            target: targetPath,
            source: `self.state.vals.${tempVarName}`
        });

    };

3.2. Cycle Compiler

File: src/engine/compiler/abilities/cycleCompiler.ts (Rewrite)

Responsibility:

Initialize state.cycle and state.cycle_active.

Compile maxProgress into state.cycle.max.

Compile inputs into powerSink.baseDemand.

Generate the Accumulation Rule.

import { ulid } from "ulid";
import type { Blueprint } from "../../../data/schemas/blueprint";
import type { CycleAbilityConfig } from "../../../data/schemas/abilities/cycle";
import { compileScalableValue } from "../utils/scalableCompiler";

export const cycleCompiler = (
draft: Blueprint,
config: CycleAbilityConfig,
): void => {
// 1. State Initialization
draft.components ??= {} as Blueprint["components"];
const components = draft.components;
components.state ??= {};

    // Cycle State
    components.state.cycle = {
        value: 0,
        max: config.maxProgress.base, // Initial placeholder
        visible: true, // Should be visible by default for feedback
    };
    components.state.cycle_active = { value: 1, visible: false };

    // Temp variables for calculations (must exist for passives to work)
    components.state.vals = { value: 0, visible: false };

    // 2. Max Progress Scaling
    // Generates passives to drive state.cycle.max
    compileScalableValue(
        draft,
        config.maxProgress,
        "self.state.cycle.max",
        "cycle_max_scaler"
    );

    // 3. Power Sink & Demand Scaling
    components.powerSink ??= {
        baseDemand: { body: 0, mind: 0, social: 0 },
        maxDemand: { body: 0, mind: 0, social: 0 },
        throttle: 1,
        efficiency: 1,
        drawFraction: {},
        status: "nominal"
    };

    const accumulationParts: string[] = [];

    // For each configured attribute...
    for (const [attr, scaleConfig] of Object.entries(config.inputs)) {
        if (!scaleConfig) continue;

        // A. Generate Passive Effects for Demand
        // Target: self.powerSink.baseDemand.[attr]
        compileScalableValue(
            draft,
            scaleConfig,
            `self.powerSink.baseDemand.${attr}`,
            `demand_${attr}_scaler`
        );

        // B. Build Accumulation Expression Segment
        // Energy = Demand * DrawFraction * dt
        // Note: dt is applied once to the sum, so here we sum (Demand * Fraction)
        // self.powerSink.baseDemand.body * self.powerSink.drawFraction.body
        accumulationParts.push(
            `(self.powerSink.baseDemand.${attr} * self.powerSink.drawFraction.${attr})`
        );
    }

    // 4. Behavior Rule: Accumulate
    if (accumulationParts.length > 0) {
        const expression = `(${accumulationParts.join(" + ")}) * global.dt`;

        components.behavior ??= { rules: [] };
        components.behavior.rules.push({
            id: "sys_cycle_accumulate",
            sortKey: "sys_001", // High priority
            conditions: [
                {
                    id: "is_active",
                    sortKey: "0",
                    tokens: [{ t: "ref", v: "self.state.cycle_active" }]
                }
            ],
            actions: [
                {
                    type: "MUTATE",
                    target: "self.state.cycle.value",
                    op: "ADD",
                    value: expression // Passed as string for Eval
                }
            ]
        });
    }

};

4. UI Layer

4.1. Atom: ScalableValueInput

File: src/ui/devtools/editors/blueprint/mode/forms/atoms/ScalableValueInput.tsx (New)

Props:

interface ScalableValueInputProps {
label: string;
value: ScalableValue;
onChange: (val: ScalableValue) => void;
}

View:

A flex row.

NumberField for "Base" (Label: "Base").

NumberField for "Per Body" (Label: "+ / Body").

4.2. Form: CycleAbilityForm

File: src/ui/devtools/editors/blueprint/mode/forms/CycleAbilityForm.tsx (Update)

Logic:

Replaces previous flat inputs.

Renders ScalableValueInput for maxProgress.

Renders a section "Energy Inputs".

Toggles/Checkboxes for Body/Mind/Social.

If checked, renders ScalableValueInput for that attribute.

State Mapping:

Maps UI changes directly to \_editor.abilities.cycle structure.

5. Verification Plan

Test Case 1: Static Accumulator

Config: Max 100, Body Input (Base 10, PerBody 0).

Runtime:

powerSink.baseDemand.body should be 10.

Assume drawFraction.body is 1 (full power).

state.cycle should increase by 10 \* dt per tick.

Should take ~10 seconds to fill.

Test Case 2: Dynamic Scaling

Config: Max 100, Body Input (Base 0, PerBody 5).

Runtime:

Scenario A: 0 Assigned. Demand = 0. Accumulation = 0.

Scenario B: 2 Assigned. state.assignment.count = 2.

passiveEffects should update baseDemand.body to 10 (2 \* 5).

Accumulation should be 10 \* dt.

Test Case 3: Brownout

Config: Max 100, Body Input (Base 10).

Runtime:

Grid overloaded. drawFraction.body drops to 0.5.

Accumulation should be 5 \* dt (Half speed).

6. Implementation Order

Shared Schema: Create ScalableValueSchema.

Cycle Schema: Update CycleAbilitySchema.

Compiler Utility: Implement compileScalableValue.

Compiler Logic: Implement cycleCompiler with new accumulation logic.

UI: Implement ScalableValueInput and update CycleAbilityForm.
