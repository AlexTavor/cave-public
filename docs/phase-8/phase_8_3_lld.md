Low-Level Design: Job Node Production Dashboard

1. Overview

This document defines the implementation plan for transforming the Job Node selection card into a high-fidelity "Production Dashboard." The goal is to move away from abstract "per second" rates and visualize the specific mechanics of accumulation, thresholds, and cycle yields.

2. Architecture & Responsibilities

The implementation follows the UI observes, never cheats law. All logic for predicting yields and calculating time-to-release resides in the UI layer, performing static analysis on the Entity's Blueprint/State, without modifying the simulation.

Feature Structure

We will colocate the new logic and components under src/ui/runtime/world/selection/job-card/.

3. Detailed File Specifications

3.1. Analysis Logic

File: src/ui/runtime/world/selection/job-card/jobAnalysis.ts

Responsibility:
Pure functions to introspect an Entity's behavior.rules and state to derive invisible gameplay information (yields, countdowns).

Interfaces:

export interface JobYield {
type: "transfer" | "spawn" | "mutate";
label: string; // e.g., "5 Wood", "1 Worker"
icon?: string; // Resolved icon key if applicable
}

export interface JobAnalysisResult {
ticksRemaining: number | null; // Null if idle or broken
predictedYields: JobYield[];
}

Logic (analyzeJobStatus):
Signature: (entity: RuntimeEntity, liveEfficiency: number) => JobAnalysisResult

Identify Progress Bar: Find the primary progress bar config from entity.display.bars (usually mapped to state.progress).

Find Discharge Rule: Scan entity.behavior.rules for a rule where:

Condition checks the progress state key (e.g., self.state.progress.value).

Operator is >=.

Value matches the bar's max (or dynamic max ref).

Parse Yields: If a discharge rule is found, map its actions:

TRANSFER: Create yield { type: "transfer", label: "{amount} {resource}", icon: "resource\_{resource}" }.

SPAWN: Create yield { type: "spawn", label: "1 {blueprintId}", icon: "{blueprintId}" }.

MUTATE: Ignore "reset" mutations (setting progress to 0). Capture others as internal state changes if relevant (e.g. XP gain).

Find Accumulation Rate: Scan entity.behavior.rules for a rule that MUTATEs the progress key with ADD.

Extract the value. If it is a number, Rate = number. If it is global.dt, Rate = 16 (assuming standard 16ms tick for normalization) or treat as 1 unit per tick depending on simulation convention. Decision: Treat global.dt as 16ms progress per tick.

Calculate Countdown:

EffectiveRate = BaseRate \* liveEfficiency

If EffectiveRate <= 0, ticksRemaining = null.

Else, ticksRemaining = (Threshold - Current) / EffectiveRate.

3.2. Power Matrix Component

File: src/ui/runtime/world/selection/job-card/PowerMatrix.tsx

Responsibility:
Visualizes the supply vs. demand for Body, Mind, and Social power attributes using a matrix of fill bars.

Props:

interface PowerMatrixProps {
demand: { body?: number; mind?: number; social?: number }; // From powerSink.baseDemand
efficiency: number; // 0-1 live value
}

Logic:

Iterate through attributes ['body', 'mind', 'social'].

For each attribute with demand > 0:

Max = demand

Current = demand \* efficiency (Reverse derived, assuming uniform efficiency).

Render a row with an Icon, Label, and a specialized ProgressBar (or simple div width) showing the supply saturation.

3.3. Reservoir List Component

File: src/ui/runtime/world/selection/job-card/ReservoirList.tsx

Responsibility:
Renders high-fidelity progress bars for internal storage/buffers defined in display.bars. Unlike the world nodes, these show exact numbers.

Props:

interface ReservoirListProps {
entity: RuntimeEntity;
runtime: Runtime | null;
}

Logic:

Map over entity.display.bars.

For each bar configuration:

Use useEntitySelector to subscribe to the live value (via bar.key).

Use useEntitySelector to subscribe to the live max (via bar.maxKey or static bar.max).

If max is missing or 0, treat as simple readout or 100%.

Render a ProgressBar component:

showText={true} to display "Current / Max".

Use bar.color.

3.4. Yield Display Component

File: src/ui/runtime/world/selection/job-card/YieldDisplay.tsx

Responsibility:
Displays the calculated countdown timer and the list of predicted outputs.

Props:

interface YieldDisplayProps {
ticksRemaining: number | null; // In game ticks
yields: JobYield[];
}

Logic:

Time Formatting:

Convert ticksRemaining to seconds: seconds = ticks \* (16 / 1000) (assuming 16ms/tick baseline).

Format as MM:SS.

If null or Infinity, display "--:--".

Yield Rendering:

Map yields to a flex row of icons + labels.

Use GameIcon for visual feedback.

3.5. Main Card Integration

File: src/ui/runtime/world/selection/JobCard.tsx

Responsibility:
Orchestrates the new dashboard layout, replacing the old generic card.

Updates:

Import the new sub-components.

Retain usePowerSinkThrottle for the slider control (interactive element).

Call analyzeJobStatus inside the render loop (it is fast enough for per-frame, or wrap in useMemo dependent on entity structure + efficiency).

Render Layout:

<Card>
  <Header />
  <PowerMatrix ... />
  <YieldDisplay ... />
  <ReservoirList ... />
  <ThrottleSlider ... />
</Card>

3.6. Styles

File: src/ui/runtime/world/selection/SelectionCard.styles.ts

Updates:
Add styled components to support the dashboard grid layout.

MatrixContainer: CSS Grid for the power bars.

YieldContainer: Flexbox for the output icons.

CountdownText: Large, monospaced font for the timer.

4. Testing Strategy

4.1. Unit Tests (jobAnalysis.test.ts)

Case 1: Entity with standard accumulation (ADD 16) and discharge (>= 1000). Verify ticksRemaining calculation matches formula.

Case 2: Entity with no discharge rule (infinite accumulation). Verify predictedYields is empty.

Case 3: Zero efficiency. Verify ticksRemaining is null/infinity.

Case 4: Complex yields (Transfer + Spawn). Verify yield parsing.

4.2. View Tests

JobCard Integration: Smoke test rendering with a mock Runtime/Entity. Ensure no crashes when display.bars is empty or malformed.

PowerMatrix: Verify bars render with correct widths based on efficiency prop.

5. Implementation Steps

Create jobAnalysis.ts and write logic/tests.

Update SelectionCard.styles.ts.

Create PowerMatrix.tsx, ReservoirList.tsx, YieldDisplay.tsx.

Refactor `JobCard.tsx
