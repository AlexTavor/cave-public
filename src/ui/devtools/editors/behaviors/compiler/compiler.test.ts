import { describe, expect, it } from "vitest";
import { compileBehaviorRule, tokenizeSentence } from ".";

describe("behaviors/compiler", () => {
    it("compiles behavior sentences", () => {
        const rule = compileBehaviorRule(
            tokenizeSentence(
                "WHEN self.state.hp.value < 10 DO SET self.state.hp.value 5",
            ),
        );

        expect(rule.conditions).toHaveLength(1);
        expect(rule.actions).toEqual([
            {
                type: "MUTATE",
                target: "self.state.hp.value",
                op: "SET",
                value: 5,
            },
        ]);
    });
});
