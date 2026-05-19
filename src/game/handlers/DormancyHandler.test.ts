import { describe, expect, it } from "vitest";
import { makeHandlerContext } from "../../engine/runtime/handlers/handlerTestUtils";
import { RuntimeCommandType } from "../../engine/runtime/types";
import { createEntity } from "../../engine/test/factories";
import { DormancyHandler } from "./DormancyHandler";

const DORMANCY = {
    type: RuntimeCommandType.GAME_DORMANCY,
    payload: { reason: "extinction" },
} as const;

const makeCtx = (worldOverrides: Record<string, unknown> = {}) => {
    const context = makeHandlerContext();
    context.world.add(
        createEntity("sys_world", {
            state: {},
            cave: { progression: { xp: 50, level: 3, skillpoints: 0 } },
            ...worldOverrides,
        }),
    );
    return context;
};

describe("DormancyHandler", () => {
    it("does not remove non-world entities", () => {
        const ctx = makeCtx();
        ctx.world.add(createEntity("extra"));
        new DormancyHandler().handle(DORMANCY, ctx);
        expect(ctx.world.entities.find((e) => e.id === "extra")).toBeDefined();
    });

    it("logs dormancy reason via telemetry", () => {
        const ctx = makeCtx();
        new DormancyHandler().handle(DORMANCY, ctx);
        expect(ctx.telemetry.log).toHaveBeenCalledWith(
            "tick",
            expect.stringContaining("extinction"),
        );
    });

    it("logs error when sys_world is missing", () => {
        const ctx = makeHandlerContext();
        new DormancyHandler().handle(DORMANCY, ctx);
        expect(ctx.telemetry.log).toHaveBeenCalledWith(
            "errors",
            expect.stringContaining("sys_world"),
        );
    });
});

