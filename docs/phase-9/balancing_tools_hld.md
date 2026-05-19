High-Level Design: Balancing Tools (The Control Plane)

Status: Draft
Context: Devtools / Economy Tuning
Scope: Lever Discovery, Lever Management UI, Headless Simulation.

1. Overview & Problem Statement

The Problem

Balancing the "Survival Loop" is currently a manual, iterative process of "Guess $\rightarrow$ Play $\rightarrow$ Observe $\rightarrow$ Repeat."

Visibility: Key constants (Levers) are scattered across global settings, entity state defaults, and compiled behavior logic.

Velocity: Testing a "tiny margin" requires running the game in real-time, which is too slow for iterating on long-term stability (e.g., 1000+ ticks).

Brittleness: "Magic numbers" in behavior rules (e.g., MUTATE value: 5) are hard to find and harder to tune globally.

The Solution

Implement a Balancing Control Plane within the Devtools. This tool provides:

Lever Discovery: Automatically scans the ModuleCartridge to index all configurable values.

Centralized Management: A UI to group, tag, and modify these values without navigating JSON files.

Headless Simulation: A high-speed execution environment to run the game loop without rendering, generating timeseries telemetry to verify economic stability.

2. Architectural Concepts

2.1 The "Lever" Abstraction

A Lever is a unified interface for any scalar value that influences the simulation.

Lever Type

Source

Example

Mutability

Global Setting

assets.settings

vitality.foodPerPopSec

Direct write to settings object.

Capacity (State)

blueprint.components.state

storage.wood.max

Direct write to blueprint default state.

Flow (Behavior)

blueprint.behavior.rules

refill_greedy (value: 1)

Requires parsing/patching behavior tokens.

2.2 The Headless Runner

The Runner is a specialized instance of the Runtime that decouples Simulation Time from Wall Clock Time.

Stripped Dependencies: No Phaser, no EntityStateLink, no DOM interactions.

Warp Speed: Executes Runtime.tick(dt) in a tight loop on the main thread (chunked to prevent freezing).

Deterministic: Accepts a fixed Seed and ModuleCartridge.

Physics Bypass: See Section 3.5.

2.3 The "Promoter" Pattern (Refactoring)

To solve the "Magic Number" problem in behavior rules (Type 3 Levers), the system introduces Promotion:

Current: A rule hardcodes MUTATE target: 'self.heat' value: 5.

Action: "Promote to State".

Result:

Auto-generates a key name based on rule/target (e.g., conv_heat_amount).

Creates state.conv_heat_amount = 5.

Patches rule to MUTATE target: 'self.heat' value: 'self.state.conv_heat_amount'.

The Lever moves from Type 3 (Implicit) to Type 2 (Explicit/State), making it safely tunable.

3. Component Architecture

3.1 Data Flow

graph TD
Cartridge[Module Cartridge] -->|Scan| ScannerService
ScannerService -->|Extract| LeverStore[Lever Store (Zustand)]

    User -->|Tune| LeverStore
    LeverStore -->|Patch| SimCartridge[Simulation Cartridge]

    SimCartridge -->|Load| HeadlessRunner
    HeadlessRunner -->|Fast Tick| SimulationLoop

    SimulationLoop -->|Capture| TelemetryStore[Telemetry Store]
    TelemetryStore -->|Render| Charts[Balancing Dashboard]

3.2 The Scanner Service (src/ui/devtools/balancing/services/Scanner.ts)

Input: ModuleCartridge.

Process:

Settings Walk: Recursively flattening assets.settings.

Blueprint Walk: Iterating all blueprints.

Extracting state keys with numeric values.

Parsing behavior rules to find MUTATE actions with numeric literals.

Output: LeverDefinition[] (id, path, value, type, context).

3.3 The Lever Store (src/ui/devtools/balancing/state/useLeverStore.ts)

Responsibility: Manages the "Staged Changes" for balancing.

State:

levers: Index of all discovered levers.

overrides: Record of user-modified values (diffs).

pinned: Set of IDs for the active dashboard view.

Actions: setOverride, commitToCartridge, promoteLever.

3.4 The Headless Runner (src/ui/devtools/balancing/runner/HeadlessRunner.ts)

Responsibility: Executing the simulation.

Execution Strategy: Chunked execution on the main thread (using setTimeout or postMessage to yield) to prevent UI freezing while running 10,000 ticks.

Probes:

V1 Scope: Hardcoded monitoring of the Survival Loop:

global.population

sys_world.state.food

sys_world.state.heat

sys_world.state.health

3.5 Transfer Resolution Strategy (Physics Bypass)

Real-time transfers involve spawning a physical entity, simulating its travel via ImpulseEngine, and resolving it upon collision. This is the primary performance bottleneck for simulation.

Approach: Atomic Handler Substitution
We will bypass the physics engine entirely for transfers in the Headless Runner.

Refactor: Extract core validation logic (capacity checks, debit logic) from TransferHandler into transferLogic.ts.

New Handler: Create InstantTransferHandler.

Input: TransferAssetsCommand.

Process:

Validate Source/Target existence.

Check Capacity (clamp payload).

Check Source Funds.

Atomic Operation: Debit Source State -> Credit Target State immediately.

Skip ledger.incoming updates (as there is no transit time).

Injection: The Headless Runner instantiates the Runtime, then explicitly overwrites the handler for RuntimeCommandType.TRANSFER_ASSETS with InstantTransferHandler.

Trade-off: This removes "transit latency" from the economy. Buffers may fill slightly faster than in the real game. This is an acceptable margin of error for tuning flow rates.

4. Usage Workflow

Phase 1: Setup & Discovery

User opens Balancing tab.

System auto-scans the active module.

User searches for relevant levers (e.g., "food", "foraging").

User Pins key levers to the Workspace (e.g., foodPerPopSec, foraging.progress.max).

Phase 2: Simulation Baseline

User clicks "Run Baseline".

Headless Runner executes 5000 ticks (approx 8 minutes game time).

Under the hood: Uses InstantTransferHandler to skip physics.

Telemetry view (Custom SVG Line Chart) plots "Global Food/Heat vs Time".

User observes the crash point (e.g., Food hits 0 at tick 1200).

Phase 3: Tuning & Refactoring

User identifies a hardcoded value in a Behavior Rule acting as a bottleneck.

User clicks "Promote" to convert it to a State Variable.

Naming: Auto-generated as [rule_id]\_[target_key] (e.g., refill_wood_amount).

User adjusts the new State Variable (or a Global Setting) in the UI.

User clicks "Run Simulation".

Runner executes with the patched cartridge (in-memory only).

Telemetry confirms the fix (Food stabilizes).

Phase 4: Commit

User is satisfied with stability.

User clicks "Commit Changes".

Tool writes the modified values (and structure changes from Promotion) back to the actual ModuleCartridge via ModuleSession.

5. Technical Constraints & Standards

Isolation: The Headless Runner must strictly use RuntimeCore and avoid any ui/runtime/\*\* dependencies.

No Magic Strings: Lever IDs should be deterministic paths (e.g., blueprint:foraging:state:progress:max).

State Management: Use Zustand for the Lever Store. Do not mix with useSessionStore until the Commit phase.

Visualization: Lightweight SVG path implementation for charts. No heavy charting libraries.

6. Implementation Stages

Scaffolding: Create BalancingDashboard container and useLeverStore.

The Scanner: Implement the logic to traverse the Cartridge and populate the store.

Transfer Logic Refactor: Extract shared logic to transferLogic.ts and implement InstantTransferHandler.

The Runner: Implement the stripped-down loop using RuntimeCore with handler injection.

Visualization: Add SVG line charts for collected telemetry.

Mutation: Implement the "Patch" logic to apply overrides to a temporary Cartridge.
