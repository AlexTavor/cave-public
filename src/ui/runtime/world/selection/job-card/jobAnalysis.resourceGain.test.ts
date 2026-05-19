import { describe, expect, it } from "vitest";
import { analyzeJobStatus } from "./jobAnalysis";

describe("jobAnalysis resource gain", () => {
    it("uses final runtime amounts and bonus breakdown tooltips", () => {
        const entity = {
            blueprintId: "forge",
            state: {
                vals_prod_base_wood_amt_0: { value: 10 },
                vals_prod_wood_amt_0: { value: 11 },
                vals_conv_out_base_heat_0_0: { value: 5 },
                vals_conv_out_heat_0_0: { value: 5.5 },
            },
        } as any;
        const runtime = {
            getEntity: () => ({
                id: "sys_world",
                cave: { ownedHabiti: ["woods"] },
            }),
            getCartridge: () => ({
                blueprints: {
                    forge: {
                        components: {
                            behavior: {
                                rules: [
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
                                    },
                                    {
                                        id: "sys_convert_smelt_0",
                                        sortKey: "b",
                                        conditions: [],
                                        actions: [
                                            {
                                                type: "MUTATE",
                                                target: "self.state.heat.value",
                                                op: "ADD",
                                                value: "self.state.vals_conv_out_heat_0_0.value",
                                            },
                                        ],
                                    },
                                ],
                            },
                        },
                    },
                },
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
            }),
        } as any;

        const result = analyzeJobStatus(entity, runtime);
        expect(result.nextCycleGroups[0].effects[0]).toMatchObject({
            valueText: "+11",
        });
        expect(result.nextCycleGroups[0].effects[0].tooltipLines).toContain(
            "Base: 10",
        );
        expect(result.nextCycleGroups[1].effects[0]).toMatchObject({
            valueText: "+5.5",
        });
    });

    it("includes producer-tag bonus descriptions in runtime tooltips", () => {
        const result = analyzeJobStatus(
            {
                blueprintId: "forge",
                tags: ["artisan"],
                state: {
                    vals_prod_base_wood_amt_0: { value: 10 },
                    vals_prod_wood_amt_0: { value: 13 },
                },
            } as any,
            {
                getEntity: () => ({
                    id: "sys_world",
                    cave: { ownedHabiti: ["smith"] },
                }),
                getCartridge: () => ({
                    blueprints: {
                        forge: {
                            components: {
                                behavior: {
                                    rules: [
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
                                        },
                                    ],
                                },
                            },
                        },
                    },
                    config: {
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
                    },
                }),
            } as any,
        );
        expect(result.nextCycleGroups[0].effects[0].tooltipLines).toContain(
            "+25% artisan",
        );
    });
});
