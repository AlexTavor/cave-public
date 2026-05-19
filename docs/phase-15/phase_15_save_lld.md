Low-Level Design: Save/Load System & In-Game Menu (Phase 15)

1. Overview

1.1 The Why

The Cave Engine runtime is an instantiated reality driven by deterministic systems. To allow players to persist their progress and reload previous states, the engine requires a mechanism to serialize this reality (ECS, Physics, Time, and System state) to non-volatile storage and seamlessly hydrate it back into a fresh runtime context.

1.2 The What

Persistence Schema: A deterministic data structure representing a frozen moment of the Runtime.

Serialization/Hydration Engine: Pure logic to extract data from a running game and inject it into a new instance.

VFS Integration: Saving and loading these snapshots to the virtual file system under a dedicated directory.

Command Line Interface: Terminal commands (save, load) for programmatic control with optional arguments, contextual fallbacks, and autocomplete.

Graphical User Interface: An atomic, animated slide-down menu in the runtime shell for standard player interactions (CRUD operations on saves).

1.3 The How

We will implement a RuntimeSerializer to extract ECS entities, physics state, and automation snapshots. This payload will be routed through a SaveGameService interacting with the vfs. The Zustand useRuntimeStore will be expanded to orchestrate the "pause -> snapshot -> save" and "read -> reset -> hydrate -> play" lifecycles, ensuring the UI remains a pure observer of this state.

2. Architecture & File Specifications

2.1 Data Schema

File: src/engine/runtime/persistence/types.ts
Responsibility: Define the pure data structures for serialized saves.

Interface SerializedPhysicsBody:
x: number
y: number
velocity: { x: number, y: number }
acceleration: { x: number, y: number }

Interface SaveGameData:
metadata:
version: string
timestamp: number
label: string
seed: string
state:
tick: number
timeScale: number
entities: RuntimeEntity[]
physics: Map of string (EntityID) to SerializedPhysicsBody
systems:
automation: AutomationSnapshot

2.2 Serialization Logic

File: src/engine/runtime/persistence/RuntimeSerializer.ts
Responsibility: Pure functions to map between a living Runtime instance and SaveGameData. No side effects.

Class RuntimeSerializer
Function serialize(runtime: Runtime, label: string) -> SaveGameData: 1. Extract Runtime state (tick, seed). 2. Extract all entities from the ECS world (deep clone to prevent mutation). 3. Iterate all entities; if an entity has a physics body in ImpulseEngine, extract position, velocity, and acceleration. 4. Extract AutomationSnapshot from RuntimeSystemsRegistry. 5. Return compiled SaveGameData object.

2.3 File System Orchestration

File: src/game/services/SaveGameService.ts
Responsibility: Interface with vfs to read, write, list, and delete save files.

Object SaveGameService
Constant SAVE_DIR = "saves"

Function save(name: string, data: SaveGameData) -> Promise<void> - Stringify data and write to vfs at `SAVE_DIR/name.json`

Function load(name: string) -> Promise<SaveGameData | null> - Read from vfs at `SAVE_DIR/name.json` and parse

Function list() -> Promise<string[]> - Scan vfs for `SAVE_DIR/*.json` - Return mapped array of save names (without extension)

Function delete(name: string) -> Promise<void> - Delete file at `SAVE_DIR/name.json` from vfs

2.4 Runtime Hydration

File: src/engine/runtime/Runtime.ts (Modifications)
Responsibility: Allow an initialized, blank runtime to adopt a serialized state.

Method Runtime.hydrate(data: SaveGameData): void

1. Set this.state.tick to data.state.tick
2. Clear entityStore.
3. Iterate data.entities and call addEntity.
4. Iterate data.physics. Lookup body in impulseEngine. If found, rigidly set x, y, velocity, and acceleration.
5. Call systemsRegistry.setAutomationSnapshot(data.systems.automation)

2.5 State Management

File: src/ui/runtime/state/useRuntimeStore.ts (Modifications)
Responsibility: Handle the business logic of saving/loading so the UI remains completely dumb. Orchestrates fallback naming logic.

Extend RuntimeStoreState:
availableSaves: string[]
currentSaveName: string | null

Extend RuntimeStoreActions:
Function fetchSaves() -> Promise<void> - Updates availableSaves via SaveGameService.list()

Function saveGame(name?: string) -> Promise<void> - Let targetName = name OR currentSaveName - If targetName is null, throw Error("No save name provided and no current save exists") - If runtime is null, throw Error("Cannot save: No active runtime") - Call RuntimeSerializer.serialize on current runtime with targetName - Pass to SaveGameService.save - Update currentSaveName = targetName - Call fetchSaves()

Function loadGame(name?: string) -> Promise<void> - Let targetName = name OR currentSaveName - If targetName is null, throw Error("No save name provided and no current save exists") - Read data via SaveGameService.load(targetName) - If data is null, throw Error("Save file not found") - Retrieve current ModuleCartridge from the active runtime - Call loadCartridge(cartridge, data.metadata.seed) to reset world - Call newly created runtime.hydrate(data) - Update currentSaveName = targetName

Function deleteSave(name: string) -> Promise<void> - Call SaveGameService.delete(name) - Call fetchSaves() - If currentSaveName == name, set currentSaveName to null

2.6 Terminal Commands

File: src/ui/runtime/terminal/commands/gameSaveCommand.ts
File: src/ui/runtime/terminal/commands/gameLoadCommand.ts
Responsibility: Expose standard terminal commands to interact with the store. Must support autocomplete and optional arguments.

Command gameSaveCommand:
name: "save"
usage: "save [name]"
execute(args, context): - Let targetName = args[0] (can be undefined) - Try: - Await useRuntimeStore.getState().saveGame(targetName) - Return success log indicating the save name used - Catch (Error e): - Return error log (e.g., missing name, missing runtime)
autocomplete(args, context): - Let availableSaves = useRuntimeStore.getState().availableSaves - Filter availableSaves by args[0] prefix (if any) - Map filtered strings to Suggestion objects (type: "value") - Return suggestions

Command gameLoadCommand:
name: "load"
usage: "load [name]"
execute(args, context): - Let targetName = args[0] (can be undefined) - Try: - Await useRuntimeStore.getState().loadGame(targetName) - Return success log indicating the loaded save name - Catch (Error e): - Return error log (e.g., missing name, invalid save)
autocomplete(args, context): - Let availableSaves = useRuntimeStore.getState().availableSaves - Filter availableSaves by args[0] prefix (if any) - Map filtered strings to Suggestion objects (type: "value") - Return suggestions

(Must be registered in src/ui/runtime/terminal/runtimeRegistry.ts)

2.7 User Interface

File: src/ui/runtime/shell/SaveLoadMenu.tsx
Responsibility: A pure presentation component rendering the slide-down menu using Animatable.

Component SaveLoadMenu:
State:
isOpen (boolean)
filterText (string)

Hooks:
useRuntimeStore (availableSaves, currentSaveName, saveGame, loadGame, deleteSave)

Render: - Render a ToggleHandle button fixed at top-center. - onClick toggles isOpen. - Uses framer-motion to translate Y position based on menu state. - Render AnimatePresence - Render Animatable (type: "slideDown") conditionally based on isOpen. - Contains: - Input for new save name -> Button calls saveGame(name) - Button for Quick Save -> Calls saveGame() (disabled if currentSaveName is null) - Input for filterText - List of availableSaves (filtered) - Each row shows: Save Name, (indicator if it matches currentSaveName), Load Button, Delete Button.

3. Testing Strategy

Following the "Testing Standards — Canonical" rules, we must use human-readable AAA (Arrange, Act, Assert) structures and utilize factories. No ECS worlds will be fully mocked; instead, we will use a test cartridge.

3.1 Unit Tests (Logic & Utilities)

File: src/engine/runtime/persistence/RuntimeSerializer.test.ts

Happy Path: serializes and extracts exact physics velocities and automation state

Given: A makeTestRuntime() pre-populated with moving entities via makeMovingBodyEntity().

When: RuntimeSerializer.serialize() is called.

Then: The resulting JSON matches exact numerical velocities, ECS component counts, and tick records.

Edge Case: handles serialization of an empty runtime safely

File: src/game/services/SaveGameService.test.ts

Given: A mocked vfs instance.

When: SaveGameService.save and load are called.

Then: The correct paths (saves/\*.json) are utilized and serialized output is faithfully reconstructed.

3.2 Integration Tests (Systems & Runtime)

File: src/engine/runtime/Runtime.hydrate.test.ts

Integration: hydrates a fresh runtime to match a previously serialized state

Given: A serialized SaveGameData factory payload representing tick 500 with assigned workers. A fresh Runtime booted from a test ModuleCartridge.

When: runtime.hydrate(data) is called.

Then: runtime.getState().tick is exactly 500. runtime.getEntities() yields the exact components. runtime.getPhysicsBody() yields identical positions and velocities.

File: src/ui/runtime/state/useRuntimeStore.persistence.test.ts

Integration: saveGame requires a name or a pre-existing currentSaveName

Given: A fresh useRuntimeStore with no currentSaveName.

When: saveGame() is called without arguments.

Then: Promise rejects with an error about missing names.

Integration: saveGame falls back to currentSaveName if omitted

Given: useRuntimeStore with currentSaveName = "auto_1".

When: saveGame() is called without arguments.

Then: SaveGameService.save is called with "auto_1".

3.3 View Tests (UI Components & Stores)

File: src/ui/runtime/shell/SaveLoadMenu.test.tsx

Smoke Test: renders without crashing and toggles visibility

Interaction: calls loadGame store action when a specific save slot is clicked

Given: useRuntimeStore initialized with mock saves ["alpha", "beta"].

When: The user clicks the "Load" button on the "beta" row.

Then: The Zustand store's loadGame action is executed with the argument "beta".

4. Contract Adherence Checklist

[x] No implementation code: File specs use strictly pseudocode.

[x] UI Components render only: SaveLoadMenu.tsx has zero async fetching logic or business validations; it merely observes and dispatches to Zustand.

[x] Single Source of Truth: The ECS world and Runtime strictly define the save payload.

[x] Factories Over Boilerplate: Testing strategy mandates makeTestRuntime and makeMovingBodyEntity.

[x] Zero ambiguity: Identifies exact map structures, exact functions needed for hydration, and exact file paths for VFS. Fallback behaviors for omitted names are fully defined in the Store and Command logic.
