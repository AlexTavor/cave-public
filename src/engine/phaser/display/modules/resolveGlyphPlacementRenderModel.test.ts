import { describe, expect, it } from "vitest";
import { resolveGlyphPlacementRenderModel } from "./resolveGlyphPlacementRenderModel";

const glyph = {
    id: "g1",
    placements: [
        {
            shape: "ring",
            position: 0,
            rotationDeg: 0,
            scale: 1,
            colorHex: "#111111",
            paletteColorKey: "body",
        },
        {
            shape: "line",
            position: 8,
            rotationDeg: 10,
            scale: 1,
            colorHex: "#222222",
            lineThickness: 4,
        },
    ],
    pulse: {
        distanceFromCenterMinFactor: 0.4,
        distanceFromCenterMaxFactor: 0.8,
        scalePulseMin: 1,
        scalePulseMax: 2,
        rotationDeltaMinDeg: 0,
        rotationDeltaMaxDeg: 0,
        delayMsByPosition: [0, 0, 0, 0, 0, 0, 0, 0, 0],
    },
};

describe("resolveGlyphPlacementRenderModel", () => {
    it("preserves placement slot order and emits no extra instructions", () => {
        const instructions = resolveGlyphPlacementRenderModel({
            glyph: glyph as never,
            radius: 60,
            defaultLineThickness: 10,
            readPulseValue: () => 0,
        });
        expect(
            instructions.map((instruction) => instruction.slotIndex),
        ).toEqual([0, 1]);
        expect(instructions).toHaveLength(2);
    });

    it("applies palette color overrides when present", () => {
        const [instruction] = resolveGlyphPlacementRenderModel({
            glyph: glyph as never,
            radius: 60,
            paletteColors: { body: "#abcdef" },
            defaultLineThickness: 10,
            readPulseValue: () => 0,
        });
        expect(instruction.color).toBe("#abcdef");
    });

    it("falls back to the supplied default line thickness", () => {
        const [instruction] = resolveGlyphPlacementRenderModel({
            glyph: glyph as never,
            radius: 60,
            defaultLineThickness: 10,
            readPulseValue: () => 0,
        });
        expect(instruction.thickness).toBe(10);
    });

    it("changes transforms deterministically when the pulse changes", () => {
        const low = resolveGlyphPlacementRenderModel({
            glyph: glyph as never,
            radius: 60,
            defaultLineThickness: 10,
            readPulseValue: () => 0,
        });
        const high = resolveGlyphPlacementRenderModel({
            glyph: glyph as never,
            radius: 60,
            defaultLineThickness: 10,
            readPulseValue: () => 1,
        });
        expect(high[1].imageScale).not.toBe(low[1].imageScale);
    });
});
