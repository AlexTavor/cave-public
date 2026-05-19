Low Level Design: Composable Modules Transition (Phases 14.2 - 14.4)

Status: Draft
Parent: Phase 14 Workplan
Scope: V2 Data Contract, The Linker, and Runtime Migration.

1. Executive Summary

This document details the architectural transition from a monolithic data structure to a composable, file-system-backed architecture.

Phase 14.2 (The Contract): Defines the strict Zod schemas (V2) that the Runtime will consume.

Phase 14.3 (The Linker): Builds the compiler that translates disk-based fragments (V1) into the in-memory V2 contract.

Phase 14.4 (The Transplant): Refactors the Runtime logic to consume V2 data, enabling the switch.

2. Phase 14.2: The V2 Data Contract

Goal: Define the target state for the Linker. These schemas represent the "compiled" view of the world, optimized for ECS systems rather than developer ergonomics.

2.1 Directory Structure

src/data/schemas/v2/

2.2 Schema Definitions

src/data/schemas/v2/spatial.ts

Responsibility: Defines physical presence. Centralizes position and bounds.
Interface:

type SpatialComponent = {
x: number; // Default: 0
y: number; // Default: 0
radius: number; // Default: 10
}

src/data/schemas/v2/render.ts

Responsibility: Defines visual presentation logic. Replaces DisplayComponent.
Interface:

type RenderComponent = {
label: string;
icon: string;
description?: string;
tooltip?: string;
styleId: string; // Reference to a Style Asset in the RuntimeCartridge
color?: string;
reactiveScale?: {
min: number;
max: number;
valueRef?: string;
maxRef?: string;
};
bars?: Array<{ key: string; max?: number; color?: string }>;
}

src/data/schemas/v2/physics.ts

Responsibility: Defines simulation properties.
Interface:

type PhysicsComponent = {
mass: number;
drag: number;
isStatic: boolean;
anchor?: Anchor; // Single anchor configuration
}

src/data/schemas/v2/config.ts

Responsibility: Aggregates system configurations into a single root.
Interface:

type SysConfig = {
impulse: ImpulseConfig;
vitality: VitalityConfig;
game_config: GameRules;
}

3. Phase 14.3: The Linker (Loader & Compiler)

Goal: Create a pipeline that reads V1 fragment files, resolves namespaces, migrates data shapes, and outputs a RuntimeCartridge.

3.1 New Types (src/engine/linker/types.ts)

// The output of the Linker. This is what the Runtime will eventually consume.
export interface RuntimeCartridge {
metadata: {
id: string;
version: string;
};
// Keys are Fully Qualified IDs (namespace::id)
blueprints: Record<string, BlueprintV2>;
assets: {
styles: Record<string, EntityStyle>;
icons: Record<string, IconAssetDefinition>;
};
config: SysConfig;
}

// BlueprintV2 uses V2 components
export interface BlueprintV2 {
id: string; // FQ ID
spatial?: SpatialComponent;
render?: RenderComponent;
physics?: PhysicsComponent;
// ... other components mapped 1:1
}

3.2 The Linker Class (src/engine/linker/ModuleLinker.ts)

Responsibility: Orchestrates the loading and compilation process.

Logic:

Load: Uses FileSystem to read the manifest.json. It iterates the file list defined in the manifest and loads only those files.

Parse: Validates raw JSON against V1 schemas (tolerant of missing fields).

Namespace Expansion: Constructs Fully Qualified IDs (FQIDs) by joining the file's namespace with the local ID.

Example: If file content/forest.blueprint contains entity orc, the FQID becomes content/forest::orc.

Transpile: Passes raw components through v1tov2 transformers.

Merge: Aggregates all configurations (last-write-wins) and collects assets into the assets block.

Interface:

export class ModuleLinker {
constructor(private fs: FileSystemBase) {}

async linkProject(rootPath: string): Promise<RuntimeCartridge>;
}

3.3 Transpilers (src/engine/linker/transpilers/v1tov2.ts)

Responsibility: Pure functions mapping V1 shapes to V2.

Logic:

migrateDisplay(display: V1Display, physics: V1Physics): { render: V2Render, spatial: V2Spatial }

Moves display.radius to spatial.radius (unless physics.radius exists).

Maps display.radius.{min,max,refs} to render.reactiveScale.

Style Migration: If display.style is present, look up or create a matching styleId (defaulting to a standard set like core::default_circle).

migratePhysics(physics: V1Physics): { physics: V2Physics, spatial: V2Spatial }

Moves physics.x/y to spatial.x/y.

Preserves single anchor.

3.4 Namespace Resolver (src/engine/linker/utils/namespaces.ts)

Responsibility: resolving relative IDs to FQ IDs.

Logic:

resolveId(localId: string, namespace: string): string

If localId contains ::, return as is (absolute).

Else, return ${namespace}::${localId}.

3.5 Testing Strategy (Linker)

Integration Test: Create a mock FS with fileA referencing fileB. Run Linker. Assert RuntimeCartridge contains FQ keys and merged data.

Unit Test (Transpilers): Assert V1 display object produces correct V2 render and spatial objects.

4. Phase 14.4: Runtime Migration (The Transplant)

Goal: Switch the Runtime to use RuntimeCartridge and V2 components.

4.1 Runtime Entry Point (src/engine/runtime/createGameRuntime.ts)

Changes:

Update signature to accept RuntimeCartridge instead of ModuleCartridge.

Interim Strategy: If we need to support legacy tests, we can keep an adapter that runs the Linker in-memory on the old ModuleCartridge before passing it to Runtime.

4.2 Spawn Logic (src/engine/runtime/handlers/SpawnHandler.ts)

Logic Change:

When hydrating an entity from a blueprint:

Copy spatial -> entity.spatial.

Copy render -> entity.render.

Copy physics -> entity.physics.

CRITICAL: Ensure resolvePhysicsPosition helper now looks at spatial instead of trying to deduce from physics/display.

4.3 Physics System (src/engine/physics/impulse/ImpulseEngine.ts)

Changes:

addBody(entity):

Read x, y, radius from entity.spatial.

Read mass, drag, anchor from entity.physics.

tick():

Update entity.spatial.x and entity.spatial.y after integration.

4.4 Rendering System (src/engine/phaser/scenes/transferSceneVisuals.ts)

Changes:

parseDisplayComponent: Rename to parseRenderComponent.

Read from entity.render.

Map reactiveScale to the scene's scaling logic.

Style Lookup: Use entity.render.styleId to look up the EntityStyle from runtime.cartridge.assets.styles.

resolveDisplayRadius: Read entity.spatial.radius.

4.5 Testing Strategy (Runtime)

Automated Breakage Check: The compiler will flag all access to entity.display or entity.physics.x. These must be fixed systematically.

Automated Behavior Test: Run the HeadlessRunner with a compiled V2 cartridge. Verify entity positions update and interactions occur (proving Spatial/Physics integration).

Automated Visual Verification:

Refactor TransferScene tests to verify that acquireSprite is called with the correct texture key derived from RenderComponent.

We do not check pixel output. We assert that:

The Entity exists in the ECS.

The Sync System detected the entity.

The correct visuals (color, shape ID) were passed to the Phaser/Rendering layer.

5. Implementation Sequence

V2 Schemas (Phase 14.2): Create files in src/data/schemas/v2.

Linker (Phase 14.3):

Implement transpilers.

Implement ModuleLinker.

Verify with mock FS.

Runtime Refactor (Phase 14.4):

Update RuntimeEntity type definition to include spatial, render (optional), physics (V2).

Update ImpulseEngine to read Spatial.

Update TransferScene to read Render / Spatial.

Update SpawnHandler.

Fix all compilation errors.

Integration: Switch createGame to use the Linker before booting the Runtime.

6. Constraints & Safety

No Logic Changes: The behavior of physics, rendering, and logic must remain identical. This is a structural refactor.

Strict Types: Use Zod types everywhere. Do not cast to any.

Backward Compatibility: The Linker is the compatibility layer. It allows us to keep V1 files on disk while using V2 architecture in memory.
