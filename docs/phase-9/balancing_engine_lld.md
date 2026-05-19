Low-Level Design: Balancing Tools (Engine & Core Logic)

Status: Final
Context: Devtools / Economy Tuning
Scope: Core logic for Lever Discovery, Headless Simulation, and Physics Bypass.

1. Overview

This document details the implementation of the backend logic for the Balancing Control Plane. The core requirements are Introspection (finding tunable values), Simulation (running fast without rendering), and Physics Bypass (simulating transfers without travel time).

This layer is strictly decoupled from React. It operates purely on ModuleCartridge data and RuntimeCore.

2. Shared Logic Refactoring

2.1 Transfer Logic Service

Why: The "Real" game and the "Headless" simulation must obey identical economic rules (capacity checks, funds verification, clamping). Currently, this logic is buried inside TransferHandler.ts. We must extract it to a pure service to ensure the simulation is valid.

What: src/engine/balancing/transferLogic.ts

Responsibility: Pure function to validate a transfer request against entity state constraints without side effects.

Logic:

Validation: Ensure Source and Target entities exist.

Capacity Clamp:

Inspect Target's state and ledger.incoming.

Calculate headroom for each resource in payload.

Clamp payload amounts to min(amount, headroom).

Funds Check:

Inspect Source's state.

Verify source has >= clamped amount.

Result: Return success status and the final clampedPayload.

Interface:

import type { RuntimeEntity } from "../../runtime/types";

export interface TransactionRequest {
source: RuntimeEntity | undefined;
target: RuntimeEntity | undefined;
payload: Record<string, number>;
}

export interface TransactionResult {
success: boolean;
clampedPayload: Record<string, number>;
error?: string;
}

export const calculateTransaction = (req: TransactionRequest): TransactionResult => {
// Implementation of checks
};

2.2 Impact on Existing Code

File: src/engine/runtime/handlers/TransferHandler.ts

Change: Refactor TransferHandler to import and use calculateTransaction. It should no longer perform its own capacity/funds logic. It should rely on the result to proceed with debiting and spawning physics bodies.

3. Instant Transfer Handler (Physics Bypass)

Why: The ImpulseEngine is the primary performance bottleneck in the game loop. For economy balancing, travel time is noise. We need to execute transfers instantly to allow running 5000+ ticks in seconds.

What: src/engine/balancing/InstantTransferHandler.ts

Responsibility: A CommandHandler implementation that executes transfers atomically within a single tick, skipping physics spawning entirely.

Logic:

Intercept: Listens for RuntimeCommandType.TRANSFER_ASSETS.

Calculate: Calls transferLogic.calculateTransaction.

Debit Source: Directly mutates Source state (atomic subtraction).

Credit Target: Directly mutates Target state (atomic addition).

Bypass: Does not spawn entities, does not update ledger.incoming (transfer is instant, so no pending state exists).

Interface:

import type { CommandHandler, CommandHandlerContext } from "../../runtime/handlers/types";
import type { TransferAssetsCommand } from "../../runtime/types";
import { RuntimeCommandType } from "../../runtime/types";

export class InstantTransferHandler implements CommandHandler<TransferAssetsCommand> {
public readonly type = RuntimeCommandType.TRANSFER_ASSETS;

    public handle(command: TransferAssetsCommand, context: CommandHandlerContext): void {
        // 1. Calculate Transaction
        // 2. If success:
        //    - Debit Source State
        //    - Credit Target State
    }

}

4. The Scanner Service

Why: To provide a UI for tuning, we must programmatically index every scalar value ("Lever") in the cartridge.

What: src/engine/balancing/Scanner.ts

Responsibility: Traverses a ModuleCartridge and returns a flat list of LeverDefinition objects.

Logic:

Settings Scan: Recursive walk of assets.settings.

Path: assets.settings.[...key]

Type: setting

State Scan: Iterate blueprints. For each, walk components.state.

Filter: Only numeric value, min, max.

Path: blueprints.[id].components.state.[key].value

Type: state

Behavior Scan: Iterate blueprints. Iterate components.behavior.rules.

Target: Actions where type === "MUTATE" and value is a numeric literal.

Path: blueprints.[id].components.behavior.rules.[ruleIndex].actions.[actionIndex].value

Type: behavior

Metadata: Include ruleId and target (e.g. self.heat) for the Promotion naming logic.

Interface:

import type { ModuleCartridge } from "../../../data/schemas/module";

export type LeverType = "setting" | "state" | "behavior";

export interface LeverDefinition {
id: string; // Unique path string
type: LeverType;
label: string; // e.g. "Storage Wood Max" or "Refill Heat Amount"
path: string; // Dot-notation path for objectUtils.setByPath
value: number;
blueprintId?: string;
ruleId?: string; // Only for behavior levers
target?: string; // Only for behavior levers (e.g. "self.heat")
}

export class Scanner {
public scan(cartridge: ModuleCartridge): LeverDefinition[] {
// Traversal implementation
}
}

5. Headless Runner

Why: We need to execute the simulation faster than real-time (wall-clock decoupled) to verify stability over long durations.

What: src/engine/balancing/HeadlessRunner.ts

Responsibility: Instantiates a Runtime, injects the InstantTransferHandler, and executes a tight tick loop while capturing telemetry.

Logic:

Setup:

Create Runtime via createGameRuntime (using the patched cartridge provided by the UI layer).

Injection:

Manually overwrite the handler map in runtime.commandsManager to replace TRANSFER_ASSETS with InstantTransferHandler.

Loop:

Execute runtime.tick(16) in a loop up to config.ticks.

Yielding: Every 500 ticks, await new Promise(resolve => setTimeout(resolve, 0)) to allow the UI thread to breathe.

Telemetry:

Every N ticks (e.g., 60), snapshot hardcoded metrics:

sys_world.state.food

sys_world.state.heat

sys_world.state.population

sys_world.state.health

Detect Extinction: If population <= 0, abort early with status extinction.

Result: Return the timeseries history.

Interface:

import type { ModuleCartridge } from "../../../data/schemas/module";

export interface SimulationConfig {
ticks: number; // e.g. 5000
seed: string;
cartridge: ModuleCartridge;
}

export interface SimulationStep {
tick: number;
population: number;
food: number;
heat: number;
health: number;
}

export interface SimulationResult {
history: SimulationStep[];
status: "completed" | "extinction";
durationMs: number; // Wall clock time taken
}

export class HeadlessRunner {
public async run(config: SimulationConfig): Promise<SimulationResult> {
// 1. Create Runtime
// 2. Inject InstantHandler
// 3. Loop with setZeroTimeout yielding
// 4. Return results
}
}

6. Terminal Integration

Why: Developers need a quick, text-based way to verify lever detection and analyze cartridge complexity without opening the full dashboard.

What: src/ui/runtime/terminal/commands/balancingScanCommand.ts

Responsibility: Reads a cartridge from VFS, runs the Scanner, and outputs a statistical summary.

Logic:

Read: vfs.readFile(filename).

Scan: Instantiate Scanner and call .scan(cartridge).

Analyze: Group levers by type and count them.

Output: Return a formatted text summary.

Registration: Added to RUNTIME_COMMANDS registry.

Command Definition:

import { CommandDefinition } from "../../../../lib/terminal";
import { vfs } from "../../../../engine/vfs/FileSystem";
import { Scanner } from "../../../../engine/balancing/Scanner";

export const balancingScanCommand: CommandDefinition = {
name: "balancing.scan",
description: "Analyze a cartridge for tunable levers.",
usage: "balancing.scan <filename>",
execute: async (args) => {
const filename = args[0];
if (!filename) return { type: "error", content: "Filename required." };

        const cartridge = await vfs.readFile(filename);
        if (!cartridge) return { type: "error", content: "File not found." };

        const scanner = new Scanner();
        const levers = scanner.scan(cartridge);

        const stats = { setting: 0, state: 0, behavior: 0 };
        levers.forEach(l => { if (stats[l.type] !== undefined) stats[l.type]++ });

        return {
            type: "success",
            content: [
                `Scan Results for '${filename}':`,
                `- Global Settings: ${stats.setting}`,
                `- State Defaults: ${stats.state}`,
                `- Behavior Rules: ${stats.behavior}`,
                `Total Levers: ${levers.length}`
            ].join("\n")
        };
    },
    // Autocomplete: Use fileCache filter

};

7. Testing Strategy

Requirement: All logic in this layer must be verified with Unit Tests following testing-standards.md.

transferLogic.test.ts

Given: Source with 10 Wood, Target with Capacity 5.

When: Transfer 10.

Then: Result Payload is 5.

InstantTransferHandler.test.ts

Given: A runtime with Source and Target entities.

When: Execute Handler with valid transfer.

Then: Source state decreases, Target state increases immediately. No new entities in World.

Scanner.test.ts

Given: A cartridge with nested settings and behavior rules.

When: Scanned.

Then: Returns flattened Levers with correct Paths.

HeadlessRunner.test.ts

Given: A dummy cartridge with a resource drain loop.

When: Run 100 ticks.

Then: Returns history array length 100/N.

balancingScanCommand.test.ts

Given: Mocked VFS with a cartridge.

When: balancing.scan test.json is executed.

Then: Returns success output with lever counts.
