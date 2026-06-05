import { describe, expect, it } from "vitest";
import { createBlueprint } from "../../test/factories";
import {
    compileConversionInputAmount,
    compileConversionOutputAmount,
} from "./conversionCompilerAmounts";

describe("compileConversionInputAmount", () => {
    it("returns the amount ref and seeds zero-scale state + a single SET effect", () => {
        const draft = createBlueprint("smelter", { components: {} });

        const ref = compileConversionInputAmount({
            draft,
            resource: "iron",
            conversionIndex: 0,
            inputIndex: 1,
            // amount omitted -> normalizeScale fills base/perBody/multPerBody = 0
        });

        expect(ref).toBe("self.state.vals_conv_in_iron_0_1.value");
        // ensureStateEntry seeds both the amount key and the resource;
        // compileScalableValue with zero scale sets the amount-key initial value to base (0).
        expect(draft.components.state).toEqual({
            vals_conv_in_iron_0_1: { value: 0, visible: false },
            iron: { value: 0, visible: false },
        });
        expect(draft.components.passiveEffects).toEqual([
            {
                op: "SET",
                target: "self.state.vals_conv_in_iron_0_1.value",
                value: 0,
            },
        ]);
    });

    it("honors a non-zero base in the seeded SET effect", () => {
        const draft = createBlueprint("smelter", { components: {} });

        compileConversionInputAmount({
            draft,
            resource: "iron",
            conversionIndex: 2,
            inputIndex: 0,
            amount: { base: 5 },
        });

        expect(draft.components.passiveEffects).toEqual([
            {
                op: "SET",
                target: "self.state.vals_conv_in_iron_2_0.value",
                value: 5,
            },
        ]);
        // Zero-scale path also seeds the state entry's initial value to base (5).
        expect(draft.components.state?.vals_conv_in_iron_2_0).toEqual({
            value: 5,
            visible: false,
        });
    });

    it("emits per-body scaling effects keyed by the conv_in temp var name", () => {
        const draft = createBlueprint("smelter", { components: {} });

        compileConversionInputAmount({
            draft,
            resource: "iron",
            conversionIndex: 0,
            inputIndex: 0,
            amount: { base: 2, perBody: 3, multPerBody: 0 },
        });

        // The temp var name "conv_in_0_0" must survive verbatim: a temp state
        // key vals_conv_in_0_0 is created and referenced in the ADD chain.
        expect(draft.components.state?.vals_conv_in_0_0).toEqual({
            value: 0,
            visible: false,
        });
        expect(draft.components.passiveEffects).toEqual([
            {
                op: "SET",
                target: "self.state.vals_conv_in_iron_0_0.value",
                value: 2,
            },
            {
                op: "SET",
                target: "self.state.vals_conv_in_0_0",
                source: "global.population",
            },
            {
                op: "MULT",
                target: "self.state.vals_conv_in_0_0",
                value: 3,
            },
            {
                op: "ADD",
                target: "self.state.vals_conv_in_iron_0_0.value",
                source: "self.state.vals_conv_in_0_0",
            },
        ]);
    });

    it("emits mult-per-body scaling effects keyed by the conv_in temp var name", () => {
        const draft = createBlueprint("smelter", { components: {} });

        compileConversionInputAmount({
            draft,
            resource: "iron",
            conversionIndex: 0,
            inputIndex: 0,
            amount: { base: 0, perBody: 0, multPerBody: 4 },
        });

        // multPerBody path creates vals_conv_in_0_0_m and references it.
        expect(draft.components.state?.vals_conv_in_0_0_m).toEqual({
            value: 0,
            visible: false,
        });
        expect(draft.components.passiveEffects).toEqual([
            {
                op: "SET",
                target: "self.state.vals_conv_in_iron_0_0.value",
                value: 0,
            },
            {
                op: "SET",
                target: "self.state.vals_conv_in_0_0_m",
                source: "global.population",
            },
            {
                op: "MULT",
                target: "self.state.vals_conv_in_0_0_m",
                value: 4,
            },
            {
                op: "MULT",
                target: "self.state.vals_conv_in_iron_0_0.value",
                source: "self.state.vals_conv_in_0_0_m",
            },
        ]);
    });
});

describe("compileConversionOutputAmount", () => {
    it("returns the FINAL amount ref and builds base + adjusted-multiplier effects", () => {
        const draft = createBlueprint("smelter", { components: {}, tags: [] });

        const ref = compileConversionOutputAmount({
            draft,
            resource: "steel",
            conversionIndex: 0,
            outputIndex: 0,
            amount: { base: 7 },
        });

        expect(ref).toBe("self.state.vals_conv_out_steel_0_0.value");

        // State entries: base, final, resource, and the multiplier key.
        // appendResourceGainAdjustedAmount copies the numeric base (7) into final.
        expect(draft.components.state).toEqual({
            vals_conv_out_base_steel_0_0: { value: 7, visible: false },
            vals_conv_out_steel_0_0: { value: 7, visible: false },
            steel: { value: 0, visible: false },
            vals_conv_out_mult_steel_0_0: { value: 0, visible: false },
        });

        expect(draft.components.passiveEffects).toEqual([
            // base amount (zero scale -> single SET)
            {
                op: "SET",
                target: "self.state.vals_conv_out_base_steel_0_0.value",
                value: 7,
            },
            // adjusted-amount block from appendResourceGainAdjustedAmount
            {
                op: "SET",
                target: "self.state.vals_conv_out_mult_steel_0_0.value",
                source: "global.habiti_resource_gain_bonus_steel",
            },
            {
                op: "ADD",
                target: "self.state.vals_conv_out_mult_steel_0_0.value",
                value: 1,
            },
            {
                op: "SET",
                target: "self.state.vals_conv_out_steel_0_0.value",
                source: "self.state.vals_conv_out_base_steel_0_0.value",
            },
            {
                op: "MULT",
                target: "self.state.vals_conv_out_steel_0_0.value",
                source: "self.state.vals_conv_out_mult_steel_0_0.value",
            },
        ]);
    });

    it("emits per-body scaling for the base keyed by the conv_out_base temp var name", () => {
        const draft = createBlueprint("smelter", { components: {}, tags: [] });

        compileConversionOutputAmount({
            draft,
            resource: "steel",
            conversionIndex: 1,
            outputIndex: 2,
            amount: { base: 0, perBody: 9, multPerBody: 0 },
        });

        // temp var name "conv_out_base_1_2" must survive verbatim.
        expect(draft.components.state?.vals_conv_out_base_1_2).toEqual({
            value: 0,
            visible: false,
        });
        // The base-amount per-body chain references that temp key.
        expect(draft.components.passiveEffects).toEqual(
            expect.arrayContaining([
                {
                    op: "SET",
                    target: "self.state.vals_conv_out_base_steel_1_2.value",
                    value: 0,
                },
                {
                    op: "SET",
                    target: "self.state.vals_conv_out_base_1_2",
                    source: "global.population",
                },
                {
                    op: "MULT",
                    target: "self.state.vals_conv_out_base_1_2",
                    value: 9,
                },
                {
                    op: "ADD",
                    target: "self.state.vals_conv_out_base_steel_1_2.value",
                    source: "self.state.vals_conv_out_base_1_2",
                },
            ]),
        );
    });
});
