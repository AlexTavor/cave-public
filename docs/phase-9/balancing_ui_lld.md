Low-Level Design: Balancing Tools (UI)

Status: Final
Context: Devtools / Economy Tuning
Scope: UI components, State Management (Zustand), and Runner Integration.

1. Overview

The UI layer provides the "Control Plane" for balancing. It allows users to discover levers, stage changes (overrides), promote magic numbers to state, and visualize the impact of those changes via the Headless Runner.

It adheres to the UI Architecture Laws:

Zustand for mutable app state.

Components render only; logic lives in hooks/stores.

Presentation layers never mutate simulation state directly (they act on a draft).

2. Lever Store

Why: We need a sandbox for "Staged Changes" that doesn't affect the actual game file until the user explicitly commits.

What: src/ui/devtools/balancing/state/useLeverStore.ts

State:

levers: LeverDefinition[] (Populated by Scanner).

overrides: Record<string, number> (Map of Lever ID -> New Value).

promotions: Record<string, string> (Map of Behavior Lever ID -> New State Key Name).

simulationResult: SimulationResult | null.

isRunning: boolean.

Actions:

scan(cartridge): Invokes Scanner.scan and updates levers.

setOverride(id, value): Updates overrides.

promoteLever(id):

Generates name: [ruleId]\_[target_key] (e.g. refill_wood_amount).

Adds entry to promotions map.

setSimulationResult(result): Updates telemetry.

commit(filename):

Reads current overrides/promotions.

Applies them to the actual ModuleSession (via useSessionStore).

Clears overrides.

3. Cartridge Patcher (Pure Utility)

Why: Modifying the cartridge structure (Promotion) and values (Overrides) is complex logic that must be unit testable outside of React.

What: src/ui/devtools/balancing/utils/cartridgePatcher.ts

Responsibility: Pure function to apply staged changes to a cartridge.

Interface:

import type { ModuleCartridge } from "../../../../../data/schemas/module";

export const patchCartridge = (
original: ModuleCartridge,
overrides: Record<string, number>,
promotions: Record<string, string>,
levers: LeverDefinition[]
): ModuleCartridge => {
// 1. Clone original
// 2. Apply Promotions (Create State Keys, Update Rule Paths)
// 3. Apply Overrides (Set Values at Paths)
// 4. Return Patched Cartridge
};

4. Runner Hook (The Bridge)

Why: Orchestrates the patching and execution.

What: src/ui/devtools/balancing/hooks/useBalancingRunner.ts

Logic:

Preparation:

Get current ModuleCartridge from useModuleStore.

Get overrides/promotions from useLeverStore.

Call patchCartridge to get the simulation-ready cartridge.

Execute:

Instantiate HeadlessRunner.

Call runner.run({ ticks: 5000, seed: "balance_test", cartridge: patched }).

Update:

On completion, dispatch setSimulationResult.

5. Balancing Dashboard (Container)

Why: The main entry point. Orchestrates the layout and initial scanning.

What: src/ui/devtools/balancing/BalancingDashboard.tsx

Logic:

Mount: Check if activeModuleFilename exists. If levers is empty, trigger scan.

Layout: Two-column grid.

Left: LeverList (Controls).

Right: SimulationChart (Feedback).

Actions: "Run Simulation" button triggers useBalancingRunner. "Commit" button triggers store action.

6. Lever List & Components

What: src/ui/devtools/balancing/LeverList.tsx

Logic:

Filtering: Text input to filter levers by label/path.

Grouping: Accordions for Settings, Global State, and Entities.

Row Rendering:

Label + Current Value (Input).

If type === behavior: Show "Promote" button.

Clicking Promote calls promoteLever immediately (auto-naming).

7. Simulation Chart

Why: Visualizing the crash point.

What: src/ui/devtools/balancing/SimulationChart.tsx

Implementation:

Technology: Custom SVG. No external library.

Scaling:

Find min/max of population, food, heat.

Normalize X (Time) and Y (Value) to SVG viewbox 0 0 100 100.

Rendering:

Render <polyline> for each metric.

Colors: Green (Food), Orange (Heat), Blue (Pop).

Interaction:

Hovering the SVG draws a vertical line at Cursor X.

Display values for that tick in a legend/tooltip overlay.

8. Testing Strategy

Requirement: UI Logic must be verified with Unit Tests following testing-standards.md.

cartridgePatcher.test.ts (Critical Path)

Given: A cartridge and a Promotion request (Rule Value -> State Key).

When: Patch is applied.

Then:

New state key exists in Blueprint components.

Behavior rule now references self.state.[newKey].

Original magic number is preserved in the new state value.

useLeverStore.test.ts

Given: A populated store.

When: setOverride is called.

Then: Override is recorded.

SimulationChart.test.ts

Given: A mock result history.

When: Rendered.

Then: SVGs polylines are present.
