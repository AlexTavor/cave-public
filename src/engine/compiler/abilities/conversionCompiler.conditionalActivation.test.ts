import { describe, expect, it } from "vitest";
import { CompilerService } from "../CompilerService";
import { createBlueprint } from "../../test/factories";
import { getConditionalActivationActiveStateKey } from "../../runtime/conditionalActivationState";

const refs = (count: number) =>
    Array.from({ length: count }, (_, index) => ({
        var: `self.state.${getConditionalActivationActiveStateKey(index)}.value`,
    }));

const compile = (targetIds: string[]) =>
    new CompilerService().compile(
        createBlueprint("bp_conv_gate", {
            components: {},
            _editor: {
                abilities: {
                    cycle: {
                        maxProgress: { base: 1, perBody: 0, multPerBody: 0 },
                        inputs: {},
                        oneOff: false,
                        conditions: [],
                    },
                    conversion: [
                        {
                            id: "conv-1",
                            inputs: [],
                            outputs: [
                                {
                                    resource: "wood",
                                    amount: {
                                        base: 1,
                                        perBody: 0,
                                        multPerBody: 0,
                                    },
                                },
                            ],
                            resetCycle: true,
                            conditions: [],
                        },
                    ],
                    conditionalActivation: targetIds.map((targetId) => ({
                        conditions: [
                            {
                                kind: "world_state_threshold",
                                key: "food",
                                operator: ">=",
                                value: 1,
                            },
                        ],
                        targets: [{ ability: "conversion", targetId }],
                    })),
                },
            },
        }),
    );

describe("conversionCompiler conditionalActivation", () => {
    it("appends one active-state ref per matching conditional activation", () => {
        const activeRefs = (targetIds: string[]) =>
            compile(targetIds)
                .components.behavior?.rules?.find(
                    (entry) => entry.id === "sys_convert_conv-1_0",
                )
                ?.conditions.map((entry) => entry.compiled)
                .filter(
                    (entry) =>
                        typeof entry === "object" &&
                        entry !== null &&
                        "var" in entry,
                );
        expect(activeRefs([])).toEqual([]);
        expect(activeRefs(["conv-1"])).toEqual(refs(1));
        expect(activeRefs(["conv-1", "conv-1"])).toEqual(refs(2));
        expect(activeRefs(["other"])).toEqual([]);
    });
});
