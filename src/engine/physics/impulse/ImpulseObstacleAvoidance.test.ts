import { describe, it, expect } from "vitest";
import { computeObstacleAvoidance } from "./ImpulseObstacleAvoidance";
import type { PhysicsBody, Vector2 } from "./types";
import { createImpulseConfig } from "../../test/factories";

const makeBody = (params: {
    id: string;
    position: Vector2;
    prevPosition?: Vector2;
    isStatic?: boolean;
    radius?: number;
}): PhysicsBody => {
    const prev = params.prevPosition ?? params.position;
    return {
        id: params.id,
        entity: params.id,
        x: params.position.x,
        y: params.position.y,
        mass: 1,
        radius: params.radius ?? 5,
        drag: 0.1,
        position: { ...params.position },
        prevPosition: { ...prev },
        acceleration: { x: 0, y: 0 },
        isStatic: params.isStatic ?? false,
    };
};

const EPSILON = 1e-6;

describe("computeObstacleAvoidance", () => {
    it("returns lateral force on head-on collision", () => {
        const config = createImpulseConfig({
            lookAheadDistance: 20,
            avoidanceForce: 2,
        });
        const body = makeBody({
            id: "agent",
            position: { x: 0, y: 0 },
            prevPosition: { x: -1, y: 0 },
        });
        const obstacle = makeBody({
            id: "wall",
            position: { x: 20, y: 0 },
            isStatic: true,
            radius: 5,
        });

        const force = computeObstacleAvoidance(body, [body, obstacle], config);
        const scaled = config.avoidanceForce * config.lookAheadDistance * 1.5;
        expect(Math.abs(force.x)).toBeLessThan(EPSILON);
        expect(force.y).toBeLessThan(0);
        expect(force.y).toBeCloseTo(-scaled, 4);
    });

    it("returns zero when path is clear", () => {
        const config = createImpulseConfig({
            lookAheadDistance: 20,
            avoidanceForce: 2,
        });
        const body = makeBody({
            id: "agent",
            position: { x: 0, y: 0 },
            prevPosition: { x: -1, y: 0 },
        });
        const obstacle = makeBody({
            id: "wall",
            position: { x: 0, y: 50 },
            isStatic: true,
        });

        const force = computeObstacleAvoidance(body, [obstacle], config);
        expect(force.x).toBeCloseTo(0, 6);
        expect(force.y).toBeCloseTo(0, 6);
    });

    it("uses deterministic tie-breaker when centered", () => {
        const config = createImpulseConfig({
            lookAheadDistance: 20,
            avoidanceForce: 2,
        });
        const body = makeBody({
            id: "agent",
            position: { x: 0, y: 0 },
            prevPosition: { x: -1, y: 0 },
        });
        const obstacle = makeBody({
            id: "wall",
            position: { x: 0, y: 0 },
            isStatic: true,
            radius: 10,
        });

        const force = computeObstacleAvoidance(body, [obstacle], config);
        const scaled = config.avoidanceForce * config.lookAheadDistance * 1.5;
        expect(Math.abs(force.x)).toBeLessThan(EPSILON);
        expect(force.y).toBeLessThan(0);
        expect(force.y).toBeCloseTo(-scaled, 4);
    });

    it("uses deterministic fallback for stationary bodies", () => {
        const config = createImpulseConfig({
            lookAheadDistance: 20,
            avoidanceForce: 2,
        });
        const body = makeBody({
            id: "agent",
            position: { x: 0, y: 0 },
            prevPosition: { x: 0, y: 0 },
        });
        const obstacle = makeBody({
            id: "wall",
            position: { x: 10, y: 0 },
            isStatic: true,
            radius: 5,
        });

        const force = computeObstacleAvoidance(body, [obstacle], config);
        const scaled = config.avoidanceForce * config.lookAheadDistance * 1.5;
        expect(force.x).toBeGreaterThan(0);
        expect(Math.abs(force.y)).toBeLessThan(EPSILON);
        expect(force.x).toBeCloseTo(scaled, 4);
    });

    it("prioritizes the closest intersecting obstacle", () => {
        const config = createImpulseConfig({
            lookAheadDistance: 40,
            avoidanceForce: 2,
        });
        const body = makeBody({
            id: "agent",
            position: { x: 0, y: 0 },
            prevPosition: { x: -1, y: 0 },
        });
        const nearObstacle = makeBody({
            id: "near",
            position: { x: 10, y: 5 },
            isStatic: true,
            radius: 6,
        });
        const farObstacle = makeBody({
            id: "far",
            position: { x: 25, y: -5 },
            isStatic: true,
            radius: 6,
        });

        const force = computeObstacleAvoidance(
            body,
            [nearObstacle, farObstacle],
            config,
        );
        expect(force.y).toBeLessThan(0);
    });

    it("is deterministic for identical inputs", () => {
        const config = createImpulseConfig({
            lookAheadDistance: 30,
            avoidanceForce: 2,
        });
        const body = makeBody({
            id: "agent",
            position: { x: 0, y: 0 },
            prevPosition: { x: -1, y: 0 },
        });
        const obstacle = makeBody({
            id: "wall",
            position: { x: 30, y: 0 },
            isStatic: true,
            radius: 6,
        });

        const first = computeObstacleAvoidance(body, [obstacle], config);
        const second = computeObstacleAvoidance(body, [obstacle], config);

        expect(first).toEqual(second);
    });
});
