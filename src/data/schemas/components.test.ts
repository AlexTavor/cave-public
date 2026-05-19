import { describe, it, expect } from "vitest";
import { DisplayComponentSchema } from "./components";

describe("DisplayComponentSchema bars", () => {
    it("accepts valid bar configs", () => {
        const result = DisplayComponentSchema.safeParse({
            label: "Node",
            display_key: "unknown",
            bars: [
                {
                    key: "hp",
                    max: 10,
                    color: "#fff",
                    position: "top_left",
                    paletteColorKey: "green",
                    spanRatio: 0.8,
                },
                { key: "state.energy", maxKey: "state.maxEnergy" },
            ],
        });

        expect(result.success).toBe(true);
    });

    it("rejects bars missing max and maxKey", () => {
        const result = DisplayComponentSchema.safeParse({
            label: "Node",
            display_key: "unknown",
            bars: [{ key: "hp" }],
        });

        expect(result.success).toBe(false);
    });

    it("rejects invalid bar types", () => {
        const result = DisplayComponentSchema.safeParse({
            label: "Node",
            display_key: "unknown",
            bars: [{ key: 42, max: "bad" }],
        });

        expect(result.success).toBe(false);
    });

    it("rejects invalid bar positions and span ratios", () => {
        const invalidPosition = DisplayComponentSchema.safeParse({
            label: "Node",
            display_key: "unknown",
            bars: [{ key: "hp", max: 10, position: "left" }],
        });
        const invalidSpan = DisplayComponentSchema.safeParse({
            label: "Node",
            display_key: "unknown",
            bars: [{ key: "hp", max: 10, spanRatio: 2 }],
        });

        expect(invalidPosition.success).toBe(false);
        expect(invalidSpan.success).toBe(false);
    });
});

