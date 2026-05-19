import { describe, expect, it } from "vitest";
import { makeHandlerContext } from "../../engine/runtime/handlers/handlerTestUtils";
import { RuntimeCommandType } from "../../engine/runtime/types";
import { UpdateCaveWithResourceGainBonusHandler } from "./UpdateCaveWithResourceGainBonusHandler";

describe("UpdateCaveWithResourceGainBonusHandler producer tags", () => {
    it("syncs hidden producer-tag bonus state after cave habitus updates", () => {
        const context = makeHandlerContext();
        context.cartridge.config = {
            ...context.cartridge.config,
            habiti: {
                smith: {
                    id: "smith",
                    label: "Smith",
                    description: "",
                    summary: "",
                    type: "profession",
                    excludes: [],
                    effects: [
                        {
                            type: "add_producer_output_multiplier",
                            producerTag: "artisan",
                            amount: 0.25,
                            description: "+25% artisan",
                        },
                    ],
                },
            },
        } as any;
        context.world.add({ id: "sys_world", cave: {}, state: {} } as any);
        new UpdateCaveWithResourceGainBonusHandler().handle(
            {
                type: RuntimeCommandType.UPDATE_CAVE,
                payload: { entityId: "sys_world", ownedHabiti: ["smith"] },
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
                        key: "habiti_producer_output_bonus_artisan",
                        value: 0.25,
                        visible: false,
                    },
                },
            ]),
        );
    });
});
