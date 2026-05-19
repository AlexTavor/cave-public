import { describe, it, expect } from "vitest";
import { ImpulseEngine } from "./ImpulseEngine";
import type { PhysicsBody } from "./types";
import { createImpulseConfig } from "../../test/factories";

const makeBody = (params: {
    id: string;
    x: number;
    y: number;
    anchor?: PhysicsBody["anchor"];
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
    anchor: params.anchor,
});

describe("ImpulseEngine anchor integration", () => {
    it("moves bodies toward their coordinate anchor (soft)", () => {
        const engine = new ImpulseEngine({
            ...createImpulseConfig(),
            separationStrength: 0,
            alignmentWeight: 0,
            cohesionWeight: 0,
            flockingRadius: 0,
            avoidanceForce: 0,
            lookAheadDistance: 0,
        });

        const body = makeBody({
            id: "body",
            x: 0,
            y: 0,
            anchor: {
                type: "coordinate",
                x: 50,
                y: 0,
                stiffness: 0.2,
            },
        });
        engine.addBody(body);

        engine.tick(16 / 1000);
        const moved = engine.getBody("body");

        expect(moved?.position.x).toBeGreaterThan(0);
    });

    it("locks bodies to hard anchor relative position", () => {
        const engine = new ImpulseEngine(createImpulseConfig());

        const target = makeBody({ id: "target", x: 100, y: 100 });
        target.isStatic = true; // Fix target in place to prevent flocking feedback loops

        // Body starts at 0,0 but should snap to target+offset immediately
        const body = makeBody({
            id: "anchored",
            x: 0,
            y: 0,
            anchor: {
                type: "entity",
                entityId: "target",
                mode: "hard",
                offsetX: 10,
                offsetY: 5,
                distance: 0,
                stiffness: 1,
            },
        });

        engine.addBody(target);
        engine.addBody(body);

        // Tick 1: Snap to position
        engine.tick(0.016);

        const result = engine.getBody("anchored");
        // Target (100, 100) + Offset (10, 5) = (110, 105)
        expect(result?.position.x).toBe(110);
        expect(result?.position.y).toBe(105);

        // Tick 2: Move target, anchored body should follow instantly
        target.position.x = 200;
        target.position.y = 200;
        engine.tick(0.016);

        // Target (200, 200) + Offset (10, 5) = (210, 205)
        expect(result?.position.x).toBe(210);
        expect(result?.position.y).toBe(205);

        // Verify velocity is zeroed out for hard anchors (no physics drift)
        expect(result?.prevPosition.x).toBe(210);
        expect(result?.prevPosition.y).toBe(205);
    });
});
