import { describe, expect, it } from "vitest";
import { makeHandlerContext } from "../../engine/runtime/handlers/handlerTestUtils";
import { RuntimeCommandType } from "../../engine/runtime/types";
import { GainUnderstandingHandler } from "./GainUnderstandingHandler";

const addUnderstandingConfig = (
    context: ReturnType<typeof makeHandlerContext>,
) => {
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
                        amount: 0.15,
                        description: "",
                    },
                ],
            },
        },
    } as any;
};

const handleGainUnderstanding = (
    context: ReturnType<typeof makeHandlerContext>,
    entityId = "sys_world",
) =>
    new GainUnderstandingHandler().handle(
        {
            type: RuntimeCommandType.GAIN_UNDERSTANDING,
            payload: { entityId, understandingId: "insight" },
        },
        context,
    );

describe("GainUnderstandingHandler", () => {
    it("adds an understanding id, emits mirrored facts, and syncs hidden state", () => {
        const context = makeHandlerContext();
        addUnderstandingConfig(context);
        context.world.add({
            id: "sys_world",
            cave: { ownedUnderstanding: [] },
        } as any);

        handleGainUnderstanding(context);

        expect(
            (context.world.entities[0] as any).cave.ownedUnderstanding,
        ).toEqual(["insight"]);
        expect(context.commands?.drain()).toEqual(
            expect.arrayContaining([
                {
                    type: RuntimeCommandType.ADJUST_FACT,
                    payload: {
                        scope: "run",
                        factType: "understanding_owned",
                        factAbout: "insight",
                        delta: 1,
                    },
                },
                {
                    type: RuntimeCommandType.ADJUST_FACT,
                    payload: {
                        scope: "permanent",
                        factType: "understanding_owned",
                        factAbout: "insight",
                        delta: 1,
                    },
                },
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
                        value: 0.15,
                        visible: false,
                    },
                },
            ]),
        );
    });

    it("does nothing for duplicate acquisitions on sys_world", () => {
        const context = makeHandlerContext();
        addUnderstandingConfig(context);
        context.world.add({
            id: "sys_world",
            cave: { ownedUnderstanding: ["insight"] },
        } as any);

        handleGainUnderstanding(context);

        expect(
            (context.world.entities[0] as any).cave.ownedUnderstanding,
        ).toEqual(["insight"]);
        expect(context.commands?.drain()).toEqual([]);
        expect(context.telemetry.log).not.toHaveBeenCalled();
    });

    it("updates non-world cave entities without world fact side effects", () => {
        const context = makeHandlerContext();
        addUnderstandingConfig(context);
        context.world.add({
            id: "cave_1",
            cave: { ownedUnderstanding: [] },
        } as any);

        handleGainUnderstanding(context, "cave_1");

        expect(
            (context.world.entities[0] as any).cave.ownedUnderstanding,
        ).toEqual(["insight"]);
        expect(context.commands?.drain()).toEqual([]);
    });
});
