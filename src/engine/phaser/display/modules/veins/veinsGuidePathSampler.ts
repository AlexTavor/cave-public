import { samplePolylineAtDistance } from "./veinsVisualMath";

type Pt = { x: number; y: number };

export const sampleGuidePathPoint = (
    points: Pt[],
    segmentLensPx: number[],
    distancePx: number,
): { point: Pt; nx: number; ny: number } => {
    if (points.length === 0) return { point: { x: 0, y: 0 }, nx: 0, ny: 1 };
    let remaining = Math.max(0, distancePx);
    for (let index = 0; index < segmentLensPx.length; index++) {
        const len = segmentLensPx[index];
        if (remaining <= len || index === segmentLensPx.length - 1) {
            const start = points[index];
            const end = points[index + 1];
            return {
                point: samplePolylineAtDistance(
                    points,
                    segmentLensPx,
                    distancePx,
                ),
                nx: len > 0 ? -(end.y - start.y) / len : 0,
                ny: len > 0 ? (end.x - start.x) / len : 1,
            };
        }
        remaining -= len;
    }
    return { point: points.at(-1) ?? points[0], nx: 0, ny: 1 };
};
