import { describe, expect, it } from "vitest";
import { tickEdge } from "./veinsEdgeTick";
import {
    makeEdge,
    makePool,
    makePulse,
    makeState,
} from "./veinsDisplayTestUtils";

describe("tickEdge pulses", () => {
    it("hides both ropes and clears pulses for degenerate paths", () => {
        const state = makeState();
        const pool = makePool();
        tickEdge(
            state,
            makeEdge({ blobSpawnRateHz: 0 }),
            1000,
            {} as never,
            pool as never,
            "vein",
            "blob",
        );
        state.pulses.push(makePulse(10));
        tickEdge(
            state,
            makeEdge({
                bx: 0,
                by: 0,
                meanderPoints: [],
                pathLengthPx: 0,
                blobSpawnRateHz: 0,
            }),
            0,
            {} as never,
            pool as never,
            "vein",
            "blob",
        );
        expect(state.pulses).toHaveLength(0);
        expect(pool.released).toHaveLength(1);
        expect(state.revealedLenPx).toBe(0);
        expect((state.glowRope.setVisible as any).mock.lastCall?.[0]).toBe(
            false,
        );
        expect((state.baseRope.setVisible as any).mock.lastCall?.[0]).toBe(
            false,
        );
    });

    it("keeps pulse movement and spawn spacing when geometry is reused", () => {
        const state = makeState();
        const pool = makePool();
        const edge = makeEdge({
            blobSpawnRateHz: 1,
            blobSpeedPxPerSec: 20,
            ampPx: 0,
            freq: 0,
        });
        tickEdge(state, edge, 1000, {} as never, pool as never, "vein", "blob");
        tickEdge(state, edge, 500, {} as never, pool as never, "vein", "blob");
        tickEdge(state, edge, 500, {} as never, pool as never, "vein", "blob");
        expect(state.pulses.map((pulse) => pulse.distancePx)).toEqual([20, 0]);
    });

    it("hides a pulse until the reveal front clears its inset", () => {
        const state = makeState();
        const pool = makePool();
        const edge = makeEdge({ blobSpawnRateHz: 0, ampPx: 0, freq: 0 });
        tickEdge(state, edge, 0, {} as never, pool as never, "vein", "blob");
        const pulse = makePulse(0);
        pulse.revealInsetPx = 3;
        state.pulses.push(pulse);
        state.revealedLenPx = 2;
        tickEdge(state, edge, 0, {} as never, pool as never, "vein", "blob");
        expect((pulse.image as any).setVisible).toHaveBeenCalledWith(false);
    });
});
