Low-Level Design: Purge System

1. Overview

Why

The game requires a punitive mechanic ("Purge") that activates when a specific threshold is reached, periodically killing bodies until the population is wiped out. We need an intuitive editor UI to configure the Purge parameters (min/max kill intervals, max progress threshold) with helpful tooltips. To respect the engine's strict separation of data and logic and maintain determinism, we handle execution natively within a system and expose tuning to the editor via schema descriptions.

What

We will implement the Purge execution as a first-class phase within CaveSystem. The progress itself will be a standard reactive state entry on the sys_world entity. The editor will expose GameConfigSchema via SchemaForm to automatically render input fields with SmartTooltip integration based on schema descriptions. CaveSystem handles the threshold checking, deterministic random interval calculation (using an abstracted PRNG utility), and issuing of KILL commands.

How

Config & Editor State: Extend the .cave configuration schema to include Purge tuning parameters (maxProgress, killIntervalSeconds). Decorate these fields with tooltip:... metadata so SchemaForm renders them with SmartTooltips. Update GameConfigEditor to use SchemaForm.

Deterministic Math: Extract the existing FNV-1a pseudo-random number generator from attributes.ts into a shared utility file for use by systems, and update attributes.ts to use this shared utility.

System Logic: Modify CaveSystem to evaluate Purge state during the system phase, using the PRNG utility for intervals and target selection, emitting KILL, UPDATE_CAVE, and UPDATE_STATE commands.

Command Handling: Extend the UPDATE_CAVE payload and handler to persist Purge timer mutations.

Testing: Write Unit tests for the PRNG, Integration tests for the system loop, and Rendering Smoke tests for the editor UI.

2. File-by-File Design

2.1 src/data/schemas/game/config.ts

Responsibility: Define the authoritative schema for Purge tuning parameters stored in project .cave files, and provide tooltip metadata for the UI.
Interface:

Define a PurgeConfigSchema object containing:

maxProgress: Numeric value defaulting to 100, decorated with .describe("tooltip:Amount of Purge Progress required to trigger a Purge").

killIntervalSeconds: An object with min and max numeric values, both decorated with .describe("tooltip:...") explaining their role in the kill interval.

Attach an optional purge field to the GameConfigSchema, defaulting to an empty object.

2.2 src/data/schemas/game/cave.ts

Responsibility: Define the runtime execution state schema for the Purge, attached to the CaveComponent.
Interface:

Define a PurgeStateSchema object containing:

isActive: Boolean flag (default: false).

nextKillTimer: Numeric countdown (default: 0).

Attach a purge field to the CaveComponentSchema, utilizing the default values.

2.3 src/data/schemas/v2/systemDefaults.ts

Responsibility: Bootstrap the sys_world entity with the necessary baseline state and components for the Purge.
Logic:

Inject a new entry into DEFAULT_WORLD_ENTITY.state: purge_progress with value: 0, max: 100, and visible: false.

Inject the default purge object into DEFAULT_WORLD_ENTITY.cave (isActive: false, nextKillTimer: 0).

2.4 src/ui/devtools/editors/config/GameConfigEditor.tsx

Responsibility: Provide a user-friendly form for editing game configuration parameters, fully supporting validation and tooltips.
Logic:

Replace the usage of SessionJsonEditor (raw JSON) with SchemaForm.

Pass GameConfigSchema as the schema prop, the provided filename, and "blueprint.settings.game_config" as the rootPath.

Note: Because SchemaForm relies on schemaFieldRenderers.tsx, fields decorated with tooltip:... will automatically wrap their inputs in SmartTooltip.

2.5 src/utils/pseudoRandom.ts

Responsibility: Provide a deterministic pseudo-random number generator (PRNG) utility for engine systems.
Logic:

Extract the FNV-1a hash variant from attributes.ts. It accepts a string seed and returns a float between 0 and 1.

Export this function as pseudoRandom for shared use across the engine.

2.6 src/game/systems/body/attributes.ts

Responsibility: Calculate derived body attributes and process weighted random selection.
Logic:

Remove the local, inline pseudoRandom implementation.

Import the newly abstracted pseudoRandom utility from src/utils/pseudoRandom.ts and use it for the pickWeightedAttribute function.

2.7 src/engine/runtime/types/runtimeCommandPayloadsUpdate.ts

Responsibility: Expand the UPDATE_CAVE command to accept mutations to the Purge execution state.
Interface:

Add an optional purge field to UpdateCaveCommandPayload interface. It must accept partial updates (isActive?: boolean, nextKillTimer?: number).

2.8 src/game/handlers/UpdateCaveHandler.ts

Responsibility: Apply UPDATE_CAVE commands to the ECS World during the apply phase.
Logic:

Validate the entity exists and has a cave component.

If the payload contains a purge object, perform a shallow merge of its values (isActive, nextKillTimer) into the entity's cave.purge state, falling back to default values if cave.purge is currently undefined.

2.9 src/game/systems/CaveSystem.ts

Responsibility: Read the stable snapshot to manage the Purge lifecycle, emitting commands to orchestrate state changes and entity destruction while strictly adhering to determinism.
Interface:

Constructor must accept GameConfig to read the tuning parameters (intervals and max progress).
Logic (Pseudocode):

Extract purge_progress state and cave.purge state from sys_world.

Enforce UI sync: If purge_progress.max does not equal config.purge.maxProgress, emit UPDATE_STATE to sync the max value.

If cave.purge.isActive is TRUE:

Calculate newTimer = currentTimer - dt.

If newTimer <= 0:

Query the snapshot for all entities with the body tag.

If bodies exist:

Construct a deterministic seed string using snapshot.seed + tick + "purge".

Obtain a random float r = pseudoRandom(seedString).

Select a random body index: Math.floor(r \* bodies.length).

Emit KILL command targeting the selected body's ID.

Obtain a second random float r2 = pseudoRandom(seedString + "\_timer").

Calculate a new random timer: min + (r2 \* (max - min)).

Emit UPDATE_CAVE command to set nextKillTimer to the new timer.

If no bodies exist:

Emit UPDATE_CAVE command setting isActive: false and nextKillTimer: 0.

If newTimer > 0:

Emit UPDATE_CAVE command setting nextKillTimer: newTimer.

If cave.purge.isActive is FALSE:

If purge_progress.value >= config.purge.maxProgress:

Construct a deterministic seed string using snapshot.seed + tick + "purge_init".

Obtain a random float r = pseudoRandom(seedString).

Calculate an initial random timer: min + (r \* (max - min)).

Emit UPDATE_CAVE command setting isActive: true and nextKillTimer: initialTimer.

Emit UPDATE_STATE command targeting sys_world, setting purge_progress value to 0.

3. Testing Strategy

Adhering to the testing-standards.md mandate, we require Unit Tests, Integration Tests, and View Tests formatted strictly with Given-When-Then (AAA).

3.1 Unit Tests (src/utils/pseudoRandom.test.ts)

Happy Path - Determinism:

Given: A specific string seed.

When: Evaluated multiple times.

Then: Assert it returns the exact same float value every time.

Happy Path - Distribution Bounds:

Given: Multiple distinct seeds.

When: Evaluated.

Then: Assert all returned values are >= 0 and < 1.

3.2 Integration Tests (src/game/systems/CaveSystem.test.ts)

Setup / Factories:

Create makeWorldWithPurgeState to initialize an isolated World with sys_world (overriding purge_progress and cave.purge) and a specified number of mock body entities.

Create makeTestGameConfig() returning a GameConfig with known purge.killIntervalSeconds (min: 5, max: 10) and maxProgress: 100.

Happy Path - Purge Activation:

Given: A world where purge_progress.value is 100, and purge.isActive is false.

When: CaveSystem ticks.

Then: Assert the emitted command buffer contains UPDATE_CAVE (setting isActive: true and a valid timer) and UPDATE_STATE (resetting purge_progress value to 0).

Happy Path - Purge Execution:

Given: A world with purge.isActive true, nextKillTimer at 0.1, a tick dt of 0.2, and 3 body entities.

When: CaveSystem ticks.

Then: Assert the emitted command buffer contains exactly one KILL command targeting one of the body IDs, and an UPDATE_CAVE command resetting the timer.

Happy Path - Purge Timer Decrement:

Given: A world with purge.isActive true, nextKillTimer at 5.0, a tick dt of 1.0.

When: CaveSystem ticks.

Then: Assert the emitted command buffer contains an UPDATE_CAVE command setting the timer to 4.0. Verify no KILL commands are emitted.

Edge Case - Purge Deactivation:

Given: A world with purge.isActive true, nextKillTimer at 0, and 0 body entities.

When: CaveSystem ticks.

Then: Assert the emitted command buffer contains an UPDATE_CAVE command setting isActive: false. Verify no KILL commands are emitted.

Edge Case - Determinism Verification:

Given: Two identical worlds initialized with the same specific seed and tick, purge.isActive true, nextKillTimer at 0, and 10 body entities.

When: CaveSystem ticks on both worlds independently.

Then: Assert the emitted KILL commands target the exact same body ID in both instances.

3.3 View / Smoke Tests (src/ui/devtools/editors/config/GameConfigEditor.test.tsx)

Smoke Test - Render & Tooltips:

Given: A mock SessionStore containing a loaded module cartridge.

When: GameConfigEditor is rendered.

Then: Assert the editor renders without crashing. Assert that the input fields for maxProgress, min, and max intervals exist. Simulate a hover over the field label and assert the corresponding SmartTooltip content appears matching the schema descriptions.
