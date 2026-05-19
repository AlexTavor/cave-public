import { describe, it, expect } from "vitest";
import { computeAlignment, computeCohesion } from "./ImpulseFlocking";
import type { PhysicsBody, Vector2 } from "./types";
import type { ImpulseConfig } from "../../../data/schemas/physics";
import { createImpulseConfig } from "../../test/factories";

const makeConfig = (overrides: Partial<ImpulseConfig> = {}): ImpulseConfig =>
    createImpulseConfig(overrides);

const makeBody = (params: {
    id: string;
    position: Vector2;
    prevPosition?: Vector2;
    isStatic?: boolean;
}): PhysicsBody => {
    const prev = params.prevPosition ?? params.position;
    return {
        id: params.id,
        entity: params.id,
        x: params.position.x,
        y: params.position.y,
        mass: 1,
        radius: 5,
        drag: 0.1,
        position: { ...params.position },
        prevPosition: { ...prev },
        acceleration: { x: 0, y: 0 },
        isStatic: params.isStatic ?? false,
    };
};

describe("ImpulseFlocking", () => {
    it("alignment nudges toward neighbor heading", () => {
        const config = makeConfig({ alignmentWeight: 1, flockingRadius: 50 });
        const body = makeBody({
            id: "self",
            position: { x: 0, y: 0 },
            prevPosition: { x: 0, y: -1 },
        });
        const neighbor = makeBody({
            id: "neighbor",
            position: { x: 10, y: 0 },
            prevPosition: { x: 9, y: 0 },
        });

        const force = computeAlignment(body, [neighbor], config);
        expect(force.x).toBeGreaterThan(0);
        expect(force.y).toBeLessThan(0);
    });

    it("cohesion pulls toward group center", () => {
        const config = makeConfig({ cohesionWeight: 1, flockingRadius: 100 });
        const body = makeBody({
            id: "self",
            position: { x: 0, y: 0 },
            prevPosition: { x: 0, y: 0 },
        });
        const neighbors = [
            makeBody({ id: "n1", position: { x: 10, y: 0 } }),
            makeBody({ id: "n2", position: { x: 10, y: 10 } }),
        ];

        const force = computeCohesion(body, neighbors, config);
        expect(force.x).toBeGreaterThan(0);
        expect(force.y).toBeGreaterThan(0);
    });

    it("returns zero when isolated", () => {
        const config = makeConfig({ alignmentWeight: 1, cohesionWeight: 1 });
        const body = makeBody({
            id: "self",
            position: { x: 0, y: 0 },
        });

        const alignment = computeAlignment(body, [], config);
        const cohesion = computeCohesion(body, [], config);

        expect(alignment).toEqual({ x: 0, y: 0 });
        expect(cohesion).toEqual({ x: 0, y: 0 });
    });

    it("handles near-zero neighbor velocities", () => {
        const config = makeConfig({ alignmentWeight: 1, flockingRadius: 50 });
        const body = makeBody({
            id: "self",
            position: { x: 0, y: 0 },
            prevPosition: { x: 0, y: 0 },
        });
        const neighbor = makeBody({
            id: "neighbor",
            position: { x: 10, y: 0 },
            prevPosition: { x: 10, y: 0 },
        });

        const force = computeAlignment(body, [neighbor], config);
        expect(Number.isFinite(force.x)).toBe(true);
        expect(Number.isFinite(force.y)).toBe(true);
    });
});
