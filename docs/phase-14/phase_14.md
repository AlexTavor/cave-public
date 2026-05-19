Cave Engine Architecture V2: Composable Modules

This document defines the transition from monolithic JSON cartridges to a composable, AI-friendly module system. The goal of this architecture is to drastically reduce cognitive load, eliminate merge conflicts, and optimize for AI-assisted content generation by breaking game data into focused, discrete fragments.

1. The Core Paradigm: Manifests & Fragments

Instead of a single game.json containing the entire state of the game (assets, blueprints, draft pools), games are now defined by a Project Manifest that links together multiple Fragment Files.

The Project Manifest (.project or manifest.json)

The entry point of a game. It contains metadata, load order, and dependencies. It does not contain game content.

{
"id": "cave_loop_v3",
"name": "Cave Loop V3",
"version": "3.1.0",
"dependencies": [
"core_mechanics"
],
"modules": [
"./core/*.sys",
"./content/biomes/forest.blueprint",
"./content/industry/quarry.blueprint",
"./ui/main.assets"
]
}

Fragment Files (Semantic Extensions)

Rather than generic .json files, fragments use semantic extensions. This allows the Linker, Linter, and the IDE to immediately know the expected schema and routing without parsing the contents.

.blueprint - Defines entity templates and their components.

.assets - Contains icon mappings, styles, and resource visuals.

.draft - Defines draft pools and reward options.

.sys - Core game configurations, vitality settings, and impulse definitions.

An AI can generate or edit quarry.blueprint in complete isolation without needing the context of the entire game.

2. The Linker & Source Maps

Because the runtime still expects a cohesive ModuleCartridge object, the Engine introduces a Linker step during initialization.

The Linker pipeline works as follows:

Discover: Read the manifest and locate all fragment files.

Namespace: Assign scopes to incoming data to prevent collisions.

Merge: Combine fragments into a single in-memory RuntimeCartridge.

Map: Generate a rigorous Source Map.

The Source Map (Crucial for IDE / Saving)

Because fragments are merged at runtime, editing an entity in the UI requires the engine to know exactly which file it came from. The Source Map is a reverse-lookup table that maps Runtime Entity ID -> Source Fragment Filepath. When the user (or AI) hits "Save" on a specific component, the DevTools use the Source Map to write the mutation back to the correct isolated fragment, leaving the rest of the project untouched.

3. Namespacing & Dependencies (Option A)

To support composability and easy refactoring without strict collision errors, IDs use an implicit namespacing strategy based on their source file or module declaration.

Format: [namespace]::[entity_id]

Example: forest::logging_camp, industry::stone_quarry.

Resolution: If a script or behavior references logging_camp from within the forest.blueprint file, the Linker implicitly resolves it to forest::logging_camp. If it needs to reference an external entity, it must use the fully qualified industry::stone_quarry ID.

Modules explicitly declare external dependencies in their manifest/header. If industry.blueprint requires core_mechanics, the Linker ensures core_mechanics is loaded first, establishing a clear hierarchy for conflict resolution (e.g., if two modules modify the same global variable, the one loaded later wins).

4. Static Analysis (The Linter)

With data spread across multiple files, broken references become a standard development hazard. Cave Engine V2 introduces a Static Linter that runs independently of the game runtime loop.

The Linter is responsible for:

Dangling References: Detecting when a behavior in forest.blueprint references an ID that does not exist in any currently loaded module or declared dependency.

Type Checking: Validating that connected components match (e.g., ensuring a powerSink is connecting to a valid powerSource).

UI Feedback: Surfacing these broken links in an "Issues Panel" within the DevTools, allowing the user to resolve them before even pressing "Play".

5. Partial Hot-Reloading

In a monolithic architecture, any change requires a full world reset. In V2, the runtime is aware of the Source Map and Dependency Tree.

When a fragment file (e.g., dialogue.draft) is saved:

The IDE notifies the runtime of the specific file change.

The Linker diffs the incoming fragment against its previous state.

Granular Update: The runtime injects the updated data directly into the active ECS (Entity Component System) without pausing the tick loop or resetting unrelated systems (like Physics or Pathfinding).

If a core structural file changes (e.g., altering a .sys config), the runtime gracefully triggers a targeted subsystem restart.

6. IDE State Lifecycle: The close Command

To properly manage this complex multi-file environment, the IDE includes a strict lifecycle management command: close.

Acting as the exact inverse of open, close performs a safe teardown of the current workspace:

Dirty Guard: Checks the Source Map for any unsaved changes across all loaded fragments, prompting the user to save or discard.

Memory Clear: Halts the runtime tick loop, flushes the ECS world, and drops the compiled RuntimeCartridge from memory.

UI Reset: Closes all active tabs (Blueprints, Assets, Logic editors) and returns the DevTools to the Empty Home state, ready for a new project manifest to be loaded.

7. DevTools UI & Workspace Management

Transitioning to a file-system-based architecture requires replacing the monolithic "Explorer" and generic editors with a comprehensive IDE toolset routed by semantic file types.

Workspace Tree (File Explorer): A VSCode-style sidebar visualizing the .project manifest and its folder structure.

Supports multi-select and drag-and-drop for moving files between folders.

Moving or renaming files automatically triggers refactors to update the .project manifest and resolve any internal references/namespaces affected by the move.

Context menus for full CRUD operations (Create, Rename, Move, Delete) on all fragment types.

Editor Per File Type: The generic multi-purpose Explorer is removed in favor of dedicated editors:

.draft & .assets Editors: These existing editors are highly functional and will be retained. They simply need their routing updated to handle isolated fragments.

.blueprint Editor (Greenfield): The old generic schema-form editor is discarded. Rebuilt greenfield, this editor focuses purely on data structure and HLL abilities without complex WYSIWYG previews (spatial positioning tools remain a separate concern).

.sys Editor (Greenfield): Rebuilt greenfield to cleanly handle global configurations (vitality, physics tuning, game config) without the legacy cruft of treating the world as a pseudo-blueprint.

Module Composer: A visual UI for editing the .project manifest. Allows users to easily add dependencies, adjust load order, and resolve structural conflicts.

8. Data Schema Evolution: Separating Form and Function

The legacy schema tangled spatial positioning, collision boundaries, and visual rendering across the display and physics components. This caused confusion (e.g., defining radius twice) and restricted flexibility.

V2 reorganizes these components into distinct domains:

spatial (The Absolute Truth)

Owns position and scale. Used by physics, rendering, and logic systems.

"spatial": {
"x": 500,
"y": 500,
"radius": 40
}

render (The Visual Layer)

Replaces display. Owns aesthetics, reactive sizing, and UI elements.

"render": {
"label": "Wood Pile",
"icon": "resource_wood",
"style": "storage_style",
"reactiveScale": {
"min": 12,
"max": 60,
"valueRef": "self.state.wood.value",
"maxRef": "self.state.wood.max"
},
"bars": [...]
}

physics (The Behavioral Layer)

Owns mass, movement logic, and steering forces. Does not own coordinates or size.

"physics": {
"mass": 100,
"drag": 0.1,
"isStatic": true,
"anchors": [...]
}

This strict separation ensures that purely visual entities don't need a physics component, and invisible physics triggers don't need a render component, cleaning up the authoring experience significantly.
