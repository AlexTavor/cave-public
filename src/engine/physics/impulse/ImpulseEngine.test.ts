import { describe, it, expect } from "vitest";
import { ImpulseEngine } from "./ImpulseEngine";
import type { PhysicsBody, Vector2 } from "./types";
import type { ImpulseConfig } from "../../../data/schemas/physics";
import { createImpulseConfig } from "../../test/factories";

const makeConfig = (overrides: Partial<ImpulseConfig> = {}): ImpulseConfig =>
    createImpulseConfig({
        noise: { magnitude: 0, frequency: 0 },
        ...overrides,
    });

const makeBody = (params: {
    id: string;
    position: Vector2;
    isStatic?: boolean;
    layer?: PhysicsBody["layer"];
}): PhysicsBody => ({
    id: params.id,
    entity: params.id,
    x: params.position.x,
    y: params.position.y,
    mass: 1,
    radius: 4,
    drag: 0.1,
    position: { ...params.position },
    prevPosition: { ...params.position },
    acceleration: { x: 0, y: 0 },
    isStatic: params.isStatic ?? false,
    layer: params.layer,
});

describe("ImpulseEngine ghosting", () => {
    it("keeps phantom bodies overlapped when only separation is active", () => {
        const engine = new ImpulseEngine(
            makeConfig({ separationStrength: 5, defaultQueryRadius: 50 }),
        );
        const phantomA = makeBody({
            id: "phantom-a",
            position: { x: 0, y: 0 },
            layer: "phantom",
        });
        const phantomB = makeBody({
            id: "phantom-b",
            position: { x: 0, y: 0 },
            layer: "phantom",
        });

        engine.addBody(phantomA);
        engine.addBody(phantomB);
        engine.tick(0.016);

        const afterA = engine.getBody("phantom-a")!;
        const afterB = engine.getBody("phantom-b")!;

        expect(afterA.position).toEqual({ x: 0, y: 0 });
        expect(afterB.position).toEqual({ x: 0, y: 0 });
    });

    it("pushes phantom bodies away from default bodies", () => {
        const engine = new ImpulseEngine(
            makeConfig({ separationStrength: 5, defaultQueryRadius: 50 }),
        );
        const phantom = makeBody({
            id: "phantom",
            position: { x: 0, y: 0 },
            layer: "phantom",
        });
        const obstacle = makeBody({
            id: "obstacle",
            position: { x: 0, y: 0 },
            isStatic: true,
        });

        engine.addBody(phantom);
        engine.addBody(obstacle);
        engine.tick(0.016);

        const moved = engine.getBody("phantom")!;
        const dist = Math.hypot(moved.position.x, moved.position.y);

        expect(dist).toBeGreaterThan(0);
    });

    it("emits arrivals while target remains set", () => {
        const engine = new ImpulseEngine(makeConfig());
        const mover = makeBody({ id: "mover", position: { x: 0, y: 0 } });
        const target = makeBody({
            id: "target",
            position: { x: 0, y: 0 },
            isStatic: true,
        });

        engine.addBody(mover);
        engine.addBody(target);
        engine.setTarget("mover", "target");

        const firstArrivals = engine.tick(0.016);
        const secondArrivals = engine.tick(0.016);

        expect(firstArrivals).toHaveLength(1);
        expect(secondArrivals).toHaveLength(1);
        expect(engine.getBody("mover")?.targetId).toBe("target");
    });
});
