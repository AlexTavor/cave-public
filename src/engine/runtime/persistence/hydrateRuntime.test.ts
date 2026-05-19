import { describe, it, expect } from "vitest";
import { createCartridge, createEntity } from "../../test/factories";
import { CommandsManager } from "../CommandsManager";
import { Runtime } from "../Runtime";
import { buildPhysicsBody } from "../handlers/spawnUtils";
import { serialize } from "./RuntimeSerializer";
import { hydrateRuntime } from "./hydrateRuntime";

const makeRuntime = () => {
    const cartridge = createCartridge("test");
    return new Runtime(cartridge, "seed-1", new CommandsManager());
};

describe("hydrateRuntime", () => {
    it("restores tick from serialized state", () => {
        // Given
        const source = makeRuntime();
        source.getState().tick = 500;
        source.addEntity(createEntity("w1", { tags: ["worker"] }));
        const data = serialize(source, "hydrate-test");

        const target = makeRuntime();

        // When
        hydrateRuntime(target, data);

        // Then
        expect(target.getState().tick).toBe(500);
    });

    it("restores entities from serialized state", () => {
        // Given
        const source = makeRuntime();
        source.addEntity(
            createEntity("w1", {
                tags: ["worker"],
                state: { hp: { value: 10 } },
            }),
        );
        const data = serialize(source, "entity-test");

        const target = makeRuntime();

        // When
        hydrateRuntime(target, data);

        // Then
        const entity = target.getEntity("w1");
        expect(entity).toBeDefined();
        expect((entity as any).tags).toEqual(["worker"]);
        expect((entity as any).state?.hp?.value).toBe(10);
    });

    it("restores physics positions from serialized state", () => {
        // Given: source runtime has entity with a registered physics body
        const source = makeRuntime();
        const physicsComp = {
            x: 50,
            y: 60,
            mass: 1,
            radius: 5,
            drag: 0.1,
            isStatic: false,
        };
        source.addEntity(createEntity("p1", { physics: physicsComp }));

        const body = buildPhysicsBody("p1", physicsComp);
        body.position = { x: 50, y: 60 };
        body.prevPosition = { x: 48, y: 58 };
        body.acceleration = { x: 1, y: -1 };
        source.registerPhysicsBody(body);

        const data = serialize(source, "physics-test");

        // Target is fresh — no physics body for p1
        const target = makeRuntime();

        // When
        hydrateRuntime(target, data);

        // Then: body was created and positioned correctly
        const targetBody = target.getPhysicsBody("p1");
        expect(targetBody).toBeDefined();
        expect(targetBody!.position.x).toBe(50);
        expect(targetBody!.position.y).toBe(60);
        expect(targetBody!.acceleration.x).toBe(1);
        expect(targetBody!.acceleration.y).toBe(-1);
    });

    it("clears active drafts while preserving draft history", () => {
        const source = makeRuntime();
        source.addEntity(
            createEntity("sys_world", {
                draft: {
                    _tag: "draft",
                    active: true,
                    poolId: "pool_explore",
                    triggerEntityId: "explore-1",
                    options: [{ id: "opt-1" }],
                    sourceLabel: "Explore",
                    selectedOptionId: null,
                    pickedOneOffs: ["opt-locked"],
                    shownCountsByPool: { pool_explore: 2 },
                    cycleNumber: 2,
                    currentText: "Pick one.",
                },
            }),
        );

        const target = makeRuntime();
        hydrateRuntime(target, serialize(source, "draft-test"));

        expect(target.getEntity("sys_world")).toMatchObject({
            draft: {
                active: false,
                poolId: "",
                triggerEntityId: "",
                options: [],
                selectedOptionId: null,
                pickedOneOffs: ["opt-locked"],
                shownCountsByPool: { pool_explore: 2 },
            },
        });
    });
});

