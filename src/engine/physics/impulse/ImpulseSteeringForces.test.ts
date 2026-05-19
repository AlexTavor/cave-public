import { describe, it, expect } from "vitest";
import type { PhysicsBody } from "./types";
import {
    computeAnchorContribution,
    computeExternalForces,
    computeSpatialForces,
    computeTargetForce,
    computeWobbleForce,
} from "./ImpulseSteeringForces";
import { createImpulseConfig } from "../../test/factories";

const makeBody = (params: {
    id: string;
    x?: number;
    y?: number;
    targetId?: string;
    anchor?: PhysicsBody["anchor"];
}): PhysicsBody => ({
    id: params.id,
    entity: params.id,
    x: params.x ?? 0,
    y: params.y ?? 0,
    mass: 1,
    radius: 4,
    drag: 0.1,
    position: { x: params.x ?? 0, y: params.y ?? 0 },
    prevPosition: { x: params.x ?? 0, y: params.y ?? 0 },
    acceleration: { x: 0, y: 0 },
    isStatic: false,
    targetId: params.targetId,
    anchor: params.anchor,
});

describe("ImpulseSteeringForces", () => {
    it("returns zero target force when missing target", () => {
        const body = makeBody({ id: "body" });
        const force = computeTargetForce({
            body,
            bodies: new Map(),
            config: createImpulseConfig(),
        });

        expect(force).toEqual({ x: 0, y: 0 });
    });

    it("returns zero anchor contribution without anchor", () => {
        const body = makeBody({ id: "body" });
        const force = computeAnchorContribution({
            body,
            bodies: new Map(),
        });

        expect(force).toEqual({ x: 0, y: 0 });
    });

    it("sums external forces", () => {
        const body = makeBody({ id: "body" });
        const force = computeExternalForces({
            body,
            config: createImpulseConfig(),
            externalFields: [() => ({ x: 2, y: 1 }), () => ({ x: -1, y: 3 })],
        });

        expect(force).toEqual({ x: 1, y: 4 });
    });

    it("returns empty spatial forces when no spatial index", () => {
        const body = makeBody({ id: "body" });
        const forces = computeSpatialForces({
            body,
            spatialIndex: null,
            config: createImpulseConfig(),
            queryBuffer: [],
        });

        expect(forces).toEqual({
            avoidanceX: 0,
            avoidanceY: 0,
            otherX: 0,
            otherY: 0,
        });
    });

    it("returns zero wobble when noise magnitude is zero", () => {
        const body = makeBody({ id: "body" });
        body.seed = 0.2;

        const force = computeWobbleForce(
            body,
            createImpulseConfig({ noise: { magnitude: 0, frequency: 1 } }),
            1,
        );

        expect(force).toEqual({ x: 0, y: 0 });
    });

    it("produces deterministic wobble based on seed and time", () => {
        const config = createImpulseConfig({
            noise: { magnitude: 2, frequency: 1 },
        });
        const bodyA = makeBody({ id: "a" });
        const bodyB = makeBody({ id: "b" });
        bodyA.seed = 0.1;
        bodyB.seed = 0.2;

        const t0 = computeWobbleForce(bodyA, config, 0);
        const t1 = computeWobbleForce(bodyA, config, 1);
        const t0Other = computeWobbleForce(bodyB, config, 0);

        expect(t0).not.toEqual(t1);
        expect(t0).not.toEqual(t0Other);
    });
});
