import { describe, expect, it } from "vitest";
import {
    buildRopePointsFull,
    compileVeinGuidePath,
    resolveVeinRopePoints,
} from "./veinsRopePath";

const makeEdge = () => ({
    ax: 0,
    ay: 0,
    bx: 100,
    by: 0,
    meanderPoints: [{ x: 40, y: 12 }],
    pathLengthPx: 104,
    segments: 8,
    ampPx: 4,
    freq: 2,
    phase0: 0.3,
    seed: 7,
    wavinessSimplexScale: 1,
});

const snapshotGuide = (compiled: ReturnType<typeof compileVeinGuidePath>) =>
    compiled
        ? {
              guidePath: compiled.guidePath,
              segmentLensPx: compiled.segmentLensPx,
              pathLengthPx: compiled.pathLengthPx,
              distances: compiled.distances,
          }
        : null;

describe("veinsRopePath", () => {
    it("compiles deterministic guide paths", () => {
        expect(snapshotGuide(compileVeinGuidePath(makeEdge()))).toEqual(
            snapshotGuide(compileVeinGuidePath(makeEdge())),
        );
    });

    it("resolves the same points as the compatibility wrapper", () => {
        const edge = makeEdge();
        const compiled = compileVeinGuidePath(edge);
        expect(compiled).not.toBeNull();
        if (!compiled) throw new Error("expected compiled guide path");
        expect(resolveVeinRopePoints(compiled, edge, 0.4)).toEqual(
            buildRopePointsFull(edge, 0.4),
        );
    });

    it("returns null for degenerate paths", () => {
        expect(
            compileVeinGuidePath({
                ...makeEdge(),
                bx: 0,
                by: 0,
                meanderPoints: [],
                pathLengthPx: 0,
            }),
        ).toBeNull();
    });

    it("reuses one compiled guide path across phase-only changes", () => {
        const compiled = compileVeinGuidePath(makeEdge());
        const before = snapshotGuide(compiled);
        expect(compiled).not.toBeNull();
        if (!compiled) throw new Error("expected compiled guide path");
        expect(resolveVeinRopePoints(compiled, makeEdge(), 0)).not.toEqual(
            resolveVeinRopePoints(compiled, makeEdge(), 0.5),
        );
        expect(snapshotGuide(compiled)).toEqual(before);
    });
});
