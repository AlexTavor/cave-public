import { describe, it, expect } from "vitest";
import { CancelTransferHandler } from "./CancelTransferHandler";
import { RuntimeCommandType } from "../types";
import { makeHandlerContext } from "./handlerTestUtils";
import { createCartridge, createEntity } from "../../test/factories";

describe("CancelTransferHandler", () => {
    it("turns pending transfers around and swaps ledgers", () => {
        const handler = new CancelTransferHandler();
        const context = makeHandlerContext(createCartridge("core.json"));

        context.world.add(
            createEntity("source", {
                ledger: {
                    incoming: { bodies: 0 },
                },
            }),
        );

        context.world.add(
            createEntity("quest-a", {
                ledger: {
                    incoming: { bodies: 2 },
                },
            }),
        );

        context.world.add(
            createEntity("pending_1", {
                transfer: {
                    sourceId: "source",
                    targetId: "quest-a",
                    payload: { bodies: 2 },
                    status: "pending",
                },
            }),
        );

        handler.handle(
            {
                type: RuntimeCommandType.CANCEL_TRANSFER,
                payload: { targetId: "quest-a" },
            },
            context,
        );

        const pending = context.world.entities.find(
            (entity) => entity.id === "pending_1",
        );
        const transfer = pending?.transfer as
            | { sourceId?: string; targetId?: string; status?: string }
            | undefined;
        const sourceLedger = context.world.entities.find(
            (entity) => entity.id === "source",
        )?.ledger?.incoming;
        const targetLedger = context.world.entities.find(
            (entity) => entity.id === "quest-a",
        )?.ledger?.incoming;

        expect(transfer?.status).toBe("returning");
        expect(transfer?.sourceId).toBe("quest-a");
        expect(transfer?.targetId).toBe("source");
        expect(sourceLedger?.bodies).toBe(2);
        expect(targetLedger?.bodies).toBe(0);
    });
});
