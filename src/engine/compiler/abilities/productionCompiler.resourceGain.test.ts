import { describe, expect, it } from "vitest";
import { createBlueprint } from "../../test/factories";
import { productionCompiler } from "./productionCompiler";
import {
    productionBaseAmountKey,
    productionFinalAmountKey,
} from "./resourceGainAmountKeys";

describe("productionCompiler resource gain", () => {
    it("keeps a hidden base amount and routes production through final amount state", () => {
        const draft = createBlueprint("forge", {
            components: {
                state: { cycle: { value: 0, max: 10, visible: false } },
            },
        });

        productionCompiler(
            draft,
            {
                resource: "wood",
                amount: { base: 2, perBody: 0, multPerBody: 0 },
                conditions: [],
            },
            0,
        );

        const baseKey = productionBaseAmountKey("wood", 0);
        const finalKey = productionFinalAmountKey("wood", 0);
        expect(draft.components.state?.[baseKey]).toEqual({
            value: 2,
            visible: false,
        });
        expect(draft.components.behavior?.rules?.[0]?.actions[0]).toMatchObject(
            {
                value: `self.state.${finalKey}.value`,
            },
        );
    });

    it("adds producer-tag bonus sources for matching blueprint tags", () => {
        const draft = createBlueprint("forge", {
            tags: ["artisan"],
            components: {
                state: { cycle: { value: 0, max: 10, visible: false } },
            },
        });
        productionCompiler(
            draft,
            {
                resource: "wood",
                amount: { base: 2, perBody: 0, multPerBody: 0 },
                conditions: [],
            },
            0,
        );
        expect(draft.components.passiveEffects).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    source: "global.habiti_producer_output_bonus_artisan",
                }),
            ]),
        );
    });
});
