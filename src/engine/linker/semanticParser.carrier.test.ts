import { describe, expect, it } from "vitest";
import { parseSemanticFragment } from "./semanticParser";

describe("semanticParser carrier", () => {
    it("accepts carrier settings in .cave", () => {
        const result = parseSemanticFragment("core.cave", ".cave", { carrier: { displayId: "egg", radius: 12 } });
        expect(result).toMatchObject({ kind: "cave", data: { carrier: { displayId: "egg", radius: 12 } } });
    });

    it("rejects invalid carrier settings", () => {
        expect(() => parseSemanticFragment("core.cave", ".cave", { carrier: { radius: 0 } })).toThrow();
    });
});