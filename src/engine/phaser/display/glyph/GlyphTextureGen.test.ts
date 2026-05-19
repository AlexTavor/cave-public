import { describe, expect, it, vi } from "vitest";
import { GLYPH_GLOW_PASSES } from "./GlyphGlowStyle";

vi.mock("phaser", () => ({
    default: {
        Display: {
            Color: {
                HexStringToColor: (hex: string) => ({
                    color: Number.parseInt(hex.slice(1), 16),
                }),
            },
        },
        Geom: {
            Point: class Point {
                constructor(
                    public x: number,
                    public y: number,
                ) {}
            },
        },
        Textures: { FilterMode: { LINEAR: "LINEAR" } },
    },
}));

import { generateGlyphTexture, generateGlyphTextures } from "./GlyphTextureGen";

const makeSetup = () => {
    const keys = new Set<string>();
    const setFilter = vi.fn();
    const scene = {
        textures: {
            exists: (key: string) => keys.has(key),
            get: () => ({ setFilter }),
        },
    } as any;
    const graphics = {
        clear: vi.fn(),
        fillStyle: vi.fn().mockReturnThis(),
        lineStyle: vi.fn().mockReturnThis(),
        fillCircle: vi.fn().mockReturnThis(),
        strokeCircle: vi.fn().mockReturnThis(),
        fillRect: vi.fn().mockReturnThis(),
        strokeRect: vi.fn().mockReturnThis(),
        fillPoints: vi.fn().mockReturnThis(),
        fillTriangle: vi.fn().mockReturnThis(),
        beginPath: vi.fn().mockReturnThis(),
        moveTo: vi.fn().mockReturnThis(),
        lineTo: vi.fn().mockReturnThis(),
        closePath: vi.fn().mockReturnThis(),
        strokePath: vi.fn().mockReturnThis(),
        generateTexture: vi.fn((key: string) => keys.add(key)),
    } as any;
    return { scene, graphics, setFilter };
};

describe("generateGlyphTexture", () => {
    it("builds versioned lowercased texture keys", () => {
        const { scene, graphics } = makeSetup();
        expect(
            generateGlyphTexture(scene, graphics, {
                shape: "ring",
                color: "#ABCDEF",
                thickness: 7,
            }),
        ).toBe("glyphtex:v3:ring:#abcdef:7");
    });

    it("reuses an existing texture for identical inputs", () => {
        const { scene, graphics } = makeSetup();
        generateGlyphTexture(scene, graphics, {
            shape: "ring",
            color: "#ffffff",
            thickness: 7,
        });
        generateGlyphTexture(scene, graphics, {
            shape: "ring",
            color: "#FFFFFF",
            thickness: 7,
        });
        expect(graphics.generateTexture).toHaveBeenCalledTimes(1);
    });

    it("prewarms through the same baked generation path as on-demand calls", () => {
        const { scene, graphics } = makeSetup();
        generateGlyphTextures(scene, graphics);
        const callCount = graphics.generateTexture.mock.calls.length;
        const key = generateGlyphTexture(scene, graphics, {
            shape: "line",
            color: "#ffffff",
            thickness: 10,
        });
        expect(key).toBe("glyphtex:v3:line:#ffffff:10");
        expect(graphics.generateTexture.mock.calls.length).toBe(callCount);
    });

    it("draws glow passes with translucent alpha before the opaque core", () => {
        const { scene, graphics } = makeSetup();
        generateGlyphTexture(scene, graphics, {
            shape: "line",
            color: "#ffffff",
            thickness: 10,
        });
        expect(graphics.fillStyle).toHaveBeenNthCalledWith(
            1,
            0xffffff,
            GLYPH_GLOW_PASSES[0].alpha,
        );
        expect(graphics.fillStyle).toHaveBeenLastCalledWith(0xffffff, 1);
    });

    it("draws hole as a black-centered ring with a 10% outer-width band", () => {
        const { scene, graphics } = makeSetup();
        generateGlyphTexture(scene, graphics, {
            shape: "hole",
            color: "#ffffff",
            thickness: 10,
        });
        expect(graphics.fillCircle).toHaveBeenCalledWith(64, 64, 30.24);
    });
});
