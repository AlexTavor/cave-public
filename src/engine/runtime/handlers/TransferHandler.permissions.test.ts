import { describe, expect, it } from "vitest";
import { TransferHandler } from "./TransferHandler";
import { RuntimeCommandType } from "../types";
import { makeHandlerContext } from "./handlerTestUtils";
import { createCartridge, createEntity } from "../../test/factories";

const handler = new TransferHandler();
const buildContext = () => makeHandlerContext(createCartridge("core.json"));

const findEntity = (ctx: ReturnType<typeof buildContext>, id: string) =>
    ctx.world.entities.find((e) => e.id === id);

const findPending = (ctx: ReturnType<typeof buildContext>) =>
    ctx.world.entities.find((e) => e.id?.startsWith("pending_"));

const transfer = (
    ctx: ReturnType<typeof buildContext>,
    sourceId: string,
    targetId: string,
    payload: Record<string, number>,
    isImmediate?: boolean,
) =>
    handler.handle(
        {
            type: RuntimeCommandType.TRANSFER_ASSETS,
            payload: {
                sourceId,
                targetId,
                payload,
                ...(isImmediate ? { isImmediate } : {}),
            },
        },
        ctx,
    );

describe("TransferHandler permissions", () => {
    it("rejects external transfers into disallowed storage", () => {
        const ctx = buildContext();
        ctx.world.add(
            createEntity("source", {
                state: { wood: { value: 5, visible: false } },
            }),
        );
        ctx.world.add(
            createEntity("target", {
                state: {
                    wood: { value: 0, visible: false, allowDeposit: false },
                },
            }),
        );

        transfer(ctx, "source", "target", { wood: 2 });

        expect((findEntity(ctx, "source")?.state as any)?.wood?.value).toBe(5);
        expect(findPending(ctx)).toBeUndefined();
        expect(ctx.telemetry.log).toHaveBeenCalledWith(
            "errors",
            expect.stringContaining("disallows"),
        );
    });

    it("allows internal transfers even when deposits are blocked", () => {
        const ctx = buildContext();
        ctx.world.add(
            createEntity("chest", {
                state: { wood: { value: 4, allowDeposit: false } },
            }),
        );

        transfer(ctx, "chest", "chest", { wood: 2 });

        const chest = findEntity(ctx, "chest");
        expect((chest?.state as any)?.wood?.value).toBe(2);
        expect(chest?.ledger?.incoming?.wood).toBe(2);
        expect(findPending(ctx)).toBeDefined();
    });

    it("immediate transfers still respect allowDeposit", () => {
        const ctx = buildContext();
        ctx.world.add(
            createEntity("source", {
                state: { bodies: { value: 10, visible: false } },
            }),
        );
        ctx.world.add(
            createEntity("target", {
                state: { bodies: { value: 0, allowDeposit: false } },
            }),
        );

        transfer(ctx, "source", "target", { bodies: 5 }, true);

        expect((findEntity(ctx, "source")?.state as any)?.bodies?.value).toBe(
            10,
        );
        expect((findEntity(ctx, "target")?.state as any)?.bodies?.value).toBe(
            0,
        );
        expect(findPending(ctx)).toBeUndefined();
        expect(ctx.telemetry.log).toHaveBeenCalledWith(
            "errors",
            expect.stringContaining("disallows"),
        );
    });
});
