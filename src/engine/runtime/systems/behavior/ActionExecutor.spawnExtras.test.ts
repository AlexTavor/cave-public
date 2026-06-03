import { describe, expect, it } from "vitest";
import { ActionExecutor } from "./ActionExecutor";
import { RuntimeCommandType } from "../../types";
import {
    buildBehaviorContext,
    createCommandBuffer,
} from "./actionExecutorTestUtils";

describe("ActionExecutor spawn extras", () => {
    it("resolves self parent for spawn", () => {
        const executor = new ActionExecutor();
        const { buffer, commands } = createCommandBuffer();
        const context = buildBehaviorContext({
            self: { id: "self_id" } as never,
        });

        executor.execute(
            { type: "SPAWN", blueprintId: "ghost", parentId: "self" },
            context,
            commands,
        );

        expect(buffer[0]).toEqual(
            expect.objectContaining({
                type: RuntimeCommandType.SPAWN,
                payload: { blueprintId: "ghost", parentId: "self_id" },
            }),
        );
    });

    it("forwards self parent and forced habitus ids for spawn body", () => {
        const executor = new ActionExecutor();
        const { buffer, commands } = createCommandBuffer();
        const context = buildBehaviorContext({
            self: { id: "self_id" } as never,
        });
        context.snapshot.getPhysicsBody = () =>
            ({ position: { x: 4, y: 8 }, radius: 10 }) as never;

        executor.execute(
            {
                type: "SPAWN_BODY",
                blueprintId: "body",
                parentId: "self",
                forcedHabiti: ["alpha"],
            },
            context,
            commands,
        );

        expect(buffer[0]).toEqual(
            expect.objectContaining({
                type: RuntimeCommandType.SPAWN,
                payload: expect.objectContaining({
                    blueprintId: "body",
                    parentId: "self_id",
                    forcedHabiti: ["alpha"],
                }),
            }),
        );
        // Spawn position is deterministic (seeded, no Math.random) and sits at the parent
        // body's radius (10) from its center (4, 8).
        const { x, y } = (buffer[0] as { payload: { x: number; y: number } })
            .payload;
        expect(Math.hypot(x - 4, y - 8)).toBeCloseTo(10);
    });
});
