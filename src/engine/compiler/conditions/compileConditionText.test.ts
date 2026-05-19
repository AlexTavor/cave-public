import { describe, expect, it } from "vitest";
import { compileConditionText } from "./compileConditionText";

describe("compileConditionText", () => {
    it("returns empty tokens for empty input", () => {
        expect(compileConditionText("")).toEqual({ ok: true, tokens: [] });
    });

    it("compiles a simple condition", () => {
        const result = compileConditionText("self.state.a > 5");
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(result.tokens).toEqual([
            { t: "ref", v: "self.state.a" },
            { t: "op", v: ">" },
            { t: "val", v: 5 },
        ]);
    });

    it("returns error for invalid syntax", () => {
        const result = compileConditionText("AND");
        expect(result.ok).toBe(false);
    });
});
