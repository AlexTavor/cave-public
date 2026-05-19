import { describe, expect, it } from "vitest";
import { createBlueprint } from "../../test/factories";
import { conversionCompiler } from "./conversionCompiler";

describe("conversionCompiler resource gain", () => {
    it("keeps inputs unchanged and routes outputs through final amount state", () => {
        const draft = createBlueprint("smelter", {
            components: {
                state: {
                    cycle: { value: 0, max: 10, visible: false },
                    wood: { value: 4 },
                    heat: { value: 0 },
                },
            },
        });

        conversionCompiler(
            draft,
            {
                id: "smelt",
                inputs: [
                    {
                        resource: "wood",
                        amount: { base: 2, perBody: 0, multPerBody: 0 },
                    },
                ],
                outputs: [
                    {
                        resource: "heat",
                        amount: { base: 5, perBody: 0, multPerBody: 0 },
                    },
                ],
                conditions: [],
            },
            0,
        );

        const rule = draft.components.behavior?.rules?.find(
            (entry) => entry.id === "sys_convert_smelt_0",
        );
        expect(rule?.actions).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    op: "SUB",
                    value: "self.state.vals_conv_in_wood_0_0.value",
                }),
                expect.objectContaining({
                    op: "ADD",
                    value: "self.state.vals_conv_out_heat_0_0.value",
                }),
            ]),
        );
        expect(draft.components.state?.vals_conv_out_base_heat_0_0).toEqual({
            value: 5,
            visible: false,
        });
    });

    it("adds producer-tag bonus sources for conversion outputs", () => {
        const draft = createBlueprint("smelter", {
            tags: ["artisan"],
            components: {
                state: {
                    cycle: { value: 0, max: 10, visible: false },
                    wood: { value: 4 },
                    heat: { value: 0 },
                },
            },
        });
        conversionCompiler(
            draft,
            {
                id: "smelt",
                inputs: [
                    {
                        resource: "wood",
                        amount: { base: 2, perBody: 0, multPerBody: 0 },
                    },
                ],
                outputs: [
                    {
                        resource: "heat",
                        amount: { base: 5, perBody: 0, multPerBody: 0 },
                    },
                ],
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
