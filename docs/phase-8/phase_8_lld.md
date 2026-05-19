Low-Level Design: Specialized Selection Feedback & Info Cards (Revised)

1. Why (Design Intent)

Transition the UI from raw JSON debugging to functional semantic "Lenses." This phase establishes a polymorphic HUD that interprets ECS state based on functional roles while providing visceral visual feedback in the simulation layer (Phaser) for the active focus of attention.

This design follows the Atomic UI Framework:

Atoms: Reuses existing ProgressBar, GameIcon, Button, and Card.

Molecules: Creates specialized functional cards (FaceCard, JobCard, etc.).

Organisms: Refactors SelectionOverlay into a polymorphic container.

2. What (Functional Specification)

2.1 The Simulation Halo (Phaser)

A visual pulsing indicator appearing behind the selected entity in the TransferScene.

Effect: A tweened circle texture that "spreads out" from the center like ripples.

Trigger: Synchronized with selectedEntityId from the WorldInteractionContext.

Constraint: Must handle cleanup correctly to prevent "tween stacking" when selection changes rapidly.

2.2 Polymorphic Info Cards (React - Molecules)

A specialized layout dispatcher in the SelectionOverlay that selects a "Lens" molecule based on entity components:

Face Lens: Detailed stats for elite bodies (XP, Attributes, Passport).

Swarm Lens: Aggregated stats for the labor horde (Total Attributes, Member count).

Attribute Pool Lens: Grid health diagnostics (Supply vs. Demand).

Job Node Lens: Production regulation (Throughput analysis and Throttling).

Resource Pool Lens: Stockpile analysis (Net Flow: Gain vs. Drain).

2.3 Throttling Interface (Molecule Interaction)

Job Nodes include a slider to control powerSink.throttle.

Interaction: Emits a debounced UPDATE_POWER_SINK command.

Effect: Reduces power demand and resulting efficiency/production rate.

UI Logic: Distinguishes between "Target Throttle" (user intent) and "Actual Efficiency" (system result).

3. How (Technical Implementation)

3.1 Simulation Layer: SelectionHalo Class

File: src/engine/phaser/scenes/SelectionHalo.ts (New)

Responsibility: Manage a single Graphics object and its associated tweens.

Methods:

rebind(targetBody): Kills active tweens, resets alpha to 0.6, scale to 0.5, and restarts the pulse at the target's position.

hide(): Kills tweens and sets visibility to false.

destroy(): Standard Phaser cleanup.

3.2 Command Layer: Update Power Sink

File: src/engine/runtime/handlers/UpdatePowerSinkHandler.ts (Already exists)

Use this existing handler to update the throttle property. Ensure the UI sends a complete PowerSink payload to maintain consistency.

3.3 Logic Service: Throughput Calculation

File: src/game/services/throughput/throughputCalc.ts (New)

Formula: Rate = (Amount _ Efficiency _ 1000) / (ThresholdValue).

Guard: If ThresholdValue <= 0, return 0 to prevent division by zero or infinite rates.

3.4 Selection Overlay Dispatcher (Organism)

File: src/ui/runtime/world/SelectionOverlay.tsx (Refactored)

Replace if/else with a LENS_MAP to adhere to the < 100-line per file rule.

Look up molecules by priority (e.g., face > powerSink > state).

4. Test Plan

4.1 Logic Tests (Throughput)

Happy Path: 10-wood transfer rule, 50% efficiency, 1s threshold -> 5 units/sec.

Edge Case: Efficiency = 0 -> 0 units/sec.

Boundary: Threshold = 0 -> 0 units/sec.

4.2 Integration Tests (Throttling)

Given: A world with a Job Node.

When: Sending UPDATE_POWER_SINK with throttle: 0.5.

Then: Verify the ECS entity component is updated. Verify the EnergyDistributionSystem calculates half-demand in the next tick.

4.3 View Tests (Dispatcher & Molecules)

Smoke: Renders nothing when selection is null.

Routing: Renders FaceCard when a face entity is selected.

Atoms: Verify molecules correctly pass state to ProgressBar and GameIcon atoms.

5. File Deltas

Path

Responsibility

src/engine/phaser/scenes/SelectionHalo.ts

Phaser visual feedback logic.

src/game/services/throughput/throughputCalc.ts

Mathematical rate analysis.

src/ui/runtime/world/selection/FaceCard.tsx

Specialized personnel molecule.

src/ui/runtime/world/selection/JobCard.tsx

Production control & throttle molecule.

src/ui/runtime/world/selection/SwarmCard.tsx

Aggregated horde molecule.

src/ui/runtime/world/selection/ResourceCard.tsx

Stockpile analysis molecule.
