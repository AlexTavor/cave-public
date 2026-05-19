# Low-Level Design: Phase 4 - Obstacle Avoidance & Flocking

## 1. Overview

This phase implements composite steering behaviors to replace the primitive Seek/Separation model. The goal is to achieve fluid, "river-like" entity movement that naturally flows around static obstacles while maintaining group cohesion.

### 1.1 Goals

1. **Obstacle Avoidance**: Prevent deadlocks on static bodies using predictive ray-casting (feelers).
2. **Flocking**: Implement Reynolds' Alignment and Cohesion to group dynamic entities into organized streams.
3. **Composite Integration**: Centralize force accumulation in `ImpulseEngine` to manage priority and weighting of different behaviors.
4. **No Contract Breaks**: Avoid introducing new required fields on `PhysicsBody` (e.g., no stored `velocity`), and keep all steering as acceleration-only changes.

### 1.2 Architecture Changes

- **Data**: Extend `ImpulseConfig` with steering weights and look-ahead parameters.
- **Logic**: Introduce specialized stateless calculators for Avoidance and Flocking.
- **Engine**: Refactor `ImpulseEngine.tick` to perform a single spatial query per entity (with a reusable buffer) and accumulate weighted forces from all active behaviors.
- **Safety/Perf**: Preserve existing quadtree pooling/release patterns and avoid per-entity allocations in hot loops.

---

## 2. Data Layer

### 2.1 `src/data/schemas/physics.ts`

**Responsibility**: Define tunable parameters for the new steering behaviors.

**Changes**:
Update `ImpulseConfigSchema` and `DEFAULT_IMPULSE_CONFIG` with the following fields:

| Field               | Type   | Default | Description                                            |
| ------------------- | ------ | ------- | ------------------------------------------------------ |
| `avoidanceForce`    | number | 2.0     | Max force applied to steer away from static obstacles. |
| `lookAheadDistance` | number | 40.0    | Distance to project the predictive "feeler" vector.    |
| `alignmentWeight`   | number | 0.5     | Multiplier for matching heading with neighbors.        |
| `cohesionWeight`    | number | 0.1     | Multiplier for moving toward the group center.         |
| `flockingRadius`    | number | 60.0    | Radius to identify flockmates (dynamic neighbors).     |

**Note**: `separationStrength` exists and maps to the concept of "Separation Weight".

---

## 3. Logic Layer

### 3.0 Shared Helpers (New)

**Motivation**: The engine `PhysicsBody` does not store `velocity`. Steering must derive motion direction from existing state (`position`, `prevPosition`).

**Helper**: derive an instantaneous velocity proxy:

- `v = body.position - body.prevPosition`
- If `|v|` is extremely small (e.g. < 1e-6), treat as `{0,0}` and use deterministic fallbacks where a direction is required.

Optionally provide both:

- `getVelocityProxy(body): Vector2`
- `getHeading(body): Vector2` (normalized velocity proxy, or `{0,0}` if near-stationary)

**Location**: either colocate inside calculators or add `src/engine/physics/impulse/ImpulseSteeringMath.ts` for reuse.

---

### 3.1 `src/engine/physics/impulse/ImpulseObstacleAvoidance.ts` (New)

**Responsibility**: Calculate a steering force to avoid immediate collisions with static bodies.

**Logic**:

1. **Heading/Feeler Projection**
    - `heading = getHeading(body)`
    - If `heading == {0,0}` (stationary), use a deterministic fallback direction (see tie-breaker).
    - `feeler = heading * config.lookAheadDistance`
    - `start = body.position`
    - `end = body.position + feeler`

2. **Candidate Selection**
    - From `neighbors`, consider only **static** bodies (`isStatic: true`).

3. **Intersection Test**
    - Use a Line-Circle intersection check (segment from `start` to `end` vs obstacle circle).

4. **Prioritization**
    - Select the _closest_ intersecting obstacle (minimum intersection distance along the feeler).

5. **Steering Calculation**
    - Compute `away = (feelerTip - obstacleCenter)` (or `(body.position - obstacleCenter)` if inside overlap).
    - `force = normalize(away) * config.avoidanceForce`

6. **Deterministic Tie-Breaker (deadlock / symmetry)**
    - Trigger conditions (any of):
        - `away` is near-zero (entity centered on obstacle), or
        - heading is near-zero, or
        - computed `force` is near-zero despite intersection.
    - Deterministic rule (no randomness, no time-based noise):
        - If `heading` is non-zero: choose the **right-hand perpendicular** of `heading`:
            - `perpRight = { x: heading.y, y: -heading.x }`
            - `force = normalize(perpRight) * config.avoidanceForce`
        - Else (no heading): use a world-space constant right vector:
            - `force = { x: config.avoidanceForce, y: 0 }`

**Interface**:

```typescript
import { Vector2, PhysicsBody } from "./types";
import { ImpulseConfig } from "../../../data/schemas/physics";

export const computeObstacleAvoidance = (
    body: PhysicsBody,
    neighbors: PhysicsBody[],
    config: ImpulseConfig
): Vector2;
```

---

### 3.2 `src/engine/physics/impulse/ImpulseFlocking.ts` (New)

**Responsibility**: Calculate Alignment and Cohesion forces based on dynamic neighbors.

**Logic**:

1. **Neighbor Filtering**
    - Filter `neighbors` for **dynamic** bodies within `config.flockingRadius`.
    - Ignore `self` (same id).

2. **Alignment**
    - For each flockmate, compute `v_i = getVelocityProxy(flockmate)`.
    - Compute `avgV = average(v_i)` (vector average; can use heading average if desired).
    - Compute `selfV = getVelocityProxy(body)`.
    - `force = (avgV - selfV) * config.alignmentWeight`

3. **Cohesion**
    - Compute center of mass of flockmates: `center = average(position_i)`.
    - `force = seek(body.position, center) * config.cohesionWeight`

4. **Zero Handling**
    - If no neighbors are present, return zero vectors.
    - If a flockmate has near-zero velocity proxy, it still contributes position for cohesion; alignment can safely include `{0,0}` without special casing.

**Interface**:

```typescript
import { Vector2, PhysicsBody } from "./types";
import { ImpulseConfig } from "../../../data/schemas/physics";

export const computeAlignment = (
    body: PhysicsBody,
    neighbors: PhysicsBody[],
    config: ImpulseConfig
): Vector2;

export const computeCohesion = (
    body: PhysicsBody,
    neighbors: PhysicsBody[],
    config: ImpulseConfig
): Vector2;
```

---

### 3.3 `src/engine/physics/impulse/ImpulseSeparation.ts` (Refactor)

**Responsibility**: Refactor purely to expose a calculation function that returns a `Vector2` instead of mutating the body directly. This allows `ImpulseEngine` to manage force accumulation.

**Changes**:

- Export `computeSeparation(body, neighbors, config): Vector2`.
- Preserve existing `applySeparation` for backward compatibility (deprecate it or make it wrap `computeSeparation`).

---

## 4. Engine Core

### 4.1 `src/engine/physics/impulse/ImpulseEngine.ts`

**Responsibility**: Centralize the physics tick loop and steering integration.

**Refactor Logic (`applySteering`)**:

1. **Build Spatial Index**
    - Construct the Quadtree once per tick (existing logic).
    - Ensure the quadtree is always released back to the pool even if steering throws (use `try/finally`).

2. **Iterate Bodies**
    - Loop through all dynamic bodies.

3. **Unified Query (No Allocations)**
    - Determine:
        - `queryRadius = Math.max(config.flockingRadius, config.lookAheadDistance, config.defaultQueryRadius)`
    - Query the Quadtree once to get `neighbors`, **reusing a single preallocated buffer** (clear it per body).

4. **Accumulate Forces (Priority-aware)**
    - Compute:
        - `avoidance = computeObstacleAvoidance(body, neighbors, config)`
        - `separation = computeSeparation(body, neighbors, config)`
        - `alignment = computeAlignment(body, neighbors, config)`
        - `cohesion = computeCohesion(body, neighbors, config)`
        - `seek = body.targetId ? computeSeek(body, target) : {0,0}`
        - `external = sum(externalFields)` (existing behavior)

    - Accumulate with avoidance as the highest priority term:
        - `total = avoidance`
        - `total += separation + alignment + cohesion + seek + external`
    - (Optional but recommended) If avoidance is non-zero, dampen lower-priority terms to prevent external fields or seek from overpowering collision avoidance:
        - `if (|avoidance| > 0) total = avoidance + damp*(separation+alignment+cohesion+seek+external)` where `damp` is in `[0..1]` (e.g. 0.25–0.5). If this is implemented, add a config field and tests.

5. **Integration**
    - Apply `total` to `body.acceleration` (additive).
    - Keep all position updates inside `integrate` later.

**Constraint**: Ensure no mid-tick mutations of position. Only `acceleration` is modified in this phase. `integrate` updates position later.

---

## 5. Testing Plan

### 5.1 Unit Tests

**`src/engine/physics/impulse/ImpulseObstacleAvoidance.test.ts`**

- **Scenario 1: Head-on Collision**: Entity moving directly at a static body. Assert force vector is lateral (perpendicular to heading).
- **Scenario 2: Clear Path**: Entity moving near but not at a static body. Assert force is zero.
- **Scenario 3: Tie Breaker (Centered)**: Entity perfectly centered on obstacle. Assert force is non-zero and points to deterministic right-hand side.
- **Scenario 4: Stationary Body**: `position == prevPosition`. Assert deterministic fallback direction is used when intersecting.
- **Scenario 5: Two Obstacles**: Both intersect feeler; assert the closest intersection is chosen.

**`src/engine/physics/impulse/ImpulseFlocking.test.ts`**

- **Scenario 1: Alignment**: Entity moving North, neighbor moving East. Assert steering force pulls entity East.
- **Scenario 2: Cohesion**: Entity far from neighbor group. Assert steering force points toward group center.
- **Scenario 3: Isolation**: No neighbors. Assert forces are zero.
- **Scenario 4: Near-zero Velocities**: Neighbors with `{position==prevPosition}` do not produce NaNs; cohesion still works.

**Determinism Test (New)**

- Add a test ensuring that the tie-breaker choice is deterministic:
    - Same initial positions/prevPositions => same avoidance force output (no time-based randomness).

### 5.2 Integration Tests

**`src/engine/physics/impulse/ImpulseEngine.steering.test.ts`**

- **Scenario 1: The Wall**: Place a static wall between an entity and its target. Run for N ticks. Assert entity moves around the wall rather than getting stuck.
- **Scenario 2: The River**: Spawn a cluster of entities moving to a distant target. Assert their velocity headings converge (standard deviation of heading angles decreases over time).
- **Scenario 3: Corridor**: Two parallel static walls forming a narrow passage; ensure entities do not oscillate or deadlock.
- **Scenario 4: External Field vs Avoidance**: Apply an external force field pushing toward a wall; ensure avoidance still prevents penetration/deadlock (and if damping is implemented, assert it).

---

## 6. Implementation Checklist

1. [ ] **Schema**: Update `PhysicsSchema` with new keys.
2. [ ] **Shared Math**: Add `getVelocityProxy` / `getHeading` helper(s) without changing `PhysicsBody`.
3. [ ] **Separation**: Refactor `ImpulseSeparation.ts` to separate calculation from mutation.
4. [ ] **Avoidance**: Implement `ImpulseObstacleAvoidance.ts` + tests (including deterministic tie-breaker).
5. [ ] **Flocking**: Implement `ImpulseFlocking.ts` + tests (including near-zero velocity handling).
6. [ ] **Engine**: Refactor `ImpulseEngine.ts` to use the unified `applySteering` pipeline with a reusable neighbor buffer and `try/finally` quadtree release.
7. [ ] **Integration**: Verify "The Wall", "Corridor", and "External Field vs Avoidance" scenarios.
