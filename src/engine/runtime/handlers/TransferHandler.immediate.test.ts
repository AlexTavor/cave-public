import { describe, it, expect } from "vitest";
import { TransferHandler } from "./TransferHandler";
import { RuntimeCommandType } from "../types";
import { makeHandlerContext } from "./handlerTestUtils";
import { createCartridge, createEntity } from "../../test/factories";

const buildContext = () => makeHandlerContext(createCartridge("core.json"));

const findPending = (context: ReturnType<typeof buildContext>) =>
    context.world.entities.find((e) => e.id?.startsWith("pending_"));

describe("TransferHandler immediate mode", () => {
    it("mutates both entities and creates no physical artifacts", () => {
        const handler = new TransferHandler();
        const context = buildContext();

        context.world.add(
            createEntity("source", {
                state: { bodies: { value: 10, visible: false } },
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
                    isImmediate: true,
                },
            },
            context,
        );

        const source = context.world.entities.find((e) => e.id === "source");
        const target = context.world.entities.find((e) => e.id === "target");

        expect((source?.state as any)?.bodies?.value).toBe(5);
        expect((target?.state as any)?.bodies?.value).toBe(6);
        expect(findPending(context)).toBeUndefined();
        expect(target?.ledger?.incoming?.bodies).toBeUndefined();
    });

    it("physical transfer unchanged when isImmediate missing", () => {
        const handler = new TransferHandler();
        const context = buildContext();

        context.world.add(
            createEntity("source", {
                state: { bodies: { value: 10, visible: false } },
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

        expect((source?.state as any)?.bodies?.value).toBe(5);
        expect(findPending(context)).toBeDefined();
        expect(context.telemetry.log).toHaveBeenCalled();
    });

    it("immediate mode respects target clamping", () => {
        const handler = new TransferHandler();
        const context = buildContext();

        context.world.add(
            createEntity("source", {
                state: { bodies: { value: 20, visible: false } },
            }),
        );
        context.world.add(
            createEntity("target", {
                state: { bodies: { value: 8, visible: false, max: 10 } },
            }),
        );

        handler.handle(
            {
                type: RuntimeCommandType.TRANSFER_ASSETS,
                payload: {
                    sourceId: "source",
                    targetId: "target",
                    payload: { bodies: 10 },
                    isImmediate: true,
                },
            },
            context,
        );

        const source = context.world.entities.find((e) => e.id === "source");
        const target = context.world.entities.find((e) => e.id === "target");

        expect((target?.state as any)?.bodies?.value).toBe(10);
        expect((source?.state as any)?.bodies?.value).toBe(18);
        expect(findPending(context)).toBeUndefined();
    });
});
