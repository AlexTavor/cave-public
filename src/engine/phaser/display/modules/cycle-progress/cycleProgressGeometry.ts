import { stringHash } from "../../../../../utils/deterministicHash";
import type { CycleProgressPoint } from "./cycleProgressRenderModel";

export type CycleProgressFamily =
    | "circle"
    | "triangle"
    | "square"
    | "hex"
    | "spiky_circle";

const N = 128;
const TWO_PI = 2 * Math.PI;
const BASE_AMP = 0.07;
const PULSE_AMP = 0.05;
const F_HZ = 0.8;
const FAMILY_BLEND = 0.7;
const frac = (value: number) => value - Math.floor(value);
const polygonFactor = (lobes: number, angle: number) => {
    const sector = TWO_PI / lobes;
    const local = (((angle % sector) + sector) % sector) - sector / 2;
    return Math.cos(sector / 2) / Math.cos(local);
};
const organicScale = (family: CycleProgressFamily) => {
    if (family === "circle") return 1;
    return family === "spiky_circle" ? 0.6 : 0.35;
};
const radiusFactor = (
    family: CycleProgressFamily,
    angle: number,
    rotationDeg: number,
) => {
    const rotated = angle - (rotationDeg * Math.PI) / 180;
    if (family === "circle") return 1;
    if (family === "spiky_circle") {
        const spike = (Math.cos(8 * rotated) + 1) / 2;
        return 0.84 + 0.16 * Math.pow(spike, 2.4);
    }
    let lobes = 4;
    if (family === "triangle") lobes = 3;
    if (family === "hex") lobes = 6;
    return 1 - FAMILY_BLEND + FAMILY_BLEND * polygonFactor(lobes, rotated);
};

export const computeCycleProgressRopeConstants = (radius: number) => {
    const borderWidthPx = Math.max(2, Math.round(radius * 0.1));
    return { borderWidthPx, outerMaxRadius: radius - borderWidthPx / 2 };
};

export const computeCycleProgressRopeGeometry = (params: {
    entityId: string;
    radius: number;
    timeMs: number;
    pulseValue: number;
    family: CycleProgressFamily;
    familyRotationDeg: number;
}): { points: CycleProgressPoint[]; displayWidthPx: number } => {
    if (params.radius <= 0.5) return { points: [], displayWidthPx: 0 };
    const { borderWidthPx, outerMaxRadius } = computeCycleProgressRopeConstants(
        params.radius,
    );
    const seed = stringHash(params.entityId);
    const p1 = TWO_PI * seed;
    const p2 = TWO_PI * frac(seed * 13.37);
    const p3 = TWO_PI * frac(seed * 7.77);
    const points = Array.from({ length: N }, (_, index) => {
        const angle = (TWO_PI * index) / N;
        const base =
            BASE_AMP *
            (0.6 * Math.sin(3 * angle + p1) + 0.4 * Math.sin(5 * angle + p2));
        const pulse =
            PULSE_AMP *
            params.pulseValue *
            Math.sin(4 * angle + TWO_PI * F_HZ * (params.timeMs / 1000) + p3);
        const radius = Math.max(
            0,
            Math.min(
                outerMaxRadius,
                outerMaxRadius *
                    radiusFactor(
                        params.family,
                        angle,
                        params.familyRotationDeg,
                    ) +
                    outerMaxRadius *
                        organicScale(params.family) *
                        (base + pulse),
            ),
        );
        return { x: radius * Math.cos(angle), y: radius * Math.sin(angle) };
    });
    return { points, displayWidthPx: borderWidthPx };
};
