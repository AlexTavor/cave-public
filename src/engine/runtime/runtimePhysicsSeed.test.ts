import { describe, expect, it } from "vitest";
import { World } from "miniplex";
import type { RuntimeEntity } from "./types";
import { ImpulseEngine } from "../physics/impulse/ImpulseEngine";
import { createImpulseConfig } from "../test/factories";
import { seedPhysicsIntoEngine } from "./runtimePhysicsSeed";

const makeEngine = () => new ImpulseEngine(createImpulseConfig());

const makeWorld = (entities: RuntimeEntity[]) => {
    const world = new World<RuntimeEntity>();
    entities.forEach((e) => world.add(e));
    return world;
};

const makePhysicsEntity = (id: string, x = 100, y = 200): RuntimeEntity => ({
    id,
    physics: { x, y, radius: 30, mass: 1, drag: 0.1, isStatic: true },
});

const makeNonPhysicsEntity = (id: string): RuntimeEntity =>
    ({
        id,
        body: { xp: 0, xpRate: 1, level: 1, health: 100, maxHealth: 100 },
    }) as RuntimeEntity;

describe("seedPhysicsIntoEngine", () => {
    it("registers physics bodies for entities with valid physics components", () => {
        // Given
        const engine = makeEngine();
        const world = makeWorld([
            makePhysicsEntity("sys_world", 458, 331),
            makePhysicsEntity("sys_pointer", 460, 470),
        ]);

        // When
        seedPhysicsIntoEngine(world, engine);

        // Then
        const worldBody = engine.getBody("sys_world");
        const pointerBody = engine.getBody("sys_pointer");
        expect(worldBody?.position).toEqual({ x: 458, y: 331 });
        expect(pointerBody?.position).toEqual({ x: 460, y: 470 });
    });

    it("ignores entities without a physics component", () => {
        // Given
        const engine = makeEngine();
        const world = makeWorld([makeNonPhysicsEntity("body_1")]);

        // When
        seedPhysicsIntoEngine(world, engine);

        // Then
        expect(engine.getBody("body_1")).toBeUndefined();
    });

    it("ignores entities without an id", () => {
        // Given
        const engine = makeEngine();
        const world = makeWorld([
            { physics: { x: 0, y: 0, radius: 10, mass: 1, drag: 0.1 } } as any,
        ]);

        // When
        seedPhysicsIntoEngine(world, engine);

        // Then
        expect(engine.getBody("")).toBeUndefined();
    });
});

