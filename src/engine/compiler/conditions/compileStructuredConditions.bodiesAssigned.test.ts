import { describe, expect, it } from "vitest";
import {
    compileStructuredConditionAllGate,
    compileStructuredConditions,
} from "./compileStructuredConditions";

describe("compileStructuredConditions bodies assigned", () => {
    it("compiles the bodies_assigned condition to the custom op", () => {
        const [rule] = compileStructuredConditions([
            { kind: "bodies_assigned" },
        ] as const);
        expect(rule.compiled).toEqual({ BODIES_ASSIGNED: [] });
        expect(
            compileStructuredConditionAllGate([
                { kind: "bodies_assigned" },
            ] as const)?.compiled,
        ).toEqual({ BODIES_ASSIGNED: [] });
    });
});
