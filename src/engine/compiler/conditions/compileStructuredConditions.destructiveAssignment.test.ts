import { describe, expect, it } from "vitest";
import {
    compileStructuredConditionAllGate,
    compileStructuredConditions,
} from "./compileStructuredConditions";

describe("compileStructuredConditions destructive assignment", () => {
    it("compiles the destructive assignment condition to the custom op", () => {
        const [rule] = compileStructuredConditions([
            { kind: "destructive_assignment_has_all_bodies" },
        ] as const);
        expect(rule.compiled).toEqual({
            DESTRUCTIVE_ASSIGNMENT_HAS_ALL_BODIES: [],
        });
        expect(
            compileStructuredConditionAllGate([
                { kind: "destructive_assignment_has_all_bodies" },
            ] as const)?.compiled,
        ).toEqual({ DESTRUCTIVE_ASSIGNMENT_HAS_ALL_BODIES: [] });
    });
});
