Phase 5 Low Level Design: The Gameplay Loop (v2)

1. Overview & Rationale

Why: The current engine is a generic ECS container. Phase 5 creates the specific RPG mechanics (Stats, XP, Hierarchy) defined in the High Level Design. We must bridge the gap between generic entities and specific game logic ("Bodies", "Faces") while maintaining strict architectural separation between src/engine (generic) and src/game (specific).

Architecture:
The Engine will remain agnostic of game-specific logic. We will use a Dependency Inversion pattern where the Game Layer registers Systems and Command Handlers into the Runtime at startup.

What:

Data: Schemas for BodyComponent, FaceComponent, and TraitDefinition in src/data/schemas/game/.

Engine Extensions: A generic System interface, registration methods on Runtime, and a specific batch command type.

Game Logic: BodySystem (Progression) and FaceSystem (Hierarchy) located in src/game/systems/.

Entry Point: src/game/main.ts to bootstrap the runtime and register game components.

2. Data Schemas (The "Game" Model)

Location: src/data/schemas/game/

2.1 Body Component

File: src/data/schemas/game/body.ts
Responsibility: Defines the RPG data structure for an entity.

import { z } from "zod";

export const AttributeSetSchema = z.object({
body: z.number().min(0),
mind: z.number().min(0),
social: z.number().min(0),
});

export const PassportSchema = z.object({
name: z.string().default("Unknown"),
description: z.string().optional(),
portraitIcon: z.string().describe("ui:icon").optional(),
});

export const BodyComponentSchema = z.object({
xp: z.number().default(0),
// Individual multiplier for XP gain (default 1.0)
xpRate: z.number().default(1.0),
level: z.number().int().min(1).default(1),

    // The canonical "base" stats, mutated only by leveling up
    baseAttributes: AttributeSetSchema.default({ body: 1, mind: 1, social: 1 }),

    // The effective stats (base + trait modifiers), recomputed on change
    attributes: AttributeSetSchema.default({ body: 1, mind: 1, social: 1 }),

    passport: PassportSchema.default({}),
    traits: z.array(z.string()).default([]), // References Trait IDs

});

export type BodyComponent = z.infer<typeof BodyComponentSchema>;

2.2 Face Component

File: src/data/schemas/game/face.ts
Responsibility: Marks an entity as a hierarchy leader.

import { z } from "zod";

export const FaceComponentSchema = z.object({
// Which attribute pool this face represents
attribute: z.enum(["body", "mind", "social"]),
// The entity ID currently filling this slot (runtime only, not blueprint)
assignedEntityId: z.string().optional(),
});

export type FaceComponent = z.infer<typeof FaceComponentSchema>;

2.3 Trait Definition (Asset)

File: src/data/schemas/game/traits.ts
Responsibility: Defines data-driven buffs.

import { z } from "zod";
import { BehaviorRuleSchema } from "../../behavior";

export const TraitModifiersSchema = z.object({
body: z.number().optional(),
mind: z.number().optional(),
social: z.number().optional(),
xpMultiplier: z.number().optional(),
});

export const TraitDefinitionSchema = z.object({
id: z.string(),
label: z.string(),
description: z.string().optional(),
modifiers: TraitModifiersSchema.optional(),
rules: z.array(BehaviorRuleSchema).optional(),
});

export type TraitDefinition = z.infer<typeof TraitDefinitionSchema>;

2.4 Registry Updates

File: src/data/schemas/components.ts - Import/Export game schemas.

File: src/data/schemas/assets.ts - Add traits: z.record(...).

3. Engine Extensions

3.1 System Interface & Registration

File: src/engine/runtime/systems/System.ts (New)
Responsibility: Define the contract for external logic modules.

import type { Snapshot } from "../Snapshot";
import type { CommandBuffer, RuntimeCommand } from "../types";

export interface System {
tick(snapshot: Snapshot, commands: CommandBuffer<RuntimeCommand>, dt: number): void;
}

File: src/engine/runtime/Runtime.ts (Update)
Changes:

Add registerSystem(system: System): void.

Add registerCommandHandler(handler: CommandHandler<any>): void.

Update tick() loop to iterate over registered systems after internal systems.

3.2 Batch Update Command

File: src/engine/runtime/types.ts (Update)
Change: Add UPDATE_BODIES_BATCH to RuntimeCommandType.

Payload Definition:
To ensure safety, we do not allow partial merging of arbitrary properties. We explicitly define the updateable fields.

export interface BodyUpdatePayload {
entityId: string;
// Optional deltas or replacements
xp?: number;
level?: number;
// If provided, these fully replace the existing objects
baseAttributes?: { body: number; mind: number; social: number };
attributes?: { body: number; mind: number; social: number };
}

export interface UpdateBodiesBatchCommandPayload {
updates: BodyUpdatePayload[];
}

4. Game Layer Implementation (src/game/)

4.1 UpdateBodiesBatchHandler

File: src/game/handlers/UpdateBodiesBatchHandler.ts
Responsibility: Efficiently applies batch updates to the ECS world during the Apply Phase.
Logic:

Iterate command.payload.updates.

Lookup entity by ID.

If found and has body component:

Update scalar fields (xp, level) if present.

Replace object fields (baseAttributes, attributes) if present.

Crucial: Do not use Object.assign blindly. Assign specific properties to ensure type safety and schema compliance.

4.2 Body System

File: src/game/systems/BodySystem.ts
Responsibility: Progression logic.
Logic:

Read: Query all entities with body.

XP Accumulation: xp += dt \* rate.

Level Up: If xp > threshold, increment level, reset xp, and roll for baseAttribute increase.

Trait Application:

Watch for changes in traits array.

Recalculate attributes (Base + Trait Modifiers).

Rule Injection:

Clone the entity's behavior component (runtime mutation).

Filter out stale trait rules.

Inject new rules from active traits.

Emit PATCH_BLUEPRINT (or UPDATE_STATE if runtime-only) to persist the behavior change.

Emit: UPDATE_BODIES_BATCH with all calculated changes.

4.3 Face System

File: src/game/systems/FaceSystem.ts
Responsibility: Hierarchy management.
Logic:

Identify: Find Face entities and the sys_swarm entity.

Aggregation: Sum attributes of all non-Face bodies -> update sys_swarm.

Election:

If a Face slot is empty (or assigned entity is dead):

Find living entity with highest relevant attribute.

Assign ID to Face component.

Emit: UPDATE_STATE for Face assignments and Swarm stats.

4.4 Game Entry Point

File: src/game/main.ts
Responsibility: Bootstraps the engine with game-specific logic.
Logic:

Import createGameRuntime from Engine.

Instantiate BodySystem, FaceSystem.

Instantiate UpdateBodiesBatchHandler.

Create runtime.

runtime.registerSystem(...).

runtime.commands.registerHandler(...).

Return runtime instance to UI.

5. UI Implementation

5.1 Body Field Editor

File: src/ui/devtools/editors/fields/body-field/BodyField.tsx
Logic: Custom SchemaForm field for editing BodyComponent. Includes sliders for attributes and an icon picker for the passport.

5.2 Flow Visualization

File: src/game/phaser/FlowRenderer.ts
Logic:

Phaser Scene that runs alongside the main loop.

Draws dynamic lines between Faces/Swarm -> Pools -> Jobs.

Line thickness derived from resource flow rates.

6. Testing Strategy

6.1 Unit Tests

src/game/systems/BodySystem.test.ts:

Verify batching (100 entities -> 1 command).

Verify trait math (Base + Modifiers = Attributes).

src/game/systems/FaceSystem.test.ts:

Verify promotion logic (highest stat wins).

Verify tenure (incumbent stays until death).

6.2 Integration Tests

Game Boot Test: Verify src/game/main.ts correctly registers systems and the runtime executes them.

Loop Test: Spawn entity -> Wait 100 ticks -> Verify XP increased.

7. Implementation Order

Engine Prep:

Define System interface.

Add registration methods to Runtime.

Define UPDATE_BODIES_BATCH command type.

Schemas: Create game/ schemas (body, face, traits).

Handlers: Implement UpdateBodiesBatchHandler in src/game/handlers/.

Systems: Implement BodySystem and FaceSystem in src/game/systems/.

Entry Point: Create src/game/main.ts and wire it up.

UI: Build Editor fields and Phaser visualizer.
