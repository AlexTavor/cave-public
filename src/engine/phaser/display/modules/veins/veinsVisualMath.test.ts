import { describe, it, expect } from "vitest";
import {
    advanceRevealedLenPx,
    buildPolylineMetrics,
    countBlobsThatFitSourceGap,
    resolveBlobSpacing,
    samplePolylineAtDistance,
    slicePolylineToDistance,
} from "./veinsVisualMath";

describe("advanceRevealedLenPx", () => {
    it("grows toward desired at configured speed", () => {
        const result = advanceRevealedLenPx(0, 100, 500, 100);
        expect(result).toBeCloseTo(50);
    });

    it("clamps exactly at desired", () => {
        const result = advanceRevealedLenPx(95, 100, 1000, 100);
        expect(result).toBe(100);
    });

    it("returns 0 when desiredLenPx <= 0", () => {
        expect(advanceRevealedLenPx(50, 0, 100, 100)).toBe(0);
        expect(advanceRevealedLenPx(50, -5, 100, 100)).toBe(0);
    });

    it("clamps to desired when already past", () => {
        expect(advanceRevealedLenPx(120, 100, 16, 100)).toBe(100);
    });
});

describe("buildPolylineMetrics + samplePolylineAtDistance", () => {
    const points = [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
    ];

    it("computes correct totalLenPx for a 2-point line", () => {
        const { totalLenPx, segmentLensPx } = buildPolylineMetrics(points);
        expect(totalLenPx).toBe(10);
        expect(segmentLensPx).toEqual([10]);
    });

    it("samples at start, middle, and end", () => {
        const { segmentLensPx } = buildPolylineMetrics(points);
        expect(samplePolylineAtDistance(points, segmentLensPx, 0).x).toBe(0);
        expect(samplePolylineAtDistance(points, segmentLensPx, 5).x).toBe(5);
        expect(samplePolylineAtDistance(points, segmentLensPx, 10).x).toBe(10);
    });

    it("returns safe outputs for invalid input", () => {
        const { totalLenPx, segmentLensPx } = buildPolylineMetrics([]);
        expect(totalLenPx).toBe(0);
        expect(segmentLensPx).toEqual([]);
    });

    it("returns origin for empty points", () => {
        expect(samplePolylineAtDistance([], [], 5)).toEqual({ x: 0, y: 0 });
    });
});

describe("slicePolylineToDistance", () => {
    const points = [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
    ];
    const { segmentLensPx } = buildPolylineMetrics(points);

    it("slice at 0 returns start point", () => {
        const result = slicePolylineToDistance(points, segmentLensPx, 0);
        expect(result).toEqual([{ x: 0, y: 0 }]);
    });

    it("slice at 5 returns start and midpoint", () => {
        const result = slicePolylineToDistance(points, segmentLensPx, 5);
        expect(result).toEqual([
            { x: 0, y: 0 },
            { x: 5, y: 0 },
        ]);
    });

    it("slice at full length returns all points", () => {
        const result = slicePolylineToDistance(points, segmentLensPx, 10);
        expect(result).toEqual([
            { x: 0, y: 0 },
            { x: 10, y: 0 },
        ]);
    });
});

describe("blob spacing helpers", () => {
    it("derives spacing from speed and spawn rate", () => {
        expect(resolveBlobSpacing(4, 80)).toBe(20);
        expect(resolveBlobSpacing(0, 80)).toBe(Number.POSITIVE_INFINITY);
    });

    it("counts how many queued blobs fit in the source gap", () => {
        expect(countBlobsThatFitSourceGap(4, 40, 10, false)).toBe(4);
        expect(countBlobsThatFitSourceGap(4, 19, 10, true)).toBe(1);
        expect(countBlobsThatFitSourceGap(4, 0, 10, true)).toBe(0);
    });
});
