import { describe, expect, it } from "vitest";
import { createBlueprint } from "../../test/factories";
import { conversionCompiler } from "./conversionCompiler";

const makeDraft = () =>
    createBlueprint("smelter", {
        components: {
            state: {
                cycle: { value: 0, max: 10, visible: false },
                iron: { value: 5, visible: false },
                coal: { value: 5, visible: false },
                steel: { value: 0, visible: false },
            },
        },
    });

describe("conversionCompiler", () => {
    it("creates consume/produce actions with cycle reset", () => {
        const draft = makeDraft();

        conversionCompiler(
            draft,
            {
                id: "smelt",
                inputs: [{ resource: "iron", amount: { base: 2, perBody: 0, multPerBody: 0 } }],
                outputs: [
                    { resource: "steel", amount: { base: 1, perBody: 0, multPerBody: 0 } },
                ],
                resetCycle: true,
                conditions: [],
            },
            0,
        );

        const rule = draft.components.behavior?.rules?.find(
            (entry) => entry.id === "sys_convert_smelt_0",
        );
        expect(rule).toBeTruthy();
        const actions = rule?.actions ?? [];
        expect(actions).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    type: "MUTATE",
                    target: "self.state.iron.value",
                    op: "SUB",
                }),
                expect.objectContaining({
                    type: "MUTATE",
                    target: "self.state.steel.value",
                    op: "ADD",
                }),
                expect.objectContaining({
                    type: "MUTATE",
                    target: "self.state.cycle.value",
                    op: "SET",
                    value: 0,
                }),
            ]),
        );
    });

    it("omits cycle reset when disabled", () => {
        const draft = makeDraft();

        conversionCompiler(
            draft,
            {
                id: "smelt",
                inputs: [{ resource: "iron", amount: { base: 2, perBody: 0, multPerBody: 0 } }],
                outputs: [
                    { resource: "steel", amount: { base: 1, perBody: 0, multPerBody: 0 } },
                ],
                resetCycle: false,
                conditions: [],
            },
            0,
        );

        const rule = draft.components.behavior?.rules?.find(
            (entry) => entry.id === "sys_convert_smelt_0",
        );
        const actions = rule?.actions ?? [];
        expect(
            actions.some(
                (action) =>
                    action.type === "MUTATE" &&
                    action.target === "self.state.cycle.value",
            ),
        ).toBe(false);
    });
});
