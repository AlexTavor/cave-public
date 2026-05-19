import { describe, expect, it, vi } from "vitest";
import { VEIN_STRIP_BASE_HEIGHT_PX } from "./VeinTextureConstants";

vi.mock("phaser", () => ({
    default: { Textures: { FilterMode: { LINEAR: "LINEAR" } } },
}));

import { ensureVeinStripTexture } from "./VeinTextureGen";

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
        fillStyle: vi.fn(),
        fillRect: vi.fn(),
        generateTexture: vi.fn((key: string) => keys.add(key)),
    } as any;
    return { scene, graphics, setFilter };
};

describe("ensureVeinStripTexture", () => {
    it("generates the deterministic shared texture key", () => {
        const { scene, graphics } = makeSetup();
        const key = ensureVeinStripTexture(scene, graphics);
        expect(key).toBe("vein-strip:white:default");
        expect(graphics.generateTexture).toHaveBeenCalledWith(key, 128, 16);
        expect(graphics.fillRect.mock.calls).toEqual([
            [0, 0, 128, 16],
            [0, 2, 128, 12],
            [0, 4, 128, 8],
        ]);
    });

    it("reuses an existing scene texture instead of regenerating it", () => {
        const { scene, graphics } = makeSetup();
        ensureVeinStripTexture(scene, graphics);
        const key = ensureVeinStripTexture(scene, graphics);
        expect(key).toBe("vein-strip:white:default");
        expect(graphics.generateTexture).toHaveBeenCalledTimes(1);
    });

    it("exports the base height used for rope width scaling", () => {
        expect(VEIN_STRIP_BASE_HEIGHT_PX).toBe(16);
    });
});
