import { describe, expect, it } from "vitest";
import { makeHandlerContext } from "../../engine/runtime/handlers/handlerTestUtils";
import { RuntimeCommandType } from "../../engine/runtime/types";
import { GainUnderstandingHandler } from "./GainUnderstandingHandler";

const handleGainUnderstanding = (
    context: ReturnType<typeof makeHandlerContext>,
    entityId: string,
    understandingId = "insight",
) =>
    new GainUnderstandingHandler().handle(
        {
            type: RuntimeCommandType.GAIN_UNDERSTANDING,
            payload: { entityId, understandingId },
        },
        context,
    );

describe("GainUnderstandingHandler errors", () => {
    it("logs an explicit error when the entity is missing", () => {
        const context = makeHandlerContext();

        handleGainUnderstanding(context, "missing");

        expect(context.telemetry.log).toHaveBeenCalledWith(
            "errors",
            expect.stringContaining("entity 'missing' not found"),
        );
    });

    it("logs an explicit error when the entity has no cave component", () => {
        const context = makeHandlerContext();
        context.world.add({ id: "sys_world" } as any);

        handleGainUnderstanding(context, "sys_world");

        expect(context.telemetry.log).toHaveBeenCalledWith(
            "errors",
            expect.stringContaining("entity 'sys_world' has no cave component"),
        );
    });

    it("logs an explicit error when the understanding id is unknown", () => {
        const context = makeHandlerContext();
        context.world.add({
            id: "sys_world",
            cave: { ownedUnderstanding: [] },
        } as any);

        handleGainUnderstanding(context, "sys_world", "unknown");

        expect(context.telemetry.log).toHaveBeenCalledWith(
            "errors",
            expect.stringContaining("unknown understanding 'unknown'"),
        );
    });
});
