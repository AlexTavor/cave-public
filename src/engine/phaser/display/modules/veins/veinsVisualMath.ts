type Pt = { x: number; y: number };

export const advanceRevealedLenPx = (
    revealedLenPx: number,
    desiredLenPx: number,
    deltaMs: number,
    growSpeedPxPerSec: number,
): number => {
    if (desiredLenPx <= 0) return 0;
    if (revealedLenPx < desiredLenPx) {
        const step = (deltaMs / 1000) * growSpeedPxPerSec;
        return Math.min(desiredLenPx, revealedLenPx + step);
    }
    return desiredLenPx;
};

export const buildPolylineMetrics = (
    points: Pt[],
): { segmentLensPx: number[]; totalLenPx: number } => {
    if (points.length < 2) return { segmentLensPx: [], totalLenPx: 0 };
    const segmentLensPx: number[] = [];
    let totalLenPx = 0;
    for (let i = 1; i < points.length; i++) {
        const len = Math.hypot(
            points[i].x - points[i - 1].x,
            points[i].y - points[i - 1].y,
        );
        segmentLensPx.push(len);
        totalLenPx += len;
    }
    return { segmentLensPx, totalLenPx };
};

export const samplePolylineAtDistance = (
    points: Pt[],
    segmentLensPx: number[],
    distancePx: number,
): Pt => {
    if (points.length === 0) return { x: 0, y: 0 };
    if (segmentLensPx.length === 0) return points[0];
    let remaining = Math.max(0, distancePx);
    for (let i = 0; i < segmentLensPx.length; i++) {
        if (remaining <= segmentLensPx[i]) {
            const t = segmentLensPx[i] > 0 ? remaining / segmentLensPx[i] : 0;
            return {
                x: points[i].x + (points[i + 1].x - points[i].x) * t,
                y: points[i].y + (points[i + 1].y - points[i].y) * t,
            };
        }
        remaining -= segmentLensPx[i];
    }
    return points.at(-1) ?? points[0];
};

export const slicePolylineToDistance = (
    points: Pt[],
    segmentLensPx: number[],
    distancePx: number,
): Pt[] => {
    if (points.length === 0) return [];
    if (distancePx <= 0) return [points[0]];
    const result: Pt[] = [points[0]];
    let remaining = distancePx;
    for (let i = 0; i < segmentLensPx.length; i++) {
        if (remaining <= segmentLensPx[i]) {
            const t = segmentLensPx[i] > 0 ? remaining / segmentLensPx[i] : 0;
            result.push({
                x: points[i].x + (points[i + 1].x - points[i].x) * t,
                y: points[i].y + (points[i + 1].y - points[i].y) * t,
            });
            return result;
        }
        result.push(points[i + 1]);
        remaining -= segmentLensPx[i];
    }
    return result;
};

export const isRisingEdgeCrossing = (
    prev: number,
    next: number,
    threshold: number,
): boolean => prev < threshold && next >= threshold;

export const resolveBlobSpacing = (
    blobSpawnRateHz: number,
    blobSpeedPxPerSec: number,
): number =>
    blobSpawnRateHz > 0
        ? blobSpeedPxPerSec / blobSpawnRateHz
        : Number.POSITIVE_INFINITY;

export const countBlobsThatFitSourceGap = (
    queuedBlobs: number,
    sourceGapPx: number,
    spacingPx: number,
    hasExistingBlob: boolean,
): number => {
    if (queuedBlobs <= 0 || !Number.isFinite(spacingPx) || spacingPx <= 0)
        return 0;
    if (hasExistingBlob)
        return Math.min(
            queuedBlobs,
            Math.max(0, Math.floor(sourceGapPx / spacingPx)),
        );
    return Math.min(
        queuedBlobs,
        Math.max(0, Math.floor(sourceGapPx / spacingPx) + 1),
    );
};
