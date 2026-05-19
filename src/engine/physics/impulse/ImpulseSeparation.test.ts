import { describe, it, expect } from "vitest";
import {
    computeSpatialForces,
    computeTargetForce,
} from "./ImpulseSteeringForces";
import type { ImpulseConfig } from "../../../data/schemas/physics";
import type { PhysicsBody } from "./types";
import type { SpatialIndex } from "./ImpulseSpatialIndex";

// Mock config with only separation enabled to isolate the force
const TEST_CONFIG: ImpulseConfig = {
    globalDrag: 0.1,
    maxSubSteps: 1,
    defaultDtMs: 16,
    minWorldSize: 1000,
    defaultQueryRadius: 100,
    separationRadiusMultiplier: 2,
    subSteps: 1,
    separationStrength: 100, // Strong separation
    avoidanceForce: 0,
    lookAheadDistance: 0,
    alignmentWeight: 0, // Disable flocking
    cohesionWeight: 0, // Disable flocking
    flockingRadius: 0,
    avoidanceDamp: 0,
    seekStrength: 1,
    transferNodeRadius: 10,
    transferNodeMass: 1,
    transferNodeDrag: 0.1,
};

describe("ImpulseSteeringForces", () => {
    describe("computeSpatialForces", () => {
        it("should apply separation force from non-target neighbors", () => {
            const body: PhysicsBody = {
                id: "body1",
                entity: "e1",
                x: 0,
                y: 0,
                mass: 1,
                radius: 10,
                drag: 0,
                position: { x: 0, y: 0 },
                prevPosition: { x: 0, y: 0 },
                acceleration: { x: 0, y: 0 },
                isStatic: false,
            };

            const neighbor: PhysicsBody = {
                id: "neighbor1",
                entity: "e2",
                x: 5, // Overlapping (radius 10 + 10 = 20, dist 5)
                y: 0,
                mass: 1,
                radius: 10,
                drag: 0,
                position: { x: 5, y: 0 },
                prevPosition: { x: 5, y: 0 },
                acceleration: { x: 0, y: 0 },
                isStatic: false,
            };

            // Mock spatial index to return the neighbor
            const spatialIndex = {
                tree: {
                    queryRadius: (
                        _x: number,
                        _y: number,
                        _r: number,
                        buffer: PhysicsBody[],
                    ) => {
                        buffer.push(neighbor);
                        return buffer;
                    },
                },
                release: () => {},
            } as unknown as SpatialIndex;

            const forces = computeSpatialForces({
                body,
                spatialIndex,
                config: TEST_CONFIG,
                queryBuffer: [],
            });

            // Expect repulsion (negative X force)
            expect(forces.otherX).toBeLessThan(0);
        });

        it("should NOT apply separation force if neighbor is the target", () => {
            const body: PhysicsBody = {
                id: "body1",
                entity: "e1",
                x: 0,
                y: 0,
                mass: 1,
                radius: 10,
                drag: 0,
                position: { x: 0, y: 0 },
                prevPosition: { x: 0, y: 0 },
                acceleration: { x: 0, y: 0 },
                isStatic: false,
                targetId: "neighbor1", // Target is the neighbor
            };

            const neighbor: PhysicsBody = {
                id: "neighbor1",
                entity: "e2",
                x: 5,
                y: 0,
                mass: 1,
                radius: 10,
                drag: 0,
                position: { x: 5, y: 0 },
                prevPosition: { x: 5, y: 0 },
                acceleration: { x: 0, y: 0 },
                isStatic: false,
            };

            const spatialIndex = {
                tree: {
                    queryRadius: (
                        _x: number,
                        _y: number,
                        _r: number,
                        buffer: PhysicsBody[],
                    ) => {
                        buffer.push(neighbor);
                        return buffer;
                    },
                },
                release: () => {},
            } as unknown as SpatialIndex;

            const forces = computeSpatialForces({
                body,
                spatialIndex,
                config: TEST_CONFIG,
                queryBuffer: [],
            });

            // Expect NO repulsion (0 X force because alignment/cohesion are 0)
            expect(forces.otherX).toBe(0);
        });
    });

    describe("computeTargetForce", () => {
        it("should calculate seek force towards target", () => {
            const body: PhysicsBody = {
                id: "body1",
                entity: "e1",
                x: 0,
                y: 0,
                mass: 1,
                radius: 10,
                drag: 0,
                position: { x: 0, y: 0 },
                prevPosition: { x: 0, y: 0 },
                acceleration: { x: 0, y: 0 },
                isStatic: false,
                targetId: "target1",
            };

            const target: PhysicsBody = {
                id: "target1",
                entity: "e2",
                x: 100,
                y: 0,
                mass: 1,
                radius: 10,
                drag: 0,
                position: { x: 100, y: 0 },
                prevPosition: { x: 100, y: 0 },
                acceleration: { x: 0, y: 0 },
                isStatic: true,
            };

            const bodies = new Map<string, PhysicsBody>();
            bodies.set(target.id, target);

            const force = computeTargetForce({
                body,
                bodies,
                config: TEST_CONFIG,
            });

            // Should pull towards positive X
            expect(force.x).toBeGreaterThan(0);
            expect(force.y).toBe(0);
        });
    });
});
