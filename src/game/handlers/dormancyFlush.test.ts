import { describe, expect, it } from "vitest";
import { makeHandlerContext } from "../../engine/runtime/handlers/handlerTestUtils";
import { createEntity } from "../../engine/test/factories";
import { flushPendingTransfers } from "./dormancyFlush";

const caveComponent = () => ({
    cave: { progression: { xp: 0, level: 0, skillpoints: 0 } },
});

describe("flushPendingTransfers", () => {
    it("credits transfer payload to the target entity state", () => {
        const context = makeHandlerContext();
        context.world.add(
            createEntity("sys_world", {
                state: {},
                ...caveComponent(),
            }),
        );
        context.world.add(
            createEntity("pending_1", {
                tags: ["pending_transfer"],
                transfer: {
                    sourceId: "worker_1",
                    targetId: "sys_world",
                    payload: { xp: 25 },
                    status: "pending",
                },
            }),
        );

        flushPendingTransfers(context);

        const world = context.world.entities.find(
            (e) => e.id === "sys_world",
        ) as any;
        expect(world.cave.progression.xp).toBe(25);
    });

    it("removes pending transfer entities from world", () => {
        const context = makeHandlerContext();
        context.world.add(createEntity("sys_world", { state: {} }));
        context.world.add(
            createEntity("pending_1", {
                tags: ["pending_transfer"],
                transfer: {
                    sourceId: "w1",
                    targetId: "sys_world",
                    payload: { xp: 5 },
                    status: "pending",
                },
            }),
        );

        flushPendingTransfers(context);

        const pending = context.world.entities.filter(
            (e) => e.id === "pending_1",
        );
        expect(pending).toHaveLength(0);
    });
});

