Phase 8 v3 LLD: Additive Metabolic Bonus

1. Context & Motivation

The Problem

The previous metabolic implementation used a multiplicative penalty for low Cave Health.

Formula: WorkerAttributes = Base \* CaveHealth%

Result: If Cave Health drops to 0 (e.g., initialization lag or resource outage), all workers instantly drop to 0 attributes. This causes a "Death Spiral" where they cannot work to restore the cave.

The Solution

Switch to an additive bonus model.

The Cave possesses its own attributes (Body, Mind, Social).

These attributes represent the "Global Bonus Pool".

Cave Health determines how much of this bonus is accessible.

Formula: WorkerAttributes = WorkerBase + (CaveAttributes \* CaveHealth%).

Result: Even at 0 Health, workers retain their base competence.

2. Functional Specification

2.1 Cave Definition (sys_world)

The Cave entity must now act as both a Physiological Body (having attributes) and a Thermodynamic System (managing heat/food).

Physics: Must be dynamic (isStatic: true but present) or properly positioned to allow visual transfers.

Body: Contains baseAttributes defining the max bonus.

State: Contains health, heat, food.

2.2 Attribute Calculation (BodySystem)

The BodySystem tick logic must be refactored to:

Fetch sys_world entity.

Extract health (0.0 - 1.0).

Extract caveAttributes.

Calculate EffectiveBonus = caveAttributes \* health.

Apply Final = WorkerBase + EffectiveBonus to all workers.

2.3 UI Representation (CaveCard)

A generic "Resource Pool" card is insufficient for the central game node.

New Component: CaveCard.tsx.

Display:

"Global Heart" subtitle.

Explicit Health Bar (distinct from generic progress bars).

Grid display of the Bonus Attributes (Body/Mind/Social) provided to the colony.

3. Implementation Plan

3.1 Data Schema (src/data/raw/game_loop_v2.json)

Changes:

Update sys_world blueprint.

Add body component with { "attributes": { "body": 10, "mind": 10, "social": 10 } }.

Ensure state.health defaults to 1.0 to prevent frame-one starvation.

3.2 Runtime Logic (src/game/systems/body/)

processEntity.ts:

Interface: Update function signature to accept caveAttributes: AttributeTotals.

Logic:

const bonus = {
body: Math.floor(caveAttributes.body _ healthMultiplier),
mind: Math.floor(caveAttributes.mind _ healthMultiplier),
social: Math.floor(caveAttributes.social \* healthMultiplier)
};
const derived = {
body: progression.derived.body + bonus.body,
// ...
};

BodySystem.ts:

Responsibility: Extract sys_world attributes once per tick and pass them to processEntity.

3.3 UI Components (src/ui/runtime/world/selection/)

CaveCard.tsx:

Create new component matching SelectionLens contract.

Use ProgressBar for Health.

Use GameIcon grid for Attributes.

selectionLensMap.ts:

Register CaveCard with priority matcher: (e) => e.id === "sys_world".

3.4 Orchestration (game_loop.cvs)

Changes:

Explicitly game.kill sys_world (the engine default) before spawning the blueprint version to ensure the blueprint's body component is active.

Position infrastructure (hearth, pot) at a distance from sys_world to ensure TransferHandler generates visible flight paths.

4. Test Specifications

4.1 Unit Test: Additive Math

File: src/game/systems/BodySystem.test.ts

Scenario: Cave Health 0.5, Cave Body 10, Worker Base 5.

Expected: 5 + (10 \* 0.5) = 10.

Scenario: Cave Health 0.0, Cave Body 10, Worker Base 5.

Expected: 5 + (10 \* 0.0) = 5 (Not 0).

4.2 Integration Test: Visualization

Manual Verification:

Select Cave -> Verify "Global Heart" card appears.

Drag Cave -> Verify it moves (requires physics component in blueprint).

Observe Transfers -> Resources visually fly from Hearth to Cave.
