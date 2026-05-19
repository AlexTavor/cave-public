import { describe, it, expect } from "vitest";
import { ResolveTransferHandler } from "./ResolveTransferHandler";
import { RuntimeCommandType } from "../types";
import { makeHandlerContext } from "./handlerTestUtils";
import { createCartridge, createEntity } from "../../test/factories";

describe("ResolveTransferHandler", () => {
    it("credits target and removes pending entity", () => {
        const handler = new ResolveTransferHandler();
        const context = makeHandlerContext(createCartridge("core.json"));

        context.world.add(
            createEntity("target", {
                state: {
                    bodies: { value: 1, visible: false },
                },
                ledger: {
                    incoming: { bodies: 3 },
                },
            }),
        );

        context.world.add(
            createEntity("pending_1", {
                transfer: {
                    sourceId: "source",
                    targetId: "target",
                    payload: { bodies: 3 },
                    status: "pending",
                },
            }),
        );

        handler.handle(
            {
                type: RuntimeCommandType.RESOLVE_TRANSFER,
                payload: { entityId: "pending_1" },
            },
            context,
        );

        const target = context.world.entities.find(
            (entity) => entity.id === "target",
        );
        const targetState = target?.state as
            | { bodies?: { value: number } }
            | undefined;
        const pending = context.world.entities.find(
            (entity) => entity.id === "pending_1",
        );
        const targetLedger = target?.ledger?.incoming;

        expect(targetState?.bodies?.value).toBe(4);
        expect(targetLedger?.bodies).toBe(0);
        expect(pending).toBeUndefined();
    });

    it("clamps ledger incoming to zero on over-debit", () => {
        const handler = new ResolveTransferHandler();
        const context = makeHandlerContext(createCartridge("core.json"));

        context.world.add(
            createEntity("target", {
                state: {
                    bodies: { value: 0, visible: false },
                },
                ledger: {
                    incoming: { bodies: 1 },
                },
            }),
        );

        context.world.add(
            createEntity("pending_1", {
                transfer: {
                    sourceId: "source",
                    targetId: "target",
                    payload: { bodies: 3 },
                    status: "pending",
                },
            }),
        );

        handler.handle(
            {
                type: RuntimeCommandType.RESOLVE_TRANSFER,
                payload: { entityId: "pending_1" },
            },
            context,
        );

        const target = context.world.entities.find(
            (entity) => entity.id === "target",
        );
        const targetLedger = target?.ledger?.incoming;

        expect(targetLedger?.bodies).toBe(0);
    });
});
