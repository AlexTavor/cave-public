import { describe, expect, it, vi } from "vitest";

vi.mock("phaser", () => ({
    default: {
        Geom: {
            Point: class Point {
                constructor(
                    public readonly x: number,
                    public readonly y: number,
                ) {}
            },
        },
    },
}));

const createGraphics = () => {
    const graphics = {
        lineStyle: vi.fn().mockReturnThis(),
        beginPath: vi.fn().mockReturnThis(),
        moveTo: vi.fn().mockReturnThis(),
        lineTo: vi.fn().mockReturnThis(),
        closePath: vi.fn().mockReturnThis(),
        strokePath: vi.fn().mockReturnThis(),
        strokeCircle: vi.fn().mockReturnThis(),
        strokeRect: vi.fn().mockReturnThis(),
        fillPoints: vi.fn().mockReturnThis(),
        fillCircle: vi.fn().mockReturnThis(),
        fillRect: vi.fn().mockReturnThis(),
    };
    return graphics as any;
};

describe("drawStrokeGlyphShape", () => {
    it("uses the requested tint for ring outlines", async () => {
        const { drawStrokeGlyphShape } =
            await import("./glyphTextureDrawStroke");
        const graphics = createGraphics();
        drawStrokeGlyphShape(graphics, "ring", 7, 0x12abef, 0);
        expect(graphics.lineStyle).toHaveBeenCalledWith(7, 0x12abef, 1);
        expect(graphics.strokeCircle).toHaveBeenCalledOnce();
    });

    it("preserves translucent alpha for glow outline passes", async () => {
        const { drawStrokeGlyphShape } =
            await import("./glyphTextureDrawStroke");
        const graphics = createGraphics();
        drawStrokeGlyphShape(graphics, "ring", 7, 0x12abef, 2, 0.036);
        expect(graphics.lineStyle).toHaveBeenCalledWith(11, 0x12abef, 0.036);
    });
});
