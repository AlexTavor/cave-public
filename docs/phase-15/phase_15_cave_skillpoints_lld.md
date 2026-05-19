Low-Level Design: Persistent Skill Points & Decoupled Draft Triggering

1. Overview

This design addresses the issue where level-up events are lost if they occur immediately prior to the game entering a dormant state (e.g., reloading, saving/quitting). Currently, CaveSystem triggers a draft immediately upon leveling up. If the session is interrupted before the draft resolves, the level-up is forgotten, but the required XP is already consumed.

We will introduce a persistent skillpoints counter to the CaveComponent. The level-up sequence will be decoupled into two distinct phases:

XP Processing: When XP crosses the threshold, increment level and skillpoints (and deduct threshold from XP).

Draft Triggering: Separately, if skillpoints > 0 and no draft is currently active, consume 1 skill point and trigger a draft.

2. Why

Data Integrity: Prevents the loss of player progression during state transitions. Leveling up becomes a durable state (points) rather than a transient, immediately-consumed event.

Decoupling: Separates the mathematical logic of progression (XP -> Level) from the UI/Gameplay consequence (Drafts), resulting in cleaner, single-responsibility system ticks.

Resilience: If the game is suspended while skillpoints > 0, the system will simply re-evaluate and trigger the draft upon waking, ensuring the player always receives their reward.

3. What & How

3.1 Data Schema Changes

The CaveComponent schema must define the new persistent field.

File: src/data/schemas/game/cave.ts

Responsibility: Define the shape of the Cave component.

Logic: Update ProgressionSchema to include skillpoints: z.number().default(0).

3.2 Command Payloads

Command payloads must be updated to transport the new skillpoints data.

File: src/engine/runtime/types/runtimeCommandPayloadsUpdate.ts

Responsibility: Define payloads for update commands.

Logic: Update UpdateCaveCommandPayload to include an optional skillpoints?: number property.

File: src/engine/runtime/types/runtimeCommandPayloadsAbsorption.ts

Responsibility: Define payloads for absorption/dormancy events.

Logic: Update AwakenCaveCommandPayload's progression object type definition to strictly require skillpoints: number, matching the updated schema.

3.3 Runtime Handlers

Handlers must interpret the payload fields and apply them directly to ECS entities during the apply phase.

File: src/engine/runtime/handlers/UpdateCaveHandler.ts

Responsibility: Mutate the target entity with the payload's UpdateCaveCommand properties.

Logic: \* Extract skillpoints from command.payload.

If skillpoints is provided (typeof number), assign it to component.progression.skillpoints.

File: src/game/handlers/dormancyFlush.ts

Responsibility: Flush pending state into persistent components before saving.

Logic: \* In flushCaveXp, ensure that the object spread or assignment used to update cave.progression.xp does not accidentally omit or erase the existing skillpoints value due to strict typing.

Expand the inline cast of cave.progression to include skillpoints: number.

3.4 Systems

The core logic resides in CaveSystem, which must process XP and trigger drafts in a mutually exclusive manner to guarantee command stability.

File: src/game/systems/CaveSystem.ts

Responsibility: Manage XP thresholds, level-ups, and draft triggering.

Dependencies: Import isDraftActive from ../../engine/runtime/runtimePauseState.

Logic:

Draft Triggering Phase (Priority):

Read skillpoints from sys_world.cave.progression.

If skillpoints > 0 AND !isDraftActive(snapshot):

Enqueue TRIGGER_DRAFT command (pool: pool_level_up, entityId: sys_world).

Enqueue UPDATE_CAVE command to decrement skillpoints by 1.

RETURN early. Do not process XP or drain state XP this tick. This ensures atomic isolation between consuming a skill point and gaining a new one.

XP Processing Phase:

Call drainStateXp to extract buffered XP.

If stateXp === 0, return early.

Calculate currentXp = current.xp + stateXp.

Calculate threshold = resolveXpThreshold(current.level).

If currentXp >= threshold:

Enqueue UPDATE_CAVE with:

level: current.level + 1

xp: currentXp - threshold

skillpoints: current.skillpoints + 1

Else:

Enqueue UPDATE_CAVE with xp: currentXp.

4. Verification Plan (Integration Testing)

Tests must adhere strictly to testing-standards.md, utilizing factories and the Given-When-Then structure.

Target: src/game/systems/CaveSystem.test.ts

Scenario 1: Standard Level Up (Generates Skillpoint)

Given: A world with sys_world containing xp just below threshold, and state.xp pushing it over. skillpoints = 0.

When: CaveSystem ticks.

Then: UPDATE_CAVE is emitted containing level + 1, adjusted xp, and skillpoints: 1. No TRIGGER_DRAFT is emitted.

Scenario 2: Draft Triggering (Consumes Skillpoint)

Given: A world with sys_world having skillpoints: 1. No active draft.

When: CaveSystem ticks.

Then: TRIGGER_DRAFT is emitted. UPDATE_CAVE is emitted with skillpoints: 0.

Scenario 3: Blocked Draft (Pending)

Given: A world with sys_world having skillpoints: 1. Active draft is true (isDraftActive returns true).

When: CaveSystem ticks.

Then: No commands are emitted (wait for draft to resolve).

Scenario 4: Mutual Exclusion (No race conditions)

Given: A world with sys_world having skillpoints: 1, AND state.xp is enough to trigger another level up. No active draft.

When: CaveSystem ticks.

Then: Only the TRIGGER_DRAFT and UPDATE_CAVE (skillpoints: 0) are emitted. ADJUST_STATE (XP drain) is NOT emitted. (Verifies the early return).

Target: src/engine/runtime/handlers/UpdateCaveHandler.test.ts

Scenario: Updates Skillpoints

Given: A world entity with a cave component.

When: UpdateCaveHandler applies a command with { skillpoints: 5 }.

Then: The entity's cave.progression.skillpoints strictly equals 5.
