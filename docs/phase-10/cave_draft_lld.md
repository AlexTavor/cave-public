Low Level Design: Cave Draft Integration

1. Overview

This document defines the integration of the Draft System into the Cave Progression Loop. Instead of automatically incrementing attributes upon leveling up, the system will trigger a Draft event, presenting the user with choices to specialize the Cave's attributes (Body, Mind, Social).

2. Why (Motivation)

Player Agency: Leveling up should feel impactful and strategic, not passive.

Specialization: Allow players to build towards specific economies (e.g., heavy Body for population support vs. heavy Mind for tech).

Architectural consistency: Leverage the existing generic DraftSystem and BehaviorAction pipeline rather than creating a bespoke leveling UI.

3. What (Proposed Changes)

CaveSystem Logic: Modify CaveSystem to detect XP thresholds and emit TRIGGER_DRAFT instead of auto-leveling silently.

Command Pipeline Update: Extend UPDATE_CAVE to support attribute mutation.

Action Execution: Update ActionExecutor to intercept mutations targeting the complex cave component structure and route them to UPDATE_CAVE.

Data Content: Define the pool_level_up and associated Draft Options in the cartridge.

4. How (Detailed Design)

4.1. Runtime Types Update

File: src/engine/runtime/types/runtimeCommandPayloadsUpdate.ts

Responsibility: Define the data shape for updating cave attributes.

Change: Add optional attributes field to UpdateCaveCommandPayload.

export interface UpdateCaveCommandPayload {
entityId: string;
xp?: number;
level?: number;
xpRate?: number;
// New field to support partial attribute updates
attributes?: {
body?: number;
mind?: number;
social?: number;
};
}

4.2. CaveSystem Logic

File: src/game/systems/CaveSystem.ts

Responsibility: Monitor XP accumulation and trigger the draft event.

Logic:

Calculate nextXp and currentLevel.

Check resolveXpThreshold(currentLevel).

Condition: If nextXp >= threshold:

Deduct threshold from nextXp.

Increment nextLevel.

Action: Enqueue TRIGGER_DRAFT with poolId: "pool_level_up".

Constraint: Process only one level up per tick to ensure the Draft UI has time to open and block execution before the next level is processed.

4.3. ActionExecutor Routing

File: src/engine/runtime/systems/behavior/ActionExecutor.ts

Responsibility: Interpret generic MUTATE actions from the Draft Option payload and route them to the specific UPDATE_CAVE command.

Logic:

In executeMutate: Check if action.target contains the substring ".cave.".

If true, delegate to executeCaveMutation.

Resolution:

Resolve action.value (supports expressions like global.efficiency \* 0.1).

Resolve action.op (ADD/SUB/SET).

Extract entityId from target string (handle sys_world or self context).

Dispatch:

If target ends in .attributes.body -> Enqueue UPDATE_CAVE with { attributes: { body: value } }.

Repeat for mind and social.

Interface Contract:
Input Action: { type: "MUTATE", target: "sys_world.cave.attributes.body", op: "ADD", value: 1 }
Output Command: UPDATE_CAVE { entityId: "sys_world", attributes: { body: <new_value> } }

4.4. Handler Implementation

File: src/engine/runtime/handlers/UpdateCaveHandler.ts

Responsibility: Apply the payload to the runtime entity state.

Logic:

Locate entity by entityId.

Verify existence of cave component.

If payload.attributes exists:

Merge keys into entity.cave.attributes.

Example: entity.cave.attributes = { ...entity.cave.attributes, ...payload.attributes }.

4.5. Data Definition

File: src/data/raw/draft_content.json

Responsibility: Define the loot table and rewards.

Structure:

draftPools.pool_level_up: Contains references to the 3 attribute options.

draftOptions:

reward_cave_body: MUTATE sys_world.cave.attributes.body ADD 1.

reward_cave_mind: MUTATE sys_world.cave.attributes.mind ADD 1.

reward_cave_social: MUTATE sys_world.cave.attributes.social ADD 1.

5. Verification Plan

5.1. Unit Tests (ActionExecutor)

Test: Create a MUTATE action targeting sys_world.cave.attributes.body.

Assert: Verify that UPDATE_CAVE command is enqueued with the correct attributes payload.

Assert: Verify standard UPDATE_STATE is not enqueued.

5.2. Integration Tests (CaveSystem)

Setup: Initialize runtime with sys_world at 0 XP.

Action: Add XP > Threshold via ADJUST_STATE.

Tick: Run runtime.tick().

Assert: Verify TRIGGER_DRAFT command is present in the command buffer.

Assert: Verify Level increment command is present.

5.3. Integration Tests (UpdateCaveHandler)

Setup: Entity with cave: { attributes: { body: 1 } }.

Action: Execute UPDATE_CAVE with { attributes: { body: 5 } }.

Assert: Entity state reflects body: 5 (or merged result if partial).
