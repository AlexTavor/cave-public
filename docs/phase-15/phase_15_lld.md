Phase 15 Low-Level Design: System Entities & Technical Debt

1. Overview & Objectives

The Why:
Core system entities (sys_world, sys_swarm) and system-critical blueprints (Faces) currently rely on implicit initialization logic or scattered defaults. Global game traits lack a formalized configuration home within the project structure. This phase eliminates this ambiguity by establishing a canonical "System Config" contract in the engine, exposing overrides via .cave configuration, and centralizing the runtime boot process into a deterministic command.

The What:

System Defaults: Move sys_world, sys_swarm, and Face definitions into src/data/schemas/v2/systemDefaults.ts.

Configuration Schema: Update .cave schema to support overrides for these entities and a dedicated traits registry.

Boot Sequence: Replace ad-hoc startup logic with a strict game.init command.

DevTools: Add specialized (danger-zone) editors for system entity overrides and traits.

2. Data Schema & Defaults

2.1 src/data/schemas/v2/systemDefaults.ts

Status: New File (Refactor of worldDefaults.ts)
Responsibility: Define the immutable engine defaults for required system singletons and blueprints.

Logic & Interface:

// Move content from src/data/schemas/v2/worldDefaults.ts here
export const DEFAULT_WORLD_ENTITY = { ... }; // Existing logic

// Defines the default singleton entity for the swarm manager
export const DEFAULT_SWARM_ENTITY: Record<string, unknown> = {
id: "sys_swarm",
tags: ["sys_swarm", "hidden"],
// Standard swarm configuration components
};

// Defines the base blueprints for system faces
export const DEFAULT_FACES: Record<string, unknown> = {
"face_body": { id: "face_body", tags: ["face", "face_body"], ... },
"face_mind": { id: "face_mind", tags: ["face", "face_mind"], ... },
"face_social": { id: "face_social", tags: ["face", "face_social"], ... },
};

2.2 src/data/schemas/v2/config.ts

Status: Modified
Responsibility: Extend the system configuration schema to validate overrides and traits.

Changes:

Import TraitDefinitionSchema from ../game/traits.

Import DEFAULT_SWARM_ENTITY and DEFAULT_FACES from ./systemDefaults.

Update SysConfigSchema:

export const SysConfigSchema = z.object({
// ... existing fields
// New fields:
swarm: z.record(z.string(), z.unknown()).default(DEFAULT_SWARM_ENTITY),
faces: z.record(z.string(), z.unknown()).default(DEFAULT_FACES),
traits: z.record(z.string(), TraitDefinitionSchema).default({}),
});

3. Engine & Runtime

3.1 src/engine/runtime/runtimeWorld.ts

Status: Modified
Responsibility: Enforce the existence of all singleton system entities in the ECS world.

Changes:

Rename ensureWorldEntity to ensureSystemEntities.

Update signature: (world: World<RuntimeEntity>, config: SysConfig) => void.

Logic:

World: Check for entity with id: "sys_world". If missing, add config.world (force id="sys_world").

Swarm: Check for entity with id: "sys_swarm". If missing, add config.swarm (force id="sys_swarm").

Note: Faces are blueprints, not singletons, so they are not spawned here.

3.2 src/engine/runtime/RuntimeCore.ts

Status: Modified
Responsibility: Invoke the new system entity bootstrapper.

Changes:

In constructor:

Replace ensureWorldEntity(...) call with ensureSystemEntities(this.entityStore.getWorld(), this.cartridge.config).

3.3 src/game/main.ts

Status: Modified
Responsibility: Wire the centralized traits configuration into the BodySystem.

Changes:

Remove traitCandidate resolution logic that looks at cartridge.blueprint or cartridge.assets.

Directly access cartridge.config.traits (which defaults to {} via Zod if missing).

Pass cartridge.config.traits to new BodySystem(...).

4. Runtime Terminal Commands

4.1 src/ui/runtime/terminal/runtimeConstants.ts

Status: Modified
Responsibility: Define validation schema for the init command.

Changes:

Export gameInitSchema.

export const gameInitSchema = z.array(z.string().min(1)).min(1).max(2);

4.2 src/ui/runtime/terminal/commands/gameInitCommand.ts

Status: New File
Responsibility: Orchestrate the game boot sequence via the Command Pipeline.

Logic:

export const gameInitCommand: CommandDefinition = {
name: "game.init",
description: "Initialize game session: system spawn -> body spawn -> (optional) run",
usage: "game.init <body_blueprint_id> [auto_run=false]",
execute: async (args, context) => {
const [bodyId, runFlag] = args;
const shouldRun = runFlag === "true";
const { runtime, cartridge } = context;

        // 1. Validation
        if (!runtime || !cartridge) return { type: "error", content: "Runtime not ready" };

        // 2. Spawn System Faces
        // Iterate over keys in cartridge.config.faces (e.g., "face_body", "face_mind")
        // Enqueue SPAWN commands for each face blueprint ID defined in config.
        const faces = cartridge.config.faces || {};
        for (const faceKey of Object.keys(faces)) {
             runtime.commands.enqueue({
                type: RuntimeCommandType.SPAWN,
                payload: { blueprintId: faceKey }
             });
        }

        // 3. Spawn Player Body
        runtime.commands.enqueue({
            type: RuntimeCommandType.SPAWN_BODY,
            payload: { blueprintId: bodyId }
        });

        // 4. Auto-Run
        if (shouldRun) {
            runtime.play();
        }

        return { type: "success", content: `Initialized with body: ${bodyId}` };
    }

}

4.3 src/ui/runtime/terminal/runtimeRegistry.ts

Status: Modified
Responsibility: Register the new command.

Changes:

Import gameInitCommand.

Export gameInitSchema in the named exports object.

Add gameInitCommand to RUNTIME_COMMANDS list.

5. DevTools (Editor UI)

Constraint Compliance: UI components below must only render state or dispatch actions to the useSessionStore / useModuleSession. They must not mutate runtime or generic objects directly.

5.1 src/ui/devtools/editors/file/SystemConfigEditor.tsx

Status: Modified
Responsibility: Serve as the navigation hub for all .cave configuration sections.

Changes:

Add new Card components to DashboardGrid:

Title: "Swarm Entity", Action: openFile("swarm_entity::${filename}")

Title: "Face Blueprints", Action: openFile("face_blueprints::${filename}")

Title: "Global Traits", Action: openFile("traits::${filename}")

5.2 src/ui/devtools/editors/config/SystemEntityEditor.tsx

Status: New File
Responsibility: Provide a generic raw JSON editor for system overrides with safety warnings.

Interface:

interface SystemEntityEditorProps {
filename: string;
rootPath: "blueprint.settings.world" | "game_config.swarm" | "game_config.faces"; // Resolved paths in the draft structure
title: string;
}

Logic:

Render a ToolFrame with title.

Render a warning banner (styled div): "Warning: Overriding system internals. Invalid config may cause fatal errors."

Render SessionJsonEditor passing filename and rootPath. This delegates the actual read/write to useSessionStore, ensuring draft persistence.

5.3 src/ui/devtools/editors/config/TraitsEditor.tsx

Status: New File
Responsibility: Provide a raw JSON editor for the traits registry.

Interface:

interface TraitsEditorProps {
filename: string;
}

Logic:

Render ToolFrame with title "Global Traits".

Render informational banner about Trait structure/schema.

Render SessionJsonEditor with rootPath="blueprint.traits" (Note: verify path alignment with toCaveModule in semanticModuleFragments.ts).

5.4 src/ui/devtools/shell/window-manager/hooks/useWindowManagerRouteHandlers.base.ts

Status: Modified
Responsibility: Map virtual paths to the new editor components.

Changes:

Update createBaseHandlers to include:

swarm_entity: Opens tab with SystemEntityEditor (rootPath: "game_config.swarm").

face_blueprints: Opens tab with SystemEntityEditor (rootPath: "game_config.faces").

traits: Opens tab with TraitsEditor.

Note: Corresponding updates to VirtualPath union types in src/ui/devtools/shell/window-manager/virtualPath.ts and src/ui/devtools/shell/window-manager/virtualPath.constants.ts are implicitly required to support these new route keys.

6. Testing Strategy

Philosophy: Tests must follow the "Given-When-Then" structure using Factories. Logic must be isolated.

6.1 Unit Tests (src/engine/runtime/runtimeWorld.test.ts)

Goal: Verify ensureSystemEntities correctly enforces singletons without duplication.

Test 1: Bootstraps Missing Entities

Given: An empty ECS World and a SysConfig with swarm/world definitions.

When: ensureSystemEntities(world, config) is called.

Then: The World contains one entity with id: sys_world and one with id: sys_swarm.

Test 2: Respects Existing Entities

Given: A World already containing sys_world.

When: ensureSystemEntities is called.

Then: sys_world is NOT overwritten or duplicated.

6.2 Integration Tests (src/ui/runtime/terminal/commands/gameInitCommand.test.ts)

Goal: Verify the command orchestrates the spawn sequence correctly.

Test 1: Successful Initialization

Given: A runtime context with a cartridge containing face_body in config.faces and a blueprint player_one.

When: execute is called with ["player_one", "false"].

Then:

runtime.commands contains SPAWN for face_body.

runtime.commands contains SPAWN_BODY for player_one.

runtime.play() is NOT called.

Test 2: Auto-Run Trigger

Given: Same context.

When: execute is called with ["player_one", "true"].

Then: runtime.play() is called.
