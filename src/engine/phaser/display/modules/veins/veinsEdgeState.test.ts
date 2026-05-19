import { describe, expect, it, vi } from "vitest";

describe("disposeEdgeState", () => {
    it("removes pulse images and ropes before releasing them", async () => {
        const { disposeEdgeState } = await import("./veinsEdgeState");
        const imageA = {};
        const imageB = {};
        const remove = vi.fn();
        const releaseImage = vi.fn();
        const releaseRope = vi.fn();
        const glowRope = {};
        const baseRope = {};
        const containerRemove = vi.fn();
        const clearMask = vi.fn();
        const state = {
            pathCache: {},
            pulses: [{ image: imageA }, { image: imageB }],
            pulseContainer: { remove, clearMask },
            container: { remove: containerRemove },
            glowRope,
            baseRope,
        } as any;
        const pool = {
            imagePool: { release: releaseImage },
            ropePool: { release: releaseRope },
            rootPool: { release: vi.fn() },
        } as any;
        const parent = { remove: vi.fn() } as any;

        disposeEdgeState(state, parent, pool);

        expect(remove).toHaveBeenCalledWith(imageA);
        expect(remove).toHaveBeenCalledWith(imageB);
        expect(remove.mock.invocationCallOrder[0]).toBeLessThan(
            releaseImage.mock.invocationCallOrder[0],
        );
        expect(remove.mock.invocationCallOrder[1]).toBeLessThan(
            releaseImage.mock.invocationCallOrder[1],
        );
        expect(containerRemove).toHaveBeenCalledWith(glowRope);
        expect(containerRemove).toHaveBeenCalledWith(baseRope);
        expect(containerRemove.mock.invocationCallOrder[0]).toBeLessThan(
            releaseRope.mock.invocationCallOrder[0],
        );
        expect(containerRemove.mock.invocationCallOrder[1]).toBeLessThan(
            releaseRope.mock.invocationCallOrder[1],
        );
        expect(clearMask).not.toHaveBeenCalled();
    });
});
