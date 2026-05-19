import { describe, expect, it } from "vitest";
import { createBlueprint } from "../../test/factories";
import { conversionCompiler } from "./conversionCompiler";

describe("conversionCompiler targets", () => {
    it("can route conversion outputs into storage targets", () => {
        const draft = createBlueprint("merchant", {
            components: {
                state: { cycle: { value: 0, max: 10 }, wood: { value: 4 } },
            },
        });

        conversionCompiler(
            draft,
            {
                id: "sell",
                inputs: [
                    {
                        resource: "wood",
                        amount: { base: 2, perBody: 0, multPerBody: 0 },
                    },
                ],
                outputs: [
                    {
                        resource: "coin",
                        amount: { base: 5, perBody: 0, multPerBody: 0 },
                        target: "tag:storage:coin",
                    },
                ],
                conditions: [],
            },
            0,
        );

        expect(
            draft.components.behavior?.rules?.find(
                (entry) => entry.id === "sys_convert_sell_0",
            )?.actions,
        ).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    target: "self.state.coin.value",
                    op: "ADD",
                }),
                expect.objectContaining({
                    type: "TRANSFER",
                    source: "self",
                    target: "tag:storage:coin",
                    resource: "coin",
                }),
            ]),
        );
    });
});
