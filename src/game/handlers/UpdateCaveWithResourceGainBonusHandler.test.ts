import { describe, expect, it } from "vitest";
import { makeHandlerContext } from "../../engine/runtime/handlers/handlerTestUtils";
import { RuntimeCommandType } from "../../engine/runtime/types";
import { UpdateCaveWithResourceGainBonusHandler } from "./UpdateCaveWithResourceGainBonusHandler";

const addHabitiConfig = (context: ReturnType<typeof makeHandlerContext>) => {
    context.cartridge.config = {
        ...context.cartridge.config,
        habiti: {
            woods: {
                id: "woods",
                label: "Woodsman",
                description: "",
                summary: "",
                type: "profession",
                excludes: [],
                effects: [
                    {
                        type: "add_resource_gain_multiplier",
                        resource: "wood",
                        amount: 0.1,
                        description: "+10% wood",
                    },
                ],
            },
        },
    } as any;
};

describe("UpdateCaveWithResourceGainBonusHandler", () => {
    it("syncs hidden world bonus state after updating owned habiti", () => {
        const context = makeHandlerContext();
        addHabitiConfig(context);
        context.world.add({ id: "sys_world", cave: {}, state: {} } as any);
        new UpdateCaveWithResourceGainBonusHandler().handle(
            {
                type: RuntimeCommandType.UPDATE_CAVE,
                payload: { entityId: "sys_world", ownedHabiti: ["woods"] },
            },
            context,
        );

        expect(context.commands?.drain()).toEqual(
            expect.arrayContaining([
                {
                    type: RuntimeCommandType.UPDATE_STATE,
                    payload: {
                        entityId: "sys_world",
                        key: "habiti_purge_progress_max_bonus",
                        value: 0,
                        visible: false,
                    },
                },
                {
                    type: RuntimeCommandType.UPDATE_STATE,
                    payload: {
                        entityId: "sys_world",
                        key: "habiti_resource_gain_bonus_wood",
                        value: 0.1,
                        visible: false,
                    },
                },
            ]),
        );
    });

    it("skips bonus sync for mind-only cave updates", () => {
        const context = makeHandlerContext();
        addHabitiConfig(context);
        context.world.add({ id: "sys_world", cave: {}, state: {} } as any);
        new UpdateCaveWithResourceGainBonusHandler().handle(
            {
                type: RuntimeCommandType.UPDATE_CAVE,
                payload: {
                    entityId: "sys_world",
                    mind: { pulsePresetKey: "calm" } as any,
                },
            },
            context,
        );
        expect(context.commands?.drain()).toEqual([]);
    });

    it("keeps the base handler error path and skips sync for missing entities", () => {
        const context = makeHandlerContext();
        addHabitiConfig(context);
        new UpdateCaveWithResourceGainBonusHandler().handle(
            {
                type: RuntimeCommandType.UPDATE_CAVE,
                payload: { entityId: "missing", ownedHabiti: ["woods"] },
            },
            context,
        );
        expect(context.telemetry.log).toHaveBeenCalledWith(
            "errors",
            expect.stringContaining("entity 'missing' not found"),
        );
        expect(context.commands?.drain()).toEqual([]);
    });

    it("skips bonus sync when the target entity has no cave component", () => {
        const context = makeHandlerContext();
        addHabitiConfig(context);
        context.world.add({ id: "sys_world", state: {} } as any);
        new UpdateCaveWithResourceGainBonusHandler().handle(
            {
                type: RuntimeCommandType.UPDATE_CAVE,
                payload: { entityId: "sys_world", ownedHabiti: ["woods"] },
            },
            context,
        );
        expect(context.commands?.drain()).toEqual([]);
    });
});
