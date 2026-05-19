export type NodeOverlayDisplayBounds = {
    entityId: string;
    centerX: number;
    topY: number;
    bottomY: number;
};

type BoundsRect = { x: number; y: number; width: number; height: number };

const isFiniteNumber = (value: unknown): value is number =>
    typeof value === "number" && Number.isFinite(value);

const toBounds = (
    entityId: string,
    centerX: number,
    topY: number,
    bottomY: number,
): NodeOverlayDisplayBounds | null => {
    if (
        !isFiniteNumber(centerX) ||
        !isFiniteNumber(topY) ||
        !isFiniteNumber(bottomY) ||
        topY > bottomY
    )
        return null;
    return { entityId, centerX, topY, bottomY };
};

const toRectBounds = (
    entityId: string,
    rect: BoundsRect | null | undefined,
): NodeOverlayDisplayBounds | null => {
    if (!rect) return null;
    const { x, y, width, height } = rect;
    if (![x, y, width, height].every(isFiniteNumber)) return null;
    if (width <= 0 || height <= 0) return null;
    return toBounds(entityId, x + width / 2, y, y + height);
};

export const createNodeOverlayDisplayBoundsFromRadius = (input: {
    entityId: string;
    centerX: number;
    centerY: number;
    radius: number;
}): NodeOverlayDisplayBounds | null => {
    const { entityId, centerX, centerY, radius } = input;
    if (!isFiniteNumber(radius) || radius <= 0) return null;
    return toBounds(entityId, centerX, centerY - radius, centerY + radius);
};

export const createNodeOverlayDisplayBoundsFromImageBounds = (
    entityId: string,
    rect: BoundsRect | null | undefined,
): NodeOverlayDisplayBounds | null => toRectBounds(entityId, rect);

export const createNodeOverlayDisplayBoundsFromImageBoundsUnion = (
    entityId: string,
    rects: Array<BoundsRect | null | undefined>,
): NodeOverlayDisplayBounds | null => {
    const bounds = rects
        .map((rect) => toRectBounds(entityId, rect))
        .filter((rect): rect is NodeOverlayDisplayBounds => rect !== null);
    if (bounds.length === 0) return null;
    return toBounds(
        entityId,
        bounds.reduce((sum, rect) => sum + rect.centerX, 0) / bounds.length,
        Math.min(...bounds.map((rect) => rect.topY)),
        Math.max(...bounds.map((rect) => rect.bottomY)),
    );
};

export const createNodeOverlayDisplayBoundsFromLocalExtents = (input: {
    entityId: string;
    centerX: number;
    centerY: number;
    minY: number;
    maxY: number;
}): NodeOverlayDisplayBounds | null => {
    const { entityId, centerX, centerY, minY, maxY } = input;
    return toBounds(entityId, centerX, centerY + minY, centerY + maxY);
};

export const mergeNodeOverlayDisplayBounds = (
    base: NodeOverlayDisplayBounds | null,
    next: NodeOverlayDisplayBounds | null,
): NodeOverlayDisplayBounds | null => {
    if (!base) return next;
    if (!next) return base;
    return {
        entityId: base.entityId,
        centerX: base.centerX,
        topY: Math.min(base.topY, next.topY),
        bottomY: Math.max(base.bottomY, next.bottomY),
    };
};
