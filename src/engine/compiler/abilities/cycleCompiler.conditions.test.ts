import { describe, expect, it } from "vitest";
import { CompilerService } from "../CompilerService";
import { createBlueprint } from "../../test/factories";

describe("cycleCompiler conditions", () => {
    it("appends condition gates to cycle accumulation rule", () => {
        const blueprint = createBlueprint("bp_cycle", {
            components: {},
            _editor: {
                abilities: {
                    cycle: {
                        maxProgress: { base: 5, perBody: 0, multPerBody: 0 },
                        costMultPerCycle: 0,
                        inputs: {
                            body: { base: 1, perBody: 0, multPerBody: 0 },
                        },
                        oneOff: false,
                        conditions: ["self.state.enabled.value != 0"],
                    },
                },
            },
        });

        const compiled = new CompilerService().compile(blueprint);
        const rule = compiled.components.behavior?.rules?.find(
            (entry) => entry.id === "sys_cycle_accumulate",
        );
        const conditions = rule?.conditions ?? [];

        expect(conditions).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    tokens: [
                        { t: "ref", v: "self.state.enabled.value" },
                        { t: "op", v: "!=" },
                        { t: "val", v: 0 },
                    ],
                }),
            ]),
        );
    });
});
