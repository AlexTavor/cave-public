import { describe, it, expect } from "vitest";
import type { PhysicsBody } from "./types";
import { applySteeringForBody } from "./ImpulseSteeringApply";
import { createImpulseConfig } from "../../test/factories";

const makeBody = (): PhysicsBody => ({
    id: "body",
    entity: "body",
    x: 0,
    y: 0,
    mass: 1,
    radius: 4,
    drag: 0.1,
    position: { x: 0, y: 0 },
    prevPosition: { x: 0, y: 0 },
    acceleration: { x: 0, y: 0 },
    isStatic: false,
});

describe("applySteeringForBody", () => {
    it("applies external forces when no avoidance", () => {
        const body = makeBody();

        applySteeringForBody({
            body,
            spatialIndex: null,
            config: createImpulseConfig({
                noise: { magnitude: 0, frequency: 0 },
            }),
            queryBuffer: [],
            bodies: new Map(),
            externalFields: [() => ({ x: 2, y: -1 })],
            time: 0,
        });

        expect(body.acceleration.x).toBe(2);
        expect(body.acceleration.y).toBe(-1);
    });
});
