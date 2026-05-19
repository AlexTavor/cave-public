import { describe, expect, it } from "vitest";
import {
    compileStructuredConditionAllGate,
    compileStructuredConditions,
} from "./compileStructuredConditions";

describe("compileStructuredConditions body in pointer", () => {
    it("compiles the body_in_pointer condition to the custom op", () => {
        const [rule] = compileStructuredConditions([
            { kind: "body_in_pointer" },
        ] as const);
        expect(rule.compiled).toEqual({ BODY_IN_POINTER: [] });
        expect(
            compileStructuredConditionAllGate([
                { kind: "body_in_pointer" },
            ] as const)?.compiled,
        ).toEqual({ BODY_IN_POINTER: [] });
    });
});
