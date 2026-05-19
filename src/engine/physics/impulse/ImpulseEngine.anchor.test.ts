import { describe, it, expect } from "vitest";
import { ImpulseEngine } from "./ImpulseEngine";
import type { PhysicsBody } from "./types";
import { createImpulseConfig } from "../../test/factories";

const makeBody = (params: {
    id: string;
    x: number;
    y: number;
}): PhysicsBody => ({
    id: params.id,
    entity: params.id,
    x: params.x,
    y: params.y,
    mass: 1,
    radius: 4,
    drag: 0.1,
    position: { x: params.x, y: params.y },
    prevPosition: { x: params.x, y: params.y },
    acceleration: { x: 0, y: 0 },
    isStatic: false,
    anchor: {
        type: "coordinate",
        x: params.x + 50,
        y: params.y,
        stiffness: 0.2,
    },
});

describe("ImpulseEngine anchor integration", () => {
    it("moves bodies toward their coordinate anchor", () => {
        const engine = new ImpulseEngine({
            ...createImpulseConfig(),
            separationStrength: 0,
            alignmentWeight: 0,
            cohesionWeight: 0,
            flockingRadius: 0,
            avoidanceForce: 0,
            lookAheadDistance: 0,
        });

        const body = makeBody({ id: "body", x: 0, y: 0 });
        engine.addBody(body);

        engine.tick(16 / 1000);
        const moved = engine.getBody("body");

        expect(moved?.position.x).toBeGreaterThan(0);
    });
});
