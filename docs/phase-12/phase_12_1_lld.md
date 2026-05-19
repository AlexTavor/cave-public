Cave Engine V3: Low-Level Design (LLD)

Status: Approved
Target System: TypeScript / Browser Engine
Parent Doc: v3_implementation_plan.md

This document details the code-level changes required to implement the V3 features. It explicitly defines changes to Schema, Logic, Systems, and Visuals, with zero ambiguity or inference allowed.

1. Schema Changes

1.1 Draft Options (src/data/schemas/draft.ts)

We explicitly add a conditions field to DraftOptionBlueprint to support filtering.

Definition:

// src/data/schemas/draft.ts

import { LogicRuleSchema } from "./logic";

export const DraftOptionBlueprintSchema = z.object({
id: z.string(),
title: z.string(),
description: z.string(),
rarity: z.enum(["none", "common", "rare", "legendary"]).default("none"),
icon: z.string(),
// NEW: Explicit condition list. If any condition fails, option is excluded.
conditions: z.array(LogicRuleSchema).optional(),
payload: z.array(BehaviorActionSchema).default([]),
});

2. Logic & Evaluation Updates

2.1 Assignment Context (src/engine/runtime/systems/behavior/ValueResolver.ts)

We inject an explicit assignment map into the BehaviorContext.

Definition:

// src/engine/runtime/systems/behavior/ValueResolver.ts

export interface BehaviorContext {
snapshot: Snapshot;
self: RuntimeEntity;
globals: Record<string, number>;
// NEW: Dictionary mapping Child Entity ID -> Parent Station ID
// Must be populated by the caller (BehaviorSystem)
assignmentMap?: Record<string, string>;
}

2.2 Logic Adapter (src/engine/logic/JsonLogicAdapter.ts)

We explicitly intercept the assignment property on the entity proxy.

Implementation Logic:

Inside evaluate(), the dataProxy handler for get must check for property assignment.

If found, retrieve context.assignmentMap.

Look up target.self.id in the map.

Return an object { parentId: string | null }.

3. System Updates

3.1 Draft System (src/game/systems/DraftSystem.ts)

The DraftSystem handles execution, but the filtering logic must reside where the draft is generated.

New Requirement:
We must modify the TriggerDraftHandler logic to filter options before they are added to the DraftComponent.

Implementation Logic (TriggerDraftHandler):

Load DraftPoolBlueprint by poolId.

For each entry in pool.entries:
a. Load DraftOptionBlueprint by optionId.
b. If option.conditions is undefined or empty, keep entry.
c. If option.conditions exists:
i. Create a temporary BehaviorContext using sys_world (or trigger entity).
ii. Use JsonLogicAdapter to evaluate every rule in conditions.
iii. If any rule returns false, discard entry.

Proceed with weighted random selection on remaining entries.

3.2 Behavior System (src/engine/runtime/systems/BehaviorSystem.ts)

We explicitly build the assignment map at the start of the tick.

Implementation Logic:

Initialize assignmentMap: Record<string, string> = {}.

Iterate snapshot.getEntities().

For each entity, if entity.assignment exists:
a. For each childId in entity.assignment.assignedIds:
i. assignmentMap[childId] = entity.id.

Pass assignmentMap into ActionExecutor.execute.

4. Visual Updates

4.1 Visibility Logic (src/engine/phaser/scenes/transferSceneVisuals.ts)

We strictly rely on the schema-defined visible flag, but for radius-based entities, we must handle the case where radius <= 0.

Implementation Logic:

In resolveDisplayRadius, calculate the final radius value.

Constraint: Do not infer visibility solely from data.

Override: However, if the calculated radius is effectively zero (<= 0.5), the physics body exists but the visual representation must be hidden to prevent artifacts.

Code Change (src/engine/phaser/scenes/TransferScene.ts):
In update() loop:

const visuals = resolveDisplayRadius(entity, display, physics);
// Explicit check: logic dictates radius 0 = invisible
const isVisible = visuals.radius > 0.5;

if (!isVisible) {
// Ensure sprite is hidden
if (sprite.visible) sprite.setVisible(false);
return;
}
sprite.setVisible(true);

5. Testing Strategy

This implementation introduces logic branching that requires specific integration tests.

5.1 Unit Tests (src/engine/logic/JsonLogicAdapter.test.ts)

Case: self.assignment.parentId resolves correctly when map is provided.

Case: self.assignment.parentId is null when entity is unassigned.

5.2 Integration Tests (src/game/systems/DraftSystem.test.ts)

Case: TriggerDraft excludes options where conditions evaluate to false.

Case: TriggerDraft includes options where conditions evaluate to true.

Case: One-time purchase flow:

Global flag tech_pot = 0.

Trigger draft $\to$ Option available.

Select option $\to$ Sets tech_pot = 1.

Trigger draft again $\to$ Option excluded.

5.3 Visual Tests (src/engine/phaser/scenes/TransferScene.test.ts)

Case: Entity with radius: 0 is visible: false in Phaser scene.

Case: Entity with radius: 10 is visible: true.

6. Implementation Debt & Files

Files to Modify:

src/data/schemas/draft.ts (Add Schema)

src/engine/runtime/systems/behavior/ValueResolver.ts (Interface)

src/engine/logic/JsonLogicAdapter.ts (Proxy Trap)

src/engine/runtime/systems/BehaviorSystem.ts (Map Generation)

src/game/handlers/TriggerDraftHandler.ts (Condition Filtering)

src/engine/phaser/scenes/TransferScene.ts (Radius Visibility)

No Ambiguity Declaration:
All logic is derived from explicit state
