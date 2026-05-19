import { describe, expect, it } from "vitest";
import { AdjustFactHandler } from "./AdjustFactHandler";
import { RuntimeCommandType } from "../../engine/runtime/types";
import { makeHandlerContext } from "../../engine/runtime/handlers/handlerTestUtils";

describe("AdjustFactHandler", () => {
    it("creates sparse fact maps and clamps at zero", () => {
        const context = makeHandlerContext();
        context.world.add({ id: "sys_world" } as any);
        const handler = new AdjustFactHandler();

        handler.handle(
            {
                type: RuntimeCommandType.ADJUST_FACT,
                payload: {
                    scope: "run",
                    factType: "purge_began",
                    factAbout: "world",
                    delta: 2,
                },
            },
            context,
        );
        handler.handle(
            {
                type: RuntimeCommandType.ADJUST_FACT,
                payload: {
                    scope: "run",
                    factType: "purge_began",
                    factAbout: "world",
                    delta: -5,
                },
            },
            context,
        );

        expect((context.world.entities[0] as any).run.purge_began.world).toBe(
            0,
        );
    });

    it("logs when sys_world is missing", () => {
        const context = makeHandlerContext();
        new AdjustFactHandler().handle(
            {
                type: RuntimeCommandType.ADJUST_FACT,
                payload: {
                    scope: "run",
                    factType: "purge_began",
                    factAbout: "world",
                    delta: 1,
                },
            },
            context,
        );

        expect(context.telemetry.log).toHaveBeenCalledWith(
            "errors",
            "ADJUST_FACT failed: sys_world missing.",
        );
    });
});
