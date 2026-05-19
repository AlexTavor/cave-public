import { describe, expect, it } from "vitest";
import { makeHandlerContext } from "../../engine/runtime/handlers/handlerTestUtils";
import { RuntimeCommandType } from "../../engine/runtime/types";
import { GainHabitiHandler } from "./GainHabitiHandler";

const handle = (
    context: ReturnType<typeof makeHandlerContext>,
    entityId = "sys_world",
) =>
    new GainHabitiHandler().handle(
        {
            type: RuntimeCommandType.GAIN_HABITI,
            payload: { entityId, habitusId: "alpha" },
        },
        context,
    );

describe("GainHabitiHandler", () => {
    it("adds owned habitus, mirrors facts, and enqueues an announcement for sys_world", () => {
        const context = makeHandlerContext();
        context.cartridge.config = {
            ...context.cartridge.config,
            habiti: { alpha: { id: "alpha", label: "Alpha", effects: [] } },
        } as any;
        context.world.add({
            id: "sys_world",
            cave: { ownedHabiti: [] },
        } as any);

        handle(context);

        expect((context.world.entities[0] as any).cave.ownedHabiti).toEqual([
            "alpha",
        ]);
        expect(context.commands?.drain()).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    type: RuntimeCommandType.ADJUST_FACT,
                }),
                expect.objectContaining({
                    type: RuntimeCommandType.UPDATE_STATE,
                }),
            ]),
        );
        expect(
            (context.world.entities[0] as any).habitiAnnouncement.current
                .habitusIds,
        ).toEqual(["alpha"]);
    });

    it("logs explicit errors for missing cave entities and unknown habiti", () => {
        const missing = makeHandlerContext();
        handle(missing, "missing");
        expect(missing.telemetry.log).toHaveBeenCalledWith(
            "errors",
            expect.stringContaining("entity 'missing' not found"),
        );

        const unknown = makeHandlerContext();
        unknown.world.add({
            id: "sys_world",
            cave: { ownedHabiti: [] },
        } as any);
        handle(unknown);
        expect(unknown.telemetry.log).toHaveBeenCalledWith(
            "errors",
            expect.stringContaining("unknown habitus 'alpha'"),
        );
    });
});
