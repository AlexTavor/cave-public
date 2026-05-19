import { describe, expect, it } from "vitest";
import { advanceWavePhase } from "./veinsEdgePhase";

const state = () => ({ wavePhaseRad: 0 }) as never;

const edge = (pathLengthPx: number) =>
    ({
        veinType: "nervous",
        freq: 2,
        blobSpeedPxPerSec: 50,
        pathLengthPx,
    }) as never;

describe("advanceWavePhase", () => {
    it("uses authored path length and the slower nervous wave scale", () => {
        const shortPhase = advanceWavePhase(state(), edge(100), 1);
        const longPhase = advanceWavePhase(state(), edge(200), 1);
        expect(shortPhase).toBeLessThan(longPhase);
        expect(shortPhase).toBeCloseTo(-(2 * Math.PI) / 10, 6);
    });
});
