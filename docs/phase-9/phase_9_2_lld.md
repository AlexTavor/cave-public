Low-Level Design: Phase 9 Refinements (Taxonomy & Feedback)

Status: Draft
Scope: Architecture Refactor (Cave), UI Reactivity (Face/Swarm), Feedback Logic (Starvation).
Context: Post-Phase 9 Vitality implementation.

1. Overview & Objectives

Why

Taxonomy Pollution: The sys_world (Cave) currently uses a BodyComponent to store attributes. This causes it to be incorrectly counted in the Census, damaged by Vitality starvation logic, and treated as a worker in the codebase.

Opaque Progression: The FaceCard displays raw numbers for XP/Level without context, making it hard to gauge progress.

Performance & Feedback: The SwarmCard causes massive re-renders by passing full objects down to rows, and lacks visual indicators for the new starvation mechanics introduced in Phase 9.

What

Segregation: Replace BodyComponent on sys_world with a distinct CaveComponent. Introduce a CaveSystem to handle its specific progression logic.

Visualization: Add Progress Bars to FaceCard.

Reactivity: Refactor SwarmCard rows to use granular selectors (id-based) instead of prop drilling. Visualize "Starving" status via a transient trait.

2. Architecture: The Cave Separation

2.1 Schema Definition

File: src/data/schemas/game/cave.ts (New)
Responsibility: Define the data structure for the Cave's physical/metaphysical stats, distinct from biological bodies.

Export: CaveComponentSchema
Logic:
Mirror the structure of BodyComponent but semantically distinct.

export const CaveComponentSchema = z.object({
level: z.number().default(1),
xp: z.number().default(0),
xpRate: z.number().default(1),
attributes: AttributeSetSchema.default({
body: 10,
mind: 10,
social: 10
})
});

File: src/data/schemas/components.ts
Responsibility: Register the new component.
Logic: Add cave: CaveComponentSchema.optional() to BlueprintSchema components.

2.2 System Split

File: src/game/systems/CaveSystem.ts (New)
Responsibility: Handle XP accumulation and Leveling for the Cave entity specifically.
Interface: implements System
Logic:

Query for entity with cave component (effectively sys_world).

Apply xpRate \* dt.

Check Level Threshold (reuse resolveXpThreshold logic or similar formula).

If threshold met:

Increment Level.

Reset XP (or carry over).

Emit UPDATE_STATE (or similar command) to persist changes.

Note: Cave attributes typically scale with level or are mutated by other events; for now, ensure basic leveling works.

File: src/game/systems/BodySystem.ts
Change: No code change required if implemented correctly, as it iterates entities with .body. Since sys_world will lose .body, it will naturally be excluded.

File: src/game/systems/VitalitySystem.ts
Change: No code change required for exclusion (it uses resolveBodies helper).

File: src/game/systems/CensusSystem.ts
Change: No code change required (it filters based on body presence).

File: src/game/main.ts
Change: Register CaveSystem.

2.3 Data Migration

File: src/data/raw/game_loop_v2.json
Change:

Locate sys_world blueprint.

Remove body component block.

Add cave component block with the same initial values.

3. Feature: FaceCard Bars

3.1 XP Threshold Exposure

File: src/game/systems/body/progression.ts
Change: Export resolveXpThreshold(level: number): number.

Ensure this logic is deterministic and accessible to the UI layer without importing the full system.

3.2 UI Implementation

File: src/ui/runtime/world/selection/FaceCard.tsx
Change:

Health Bar:

Use useEntitySelector to fetch body.health and body.maxHealth.

Render a ProgressBar (Color: #4caf50).

XP Bar:

Use useEntitySelector to fetch body.level and body.xp.

Calculate maxXP = resolveXpThreshold(level) inside the component.

Render a ProgressBar (Color: #FFC107 / Gold).

4. Feature: SwarmCard Reactivity & Starvation

4.1 Trait Logic (Starvation)

File: src/game/systems/VitalitySystem.ts
Change: Update tick logic.

Logic:

Calculate foodDeficitRatio.

Iterate bodies.

If foodDeficitRatio > 0: Emit ADD_TRAIT command for trait ID "starving".

If foodDeficitRatio <= 0: Emit REMOVE_TRAIT command for trait ID "starving".

Constraint: Use UPDATE_BODIES_BATCH to handle traits efficiently if possible, or individual commands.

File: src/data/schemas/game/traits.ts (or Cartridge Data)
Change: Ensure "starving" is a known trait ID (even if it has no stat modifiers yet, it acts as a marker).

4.2 Swarm List Refactor

File: src/ui/runtime/world/selection/selectionUtils.ts
Change:

Modify resolveSwarmMembers (or create resolveSwarmMemberIds) to return only a list of Entity IDs (strings), sorted by logic.

Do not return full state objects (health, xp, etc.) in this list construction to avoid dirty-checking failures.

File: src/ui/runtime/world/selection/SwarmCard.tsx
Change:

List Component: Receive list of IDs.

Row Component (SwarmRowItem):

Props: { entityId: string } (instead of member object).

Selectors:

useEntitySelector(..., entityId, e => e.body.health)

useEntitySelector(..., entityId, e => e.body.traits)

useEntitySelector(..., entityId, e => e.body.xp)

Visuals:

Render Bars using the selected live values.

Render "Starving" icon (e.g., 🍽️ or ⚠️) if traits.includes('starving').

Render "Cold" icon if traits.includes('cold').

5. Testing Strategy

5.1 Cave System

Test: CaveSystem.test.ts

Given: An entity with cave component (XP: 99, Level: 1).

When: Tick with enough DT to cross threshold.

Then: Level becomes 2, XP resets/overflows. Command emitted.

5.2 Vitality Traits

Test: VitalitySystem.test.ts

Given: High food demand, 0 food in storage.

When: Tick.

Then: UPDATE_BODIES_BATCH command contains traits: [..., "starving"].

5.3 UI Smoke Tests

Test: FaceCard.test.tsx

Action: Render with a mock Runtime.

Assert: Progress bars are present in the DOM.

Test: SwarmCard.test.tsx

Action: Render with mock Runtime and a starving entity.

Assert: "Starving" icon is rendered for that row.
