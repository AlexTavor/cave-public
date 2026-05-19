import type { CaveFurRender } from "../../../../../data/schemas/game/caveMindRender";
import { stringHash } from "../../../../../utils/deterministicHash";

export interface CaveContourPoint {
    x: number;
    y: number;
    tangentX: number;
    tangentY: number;
    normalX: number;
    normalY: number;
}

export interface CaveHairWedge {
    rootIndex: number;
    effectiveLength: number;
    points: Array<{ x: number; y: number }>;
}

const TAU = Math.PI * 2;
const frac = (value: number) => value - Math.floor(value);
const pointAt = (angle: number, length: number) => ({
    x: Math.cos(angle) * length,
    y: Math.sin(angle) * length,
});
const unit = (x: number, y: number) => {
    const length = Math.hypot(x, y) || 1;
    return { x: x / length, y: y / length };
};
const phaseFor = (seed: number, index: number) =>
    TAU * frac(seed * (index + 1) * 7.137);
const angleDelta = (from: number, to: number) =>
    Math.atan2(Math.sin(to - from), Math.cos(to - from));

export const computeCaveContour = (params: {
    entityId: string;
    radius: number;
    timeMs: number;
    pulseValue: number;
    fur: CaveFurRender;
}): CaveContourPoint[] => {
    const { entityId, radius, timeMs, pulseValue, fur } = params;
    if (radius <= 0.5) return [];
    const seed = stringHash(entityId);
    const baseRadius = radius * fur.bodyRadiusScale;
    const timeSeconds = timeMs / 1000;
    const points = Array.from({ length: fur.sampleCount }, (_, index) => {
        const angle = (TAU * index) / fur.sampleCount;
        const baseOffset = fur.baseOctaves.reduce(
            (sum, octave, octaveIndex) =>
                sum +
                octave.amplitudePx *
                    Math.sin(
                        angle * octave.frequency + phaseFor(seed, octaveIndex),
                    ),
            0,
        );
        const pulseOffset = fur.pulseOctaves.reduce(
            (sum, octave, octaveIndex) =>
                sum +
                octave.amplitudePx *
                    Math.sin(
                        angle * octave.frequency +
                            phaseFor(seed, octaveIndex + 13) +
                            TAU * octave.speedHz * timeSeconds,
                    ),
            0,
        );
        const length = Math.max(
            0,
            baseRadius + baseOffset + pulseValue * pulseOffset,
        );
        return { x: Math.cos(angle) * length, y: Math.sin(angle) * length };
    });
    return points.map((point, index) => {
        const previous = points[(index + points.length - 1) % points.length];
        const next = points[(index + 1) % points.length];
        const tangent = unit(next.x - previous.x, next.y - previous.y);
        const outward = unit(-tangent.y, tangent.x);
        const normal =
            outward.x * point.x + outward.y * point.y >= 0
                ? outward
                : { x: -outward.x, y: -outward.y };
        return {
            ...point,
            tangentX: tangent.x,
            tangentY: tangent.y,
            normalX: normal.x,
            normalY: normal.y,
        };
    });
};

export const computeCaveFurWedges = (params: {
    entityId: string;
    timeMs: number;
    pulseValue: number;
    fur: CaveFurRender;
    contour: CaveContourPoint[];
}): CaveHairWedge[] => {
    const { entityId, timeMs, pulseValue, fur, contour } = params;
    if (!contour.length) return [];
    const seed = stringHash(`${entityId}:fur`);
    const timeSeconds = timeMs / 1000;
    const rootCount = Math.floor(fur.sampleCount / fur.hairStride);
    const rootOffset = Math.floor(seed * fur.sampleCount) % fur.hairStride;
    const lookAngle =
        fur.lookDirX || fur.lookDirY
            ? Math.atan2(fur.lookDirY, fur.lookDirX)
            : null;
    return Array.from({ length: rootCount }, (_, hairIndex) => {
        const rootIndex =
            (rootOffset + hairIndex * fur.hairStride) % contour.length;
        const root = contour[rootIndex];
        const sign = frac(seed * (hairIndex + 1) * 17.17) >= 0.5 ? 1 : -1;
        const stiffness = 1 - fur.stiffness01;
        const sway =
            Math.sin(
                TAU * fur.motionHz * timeSeconds +
                    phaseFor(seed, hairIndex + 29),
            ) *
            fur.swayAngleRad *
            stiffness;
        const pulseAngle = sign * pulseValue * fur.pulseAngleRad;
        const rootAngle =
            Math.atan2(root.normalY, root.normalX) + sign * fur.flareAngleRad;
        const steeredAngle =
            lookAngle === null
                ? rootAngle
                : rootAngle +
                  angleDelta(rootAngle, lookAngle) * fur.attentionBias01;
        const finalAngle = steeredAngle + sway + pulseAngle;
        const curlAngle = sign * fur.curlAngleRad * stiffness;
        const effectiveLength = Math.max(
            0,
            fur.lengthPx * (1 + pulseValue * fur.pulseLengthScale),
        );
        const midAngle = finalAngle - curlAngle;
        const tremor =
            Math.sin(
                TAU * fur.motionHz * timeSeconds * 1.7 +
                    phaseFor(seed, hairIndex + 47),
            ) *
            fur.tremorPx *
            stiffness;
        const midDistance = fur.midpointRatio * effectiveLength;
        const midPerp = pointAt(
            midAngle + Math.PI / 2,
            (fur.rootWidthPx +
                (fur.tipWidthPx - fur.rootWidthPx) * fur.midpointRatio) /
                2,
        );
        const rootPerp = pointAt(rootAngle + Math.PI / 2, fur.rootWidthPx / 2);
        const midBase = pointAt(midAngle, midDistance);
        const tipBase = pointAt(finalAngle, effectiveLength);
        const midTremor = pointAt(midAngle + Math.PI / 2, tremor * 0.6);
        const tipTremor = pointAt(finalAngle + Math.PI / 2, tremor);
        const midPoint = {
            x: root.x + midBase.x + midTremor.x,
            y: root.y + midBase.y + midTremor.y,
        };
        const tipPoint = {
            x: root.x + tipBase.x + tipTremor.x,
            y: root.y + tipBase.y + tipTremor.y,
        };
        return {
            rootIndex,
            effectiveLength,
            points: [
                { x: root.x + rootPerp.x, y: root.y + rootPerp.y },
                { x: midPoint.x + midPerp.x, y: midPoint.y + midPerp.y },
                tipPoint,
                { x: midPoint.x - midPerp.x, y: midPoint.y - midPerp.y },
                { x: root.x - rootPerp.x, y: root.y - rootPerp.y },
            ],
        };
    });
};
