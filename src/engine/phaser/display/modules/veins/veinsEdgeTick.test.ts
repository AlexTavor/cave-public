import { describe, expect, it, vi } from "vitest";
import { tickEdge } from "./veinsEdgeTick";
import {
    makeEdge,
    makePool,
    makeState,
    redrawCount,
} from "./veinsDisplayTestUtils";

vi.mock("phaser", () => ({
    default: { Display: { Masks: { GeometryMask: class {} } } },
}));

describe("tickEdge", () => {
    it("skips rope sync for a static fully revealed unchanged tick", () => {
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
        const draws = redrawCount(state);
        tickEdge(
            state,
            makeEdge({ blobSpawnRateHz: 0 }),
            0,
            {} as never,
            pool as never,
            "vein",
            "blob",
        );
        expect(redrawCount(state)).toBe(draws);
    });

    it("resynchronizes ropes for style-only changes without rebuilding geometry", () => {
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
        const fullPoints = state.pathCache.fullPoints;
        tickEdge(
            state,
            makeEdge({ baseColor: 9, glowAlpha: 0.2, blobSpawnRateHz: 0 }),
            0,
            {} as never,
            pool as never,
            "vein",
            "blob",
        );
        expect(state.pathCache.fullPoints).toBe(fullPoints);
        expect(redrawCount(state)).toBe(4);
    });

    it("resynchronizes ropes when reveal growth changes the visible path", () => {
        const state = makeState();
        const pool = makePool();
        const edge = makeEdge({
            bx: 200,
            pathLengthPx: 200,
            blobSpawnRateHz: 0,
        });
        tickEdge(state, edge, 100, {} as never, pool as never, "vein", "blob");
        tickEdge(state, edge, 100, {} as never, pool as never, "vein", "blob");
        expect(state.revealedLenPx).toBe(120);
        expect(redrawCount(state)).toBe(4);
    });

    it("re-resolves nervous full paths while reusing compiled guide paths", () => {
        const state = makeState();
        const pool = makePool();
        const edge = makeEdge({ veinType: "nervous", blobSpawnRateHz: 0 });
        tickEdge(state, edge, 100, {} as never, pool as never, "vein", "blob");
        const compiled = state.pathCache.compiledGuidePath;
        const fullPoints = state.pathCache.fullPoints;
        tickEdge(state, edge, 100, {} as never, pool as never, "vein", "blob");
        expect(state.pathCache.compiledGuidePath).toBe(compiled);
        expect(state.pathCache.fullPoints).not.toBe(fullPoints);
    });
});
