Low Level Design: Job Card Resource Flow Visualization

1. Context & Objective

The current JobCard displays production status based on a single "main" progress bar. This is insufficient for entities like the "Hearth", which perform continuous resource conversion (e.g., Wood → Fire) rather than discrete batched yields.

We need to visualize:

Discrete Yields: Items transferred or spawned (e.g., "5 Wood to Storage").

Continuous Conversions: Internal state mutations expressed as rates (e.g., "+3 Fire, -1 Wood / sec").

Inherent Losses: Passive decay or consumption (e.g., "-0.1 Fire / sec").

2. Design Principles

Rule-Centric Analysis: Flows are derived by analyzing BehaviorRules.

Frequency Estimation: We must calculate how often a rule runs (Hz) to normalize values to "per second".

Conditional Rendering: Sections (Yields, Conversions, Losses) only appear if data exists.

3. Component Architecture

3.1. Analysis Logic (src/ui/runtime/world/selection/job-card/jobAnalysis.ts)

Responsibility:
Static analysis of an entity's behavior rules combined with runtime state (efficiency) to predict resource flows.

Logic:

Rate Calculation (calculateRuleFrequency)

Input: Rule, AllRules, LiveEfficiency.

Logic:

If conditions is empty: Frequency = 60 Hz (Simulation Tick Rate).

If conditions contains (Accumulator >= Threshold):

Find the "Pacing Rule" that drives Accumulator (e.g., ADD Accumulator global.dt).

Calculate FillRate = BaseRate \* Efficiency.

Frequency = FillRate / Threshold \* 60.

Output: executionsPerSecond (number).

Flow Extraction (analyzeRuleEffects)

Iterate through all Rule.actions.

Ignore "Pacing Actions" (mutations to \*progress variables).

Categorize remaining actions:

Yield: TRANSFER (external), SPAWN (external).

Conversion (Output): MUTATE ADD (internal state increase).

Conversion (Input/Loss): MUTATE SUB (internal state decrease).

Classification (analyzeJobStatus)

Iterate all Rules.

Calculate Frequency for the rule.

If Frequency <= 0, ignore.

Map actions to JobYield objects with normalized values (BaseAmount \* Frequency).

Bucketing Strategy:

Yields: Rules containing TRANSFER or SPAWN.

Display: Discrete amounts (not per second), or rates if high frequency.

Decision: Keep as discrete amounts for clarity if frequency < 1Hz. Use rates if >= 1Hz.

Conversions: Rules containing MUTATE ADD (and optionally SUB) but no external yields.

Display: Net rates (e.g., "+3 Fire / sec").

Losses: Rules containing only MUTATE SUB.

Display: Net rates (e.g., "-1 Fire / sec").

Interface:

export interface JobYield {
type: "transfer" | "spawn" | "mutate" | "loss";
label: string; // e.g. "+3 Fire / sec" or "5 Wood"
icon?: string; // e.g. "resource_fire"
color?: string; // Optional semantic color override
}

export interface JobAnalysisResult {
// The visual fill percentage 0-1 (for the main circular progress or bar)
progress: number;
// Estimated time until next trigger of the _main_ yield rule
ticksRemaining: number | null;

    // Categorized outputs
    yields: JobYield[];      // External (Transfer/Spawn)
    conversions: JobYield[]; // Internal Net Positive (Wood -> Fire)
    losses: JobYield[];      // Internal Net Negative (Decay)

}

export function analyzeJobStatus(
entity: RuntimeEntity,
liveEfficiency: number
): JobAnalysisResult;

3.2. View Controller (src/ui/runtime/world/selection/JobCard.tsx)

Responsibility:
Wiring the analysis result to the UI components.

Logic:

Subscribe to liveEfficiency (from PowerSink).

Call analyzeJobStatus inside a selector/memo.

Pass results to YieldDisplay.

3.3. Presenter (src/ui/runtime/world/selection/job-card/YieldDisplay.tsx)

Responsibility:
Rendering the lists of flows.

Logic:

Render Countdown if ticksRemaining is valid.

Render Yields section if yields.length > 0.

Render Conversions section if conversions.length > 0.

Render Losses section if losses.length > 0.

Interface:

interface YieldDisplayProps {
ticksRemaining: number | null;
yields: JobYield[];
conversions: JobYield[];
losses: JobYield[];
}

4. Implementation Plan

Refactor jobAnalysis.ts:

Implement generic calculateRuleFrequency.

Implement rule categorization (Yield vs Conversion vs Loss).

Implement string formatting for rates vs discrete amounts.

Update YieldDisplay.tsx:

Add sections for conversions.

Apply specific styling (Green for gains, Red/Dim for losses).

Verify JobCard.tsx:

Ensure props match the new interface.

5. Constraints Checklist

[x] No Ambiguity: Bucketing logic is explicit based on Action types.

[x] Display Rules: "If don't have X, don't show X".

[x] Architecture: Logic resides in jobAnalysis.ts (Engine/Lib layer logic), UI purely renders.
