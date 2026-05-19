import { describe, expect, it } from "vitest";
import { buildVeinPathShape } from "./veinPathShape";
import { buildSmoothGuidePath } from "./veinSmoothGuidePath";

const config = {
    point_count_min: 1,
    point_count_max: 3,
    offset_min_px: 10,
    offset_max_px: 20,
};

const buildShape = () =>
    buildVeinPathShape({
        ax: 0,
        ay: 0,
        bx: 100,
        by: 0,
        edgeId: "body:a:b",
        edgeSeed: 17,
        meander: config,
    });

const measurePolyline = (points: { x: number; y: number }[]): number => {
    let total = 0;
    for (let index = 1; index < points.length; index++) {
        total += Math.hypot(
            points[index].x - points[index - 1].x,
            points[index].y - points[index - 1].y,
        );
    }
    return total;
};

describe("buildVeinPathShape", () => {
    it("returns identical meander points for the same edge and config", () => {
        expect(buildShape()).toEqual(buildShape());
    });

    it("keeps the resolved point count inside the inclusive authored range", () => {
        const shape = buildShape();
        expect(shape.meanderPoints.length).toBeGreaterThanOrEqual(1);
        expect(shape.meanderPoints.length).toBeLessThanOrEqual(3);
    });

    it("orders meander points from source to target", () => {
        const xs = buildShape().meanderPoints.map((point) => point.x);
        expect(xs).toEqual([...xs].sort((left, right) => left - right));
    });

    it("keeps sideways offsets inside the authored bounds", () => {
        const offsets = buildShape().meanderPoints.map((point) =>
            Math.abs(point.y),
        );
        expect(offsets.every((offset) => offset >= 10 && offset <= 20)).toBe(
            true,
        );
    });

    it("returns a direct path when the authored meander count is zero", () => {
        expect(
            buildVeinPathShape({
                ax: 0,
                ay: 0,
                bx: 30,
                by: 40,
                edgeId: "body:a:b",
                edgeSeed: 17,
                meander: { ...config, point_count_min: 0, point_count_max: 0 },
            }),
        ).toEqual({ meanderPoints: [], pathLengthPx: 50 });
    });

    it("measures path length from the smooth guide path for meandering edges", () => {
        const shape = buildShape();
        const smoothPath = buildSmoothGuidePath([
            { x: 0, y: 0 },
            ...shape.meanderPoints,
            { x: 100, y: 0 },
        ]);
        expect(shape.pathLengthPx).toBe(measurePolyline(smoothPath));
    });
});
