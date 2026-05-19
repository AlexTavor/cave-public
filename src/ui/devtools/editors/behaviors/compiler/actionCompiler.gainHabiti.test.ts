import { describe, expect, it } from "vitest";
import { parseActionTokens } from "./actionCompiler.parse";

describe("actionCompiler gain habiti", () => {
    it("parses GAIN_HABITI and rejects SPAWN_CARRIER sentence input", () => {
        expect(parseActionTokens(["GAIN_HABITI", "alpha"])).toEqual({ type: "GAIN_HABITI", habitusId: "alpha" });
        expect(() => parseActionTokens(["SPAWN_CARRIER", "alpha"])).toThrow(/JSON authoring/);
    });
});