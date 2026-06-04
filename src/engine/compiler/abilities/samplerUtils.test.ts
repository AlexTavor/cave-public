import { describe, expect, it } from "vitest";
import { deriveSamplerTargetKey } from "./samplerUtils";

describe("deriveSamplerTargetKey", () => {
    it("derives the key from the last dotted segment, prefixed with sampled_", () => {
        // parts = ["self", "state", "iron"] -> last segment "iron".
        expect(deriveSamplerTargetKey("self.state.iron")).toBe("sampled_iron");
    });

    it("trims surrounding whitespace before deriving (trim path)", () => {
        // Leading/trailing whitespace must be stripped before splitting; the
        // derived key is still based on the inner "iron" segment.
        expect(deriveSamplerTargetKey("   self.state.iron   ")).toBe(
            "sampled_iron",
        );
    });

    it("returns null for an empty source", () => {
        // !trimmed branch -> null.
        expect(deriveSamplerTargetKey("")).toBeNull();
    });

    it("returns null for a whitespace-only source", () => {
        // trim() collapses to "" -> !trimmed branch -> null.
        expect(deriveSamplerTargetKey("    ")).toBeNull();
    });

    it("returns null when every split segment is empty (parts.length === 0)", () => {
        // "." trims to "." (non-empty, passes the !trimmed gate), splits to
        // ["", ""], filter(Boolean) removes both -> length 0 -> null.
        expect(deriveSamplerTargetKey(".")).toBeNull();
    });

    it("steps back to the parent segment when the tail is 'value'", () => {
        // candidate === "value" -> use parts.at(-2) === "iron".
        expect(deriveSamplerTargetKey("self.state.iron.value")).toBe(
            "sampled_iron",
        );
    });

    it("steps back to the parent segment when the tail is 'max'", () => {
        // candidate === "max" -> use parts.at(-2) === "cycle".
        expect(deriveSamplerTargetKey("self.state.cycle.max")).toBe(
            "sampled_cycle",
        );
    });

    it("uses parts.at(-2) (not at(2)) so the second-to-last segment is taken", () => {
        // Only two segments: ["heat", "value"] -> at(-2) === "heat".
        // If the index were positive (2), at(2) would be undefined -> null.
        expect(deriveSamplerTargetKey("heat.value")).toBe("sampled_heat");
    });

    it("does NOT step back when the tail is a normal segment (not value/max)", () => {
        // candidate "temperature" matches neither "value" nor "max", so the
        // tail itself is used rather than the parent segment.
        expect(deriveSamplerTargetKey("self.state.temperature")).toBe(
            "sampled_temperature",
        );
    });

    it("returns null when stepping back from a lone 'value' yields nothing", () => {
        // ["value"] -> candidate "value" -> parts.at(-2) is undefined -> ""
        // -> sanitized "" -> !sanitized -> null.
        expect(deriveSamplerTargetKey("value")).toBeNull();
    });

    it("returns null when stepping back from a lone 'max' yields nothing", () => {
        expect(deriveSamplerTargetKey("max")).toBeNull();
    });

    it("sanitizes non-word characters in the chosen segment to underscores", () => {
        // The tail "iron-ore!" -> every \W (-, !) becomes "_".
        expect(deriveSamplerTargetKey("self.state.iron-ore!")).toBe(
            "sampled_iron_ore_",
        );
    });

    it("keeps underscores intact (they are word chars, not stripped by \\W)", () => {
        // Underscore is \w, so the \W replace leaves "___" untouched ->
        // "sampled_" + "___" === "sampled____". (The !sanitized -> null guard
        // is exercised by the lone "value"/"max" cases above, where the
        // stepped-back candidate is "" and sanitizes to "".)
        expect(deriveSamplerTargetKey("self.___")).toBe("sampled____");
    });
});
