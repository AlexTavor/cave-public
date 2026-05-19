Low-Level Design: Dormancy & Rebirth Refactor

1. The Why (Motivation)

The current implementation of the dormancy reset uses a "soft reset" approach inside DormancyHandler. It attempts to manually delete entities and reset state keys while keeping the simulation running. This is fragile, error-prone, leaves ghost entities (especially in physics), and duplicates initialization logic already present in start.cvs.

To fix this, we must transition to a "Hard Reset" architecture. We will extract the meta-progression payload (sys_world.cave), completely destroy the runtime, use the standard start.cvs script to rebuild a pristine world, and then hydrate that new world with the extracted progression.

2. The What (Architecture)

The responsibilities of the lifecycle are being strictly separated:

DormancyHandler: Strictly responsible for finalization (flushing in-flight resources and calculating final Cave XP). It will no longer delete entities or wipe state.

GameRebirthCommand: A new orchestrator terminal command. It holds the "saved" cave object in memory across the destruction of the old runtime and the creation of the new one.

AwakenCaveHandler: Strictly responsible for hydration (injecting the saved cave component into the new sys_world). It will no longer hardcode the spawning of workers or swarms.

3. The How (Implementation Details)

3.1. src/game/handlers/DormancyHandler.ts

Responsibility: Finalize the current run by ensuring all pending XP and resources are committed to the sys_world entity before extraction.

Interface: Implements CommandHandler<RuntimeCommand>. Handles RuntimeCommandType.GAME_DORMANCY.

Logic:

Verify the command type.

Invoke flushPendingTransfers(context) to resolve in-flight payloads.

Query context.world for the sys_world entity. If missing, log an error and return.

Invoke flushCaveXp(worldEntity) to calculate and append the final accumulated XP.

Remove all existing logic related to deleting entities (context.world.remove, impulseEngine.removeBody).

Remove all existing logic related to modifying or resetting the state component (e.g., state.dormant, state.year).

Log the finalization via context.telemetry.log.

3.2. src/game/handlers/AwakenCaveHandler.ts

Responsibility: Inject the preserved meta-progression data (CaveComponent) into the newly constructed sys_world.

Interface: Implements CommandHandler<RuntimeCommand>. Handles RuntimeCommandType.AWAKEN_CAVE.

Logic:

Verify the command type.

Query context.world for the sys_world entity. If missing, log an error and return.

Apply command.payload.attributes and command.payload.progression directly to worldEntity.cave.

Remove all existing logic related to conditionally calling spawnFromBlueprint for sys_swarm and char_worker.

Log the awakening via context.telemetry.log.

3.3. src/ui/runtime/terminal/commands/gameRebirthCommand.ts (New File)

Responsibility: Orchestrate the Rebirth flow across multiple phases: Finalize, Extract, Wipe, Rebuild, and Hydrate.

Interface: Exports gameRebirthCommand of type CommandDefinition.

Name: game.rebirth

Usage: game.rebirth [scriptPath]

Logic:

Validate: Extract the optional scriptPath argument (defaulting to example/scripts/start.cvs). Fetch the runtime from context.runtime.getRuntime().

Finalize: Enqueue a GAME_DORMANCY command. Immediately call runtime.tick(0) to force synchronous processing of the flush handlers.

Extract (Save): Retrieve the sys_world entity. Deep clone the sys_world.cave component into a local variable (savedCaveState). If it doesn't exist, log an error and abort.

Wipe: Invoke context.runtime.reset?.(). This clears the ECS world and physics engine completely.

Rebuild: Asynchronously invoke the execution of the init script using the terminal registry: await context.registry.execute("run " + scriptPath, context).

Hydrate: Enqueue an AWAKEN_CAVE command, passing the savedCaveState as the payload. Call runtime.tick(0) one final time to synchronously apply the hydration to the new world before yielding control back to the UI.

Return a success CommandResult.

3.4. src/ui/runtime/terminal/runtimeConstants.ts

Responsibility: Provide Zod validation for the new command arguments.

Logic:

Export a new gameRebirthSchema defined as z.array(z.string()) (to accept the optional script path).

3.5. src/ui/runtime/terminal/runtimeRegistry.ts

Responsibility: Register the new command in the terminal dependency injection container.

Logic:

Import gameRebirthCommand.

Add gameRebirthCommand to the RUNTIME_COMMANDS array.

4. Testing Strategy & Contract Adherence

Adherence Check:

Determinism: The orchestration forces a synchronous tick(0) immediately after enqueuing critical lifecycle commands. This prevents race conditions where the standard game loop might interfere with the extraction or hydration phases.

Single Source of Truth: The ECS remains the sole owner of state; the orchestrator merely shuttles a snapshot of the data from the dying world to the newborn one.

Testing:

Unit Tests (DormancyHandler / AwakenCaveHandler): Assert that DormancyHandler mutates XP but does not invoke world.remove. Assert that AwakenCaveHandler applies the payload but does not invoke any spawns.

Integration Scenario:

Given a running world with 50 XP accumulated.

When game.rebirth is executed.

Then the runtime is wiped, the initialization script runs, and the resulting sys_world entity possesses the baseline stats from start.cvs PLUS the 50 XP injected by the hydration step. No duplicate entities should exist.
