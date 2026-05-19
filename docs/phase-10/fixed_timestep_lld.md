Low-Level Design: Fixed Timestep Loop

1. Context & Problem Statement

Current State:
The game loop currently uses a variable timestep. The tick(dt) method passes the frame's delta time (scaled by timeScale) directly to systems.

The Defect:
Systems (specifically BehaviorSystem) execute logic once per frame regardless of the dt size. When timeScale is lowered (e.g., 0.2), the engine runs many small ticks per second. Since behavior rules (e.g., "Transfer 1 Wood") often lack internal rate-limiting based on dt, they execute more frequently relative to simulation time than intended, leading to resource inflation.

The Solution:
Implement a Fixed Timestep Accumulator pattern. The Runtime will accumulate elapsed time and consume it in fixed chunks (LOGIC_STEP_MS, typically 20ms). This ensures that 1 second of simulation time always results in exactly 50 logic ticks, regardless of framerate or timescale.

2. Architecture Overview

We will decouple the Frame Rate (render loop) from the Simulation Rate (logic loop).

Accumulation: RuntimeCore accumulates dt \* timeScale every frame.

Consumption: runRuntimeTick consumes the accumulated time in LOGIC_STEP_MS increments.

Interpolation (Scope): Visual interpolation is handled by WorldRenderLink via direct DOM updates; however, for this specific LLD, we strictly address the simulation integrity. Visual smoothing is out of scope for this specific refactor (physics engine handles its own sub-stepping, this LLD synchronizes the high-level Runtime logic).

3. Component Design

3.1. src/engine/runtime/RuntimeCore.ts

Responsibility:
Manages the persistent state of the simulation time buffer (accumulator). It acts as the bridge between the external Ticker (variable time) and the internal runRuntimeTick (fixed time).

State Changes:

Add: private accumulator: number = 0;

Logic Flow (tick method):

Receive dt (ms) from the requestAnimationFrame loop.

Sanitize dt via normalizeDt.

Add safeDt \* this.timeScale to this.accumulator.

Call runRuntimeTick, passing this.accumulator.

Update this.accumulator with the returned value (the remaining time not yet consumed).

Interface:

class RuntimeCore {
// ... existing properties
private accumulator: number;

    // Updates the simulation by the given delta time (in ms)
    public tick(dt: number): void;

}

3.2. src/engine/runtime/runtimeTick.ts

Responsibility:
Executes the game loop phases (Apply, Snapshot, System, Collect, Advance) in discrete, deterministic steps. It ensures that systems see a constant dt of LOGIC_STEP_MS.

Logic Flow (runRuntimeTick function):

Guard: If state.status === "paused", return 0 (discard accumulated time to prevent "catch-up" bursts on unpause).

Loop: While accumulatedTime >= LOGIC_STEP_MS AND steps < MAX_RUNTIME_SUBSTEPS:
a. Decrement accumulatedTime by LOGIC_STEP_MS.
b. Execute Physics & Arrivals (fixed step).
c. Create Snapshot.
d. Execute Systems (Logic, Behavior, Automation) passing LOGIC_STEP_MS.
e. Collect and enqueue commands.
f. Advance tick counter.
g. Increment safety counter.

Safety: If max substeps reached, discard remaining time to prevent "spiral of death".

Return: The remaining accumulatedTime.

Interface:

export const runRuntimeTick = (
accumulatedTime: number,
state: RuntimeState,
createPhaseContext: () => PhaseContext,
setAutomationSnapshot: (snapshot: AutomationSnapshot) => void,
): number; // Returns remaining accumulated time

4. Implementation Details & Constraints

Constants

References src/engine/runtime/runtimeConstants.ts:

LOGIC_STEP_MS: 20 (50 ticks/sec).

MAX_RUNTIME_SUBSTEPS: 10 (Max 200ms processing per frame).

Migration Plan

Modify RuntimeCore to initialize accumulator.

Refactor runRuntimeTick signature and internals.

Update RuntimeCore.tick to use the new signature.

Architectural Compliance

No Side Effects: The accumulator is strictly internal to RuntimeCore.

Determinism: Fixed steps guarantee that replays (given same seed/inputs) produce identical results regardless of the machine's framerate.

Safety: The MAX_RUNTIME_SUBSTEPS guard prevents the browser from freezing if the tab is backgrounded for a long time.

5. Verification Strategy

5.1. Unit/Integration Tests

We will verify behavior using Runtime.test.ts or a new RuntimeTiming.test.ts.

Test Case 1: Low Timescale (Slow Motion)

Given: timeScale = 0.1, LOGIC_STEP_MS = 20.

When: tick(16) is called 10 times (total real time 160ms, sim time 16ms).

Then: accumulator increases. No logic tick occurs (16ms < 20ms).

When: tick(16) called 3 more times (total sim time ~20.8ms).

Then: 1 logic tick occurs. accumulator reduces by 20.

Test Case 2: High Timescale (Fast Forward)

Given: timeScale = 10.0, LOGIC_STEP_MS = 20.

When: tick(16) is called once (sim time 160ms).

Then: Logic loop runs exactly 8 times (160 / 20).

Then: Tick count increments by 8.

Test Case 3: Paused State

Given: status = "paused".

When: tick(100) is called.

Then: runRuntimeTick returns 0. accumulator does not grow. Tick count unchanged.
