import { describe, expect, it } from "vitest";
import {
    conversionOutputBaseAmountKey,
    productionBaseAmountKey,
} from "../../../../../engine/compiler/abilities/resourceGainAmountKeys";
import {
    buildConversionGroup,
    buildProductionEffects,
} from "./jobAnalysis.resourceGainEffects";

const runtime = {
    getEntity: () => ({ id: "sys_world", cave: { ownedHabiti: ["woods"] } }),
    getCartridge: () => ({
        config: {
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
                            resource: "heat",
                            amount: 0.1,
                            description: "+10% heat",
                        },
                    ],
                },
            },
        },
    }),
} as any;

describe("jobAnalysis resource gain effects", () => {
    it("keeps authored output indexes when earlier outputs are hidden", () => {
        const entity = {
            state: {
                [conversionOutputBaseAmountKey("ash", 0, 0)]: { value: 2 },
                [conversionOutputBaseAmountKey("heat", 0, 1)]: { value: 5 },
                vals_conv_out_ash_0_0: { value: 0 },
                vals_conv_out_heat_0_1: { value: 5.5 },
            },
        } as any;
        const group = buildConversionGroup(
            entity,
            {
                id: "sys_convert_smelter_0",
                sortKey: "a",
                conditions: [],
                actions: [
                    {
                        type: "MUTATE",
                        target: "self.state.ash.value",
                        op: "ADD",
                        value: "self.state.vals_conv_out_ash_0_0.value",
                    },
                    {
                        type: "MUTATE",
                        target: "self.state.heat.value",
                        op: "ADD",
                        value: "self.state.vals_conv_out_heat_0_1.value",
                    },
                ],
            } as any,
            runtime,
        );
        expect(group?.effects).toHaveLength(1);
        expect(group?.effects[0]?.tooltipLines).toContain("Base: 5");
    });

    it("maps multiple visible outputs to their matching base keys", () => {
        const entity = {
            state: {
                [conversionOutputBaseAmountKey("heat", 0, 0)]: { value: 5 },
                [conversionOutputBaseAmountKey("light", 0, 1)]: { value: 7 },
                vals_conv_out_heat_0_0: { value: 5.5 },
                vals_conv_out_light_0_1: { value: 7.7 },
            },
        } as any;
        const group = buildConversionGroup(
            entity,
            {
                id: "sys_convert_smelter_0",
                sortKey: "a",
                conditions: [],
                actions: [
                    {
                        type: "MUTATE",
                        target: "self.state.heat.value",
                        op: "ADD",
                        value: "self.state.vals_conv_out_heat_0_0.value",
                    },
                    {
                        type: "MUTATE",
                        target: "self.state.light.value",
                        op: "ADD",
                        value: "self.state.vals_conv_out_light_0_1.value",
                    },
                ],
            } as any,
            runtime,
        );
        expect(group?.effects[0]?.tooltipLines).toContain("Base: 5");
        expect(group?.effects[1]?.tooltipLines).toContain("Base: 7");
    });

    it("keeps production base lookup unchanged", () => {
        const entity = {
            state: {
                [productionBaseAmountKey("wood", 0)]: { value: 10 },
                vals_prod_wood_amt_0: { value: 11 },
            },
        } as any;
        const effects = buildProductionEffects(
            entity,
            {
                id: "sys_produce_wood_0",
                sortKey: "a",
                conditions: [],
                actions: [
                    {
                        type: "MUTATE",
                        target: "self.state.wood.value",
                        op: "ADD",
                        value: "self.state.vals_prod_wood_amt_0.value",
                    },
                ],
            } as any,
            runtime,
        );
        expect(effects[0]).toMatchObject({ valueText: "+11" });
        expect(effects[0]?.tooltipLines).toContain("Base: 10");
    });
});
