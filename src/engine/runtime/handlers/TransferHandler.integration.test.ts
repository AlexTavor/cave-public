import { describe, expect, it } from "vitest";
import { TransferHandler } from "./TransferHandler";
import { RuntimeCommandType } from "../types";
import { makeHandlerContext } from "./handlerTestUtils";
import { createCartridge, createEntity } from "../../test/factories";

describe("TransferHandler integration", () => {
    it("rejects transfers that exceed capacity", () => {
        // Given
        const handler = new TransferHandler();
        const context = makeHandlerContext(createCartridge("core.json"));

        context.world.add(
            createEntity("source", {
                state: {
                    bodies: { value: 5, visible: false },
                },
            }),
        );

        context.world.add(
            createEntity("target", {
                state: {
                    bodies: { value: 3, max: 3, visible: false },
                },
                ledger: { incoming: { bodies: 0 } },
            }),
        );

        // When
        handler.handle(
            {
                type: RuntimeCommandType.TRANSFER_ASSETS,
                payload: {
                    sourceId: "source",
                    targetId: "target",
                    payload: { bodies: 2 },
                },
            },
            context,
        );

        // Then
        const source = context.world.entities.find(
            (entity) => entity.id === "source",
        );
        const pending = context.world.entities.find((entity) =>
            entity.id?.startsWith("pending_"),
        );

        expect((source?.state as any)?.bodies?.value).toBe(5);
        expect(pending).toBeUndefined();
        expect(context.telemetry.log).toHaveBeenCalledWith(
            "errors",
            expect.stringContaining("at capacity"),
        );
    });
});
