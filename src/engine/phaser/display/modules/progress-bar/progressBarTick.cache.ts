import { buildSmoothGuidePath } from "../../../veins/veinSmoothGuidePath";
import { buildPolylineMetrics } from "../veins/veinsVisualMath";
import {
    buildResourceProgressBarGuidePoints,
    measureResourceProgressBarBounds,
    resolveResourceProgressBarGeometry,
} from "../../../../../lib/displays/resourceProgressBarGeometry";
import type { ResourceProgressBarPosition } from "../../../../../lib/displays/resourceProgressBarSlots";
import type { ProgressBarSlotRenderState } from "./progressBarSlots";

export type CachedProgressBarGeometry = {
    geometryKey: string;
    points: { x: number; y: number }[];
    metrics: ReturnType<typeof buildPolylineMetrics>;
    bounds: { minY: number; maxY: number };
    bulb: { x: number; y: number };
    trackWidthPx: number;
    fillWidthPx: number;
    bulbRadiusPx: number;
};

const buildGeometryKey = (
    position: ResourceProgressBarPosition,
    nodeRadius: number,
    spanRatio: number,
) => `${position}:${nodeRadius}:${spanRatio}`;

export const readCachedProgressBarGeometry = (
    cache: Map<string, CachedProgressBarGeometry>,
    position: ResourceProgressBarPosition,
    nodeRadius: number,
    spanRatio: number,
) => {
    const geometryKey = buildGeometryKey(position, nodeRadius, spanRatio);
    const cached = cache.get(geometryKey);
    if (cached) return cached;
    const widths = resolveResourceProgressBarGeometry(nodeRadius);
    const points = buildSmoothGuidePath(
        buildResourceProgressBarGuidePoints({
            position,
            nodeRadius,
            spanRatio,
        }),
    );
    const next = {
        geometryKey,
        points,
        metrics: buildPolylineMetrics(points),
        bounds: measureResourceProgressBarBounds({
            position,
            nodeRadius,
            spanRatio,
        }),
        bulb: points[0] ?? { x: 0, y: 0 },
        trackWidthPx: widths.trackWidthPx,
        fillWidthPx: widths.fillWidthPx,
        bulbRadiusPx: widths.bulbRadiusPx,
    };
    cache.set(geometryKey, next);
    return next;
};

export const shouldUpdateTrack = (
    prev: ProgressBarSlotRenderState | null,
    next: ProgressBarSlotRenderState,
) =>
    prev?.geometryKey !== next.geometryKey ||
    prev?.trackTint !== next.trackTint ||
    prev?.trackWidthPx !== next.trackWidthPx;

export const shouldUpdateFill = (
    prev: ProgressBarSlotRenderState | null,
    next: ProgressBarSlotRenderState,
) =>
    prev?.geometryKey !== next.geometryKey ||
    prev?.fillTint !== next.fillTint ||
    prev?.fillRatio !== next.fillRatio ||
    prev?.fillWidthPx !== next.fillWidthPx;

export const shouldUpdateBulb = (
    prev: ProgressBarSlotRenderState | null,
    next: ProgressBarSlotRenderState,
) =>
    prev?.geometryKey !== next.geometryKey ||
    prev?.trackTint !== next.trackTint;
