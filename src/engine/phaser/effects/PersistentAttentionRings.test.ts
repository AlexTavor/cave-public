// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";

vi.mock("./runtimeVisualEffectBursts", () => ({
    GOLD_RING_COUNT: 6,
    GOLD_RING_DURATION_MS: 600,
    GOLD_RING_LOOP_MS: 1200,
    GOLD_RING_STAGGER_MS: 100,
    drawGoldRingFrame: vi.fn(() => ({ radiusPx: 12, alpha: 0.5 })),
}));

import { PersistentAttentionRings } from "./PersistentAttentionRings";

const makeImage = () => ({
    setTexture: vi.fn(),
    setTint: vi.fn(),
    setPosition: vi.fn(),
    setAlpha: vi.fn(),
    setScale: vi.fn(),
    setVisible: vi.fn(),
    parentContainer: { remove: vi.fn() },
});

describe("PersistentAttentionRings", () => {
    it("acquires, updates, and releases pooled image rings", () => {
        const images = Array.from({ length: 6 }, makeImage);
        const acquire = vi.fn(() => images.shift());
        const release = vi.fn();
        const add = vi.fn();
        const rings = new PersistentAttentionRings(
            {} as any,
            { get: () => ({ add }) } as any,
            { get: () => ({ imagePool: { acquire, release } }) } as any,
            { getGlyphTexture: vi.fn(() => "glyphtex:ring:#ffffff:3") } as any,
        );

        rings.update(10, 20, 5, 0);
        rings.update(10, 20, 5, 900);
        rings.destroy({ get: () => ({ imagePool: { release } }) } as any);
        rings.destroy({ get: () => ({ imagePool: { release } }) } as any);

        expect(acquire).toHaveBeenCalledTimes(6);
        expect(add).toHaveBeenCalledTimes(6);
        expect(release).toHaveBeenCalledTimes(6);
    });
});
