import { describe, expect, it, vi } from "vitest";
import { spawnPulse } from "./veinsPulseLifecycle";
import { makeEdge, makePool, makeState } from "./veinsDisplayTestUtils";

describe("spawnPulse", () => {
    it("sizes blobs from vein width with a small margin", () => {
        const state = makeState();
        const pool = makePool();
        spawnPulse(
            state,
            {} as never,
            pool as never,
            "blob",
            makeEdge({
                widthPx: 8,
                blobSpawnRateHz: 10,
                blobSpeedPxPerSec: 40,
            }),
            0,
            0,
        );
        expect((state.pulses[0]?.image as any).setScale).toHaveBeenCalledWith(
            expect.closeTo(1.8, 10),
        );
        expect(state.pulses[0]?.revealInsetPx).toBe(9);
    });

    it("sizes blobs from the applied pulse texture instead of the pooled placeholder", () => {
        const state = makeState();
        const image = {
            width: 1,
            setTexture: vi.fn(() => {
                image.width = 10;
            }),
            setTint: vi.fn(),
            setAlpha: vi.fn(),
            setScale: vi.fn(),
        };
        const pool = {
            imagePool: { acquire: () => image, release: vi.fn() },
        };
        spawnPulse(
            state,
            {} as never,
            pool as never,
            "blob",
            makeEdge({ widthPx: 8 }),
            0,
            0,
        );
        expect(image.setScale).toHaveBeenCalledWith(expect.closeTo(1.8, 10));
        expect(state.pulses[0]?.revealInsetPx).toBe(9);
    });
});
