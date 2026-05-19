import { describe, expect, it } from "vitest";
import { CompilerService } from "../CompilerService";
import { createBlueprint } from "../../test/factories";
import {
    CONDITIONAL_ACTIVATION_HIDE_THROTTLE_STATE_KEY,
    CONDITIONAL_ACTIVATION_SAVED_THROTTLE_STATE_KEY,
    getConditionalActivationActiveStateKey,
} from "../../runtime/conditionalActivationState";

const condition = {
    kind: "world_state_threshold" as const,
    key: "food",
    operator: ">=" as const,
    value: 1,
};

describe("cycleCompiler multi conditionalActivation", () => {
    it("aggregates all conditioned cycle targets into one cycle gate", () => {
        const compiled = new CompilerService().compile(
            createBlueprint("bp_cycle_gate", {
                components: {},
                _editor: {
                    abilities: {
                        cycle: {
                            maxProgress: {
                                base: 10,
                                perBody: 0,
                                multPerBody: 0,
                            },
                            inputs: {},
                            oneOff: false,
                            startActive: true,
                            conditions: [],
                        },
                        conditionalActivation: [
                            {
                                conditions: [condition],
                                targets: [{ ability: "cycle" }],
                            },
                            {
                                conditions: [condition],
                                targets: [{ ability: "cycle" }],
                            },
                            { conditions: [], targets: [{ ability: "cycle" }] },
                        ],
                    },
                },
            }),
        );
        const rules = compiled.components.behavior?.rules ?? [];
        expect(
            compiled.components.state?.[
                CONDITIONAL_ACTIVATION_SAVED_THROTTLE_STATE_KEY
            ],
        ).toEqual({ value: 1, visible: false });
        expect(
            compiled.components.state?.[
                CONDITIONAL_ACTIVATION_HIDE_THROTTLE_STATE_KEY
            ],
        ).toEqual({ value: 1, visible: false });
        expect(
            rules.find(
                (rule) => rule.id === "sys_conditional_activation_cycle_on",
            )?.conditions[0]?.compiled,
        ).toEqual({
            and: [
                {
                    var: `self.state.${getConditionalActivationActiveStateKey(0)}.value`,
                },
                {
                    var: `self.state.${getConditionalActivationActiveStateKey(1)}.value`,
                },
            ],
        });
        expect(
            rules.find(
                (rule) => rule.id === "sys_conditional_activation_cycle_off",
            )?.conditions[0]?.compiled,
        ).toEqual({
            "!": [
                {
                    and: [
                        {
                            var: `self.state.${getConditionalActivationActiveStateKey(0)}.value`,
                        },
                        {
                            var: `self.state.${getConditionalActivationActiveStateKey(1)}.value`,
                        },
                    ],
                },
            ],
        });
        expect(
            compiled.components.state?.[
                getConditionalActivationActiveStateKey(2)
            ],
        ).toBeUndefined();
    });
});
