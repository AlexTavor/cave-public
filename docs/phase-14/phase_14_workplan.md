Phase 14 Workplan: Composable Modules & Linker Architecture

Status: Planned
Strategy: Terminal-First, Backend-First
Dependency: AI Context Pack v1

This workplan breaks down the transition to V2 architecture into discrete, verifiable milestones. Each phase builds upon the previous one, ensuring that the critical "Brain Transplant" (Runtime Migration) happens only when the data infrastructure is stable.

🟢 Phase 14.1: The Foundation (VFS & Infrastructure)

Goal: Equip the IDE with robust, batch-capable file system operations required for project management.

Scope:

Plugin (vite-plugin-game-editor.ts):

Implement POST /batch for atomic operations.

Update DELETE /delete and POST /move to support array inputs and folder recursion.

Implement GET /scan for glob-based file discovery.

VFS Layer (FileSystem.ts):

deletePaths(paths: string[])

movePaths(items: { from: string, to: string }[])

scan(glob: string)

tree(root: string) -> Returns nested TreeNode structure.

Terminal Commands:

fs.tree [path]

fs.scan <glob>

fs.delete <path...>

fs.move <from> <to>

Verification Criteria:

[ ] fs.tree renders a visual directory hierarchy in the terminal.

[ ] fs.delete successfully removes a non-empty folder.

[ ] fs.move successfully renames a folder.

🟢 Phase 14.2: The Data Contract (V2 Schemas)

Goal: Define the rigid target structure for the Linker and Runtime.

Scope:

Component Schemas (src/data/schemas/v2/\*.ts):

SpatialComponent (x, y, radius)

RenderComponent (label, icon, style, reactiveScale)

PhysicsComponent (mass, drag, isStatic, anchors)

SysConfigSchema (merging impulse, vitality, game_config)

Types: Export TypeScript interfaces for Runtime consumption.

Verification Criteria:

[ ] Zod schemas validate correct V2 data.

[ ] Zod schemas reject legacy V1 data (ensuring strict separation).

[ ] TS Interfaces are exported and available.

🟢 Phase 14.3: The Linker (Loader & Compiler)

Goal: Transform disk fragments into a namespaced, runnable Runtime Cartridge.

Scope:

ModuleLinker Class:

loadProject(manifestPath) pipeline.

Manifest Parser: Reads dependencies and load order.

Fragment Loader: Fetches .blueprint, .assets, .sys.

Compiler:

Namespacing: "id": "orc" -> "content/forest::orc".

Migration: Maps V1 components (display) to V2 (render/spatial).

Config Aggregation: Merges .sys files.

Terminal Integration:

project.load command.

game.spawn updated to support FQ ID autocomplete.

Verification Criteria:

[ ] project.load successfully boots a V1 legacy project by auto-migrating it in memory.

[ ] runtime.getEntity("content/forest::orc") returns a valid entity with spatial component.

[ ] Terminal autocomplete suggests FQ IDs.

🟢 Phase 14.4: The Brain Transplant (Runtime Migration)

Goal: Update the Runtime Engine to consume V2 LLL Data.

Scope:

Physics System (ImpulseEngine):

Read pos/radius from SpatialComponent.

Read mass/drag from PhysicsComponent.

Render System (TransferScene):

Read visuals from RenderComponent.

Game Logic (BodySystem, etc.):

Audit/Update path lookups (e.g. display.label -> render.label).

Runtime:

Ensure SpawnHandler initializes V2 components correctly.

Verification Criteria:

[ ] The Game Loop runs successfully with the data loaded in Phase 14.3.

[ ] Entities render correctly (icon, color, radius).

[ ] Physics simulation behaves correctly (collisions, movement).

🟢 Phase 14.5: The Gatekeeper (Serializer & Validation)

Goal: Enable saving changes back to disk with strict validation and normalization.

Scope:

ModuleSerializer:

Normalization: Strip namespaces if they match the file context (content/forest::orc -> "orc").

Schema Enforcement: Ensure output matches V2 Zod schemas.

The Gatekeeper:

Pre-write validation for dangling references or circular deps.

Error Reporting:

Dual-channel reporting: Red text in Terminal + UI Toast/Modal.

Terminal Commands:

project.save_blueprint <fq_id>

Verification Criteria:

[ ] Saving an entity writes a file with relative IDs to disk.

[ ] Saving an entity with a broken reference aborts and shows an error in Terminal AND UI.

🟢 Phase 14.6: Workspace & Refactoring Tools

Goal: Complete the IDE lifecycle and refactoring capabilities.

Scope:

WorkspaceService:

Manage active project state.

createProject(path, name): Scaffolding.

closeProject(): Teardown.

RefactorService (project.move):

Dependency graph analysis.

Multi-file search & replace for FQ IDs.

Atomic move transaction.

Terminal Commands:

project.create

project.close

project.move

Verification Criteria:

[ ] project.create generates a valid folder structure.

[ ] project.move renames a folder AND updates references in unrelated files.

[ ] project.close clears the runtime and resets the UI.
