import { describe, expect, it } from "vitest";
import { buildSmoothGuidePath } from "./veinSmoothGuidePath";

type Pt = { x: number; y: number };

const maxTurnAngleRad = (points: Pt[]): number => {
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

describe("buildSmoothGuidePath", () => {
    it("leaves fewer-than-3-point paths unchanged", () => {
        const path = [
            { x: 0, y: 0 },
            { x: 10, y: 0 },
        ];
        expect(buildSmoothGuidePath(path)).toBe(path);
    });

    it("keeps endpoints anchored and softens interior bends", () => {
        const path = [
            { x: 0, y: 0 },
            { x: 10, y: 12 },
            { x: 20, y: 0 },
        ];
        const smoothed = buildSmoothGuidePath(path);
        expect(smoothed[0]).toEqual(path[0]);
        expect(smoothed.at(-1)).toEqual(path.at(-1));
        expect(smoothed).not.toContainEqual(path[1]);
    });

    it("is deterministic for the same input path", () => {
        const path = [
            { x: 0, y: 0 },
            { x: 10, y: 14 },
            { x: 20, y: -8 },
            { x: 30, y: 0 },
        ];
        expect(buildSmoothGuidePath(path)).toEqual(buildSmoothGuidePath(path));
    });

    it("reduces maximum turn severity for a zig-zag guide path", () => {
        const path = [
            { x: 0, y: 0 },
            { x: 10, y: 14 },
            { x: 20, y: -14 },
            { x: 30, y: 14 },
            { x: 40, y: 0 },
        ];
        expect(maxTurnAngleRad(buildSmoothGuidePath(path))).toBeLessThan(
            maxTurnAngleRad(path),
        );
    });
});
