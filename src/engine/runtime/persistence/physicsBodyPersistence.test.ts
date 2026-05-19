import { describe, expect, it } from "vitest";
import { createCartridge, createEntity } from "../../test/factories";
import { CommandsManager } from "../CommandsManager";
import { Runtime } from "../Runtime";
import { buildPhysicsBody } from "../handlers/spawnUtils";
import {
    restorePhysicsBody,
    serializePhysicsBody,
} from "./physicsBodyPersistence";

const makeRuntime = () =>
    new Runtime(createCartridge("test"), "seed", new CommandsManager());
const physics = {
    x: 10,
    y: 20,
    mass: 1,
    radius: 5,
    drag: 0.1,
    isStatic: false,
};
const serialized = {
    x: 50,
    y: 60,
    velocity: { x: 2, y: 3 },
    acceleration: { x: 4, y: 5 },
    targetId: "goal",
    layer: "phantom",
} as const;

describe("physicsBodyPersistence", () => {
    it("serializes position, velocity, acceleration, target, and layer", () => {
        const runtime = makeRuntime();
        const body = buildPhysicsBody("p1", physics);
        body.position = { x: 30, y: 40 };
        body.prevPosition = { x: 27, y: 35 };
        body.acceleration = { x: 6, y: 7 };
        body.targetId = "goal";
        body.layer = "phantom";
        runtime.registerPhysicsBody(body);

        expect(serializePhysicsBody(runtime, "p1")).toEqual({
            x: 30,
            y: 40,
            velocity: { x: 3, y: 5 },
            acceleration: { x: 6, y: 7 },
            targetId: "goal",
            layer: "phantom",
        });
    });

    it("restores a new body when the entity has physics", () => {
        const runtime = makeRuntime();
        runtime.addEntity(createEntity("p1", { physics }));

        expect(restorePhysicsBody(runtime, "p1", serialized)).toBe(true);
        expect(runtime.getPhysicsBody("p1")).toMatchObject({
            position: { x: 50, y: 60 },
            targetId: "goal",
        });
    });

    it("updates an existing body in place", () => {
        const runtime = makeRuntime();
        const body = buildPhysicsBody("p1", physics);
        runtime.addEntity(createEntity("p1", { physics }));
        runtime.registerPhysicsBody(body);

        restorePhysicsBody(runtime, "p1", serialized);
        expect(body.acceleration).toEqual({ x: 4, y: 5 });
        expect(body.prevPosition).toEqual({ x: 48, y: 57 });
    });

    it("returns false when the entity is missing", () => {
        expect(restorePhysicsBody(makeRuntime(), "missing", serialized)).toBe(
            false,
        );
    });

    it("returns false when the entity has no physics and no body", () => {
        const runtime = makeRuntime();
        runtime.addEntity(createEntity("p1"));
        expect(restorePhysicsBody(runtime, "p1", serialized)).toBe(false);
    });
});
