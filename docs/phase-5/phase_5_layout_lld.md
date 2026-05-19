Low-Level Design: Visual Layout Editor (Phase 5)

Status: Approved for Implementation
Author: System Architect
Context: Context Pack v1
Reference: HLD Phase 5

1. Architecture & Design Patterns

1.1 The Context Adapter Pattern

To reuse the complex rendering logic of EntityNode and WorldLayer without coupling them to the global game state, we introduce a strict abstraction layer for world interactions.

Interface (WorldInteractionContext): Defines the contract for accessing the ECS World and handling selection events.

Adapter A (GameWorldAdapter): Binds to the global useRuntimeStore (Zustand). Used in the main Game View.

Adapter B (LayoutWorldAdapter): Binds to a local Runtime instance prop and uses React local state for selection. Used in the Layout Editor.

1.2 The Simulation Runtime Pattern

The Layout Editor does not use the "Real" game runtime. Instead, it instantiates a transient "Simulation Runtime".

Transient: Created on mount, destroyed on unmount.

Lobotomized: Only Physics and Spatial Indexing systems are active. Behavior, Automation, and Lifecycle systems are omitted.

Ghost Entities: It populates the world by iterating the Module Draft (blueprints) and spawning entities 1:1. These entities are shells containing only id, physics, and display components.

1.3 The Transactional Session

Layout editing follows a strict transaction model:

Fork: On entry, state is derived from the Session Draft.

Drift: User drags entities. This mutates the Physics Body in the Simulation Runtime directly (for 60fps performance), bypassing the standard Command/Tick loop for position updates.

Merge: On "Save", we harvest all positions from the Physics Engine, compare them to the original Draft, and emit a single batched update to the Session Store.

2. Component Specifications

2.1 Context Infrastructure

src/ui/runtime/world/context/WorldInteractionContext.tsx

Responsibility: Defines the dependency injection contract for World UI components.
Exports: WorldInteractionContext, useWorldInteraction.
Interface:

interface WorldInteractionContextValue {
runtime: Runtime | null; // The ECS world source
selectedEntityId: string | null; // Currently selected ID
selectEntity: (id: string | null) => void; // Selection handler
}

Test Strategy:

Verify useWorldInteraction throws if used outside a Provider.

src/ui/runtime/world/context/GameWorldAdapter.tsx

Responsibility: Binds the context to the global game stores.
Logic:

Subscribes to useRuntimeStore.runtime.

Subscribes to useRuntimeToolStore.selectedEntityId.

Proxies selectEntity to useRuntimeToolStore.actions.selectEntity.
Test Strategy:

Smoke test: Render a consumer inside this adapter, verify it receives values from the global store.

src/ui/devtools/layout/context/LayoutWorldAdapter.tsx

Responsibility: Binds the context to the local Simulation Runtime.
Props: runtime: Runtime | null.
Logic:

Uses useState to track selectedEntityId.

selectEntity updates this local state only.

Isolates layout interactions from the global Inspector/Telemetry panels.
Test Strategy:

Integration test: Verify changing selection here does not update the global store.

2.2 Component Refactors

src/ui/runtime/world/useSelectedEntity.ts

Change: Switch from useRuntimeToolStore to useWorldInteraction.
Impact: The hook becomes agnostic to the source of truth.
Logic:

Call useWorldInteraction().

Derive entity by looking up selectedEntityId in runtime.getEntities().

Return standard selection actions (deselect, kill).

src/ui/runtime/world/useEntityNodeInteractions.ts

Change: Switch from useRuntimeToolStore to useWorldInteraction.
Logic:

On click: Call context.selectEntity(id).

On drag: Access context.runtime to enqueue physics updates.

Constraint: Drag logic must check if runtime exists on the context before attempting physics body lookups.

src/ui/runtime/shell/RuntimeShell.tsx

Change: Wrap the entire tree in <GameWorldAdapter>.
Why: Ensures existing game view continues to function using global state.

2.3 Simulation Logic

src/ui/devtools/layout/simulation/createSimulationRuntime.ts

Responsibility: Factory function to spin up the transient runtime.
Interface: (cartridge: ModuleCartridge) => Runtime
Logic:

Call createGameRuntime with a random seed.

Iterate cartridge.blueprints.

Filter: Only include blueprints having both physics and display components.

Enqueue SPAWN commands for these blueprints using their Blueprint ID as the Entity ID.

Call runtime.tick(0) immediately to process spawns and initialize physics bodies.

Return the runtime instance.
Test Strategy:

Pass a mock cartridge with 3 blueprints (1 invalid).

Verify runtime has exactly 2 entities.

Verify entities have correct positions from blueprint defaults.

src/ui/devtools/layout/persistence/layoutPersistence.ts

Responsibility: Pure functions for data extraction and patching.
Exports:

harvestPositions(runtime: Runtime): PositionUpdate[]

applyLayoutBatch(draft: ModuleCartridge, updates: PositionUpdate[]): void
Logic:

harvestPositions: Iterate all entities in runtime. Read body.position.x/y. Return array of { blueprintId, x, y }.

applyLayoutBatch: Iterate updates. Mutate draft.blueprints[id].components.physics directly. Uses setByPath util.
Test Strategy:

Unit Test: Create mock runtime with bodies at (10, 10). Harvest. Verify output.

Unit Test: Apply updates to a mock Cartridge. Verify JSON structure changes.

2.4 Layout Editor UI

src/ui/devtools/layout/LayoutHUD.tsx

Responsibility: The "Heads Up Display" for the layout mode.
Props: onConfirm: () => void, onCancel: () => void.
Render:

Floating Card at bottom center.

Title: "Layout Mode".

"Cancel" button (Ghost).

"Save Positions" button (Primary).

src/ui/devtools/layout/LayoutEditor.tsx

Responsibility: The Orchestrator Component.
Props: filename: string.
State:

runtime: The Runtime instance (useState).

canvasRef: Ref for Phaser container.
Logic:

Mount:

Fetch module data (from useModuleStore or useSessionStore if open).

Call createSimulationRuntime(moduleData).

Set runtime state.

Initialize usePhaserGame with the canvasRef.

Unmount:

Call runtime.destroy().

Handlers:

handleConfirm: Call harvestPositions(runtime) -> updateDraft (Session Store) -> applyLayoutBatch -> toggleLayoutMode(false).

handleCancel: Just call toggleLayoutMode(false).
Render:

<LayoutWorldAdapter runtime={runtime}>

<ShellRoot>

<GameCanvas ref={canvasRef} />

<WorldRenderLinkProvider> ... <WorldLayer /> ...

<LayoutHUD />

2.5 Integration Points

src/ui/devtools/shell/shell.ts (Store Update)

Add State:

isLayoutMode: boolean

layoutTargetFilename: string | null
Add Action:

toggleLayoutMode(active: boolean, filename?: string)

src/ui/devtools/shell/EditorShell.tsx (Update)

Logic:

Subscribe to isLayoutMode and layoutTargetFilename.

Render a <Portal layer="overlay"> when active.

Inside Portal: Fullscreen opaque container (z-index high) containing <LayoutEditor filename={target} />.

Critical: This overlay sits above the standard WindowManager but below Toasts/Modals.

3. Test Plan

3.1 Unit Tests (Logic)

layoutPersistence.test.ts:

Validate harvestPositions correctly maps physics bodies to updates.

Validate applyLayoutBatch correctly mutates deep JSON structures without data loss.

createSimulationRuntime.test.ts:

Validate filtering logic (blueprints without display/physics are skipped).

Validate immediate spawning mechanism (tick 0).

3.2 Component Tests (Adapters)

LayoutWorldAdapter.test.tsx:

Render a test consumer.

Trigger selectEntity.

Assert local state updated.

Assert global useRuntimeToolStore did not update.

3.3 Integration Tests (Flow)

LayoutEditorFlow.test.tsx:

Mock usePhaserGame (canvas stub).

Mount LayoutEditor with a test module.

Verify WorldLayer renders nodes based on blueprint data.

Simulate "Save": Verify updateDraft is called on the session store with the correct position payload.
