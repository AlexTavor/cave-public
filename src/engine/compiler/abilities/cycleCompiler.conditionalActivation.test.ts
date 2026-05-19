import { describe, expect, it } from "vitest";
import { CompilerService } from "../CompilerService";
import { createBlueprint } from "../../test/factories";
import {
    CONDITIONAL_ACTIVATION_HIDE_THROTTLE_STATE_KEY,
    CONDITIONAL_ACTIVATION_SAVED_THROTTLE_STATE_KEY,
    getConditionalActivationActiveStateKey,
} from "../../runtime/conditionalActivationState";

const compile = (targets: any[], conditions: any[]) =>
    new CompilerService().compile(
        createBlueprint("bp_cycle_gate", {
            components: {},
            _editor: {
                abilities: {
                    cycle: {
                        maxProgress: { base: 10, perBody: 0, multPerBody: 0 },
                        inputs: {},
                        oneOff: false,
                        startActive: true,
                        conditions: [],
                    },
                    conditionalActivation: { conditions, targets },
                },
            },
        }),
    );

describe("cycleCompiler conditionalActivation", () => {
    it("compiles initial inactive state and lifecycle rules when cycle is targeted", () => {
        const compiled = compile(
            [{ ability: "cycle" }],
            [
                {
                    kind: "world_state_threshold",
                    key: "food",
                    operator: ">=",
                    value: 1,
                },
            ],
        );
        const rules = compiled.components.behavior?.rules ?? [];
        expect(compiled.components.state?.cycle_active).toEqual({
            value: 0,
            visible: false,
        });
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
        expect(compiled.components.powerSink?.throttle).toBe(0);
        expect(
            rules.find(
                (rule) => rule.id === "sys_conditional_activation_cycle_on",
            )?.conditions[0]?.compiled,
        ).toEqual({
            var: `self.state.${getConditionalActivationActiveStateKey(0)}.value`,
        });
        expect(
            rules.find(
                (rule) => rule.id === "sys_conditional_activation_cycle_off",
            )?.conditions[0]?.compiled,
        ).toEqual({
            "!": [
                {
                    var: `self.state.${getConditionalActivationActiveStateKey(0)}.value`,
                },
            ],
        });
    });

    it("leaves cycle behavior unchanged when unselected or empty", () => {
        expect(
            compile(
                [],
                [
                    {
                        kind: "world_state_threshold",
                        key: "food",
                        operator: ">=",
                        value: 1,
                    },
                ],
            ).components.powerSink?.throttle,
        ).toBe(1);
        expect(
            compile([{ ability: "cycle" }], []).components.state?.[
                CONDITIONAL_ACTIVATION_SAVED_THROTTLE_STATE_KEY
            ],
        ).toBeUndefined();
    });
});
