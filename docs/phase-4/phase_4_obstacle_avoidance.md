High-Level Design: Impulse Engine Advanced Steering

1. Introduction

1.1 Problem Statement

The current ImpulseEngine relies on basic Seek (target pursuit) and Separation (crowd dispersion). This creates two main issues:

Deadlocks: Entities get stuck on static obstacles when forces cancel out (e.g., pulling forward vs. pushing backward).

Chaotic Movement: Entities move individually with no awareness of the group flow, resulting in jittery, unorganized paths rather than smooth "rivers" of traffic.

1.2 Objective

Implement a composite Steering System that layers Obstacle Avoidance (for safety) with Flocking Behaviors (for fluid motion).

Obstacle Avoidance: Predictive steering to navigate around static bodies.

Flocking (Reynolds): Alignment and Cohesion to make entities form distinct, cohesive streams ("rivers") as they travel toward shared targets.

2. Architecture

2.1 New Components

src/engine/physics/impulse/ImpulseObstacleAvoidance.ts: Handles static collision prediction.

src/engine/physics/impulse/ImpulseFlocking.ts: Handles Alignment and Cohesion calculations.

2.2 Configuration Updates

The ImpulseConfig schema will be extended to support tuning for these behaviors.

Setting

Description

Default

avoidanceForce

Max force to steer away from static obstacles.

2.0

lookAheadDistance

How far ahead (pixels) to detect obstacles.

40

alignmentWeight

Strength of matching neighbors' velocity (smooth flow).

0.5

cohesionWeight

Strength of moving toward group center (bundling).

0.1

separationWeight

(Existing) Strength of pushing away from neighbors.

1.0

flockingRadius

Radius to check for neighbors (flockmates).

60

2.3 Integration Point

All behaviors will be integrated into the ImpulseEngine.ts tick loop. They will share a single spatial query to minimize performance overhead.

3. Obstacle Avoidance (The Safety Layer)

Goal: Don't hit walls.

3.1 The "Feeler" Mechanism

Project a vector forward from the entity based on velocity.
feeler = position + (velocity_normalized \* lookAheadDistance)

3.2 Spatial Query & Filter

Query the Quadtree at the feeler's position.

Filter: Keep only isStatic: true bodies.

Intersection: Perform a Line-Circle intersection test between the entity's path and the static body.

3.3 Steering Force

If an obstacle intersects the path:

Calculate a Lateral Force perpendicular to the obstacle surface.

Scale force by proximity (closer = stronger).

Tie-Breaker: If perfectly aligned (dead-center), apply a small deterministic bias to force a decision (e.g., steer right).

4. Flocking Behaviors (The Flow Layer)

Goal: Move as a liquid stream.

These behaviors operate on dynamic neighbors found within the flockingRadius.

4.1 Alignment (The "River" Flow)

Entities steer to match the average velocity of their neighbors.

Effect: Smoothing. If a neighbor is moving mostly East but dodging a rock, the entity will also start turning East before it even sees the rock. This creates laminar flow.

Calculation: avgVelocity = sum(neighbors.velocity) / count. Steering force = avgVelocity - currentVelocity.

4.2 Cohesion (The Bundle)

Entities steer toward the average position (center of mass) of their neighbors.

Effect: Grouping. Keeps the "river" distinct and prevents it from fraying into individual particles too easily.

Calculation: centerOfMass = sum(neighbors.position) / count. Steering force = seek(centerOfMass).

4.3 Separation (The Volume)

Existing behavior. Entities steer away from neighbors that are too close.

Effect: Volume. Prevents the river from collapsing into a single line. It gives the stream "width."

5. Integration Pipeline

The order of operations is critical for performance (shared queries) and behavior priority.

Updated Physics Tick:

Build Spatial Index: Construct Quadtree once.

Behavior Loop (Per Entity):

Context:

acceleration: Starts at 0.

neighbors: Query Quadtree once for radius max(flockingRadius, lookAheadDistance).

Step A: Obstacle Avoidance (Priority 1):

Filter neighbors for static.

Calculate lateral force.

Accumulate acceleration.

Step B: Flocking (Priority 2):

Filter neighbors for dynamic.

Separation: Calculate repulsion from close neighbors.

Alignment: Calculate velocity matching.

Cohesion: Calculate center-of-mass seeking.

Accumulate acceleration (weighted).

Step C: Seek (Priority 3):

Calculate force toward targetId.

Accumulate acceleration.

Integrate: Update position based on total acceleration.

5.1 Force Accumulation Strategy

To prevent unstable behavior, forces should be applied using a "weighted truncation" or simple accumulation:

acc = (Avoidance _ W_avoid) + (Separation _ W_sep) + (Alignment _ W_align) + (Cohesion _ W_coh) + (Seek \* W_seek)

Clamp the final acc magnitude to a maximum force to prevent "explosive" velocity changes.

6. Implementation Plan

Update Schema: Modify src/data/schemas/physics.ts with new weights.

Create ImpulseObstacleAvoidance.ts: Implement the feeler logic.

Create ImpulseFlocking.ts: Implement computeAlignment and computeCohesion.

Refactor ImpulseEngine.ts:

Replace the rigid applySeparation call with a flexible applySteering pipeline.

Ensure the Quadtree query is done efficiently to serve all behaviors.
