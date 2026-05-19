import { describe, expect, it } from "vitest";
import { makeHandlerContext } from "../../engine/runtime/handlers/handlerTestUtils";
import { RuntimeCommandType } from "../../engine/runtime/types";
import { GainUnderstandingHandler } from "./GainUnderstandingHandler";

describe("GainUnderstandingHandler purge progress", () => {
    it("gaining understanding syncs the hidden purge max bonus state", () => {
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
                            amount: 30,
                            description: "",
                        },
                    ],
                },
            },
        } as any;
        context.world.add({
            id: "sys_world",
            cave: { ownedUnderstanding: [] },
        } as any);
        new GainUnderstandingHandler().handle(
            {
                type: RuntimeCommandType.GAIN_UNDERSTANDING,
                payload: { entityId: "sys_world", understandingId: "insight" },
            },
            context,
        );
        expect(
            (context.world.entities[0] as any).cave.ownedUnderstanding,
        ).toEqual(["insight"]);
        expect(context.commands?.drain()).toContainEqual({
            type: RuntimeCommandType.UPDATE_STATE,
            payload: {
                entityId: "sys_world",
                key: "habiti_purge_progress_max_bonus",
                value: 30,
                visible: false,
            },
        });
    });
});
