import type { CycleProgressPoint } from "./cycleProgressRenderModel";

type PathStart = { point: CycleProgressPoint; segmentIndex: number };

const EPSILON = 1e-6;
const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const distance = (a: CycleProgressPoint, b: CycleProgressPoint) =>
    Math.hypot(b.x - a.x, b.y - a.y);
const samePoint = (a: CycleProgressPoint, b: CycleProgressPoint) =>
    Math.abs(a.x - b.x) <= EPSILON && Math.abs(a.y - b.y) <= EPSILON;
const interpolate = (
    start: CycleProgressPoint,
    end: CycleProgressPoint,
    fraction: number,
): CycleProgressPoint => ({
    x: start.x + (end.x - start.x) * fraction,
    y: start.y + (end.y - start.y) * fraction,
});
const compareStart = (left: PathStart, right: PathStart) => {
    if (left.point.y !== right.point.y) return left.point.y - right.point.y;
    const leftAbs = Math.abs(left.point.x);
    const rightAbs = Math.abs(right.point.x);
    if (leftAbs !== rightAbs) return leftAbs - rightAbs;
    return left.point.x - right.point.x;
};
const orderedVertices = (points: CycleProgressPoint[], start: PathStart) => {
    const count = samePoint(start.point, points[start.segmentIndex])
        ? points.length - 1
        : points.length;
    return Array.from(
        { length: count },
        (_, index) => points[(start.segmentIndex + 1 + index) % points.length],
    );
};

export const measureClosedPathLength = (points: CycleProgressPoint[]) =>
    points.length < 2
        ? 0
        : points.reduce(
              (total, point, index) =>
                  total + distance(point, points[(index + 1) % points.length]),
              0,
          );

export const findTopPathStart = (
    points: CycleProgressPoint[],
): PathStart | null => {
    if (points.length < 2) return null;
    let best: PathStart | null = null;
    for (let index = 0; index < points.length; index += 1) {
        const start = points[index];
        const end = points[(index + 1) % points.length];
        let candidate: PathStart;
        if (Math.abs(start.y - end.y) <= EPSILON) {
            candidate = {
                point: {
                    x: Math.min(
                        Math.max(0, Math.min(start.x, end.x)),
                        Math.max(start.x, end.x),
                    ),
                    y: start.y,
                },
                segmentIndex: index,
            };
        } else if (start.y < end.y) {
            candidate = { point: start, segmentIndex: index };
        } else {
            candidate = {
                point: end,
                segmentIndex: (index + 1) % points.length,
            };
        }
        if (!best || compareStart(candidate, best) < 0) best = candidate;
    }
    return best;
};

export const resolveCycleProgressPath = (
    points: CycleProgressPoint[],
    fraction: number,
): CycleProgressPoint[] => {
    const start = findTopPathStart(points);
    if (!start) return [];
    const clamped = clamp01(fraction);
    if (clamped === 0) return [];
    const path = [start.point];
    let remaining = measureClosedPathLength(points) * clamped;
    let current = start.point;
    for (const next of orderedVertices(points, start)) {
        const length = distance(current, next);
        if (remaining <= length + EPSILON) {
            if (remaining >= length - EPSILON) path.push(next);
            else path.push(interpolate(current, next, remaining / length));
            return clamped === 1 &&
                samePoint(path.at(-1) ?? start.point, start.point)
                ? path.slice(0, -1)
                : path;
        }
        path.push(next);
        remaining -= length;
        current = next;
    }
    const closing = distance(current, start.point);
    if (clamped >= 1 || closing <= EPSILON) return path;
    if (remaining < closing - EPSILON) {
        path.push(interpolate(current, start.point, remaining / closing));
    }
    return path;
};
