import { describe, it, expect } from "vitest";
import { compileBehaviorRule, tokenizeSentence } from ".";

describe("behaviors/compiler extended", () => {
    it("rejects unknown verbs", () => {
        expect(() =>
            compileBehaviorRule(
                tokenizeSentence(
                    "WHEN true DO INVALID_VERB self.state.hp.value 1",
                ),
            ),
        ).toThrow("Unknown action verb");
    });

    it("rejects incomplete WHEN sentences", () => {
        expect(() => compileBehaviorRule(tokenizeSentence("WHEN"))).toThrow(
            "Behavior sentence is incomplete",
        );
    });

    it("rejects missing DO", () => {
        expect(() =>
            compileBehaviorRule(
                tokenizeSentence("WHEN self.state.hp.value < 1"),
            ),
        ).toThrow("Behavior sentence must include DO");
    });

    it("parses multiple actions", () => {
        const rule = compileBehaviorRule(
            tokenizeSentence("WHEN true DO SPAWN ghost AND KILL self"),
        );

        expect(rule.actions).toEqual([
            { type: "SPAWN", blueprintId: "ghost" },
            { type: "KILL", entityId: "self" },
        ]);
    });
});
