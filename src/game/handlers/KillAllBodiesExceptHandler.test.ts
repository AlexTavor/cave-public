import { describe, expect, it } from "vitest";
import { createEntity } from "../../engine/test/factories";
import { RuntimeCommandType } from "../../engine/runtime/types/runtimeCommandTypes";
import { makeHandlerContext } from "../../engine/runtime/handlers/handlerTestUtils";
import { KillAllBodiesExceptHandler } from "./KillAllBodiesExceptHandler";

describe("KillAllBodiesExceptHandler", () => {
    it("queues deterministic kills until only the requested count remains", () => {
        const context = makeHandlerContext();
        context.world.add(
            createEntity("sys_world", {
                state: { worldSeed: { value: "seed" } },
            }),
        );
        context.world.add(createEntity("body-a", { body: {} }));
        context.world.add(createEntity("body-b", { body: {} }));
        context.world.add(createEntity("body-c", { body: {} }));

        new KillAllBodiesExceptHandler().handle(
            {
                type: RuntimeCommandType.KILL_ALL_BODIES_EXCEPT,
                payload: { quantity: 1 },
            },
            context,
        );

        expect(context.commands?.drain()).toEqual([
            {
                type: RuntimeCommandType.KILL,
                payload: { entityId: "body-a" },
                metadata: undefined,
            },
            {
                type: RuntimeCommandType.KILL,
                payload: { entityId: "body-c" },
                metadata: undefined,
            },
        ]);
    });

    it("does nothing when the requested count already remains", () => {
        const context = makeHandlerContext();
        context.world.add(
            createEntity("sys_world", {
                state: { worldSeed: { value: "seed" } },
            }),
        );
        context.world.add(createEntity("body-a", { body: {} }));

        new KillAllBodiesExceptHandler().handle(
            {
                type: RuntimeCommandType.KILL_ALL_BODIES_EXCEPT,
                payload: { quantity: 1 },
            },
            context,
        );

        expect(context.commands?.drain()).toEqual([]);
    });
});
