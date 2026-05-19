import { describe, expect, it, vi } from "vitest";

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

import { generateShapeTexture } from "./ShapeTextureGen";

const makeSetup = () => {
    const keys = new Set<string>();
    const scene = {
        textures: {
            exists: (key: string) => keys.has(key),
            get: (key: string) => ({ setFilter: vi.fn(), key }),
        },
    } as any;
    const graphics = {
        clear: vi.fn(),
        fillStyle: vi.fn(),
        lineStyle: vi.fn(),
        fillCircle: vi.fn(),
        strokeCircle: vi.fn(),
        fillRect: vi.fn(),
        strokeRect: vi.fn(),
        fillPoints: vi.fn(),
        strokePoints: vi.fn(),
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        arc: vi.fn(),
        closePath: vi.fn(),
        strokePath: vi.fn(),
        fillPath: vi.fn(),
        generateTexture: vi.fn((key: string) => keys.add(key)),
    } as any;
    return { scene, graphics };
};

describe("generateShapeTexture", () => {
    it.each(["plus_rounded", "triple_circle", "chevron_up_rounded"] as const)(
        "generates and caches the %s texture",
        (shape) => {
            const { scene, graphics } = makeSetup();
            const key = generateShapeTexture(scene, graphics, {
                shape,
                color: "#ffffff",
            });
            expect(key).toBe(`shape:${shape}:#ffffff:none`);
            expect(graphics.generateTexture).toHaveBeenCalledWith(
                key,
                128,
                128,
            );
            expect(scene.textures.exists(key)).toBe(true);
        },
    );

    it("draws plus_rounded from crossed bars with rounded terminals", () => {
        const { scene, graphics } = makeSetup();
        generateShapeTexture(scene, graphics, {
            shape: "plus_rounded",
            color: "#ffffff",
        });
        expect(graphics.fillRect.mock.calls).toEqual([
            [48, 30, 32, 68],
            [30, 48, 68, 32],
        ]);
        expect(graphics.fillCircle.mock.calls).toEqual([
            [64, 30, 16],
            [30, 64, 16],
            [98, 64, 16],
            [64, 98, 16],
        ]);
        expect(graphics.fillPoints).not.toHaveBeenCalled();
    });

    it("draws chevron_up_rounded from two diagonal arms and three caps", () => {
        const { scene, graphics } = makeSetup();
        generateShapeTexture(scene, graphics, {
            shape: "chevron_up_rounded",
            color: "#ffffff",
        });
        expect(graphics.fillPoints).toHaveBeenCalledTimes(2);
        expect(graphics.fillCircle.mock.calls).toEqual([
            [36, 82, 12],
            [64, 40, 12],
            [92, 82, 12],
        ]);
    });

    it("reuses the cached texture key when it already exists", () => {
        const { scene, graphics } = makeSetup();
        generateShapeTexture(scene, graphics, {
            shape: "plus_rounded",
            color: "#ffffff",
        });
        const key = generateShapeTexture(scene, graphics, {
            shape: "plus_rounded",
            color: "#ffffff",
        });
        expect(key).toBe("shape:plus_rounded:#ffffff:none");
        expect(graphics.generateTexture).toHaveBeenCalledTimes(1);
    });
});
