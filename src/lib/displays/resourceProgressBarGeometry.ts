import type { ResourceProgressBarPosition } from "./resourceProgressBarSlots";
import { DEFAULT_RESOURCE_PROGRESS_BAR_SPAN_RATIO } from "./resourceProgressBarSlots";

type Point = { x: number; y: number };

const clampSpanRatio = (spanRatio = DEFAULT_RESOURCE_PROGRESS_BAR_SPAN_RATIO) =>
    Math.max(0.0001, Math.min(1, spanRatio));

const resolveArc = (
    position: ResourceProgressBarPosition,
    spanRatio: number,
) => {
    const span = clampSpanRatio(spanRatio);
    if (position === "top_left")
        return { start: 0, end: span, side: "left" as const };
    if (position === "bottom_left")
        return { start: 1, end: 1 - span, side: "left" as const };
    if (position === "top_right")
        return { start: 0, end: span, side: "right" as const };
    return { start: 1, end: 1 - span, side: "right" as const };
};

export const resolveResourceProgressBarGeometry = (nodeRadius: number) => {
    const fillWidthPx = Math.max(4, nodeRadius * 0.12);
    const trackPaddingPx = Math.max(2, fillWidthPx * 0.35);
    const trackWidthPx = fillWidthPx + trackPaddingPx * 2;
    const gapPx = Math.max(4, nodeRadius * 0.06);
    const bulbRadiusPx = trackWidthPx / 2;
    const guideRadiusPx = nodeRadius + gapPx + trackWidthPx / 2;
    return {
        fillWidthPx,
        trackPaddingPx,
        trackWidthPx,
        gapPx,
        bulbRadiusPx,
        guideRadiusPx,
        maxOutsetPx: gapPx + trackWidthPx,
    };
};

export const buildResourceProgressBarGuidePoints = (input: {
    position: ResourceProgressBarPosition;
    nodeRadius: number;
    spanRatio?: number;
}) => {
    const geometry = resolveResourceProgressBarGeometry(input.nodeRadius);
    const arc = resolveArc(
        input.position,
        input.spanRatio ?? DEFAULT_RESOURCE_PROGRESS_BAR_SPAN_RATIO,
    );
    return Array.from({ length: 7 }, (_, index) => {
        const t = arc.start + ((arc.end - arc.start) * index) / 6;
        const angle =
            arc.side === "left"
                ? -Math.PI / 2 - t * Math.PI
                : -Math.PI / 2 + t * Math.PI;
        return {
            x: Math.cos(angle) * geometry.guideRadiusPx,
            y: Math.sin(angle) * geometry.guideRadiusPx,
        } satisfies Point;
    });
};

export const measureResourceProgressBarBounds = (input: {
    position: ResourceProgressBarPosition;
    nodeRadius: number;
    spanRatio?: number;
}) => {
    const geometry = resolveResourceProgressBarGeometry(input.nodeRadius);
    const points = buildResourceProgressBarGuidePoints(input);
    const padding = geometry.trackWidthPx / 2;
    const bulb = geometry.bulbRadiusPx;
    const first = points[0] ?? { x: 0, y: 0 };
    return {
        minX: Math.min(
            ...points.map((point) => point.x - padding),
            first.x - bulb,
        ),
        maxX: Math.max(
            ...points.map((point) => point.x + padding),
            first.x + bulb,
        ),
        minY: Math.min(
            ...points.map((point) => point.y - padding),
            first.y - bulb,
        ),
        maxY: Math.max(
            ...points.map((point) => point.y + padding),
            first.y + bulb,
        ),
    };
};

export const resolveResourceProgressBarOutsetPx = (nodeRadius: number) =>
    resolveResourceProgressBarGeometry(nodeRadius).maxOutsetPx;
