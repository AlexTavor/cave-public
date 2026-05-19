import { describe, expect, it } from "vitest";
import { createBlueprint } from "../../test/factories";
import { productionCompiler } from "./productionCompiler";

describe("productionCompiler conditions", () => {
    it("appends condition gates to production rules", () => {
        const draft = createBlueprint("bp_prod", {
            components: {
                state: {
                    cycle: { value: 0, max: 10, visible: false },
                },
            },
        });

        productionCompiler(
            draft,
            {
                resource: "wood",
                amount: { base: 1, perBody: 0, multPerBody: 0 },
                conditions: [
                    "self.state.active.value > 0",
                    "global.season == 1",
                ],
            },
            0,
        );

        const rule = draft.components.behavior?.rules?.find(
            (entry) => entry.id === "sys_produce_wood_0",
        );
        const conditions = rule?.conditions ?? [];

        expect(conditions).toHaveLength(4);
        expect(conditions).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    tokens: [
                        { t: "ref", v: "self.state.active.value" },
                        { t: "op", v: ">" },
                        { t: "val", v: 0 },
                    ],
                }),
                expect.objectContaining({
                    tokens: [
                        { t: "ref", v: "global.season" },
                        { t: "op", v: "==" },
                        { t: "val", v: 1 },
                    ],
                }),
            ]),
        );
    });
});
