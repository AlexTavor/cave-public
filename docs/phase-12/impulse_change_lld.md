Low-Level Design: Impulse Engine Ghosting & Wobble

1. Overview

This design implements "Ghost Mode" for transfer nodes and a deterministic "Wobble" force to create organic, non-overlapping paths.

Goals

Ghost Mode: Transfer nodes must pass through each other (ignore mutual collision) but still steer around static buildings.

Optimization: Exclude transfer nodes from the Quadtree to reduce insertion/query costs ($O(N)$ vs $O(N^2)$).

Wobble: Apply a deterministic, per-entity noise force to break up linear paths.

Strategy

Collision Layers: Introduce layer to PhysicsBody ("default" vs "phantom").

Spatial Indexing: Update ImpulseSpatialIndex to ignore "phantom" bodies during insertion.

Deterministic Noise: Add seed to PhysicsBody and compute a time-based wobble force in the steering pipeline.

2. Data Structures

2.1 Physics Schema

File: src/data/schemas/physics.ts

Extend ImpulseConfig to include noise parameters.

export const ImpulseConfigSchema = z.object({
// ... existing fields
noise: z.object({
magnitude: z.number().default(0),
frequency: z.number().default(0),
}).default({}),
});

2.2 Physics Types

File: src/engine/physics/impulse/types.ts

Update PhysicsBody to support layering and deterministic noise.

export type PhysicsLayer = "default" | "phantom";

export interface PhysicsBody {
// ... existing fields
layer: PhysicsLayer; // Default: "default"
seed: number; // Deterministic random seed (0-1) for noise
}

3. Core Logic & Algorithms

3.1 Spatial Index Optimization

File: src/engine/physics/impulse/ImpulseSpatialIndex.ts

Responsibility: Construct the Quadtree, explicitly excluding "phantom" bodies.

Logic:

In buildSpatialIndex, iterate over all bodies.

If body.layer === "phantom", SKIP insertion.

Return the populated tree.

Why:

Phantom bodies (Transfer Nodes) will never be returned by queryRadius.

Therefore, they effectively "ignore" each other during separation calculations.

However, they can still query the tree (in ImpulseSteeringApply), allowing them to see and avoid "default" bodies (Buildings).

3.2 Wobble Force Calculation

File: src/engine/physics/impulse/ImpulseSteeringForces.ts

Responsibility: Compute the deterministic wobble vector.

Interface:

export const computeWobbleForce = (
body: PhysicsBody,
config: ImpulseConfig,
time: number
): Vector2;

Logic:

If config.noise.magnitude <= 0, return {x: 0, y: 0}.

Calculate phase: theta = time _ config.noise.frequency + (body.seed _ Math.PI \* 2).

x = Math.cos(theta) \* config.noise.magnitude

y = Math.sin(theta) \* config.noise.magnitude

Return {x, y}.

3.3 Steering Application

File: src/engine/physics/impulse/ImpulseSteeringApply.ts

Responsibility: Orchestrate force application, now including time for wobble.

Changes:

Update applySteeringForBody signature to accept time: number.

Call computeWobbleForce and add the result to body.acceleration.

4. Engine Orchestration

4.1 Time Tracking & Execution

File: src/engine/physics/impulse/ImpulseEngine.ts

Responsibility: Manage simulation time and propagate it to steering logic.

Changes:

Add private accumulatedTime: number = 0 to class.

In tick(dt):

Increment this.accumulatedTime += dt.

In applySteering():

Pass this.accumulatedTime to applySteeringForBody.

In addBody(body):

Ensure body.layer defaults to "default" if undefined.

Ensure body.seed is set (if not provided, hash the ID).

5. Runtime Integration

5.1 Deterministic Utilities

File: src/utils/deterministicHash.ts (New File)

Responsibility: Provide stable hashing for IDs.

Interface:

export const stringHash = (id: string): number => {
// Implementation: simple cyclic shift or multiply-add to float 0-1
};

5.2 Body Factories

Files:

src/engine/runtime/handlers/spawnUtils.ts (Static Entities)

src/engine/runtime/handlers/transferUtils.ts (Transfer Nodes)

Responsibility: Correctly initialize layer and seed during body creation.

Logic (spawnUtils.ts):

buildPhysicsBody:

Set layer: "default".

Set seed: stringHash(id).

Logic (transferUtils.ts):

buildPendingBody:

Set layer: "phantom".

Set seed: stringHash(id).

6. Test Plan

6.1 Unit Tests (ImpulseSpatialIndex.test.ts)

Given a list of bodies including mixed "default" and "phantom" layers.

When buildSpatialIndex is called.

Then assert that querying the tree only returns "default" bodies.

Then assert that "phantom" bodies are absent from queries.

6.2 Unit Tests (ImpulseSteeringForces.test.ts)

Given a body with a specific seed and config with non-zero noise.

When computeWobbleForce is called at different time intervals.

Then assert the output vector rotates/changes deterministically.

Then assert different seeds produce different vectors at time=0.

6.3 Integration Tests (ImpulseEngine.test.ts)

Scenario: Ghost Interaction

Given two "phantom" bodies initialized at the exact same position (overlapping).

When engine.tick(dt) runs for several frames.

Then assert their positions remain identical (no separation force applied).

Scenario: Obstacle Avoidance

Given one "phantom" body and one "default" body initialized overlapping.

When engine.tick(dt) runs.

Then assert the "phantom" body moves away (separation force applied).
