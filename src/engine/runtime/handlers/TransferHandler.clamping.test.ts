import { describe, it, expect } from "vitest";
import { TransferHandler } from "./TransferHandler";
import { RuntimeCommandType } from "../types";
import { makeHandlerContext } from "./handlerTestUtils";
import { createCartridge, createEntity } from "../../test/factories";

describe("TransferHandler – clamping", () => {
    it("clamps to available when source has less than requested", () => {
        const handler = new TransferHandler();
        const context = makeHandlerContext(createCartridge("core.json"));

        context.world.add(
            createEntity("source", {
                state: { bodies: { value: 2, visible: false } },
            }),
        );
        context.world.add(
            createEntity("target", {
                state: { bodies: { value: 1, visible: false } },
            }),
        );

        handler.handle(
            {
                type: RuntimeCommandType.TRANSFER_ASSETS,
                payload: {
                    sourceId: "source",
                    targetId: "target",
                    payload: { bodies: 5 },
                },
            },
            context,
        );

        const source = context.world.entities.find((e) => e.id === "source");
        const sourceState = source?.state as
            | { bodies?: { value: number } }
            | undefined;
        const pending = context.world.entities.find((e) =>
            e.id?.startsWith("pending_"),
        );

        expect(sourceState?.bodies?.value).toBe(0);
        expect(pending?.transfer).toBeDefined();
        expect((pending?.transfer as any).payload.bodies).toBe(2);
    });
});
