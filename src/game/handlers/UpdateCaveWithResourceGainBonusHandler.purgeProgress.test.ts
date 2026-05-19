import { describe, expect, it } from "vitest";
import { makeHandlerContext } from "../../engine/runtime/handlers/handlerTestUtils";
import { RuntimeCommandType } from "../../engine/runtime/types";
import { UpdateCaveWithResourceGainBonusHandler } from "./UpdateCaveWithResourceGainBonusHandler";

describe("UpdateCaveWithResourceGainBonusHandler purge progress", () => {
    it("syncs hidden purge max bonus state after owned habiti updates", () => {
        const context = makeHandlerContext();
        context.cartridge.config = {
            ...context.cartridge.config,
            habiti: {
                cautious: {
                    id: "cautious",
                    label: "Cautious",
                    description: "",
                    summary: "",
                    type: "profession",
                    excludes: [],
                    effects: [
                        {
                            type: "increase_max_purge",
                            amount: 25,
                            description: "",
                        },
                    ],
                },
            },
        } as any;
        context.world.add({ id: "sys_world", cave: {}, state: {} } as any);
        new UpdateCaveWithResourceGainBonusHandler().handle(
            {
                type: RuntimeCommandType.UPDATE_CAVE,
                payload: { entityId: "sys_world", ownedHabiti: ["cautious"] },
            },
            context,
        );
        expect(context.commands?.drain()).toEqual([
            {
                type: RuntimeCommandType.UPDATE_STATE,
                payload: {
                    entityId: "sys_world",
                    key: "habiti_purge_progress_max_bonus",
                    value: 25,
                    visible: false,
                },
            },
        ]);
    });

    it("syncs hidden purge max bonus state after owned understanding updates", () => {
        const context = makeHandlerContext();
        context.cartridge.config = {
            ...context.cartridge.config,
            understanding: {
                insight: {
                    id: "insight",
                    label: "Insight",
                    description: "",
                    effects: [
                        {
                            type: "increase_max_purge",
                            amount: 15,
                            description: "",
                        },
                    ],
                },
            },
        } as any;
        context.world.add({ id: "sys_world", cave: {}, state: {} } as any);
        new UpdateCaveWithResourceGainBonusHandler().handle(
            {
                type: RuntimeCommandType.UPDATE_CAVE,
                payload: {
                    entityId: "sys_world",
                    ownedUnderstanding: ["insight"],
                },
            },
            context,
        );
        expect(context.commands?.drain()).toEqual([
            expect.objectContaining({
                payload: expect.objectContaining({
                    key: "habiti_purge_progress_max_bonus",
                    value: 15,
                    visible: false,
                }),
            }),
        ]);
    });
});
