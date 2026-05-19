import { describe, expect, it } from "vitest";
import { buildRopePointsFull } from "./veinsRopeUtils";
import { buildSmoothGuidePath } from "../../../veins/veinSmoothGuidePath";

const maxTurnAngleRad = (points: { x: number; y: number }[]): number => {
    let maxAngle = 0;
    for (let index = 1; index < points.length - 1; index++) {
        const prev = points[index - 1];
        const point = points[index];
        const next = points[index + 1];
        const ax = point.x - prev.x;
        const ay = point.y - prev.y;
        const bx = next.x - point.x;
        const by = next.y - point.y;
        const al = Math.hypot(ax, ay);
        const bl = Math.hypot(bx, by);
        if (al < 1e-6 || bl < 1e-6) continue;
        const dot = (ax * bx + ay * by) / (al * bl);
        maxAngle = Math.max(
            maxAngle,
            Math.acos(Math.max(-1, Math.min(1, dot))),
        );
    }
    return maxAngle;
};

const makeEdge = (seed = 7) => ({
    ax: 0,
    ay: 0,
    bx: 100,
    by: 0,
    meanderPoints: [],
    pathLengthPx: 100,
    segments: 8,
    ampPx: 4,
    freq: 2,
    phase0: 0,
    seed,
    wavinessSimplexScale: 1,
});

describe("buildRopePointsFull", () => {
    it("keeps the endpoints anchored to the original connection", () => {
        const points = buildRopePointsFull(makeEdge());
        expect(points[0]).toEqual({ x: 0, y: 0 });
        expect(points.at(-1)).toEqual({ x: 100, y: 0 });
    });

    it("is deterministic for the same edge seed and phase", () => {
        expect(buildRopePointsFull(makeEdge(11), 0.4)).toEqual(
            buildRopePointsFull(makeEdge(11), 0.4),
        );
    });

    it("keeps a smoothed bend without requiring authored guide-point pass-through", () => {
        const meanderPoints = [
            { x: 30, y: 12 },
            { x: 70, y: -12 },
        ];
        const authored = buildRopePointsFull({
            ...makeEdge(19),
            meanderPoints,
            pathLengthPx: 109.325673973,
            freq: 0,
            wavinessSimplexScale: 0,
        });
        expect(authored).not.toEqual(expect.arrayContaining(meanderPoints));
        expect(authored.some((point) => Math.abs(point.y) > 0.5)).toBe(true);
    });

    it("changes interior waviness when simplex scale increases", () => {
        const flat = buildRopePointsFull(
            { ...makeEdge(23), wavinessSimplexScale: 0 },
            0.2,
        );
        const varied = buildRopePointsFull(
            { ...makeEdge(23), wavinessSimplexScale: 4 },
            0.2,
        );
        expect(flat[0]).toEqual(varied[0]);
        expect(flat.at(-1)).toEqual(varied.at(-1));
        expect(flat.slice(1, -1)).not.toEqual(varied.slice(1, -1));
    });

    it("keeps a straight spine when there are no authored meander points", () => {
        const points = buildRopePointsFull({
            ...makeEdge(29),
            freq: 0,
            wavinessSimplexScale: 0,
        });
        expect(points.every((point) => point.y === 0)).toBe(true);
    });

    it("reduces corner severity for bent guide paths when waviness is zero", () => {
        const meanderPoints = [{ x: 50, y: 24 }];
        const rawGuide = [{ x: 0, y: 0 }, ...meanderPoints, { x: 100, y: 0 }];
        const smoothGuide = buildSmoothGuidePath(rawGuide);
        const pathLengthPx = smoothGuide.reduce(
            (total, point, index) =>
                index === 0
                    ? 0
                    : total +
                      Math.hypot(
                          point.x - smoothGuide[index - 1].x,
                          point.y - smoothGuide[index - 1].y,
                      ),
            0,
        );
        const points = buildRopePointsFull({
            ...makeEdge(31),
            meanderPoints,
            pathLengthPx,
            freq: 0,
            wavinessSimplexScale: 0,
        });
        expect(maxTurnAngleRad(points)).toBeLessThan(maxTurnAngleRad(rawGuide));
    });
});
