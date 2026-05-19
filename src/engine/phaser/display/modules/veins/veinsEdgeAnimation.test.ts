import { describe, expect, it } from "vitest";
import { tickEdge } from "./veinsEdgeTick";
import { makeEdge, makePool, makeState } from "./veinsDisplayTestUtils";

describe("tickEdge animation", () => {
    it("advances nervous veins by rope undulation instead of blob spawning", () => {
        const state = makeState();
        const pool = makePool();
        tickEdge(
            state,
            makeEdge({ veinType: "nervous", ampPx: 3, blobSpawnRateHz: 0 }),
            1000,
            {} as never,
            pool as never,
            "vein",
            "blob",
        );
        expect(state.wavePhaseRad).not.toBe(0);
        expect(state.pulses).toHaveLength(0);
    });
});
