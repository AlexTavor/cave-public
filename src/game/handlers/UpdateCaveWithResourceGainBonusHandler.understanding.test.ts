import { describe, expect, it } from "vitest";
import { makeHandlerContext } from "../../engine/runtime/handlers/handlerTestUtils";
import { RuntimeCommandType } from "../../engine/runtime/types";
import { UpdateCaveWithResourceGainBonusHandler } from "./UpdateCaveWithResourceGainBonusHandler";

describe("UpdateCaveWithResourceGainBonusHandler understanding", () => {
    it("syncs hidden world bonus state after updating owned understanding", () => {
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
                            type: "add_resource_gain_multiplier",
                            resource: "wood",
                            amount: 0.25,
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
                        value: 0.25,
                        visible: false,
                    },
                },
            ]),
        );
    });
});
