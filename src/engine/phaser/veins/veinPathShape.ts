import type { VeinConfig } from "../../../data/schemas/assets";
import { buildSmoothGuidePath } from "./veinSmoothGuidePath";

type Pt = { x: number; y: number };

type BuildVeinPathShapeParams = {
    ax: number;
    ay: number;
    bx: number;
    by: number;
    edgeId: string;
    edgeSeed: number;
    meander: VeinConfig["geometry"]["meander"];
};

const toUnit = (value: string): number => {
    let hash = 2166136261;
    for (const ch of value) {
        hash ^= ch.codePointAt(0) ?? 0;
        hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0) / 4294967296;
};

const clamp = (value: number, min: number, max: number): number =>
    Math.max(min, Math.min(max, value));

const measurePolyline = (points: Pt[]): number => {
    let total = 0;
    for (let i = 1; i < points.length; i++) {
        total += Math.hypot(
            points[i].x - points[i - 1].x,
            points[i].y - points[i - 1].y,
        );
    }
    return total;
};

export const buildVeinPathShape = ({
    ax,
    ay,
    bx,
    by,
    edgeId,
    edgeSeed,
    meander,
}: BuildVeinPathShapeParams): { meanderPoints: Pt[]; pathLengthPx: number } => {
    const dx = bx - ax;
    const dy = by - ay;
    const directLength = Math.hypot(dx, dy);
    if (directLength < 0.001) return { meanderPoints: [], pathLengthPx: 0 };
    const countSpan = meander.point_count_max - meander.point_count_min + 1;
    const count =
        meander.point_count_min +
        Math.floor(toUnit(`${edgeId}:${edgeSeed}:count`) * countSpan);
    if (count === 0) return { meanderPoints: [], pathLengthPx: directLength };
    const nx = -dy / directLength;
    const ny = dx / directLength;
    const meanderPoints = Array.from({ length: count }, (_, index) => {
        const token = `${edgeId}:${edgeSeed}:${index}`;
        const baseT = (index + 1) / (count + 1);
        const jitter = (toUnit(`${token}:t`) - 0.5) * (0.5 / (count + 1));
        const t = clamp(baseT + jitter, Number.EPSILON, 1 - Number.EPSILON);
        const magnitude =
            meander.offset_min_px +
            (meander.offset_max_px - meander.offset_min_px) *
                toUnit(`${token}:offset`);
        const sign = toUnit(`${token}:sign`) < 0.5 ? -1 : 1;
        return {
            t,
            x: ax + dx * t + nx * magnitude * sign,
            y: ay + dy * t + ny * magnitude * sign,
        };
    })
        .sort((left, right) => left.t - right.t)
        .map(({ x, y }) => ({ x, y }));
    return {
        meanderPoints,
        pathLengthPx: measurePolyline(
            buildSmoothGuidePath([
                { x: ax, y: ay },
                ...meanderPoints,
                { x: bx, y: by },
            ]),
        ),
    };
};
