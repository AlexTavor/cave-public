import { describe, expect, it } from "vitest";
import { CompilerService } from "../CompilerService";
import { createBlueprint } from "../../test/factories";

describe("conversionCompiler conditions", () => {
    it("appends condition gates to conversion rules", () => {
        const blueprint = createBlueprint("bp_smelter", {
            components: {},
            _editor: {
                abilities: {
                    cycle: {
                        maxProgress: { base: 1, perBody: 0, multPerBody: 0 },
                        costMultPerCycle: 0,
                        inputs: {
                            body: { base: 1, perBody: 0, multPerBody: 0 },
                        },
                        oneOff: false,
                        conditions: [],
                    },
                    conversion: [
                        {
                            id: "smelt",
                            inputs: [
                                {
                                    resource: "iron",
                                    amount: {
                                        base: 1,
                                        perBody: 0,
                                        multPerBody: 0,
                                    },
                                },
                            ],
                            outputs: [
                                {
                                    resource: "steel",
                                    amount: {
                                        base: 1,
                                        perBody: 0,
                                        multPerBody: 0,
                                    },
                                },
                            ],
                            resetCycle: true,
                            conditions: ["self.state.iron.value > 0"],
                        },
                    ],
                },
            },
        });

        const compiled = new CompilerService().compile(blueprint);
        const rule = compiled.components.behavior?.rules?.find(
            (entry) => entry.id === "sys_convert_smelt_0",
        );
        const conditions = rule?.conditions ?? [];

        expect(conditions).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    tokens: [
                        { t: "ref", v: "self.state.iron.value" },
                        { t: "op", v: ">" },
                        { t: "val", v: 0 },
                    ],
                }),
            ]),
        );
    });
});
