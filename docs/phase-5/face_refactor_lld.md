Low-Level Design: Dynamic Face & Swarm Lifecycle

1. Overview

This document details the implementation of a reactive lifecycle for "Face" and "Swarm" entities within the FaceSystem. Currently, these entities are statically defined in the boot script, leading to visual discrepancies where UI nodes exist for non-existent population tiers.

The new design shifts ownership of these entities from the Level Loader (game_loop.cvs) to the Simulation Logic (FaceSystem), ensuring the visual representation strictly matches the underlying population simulation.

2. Goals

Population-Driven Visibility:

0 Bodies: No Faces, No Swarm.

1-3 Bodies: 1-3 Faces (matching top citizens), No Swarm.

4+ Bodies: 3 Faces, 1 Swarm.

Aggregate Exclusion: Ensure abstract entities (like sys_swarm) are never eligible for Face slots.

Self-Correction: The system must automatically spawn missing entities and cull excess entities every tick.

3. Data & Configuration Changes

3.1 Blueprint Schema (src/data/raw/game_loop_v2.json)

Why: The FaceSystem needs a deterministic way to distinguish between a "real" worker body and the "aggregate" swarm body, as both possess a body component.

Change:

Add tag "aggregate" to the sys_swarm blueprint.

Impact: Enables filtering in ECS queries.

3.2 Boot Script (game_loop.cvs)

Why: Static initialization conflicts with dynamic lifecycle management.

Change:

Remove: game.spawn sys_swarm ...

Remove: game.spawn face_body ..., game.spawn face_mind ..., game.spawn face_social ...

Result: The game starts clean; FaceSystem will spawn necessary entities on the very first tick logic.

4. System Logic Design (src/game/systems/FaceSystem.ts)

4.1 Query Refinement

The system currently queries all entities with a body component. This must be tightened.

Logic:

const validBodies = entities.filter(e =>
e.hasComponent("body") AND
!e.tags.includes("aggregate")
);

4.2 Lifecycle Management Phase

Before assigning faces (existing logic), the system must ensure the correct entities exist. This logic runs at the start of tick().

Step A: Swarm Lifecycle

Threshold: SWARM_THRESHOLD = 3

Condition: population = validBodies.length

Logic:

IF population > SWARM_THRESHOLD AND sys_swarm is missing:

Emit SPAWN command for sys_swarm.

IF population <= SWARM_THRESHOLD AND sys_swarm exists:

Emit KILL command for sys_swarm.

Step B: Face Lifecycle

Cap: MAX_FACES = 3

Selection:

Sort validBodies by total attribute score (descending).

Select top N bodies, where N = min(population, MAX_FACES).

For each top body, determine its Dominant Attribute (Body, Mind, or Social).

Map these to required Blueprint IDs (e.g., face_body, face_mind).

Reconciliation:

Count existing Face entities grouped by Blueprint ID.

Count required Face entities grouped by Blueprint ID.

Diff:

Deficit: Emit SPAWN for the specific Face blueprint.

Surplus: Emit KILL for excess Face entities (LIFO preference to minimize churn).

4.3 Assignment Phase (Existing)

The existing assignment logic remains but operates on the current set of Faces.

Constraint: Ensure the assignment map is cleaned up if a Face entity is killed.

5. Testing Strategy (src/game/systems/FaceSystem.test.ts)

5.1 Lifecycle Tests

Given 4 bodies:

Then SPAWN sys_swarm command is emitted.

Then 3 SPAWN face\_\* commands are emitted.

Given 2 bodies:

Then KILL sys_swarm command is emitted (if it existed).

Then Face count reconciles to 2.

5.2 Exclusion Tests

Given 3 normal bodies + 1 entity with tag "aggregate":

Then Swarm is NOT spawned (Population is counted as 3, not 4).

Then The aggregate entity is never assigned to a Face slot.

5.3 Dynamic Adaptation

Given 1 body with high mind:

Then face_mind is spawned.

When that body is mutated to have high body:

Then face_mind is killed, face_body is spawned (eventually, via reconciliation).

6. Implementation Plan

JSON: Tag sys_swarm as aggregate in game_loop_v2.json.

CVS: Remove static spawns for faces and swarm from game_loop.cvs.

TS: Implement manageLifecycle method in FaceSystem.ts.

TS: Integrate manageLifecycle call at the start of tick in FaceSystem.ts.

TS: Update identifyEntities in FaceSystem.ts to filter out aggregate bodies.

Tests: Add lifecycle, exclusion, and adaptation tests to FaceSystem.test.ts.
