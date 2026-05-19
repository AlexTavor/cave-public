This document defines the implementation steps for transitioning the Cave Engine from a monolithic JSON architecture to a composable, file-system-based IDE architecture.

Core Philosophy:

Compiler Pattern: The Linker acts as a compiler.

Source (HLL): Fragment files (.blueprint, .assets) with relative IDs and developer-friendly schemas.

Target (LLL): The in-memory RuntimeCartridge with Fully Qualified (FQ) IDs (namespace::id) and normalized V2 component schemas.

Runtime Agnosticism: The Runtime engine (tick loop, ECS) remains unaware of modules or file paths. It operates strictly on the compiled LLL data.

Strict Namespacing: File Path = Namespace. The file content/forest.blueprint owns the namespace content/forest.

Terminal First: All file operations, project management, and validation must be exposed and verified via the CLI before any GUI is built.

Step 0: VFS & Infrastructure

Goal: Enable robust, batch-capable file operations required by the IDE.

0.1 Plugin Extensions (vite-plugin-game-editor.ts)

POST /\_\_editor/batch: Transactional endpoint for multiple file operations (writes, deletes, moves).

DELETE /\_\_editor/delete: Accepts { paths: string[] }. Supports folders (recursive delete).

POST /\_\_editor/move: Accepts { items: { from: string, to: string }[] }. Supports renaming folders.

GET /\_\_editor/scan: Returns a recursive file list matching a glob pattern.

0.2 VFS Layer (FileSystem.ts)

deletePaths(paths: string[]): Promise<void>

movePaths(items: { from: string; to: string }[]): Promise<void>

scan(glob: string): Promise<string[]>

tree(root: string): Promise<TreeNode> (Structural representation for UI/CLI).

0.3 Terminal Verification

fs.tree [path]: Displays a visual tree structure of the directory (like standard unix tree).

fs.scan <glob>: Lists flat files matching a pattern.

fs.delete <path...>: Deletes multiple files or folders.

fs.move <from> <to>: Moves/renames a file or folder.

Step 1: V2 Data Schemas (The Contract)

Goal: Define the target structure for the Compiler/Linker.

1.1 Component Schemas (src/data/schemas/v2/\*.ts)

SpatialComponent: x, y, radius. The single source of truth for position and size.

RenderComponent: label, icon, style, reactiveScale (visuals).

PhysicsComponent: mass, drag, isStatic, anchors (simulation behavior).

SysConfigSchema: Schema for .sys files. Must include:

impulse (System-wide physics: global drag, time steps, spatial hashing).

vitality (Metabolism settings).

game_config (General rules).

Step 2: The Linker (Loader & Compiler)

Goal: Transform disk fragments into a runnable Runtime Cartridge.

2.1 The Namespace Strategy

Relative ID: "orc" (inside forest.blueprint).

FQ ID: "content/forest::orc" (in Runtime).

Resolution Rule:

If ID has ::, it is treated as absolute.

If ID has no ::, it is prefixed with the current file's namespace.

2.2 The ModuleLinker Class

loadProject(manifestPath: string): Promise<RuntimeCartridge>

Parse Manifest: Read .project to get module list and load order.

Load Fragments: Parallel fetch of all .blueprint, .assets, .sys files.

Compile & Merge:

Iterate every entity in every file.

Namespace Expansion: Convert id and internal refs (spawn, transformTo) to FQ IDs.

Schema Migration (V1 -> V2):

Map display.radius -> spatial.radius.

Map physics.x/y -> spatial.x/y.

Map display.icon -> render.icon.

Config Merge: Aggregates all .sys files into the global config object (last one wins logic).

2.3 Terminal Verification

project.load: Loads a manifest, runs the linker.

game.spawn: Supports autocomplete for FQ IDs (e.g. typing game.spawn content/for suggests content/forest::orc).

Step 3: The Serializer (De-compiler & Gatekeeper)

Goal: Save runtime/editor drafts back to disk without baking in absolute paths.

3.1 The Normalization Pipeline

Input: A specific Blueprint draft (in V2 schema) + Target File Path.

Process:

Namespace Stripping:

Check id. If id matches file namespace (content/forest::orc vs content/forest), strip prefix -> "orc".

Check refs (behavior, spawner). Strip prefix if it matches the local namespace. Keep FQ if external.

Schema Formatting: Ensure strict adherence to V2 Zod schemas.

Output: JSON object ready for disk.

3.2 The Gatekeeper (Validation)

Scope: Runs before any write operation.

Checks: Dangling references, circular dependencies, invalid schemas.

Error Reporting:

Terminal: Prints detailed error logs (red text).

UI Notifier: Triggers a Toast/Modal alerting the user that the save failed.

3.3 Terminal Verification

project.save_blueprint <fq_id>: Serializes an entity back to its source file.

Test Case: Load forest.blueprint (id: "orc"). Rename entity to "big_orc". Save. Verify disk file has "id": "big_orc" (relative), not "content/forest::big_orc".

Step 4: Runtime System Migration

Goal: Update the engine to consume the V2 LLL data.

4.1 Physics System (ImpulseEngine)

Refactor to read position/radius from SpatialComponent.

Refactor to read mass/drag from PhysicsComponent.

4.2 Rendering System (TransferScene)

Refactor to read position/radius from SpatialComponent.

Refactor to read icon/label/style from RenderComponent.

4.3 Game Logic (BodySystem, etc.)

Audit all systems reading display.label or physics.isStatic and redirect to V2 components.

Step 5: Refactoring Tools (Smart Move)

Goal: Allow moving files or folders without breaking references across the project.

5.1 project.move

Command: project.move <paths...> <dest_folder>

Logic:

Analyze: For each path (file or folder), calculate Old Namespace -> New Namespace mappings.

Graph: Load ALL project files to build the full dependency graph.

Search & Replace: Find all references to affected FQ IDs and update them to the new namespace.

Transaction:

Write modified consumer files.

Move the source files on disk.

Update manifest.json if module paths changed.

5.2 Terminal Verification

project.move content/forest content/biomes/forest: Moves entire folder.

linker.status: Verify 0 dangling references after move.

Step 6: Workspace Service & Project Lifecycle

Goal: Persistent state for the CLI/IDE and Project CRUD.

6.1 WorkspaceService

createProject(path: string, name: string): Scaffolds a new folder, manifest.json, and base directories.

loadProject(manifestPath: string): Initializes Linker, boots Runtime.

closeProject(): Unloads Runtime, clears memory, resets IDE to "Empty State".

getSymbols(): Returns list of all known FQ IDs (for Autocomplete).

6.2 Terminal Verification

project.create "my_new_game": Creates structure.

project.load "my_new_game/manifest.json": Boots it.

project.close: Returns to null state.
