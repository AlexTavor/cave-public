import { describe, expect, it } from "vitest";
import {
    resolveAttributePoolKey,
    resolvePowerShape,
} from "./attributePowerVisuals";

describe("attributePowerVisuals", () => {
    it("maps attribute pool display keys to their attributes", () => {
        expect(resolveAttributePoolKey("attr_body")).toBe("body");
        expect(resolveAttributePoolKey("attr_mind")).toBe("mind");
        expect(resolveAttributePoolKey("attr_social")).toBe("social");
        expect(resolveAttributePoolKey("attr_unknown")).toBeNull();
    });

    it("maps attributes to the required shapes with circle fallbacks", () => {
        expect(resolvePowerShape("body")).toBe("plus_rounded");
        expect(resolvePowerShape("mind")).toBe("chevron_up_rounded");
        expect(resolvePowerShape("social")).toBe("triple_circle");
        expect(resolvePowerShape("nervous")).toBe("circle");
        expect(resolvePowerShape("mystery")).toBe("circle");
    });
});
