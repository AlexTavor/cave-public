Low-Level Design: Dormancy System

1. Overview

The Why: When the Cave loses all workers (population reaches 0), the game enters a "lose state" called Dormancy. To support the roguelite meta-progression, the Cave's physical manifestations and temporary workers are wiped, but its core essence (Attributes, XP, and Level) persists across cycles. A randomized, deterministic amount of time (1-20 years) passes during this state, communicated via a cinematic, before a new cycle begins.

The What: 1. A structural shift to isolate xp and level into a dedicated progression object within the CaveComponent. 2. A two-phase command pipeline: GAME_DORMANCY (wipes the board, calculates time skip, sets dormant flag) and AWAKEN_CAVE (clears flags, spawns the initial worker). 3. A self-contained UI wrapper (DormancyOverlay) that reacts to the dormant state, plays the cinematic, and dispatches the awaken command without polluting the core RuntimeShell.

The How: Defined step-by-step in the file modifications below, ensuring deterministic execution and strict ECS state ownership.

2. File Specifications & Responsibilities

2.1. Schema & Data Structures

File: src/data/schemas/game/cave.ts

Responsibility: Defines the structural truth of the Cave's persistent essence.

Logic/Interface: Create a new ProgressionSchema object. Nest it alongside attributes inside the CaveComponentSchema.

import { z } from "zod";
import { AttributeSetSchema } from "./body";

export const ProgressionSchema = z.object({
xp: z.number().default(0),
level: z.number().int().min(1).default(1),
});

export const CaveComponentSchema = z.object({
attributes: AttributeSetSchema.default({
body: 10,
mind: 10,
social: 10,
}),
progression: ProgressionSchema.default({ xp: 0, level: 1 }),
});

export type CaveComponent = z.infer<typeof CaveComponentSchema>;

File: src/data/schemas/v2/systemDefaults.ts

Responsibility: Provides the initial hydration state for sys_world.

Logic: Update DEFAULT_WORLD_ENTITY to initialize cave.progression. Remove any legacy xp/level from the generic state component to prevent ambiguity.

2.2. Core Systems

File: src/game/systems/CensusSystem.ts

Responsibility: Detects extinction and initiates Dormancy.

Logic: \* Read current population.

If population === 0 AND tick > 10 (to prevent immediate triggers before the first spawn) AND the entity does not already have a dormant state flag, enqueue the GAME_DORMANCY command.

File: src/game/systems/CaveSystem.ts

Responsibility: Manages Cave leveling logic.

Logic: Read xp and level strictly from world.cave.progression. When the threshold is met, emit UPDATE_CAVE targeting the new progression structure.

2.3. Command Handlers

File: src/engine/runtime/types.ts & src/engine/runtime/types/runtimeCommandTypes.ts

Responsibility: Registers the new command type and payload.

Logic: \* Add AWAKEN_CAVE to RuntimeCommandType.

Define AwakenCaveCommandPayload containing the persistent attributes and progression.

Add to RuntimeCommand union.

File: src/game/handlers/DormancyHandler.ts

Responsibility: Executes the board wipe and sets up the deterministic time skip.

Logic:

Removes all entities except sys_world.

Calls resetWorldState(worldEntity, context) to wipe transient states (heat, food, etc.).

Calculates deterministic yearsPassed (1-20) to strictly respect the Context Pack's determinism rule without injecting a new RNG service. Derivation uses a hash of the persistent cave stats:

const { xp, level } = worldEntity.cave.progression;
const yearsPassed = ((xp + (level \* 7)) % 20) + 1;

Mutates sys_world.state (post-reset) to inject two runtime flags:

worldEntity.state.dormant = { value: 1, visible: false };
worldEntity.state.dormancy_years = { value: yearsPassed, visible: false };

File: src/game/handlers/AwakenCaveHandler.ts (NEW)

Responsibility: Restores the active game loop after the cinematic.

Interface: Implements CommandHandler<AwakenCaveCommand>.

Logic:

Removes the dormant and dormancy_years entries from sys_world.state.

Ensures sys_world.cave values match the payload (carrying over from the run).

Enqueues a SPAWN command to generate the initial char_worker (Adam/Eve).

Logs the awakening to telemetry.

File: src/game/handlers/UpdateCaveHandler.ts

Responsibility: Applies XP/Level updates safely.

Logic: Update to ensure it maps incoming xp and level payload values directly to entity.cave.progression.xp and entity.cave.progression.level.

File: src/game/main.ts

Responsibility: Engine wiring.

Logic: Register AwakenCaveHandler within createGame.

2.4. UI & Presentation

File: src/ui/runtime/dormancy/DormancyOverlay.tsx (NEW)

Responsibility: A self-contained observer that triggers the cinematic and dispatches the awaken command. Keeps RuntimeShell completely agnostic of Dormancy logic.

Logic:

Uses useEntityQuery to find sys_world.

Extracts state.dormant.value and state.dormancy_years.value.

If dormant === 1, it renders <Cinematic /> with a dynamically generated array:
["The hunger fades.", "Silence falls.", \${yearsPassed} years pass...`, "But the Cave remembers."]`

Provides an onComplete callback to the <Cinematic /> which grabs runtime.commands.enqueue to fire the AWAKEN_CAVE command, passing the persistent xp, level, and attributes from the world entity.

Returns null if not dormant.

File: src/ui/runtime/shell/RuntimeShell.tsx

Responsibility: Layout orchestration.

Logic: Import and mount <DormancyOverlay /> as a sibling to <DraftOverlay /> inside the <EntityStateLinkProvider>. Absolutely no logic, state, or conditional rendering related to dormancy is added here.

3. Testing Strategy

This design enforces behavioral testing isolated from the UI, following the AAA (Arrange, Act, Assert) standard defined in the Testing Standards.

Unit Tests (DormancyHandler.test.ts):

Given a makeTestWorld() containing sys_world (with specific XP/Level in cave.progression) and 3 worker entities.

When GAME_DORMANCY is handled.

Then only sys_world remains in the world. Transient states (food/heat) are reset to defaults. cave.progression remains strictly intact. state.dormant.value is 1. state.dormancy_years.value is calculated deterministically between 1 and 20.

Unit Tests (AwakenCaveHandler.test.ts):

Given a dormant sys_world entity.

When AWAKEN_CAVE is handled.

Then the dormant and dormancy_years states are deleted, and a SPAWN command for a worker is correctly enqueued in the command buffer.

Integration Tests (CensusSystem.test.ts):

Given a world with sys_world and 0 workers, where snapshot.getGlobal('tick') > 10.

When runSystemTick(world, new CensusSystem()) fires.

Then it enqueues a GAME_DORMANCY command.

View Smoke Test (DormancyOverlay.test.tsx):

Given a mocked runtime where sys_world has state: { dormant: { value: 1 }, dormancy_years: { value: 14 } }.

When DormancyOverlay renders.

Then it outputs the <Cinematic> component containing the exact text "14 years pass...".
