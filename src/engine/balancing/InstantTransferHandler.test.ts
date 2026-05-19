import { describe, it, expect } from "vitest";
import { InstantTransferHandler } from "./InstantTransferHandler";
import { makeHandlerContext } from "../runtime/handlers/handlerTestUtils";
import { createCartridge, createEntity } from "../test/factories";
import { RuntimeCommandType } from "../runtime/types";

describe("InstantTransferHandler", () => {
    it("moves resources without spawning a pending transfer", () => {
        const handler = new InstantTransferHandler();
        const context = makeHandlerContext(createCartridge("core.json"));

        context.world.add(
            createEntity("source", {
                state: { food: { value: 8, visible: false } },
            }),
        );

        context.world.add(
            createEntity("target", {
                state: { food: { value: 2, max: 20, visible: false } },
            }),
        );

        handler.handle(
            {
                type: RuntimeCommandType.TRANSFER_ASSETS,
                payload: {
                    sourceId: "source",
                    targetId: "target",
                    payload: { food: 5 },
                },
            },
            context,
        );

        const source = context.world.entities.find(
            (entity) => entity.id === "source",
        ) as any;
        const target = context.world.entities.find(
            (entity) => entity.id === "target",
        ) as any;
        const pending = context.world.entities.find((entity) =>
            Boolean((entity as any).transfer),
        );

        expect(source.state.food.value).toBe(3);
        expect(target.state.food.value).toBe(7);
        expect(pending).toBeUndefined();
    });
});
