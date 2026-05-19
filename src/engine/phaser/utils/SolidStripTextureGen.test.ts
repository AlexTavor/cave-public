import { describe, expect, it, vi } from "vitest";
import {
    ensureSolidStripTexture,
    SOLID_STRIP_BASE_HEIGHT_PX,
} from "./SolidStripTextureGen";

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
    return { scene, graphics };
};

describe("ensureSolidStripTexture", () => {
    it("generates and reuses the deterministic solid strip texture", () => {
        const { scene, graphics } = makeSetup();
        expect(ensureSolidStripTexture(scene, graphics)).toBe(
            "solid-strip:white:default",
        );
        expect(ensureSolidStripTexture(scene, graphics)).toBe(
            "solid-strip:white:default",
        );
        expect(graphics.generateTexture).toHaveBeenCalledTimes(1);
        expect(graphics.fillRect).toHaveBeenCalledWith(0, 0, 128, 16);
        expect(SOLID_STRIP_BASE_HEIGHT_PX).toBe(16);
    });
});
