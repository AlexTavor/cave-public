import { describe, expect, it } from "vitest";
import {
    compileStructuredConditionAllGate,
    compileStructuredConditions,
} from "./compileStructuredConditions";

describe("compileStructuredConditions carriers orbiting", () => {
    it("compiles the carriers_orbiting condition to the custom op", () => {
        const [rule] = compileStructuredConditions([
            { kind: "carriers_orbiting" },
        ] as const);
        expect(rule.compiled).toEqual({ CARRIERS_ORBITING: [] });
        expect(
            compileStructuredConditionAllGate([
                { kind: "carriers_orbiting" },
            ] as const)?.compiled,
        ).toEqual({ CARRIERS_ORBITING: [] });
    });
});
